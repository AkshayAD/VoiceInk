#include "whisper_transcription.h"
#include <fstream>
#include <sstream>
#include <algorithm>
#include <chrono>
#include <random>
#include <filesystem>
#include <cmath>
#include <iostream>
#include <future>
#include <regex>

// Include Whisper.cpp headers (would normally be from the whisper.cpp submodule)
#ifdef WHISPER_CPP_AVAILABLE
#include "whisper.h"
#else
// Mock definitions for compilation without whisper.cpp
struct whisper_context {};
struct whisper_full_params {
    int n_threads;
    float temperature;
    int beam_size;
    bool translate;
    const char* language;
    const char* initial_prompt;
    bool print_progress;
    bool print_realtime;
    bool print_timestamps;
    float max_segment_length;
    float segment_threshold;
    float compression_ratio_threshold;
    float logprob_threshold;
    bool suppress_non_speech_tokens;
};

// Mock functions
extern "C" {
    whisper_context* whisper_init_from_file(const char* path_model) { return nullptr; }
    void whisper_free(whisper_context* ctx) {}
    whisper_full_params whisper_full_default_params(int strategy) { return {}; }
    int whisper_full(whisper_context* ctx, whisper_full_params params, const float* samples, int n_samples) { return 0; }
    int whisper_full_n_segments(whisper_context* ctx) { return 0; }
    const char* whisper_full_get_segment_text(whisper_context* ctx, int i_segment) { return ""; }
    int64_t whisper_full_get_segment_t0(whisper_context* ctx, int i_segment) { return 0; }
    int64_t whisper_full_get_segment_t1(whisper_context* ctx, int i_segment) { return 0; }
    float whisper_full_get_segment_p(whisper_context* ctx, int i_segment) { return 0.0f; }
    int whisper_lang_id(const char* lang) { return 0; }
    const char* whisper_lang_str(int id) { return "en"; }
    bool whisper_is_multilingual(whisper_context* ctx) { return true; }
    int whisper_model_n_vocab(whisper_context* ctx) { return 0; }
    int whisper_model_n_audio_ctx(whisper_context* ctx) { return 0; }
    int whisper_model_n_audio_state(whisper_context* ctx) { return 0; }
    int whisper_model_n_audio_head(whisper_context* ctx) { return 0; }
    int whisper_model_n_audio_layer(whisper_context* ctx) { return 0; }
    int whisper_model_n_text_ctx(whisper_context* ctx) { return 0; }
    int whisper_model_n_text_state(whisper_context* ctx) { return 0; }
    int whisper_model_n_text_head(whisper_context* ctx) { return 0; }
    int whisper_model_n_text_layer(whisper_context* ctx) { return 0; }
    int whisper_model_n_mels(whisper_context* ctx) { return 0; }
    int whisper_model_ftype(whisper_context* ctx) { return 0; }
}
#endif

constexpr int WHISPER_SAMPLE_RATE = 16000;
constexpr double WHISPER_CHUNK_LENGTH = 30.0; // 30 second chunks
constexpr size_t MAX_COMPLETED_JOBS = 100;
constexpr int DEFAULT_THREADS = 4;

WhisperTranscription::WhisperTranscription()
    : m_currentModel(nullptr)
    , m_loadedModelId("")
    , m_modelPath("models")
    , m_tempPath("temp")
    , m_shouldStop(false)
    , m_initialized(false)
    , m_processingThreads(DEFAULT_THREADS)
    , m_currentGPUDevice(-1)
    , m_gpuAvailable(false)
    , m_speakerDiarizationEnabled(false)
    , m_memoryOptimizationEnabled(true)
    , m_maxMemoryUsage(2048) // 2GB default
{
    memset(&m_perfStats, 0, sizeof(PerformanceStats));
    m_lastStatsUpdate = std::chrono::high_resolution_clock::now();
}

WhisperTranscription::~WhisperTranscription() {
    cleanup();
}

