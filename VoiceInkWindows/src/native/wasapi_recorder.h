#pragma once

#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <audiopolicy.h>
#include <functiondiscoverykeys_devpkey.h>
#include <thread>
#include <mutex>
#include <vector>
#include <queue>
#include <memory>
#include <functional>
#include <atomic>

struct AudioDevice {
    std::wstring id;
    std::wstring name;
    std::wstring description;
    bool isDefault;
    bool isActive;
    DWORD state;
};

struct AudioBuffer {
    std::vector<float> samples;
    double timestamp;
    size_t channelCount;
    size_t sampleRate;
    size_t frameCount;
};

class WASAPIRecorder {
public:
    WASAPIRecorder();
    ~WASAPIRecorder();

    // Device management
    std::vector<AudioDevice> enumerateDevices();
    bool selectDevice(const std::wstring& deviceId);
    AudioDevice getCurrentDevice();
    bool isDeviceActive(const std::wstring& deviceId);

    // Recording control
    bool initialize();
    bool startRecording();
    bool stopRecording();
    bool pauseRecording();
    bool resumeRecording();
    bool isRecording() const { return m_isRecording; }
    bool isPaused() const { return m_isPaused; }

    // Audio properties
    bool setFormat(UINT32 sampleRate, UINT32 channels, UINT32 bitsPerSample);
    WAVEFORMATEX getFormat() const { return m_waveFormat; }
    UINT32 getSampleRate() const { return m_waveFormat.nSamplesPerSec; }
    UINT32 getChannels() const { return m_waveFormat.nChannels; }
    
    // Buffer management
    void setBufferSize(UINT32 bufferSizeMs);
    UINT32 getBufferSize() const { return m_bufferSizeMs; }
    size_t getAvailableFrames();
    
    // Audio level monitoring
    float getCurrentLevel();
    float getPeakLevel();
    void resetPeakLevel();

    // Data retrieval
    std::vector<float> getAudioData(size_t maxFrames = 0);
    AudioBuffer getAudioBuffer();
    bool hasAudioData();
    void clearBuffer();

    // Callbacks
    using AudioDataCallback = std::function<void(const float* data, size_t frameCount, double timestamp)>;
    using LevelCallback = std::function<void(float level, float peak)>;
    using DeviceChangeCallback = std::function<void(const AudioDevice& device, bool connected)>;
    
    void setAudioDataCallback(AudioDataCallback callback) { m_audioDataCallback = callback; }
    void setLevelCallback(LevelCallback callback) { m_levelCallback = callback; }
    void setDeviceChangeCallback(DeviceChangeCallback callback) { m_deviceChangeCallback = callback; }

    // Advanced features
    void enableNoiseSupression(bool enable) { m_noiseSuppressionEnabled = enable; }
    void enableEchoCancellation(bool enable) { m_echoCancellationEnabled = enable; }
    void enableAutomaticGainControl(bool enable) { m_agcEnabled = enable; }
    void setGainLevel(float gain) { m_gainLevel = gain; }

    // Performance monitoring
    struct PerformanceStats {
        double cpuUsage;
        size_t memoryUsage;
        size_t droppedFrames;
        double averageLatency;
        size_t bufferOverruns;
        size_t bufferUnderruns;
    };
    PerformanceStats getPerformanceStats();

    // Error handling
    std::wstring getLastError() const { return m_lastError; }
    bool hasError() const { return !m_lastError.empty(); }
    void clearError() { m_lastError.clear(); }

private:
    // COM interfaces
    IMMDeviceEnumerator* m_deviceEnumerator;
    IMMDevice* m_device;
    IAudioClient* m_audioClient;
    IAudioCaptureClient* m_captureClient;
    ISimpleAudioVolume* m_volumeClient;

    // Audio format
    WAVEFORMATEX m_waveFormat;
    UINT32 m_bufferSizeMs;
    UINT32 m_bufferFrameCount;

