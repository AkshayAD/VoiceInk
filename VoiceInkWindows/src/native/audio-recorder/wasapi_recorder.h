#pragma once

#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <comdef.h>
#include <thread>
#include <atomic>
#include <vector>
#include <memory>
#include <mutex>

// WAV file header structure
struct WAVHeader {
    char riff[4] = {'R', 'I', 'F', 'F'};
    uint32_t fileSize;
    char wave[4] = {'W', 'A', 'V', 'E'};
    char fmt[4] = {'f', 'm', 't', ' '};
    uint32_t fmtSize = 16;
    uint16_t audioFormat = 1;  // PCM
    uint16_t numChannels = 1;  // Mono
    uint32_t sampleRate = 16000;
    uint32_t byteRate = 32000;  // sampleRate * numChannels * bitsPerSample / 8
    uint16_t blockAlign = 2;    // numChannels * bitsPerSample / 8
    uint16_t bitsPerSample = 16;
    char data[4] = {'d', 'a', 't', 'a'};
    uint32_t dataSize;
};

// Circular buffer for audio data
class CircularBuffer {
public:
    CircularBuffer(size_t size);
    ~CircularBuffer();
    
    bool Write(const void* data, size_t size);
    size_t Read(void* data, size_t size);
    size_t AvailableData() const;
    void Clear();

private:
    std::vector<uint8_t> buffer_;
    size_t head_;
    size_t tail_;
    size_t size_;
    mutable std::mutex mutex_;
};

// WASAPI Audio Recorder
class WASAPIRecorder {
public:
    WASAPIRecorder();
    ~WASAPIRecorder();

    // Device enumeration
    bool EnumerateDevices(std::vector<std::string>& devices);
    bool SetDevice(int deviceIndex);
    
    // Recording control
    bool Initialize(uint32_t sampleRate = 16000, uint16_t channels = 1, uint16_t bitsPerSample = 16);
    bool StartRecording();
    bool StopRecording();
    bool IsRecording() const;
    
    // Audio data access
    size_t GetAudioData(void* buffer, size_t bufferSize);
    bool SaveToWAV(const std::string& filename);
    void ClearBuffer();
    
    // Audio level monitoring
    float GetCurrentLevel() const;
    
    // Error handling
    std::string GetLastError() const;

private:
    // COM interfaces
    IMMDeviceEnumerator* deviceEnumerator_;
    IMMDevice* device_;
    IAudioClient* audioClient_;
    IAudioCaptureClient* captureClient_;
    
    // Audio format
    WAVEFORMATEX audioFormat_;
    
    // Recording state
    std::atomic<bool> recording_;
    std::atomic<bool> initialized_;
    std::thread recordingThread_;
    
    // Audio buffer
    std::unique_ptr<CircularBuffer> audioBuffer_;
    
    // Error tracking
    mutable std::mutex errorMutex_;
    std::string lastError_;
    
    // Audio level tracking
    std::atomic<float> currentLevel_;
    
    // Internal methods
    void RecordingThreadProc();
    bool InitializeCOM();
    void CleanupCOM();
    void SetError(const std::string& error);
    float CalculateRMSLevel(const int16_t* samples, size_t sampleCount);
};

// Helper functions
std::string HRESULTToString(HRESULT hr);
bool InitializeWindowsAudio();
void CleanupWindowsAudio();