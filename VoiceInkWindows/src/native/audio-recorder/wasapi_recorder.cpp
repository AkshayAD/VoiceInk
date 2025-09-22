#include "wasapi_recorder.h"
#include <iostream>
#include <fstream>
#include <algorithm>
#include <cmath>

// Circular Buffer Implementation
CircularBuffer::CircularBuffer(size_t size) 
    : buffer_(size), head_(0), tail_(0), size_(size) {}

CircularBuffer::~CircularBuffer() = default;

bool CircularBuffer::Write(const void* data, size_t size) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (size > size_) return false;
    
    const uint8_t* src = static_cast<const uint8_t*>(data);
    
    for (size_t i = 0; i < size; ++i) {
        buffer_[head_] = src[i];
        head_ = (head_ + 1) % size_;
        
        // If buffer is full, move tail forward (overwrite old data)
        if (head_ == tail_) {
            tail_ = (tail_ + 1) % size_;
        }
    }
    
    return true;
}

size_t CircularBuffer::Read(void* data, size_t size) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    uint8_t* dst = static_cast<uint8_t*>(data);
    size_t bytesRead = 0;
    
    while (bytesRead < size && tail_ != head_) {
        dst[bytesRead] = buffer_[tail_];
        tail_ = (tail_ + 1) % size_;
        bytesRead++;
    }
    
    return bytesRead;
}

size_t CircularBuffer::AvailableData() const {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (head_ >= tail_) {
        return head_ - tail_;
    } else {
        return size_ - tail_ + head_;
    }
}

void CircularBuffer::Clear() {
    std::lock_guard<std::mutex> lock(mutex_);
    head_ = tail_ = 0;
}

// WASAPI Recorder Implementation
WASAPIRecorder::WASAPIRecorder()
    : deviceEnumerator_(nullptr)
    , device_(nullptr)
    , audioClient_(nullptr)
    , captureClient_(nullptr)
    , recording_(false)
    , initialized_(false)
    , audioBuffer_(std::make_unique<CircularBuffer>(1024 * 1024)) // 1MB buffer
    , currentLevel_(0.0f) {
    
    ZeroMemory(&audioFormat_, sizeof(audioFormat_));
    InitializeCOM();
}

WASAPIRecorder::~WASAPIRecorder() {
    StopRecording();
    CleanupCOM();
}

bool WASAPIRecorder::InitializeCOM() {
    HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    if (FAILED(hr)) {
        SetError("Failed to initialize COM: " + HRESULTToString(hr));
        return false;
    }
    
    hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL,
                         __uuidof(IMMDeviceEnumerator), (void**)&deviceEnumerator_);
    if (FAILED(hr)) {
        SetError("Failed to create device enumerator: " + HRESULTToString(hr));
        return false;
    }
    
    return true;
}

void WASAPIRecorder::CleanupCOM() {
    if (captureClient_) {
        captureClient_->Release();
        captureClient_ = nullptr;
    }
    
    if (audioClient_) {
        audioClient_->Release();
        audioClient_ = nullptr;
    }
    
    if (device_) {
        device_->Release();
        device_ = nullptr;
    }
    
    if (deviceEnumerator_) {
        deviceEnumerator_->Release();
        deviceEnumerator_ = nullptr;
    }
    
    CoUninitialize();
}

