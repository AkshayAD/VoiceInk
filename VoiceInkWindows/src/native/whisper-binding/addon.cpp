/**
 * Whisper Binding Native Module - Real Implementation
 * Whisper.cpp integration for voice-to-text transcription
 */

#include <napi.h>
#include "whisper_transcriber.h"
#include <iostream>
#include <memory>

class WhisperTranscriberWrapper : public Napi::ObjectWrap<WhisperTranscriberWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::HandleScope scope(env);

        Napi::Function func = DefineClass(env, "WhisperTranscriberWrapper", {
            InstanceMethod("loadModel", &WhisperTranscriberWrapper::LoadModel),
            InstanceMethod("unloadModel", &WhisperTranscriberWrapper::UnloadModel),
            InstanceMethod("transcribe", &WhisperTranscriberWrapper::Transcribe),
            InstanceMethod("transcribeFile", &WhisperTranscriberWrapper::TranscribeFile),
            InstanceMethod("isModelLoaded", &WhisperTranscriberWrapper::IsModelLoaded),
            InstanceMethod("getCurrentModel", &WhisperTranscriberWrapper::GetCurrentModel),
            InstanceMethod("getAvailableModels", &WhisperTranscriberWrapper::GetAvailableModels),
            InstanceMethod("setThreads", &WhisperTranscriberWrapper::SetThreads),
            InstanceMethod("setLanguage", &WhisperTranscriberWrapper::SetLanguage),
            InstanceMethod("convertPCMToFloat", &WhisperTranscriberWrapper::ConvertPCMToFloat),
            InstanceMethod("getLastError", &WhisperTranscriberWrapper::GetLastError),
            InstanceMethod("getModelMemoryUsage", &WhisperTranscriberWrapper::GetModelMemoryUsage),
            InstanceMethod("getProcessingTime", &WhisperTranscriberWrapper::GetProcessingTime)
        });

        exports.Set("Whisper", func);
        return exports;
    }

    WhisperTranscriberWrapper(const Napi::CallbackInfo& info) 
        : Napi::ObjectWrap<WhisperTranscriberWrapper>(info)
        , transcriber_(std::make_unique<WhisperTranscriber>()) {
        std::cout << "WhisperTranscriberWrapper: Created instance" << std::endl;
    }

    ~WhisperTranscriberWrapper() {
        if (transcriber_) {
            transcriber_->UnloadModel();
        }
        std::cout << "WhisperTranscriberWrapper: Destroyed instance" << std::endl;
    }

