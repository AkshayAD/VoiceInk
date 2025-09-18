#include "wasapi_recorder.h"
#include <combaseapi.h>
#include <propvarutil.h>
#include <algorithm>
#include <cmath>
#include <sstream>
#include <chrono>
#include <iostream>

constexpr float SILENCE_THRESHOLD = 0.001f;
constexpr float VAD_THRESHOLD = 0.01f;
constexpr size_t MAX_QUEUE_SIZE = 100;
constexpr UINT32 DEFAULT_BUFFER_SIZE_MS = 50;

WASAPIRecorder::WASAPIRecorder()
    : m_deviceEnumerator(nullptr)
    , m_device(nullptr)
    , m_audioClient(nullptr)
    , m_captureClient(nullptr)
    , m_volumeClient(nullptr)
    , m_bufferSizeMs(DEFAULT_BUFFER_SIZE_MS)
    , m_bufferFrameCount(0)
    , m_isRecording(false)
    , m_isPaused(false)
    , m_shouldStop(false)
    , m_maxQueueSize(MAX_QUEUE_SIZE)
    , m_currentLevel(0.0f)
    , m_peakLevel(0.0f)
    , m_levelSmoothingFactor(0.9f)
    , m_noiseSuppressionEnabled(false)
    , m_echoCancellationEnabled(false)
    , m_agcEnabled(false)
    , m_gainLevel(1.0f)
    , m_frameCount(0)
    , m_vadThreshold(VAD_THRESHOLD)
    , m_vadSmoothingFactor(0.95f)
    , m_vadLevel(0.0f)
{
    ZeroMemory(&m_waveFormat, sizeof(WAVEFORMATEX));
    ZeroMemory(&m_perfStats, sizeof(PerformanceStats));
    
    // Set default audio format: 48kHz, 16-bit, stereo
    m_waveFormat.wFormatTag = WAVE_FORMAT_PCM;
    m_waveFormat.nChannels = 2;
    m_waveFormat.nSamplesPerSec = 48000;
    m_waveFormat.wBitsPerSample = 16;
    m_waveFormat.nBlockAlign = (m_waveFormat.nChannels * m_waveFormat.wBitsPerSample) / 8;
    m_waveFormat.nAvgBytesPerSec = m_waveFormat.nSamplesPerSec * m_waveFormat.nBlockAlign;
    m_waveFormat.cbSize = 0;

    m_lastPerfUpdate = std::chrono::high_resolution_clock::now();
}

WASAPIRecorder::~WASAPIRecorder() {
    stopRecording();
    cleanup();
}

bool WASAPIRecorder::initialize() {
    HRESULT hr = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
    if (FAILED(hr) && hr != RPC_E_CHANGED_MODE) {
        setError(L"Failed to initialize COM: " + std::to_wstring(hr));
        return false;
    }

    hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, 
                         CLSCTX_ALL, __uuidof(IMMDeviceEnumerator), 
                         (void**)&m_deviceEnumerator);
    if (FAILED(hr)) {
        setError(L"Failed to create device enumerator: " + std::to_wstring(hr));
        return false;
    }

    // Get default capture device
    hr = m_deviceEnumerator->GetDefaultAudioEndpoint(eCapture, eConsole, &m_device);
    if (FAILED(hr)) {
        setError(L"Failed to get default capture device: " + std::to_wstring(hr));
        return false;
    }

    return initializeAudioClient();
}

