#include <napi.h>
#include <memory>
#include "whisper_transcription.h"

class WhisperBinding : public Napi::ObjectWrap<WhisperBinding> {
private:
    std::unique_ptr<WhisperTranscription> m_transcriber;
    Napi::ThreadSafeFunction m_progressCallback;
    Napi::ThreadSafeFunction m_downloadCallback;
    Napi::ThreadSafeFunction m_partialResultCallback;

public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::Function func = DefineClass(env, "WhisperTranscription", {
            InstanceMethod("initialize", &WhisperBinding::Initialize),
            InstanceMethod("cleanup", &WhisperBinding::Cleanup),
            InstanceMethod("isInitialized", &WhisperBinding::IsInitialized),
            InstanceMethod("getAvailableModels", &WhisperBinding::GetAvailableModels),
            InstanceMethod("getCurrentModel", &WhisperBinding::GetCurrentModel),
            InstanceMethod("downloadModel", &WhisperBinding::DownloadModel),
            InstanceMethod("loadModel", &WhisperBinding::LoadModel),
            InstanceMethod("unloadModel", &WhisperBinding::UnloadModel),
            InstanceMethod("isModelLoaded", &WhisperBinding::IsModelLoaded),
            InstanceMethod("transcribeBuffer", &WhisperBinding::TranscribeBuffer),
            InstanceMethod("transcribeFile", &WhisperBinding::TranscribeFile),
            InstanceMethod("queueTranscription", &WhisperBinding::QueueTranscription),
            InstanceMethod("getTranscriptionProgress", &WhisperBinding::GetTranscriptionProgress),
            InstanceMethod("getAllTranscriptionProgress", &WhisperBinding::GetAllTranscriptionProgress),
            InstanceMethod("cancelTranscription", &WhisperBinding::CancelTranscription),
            InstanceMethod("clearTranscriptionQueue", &WhisperBinding::ClearTranscriptionQueue),
            InstanceMethod("detectLanguage", &WhisperBinding::DetectLanguage),
            InstanceMethod("getLanguageProbabilities", &WhisperBinding::GetLanguageProbabilities),
            InstanceMethod("getSupportedLanguages", &WhisperBinding::GetSupportedLanguages),
            InstanceMethod("preprocessAudio", &WhisperBinding::PreprocessAudio),
            InstanceMethod("detectVoiceActivity", &WhisperBinding::DetectVoiceActivity),
            InstanceMethod("setProcessingThreads", &WhisperBinding::SetProcessingThreads),
            InstanceMethod("getProcessingThreads", &WhisperBinding::GetProcessingThreads),
            InstanceMethod("enableMemoryOptimization", &WhisperBinding::EnableMemoryOptimization),
            InstanceMethod("setMaxMemoryUsage", &WhisperBinding::SetMaxMemoryUsage),
            InstanceMethod("getPerformanceStats", &WhisperBinding::GetPerformanceStats),
            InstanceMethod("resetPerformanceStats", &WhisperBinding::ResetPerformanceStats),
            InstanceMethod("isGPUAvailable", &WhisperBinding::IsGPUAvailable),
            InstanceMethod("setProgressCallback", &WhisperBinding::SetProgressCallback),
            InstanceMethod("setDownloadCallback", &WhisperBinding::SetDownloadCallback),
            InstanceMethod("setPartialResultCallback", &WhisperBinding::SetPartialResultCallback),
            InstanceMethod("getLastError", &WhisperBinding::GetLastError),
            InstanceMethod("hasError", &WhisperBinding::HasError),
            InstanceMethod("clearError", &WhisperBinding::ClearError),
            InstanceMethod("setModelPath", &WhisperBinding::SetModelPath),
            InstanceMethod("getModelPath", &WhisperBinding::GetModelPath),
            InstanceMethod("setTempPath", &WhisperBinding::SetTempPath),
            InstanceMethod("getTempPath", &WhisperBinding::GetTempPath)
        });

        Napi::FunctionReference* constructor = new Napi::FunctionReference();
        *constructor = Napi::Persistent(func);
        env.SetInstanceData(constructor);

