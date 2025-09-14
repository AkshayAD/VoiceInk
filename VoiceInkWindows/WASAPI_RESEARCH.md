# WASAPI Research and Implementation Guide

## Overview
Windows Audio Session API (WASAPI) is the low-level audio API for Windows Vista and later that provides direct access to audio devices with minimal latency. This document outlines the requirements and implementation strategy for VoiceInk Windows.

## WASAPI Architecture

### Core Components
1. **IMMDeviceEnumerator** - Enumerates audio devices
2. **IMMDevice** - Represents an audio device
3. **IAudioClient** - Main interface for audio operations
4. **IAudioCaptureClient** - Interface for capturing audio data
5. **WAVEFORMATEX** - Audio format structure

### Audio Flow
```
Audio Device → WASAPI Buffer → Application Buffer → Processing
```

## Requirements for VoiceInk

### System Requirements
- Windows Vista or later
- Windows SDK headers (mmeapi.h, audioclient.h, mmdeviceapi.h)
- COM initialization
- Appropriate audio device permissions

### Audio Format Requirements
```cpp
WAVEFORMATEX format = {
    .wFormatTag = WAVE_FORMAT_PCM,
    .nChannels = 1,              // Mono for voice
    .nSamplesPerSec = 16000,     // 16kHz for Whisper
    .wBitsPerSample = 16,        // 16-bit samples
    .nBlockAlign = 2,            // nChannels * wBitsPerSample / 8
    .nAvgBytesPerSec = 32000,    // nSamplesPerSec * nBlockAlign
    .cbSize = 0
};
```

### Buffer Management
- **Buffer Size**: 200-500ms for low latency (3200-8000 bytes at 16kHz)
- **Ring Buffer**: Circular buffer to handle continuous recording
- **Thread Safety**: WASAPI callbacks run on audio thread

## Implementation Steps

### 1. Device Enumeration
```cpp
// Get default capture device
IMMDeviceEnumerator* deviceEnumerator;
IMMDevice* device;
CoCreateInstance(__uuidof(MMDeviceEnumerator), NULL, CLSCTX_ALL,
                 __uuidof(IMMDeviceEnumerator), (void**)&deviceEnumerator);
deviceEnumerator->GetDefaultAudioEndpoint(eCapture, eConsole, &device);
```

### 2. Audio Client Initialization
```cpp
// Get audio client and initialize
IAudioClient* audioClient;
device->Activate(__uuidof(IAudioClient), CLSCTX_ALL, NULL, (void**)&audioClient);
audioClient->Initialize(AUDCLNT_SHAREMODE_SHARED, 0, bufferDuration, 0, &format, NULL);
```

### 3. Capture Client Setup
```cpp
// Get capture client
IAudioCaptureClient* captureClient;
audioClient->GetService(__uuidof(IAudioCaptureClient), (void**)&captureClient);
```

### 4. Recording Loop
```cpp
// Start recording
audioClient->Start();

while (recording) {
    UINT32 packetLength;
    captureClient->GetNextPacketSize(&packetLength);
    
    if (packetLength > 0) {
        BYTE* data;
        DWORD flags;
        captureClient->GetBuffer(&data, &packetLength, &flags, NULL, NULL);
        
        // Process audio data
        ProcessAudioData(data, packetLength);
        
        captureClient->ReleaseBuffer(packetLength);
    }
    Sleep(1); // Small delay to prevent busy waiting
}
```

## Error Handling

### Common WASAPI Errors
- **AUDCLNT_E_DEVICE_INVALIDATED**: Device disconnected
- **AUDCLNT_E_BUFFER_TOO_LARGE**: Requested buffer too large
- **AUDCLNT_E_UNSUPPORTED_FORMAT**: Format not supported
- **E_POINTER**: Invalid pointer
- **CO_E_NOTINITIALIZED**: COM not initialized

### Recovery Strategies
1. **Device Loss**: Re-enumerate and reinitialize
2. **Format Issues**: Try fallback formats
3. **Buffer Overrun**: Increase buffer size or processing speed

## Performance Considerations

### Latency
- **Shared Mode**: 20-40ms typical latency
- **Exclusive Mode**: 3-10ms but more restrictive
- **Buffer Size**: Smaller = lower latency, higher CPU usage

### Thread Safety
- WASAPI callbacks run on real-time audio thread
- Use lock-free circular buffers for data transfer
- Minimize processing in audio callback

## Integration with Node.js

### N-API Requirements
```cpp
// Export functions to Node.js
napi_value StartRecording(napi_env env, napi_callback_info info);
napi_value StopRecording(napi_env env, napi_callback_info info);
napi_value GetAudioData(napi_env env, napi_callback_info info);
napi_value SetAudioFormat(napi_env env, napi_callback_info info);
```

### Data Transfer
- Use napi_create_buffer() for zero-copy audio data transfer
- Implement callback mechanism for real-time audio events
- Handle async operations with napi_create_async_work()

## WAV File Format

### Header Structure
```cpp
struct WAVHeader {
    char riff[4];           // "RIFF"
    uint32_t fileSize;      // File size - 8
    char wave[4];           // "WAVE"
    char fmt[4];            // "fmt "
    uint32_t fmtSize;       // 16 for PCM
    uint16_t audioFormat;   // 1 for PCM
    uint16_t numChannels;   // 1 for mono
    uint32_t sampleRate;    // 16000
    uint32_t byteRate;      // sampleRate * numChannels * bitsPerSample / 8
    uint16_t blockAlign;    // numChannels * bitsPerSample / 8
    uint16_t bitsPerSample; // 16
    char data[4];           // "data"
    uint32_t dataSize;      // Audio data size
};
```

## Security and Permissions

### Microphone Access
- Windows 10+ requires microphone permissions
- App must be declared as using microphone in manifest
- Handle permission denied gracefully

### COM Security
- Initialize COM with appropriate security settings
- Handle RPC errors for device access

## Testing Strategy

### Unit Tests
1. Device enumeration works
2. Audio format validation
3. Buffer management correctness
4. WAV file generation

### Integration Tests
1. Record 5-second test file
2. Verify audio quality and format
3. Test device switching
4. Error recovery scenarios

This research provides the foundation for implementing robust WASAPI audio recording in VoiceInk Windows.