std::vector<AudioDevice> WASAPIRecorder::enumerateDevices() {
    std::vector<AudioDevice> devices;
    
    if (!m_deviceEnumerator) {
        setError(L"Device enumerator not initialized");
        return devices;
    }

    IMMDeviceCollection* deviceCollection = nullptr;
    HRESULT hr = m_deviceEnumerator->EnumAudioEndpoints(eCapture, DEVICE_STATE_ACTIVE, &deviceCollection);
    if (FAILED(hr)) {
        setError(L"Failed to enumerate devices: " + std::to_wstring(hr));
        return devices;
    }

    UINT deviceCount;
    hr = deviceCollection->GetCount(&deviceCount);
    if (FAILED(hr)) {
        deviceCollection->Release();
        setError(L"Failed to get device count: " + std::to_wstring(hr));
        return devices;
    }

    // Get default device ID for comparison
    IMMDevice* defaultDevice = nullptr;
    std::wstring defaultDeviceId;
    if (SUCCEEDED(m_deviceEnumerator->GetDefaultAudioEndpoint(eCapture, eConsole, &defaultDevice))) {
        LPWSTR deviceId = nullptr;
        if (SUCCEEDED(defaultDevice->GetId(&deviceId))) {
            defaultDeviceId = deviceId;
            CoTaskMemFree(deviceId);
        }
        defaultDevice->Release();
    }

    for (UINT i = 0; i < deviceCount; i++) {
        IMMDevice* device = nullptr;
        hr = deviceCollection->Item(i, &device);
        if (SUCCEEDED(hr)) {
            AudioDevice audioDevice;
            
            // Get device ID
            LPWSTR deviceId = nullptr;
            if (SUCCEEDED(device->GetId(&deviceId))) {
                audioDevice.id = deviceId;
                audioDevice.isDefault = (audioDevice.id == defaultDeviceId);
                CoTaskMemFree(deviceId);
            }

            // Get device state
            DWORD state;
            if (SUCCEEDED(device->GetState(&state))) {
                audioDevice.state = state;
                audioDevice.isActive = (state == DEVICE_STATE_ACTIVE);
            }

            // Get device properties
            audioDevice.name = getDeviceProperty(device, PKEY_Device_FriendlyName);
            audioDevice.description = getDeviceProperty(device, PKEY_Device_DeviceDesc);

            devices.push_back(audioDevice);
            device->Release();
        }
    }

    deviceCollection->Release();
    return devices;
}

bool WASAPIRecorder::selectDevice(const std::wstring& deviceId) {
    std::lock_guard<std::mutex> lock(m_deviceMutex);
    
    if (m_isRecording) {
        setError(L"Cannot change device while recording");
        return false;
    }

    // Release current device
    if (m_device) {
        m_device->Release();
        m_device = nullptr;
    }

    HRESULT hr = m_deviceEnumerator->GetDevice(deviceId.c_str(), &m_device);
    if (FAILED(hr)) {
        setError(L"Failed to select device: " + std::to_wstring(hr));
        return false;
    }

    return initializeAudioClient();
}

bool WASAPIRecorder::startRecording() {
    if (m_isRecording) {
        return true; // Already recording
    }

    if (!m_device || !m_audioClient) {
        setError(L"Audio client not initialized");
        return false;
    }

    HRESULT hr = m_audioClient->Start();
    if (FAILED(hr)) {
        setError(L"Failed to start audio client: " + std::to_wstring(hr));
        return false;
    }

    m_shouldStop = false;
    m_isRecording = true;
    m_isPaused = false;
    
    // Start recording thread
    m_recordingThread = std::thread(&WASAPIRecorder::recordingLoop, this);

    return true;
}

bool WASAPIRecorder::stopRecording() {
    if (!m_isRecording) {
        return true; // Already stopped
    }

    m_shouldStop = true;
    m_isRecording = false;

    // Wait for recording thread to finish
    if (m_recordingThread.joinable()) {
        m_recordingThread.join();
    }

    if (m_audioClient) {
        m_audioClient->Stop();
        m_audioClient->Reset();
    }

    return true;
}

bool WASAPIRecorder::pauseRecording() {
    if (!m_isRecording || m_isPaused) {
        return false;
    }

    m_isPaused = true;
    return true;
}

bool WASAPIRecorder::resumeRecording() {
    if (!m_isRecording || !m_isPaused) {
        return false;
    }

    m_isPaused = false;
    return true;
}

float WASAPIRecorder::getCurrentLevel() {
    return m_currentLevel.load();
}

float WASAPIRecorder::getPeakLevel() {
    return m_peakLevel.load();
}

void WASAPIRecorder::resetPeakLevel() {
    m_peakLevel = 0.0f;
}

