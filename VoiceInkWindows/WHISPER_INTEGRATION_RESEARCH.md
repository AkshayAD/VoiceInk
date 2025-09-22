# Whisper.cpp Integration Research

## Overview
Whisper.cpp is a high-performance C/C++ implementation of OpenAI's Whisper automatic speech recognition model. It provides local, offline speech-to-text transcription with multiple model sizes and languages.

## Whisper.cpp Architecture

### Core Components
1. **whisper.h** - Main API header with C interface
2. **whisper.cpp** - Core implementation
3. **ggml** - Machine learning tensor library (backend)
4. **Model Files** - GGML format model weights
5. **Audio Processing** - PCM audio input handling

### Key Features
- Multiple model sizes (tiny, base, small, medium, large)
- Multi-language support (99+ languages)
- Local processing (no internet required)
- Real-time and batch processing
- Quantized models for efficiency
- Thread-based parallel processing

## Model Formats and Specifications

### GGML Model Format
Whisper.cpp uses GGML (Georgi Gerganov Machine Learning) format:
```
Model Files:
- ggml-tiny.bin     (~39 MB)   - Fastest, lowest accuracy
- ggml-tiny.en.bin  (~39 MB)   - English-only tiny
- ggml-base.bin     (~147 MB)  - Balanced speed/accuracy
- ggml-base.en.bin  (~147 MB)  - English-only base
- ggml-small.bin    (~488 MB)  - Good accuracy
- ggml-small.en.bin (~488 MB)  - English-only small
- ggml-medium.bin   (~1.5 GB)  - High accuracy
- ggml-medium.en.bin (~1.5 GB) - English-only medium
- ggml-large-v1.bin (~3.0 GB)  - Highest accuracy
- ggml-large-v2.bin (~3.0 GB)  - Latest large model
- ggml-large-v3.bin (~3.0 GB)  - Latest large model
```

### Model Selection Recommendations
- **VoiceInk Default**: `ggml-base.en.bin` (147MB) - Best balance for English voice notes
- **Fast Mode**: `ggml-tiny.en.bin` (39MB) - For real-time transcription
- **High Quality**: `ggml-small.en.bin` (488MB) - For important recordings
- **Multi-language**: `ggml-base.bin` if supporting non-English

## Audio Input Requirements

### Format Specifications
```cpp
Audio Requirements:
- Sample Rate: 16000 Hz (16 kHz) - REQUIRED
- Channels: 1 (mono) - REQUIRED  
- Bit Depth: 32-bit float or 16-bit PCM
- Format: Raw PCM data (no headers)
- Endianness: Little-endian
- Duration: Any length (whisper processes in 30s chunks)
```

### Audio Preprocessing
Whisper.cpp handles:
- Automatic volume normalization
- Voice Activity Detection (VAD)
- Audio segmentation (30-second windows)
- Mel-spectrogram generation
- Audio filtering and enhancement

### WASAPI Integration Requirements
Our WASAPI system outputs:
- ✅ 16kHz sample rate
- ✅ Mono channel
- ✅ 16-bit PCM format
- ❗ Need conversion: 16-bit PCM → 32-bit float

## API Interface

### Core C API Functions
```cpp
// Context management
struct whisper_context* whisper_init_from_file(const char* path_model);
void whisper_free(struct whisper_context* ctx);

// Audio processing
int whisper_pcm_to_mel(struct whisper_context* ctx, 
                       const float* samples, int n_samples, int n_threads);

// Transcription
int whisper_full(struct whisper_context* ctx,
                 struct whisper_full_params params,
                 const float* samples, int n_samples);

// Result extraction
int whisper_full_n_segments(struct whisper_context* ctx);
const char* whisper_full_get_segment_text(struct whisper_context* ctx, int i_segment);
int64_t whisper_full_get_segment_t0(struct whisper_context* ctx, int i_segment);
int64_t whisper_full_get_segment_t1(struct whisper_context* ctx, int i_segment);
```

### Parameter Configuration
```cpp
struct whisper_full_params {
    enum whisper_sampling_strategy strategy;
    int n_threads;        // Number of threads
    int n_max_text_ctx;   // Max text context
    int offset_ms;        // Audio offset
    int duration_ms;      // Process duration
    bool translate;       // Translate to English
    bool no_context;      // Disable context
    bool single_segment;  // Force single segment
    bool print_special;   // Print special tokens
    bool print_progress;  // Print progress
    bool print_realtime;  // Print realtime
    bool print_timestamps; // Print timestamps
    
    const char* language; // Language code ("en", "auto", etc.)
    
    // Callback functions
    whisper_new_segment_callback new_segment_callback;
    void* new_segment_callback_user_data;
    
    whisper_progress_callback progress_callback;
    void* progress_callback_user_data;
};
```