bool WASAPIRecorder::EnumerateDevices(std::vector<std::string>& devices) {
    if (!deviceEnumerator_) {
        SetError("Device enumerator not initialized");
        return false;
    }
    
    devices.clear();
    
    IMMDeviceCollection* deviceCollection = nullptr;
    HRESULT hr = deviceEnumerator_->EnumAudioEndpoints(eCapture, DEVICE_STATE_ACTIVE, &deviceCollection);
    if (FAILED(hr)) {
        SetError("Failed to enumerate devices: " + HRESULTToString(hr));
        return false;
    }
    
    UINT count;
    hr = deviceCollection->GetCount(&count);
    if (FAILED(hr)) {
        deviceCollection->Release();
        SetError("Failed to get device count: " + HRESULTToString(hr));
        return false;
    }
    
    for (UINT i = 0; i < count; i++) {
        IMMDevice* device = nullptr;
        hr = deviceCollection->Item(i, &device);
        if (SUCCEEDED(hr)) {
            LPWSTR deviceId;
            hr = device->GetId(&deviceId);
            if (SUCCEEDED(hr)) {
                IPropertyStore* properties = nullptr;
                hr = device->OpenPropertyStore(STGM_READ, &properties);
                if (SUCCEEDED(hr)) {
                    PROPVARIANT friendlyName;
                    PropVariantInit(&friendlyName);
                    hr = properties->GetValue(PKEY_Device_FriendlyName, &friendlyName);
                    if (SUCCEEDED(hr)) {
                        std::wstring wideName(friendlyName.pwszVal);
                        std::string deviceName(wideName.begin(), wideName.end());
                        devices.push_back(deviceName);
                    }
                    PropVariantClear(&friendlyName);
                    properties->Release();
                }
                CoTaskMemFree(deviceId);
            }
            device->Release();
        }
    }
    
    deviceCollection->Release();
    return true;
}

bool WASAPIRecorder::SetDevice(int deviceIndex) {
    if (!deviceEnumerator_) return false;
    
    // For now, just use default device (index -1) or first device
    if (device_) {
        device_->Release();
        device_ = nullptr;
    }
    
    HRESULT hr = deviceEnumerator_->GetDefaultAudioEndpoint(eCapture, eConsole, &device_);
    if (FAILED(hr)) {
        SetError("Failed to get default audio device: " + HRESULTToString(hr));
        return false;
    }
    
    return true;
}

bool WASAPIRecorder::Initialize(uint32_t sampleRate, uint16_t channels, uint16_t bitsPerSample) {
    if (!device_) {
        if (!SetDevice(-1)) {
            return false;
        }
    }
    
    // Setup audio format
    audioFormat_.wFormatTag = WAVE_FORMAT_PCM;
    audioFormat_.nChannels = channels;
    audioFormat_.nSamplesPerSec = sampleRate;
    audioFormat_.wBitsPerSample = bitsPerSample;
    audioFormat_.nBlockAlign = channels * bitsPerSample / 8;
    audioFormat_.nAvgBytesPerSec = sampleRate * audioFormat_.nBlockAlign;
    audioFormat_.cbSize = 0;
    
    // Get audio client
    HRESULT hr = device_->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, (void**)&audioClient_);
    if (FAILED(hr)) {
        SetError("Failed to activate audio client: " + HRESULTToString(hr));
        return false;
    }
    
    // Initialize audio client
    REFERENCE_TIME bufferDuration = 10000000; // 1 second in 100-nanosecond units
    hr = audioClient_->Initialize(AUDCLNT_SHAREMODE_SHARED, 0, bufferDuration, 0, &audioFormat_, nullptr);
    if (FAILED(hr)) {
        SetError("Failed to initialize audio client: " + HRESULTToString(hr));
        return false;
    }
    
    // Get capture client
    hr = audioClient_->GetService(__uuidof(IAudioCaptureClient), (void**)&captureClient_);
    if (FAILED(hr)) {
        SetError("Failed to get capture client: " + HRESULTToString(hr));
        return false;
    }
    
    initialized_ = true;
    return true;
}

bool WASAPIRecorder::StartRecording() {
    if (!initialized_) {
        SetError("Recorder not initialized");
        return false;
    }
    
    if (recording_) {
        return true; // Already recording
    }
    
    audioBuffer_->Clear();
    
    HRESULT hr = audioClient_->Start();
    if (FAILED(hr)) {
        SetError("Failed to start audio client: " + HRESULTToString(hr));
        return false;
    }
    
    recording_ = true;
    recordingThread_ = std::thread(&WASAPIRecorder::RecordingThreadProc, this);
    
    return true;
}

bool WASAPIRecorder::StopRecording() {
    if (!recording_) {
        return true; // Already stopped
    }
    
    recording_ = false;
    
    if (recordingThread_.joinable()) {
        recordingThread_.join();
    }
    
    if (audioClient_) {
        audioClient_->Stop();
    }
    
    return true;
}

bool WASAPIRecorder::IsRecording() const {
    return recording_;
}