std::vector<float> WASAPIRecorder::getAudioData(size_t maxFrames) {
    std::lock_guard<std::mutex> lock(m_bufferMutex);
    
    std::vector<float> result;
    size_t totalFrames = 0;
    
    while (!m_audioQueue.empty() && (maxFrames == 0 || totalFrames < maxFrames)) {
        AudioBuffer& buffer = m_audioQueue.front();
        size_t framesToCopy = buffer.frameCount;
        
        if (maxFrames > 0 && totalFrames + framesToCopy > maxFrames) {
            framesToCopy = maxFrames - totalFrames;
        }
        
        size_t samplesToCopy = framesToCopy * buffer.channelCount;
        result.insert(result.end(), buffer.samples.begin(), buffer.samples.begin() + samplesToCopy);
        
        totalFrames += framesToCopy;
        
        if (framesToCopy == buffer.frameCount) {
            m_audioQueue.pop();
        } else {
            // Partial copy - remove copied samples from buffer
            buffer.samples.erase(buffer.samples.begin(), buffer.samples.begin() + samplesToCopy);
            buffer.frameCount -= framesToCopy;
            break;
        }
    }
    
    return result;
}

AudioBuffer WASAPIRecorder::getAudioBuffer() {
    std::lock_guard<std::mutex> lock(m_bufferMutex);
    
    if (m_audioQueue.empty()) {
        return AudioBuffer();
    }
    
    AudioBuffer buffer = m_audioQueue.front();
    m_audioQueue.pop();
    return buffer;
}

bool WASAPIRecorder::hasAudioData() {
    std::lock_guard<std::mutex> lock(m_bufferMutex);
    return !m_audioQueue.empty();
}

void WASAPIRecorder::recordingLoop() {
    SetThreadPriority(GetCurrentThread(), THREAD_PRIORITY_TIME_CRITICAL);
    
    HANDLE eventHandle = CreateEvent(nullptr, FALSE, FALSE, nullptr);
    if (!eventHandle) {
        setError(L"Failed to create event handle");
        return;
    }

    HRESULT hr = m_audioClient->SetEventHandle(eventHandle);
    if (FAILED(hr)) {
        setError(L"Failed to set event handle: " + std::to_wstring(hr));
        CloseHandle(eventHandle);
        return;
    }

    const DWORD waitTime = m_bufferSizeMs / 4; // Wait for 1/4 of buffer duration
    
    while (!m_shouldStop) {
        DWORD waitResult = WaitForSingleObject(eventHandle, waitTime);
        
        if (waitResult != WAIT_OBJECT_0 && waitResult != WAIT_TIMEOUT) {
            break; // Error occurred
        }

        if (m_isPaused) {
            Sleep(10);
            continue;
        }

        UINT32 frameCount = 0;
        hr = m_captureClient->GetNextPacketSize(&frameCount);
        if (FAILED(hr) || frameCount == 0) {
            continue;
        }

        BYTE* data = nullptr;
        DWORD flags = 0;
        UINT64 devicePosition = 0;
        UINT64 qpcPosition = 0;
        
        hr = m_captureClient->GetBuffer(&data, &frameCount, &flags, &devicePosition, &qpcPosition);
        if (FAILED(hr)) {
            continue;
        }

        bool silence = (flags & AUDCLNT_BUFFERFLAGS_SILENT) != 0;
        
        if (data && frameCount > 0) {
            processAudioData(data, frameCount, &silence);
        }

        m_captureClient->ReleaseBuffer(frameCount);
        m_frameCount += frameCount;
    }

    CloseHandle(eventHandle);
}

void WASAPIRecorder::processAudioData(const BYTE* data, UINT32 frameCount, bool* silence) {
    const size_t channelCount = m_waveFormat.nChannels;
    const size_t sampleCount = frameCount * channelCount;
    
    // Convert to float samples
    std::vector<float> samples(sampleCount);
    
    if (*silence) {
        std::fill(samples.begin(), samples.end(), 0.0f);
    } else {
        // Convert from 16-bit PCM to float
        const int16_t* pcmData = reinterpret_cast<const int16_t*>(data);
        for (size_t i = 0; i < sampleCount; i++) {
            samples[i] = static_cast<float>(pcmData[i]) / 32768.0f;
        }
    }

    // Apply audio processing
    applyAudioProcessing(samples.data(), sampleCount);

    // Update audio levels
    updateAudioLevels(samples.data(), sampleCount);

    // Voice activity detection
    bool voiceDetected = detectVoiceActivity(samples.data(), sampleCount);

    // Create audio buffer
    AudioBuffer buffer;
    buffer.samples = std::move(samples);
    buffer.timestamp = WASAPIUtils::getCurrentTimestamp();
    buffer.channelCount = channelCount;
    buffer.sampleRate = m_waveFormat.nSamplesPerSec;
    buffer.frameCount = frameCount;

    // Add to queue
    {
        std::lock_guard<std::mutex> lock(m_bufferMutex);
        
        if (m_audioQueue.size() >= m_maxQueueSize) {
            m_audioQueue.pop(); // Remove oldest buffer
            m_perfStats.bufferOverruns++;
        }
        
        m_audioQueue.push(buffer);
    }

    // Call audio data callback
    if (m_audioDataCallback && voiceDetected) {
        m_audioDataCallback(buffer.samples.data(), frameCount, buffer.timestamp);
    }
}

