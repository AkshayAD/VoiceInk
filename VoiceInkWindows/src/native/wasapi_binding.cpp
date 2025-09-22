#include <napi.h>
#include <memory>
#include <thread>
#include "wasapi_recorder.h"

class WASAPIBinding : public Napi::ObjectWrap<WASAPIBinding> {
private:
    std::unique_ptr<WASAPIRecorder> m_recorder;
    Napi::ThreadSafeFunction m_audioDataCallback;
    Napi::ThreadSafeFunction m_levelCallback;
    Napi::ThreadSafeFunction m_deviceChangeCallback;

public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::Function func = DefineClass(env, "WASAPIRecorder", {
            InstanceMethod("initialize", &WASAPIBinding::Initialize),
            InstanceMethod("enumerateDevices", &WASAPIBinding::EnumerateDevices),
            InstanceMethod("selectDevice", &WASAPIBinding::SelectDevice),
            InstanceMethod("getCurrentDevice", &WASAPIBinding::GetCurrentDevice),
            InstanceMethod("startRecording", &WASAPIBinding::StartRecording),
            InstanceMethod("stopRecording", &WASAPIBinding::StopRecording),
            InstanceMethod("pauseRecording", &WASAPIBinding::PauseRecording),
            InstanceMethod("resumeRecording", &WASAPIBinding::ResumeRecording),
            InstanceMethod("isRecording", &WASAPIBinding::IsRecording),
            InstanceMethod("isPaused", &WASAPIBinding::IsPaused),
            InstanceMethod("getCurrentLevel", &WASAPIBinding::GetCurrentLevel),
            InstanceMethod("getPeakLevel", &WASAPIBinding::GetPeakLevel),
            InstanceMethod("resetPeakLevel", &WASAPIBinding::ResetPeakLevel),
            InstanceMethod("getAudioData", &WASAPIBinding::GetAudioData),
            InstanceMethod("hasAudioData", &WASAPIBinding::HasAudioData),
            InstanceMethod("clearBuffer", &WASAPIBinding::ClearBuffer),
            InstanceMethod("setFormat", &WASAPIBinding::SetFormat),
            InstanceMethod("getFormat", &WASAPIBinding::GetFormat),
            InstanceMethod("setBufferSize", &WASAPIBinding::SetBufferSize),
            InstanceMethod("getBufferSize", &WASAPIBinding::GetBufferSize),
            InstanceMethod("enableNoiseSupression", &WASAPIBinding::EnableNoiseSupression),
            InstanceMethod("enableEchoCancellation", &WASAPIBinding::EnableEchoCancellation),
            InstanceMethod("enableAutomaticGainControl", &WASAPIBinding::EnableAutomaticGainControl),
            InstanceMethod("setGainLevel", &WASAPIBinding::SetGainLevel),
            InstanceMethod("getPerformanceStats", &WASAPIBinding::GetPerformanceStats),
            InstanceMethod("setAudioDataCallback", &WASAPIBinding::SetAudioDataCallback),
            InstanceMethod("setLevelCallback", &WASAPIBinding::SetLevelCallback),
            InstanceMethod("setDeviceChangeCallback", &WASAPIBinding::SetDeviceChangeCallback),
            InstanceMethod("getLastError", &WASAPIBinding::GetLastError),
            InstanceMethod("hasError", &WASAPIBinding::HasError),
            InstanceMethod("clearError", &WASAPIBinding::ClearError)
        });

        Napi::FunctionReference* constructor = new Napi::FunctionReference();
        *constructor = Napi::Persistent(func);
        env.SetInstanceData(constructor);