bool WhisperTranscription::initialize() {
    if (m_initialized) {
        return true;
    }

    // Create necessary directories
    std::filesystem::create_directories(m_modelPath);
    std::filesystem::create_directories(m_tempPath);

    // Initialize GPU support
    m_gpuAvailable = initializeGPU();

    // Start worker threads
    m_shouldStop = false;
    for (int i = 0; i < m_processingThreads; i++) {
        m_workerThreads.emplace_back(&WhisperTranscription::workerThread, this);
    }

    m_initialized = true;
    std::cout << "WhisperTranscription initialized with " << m_processingThreads << " threads" << std::endl;
    
    return true;
}

void WhisperTranscription::cleanup() {
    if (!m_initialized) {
        return;
    }

    // Stop worker threads
    m_shouldStop = true;
    for (auto& thread : m_workerThreads) {
        if (thread.joinable()) {
            thread.join();
        }
    }
    m_workerThreads.clear();

    // Unload current model
    unloadModel();

    // Cleanup GPU
    cleanupGPU();

    // Clear queues and sessions
    {
        std::lock_guard<std::mutex> lock(m_queueMutex);
        while (!m_transcriptionQueue.empty()) {
            m_transcriptionQueue.pop();
        }
        m_activeJobs.clear();
        m_completedJobs.clear();
    }

    {
        std::lock_guard<std::mutex> lock(m_streamingMutex);
        m_streamingSessions.clear();
    }

    m_initialized = false;
    std::cout << "WhisperTranscription cleanup complete" << std::endl;
}

std::vector<WhisperModel> WhisperTranscription::getAvailableModels() {
    std::vector<WhisperModel> models;

    // Define available Whisper models
    models.push_back({
        "tiny", "Tiny", "Fastest model, lowest quality",
        "ggml-tiny.bin", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
        39 * 1024 * 1024, false, false, false, {"en"}, 5.0f, 0.6f, 125.0f
    });

    models.push_back({
        "tiny.en", "Tiny (English)", "Fastest English-only model",
        "ggml-tiny.en.bin", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin",
        39 * 1024 * 1024, false, false, false, {"en"}, 5.2f, 0.65f, 125.0f
    });

    models.push_back({
        "base", "Base", "Good balance of speed and quality",
        "ggml-base.bin", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
        147 * 1024 * 1024, false, false, true, {}, 3.5f, 0.75f, 210.0f
    });

    models.push_back({
        "base.en", "Base (English)", "Good balance, English-only",
        "ggml-base.en.bin", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin",
        147 * 1024 * 1024, false, false, false, {"en"}, 3.7f, 0.78f, 210.0f
    });

    models.push_back({
        "small", "Small", "Better quality, reasonable speed",
        "ggml-small.bin", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
        488 * 1024 * 1024, false, false, true, {}, 2.8f, 0.85f, 465.0f
    });

    models.push_back({
        "small.en", "Small (English)", "Better quality, English-only",
        "ggml-small.en.bin", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin",
        488 * 1024 * 1024, false, false, false, {"en"}, 2.9f, 0.87f, 465.0f
    });

    models.push_back({
        "medium", "Medium", "High quality, slower processing",
        "ggml-medium.bin", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin",
        1542 * 1024 * 1024, false, false, true, {}, 1.8f, 0.92f, 1020.0f
    });

    models.push_back({
        "medium.en", "Medium (English)", "High quality, English-only",
        "ggml-medium.en.bin", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin",
        1542 * 1024 * 1024, false, false, false, {"en"}, 1.9f, 0.93f, 1020.0f
    });

    models.push_back({
        "large", "Large", "Highest quality, slowest processing",
        "ggml-large.bin", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large.bin",
        3094 * 1024 * 1024, false, false, true, {}, 1.0f, 0.95f, 2080.0f
    });

    // Check which models are already downloaded
    for (auto& model : models) {
        std::string modelPath = m_modelPath + "/" + model.filename;
        if (std::filesystem::exists(modelPath)) {
            model.downloaded = true;
            // Check if it's the currently loaded model
            if (model.id == m_loadedModelId) {
                model.loaded = true;
            }
        }
    }

    return models;
}

