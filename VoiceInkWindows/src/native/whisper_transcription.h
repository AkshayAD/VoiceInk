#pragma once

#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <thread>
#include <mutex>
#include <atomic>
#include <queue>
#include <map>

// Forward declarations for Whisper.cpp types
struct whisper_context;
struct whisper_full_params;

struct WhisperModel {
    std::string id;
    std::string name;
    std::string description;
    std::string filename;
    std::string url;
    size_t size;
    bool downloaded;
    bool loaded;
    bool isMultilingual;
    std::vector<std::string> supportedLanguages;
    float speed;      // Relative processing speed (1.0 = baseline)
    float accuracy;   // Relative accuracy (1.0 = baseline) 
    float memoryUsage; // Memory usage in MB
};

struct TranscriptionSegment {
    double startTime;
    double endTime;
    std::string text;
    float confidence;
    std::vector<float> wordConfidences;
    std::vector<std::string> words;
    std::vector<double> wordStartTimes;
    std::vector<double> wordEndTimes;
    int speakerId;
    std::string language;
    float probability;
};

struct TranscriptionResult {
    std::string text;
    std::string language;
    double duration;
    float confidence;
    size_t segmentCount;
    std::vector<TranscriptionSegment> segments;
    std::map<std::string, float> languageProbabilities;
    bool hasMultipleSpeakers;
    int speakerCount;
    double processingTime;
};

struct TranscriptionProgress {
    enum Status { QUEUED, PROCESSING, COMPLETED, ERROR, CANCELLED };
    
    std::string id;
    Status status;
    float progress; // 0.0 to 1.0
    std::string currentPhase;
    double elapsedTime;
    double estimatedRemainingTime;
    TranscriptionResult result; // Only valid when status == COMPLETED
    std::string errorMessage;   // Only valid when status == ERROR
};

struct AudioProcessingOptions {
    bool enableVAD = true;              // Voice Activity Detection
    bool enableSpeakerDiarization = false; // Speaker separation
    bool enableLanguageDetection = true;   // Automatic language detection
    bool enableTimestamps = true;          // Word-level timestamps
    bool enableConfidenceScores = true;   // Per-word confidence scores
    bool enablePunctuation = true;        // Punctuation restoration
    bool enableCapitalization = true;     // Capitalization correction
    
    float vadThreshold = 0.02f;           // Voice activity detection threshold
    float silenceThreshold = 0.5f;       // Silence duration to split segments
    int maxSpeakers = 10;                 // Maximum number of speakers to detect
    std::string forceLanguage = "";       // Force specific language (empty = auto-detect)
    std::string initialPrompt = "";       // Context prompt for better transcription
    
    // Advanced options
    float temperature = 0.0f;             // Sampling temperature
    int beamSize = 1;                     // Beam search size
    float compressionRatio = 2.4f;        // Compression ratio threshold
    float logProbThreshold = -1.0f;       // Log probability threshold
    bool suppressNonSpeech = true;        // Suppress non-speech tokens
    
    // GPU options
    bool enableGPU = true;                // Use GPU acceleration if available
    int gpuDevice = 0;                    // GPU device index
    size_t gpuMemoryLimit = 0;            // GPU memory limit (0 = auto)
};

class WhisperTranscription {
public:
    WhisperTranscription();
    ~WhisperTranscription();

    // Initialization and cleanup
    bool initialize();
    void cleanup();
    bool isInitialized() const { return m_initialized; }

    // Model management
    std::vector<WhisperModel> getAvailableModels();
    WhisperModel getCurrentModel();
    bool downloadModel(const std::string& modelId, std::function<void(float, const std::string&)> progressCallback = nullptr);
    bool loadModel(const std::string& modelId);
    bool unloadModel();
    bool isModelLoaded() const { return m_currentModel != nullptr; }
    std::string getLoadedModelId() const { return m_loadedModelId; }
    
    // Model validation
    bool validateModel(const std::string& modelPath);
    std::string getModelChecksum(const std::string& modelPath);
    
    // GPU support
    bool isGPUAvailable();
    std::vector<std::string> getAvailableGPUDevices();
    bool setGPUDevice(int deviceIndex);
    int getCurrentGPUDevice() const { return m_currentGPUDevice; }