void WASAPIRecorder::updateAudioLevels(const float* samples, size_t frameCount) {
    float rms = 0.0f;
    float peak = 0.0f;
    
    for (size_t i = 0; i < frameCount; i++) {
        float sample = std::abs(samples[i]);
        rms += sample * sample;
        peak = std::max(peak, sample);
    }
    
    rms = std::sqrt(rms / frameCount);
    
    // Smooth the levels
    float currentLevel = m_currentLevel.load();
    float smoothedLevel = currentLevel * m_levelSmoothingFactor + rms * (1.0f - m_levelSmoothingFactor);
    
    m_currentLevel = smoothedLevel;
    m_peakLevel = std::max(m_peakLevel.load(), peak);

    // Call level callback
    if (m_levelCallback) {
        m_levelCallback(smoothedLevel, peak);
    }
}

void WASAPIRecorder::applyAudioProcessing(float* samples, size_t frameCount) {
    if (m_gainLevel != 1.0f) {
        for (size_t i = 0; i < frameCount; i++) {
            samples[i] *= m_gainLevel;
        }
    }

    if (m_noiseSuppressionEnabled) {
        applyNoiseSupression(samples, frameCount);
    }

    if (m_agcEnabled) {
        applyAutomaticGainControl(samples, frameCount);
    }

    if (m_echoCancellationEnabled) {
        applyEchoCancellation(samples, frameCount);
    }
}

void WASAPIRecorder::applyNoiseSupression(float* samples, size_t frameCount) {
    // Simple noise gate implementation
    const float threshold = 0.01f;
    const float ratio = 0.1f;
    
    for (size_t i = 0; i < frameCount; i++) {
        float sample = std::abs(samples[i]);
        if (sample < threshold) {
            samples[i] *= ratio;
        }
    }
}

void WASAPIRecorder::applyAutomaticGainControl(float* samples, size_t frameCount) {
    // Simple AGC implementation
    const float targetLevel = 0.3f;
    const float maxGain = 4.0f;
    const float minGain = 0.1f;
    
    float rms = 0.0f;
    for (size_t i = 0; i < frameCount; i++) {
        rms += samples[i] * samples[i];
    }
    rms = std::sqrt(rms / frameCount);
    
    if (rms > 0.001f) {
        float gain = targetLevel / rms;
        gain = std::max(minGain, std::min(maxGain, gain));
        
        for (size_t i = 0; i < frameCount; i++) {
            samples[i] *= gain;
        }
    }
}

void WASAPIRecorder::applyEchoCancellation(float* samples, size_t frameCount) {
    // Simple echo suppression (placeholder for more sophisticated implementation)
    const float echoDelay = 0.1f; // 100ms
    const float echoAttenuation = 0.5f;
    
    // This is a very basic implementation - real echo cancellation requires
    // reference signal and sophisticated algorithms like AEC
    for (size_t i = 0; i < frameCount; i++) {
        samples[i] *= echoAttenuation;
    }
}

bool WASAPIRecorder::detectVoiceActivity(const float* samples, size_t frameCount) {
    float energy = 0.0f;
    for (size_t i = 0; i < frameCount; i++) {
        energy += samples[i] * samples[i];
    }
    energy = std::sqrt(energy / frameCount);
    
    // Smooth the VAD level
    m_vadLevel = m_vadLevel * m_vadSmoothingFactor + energy * (1.0f - m_vadSmoothingFactor);
    
    return m_vadLevel > m_vadThreshold;
}

