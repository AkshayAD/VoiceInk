#pragma once

#include <string>
#include <vector>
#include <memory>
#include <atomic>
#include <mutex>
#include <functional>

// Forward declarations for whisper.cpp
struct whisper_context;
struct whisper_full_params;

// Transcription result structure
struct TranscriptionResult {
    std::string text;
    std::string language;
    float confidence;
    double duration;
    std::vector<std::pair<double, double>> timestamps; // start, end times
    bool success;
    std::string error_message;
};

// Transcription segment (for detailed results)
struct TranscriptionSegment {
    std::string text;
    double start_time;
    double end_time;
    float confidence;
};

// Model information
struct ModelInfo {
    std::string name;
    std::string path;
    size_t size_mb;
    bool is_multilingual;
    bool is_loaded;
};

// Progress callback type
using ProgressCallback = std::function<void(int progress_percent)>;

// Whisper transcriber class
class WhisperTranscriber {
public:
    WhisperTranscriber();
    ~WhisperTranscriber();

    // Model management
    bool LoadModel(const std::string& model_path);
    bool UnloadModel();
    bool IsModelLoaded() const;
    std::string GetCurrentModel() const;
    std::vector<ModelInfo> GetAvailableModels(const std::string& models_dir = "./models/");
    
    // Model download/management
    bool DownloadModel(const std::string& model_name, const std::string& models_dir = "./models/");
    bool IsModelAvailable(const std::string& model_name, const std::string& models_dir = "./models/");
    
    // Transcription
    TranscriptionResult Transcribe(const std::vector<float>& audio_data, 
                                  const std::string& language = "auto");
    TranscriptionResult TranscribeFile(const std::string& wav_file_path, 
                                      const std::string& language = "auto");
    
    // Real-time transcription
    bool StartRealTimeTranscription(const std::string& language = "auto");
    bool ProcessAudioChunk(const std::vector<float>& audio_chunk);
    TranscriptionResult GetRealTimeResult();
    bool StopRealTimeTranscription();
    bool IsRealTimeActive() const;
    
    // Configuration
    void SetThreads(int num_threads);
    void SetLanguage(const std::string& language);
    void SetTranslateToEnglish(bool translate);
    void SetProgressCallback(ProgressCallback callback);
    void SetMaxTextContext(int max_text_ctx);
    void SetOffsetMs(int offset_ms);
    void SetDurationMs(int duration_ms);
    void SetWordTimestamps(bool enable);
    
    // Audio format utilities
    static std::vector<float> ConvertInt16ToFloat(const std::vector<int16_t>& pcm_data);
    static std::vector<float> ConvertInt16ToFloat(const int16_t* pcm_data, size_t sample_count);
    static bool ValidateAudioFormat(int sample_rate, int channels);
    static std::vector<float> ResampleAudio(const std::vector<float>& audio, int from_rate, int to_rate);
    
    // Utility functions
    std::string GetLastError() const;
    void ClearError();
    size_t GetModelMemoryUsage() const;
    double GetProcessingTime() const;
    
    // Static model utilities
    static std::vector<std::string> GetDefaultModelUrls();
    static std::string GetModelFileName(const std::string& model_name);
    static size_t GetModelSize(const std::string& model_name);

private:
    // Whisper context
    whisper_context* context_;
    
    // Model state
    std::string current_model_path_;
    std::atomic<bool> model_loaded_;
    
    // Configuration
    int num_threads_;
    std::string language_;
    bool translate_to_english_;
    int max_text_context_;
    int offset_ms_;
    int duration_ms_;
    bool word_timestamps_;
    
    // Real-time state
    std::atomic<bool> realtime_active_;
    std::vector<float> realtime_buffer_;
    std::mutex realtime_mutex_;
    
    // Callbacks and progress
    ProgressCallback progress_callback_;
    
    // Error handling
    mutable std::mutex error_mutex_;
    std::string last_error_;
    
    // Performance tracking
    double last_processing_time_;
    
    // Private methods
    bool InitializeWhisperParams(whisper_full_params& params, const std::string& language);
    void SetError(const std::string& error);
    static void ProgressCallbackStatic(struct whisper_context* ctx, int progress, void* user_data);
    std::vector<TranscriptionSegment> ExtractSegments();
    bool ValidateModelFile(const std::string& model_path);
    std::string DetectLanguage(const std::vector<float>& audio_data);
    
    // Model file validation
    static bool IsValidModelPath(const std::string& path);
    static std::string NormalizeModelPath(const std::string& path);
};

// Helper functions for integration
namespace WhisperUtils {
    // Audio format conversion
    std::vector<float> PCMToFloat(const void* pcm_data, size_t byte_count, int bits_per_sample);
    std::vector<int16_t> FloatToPCM(const std::vector<float>& float_data);
    
    // File operations
    bool ReadWAVFile(const std::string& filename, std::vector<float>& audio_data, int& sample_rate);
    bool WriteWAVFile(const std::string& filename, const std::vector<float>& audio_data, int sample_rate);
    
    // Model management
    std::string GetDefaultModelsDirectory();
    bool CreateModelsDirectory(const std::string& path);
    std::vector<std::string> FindModelFiles(const std::string& directory);
    
    // Network utilities
    bool DownloadFile(const std::string& url, const std::string& local_path, ProgressCallback progress = nullptr);
    bool VerifyModelChecksum(const std::string& file_path, const std::string& expected_hash);
    
    // System utilities
    size_t GetAvailableMemory();
    int GetOptimalThreadCount();
    bool HasAVXSupport();
}