    // Transcription methods
    std::string transcribeFile(const std::string& audioFile, const AudioProcessingOptions& options = AudioProcessingOptions());
    std::string transcribeBuffer(const float* audioData, size_t sampleCount, int sampleRate, const AudioProcessingOptions& options = AudioProcessingOptions());
    
    // Streaming transcription
    std::string startStreamingTranscription(const AudioProcessingOptions& options = AudioProcessingOptions());
    bool addAudioChunk(const std::string& streamId, const float* audioData, size_t sampleCount, int sampleRate);
    TranscriptionResult getStreamingResult(const std::string& streamId, bool partial = true);
    bool stopStreamingTranscription(const std::string& streamId);
    
    // Queue-based transcription
    std::string queueTranscription(const float* audioData, size_t sampleCount, int sampleRate, const AudioProcessingOptions& options = AudioProcessingOptions());
    std::string queueFileTranscription(const std::string& audioFile, const AudioProcessingOptions& options = AudioProcessingOptions());
    TranscriptionProgress getTranscriptionProgress(const std::string& jobId);
    std::vector<TranscriptionProgress> getAllTranscriptionProgress();
    bool cancelTranscription(const std::string& jobId);
    void clearTranscriptionQueue();
    
    // Language detection
    std::string detectLanguage(const float* audioData, size_t sampleCount, int sampleRate);
    std::map<std::string, float> getLanguageProbabilities(const float* audioData, size_t sampleCount, int sampleRate);
    std::vector<std::string> getSupportedLanguages();
    
    // Speaker diarization
    std::vector<TranscriptionSegment> performSpeakerDiarization(const TranscriptionResult& result, const float* audioData, size_t sampleCount, int sampleRate);
    bool enableSpeakerDiarization(bool enable) { m_speakerDiarizationEnabled = enable; return true; }
    
    // Audio preprocessing
    std::vector<float> preprocessAudio(const float* audioData, size_t sampleCount, int sampleRate, int targetSampleRate = 16000);
    bool detectVoiceActivity(const float* audioData, size_t sampleCount, int sampleRate, float threshold = 0.02f);
    std::vector<std::pair<double, double>> getVoiceSegments(const float* audioData, size_t sampleCount, int sampleRate);
    
    // Performance optimization
    void setProcessingThreads(int threadCount);
    int getProcessingThreads() const { return m_processingThreads; }
    void enableMemoryOptimization(bool enable) { m_memoryOptimizationEnabled = enable; }
    void setMaxMemoryUsage(size_t maxMemoryMB) { m_maxMemoryUsage = maxMemoryMB; }
    
    // Callbacks
    using ProgressCallback = std::function<void(const TranscriptionProgress&)>;
    using ModelDownloadCallback = std::function<void(const std::string&, float, const std::string&)>;
    using PartialResultCallback = std::function<void(const std::string&, const TranscriptionResult&)>;
    
    void setProgressCallback(ProgressCallback callback) { m_progressCallback = callback; }
    void setModelDownloadCallback(ModelDownloadCallback callback) { m_downloadCallback = callback; }
    void setPartialResultCallback(PartialResultCallback callback) { m_partialResultCallback = callback; }
    
    // Statistics and monitoring
    struct PerformanceStats {
        double averageProcessingTime;
        double averageRealTimeFactor; // Processing time / audio duration
        size_t totalTranscriptions;
        size_t failedTranscriptions;
        double totalAudioDuration;
        double totalProcessingTime;
        size_t memoryUsage;
        double gpuUtilization;
        int activeThreads;
        size_t queueLength;
    };
    
    PerformanceStats getPerformanceStats();
    void resetPerformanceStats();
    
    // Error handling
    std::string getLastError() const { return m_lastError; }
    bool hasError() const { return !m_lastError.empty(); }
    void clearError() { m_lastError.clear(); }
    
    // Configuration
    void setModelPath(const std::string& path) { m_modelPath = path; }
    std::string getModelPath() const { return m_modelPath; }
    void setTempPath(const std::string& path) { m_tempPath = path; }
    std::string getTempPath() const { return m_tempPath; }

private:
    // Core Whisper context
    whisper_context* m_currentModel;
    std::string m_loadedModelId;
    std::string m_modelPath;
    std::string m_tempPath;
    