bool WhisperTranscription::downloadModel(const std::string& modelId, std::function<void(float, const std::string&)> progressCallback) {
    auto models = getAvailableModels();
    auto modelIt = std::find_if(models.begin(), models.end(),
        [&modelId](const WhisperModel& m) { return m.id == modelId; });

    if (modelIt == models.end()) {
        setError("Model not found: " + modelId);
        return false;
    }

    const WhisperModel& model = *modelIt;
    if (model.downloaded) {
        return true; // Already downloaded
    }

    if (progressCallback) {
        progressCallback(0.0f, "Starting download...");
    }

    std::string targetPath = m_modelPath + "/" + model.filename;
    
    try {
        // In a real implementation, this would download from the URL
        // For now, we'll simulate the download process
        if (progressCallback) {
            for (int i = 0; i <= 100; i += 10) {
                progressCallback(i / 100.0f, "Downloading... " + std::to_string(i) + "%");
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
            }
        }

        // Create a mock model file for demonstration
        std::ofstream file(targetPath, std::ios::binary);
        if (!file) {
            setError("Failed to create model file: " + targetPath);
            return false;
        }

        // Write some mock data to represent the model
        std::vector<char> mockData(1024 * 1024, 'M'); // 1MB of 'M' characters
        file.write(mockData.data(), mockData.size());
        file.close();

        if (progressCallback) {
            progressCallback(1.0f, "Download completed");
        }

        if (m_downloadCallback) {
            m_downloadCallback(modelId, 1.0f, "Download completed");
        }

        std::cout << "Model downloaded: " << modelId << " -> " << targetPath << std::endl;
        return true;

    } catch (const std::exception& e) {
        setError("Download failed: " + std::string(e.what()));
        return false;
    }
}

bool WhisperTranscription::loadModel(const std::string& modelId) {
    std::lock_guard<std::mutex> lock(m_modelMutex);

    if (m_loadedModelId == modelId && m_currentModel != nullptr) {
        return true; // Already loaded
    }

    // Unload current model if any
    if (m_currentModel) {
        unloadModel();
    }

    // Find model info
    auto models = getAvailableModels();
    auto modelIt = std::find_if(models.begin(), models.end(),
        [&modelId](const WhisperModel& m) { return m.id == modelId; });

    if (modelIt == models.end()) {
        setError("Model not found: " + modelId);
        return false;
    }

    const WhisperModel& model = *modelIt;
    std::string modelPath = m_modelPath + "/" + model.filename;

    if (!std::filesystem::exists(modelPath)) {
        setError("Model file not found: " + modelPath + ". Please download the model first.");
        return false;
    }

    // Load the model with Whisper.cpp
#ifdef WHISPER_CPP_AVAILABLE
    m_currentModel = whisper_init_from_file(modelPath.c_str());
    if (!m_currentModel) {
        setError("Failed to load Whisper model from: " + modelPath);
        return false;
    }
#else
    // Mock loading for compilation without whisper.cpp
    m_currentModel = reinterpret_cast<whisper_context*>(0x1); // Non-null pointer
    std::cout << "Mock: Loading Whisper model: " << modelPath << std::endl;
#endif

    m_loadedModelId = modelId;
    std::cout << "Whisper model loaded: " << modelId << std::endl;
    return true;
}

bool WhisperTranscription::unloadModel() {
    std::lock_guard<std::mutex> lock(m_modelMutex);

    if (m_currentModel) {
#ifdef WHISPER_CPP_AVAILABLE
        whisper_free(m_currentModel);
#endif
        m_currentModel = nullptr;
        m_loadedModelId = "";
        std::cout << "Whisper model unloaded" << std::endl;
    }

    return true;
}

std::string WhisperTranscription::transcribeBuffer(const float* audioData, size_t sampleCount, int sampleRate, const AudioProcessingOptions& options) {
    if (!m_currentModel) {
        setError("No model loaded. Please load a model first.");
        return "";
    }

    try {
        TranscriptionResult result = processAudio(audioData, sampleCount, sampleRate, options);
        return result.text;
    } catch (const std::exception& e) {
        setError("Transcription failed: " + std::string(e.what()));
        return "";
    }
}