    // Recording state
    std::atomic<bool> m_isRecording;
    std::atomic<bool> m_isPaused;
    std::atomic<bool> m_shouldStop;
    std::thread m_recordingThread;
    std::mutex m_bufferMutex;
    std::mutex m_deviceMutex;

    // Audio data
    std::queue<AudioBuffer> m_audioQueue;
    std::vector<float> m_tempBuffer;
    std::vector<float> m_processedBuffer;
    size_t m_maxQueueSize;

    // Level monitoring
    std::atomic<float> m_currentLevel;
    std::atomic<float> m_peakLevel;
    float m_levelSmoothingFactor;

    // Audio processing
    bool m_noiseSuppressionEnabled;
    bool m_echoCancellationEnabled;
    bool m_agcEnabled;
    float m_gainLevel;

    // Callbacks
    AudioDataCallback m_audioDataCallback;
    LevelCallback m_levelCallback;
    DeviceChangeCallback m_deviceChangeCallback;

    // Performance tracking
    PerformanceStats m_perfStats;
    std::chrono::high_resolution_clock::time_point m_lastPerfUpdate;
    size_t m_frameCount;
    
    // Error handling
    std::wstring m_lastError;

    // Private methods
    void recordingLoop();
    void processAudioData(const BYTE* data, UINT32 frameCount, bool* silence);
    void updateAudioLevels(const float* samples, size_t frameCount);
    void applyAudioProcessing(float* samples, size_t frameCount);
    void applyNoiseSupression(float* samples, size_t frameCount);
    void applyEchoCancellation(float* samples, size_t frameCount);
    void applyAutomaticGainControl(float* samples, size_t frameCount);
    bool initializeAudioClient();
    void cleanup();
    void setError(const std::wstring& error);
    std::wstring getDeviceProperty(IMMDevice* device, const PROPERTYKEY& key);
    
    // VAD (Voice Activity Detection)
    bool detectVoiceActivity(const float* samples, size_t frameCount);
    float m_vadThreshold;
    float m_vadSmoothingFactor;
    float m_vadLevel;
    
    // Buffer management
    void manageBufferQueue();
    void trimOldBuffers();
    
    // Device monitoring
    void startDeviceMonitoring();
    void stopDeviceMonitoring();
    void onDeviceStateChanged();
};

// Device notification handler
class DeviceNotificationClient : public IMMNotificationClient {
public:
    DeviceNotificationClient(WASAPIRecorder* recorder);
    virtual ~DeviceNotificationClient();

    // IUnknown
    STDMETHOD(QueryInterface)(REFIID riid, void** ppv);
    STDMETHOD_(ULONG, AddRef)();
    STDMETHOD_(ULONG, Release)();

    // IMMNotificationClient
    STDMETHOD(OnDeviceStateChanged)(LPCWSTR pwstrDeviceId, DWORD dwNewState);
    STDMETHOD(OnDeviceAdded)(LPCWSTR pwstrDeviceId);
    STDMETHOD(OnDeviceRemoved)(LPCWSTR pwstrDeviceId);
    STDMETHOD(OnDefaultDeviceChanged)(EDataFlow flow, ERole role, LPCWSTR pwstrDefaultDeviceId);
    STDMETHOD(OnPropertyValueChanged)(LPCWSTR pwstrDeviceId, const PROPERTYKEY key);

private:
    WASAPIRecorder* m_recorder;
    LONG m_refCount;
};

// Utility functions
class WASAPIUtils {
public:
    static std::wstring formatToString(const WAVEFORMATEX& format);
    static std::string wstringToString(const std::wstring& wstr);
    static std::wstring stringToWstring(const std::string& str);
    static HRESULT getDeviceFormat(IMMDevice* device, WAVEFORMATEX** format);
    static bool isFormatSupported(IAudioClient* client, const WAVEFORMATEX& format);
    static double getCurrentTimestamp();
    static std::string hresToString(HRESULT hr);
};