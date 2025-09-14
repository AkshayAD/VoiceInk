/**
 * Audio Recorder Native Module - WASAPI Implementation
 * Real Windows audio recording using WASAPI
 */

#include <napi.h>
#include "wasapi_recorder.h"
#include <iostream>
#include <memory>

class AudioRecorder : public Napi::ObjectWrap<AudioRecorder> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::HandleScope scope(env);

        Napi::Function func = DefineClass(env, "AudioRecorder", {
            InstanceMethod("initialize", &AudioRecorder::Initialize),
            InstanceMethod("startRecording", &AudioRecorder::StartRecording),
            InstanceMethod("stopRecording", &AudioRecorder::StopRecording),
            InstanceMethod("getDevices", &AudioRecorder::GetDevices),
            InstanceMethod("getLevel", &AudioRecorder::GetLevel),
            InstanceMethod("getAudioData", &AudioRecorder::GetAudioData),
            InstanceMethod("saveToWAV", &AudioRecorder::SaveToWAV),
            InstanceMethod("clearBuffer", &AudioRecorder::ClearBuffer),
            InstanceMethod("isRecording", &AudioRecorder::IsRecording),
            InstanceMethod("getLastError", &AudioRecorder::GetLastError)
        });

        exports.Set("AudioRecorder", func);
        return exports;
    }

    AudioRecorder(const Napi::CallbackInfo& info) 
        : Napi::ObjectWrap<AudioRecorder>(info)
        , recorder_(std::make_unique<WASAPIRecorder>()) {
        std::cout << "AudioRecorder: WASAPI instance created" << std::endl;
    }

    ~AudioRecorder() {
        if (recorder_) {
            recorder_->StopRecording();
        }
        std::cout << "AudioRecorder: WASAPI instance destroyed" << std::endl;
    }