std::string WhisperTranscription::queueTranscription(const float* audioData, size_t sampleCount, int sampleRate, const AudioProcessingOptions& options) {
    std::string jobId = generateJobId();
    
    auto job = std::make_shared<TranscriptionJob>();
    job->id = jobId;
    job->audioData.assign(audioData, audioData + sampleCount);
    job->sampleRate = sampleRate;
    job->options = options;
    job->progress.id = jobId;
    job->progress.status = TranscriptionProgress::QUEUED;
    job->progress.progress = 0.0f;
    job->startTime = std::chrono::high_resolution_clock::now();

    {
        std::lock_guard<std::mutex> lock(m_queueMutex);
        m_transcriptionQueue.push(job);
        m_activeJobs[jobId] = job;
    }

    std::cout << "Queued transcription job: " << jobId << std::endl;
    return jobId;
}

TranscriptionProgress WhisperTranscription::getTranscriptionProgress(const std::string& jobId) {
    std::lock_guard<std::mutex> lock(m_progressMutex);
    
    // Check completed jobs first
    auto completedIt = m_completedJobs.find(jobId);
    if (completedIt != m_completedJobs.end()) {
        return completedIt->second;
    }
    
    // Check active jobs
    auto activeIt = m_activeJobs.find(jobId);
    if (activeIt != m_activeJobs.end()) {
        return activeIt->second->progress;
    }
    
    // Job not found
    TranscriptionProgress notFound;
    notFound.id = jobId;
    notFound.status = TranscriptionProgress::ERROR;
    notFound.errorMessage = "Job not found";
    return notFound;
}

std::string WhisperTranscription::detectLanguage(const float* audioData, size_t sampleCount, int sampleRate) {
    if (!m_currentModel) {
        setError("No model loaded. Please load a model first.");
        return "en";
    }

    try {
        // Preprocess audio to Whisper's expected format
        auto processedAudio = preprocessAudio(audioData, sampleCount, sampleRate, WHISPER_SAMPLE_RATE);
        
        // Use first 30 seconds for language detection
        size_t maxSamples = WHISPER_SAMPLE_RATE * 30;
        if (processedAudio.size() > maxSamples) {
            processedAudio.resize(maxSamples);
        }

#ifdef WHISPER_CPP_AVAILABLE
        // Create parameters for language detection
        whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
        params.print_progress = false;
        params.print_realtime = false;
        params.print_timestamps = false;
        params.translate = false;
        params.language = nullptr; // Auto-detect
        params.n_threads = m_processingThreads;

        // Run transcription for language detection
        if (whisper_full(m_currentModel, params, processedAudio.data(), processedAudio.size()) != 0) {
            setError("Language detection failed");
            return "en";
        }

        // Get the most likely language
        // In a real implementation, this would use whisper's language detection
        return "en"; // Placeholder
#else
        // Mock language detection
        std::cout << "Mock: Detecting language for " << processedAudio.size() << " samples" << std::endl;
        return "en";
#endif

    } catch (const std::exception& e) {
        setError("Language detection failed: " + std::string(e.what()));
        return "en";
    }
}