void WASAPIRecorder::RecordingThreadProc() {
    while (recording_) {
        UINT32 packetLength = 0;
        HRESULT hr = captureClient_->GetNextPacketSize(&packetLength);
        
        if (SUCCEEDED(hr) && packetLength > 0) {
            BYTE* data = nullptr;
            UINT32 numFramesAvailable = 0;
            DWORD flags = 0;
            
            hr = captureClient_->GetBuffer(&data, &numFramesAvailable, &flags, nullptr, nullptr);
            if (SUCCEEDED(hr)) {
                size_t dataSize = numFramesAvailable * audioFormat_.nBlockAlign;
                
                if (!(flags & AUDCLNT_BUFFERFLAGS_SILENT) && data && dataSize > 0) {
                    audioBuffer_->Write(data, dataSize);
                    
                    // Calculate RMS level for monitoring
                    if (audioFormat_.wBitsPerSample == 16) {
                        float level = CalculateRMSLevel(reinterpret_cast<const int16_t*>(data), numFramesAvailable);
                        currentLevel_.store(level);
                    }
                }
                
                captureClient_->ReleaseBuffer(numFramesAvailable);
            }
        }
        
        Sleep(1); // Small delay to prevent busy waiting
    }
}

size_t WASAPIRecorder::GetAudioData(void* buffer, size_t bufferSize) {
    return audioBuffer_->Read(buffer, bufferSize);
}

bool WASAPIRecorder::SaveToWAV(const std::string& filename) {
    std::ofstream file(filename, std::ios::binary);
    if (!file.is_open()) {
        SetError("Failed to open file for writing: " + filename);
        return false;
    }
    
    // Get all available audio data
    size_t availableData = audioBuffer_->AvailableData();
    if (availableData == 0) {
        SetError("No audio data to save");
        return false;
    }
    
    std::vector<uint8_t> audioData(availableData);
    size_t actualSize = audioBuffer_->Read(audioData.data(), availableData);
    
    // Write WAV header
    WAVHeader header;
    header.dataSize = static_cast<uint32_t>(actualSize);
    header.fileSize = sizeof(WAVHeader) - 8 + header.dataSize;
    header.sampleRate = audioFormat_.nSamplesPerSec;
    header.byteRate = audioFormat_.nAvgBytesPerSec;
    header.numChannels = audioFormat_.nChannels;
    header.bitsPerSample = audioFormat_.wBitsPerSample;
    header.blockAlign = audioFormat_.nBlockAlign;
    
    file.write(reinterpret_cast<const char*>(&header), sizeof(header));
    file.write(reinterpret_cast<const char*>(audioData.data()), actualSize);
    file.close();
    
    return true;
}

void WASAPIRecorder::ClearBuffer() {
    audioBuffer_->Clear();
}

float WASAPIRecorder::GetCurrentLevel() const {
    return currentLevel_.load();
}

std::string WASAPIRecorder::GetLastError() const {
    std::lock_guard<std::mutex> lock(errorMutex_);
    return lastError_;
}

void WASAPIRecorder::SetError(const std::string& error) {
    std::lock_guard<std::mutex> lock(errorMutex_);
    lastError_ = error;
    std::cout << "WASAPI Error: " << error << std::endl;
}

float WASAPIRecorder::CalculateRMSLevel(const int16_t* samples, size_t sampleCount) {
    if (!samples || sampleCount == 0) return 0.0f;
    
    double sum = 0.0;
    for (size_t i = 0; i < sampleCount; ++i) {
        double sample = samples[i] / 32768.0; // Normalize to [-1, 1]
        sum += sample * sample;
    }
    
    double rms = std::sqrt(sum / sampleCount);
    return static_cast<float>(rms * 100.0); // Convert to percentage
}

// Helper functions
std::string HRESULTToString(HRESULT hr) {
    _com_error err(hr);
    std::wstring wideMsg = err.ErrorMessage();
    return std::string(wideMsg.begin(), wideMsg.end());
}

bool InitializeWindowsAudio() {
    // Global initialization if needed
    return true;
}

void CleanupWindowsAudio() {
    // Global cleanup if needed
}