private:
    std::unique_ptr<WASAPIRecorder> recorder_;

    // Step 13: Initialize audio capture
    Napi::Value Initialize(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        uint32_t sampleRate = 16000;
        uint16_t channels = 1;
        uint16_t bitsPerSample = 16;
        
        // Parse optional parameters
        if (info.Length() > 0 && info[0].IsObject()) {
            Napi::Object options = info[0].As<Napi::Object>();
            
            if (options.Has("sampleRate")) {
                sampleRate = options.Get("sampleRate").As<Napi::Number>().Uint32Value();
            }
            if (options.Has("channels")) {
                channels = static_cast<uint16_t>(options.Get("channels").As<Napi::Number>().Uint32Value());
            }
            if (options.Has("bitsPerSample")) {
                bitsPerSample = static_cast<uint16_t>(options.Get("bitsPerSample").As<Napi::Number>().Uint32Value());
            }
        }
        
        bool success = recorder_->Initialize(sampleRate, channels, bitsPerSample);
        std::cout << "AudioRecorder: Initialize called - " << (success ? "SUCCESS" : "FAILED") << std::endl;
        
        if (!success) {
            std::cout << "Error: " << recorder_->GetLastError() << std::endl;
        }
        
        return Napi::Boolean::New(env, success);
    }

    Napi::Value StartRecording(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        bool success = recorder_->StartRecording();
        std::cout << "AudioRecorder: StartRecording - " << (success ? "SUCCESS" : "FAILED") << std::endl;
        
        if (!success) {
            std::cout << "Error: " << recorder_->GetLastError() << std::endl;
        }
        
        return Napi::Boolean::New(env, success);
    }

    Napi::Value StopRecording(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        bool success = recorder_->StopRecording();
        std::cout << "AudioRecorder: StopRecording - " << (success ? "SUCCESS" : "FAILED") << std::endl;
        
        // Return recording info
        Napi::Object result = Napi::Object::New(env);
        result.Set("success", Napi::Boolean::New(env, success));
        
        if (success) {
            // Get available audio data size
            const size_t maxBufferSize = 1024 * 1024; // 1MB
            std::vector<uint8_t> tempBuffer(maxBufferSize);
            size_t dataSize = recorder_->GetAudioData(tempBuffer.data(), maxBufferSize);
            
            // Create buffer with actual data
            if (dataSize > 0) {
                auto buffer = Napi::Buffer<uint8_t>::New(env, dataSize);
                memcpy(buffer.Data(), tempBuffer.data(), dataSize);
                result.Set("data", buffer);
                result.Set("size", Napi::Number::New(env, dataSize));
                result.Set("duration", Napi::Number::New(env, static_cast<double>(dataSize) / 32000.0)); // Approximate for 16kHz 16-bit mono
            } else {
                result.Set("data", Napi::Buffer<uint8_t>::New(env, 0));
                result.Set("size", Napi::Number::New(env, 0));
                result.Set("duration", Napi::Number::New(env, 0.0));
            }
        }
        
        return result;
    }

    Napi::Value GetDevices(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        std::vector<std::string> deviceNames;
        bool success = recorder_->EnumerateDevices(deviceNames);
        
        Napi::Array devices = Napi::Array::New(env);
        
        if (success) {
            for (size_t i = 0; i < deviceNames.size(); ++i) {
                Napi::Object device = Napi::Object::New(env);
                device.Set("id", Napi::String::New(env, std::to_string(i)));
                device.Set("name", Napi::String::New(env, deviceNames[i]));
                device.Set("isDefault", Napi::Boolean::New(env, i == 0));
                devices.Set(static_cast<uint32_t>(i), device);
            }
        } else {
            // Fallback device if enumeration fails
            Napi::Object device = Napi::Object::New(env);
            device.Set("id", Napi::String::New(env, "0"));
            device.Set("name", Napi::String::New(env, "Default Microphone"));
            device.Set("isDefault", Napi::Boolean::New(env, true));
            devices.Set(0u, device);
        }
        
        std::cout << "AudioRecorder: GetDevices - Found " << devices.Length() << " devices" << std::endl;
        return devices;
    }

    Napi::Value GetLevel(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        float level = recorder_->GetCurrentLevel();
        return Napi::Number::New(env, level);
    }

    // Step 14: Get audio data from buffer
    Napi::Value GetAudioData(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        size_t requestedSize = 8192; // Default 8KB
        if (info.Length() > 0 && info[0].IsNumber()) {
            requestedSize = info[0].As<Napi::Number>().Uint32Value();
        }
        
        std::vector<uint8_t> buffer(requestedSize);
        size_t actualSize = recorder_->GetAudioData(buffer.data(), requestedSize);
        
        if (actualSize > 0) {
            auto resultBuffer = Napi::Buffer<uint8_t>::New(env, actualSize);
            memcpy(resultBuffer.Data(), buffer.data(), actualSize);
            return resultBuffer;
        } else {
            return Napi::Buffer<uint8_t>::New(env, 0);
        }
    }

    // Step 15: Save to WAV file
    Napi::Value SaveToWAV(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsString()) {
            Napi::TypeError::New(env, "Filename required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        std::string filename = info[0].As<Napi::String>().Utf8Value();
        bool success = recorder_->SaveToWAV(filename);
        
        std::cout << "AudioRecorder: SaveToWAV(" << filename << ") - " << (success ? "SUCCESS" : "FAILED") << std::endl;
        
        if (!success) {
            std::cout << "Error: " << recorder_->GetLastError() << std::endl;
        }
        
        return Napi::Boolean::New(env, success);
    }

    Napi::Value ClearBuffer(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        recorder_->ClearBuffer();
        std::cout << "AudioRecorder: Buffer cleared" << std::endl;
        return env.Undefined();
    }

    Napi::Value IsRecording(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        return Napi::Boolean::New(env, recorder_->IsRecording());
    }

    Napi::Value GetLastError(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        return Napi::String::New(env, recorder_->GetLastError());
    }
};

// Initialize the addon
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // Initialize Windows audio subsystem
    if (!InitializeWindowsAudio()) {
        std::cout << "Warning: Failed to initialize Windows audio subsystem" << std::endl;
    }
    
    AudioRecorder::Init(env, exports);
    std::cout << "AudioRecorder: WASAPI module initialized" << std::endl;
    return exports;
}

NODE_API_MODULE(audiorecorder, Init)