TranscriptionResult WhisperTranscription::processAudio(const float* audioData, size_t sampleCount, int sampleRate, const AudioProcessingOptions& options) {
    auto startTime = std::chrono::high_resolution_clock::now();
    
    TranscriptionResult result;
    result.duration = static_cast<double>(sampleCount) / sampleRate;

    try {
        // Preprocess audio
        auto processedAudio = preprocessAudio(audioData, sampleCount, sampleRate, WHISPER_SAMPLE_RATE);
        
        // Voice activity detection
        if (options.enableVAD && !detectVoiceActivity(processedAudio.data(), processedAudio.size(), WHISPER_SAMPLE_RATE, options.vadThreshold)) {
            result.text = "";
            result.confidence = 0.0f;
            result.language = "en";
            return result;
        }

        // Language detection
        if (options.enableLanguageDetection && options.forceLanguage.empty()) {
            result.language = detectLanguageInternal(processedAudio.data(), processedAudio.size(), WHISPER_SAMPLE_RATE);
        } else if (!options.forceLanguage.empty()) {
            result.language = options.forceLanguage;
        } else {
            result.language = "en";
        }

        // Perform transcription
        result = transcribeWithWhisper(processedAudio.data(), processedAudio.size(), WHISPER_SAMPLE_RATE, options);

        // Post-processing
        if (options.enablePunctuation || options.enableCapitalization) {
            // Apply punctuation and capitalization restoration
            result.text = applyPostProcessing(result.text, options);
        }

        // Speaker diarization
        if (options.enableSpeakerDiarization && m_speakerDiarizationEnabled) {
            result.segments = performSpeakerDiarizationInternal(processedAudio.data(), processedAudio.size(), WHISPER_SAMPLE_RATE, result.segments);
            result.hasMultipleSpeakers = (result.speakerCount > 1);
        }

        auto endTime = std::chrono::high_resolution_clock::now();
        result.processingTime = std::chrono::duration<double>(endTime - startTime).count();

        return result;

    } catch (const std::exception& e) {
        setError("Audio processing failed: " + std::string(e.what()));
        result.text = "";
        result.confidence = 0.0f;
        return result;
    }
}

TranscriptionResult WhisperTranscription::transcribeWithWhisper(const float* audioData, size_t sampleCount, int sampleRate, const AudioProcessingOptions& options) {
    TranscriptionResult result;

#ifdef WHISPER_CPP_AVAILABLE
    // Create Whisper parameters
    whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    params.n_threads = m_processingThreads;
    params.translate = false;
    params.language = options.forceLanguage.empty() ? nullptr : options.forceLanguage.c_str();
    params.initial_prompt = options.initialPrompt.empty() ? nullptr : options.initialPrompt.c_str();
    params.print_progress = false;
    params.print_realtime = false;
    params.print_timestamps = options.enableTimestamps;
    params.max_segment_length = options.silenceThreshold;
    params.temperature = options.temperature;
    params.compression_ratio_threshold = options.compressionRatio;
    params.logprob_threshold = options.logProbThreshold;
    params.suppress_non_speech_tokens = options.suppressNonSpeech;

    // Run transcription
    if (whisper_full(m_currentModel, params, audioData, sampleCount) != 0) {
        setError("Whisper transcription failed");
        return result;
    }

    // Extract results
    result = extractWhisperResult(m_currentModel, options);
#else
    // Mock transcription for compilation without whisper.cpp
    std::cout << "Mock: Transcribing " << sampleCount << " samples at " << sampleRate << "Hz" << std::endl;
    
    result.text = "This is a mock transcription result. The actual implementation would use Whisper.cpp to process the audio and generate accurate transcriptions.";
    result.language = options.forceLanguage.empty() ? "en" : options.forceLanguage;
    result.confidence = 0.85f;
    result.duration = static_cast<double>(sampleCount) / sampleRate;
    result.segmentCount = 1;
    result.hasMultipleSpeakers = false;
    result.speakerCount = 1;
    
    // Create a mock segment
    TranscriptionSegment segment;
    segment.startTime = 0.0;
    segment.endTime = result.duration;
    segment.text = result.text;
    segment.confidence = result.confidence;
    segment.speakerId = 0;
    segment.language = result.language;
    segment.probability = result.confidence;
    result.segments.push_back(segment);
#endif

    return result;
}