private:
    std::unique_ptr<WhisperTranscriber> transcriber_;

    // Step 18: Model loading and management
    Napi::Value LoadModel(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsString()) {
            Napi::TypeError::New(env, "Model path expected").ThrowAsJavaScriptException();
            return env.Null();
        }

        std::string modelPath = info[0].As<Napi::String>().Utf8Value();
        
        bool success = transcriber_->LoadModel(modelPath);
        std::cout << "WhisperWrapper: LoadModel(" << modelPath << ") - " 
                  << (success ? "SUCCESS" : "FAILED") << std::endl;
        
        if (!success) {
            std::cout << "Error: " << transcriber_->GetLastError() << std::endl;
        }
        
        return Napi::Boolean::New(env, success);
    }

    Napi::Value UnloadModel(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        bool success = transcriber_->UnloadModel();
        std::cout << "WhisperWrapper: UnloadModel - " << (success ? "SUCCESS" : "FAILED") << std::endl;
        
        return Napi::Boolean::New(env, success);
    }

    // Step 19: Transcription pipeline
    Napi::Value Transcribe(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (!transcriber_->IsModelLoaded()) {
            Napi::Error::New(env, "Model not loaded").ThrowAsJavaScriptException();
            return env.Null();
        }

        if (info.Length() < 1) {
            Napi::TypeError::New(env, "Audio data expected").ThrowAsJavaScriptException();
            return env.Null();
        }

        std::vector<float> audioData;
        std::string language = "auto";
        
        // Handle different audio input types
        if (info[0].IsBuffer()) {
            // Handle raw PCM buffer
            auto buffer = info[0].As<Napi::Buffer<uint8_t>>();
            
            // Assume 16-bit PCM, convert to float
            const int16_t* pcmData = reinterpret_cast<const int16_t*>(buffer.Data());
            size_t sampleCount = buffer.Length() / 2;
            
            audioData = WhisperTranscriber::ConvertInt16ToFloat(pcmData, sampleCount);
            
        } else if (info[0].IsArray()) {
            // Handle float array
            auto array = info[0].As<Napi::Array>();
            audioData.reserve(array.Length());
            
            for (uint32_t i = 0; i < array.Length(); ++i) {
                audioData.push_back(array.Get(i).As<Napi::Number>().FloatValue());
            }
        } else {
            Napi::TypeError::New(env, "Audio data must be Buffer or Array").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        // Optional language parameter
        if (info.Length() > 1 && info[1].IsString()) {
            language = info[1].As<Napi::String>().Utf8Value();
        }
        
        std::cout << "WhisperWrapper: Transcribing " << audioData.size() 
                  << " samples (language: " << language << ")" << std::endl;
        
        TranscriptionResult result = transcriber_->Transcribe(audioData, language);
        
        // Convert result to JavaScript object
        Napi::Object jsResult = Napi::Object::New(env);
        jsResult.Set("success", Napi::Boolean::New(env, result.success));
        jsResult.Set("text", Napi::String::New(env, result.text));
        jsResult.Set("language", Napi::String::New(env, result.language));
        jsResult.Set("confidence", Napi::Number::New(env, result.confidence));
        jsResult.Set("duration", Napi::Number::New(env, result.duration));
        
        if (!result.success) {
            jsResult.Set("error", Napi::String::New(env, result.error_message));
        }
        
        // Add timestamps if available
        if (!result.timestamps.empty()) {
            Napi::Array timestamps = Napi::Array::New(env);
            for (size_t i = 0; i < result.timestamps.size(); ++i) {
                Napi::Object timestamp = Napi::Object::New(env);
                timestamp.Set("start", Napi::Number::New(env, result.timestamps[i].first));
                timestamp.Set("end", Napi::Number::New(env, result.timestamps[i].second));
                timestamps.Set(static_cast<uint32_t>(i), timestamp);
            }
            jsResult.Set("timestamps", timestamps);
        }
        
        std::cout << "WhisperWrapper: Transcription " << (result.success ? "completed" : "failed")
                  << (result.success ? (": \"" + result.text + "\"") : (": " + result.error_message)) << std::endl;
        
        return jsResult;
    }

    Napi::Value TranscribeFile(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsString()) {
            Napi::TypeError::New(env, "WAV file path expected").ThrowAsJavaScriptException();
            return env.Null();
        }

        std::string filePath = info[0].As<Napi::String>().Utf8Value();
        std::string language = "auto";
        
        if (info.Length() > 1 && info[1].IsString()) {
            language = info[1].As<Napi::String>().Utf8Value();
        }
        
        std::cout << "WhisperWrapper: Transcribing file " << filePath << std::endl;
        
        TranscriptionResult result = transcriber_->TranscribeFile(filePath, language);
        
        // Convert result to JavaScript object (same as Transcribe method)
        Napi::Object jsResult = Napi::Object::New(env);
        jsResult.Set("success", Napi::Boolean::New(env, result.success));
        jsResult.Set("text", Napi::String::New(env, result.text));
        jsResult.Set("language", Napi::String::New(env, result.language));
        jsResult.Set("confidence", Napi::Number::New(env, result.confidence));
        jsResult.Set("duration", Napi::Number::New(env, result.duration));
        
        if (!result.success) {
            jsResult.Set("error", Napi::String::New(env, result.error_message));
        }
        
        return jsResult;
    }

    Napi::Value IsModelLoaded(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        return Napi::Boolean::New(env, transcriber_->IsModelLoaded());
    }

    Napi::Value GetCurrentModel(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        return Napi::String::New(env, transcriber_->GetCurrentModel());
    }

    Napi::Value GetAvailableModels(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        std::string modelsDir = "./models";
        if (info.Length() > 0 && info[0].IsString()) {
            modelsDir = info[0].As<Napi::String>().Utf8Value();
        }
        
        std::vector<ModelInfo> models = transcriber_->GetAvailableModels(modelsDir);
        
        Napi::Array result = Napi::Array::New(env);
        for (size_t i = 0; i < models.size(); ++i) {
            Napi::Object model = Napi::Object::New(env);
            model.Set("name", Napi::String::New(env, models[i].name));
            model.Set("path", Napi::String::New(env, models[i].path));
            model.Set("sizeMB", Napi::Number::New(env, models[i].size_mb));
            model.Set("isMultilingual", Napi::Boolean::New(env, models[i].is_multilingual));
            model.Set("isLoaded", Napi::Boolean::New(env, models[i].is_loaded));
            result.Set(static_cast<uint32_t>(i), model);
        }
        
        return result;
    }

    Napi::Value SetThreads(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsNumber()) {
            Napi::TypeError::New(env, "Thread count expected").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        int threads = info[0].As<Napi::Number>().Int32Value();
        transcriber_->SetThreads(threads);
        
        return env.Undefined();
    }

    Napi::Value SetLanguage(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsString()) {
            Napi::TypeError::New(env, "Language code expected").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        std::string language = info[0].As<Napi::String>().Utf8Value();
        transcriber_->SetLanguage(language);
        
        return env.Undefined();
    }

    // Utility methods
    Napi::Value ConvertPCMToFloat(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsBuffer()) {
            Napi::TypeError::New(env, "PCM buffer expected").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        auto buffer = info[0].As<Napi::Buffer<uint8_t>>();
        const int16_t* pcmData = reinterpret_cast<const int16_t*>(buffer.Data());
        size_t sampleCount = buffer.Length() / 2;
        
        std::vector<float> floatData = WhisperTranscriber::ConvertInt16ToFloat(pcmData, sampleCount);
        
        Napi::Array result = Napi::Array::New(env, floatData.size());
        for (size_t i = 0; i < floatData.size(); ++i) {
            result.Set(static_cast<uint32_t>(i), Napi::Number::New(env, floatData[i]));
        }
        
        return result;
    }

    Napi::Value GetLastError(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        return Napi::String::New(env, transcriber_->GetLastError());
    }

    Napi::Value GetModelMemoryUsage(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        return Napi::Number::New(env, static_cast<double>(transcriber_->GetModelMemoryUsage()));
    }

    Napi::Value GetProcessingTime(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        return Napi::Number::New(env, transcriber_->GetProcessingTime());
    }
};

// Initialize the addon
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // Initialize whisper subsystem if needed
    std::cout << "WhisperBinding: Module initialized" << std::endl;
    
    WhisperTranscriberWrapper::Init(env, exports);
    return exports;
}

NODE_API_MODULE(whisperbinding, Init)