## Integration Requirements

### Build Dependencies
```cmake
Required Libraries:
- whisper.cpp source code
- ggml (included with whisper.cpp)
- pthread (for threading)
- Standard C++ libraries

Windows Specific:
- MSVC 2019+ or MinGW-w64
- CMake 3.12+
- No additional Windows libraries needed
```

### Memory Requirements
```
Model Loading:
- tiny: ~50MB RAM
- base: ~200MB RAM  
- small: ~600MB RAM
- medium: ~2GB RAM
- large: ~4GB RAM

Audio Processing:
- ~10MB per minute of audio
- Real-time: ~50MB working memory
```

### Threading Considerations
```cpp
Optimal Threading:
- Model Loading: Single-threaded
- Audio Processing: Multi-threaded (4-8 cores optimal)
- Transcription: Configurable thread count
- Real-time: Separate thread from audio capture
```

## Performance Optimization

### CPU Optimization
- **AVX/AVX2**: Automatic SIMD acceleration
- **Multi-threading**: 4-8 threads optimal for transcription
- **Memory Mapping**: Model files are memory-mapped
- **Quantization**: INT8 quantized models available

### Real-time Considerations
```cpp
Real-time Strategy:
1. Use smallest appropriate model (tiny/base)
2. Process in chunks (5-10 second segments)
3. Overlap processing with audio capture
4. Use separate threads for capture/transcription
5. Implement buffering and queuing
```

### Latency Targets
- **Tiny Model**: ~0.1x real-time (10s audio → 1s processing)
- **Base Model**: ~0.3x real-time (10s audio → 3s processing)
- **Small Model**: ~1.0x real-time (10s audio → 10s processing)

## Error Handling

### Common Issues
```cpp
Error Types:
- Model loading failures (file not found, corrupt)
- Memory allocation failures
- Audio format mismatches
- Thread creation failures
- Invalid parameters

Recovery Strategies:
- Model fallback (large → base → tiny)
- Memory cleanup and retry
- Audio format conversion
- Graceful degradation
```

## VoiceInk Integration Strategy

### Architecture Design
```
WASAPI Audio → Audio Buffer → Format Conversion → Whisper.cpp → Text Output
     ↓              ↓              ↓                  ↓            ↓
  16kHz PCM    Circular Buffer   Float Conversion   Processing   JavaScript
```

### Processing Pipeline
1. **Audio Capture**: WASAPI captures 16kHz 16-bit PCM
2. **Buffer Management**: Circular buffer accumulates audio data
3. **Format Conversion**: Convert 16-bit PCM to 32-bit float
4. **Chunking**: Split audio into processable segments
5. **Transcription**: Process through whisper.cpp
6. **Result Assembly**: Combine segments into final text
7. **Callback**: Return transcription to JavaScript

### Model Management
```cpp
Model Loading Strategy:
1. Default model: ggml-base.en.bin
2. Model directory: ./models/
3. Lazy loading: Load on first use
4. Model switching: Runtime model changes
5. Caching: Keep model in memory during session
6. Cleanup: Unload on application exit
```

### N-API Integration Points
```javascript
// JavaScript Interface
const whisper = new WhisperTranscriber();
await whisper.loadModel('ggml-base.en.bin');
const result = await whisper.transcribe(audioBuffer);
console.log(result.text);
```

## Testing Strategy

### Unit Tests
1. **Model Loading**: Test various model files
2. **Audio Processing**: Test different audio formats
3. **Transcription**: Test known audio samples
4. **Error Handling**: Test failure scenarios
5. **Memory Management**: Test cleanup

### Integration Tests
1. **WASAPI → Whisper**: End-to-end audio pipeline
2. **Real-time Processing**: Continuous transcription
3. **Model Switching**: Runtime model changes
4. **Performance**: Latency and throughput
5. **Accuracy**: Transcription quality

### Performance Benchmarks
- Model loading times
- Transcription latency
- Memory usage patterns
- CPU utilization
- Real-time factor measurements

This research provides the foundation for implementing robust whisper.cpp integration in VoiceInk Windows.