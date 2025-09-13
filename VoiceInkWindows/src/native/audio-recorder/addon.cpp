/**
 * Audio Recorder Native Module - Stub Implementation
 * This is a placeholder that compiles but doesn't implement real functionality yet
 */

#include <napi.h>
#include <iostream>

class AudioRecorderStub : public Napi::ObjectWrap<AudioRecorderStub> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::HandleScope scope(env);

        Napi::Function func = DefineClass(env, "AudioRecorderStub", {
            InstanceMethod("startRecording", &AudioRecorderStub::StartRecording),
            InstanceMethod("stopRecording", &AudioRecorderStub::StopRecording),
            InstanceMethod("getDevices", &AudioRecorderStub::GetDevices),
            InstanceMethod("getLevel", &AudioRecorderStub::GetLevel)
        });

        exports.Set("AudioRecorder", func);
        return exports;
    }

    AudioRecorderStub(const Napi::CallbackInfo& info) : Napi::ObjectWrap<AudioRecorderStub>(info) {}

private:
    Napi::Value StartRecording(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        // Stub implementation
        std::cout << "AudioRecorder: StartRecording called (stub)" << std::endl;
        return Napi::Boolean::New(env, true);
    }

    Napi::Value StopRecording(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        // Stub implementation  
        std::cout << "AudioRecorder: StopRecording called (stub)" << std::endl;
        
        // Return a fake audio buffer
        Napi::Object result = Napi::Object::New(env);
        result.Set("data", Napi::Buffer<char>::New(env, 1024)); // 1KB dummy buffer
        result.Set("duration", Napi::Number::New(env, 1.0));
        return result;
    }

    Napi::Value GetDevices(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        // Return fake device list
        Napi::Array devices = Napi::Array::New(env);
        Napi::Object device = Napi::Object::New(env);
        device.Set("id", Napi::String::New(env, "0"));
        device.Set("name", Napi::String::New(env, "Default Microphone (Stub)"));
        device.Set("isDefault", Napi::Boolean::New(env, true));
        devices.Set(0u, device);
        
        return devices;
    }

    Napi::Value GetLevel(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        // Return fake audio level
        return Napi::Number::New(env, 50.0);
    }
};

// Initialize the addon
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    AudioRecorderStub::Init(env, exports);
    return exports;
}

NODE_API_MODULE(audiorecorder, Init)