void WhisperTranscription::workerThread() {
    std::cout << "Worker thread started" << std::endl;
    
    while (!m_shouldStop) {
        std::shared_ptr<TranscriptionJob> job;
        
        // Get next job from queue
        {
            std::lock_guard<std::mutex> lock(m_queueMutex);
            if (!m_transcriptionQueue.empty()) {
                job = m_transcriptionQueue.front();
                m_transcriptionQueue.pop();
            }
        }
        
        if (!job) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
            continue;
        }
        
        // Process the job
        updateProgress(job->id, 0.0f, "Starting transcription");
        
        try {
            TranscriptionResult result;
            
            if (!job->filePath.empty()) {
                // File-based transcription
                result = transcribeFileInternal(job->filePath, job->options);
            } else {
                // Buffer-based transcription
                updateProgress(job->id, 0.2f, "Processing audio");
                result = processAudio(job->audioData.data(), job->audioData.size(), job->sampleRate, job->options);
            }
            
            updateProgress(job->id, 0.9f, "Finalizing results");
            completeJob(job->id, result);
            
        } catch (const std::exception& e) {
            failJob(job->id, e.what());
        }
    }
    
    std::cout << "Worker thread stopped" << std::endl;
}

std::vector<float> WhisperTranscription::preprocessAudio(const float* audioData, size_t sampleCount, int sampleRate, int targetSampleRate) {
    std::vector<float> result;
    
    if (sampleRate == targetSampleRate) {
        // No resampling needed
        result.assign(audioData, audioData + sampleCount);
    } else {
        // Simple resampling (in production, use a proper resampling algorithm)
        result = resampleAudio(audioData, sampleCount, sampleRate, targetSampleRate);
    }
    
    // Normalize audio
    result = normalizeAudio(result.data(), result.size());
    
    return result;
}

std::vector<float> WhisperTranscription::resampleAudio(const float* audioData, size_t sampleCount, int fromRate, int toRate) {
    if (fromRate == toRate) {
        return std::vector<float>(audioData, audioData + sampleCount);
    }
    
    // Simple linear interpolation resampling
    double ratio = static_cast<double>(toRate) / fromRate;
    size_t outputSize = static_cast<size_t>(sampleCount * ratio);
    std::vector<float> result(outputSize);
    
    for (size_t i = 0; i < outputSize; i++) {
        double sourceIndex = i / ratio;
        size_t index = static_cast<size_t>(sourceIndex);
        double fraction = sourceIndex - index;
        
        if (index + 1 < sampleCount) {
            result[i] = audioData[index] * (1.0 - fraction) + audioData[index + 1] * fraction;
        } else {
            result[i] = audioData[std::min(index, sampleCount - 1)];
        }
    }
    
    return result;
}

std::vector<float> WhisperTranscription::normalizeAudio(const float* audioData, size_t sampleCount) {
    std::vector<float> result(audioData, audioData + sampleCount);
    
    // Find peak amplitude
    float maxAmplitude = 0.0f;
    for (size_t i = 0; i < sampleCount; i++) {
        maxAmplitude = std::max(maxAmplitude, std::abs(audioData[i]));
    }
    
    // Normalize to prevent clipping
    if (maxAmplitude > 0.0f && maxAmplitude > 0.95f) {
        float scale = 0.95f / maxAmplitude;
        for (size_t i = 0; i < sampleCount; i++) {
            result[i] *= scale;
        }
    }
    
    return result;
}

bool WhisperTranscription::detectVoiceActivity(const float* audioData, size_t sampleCount, int sampleRate, float threshold) {
    // Simple VAD based on RMS energy
    float energy = 0.0f;
    for (size_t i = 0; i < sampleCount; i++) {
        energy += audioData[i] * audioData[i];
    }
    energy = std::sqrt(energy / sampleCount);
    
    return energy > threshold;
}

std::string WhisperTranscription::generateJobId() {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    static std::uniform_int_distribution<> dis(100000, 999999);
    
    auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();
    
    return "job_" + std::to_string(now) + "_" + std::to_string(dis(gen));
}

void WhisperTranscription::updateProgress(const std::string& jobId, float progress, const std::string& phase) {
    std::lock_guard<std::mutex> lock(m_progressMutex);
    
    auto it = m_activeJobs.find(jobId);
    if (it != m_activeJobs.end()) {
        it->second->progress.progress = progress;
        it->second->progress.currentPhase = phase;
        it->second->progress.status = TranscriptionProgress::PROCESSING;
        
        auto now = std::chrono::high_resolution_clock::now();
        it->second->progress.elapsedTime = std::chrono::duration<double>(now - it->second->startTime).count();
        
        if (progress > 0.0f) {
            it->second->progress.estimatedRemainingTime = 
                it->second->progress.elapsedTime * ((1.0f - progress) / progress);
        }
        
        if (m_progressCallback) {
            m_progressCallback(it->second->progress);
        }
    }
}