bool WASAPIRecorder::initializeAudioClient() {
    if (!m_device) {
        setError(L"No device selected");
        return false;
    }

    // Release existing audio client
    if (m_audioClient) {
        m_audioClient->Release();
        m_audioClient = nullptr;
    }
    
    if (m_captureClient) {
        m_captureClient->Release();
        m_captureClient = nullptr;
    }

    HRESULT hr = m_device->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, (void**)&m_audioClient);
    if (FAILED(hr)) {
        setError(L"Failed to activate audio client: " + std::to_wstring(hr));
        return false;
    }

    // Get device format
    WAVEFORMATEX* deviceFormat = nullptr;
    hr = m_audioClient->GetMixFormat(&deviceFormat);
    if (SUCCEEDED(hr)) {
        m_waveFormat = *deviceFormat;
        CoTaskMemFree(deviceFormat);
    }

    // Initialize audio client
    REFERENCE_TIME bufferDuration = static_cast<REFERENCE_TIME>(m_bufferSizeMs) * 10000; // Convert to 100ns units
    hr = m_audioClient->Initialize(AUDCLNT_SHAREMODE_SHARED,
                                  AUDCLNT_STREAMFLAGS_EVENTCALLBACK | AUDCLNT_STREAMFLAGS_NOPERSIST,
                                  bufferDuration, 0, &m_waveFormat, nullptr);
    if (FAILED(hr)) {
        setError(L"Failed to initialize audio client: " + std::to_wstring(hr));
        return false;
    }

    // Get buffer frame count
    hr = m_audioClient->GetBufferSize(&m_bufferFrameCount);
    if (FAILED(hr)) {
        setError(L"Failed to get buffer size: " + std::to_wstring(hr));
        return false;
    }

    // Get capture client
    hr = m_audioClient->GetService(__uuidof(IAudioCaptureClient), (void**)&m_captureClient);
    if (FAILED(hr)) {
        setError(L"Failed to get capture client: " + std::to_wstring(hr));
        return false;
    }

    return true;
}

void WASAPIRecorder::cleanup() {
    stopRecording();

    if (m_captureClient) {
        m_captureClient->Release();
        m_captureClient = nullptr;
    }

    if (m_volumeClient) {
        m_volumeClient->Release();
        m_volumeClient = nullptr;
    }

    if (m_audioClient) {
        m_audioClient->Release();
        m_audioClient = nullptr;
    }

    if (m_device) {
        m_device->Release();
        m_device = nullptr;
    }

    if (m_deviceEnumerator) {
        m_deviceEnumerator->Release();
        m_deviceEnumerator = nullptr;
    }

    CoUninitialize();
}

void WASAPIRecorder::setError(const std::wstring& error) {
    m_lastError = error;
    std::wcout << L"WASAPIRecorder Error: " << error << std::endl;
}

std::wstring WASAPIRecorder::getDeviceProperty(IMMDevice* device, const PROPERTYKEY& key) {
    IPropertyStore* propertyStore = nullptr;
    HRESULT hr = device->OpenPropertyStore(STGM_READ, &propertyStore);
    if (FAILED(hr)) {
        return L"";
    }

    PROPVARIANT prop;
    PropVariantInit(&prop);
    hr = propertyStore->GetValue(key, &prop);
    
    std::wstring result;
    if (SUCCEEDED(hr) && prop.vt == VT_LPWSTR) {
        result = prop.pwszVal;
    }

    PropVariantClear(&prop);
    propertyStore->Release();
    return result;
}

WASAPIRecorder::PerformanceStats WASAPIRecorder::getPerformanceStats() {
    auto now = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(now - m_lastPerfUpdate);
    
    if (duration.count() >= 1000) { // Update every second
        // Update performance statistics
        m_perfStats.averageLatency = static_cast<double>(m_bufferSizeMs);
        
        // Reset counters
        m_lastPerfUpdate = now;
    }
    
    return m_perfStats;
}

// Utility functions implementation
std::string WASAPIUtils::wstringToString(const std::wstring& wstr) {
    if (wstr.empty()) return std::string();
    int size = WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), nullptr, 0, nullptr, nullptr);
    std::string result(size, 0);
    WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), &result[0], size, nullptr, nullptr);
    return result;
}

std::wstring WASAPIUtils::stringToWstring(const std::string& str) {
    if (str.empty()) return std::wstring();
    int size = MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), nullptr, 0);
    std::wstring result(size, 0);
    MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), &result[0], size);
    return result;
}

double WASAPIUtils::getCurrentTimestamp() {
    auto now = std::chrono::high_resolution_clock::now();
    auto duration = now.time_since_epoch();
    auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(duration);
    return static_cast<double>(millis.count()) / 1000.0;
}