        exports.Set("WhisperTranscription", func);
        return exports;
    }

    WhisperBinding(const Napi::CallbackInfo& info) : Napi::ObjectWrap<WhisperBinding>(info) {
        m_transcriber = std::make_unique<WhisperTranscription>();
    }

    ~WhisperBinding() {
        if (m_progressCallback) {
            m_progressCallback.Release();
        }
        if (m_downloadCallback) {
            m_downloadCallback.Release();
        }
        if (m_partialResultCallback) {
            m_partialResultCallback.Release();
        }
    }

    Napi::Value Initialize(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        bool result = m_transcriber->initialize();
        return Napi::Boolean::New(env, result);
    }

    Napi::Value Cleanup(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        m_transcriber->cleanup();
        return env.Undefined();
    }

    Napi::Value IsInitialized(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        bool result = m_transcriber->isInitialized();
        return Napi::Boolean::New(env, result);
    }

    Napi::Value GetAvailableModels(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        auto models = m_transcriber->getAvailableModels();
        Napi::Array modelArray = Napi::Array::New(env, models.size());
        
        for (size_t i = 0; i < models.size(); i++) {
            const auto& model = models[i];
            Napi::Object modelObj = Napi::Object::New(env);
            
            modelObj.Set("id", Napi::String::New(env, model.id));
            modelObj.Set("name", Napi::String::New(env, model.name));
            modelObj.Set("description", Napi::String::New(env, model.description));
            modelObj.Set("filename", Napi::String::New(env, model.filename));
            modelObj.Set("url", Napi::String::New(env, model.url));
            modelObj.Set("size", Napi::Number::New(env, model.size));
            modelObj.Set("downloaded", Napi::Boolean::New(env, model.downloaded));
            modelObj.Set("loaded", Napi::Boolean::New(env, model.loaded));
            modelObj.Set("isMultilingual", Napi::Boolean::New(env, model.isMultilingual));
            modelObj.Set("speed", Napi::Number::New(env, model.speed));
            modelObj.Set("accuracy", Napi::Number::New(env, model.accuracy));
            modelObj.Set("memoryUsage", Napi::Number::New(env, model.memoryUsage));
            
            // Supported languages
            Napi::Array langArray = Napi::Array::New(env, model.supportedLanguages.size());
            for (size_t j = 0; j < model.supportedLanguages.size(); j++) {
                langArray.Set(j, Napi::String::New(env, model.supportedLanguages[j]));
            }
            modelObj.Set("supportedLanguages", langArray);
            
            modelArray.Set(i, modelObj);
        }
        
        return modelArray;
    }

    Napi::Value DownloadModel(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsString()) {
            Napi::TypeError::New(env, "Model ID required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        std::string modelId = info[0].As<Napi::String>().Utf8Value();
        
        // Optional progress callback
        std::function<void(float, const std::string&)> progressCallback = nullptr;
        if (info.Length() > 1 && info[1].IsFunction()) {
            auto jsCallback = info[1].As<Napi::Function>();
            auto tsfn = Napi::ThreadSafeFunction::New(env, jsCallback, "DownloadProgress", 0, 1);
            
            progressCallback = [tsfn](float progress, const std::string& message) {
                auto callback = [=](Napi::Env env, Napi::Function jsCallback) {
                    jsCallback.Call({
                        Napi::Number::New(env, progress),
                        Napi::String::New(env, message)
                    });
                };
                tsfn.NonBlockingCall(callback);
            };
        }
        
        bool result = m_transcriber->downloadModel(modelId, progressCallback);
        return Napi::Boolean::New(env, result);
    }

    Napi::Value LoadModel(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsString()) {
            Napi::TypeError::New(env, "Model ID required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        std::string modelId = info[0].As<Napi::String>().Utf8Value();
        bool result = m_transcriber->loadModel(modelId);
        return Napi::Boolean::New(env, result);
    }

    Napi::Value UnloadModel(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        bool result = m_transcriber->unloadModel();
        return Napi::Boolean::New(env, result);
    }

    Napi::Value IsModelLoaded(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        bool result = m_transcriber->isModelLoaded();
        return Napi::Boolean::New(env, result);
    }

    Napi::Value TranscribeBuffer(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 3 || !info[0].IsTypedArray() || !info[1].IsNumber() || !info[2].IsNumber()) {
            Napi::TypeError::New(env, "Audio buffer, sample count, and sample rate required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        Napi::Float32Array audioArray = info[0].As<Napi::Float32Array>();
        size_t sampleCount = info[1].As<Napi::Number>().Uint32Value();
        int sampleRate = info[2].As<Napi::Number>().Int32Value();
        
        // Parse options if provided
        AudioProcessingOptions options;
        if (info.Length() > 3 && info[3].IsObject()) {
            Napi::Object optionsObj = info[3].As<Napi::Object>();
            parseAudioProcessingOptions(optionsObj, options);
        }
        
        const float* audioData = audioArray.Data();
        std::string result = m_transcriber->transcribeBuffer(audioData, sampleCount, sampleRate, options);
        
        return Napi::String::New(env, result);
    }

    Napi::Value QueueTranscription(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 3 || !info[0].IsTypedArray() || !info[1].IsNumber() || !info[2].IsNumber()) {
            Napi::TypeError::New(env, "Audio buffer, sample count, and sample rate required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        Napi::Float32Array audioArray = info[0].As<Napi::Float32Array>();
        size_t sampleCount = info[1].As<Napi::Number>().Uint32Value();
        int sampleRate = info[2].As<Napi::Number>().Int32Value();
        
        AudioProcessingOptions options;
        if (info.Length() > 3 && info[3].IsObject()) {
            Napi::Object optionsObj = info[3].As<Napi::Object>();
            parseAudioProcessingOptions(optionsObj, options);
        }
        
        const float* audioData = audioArray.Data();
        std::string jobId = m_transcriber->queueTranscription(audioData, sampleCount, sampleRate, options);
        
        return Napi::String::New(env, jobId);
    }

    Napi::Value GetTranscriptionProgress(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsString()) {
            Napi::TypeError::New(env, "Job ID required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        std::string jobId = info[0].As<Napi::String>().Utf8Value();
        TranscriptionProgress progress = m_transcriber->getTranscriptionProgress(jobId);
        
        return transcriptionProgressToJS(env, progress);
    }

    Napi::Value DetectLanguage(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 3 || !info[0].IsTypedArray() || !info[1].IsNumber() || !info[2].IsNumber()) {
            Napi::TypeError::New(env, "Audio buffer, sample count, and sample rate required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        Napi::Float32Array audioArray = info[0].As<Napi::Float32Array>();
        size_t sampleCount = info[1].As<Napi::Number>().Uint32Value();
        int sampleRate = info[2].As<Napi::Number>().Int32Value();
        
        const float* audioData = audioArray.Data();
        std::string language = m_transcriber->detectLanguage(audioData, sampleCount, sampleRate);
        
        return Napi::String::New(env, language);
    }

    Napi::Value GetPerformanceStats(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        auto stats = m_transcriber->getPerformanceStats();
        Napi::Object statsObj = Napi::Object::New(env);
        
        statsObj.Set("averageProcessingTime", Napi::Number::New(env, stats.averageProcessingTime));
        statsObj.Set("averageRealTimeFactor", Napi::Number::New(env, stats.averageRealTimeFactor));
        statsObj.Set("totalTranscriptions", Napi::Number::New(env, stats.totalTranscriptions));
        statsObj.Set("failedTranscriptions", Napi::Number::New(env, stats.failedTranscriptions));
        statsObj.Set("totalAudioDuration", Napi::Number::New(env, stats.totalAudioDuration));
        statsObj.Set("totalProcessingTime", Napi::Number::New(env, stats.totalProcessingTime));
        statsObj.Set("memoryUsage", Napi::Number::New(env, stats.memoryUsage));
        statsObj.Set("gpuUtilization", Napi::Number::New(env, stats.gpuUtilization));
        statsObj.Set("activeThreads", Napi::Number::New(env, stats.activeThreads));
        statsObj.Set("queueLength", Napi::Number::New(env, stats.queueLength));
        
        return statsObj;
    }

    Napi::Value SetProgressCallback(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsFunction()) {
            Napi::TypeError::New(env, "Callback function required").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        if (m_progressCallback) {
            m_progressCallback.Release();
        }
        
        m_progressCallback = Napi::ThreadSafeFunction::New(
            env,
            info[0].As<Napi::Function>(),
            "ProgressCallback",
            0,
            1
        );
        
        m_transcriber->setProgressCallback([this](const TranscriptionProgress& progress) {
            auto callback = [=](Napi::Env env, Napi::Function jsCallback) {
                jsCallback.Call({ transcriptionProgressToJS(env, progress) });
            };
            
            m_progressCallback.NonBlockingCall(callback);
        });
        
        return env.Undefined();
    }

    Napi::Value GetLastError(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        std::string error = m_transcriber->getLastError();
        return Napi::String::New(env, error);
    }

    Napi::Value HasError(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        bool hasError = m_transcriber->hasError();
        return Napi::Boolean::New(env, hasError);
    }

    Napi::Value ClearError(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        m_transcriber->clearError();
        return env.Undefined();
    }

private:
    void parseAudioProcessingOptions(const Napi::Object& optionsObj, AudioProcessingOptions& options) {
        if (optionsObj.Has("enableVAD") && optionsObj.Get("enableVAD").IsBoolean()) {
            options.enableVAD = optionsObj.Get("enableVAD").As<Napi::Boolean>().Value();
        }
        
        if (optionsObj.Has("enableSpeakerDiarization") && optionsObj.Get("enableSpeakerDiarization").IsBoolean()) {
            options.enableSpeakerDiarization = optionsObj.Get("enableSpeakerDiarization").As<Napi::Boolean>().Value();
        }
        
        if (optionsObj.Has("enableLanguageDetection") && optionsObj.Get("enableLanguageDetection").IsBoolean()) {
            options.enableLanguageDetection = optionsObj.Get("enableLanguageDetection").As<Napi::Boolean>().Value();
        }
        
        if (optionsObj.Has("enableTimestamps") && optionsObj.Get("enableTimestamps").IsBoolean()) {
            options.enableTimestamps = optionsObj.Get("enableTimestamps").As<Napi::Boolean>().Value();
        }
        
        if (optionsObj.Has("vadThreshold") && optionsObj.Get("vadThreshold").IsNumber()) {
            options.vadThreshold = optionsObj.Get("vadThreshold").As<Napi::Number>().FloatValue();
        }
        
        if (optionsObj.Has("forceLanguage") && optionsObj.Get("forceLanguage").IsString()) {
            options.forceLanguage = optionsObj.Get("forceLanguage").As<Napi::String>().Utf8Value();
        }
        
        if (optionsObj.Has("initialPrompt") && optionsObj.Get("initialPrompt").IsString()) {
            options.initialPrompt = optionsObj.Get("initialPrompt").As<Napi::String>().Utf8Value();
        }
        
        if (optionsObj.Has("temperature") && optionsObj.Get("temperature").IsNumber()) {
            options.temperature = optionsObj.Get("temperature").As<Napi::Number>().FloatValue();
        }
        
        if (optionsObj.Has("enableGPU") && optionsObj.Get("enableGPU").IsBoolean()) {
            options.enableGPU = optionsObj.Get("enableGPU").As<Napi::Boolean>().Value();
        }
    }

    Napi::Object transcriptionProgressToJS(Napi::Env env, const TranscriptionProgress& progress) {
        Napi::Object progressObj = Napi::Object::New(env);
        
        progressObj.Set("id", Napi::String::New(env, progress.id));
        progressObj.Set("status", Napi::Number::New(env, static_cast<int>(progress.status)));
        progressObj.Set("progress", Napi::Number::New(env, progress.progress));
        progressObj.Set("currentPhase", Napi::String::New(env, progress.currentPhase));
        progressObj.Set("elapsedTime", Napi::Number::New(env, progress.elapsedTime));
        progressObj.Set("estimatedRemainingTime", Napi::Number::New(env, progress.estimatedRemainingTime));
        progressObj.Set("errorMessage", Napi::String::New(env, progress.errorMessage));
        
        // Add result if completed
        if (progress.status == TranscriptionProgress::COMPLETED) {
            Napi::Object resultObj = Napi::Object::New(env);
            resultObj.Set("text", Napi::String::New(env, progress.result.text));
            resultObj.Set("language", Napi::String::New(env, progress.result.language));
            resultObj.Set("duration", Napi::Number::New(env, progress.result.duration));
            resultObj.Set("confidence", Napi::Number::New(env, progress.result.confidence));
            resultObj.Set("processingTime", Napi::Number::New(env, progress.result.processingTime));
            progressObj.Set("result", resultObj);
        }
        
        return progressObj;
    }

    // Placeholder implementations for other methods
    NAPI_METHOD_PLACEHOLDER(GetCurrentModel)
    NAPI_METHOD_PLACEHOLDER(TranscribeFile)
    NAPI_METHOD_PLACEHOLDER(GetAllTranscriptionProgress)
    NAPI_METHOD_PLACEHOLDER(CancelTranscription)
    NAPI_METHOD_PLACEHOLDER(ClearTranscriptionQueue)
    NAPI_METHOD_PLACEHOLDER(GetLanguageProbabilities)
    NAPI_METHOD_PLACEHOLDER(GetSupportedLanguages)
    NAPI_METHOD_PLACEHOLDER(PreprocessAudio)
    NAPI_METHOD_PLACEHOLDER(DetectVoiceActivity)
    NAPI_METHOD_PLACEHOLDER(SetProcessingThreads)
    NAPI_METHOD_PLACEHOLDER(GetProcessingThreads)
    NAPI_METHOD_PLACEHOLDER(EnableMemoryOptimization)
    NAPI_METHOD_PLACEHOLDER(SetMaxMemoryUsage)
    NAPI_METHOD_PLACEHOLDER(ResetPerformanceStats)
    NAPI_METHOD_PLACEHOLDER(IsGPUAvailable)
    NAPI_METHOD_PLACEHOLDER(SetDownloadCallback)
    NAPI_METHOD_PLACEHOLDER(SetPartialResultCallback)
    NAPI_METHOD_PLACEHOLDER(SetModelPath)
    NAPI_METHOD_PLACEHOLDER(GetModelPath)
    NAPI_METHOD_PLACEHOLDER(SetTempPath)
    NAPI_METHOD_PLACEHOLDER(GetTempPath)
};

#define NAPI_METHOD_PLACEHOLDER(name) \
    Napi::Value name(const Napi::CallbackInfo& info) { \
        Napi::Env env = info.Env(); \
        return env.Undefined(); \
    }

Napi::Object InitModule(Napi::Env env, Napi::Object exports) {
    return WhisperBinding::Init(env, exports);
}

NODE_API_MODULE(whisper_transcription, InitModule)