void WhisperTranscription::completeJob(const std::string& jobId, const TranscriptionResult& result) {
    std::lock_guard<std::mutex> lock(m_progressMutex);
    
    auto it = m_activeJobs.find(jobId);
    if (it != m_activeJobs.end()) {
        it->second->progress.status = TranscriptionProgress::COMPLETED;
        it->second->progress.progress = 1.0f;
        it->second->progress.result = result;
        it->second->progress.currentPhase = "Completed";
        
        auto now = std::chrono::high_resolution_clock::now();
        it->second->progress.elapsedTime = std::chrono::duration<double>(now - it->second->startTime).count();
        it->second->progress.estimatedRemainingTime = 0.0;
        
        // Move to completed jobs
        m_completedJobs[jobId] = it->second->progress;
        m_activeJobs.erase(it);
        
        // Update performance stats
        updatePerformanceStats(*it->second, result);
        
        if (m_progressCallback) {
            m_progressCallback(m_completedJobs[jobId]);
        }
        
        std::cout << "Transcription completed: " << jobId << std::endl;
    }
}

void WhisperTranscription::failJob(const std::string& jobId, const std::string& error) {
    std::lock_guard<std::mutex> lock(m_progressMutex);
    
    auto it = m_activeJobs.find(jobId);
    if (it != m_activeJobs.end()) {
        it->second->progress.status = TranscriptionProgress::ERROR;
        it->second->progress.errorMessage = error;
        it->second->progress.currentPhase = "Error";
        
        auto now = std::chrono::high_resolution_clock::now();
        it->second->progress.elapsedTime = std::chrono::duration<double>(now - it->second->startTime).count();
        
        // Move to completed jobs
        m_completedJobs[jobId] = it->second->progress;
        m_activeJobs.erase(it);
        
        m_perfStats.failedTranscriptions++;
        
        if (m_progressCallback) {
            m_progressCallback(m_completedJobs[jobId]);
        }
        
        std::cout << "Transcription failed: " << jobId << " - " << error << std::endl;
    }
}

void WhisperTranscription::setError(const std::string& error) {
    m_lastError = error;
    std::cerr << "WhisperTranscription Error: " << error << std::endl;
}

WhisperTranscription::PerformanceStats WhisperTranscription::getPerformanceStats() {
    std::lock_guard<std::mutex> lock(m_progressMutex);
    
    // Update queue length
    m_perfStats.queueLength = m_transcriptionQueue.size();
    m_perfStats.activeThreads = m_workerThreads.size();
    
    return m_perfStats;
}

void WhisperTranscription::updatePerformanceStats(const TranscriptionJob& job, const TranscriptionResult& result) {
    m_perfStats.totalTranscriptions++;
    m_perfStats.totalAudioDuration += result.duration;
    m_perfStats.totalProcessingTime += result.processingTime;
    
    if (m_perfStats.totalTranscriptions > 0) {
        m_perfStats.averageProcessingTime = m_perfStats.totalProcessingTime / m_perfStats.totalTranscriptions;
        m_perfStats.averageRealTimeFactor = m_perfStats.totalProcessingTime / m_perfStats.totalAudioDuration;
    }
}

bool WhisperTranscription::initializeGPU() {
    // Mock GPU initialization
    std::cout << "Checking for GPU support..." << std::endl;
    
    // In a real implementation, this would check for CUDA/OpenCL
    m_gpuAvailable = false; // Assume no GPU for now
    m_currentGPUDevice = -1;
    
    return m_gpuAvailable;
}

void WhisperTranscription::cleanupGPU() {
    if (m_gpuAvailable) {
        std::cout << "Cleaning up GPU resources" << std::endl;
        m_gpuAvailable = false;
        m_currentGPUDevice = -1;
    }
}