    // Threading and synchronization
    std::vector<std::thread> m_workerThreads;
    std::mutex m_queueMutex;
    std::mutex m_modelMutex;
    std::mutex m_progressMutex;
    std::atomic<bool> m_shouldStop;
    std::atomic<bool> m_initialized;
    
    // Transcription queue
    struct TranscriptionJob {
        std::string id;
        std::vector<float> audioData;
        int sampleRate;
        AudioProcessingOptions options;
        std::string filePath; // For file-based jobs
        TranscriptionProgress progress;
        std::chrono::high_resolution_clock::time_point startTime;
    };
    
    std::queue<std::shared_ptr<TranscriptionJob>> m_transcriptionQueue;
    std::map<std::string, std::shared_ptr<TranscriptionJob>> m_activeJobs;
    std::map<std::string, TranscriptionProgress> m_completedJobs;
    
    // Streaming transcription
    struct StreamingSession {
        std::string id;
        std::vector<float> audioBuffer;
        int sampleRate;
        AudioProcessingOptions options;
        TranscriptionResult partialResult;
        std::chrono::high_resolution_clock::time_point lastUpdate;
        std::mutex bufferMutex;
    };
    
    std::map<std::string, std::shared_ptr<StreamingSession>> m_streamingSessions;
    std::mutex m_streamingMutex;
    
    // Configuration
    int m_processingThreads;
    int m_currentGPUDevice;
    bool m_gpuAvailable;
    bool m_speakerDiarizationEnabled;
    bool m_memoryOptimizationEnabled;
    size_t m_maxMemoryUsage;
    
    // Performance tracking
    PerformanceStats m_perfStats;
    std::chrono::high_resolution_clock::time_point m_lastStatsUpdate;
    
    // Callbacks
    ProgressCallback m_progressCallback;
    ModelDownloadCallback m_downloadCallback;
    PartialResultCallback m_partialResultCallback;
    
    // Error handling
    std::string m_lastError;
    
    // Private methods
    void workerThread();
    TranscriptionResult processAudio(const float* audioData, size_t sampleCount, int sampleRate, const AudioProcessingOptions& options);
    TranscriptionResult transcribeWithWhisper(const float* audioData, size_t sampleCount, int sampleRate, const AudioProcessingOptions& options);
    
    // Model management
    WhisperModel getModelInfo(const std::string& modelId);
    std::string downloadModelFile(const std::string& url, const std::string& filename, std::function<void(float, const std::string&)> progressCallback);
    bool verifyModelFile(const std::string& path, const std::string& expectedChecksum);
    
    // Audio processing
    std::vector<float> resampleAudio(const float* audioData, size_t sampleCount, int fromRate, int toRate);
    std::vector<float> normalizeAudio(const float* audioData, size_t sampleCount);
    std::vector<std::pair<double, double>> detectSilence(const float* audioData, size_t sampleCount, int sampleRate, float threshold, double minDuration);
    
    // Language detection
    std::string detectLanguageInternal(const float* audioData, size_t sampleCount, int sampleRate);
    std::map<std::string, float> getLanguageProbabilitiesInternal(const float* audioData, size_t sampleCount, int sampleRate);
    
    // Speaker diarization
    std::vector<TranscriptionSegment> performSpeakerDiarizationInternal(const float* audioData, size_t sampleCount, int sampleRate, const std::vector<TranscriptionSegment>& segments);
    
    // Utility methods
    std::string generateJobId();
    std::string generateStreamId();
    void updateProgress(const std::string& jobId, float progress, const std::string& phase);
    void completeJob(const std::string& jobId, const TranscriptionResult& result);
    void failJob(const std::string& jobId, const std::string& error);
    void setError(const std::string& error);
    void cleanupCompletedJobs();
    void updatePerformanceStats(const TranscriptionJob& job, const TranscriptionResult& result);
    
    // Whisper.cpp integration helpers
    whisper_full_params createWhisperParams(const AudioProcessingOptions& options);
    TranscriptionResult extractWhisperResult(whisper_context* ctx, const AudioProcessingOptions& options);
    std::vector<TranscriptionSegment> extractWhisperSegments(whisper_context* ctx, const AudioProcessingOptions& options);
    
    // GPU management
    bool initializeGPU();
    void cleanupGPU();
    bool isGPUSupported();
    std::vector<int> getAvailableGPUDevices();
};