        exports.Set("WASAPIRecorder", func);
        return exports;
    }

    WASAPIBinding(const Napi::CallbackInfo& info) : Napi::ObjectWrap<WASAPIBinding>(info) {
        m_recorder = std::make_unique<WASAPIRecorder>();
    }

    ~WASAPIBinding() {
        if (m_audioDataCallback) {
            m_audioDataCallback.Release();
        }
        if (m_levelCallback) {
            m_levelCallback.Release();
        }
        if (m_deviceChangeCallback) {
            m_deviceChangeCallback.Release();
        }
    }

    Napi::Value Initialize(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        bool result = m_recorder->initialize();
        return Napi::Boolean::New(env, result);
    }

    Napi::Value EnumerateDevices(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        auto devices = m_recorder->enumerateDevices();
        Napi::Array deviceArray = Napi::Array::New(env, devices.size());
        
        for (size_t i = 0; i < devices.size(); i++) {
            const auto& device = devices[i];
            Napi::Object deviceObj = Napi::Object::New(env);
            
            deviceObj.Set("id", Napi::String::New(env, WASAPIUtils::wstringToString(device.id)));
            deviceObj.Set("name", Napi::String::New(env, WASAPIUtils::wstringToString(device.name)));
            deviceObj.Set("description", Napi::String::New(env, WASAPIUtils::wstringToString(device.description)));
            deviceObj.Set("isDefault", Napi::Boolean::New(env, device.isDefault));
            deviceObj.Set("isActive", Napi::Boolean::New(env, device.isActive));
            deviceObj.Set("state", Napi::Number::New(env, device.state));
            
            deviceArray.Set(i, deviceObj);
        }
        
        return deviceArray;
    }

    Napi::Value SelectDevice(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsString()) {
            Napi::TypeError::New(env, "Device ID required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        std::string deviceId = info[0].As<Napi::String>().Utf8Value();
        std::wstring wDeviceId = WASAPIUtils::stringToWstring(deviceId);
        
        bool result = m_recorder->selectDevice(wDeviceId);
        return Napi::Boolean::New(env, result);
    }

    Napi::Value GetCurrentDevice(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        AudioDevice device = m_recorder->getCurrentDevice();
        Napi::Object deviceObj = Napi::Object::New(env);
        
        deviceObj.Set("id", Napi::String::New(env, WASAPIUtils::wstringToString(device.id)));
        deviceObj.Set("name", Napi::String::New(env, WASAPIUtils::wstringToString(device.name)));
        deviceObj.Set("description", Napi::String::New(env, WASAPIUtils::wstringToString(device.description)));
        deviceObj.Set("isDefault", Napi::Boolean::New(env, device.isDefault));
        deviceObj.Set("isActive", Napi::Boolean::New(env, device.isActive));
        deviceObj.Set("state", Napi::Number::New(env, device.state));
        
        return deviceObj;
    }

    Napi::Value StartRecording(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        bool result = m_recorder->startRecording();
        return Napi::Boolean::New(env, result);
    }

    Napi::Value StopRecording(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        bool result = m_recorder->stopRecording();
        return Napi::Boolean::New(env, result);
    }

    Napi::Value PauseRecording(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        bool result = m_recorder->pauseRecording();
        return Napi::Boolean::New(env, result);
    }

    Napi::Value ResumeRecording(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        bool result = m_recorder->resumeRecording();
        return Napi::Boolean::New(env, result);
    }

    Napi::Value IsRecording(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        bool result = m_recorder->isRecording();
        return Napi::Boolean::New(env, result);
    }

    Napi::Value IsPaused(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        bool result = m_recorder->isPaused();
        return Napi::Boolean::New(env, result);
    }

    Napi::Value GetCurrentLevel(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        float level = m_recorder->getCurrentLevel();
        return Napi::Number::New(env, level);
    }

    Napi::Value GetPeakLevel(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        float level = m_recorder->getPeakLevel();
        return Napi::Number::New(env, level);
    }

    Napi::Value ResetPeakLevel(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        m_recorder->resetPeakLevel();
        return env.Undefined();
    }

    Napi::Value GetAudioData(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        size_t maxFrames = 0;
        if (info.Length() > 0 && info[0].IsNumber()) {
            maxFrames = info[0].As<Napi::Number>().Uint32Value();
        }
        
        auto audioData = m_recorder->getAudioData(maxFrames);
        
        // Create Float32Array
        auto arrayBuffer = Napi::ArrayBuffer::New(env, audioData.size() * sizeof(float));
        std::memcpy(arrayBuffer.Data(), audioData.data(), audioData.size() * sizeof(float));
        
        return Napi::Float32Array::New(env, audioData.size(), arrayBuffer, 0);
    }

    Napi::Value HasAudioData(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        bool result = m_recorder->hasAudioData();
        return Napi::Boolean::New(env, result);
    }

    Napi::Value ClearBuffer(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        m_recorder->clearBuffer();
        return env.Undefined();
    }

    Napi::Value SetFormat(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 3) {
            Napi::TypeError::New(env, "Sample rate, channels, and bits per sample required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        UINT32 sampleRate = info[0].As<Napi::Number>().Uint32Value();
        UINT32 channels = info[1].As<Napi::Number>().Uint32Value();
        UINT32 bitsPerSample = info[2].As<Napi::Number>().Uint32Value();
        
        bool result = m_recorder->setFormat(sampleRate, channels, bitsPerSample);
        return Napi::Boolean::New(env, result);
    }

    Napi::Value GetFormat(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        WAVEFORMATEX format = m_recorder->getFormat();
        Napi::Object formatObj = Napi::Object::New(env);
        
        formatObj.Set("sampleRate", Napi::Number::New(env, format.nSamplesPerSec));
        formatObj.Set("channels", Napi::Number::New(env, format.nChannels));
        formatObj.Set("bitsPerSample", Napi::Number::New(env, format.wBitsPerSample));
        formatObj.Set("blockAlign", Napi::Number::New(env, format.nBlockAlign));
        formatObj.Set("avgBytesPerSec", Napi::Number::New(env, format.nAvgBytesPerSec));
        
        return formatObj;
    }

    Napi::Value SetBufferSize(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsNumber()) {
            Napi::TypeError::New(env, "Buffer size in milliseconds required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        UINT32 bufferSizeMs = info[0].As<Napi::Number>().Uint32Value();
        m_recorder->setBufferSize(bufferSizeMs);
        
        return env.Undefined();
    }

    Napi::Value GetBufferSize(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        UINT32 bufferSize = m_recorder->getBufferSize();
        return Napi::Number::New(env, bufferSize);
    }

    Napi::Value EnableNoiseSupression(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsBoolean()) {
            Napi::TypeError::New(env, "Boolean value required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        bool enable = info[0].As<Napi::Boolean>().Value();
        m_recorder->enableNoiseSupression(enable);
        
        return env.Undefined();
    }

    Napi::Value EnableEchoCancellation(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsBoolean()) {
            Napi::TypeError::New(env, "Boolean value required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        bool enable = info[0].As<Napi::Boolean>().Value();
        m_recorder->enableEchoCancellation(enable);
        
        return env.Undefined();
    }

    Napi::Value EnableAutomaticGainControl(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsBoolean()) {
            Napi::TypeError::New(env, "Boolean value required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        bool enable = info[0].As<Napi::Boolean>().Value();
        m_recorder->enableAutomaticGainControl(enable);
        
        return env.Undefined();
    }

    Napi::Value SetGainLevel(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsNumber()) {
            Napi::TypeError::New(env, "Gain level required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        float gain = info[0].As<Napi::Number>().FloatValue();
        m_recorder->setGainLevel(gain);
        
        return env.Undefined();
    }

    Napi::Value GetPerformanceStats(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        auto stats = m_recorder->getPerformanceStats();
        Napi::Object statsObj = Napi::Object::New(env);
        
        statsObj.Set("cpuUsage", Napi::Number::New(env, stats.cpuUsage));
        statsObj.Set("memoryUsage", Napi::Number::New(env, stats.memoryUsage));
        statsObj.Set("droppedFrames", Napi::Number::New(env, stats.droppedFrames));
        statsObj.Set("averageLatency", Napi::Number::New(env, stats.averageLatency));
        statsObj.Set("bufferOverruns", Napi::Number::New(env, stats.bufferOverruns));
        statsObj.Set("bufferUnderruns", Napi::Number::New(env, stats.bufferUnderruns));
        
        return statsObj;
    }

    Napi::Value SetAudioDataCallback(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsFunction()) {
            Napi::TypeError::New(env, "Callback function required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        if (m_audioDataCallback) {
            m_audioDataCallback.Release();
        }
        
        m_audioDataCallback = Napi::ThreadSafeFunction::New(
            env,
            info[0].As<Napi::Function>(),
            "AudioDataCallback",
            0,
            1
        );
        
        m_recorder->setAudioDataCallback([this](const float* data, size_t frameCount, double timestamp) {
            auto callback = [=](Napi::Env env, Napi::Function jsCallback) {
                auto arrayBuffer = Napi::ArrayBuffer::New(env, frameCount * sizeof(float));
                std::memcpy(arrayBuffer.Data(), data, frameCount * sizeof(float));
                auto float32Array = Napi::Float32Array::New(env, frameCount, arrayBuffer, 0);
                
                jsCallback.Call({
                    float32Array,
                    Napi::Number::New(env, frameCount),
                    Napi::Number::New(env, timestamp)
                });
            };
            
            m_audioDataCallback.BlockingCall(callback);
        });
        
        return env.Undefined();
    }

    Napi::Value SetLevelCallback(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsFunction()) {
            Napi::TypeError::New(env, "Callback function required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        if (m_levelCallback) {
            m_levelCallback.Release();
        }
        
        m_levelCallback = Napi::ThreadSafeFunction::New(
            env,
            info[0].As<Napi::Function>(),
            "LevelCallback",
            0,
            1
        );
        
        m_recorder->setLevelCallback([this](float level, float peak) {
            auto callback = [=](Napi::Env env, Napi::Function jsCallback) {
                jsCallback.Call({
                    Napi::Number::New(env, level),
                    Napi::Number::New(env, peak)
                });
            };
            
            m_levelCallback.NonBlockingCall(callback);
        });
        
        return env.Undefined();
    }

    Napi::Value SetDeviceChangeCallback(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsFunction()) {
            Napi::TypeError::New(env, "Callback function required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        if (m_deviceChangeCallback) {
            m_deviceChangeCallback.Release();
        }
        
        m_deviceChangeCallback = Napi::ThreadSafeFunction::New(
            env,
            info[0].As<Napi::Function>(),
            "DeviceChangeCallback",
            0,
            1
        );
        
        m_recorder->setDeviceChangeCallback([this](const AudioDevice& device, bool connected) {
            auto callback = [=](Napi::Env env, Napi::Function jsCallback) {
                Napi::Object deviceObj = Napi::Object::New(env);
                deviceObj.Set("id", Napi::String::New(env, WASAPIUtils::wstringToString(device.id)));
                deviceObj.Set("name", Napi::String::New(env, WASAPIUtils::wstringToString(device.name)));
                deviceObj.Set("description", Napi::String::New(env, WASAPIUtils::wstringToString(device.description)));
                deviceObj.Set("isDefault", Napi::Boolean::New(env, device.isDefault));
                deviceObj.Set("isActive", Napi::Boolean::New(env, device.isActive));
                deviceObj.Set("state", Napi::Number::New(env, device.state));
                
                jsCallback.Call({
                    deviceObj,
                    Napi::Boolean::New(env, connected)
                });
            };
            
            m_deviceChangeCallback.NonBlockingCall(callback);
        });
        
        return env.Undefined();
    }

    Napi::Value GetLastError(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        std::wstring error = m_recorder->getLastError();
        return Napi::String::New(env, WASAPIUtils::wstringToString(error));
    }

    Napi::Value HasError(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        bool hasError = m_recorder->hasError();
        return Napi::Boolean::New(env, hasError);
    }

    Napi::Value ClearError(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        m_recorder->clearError();
        return env.Undefined();
    }
};

Napi::Object InitModule(Napi::Env env, Napi::Object exports) {
    return WASAPIBinding::Init(env, exports);
}

NODE_API_MODULE(wasapi_recorder, InitModule)