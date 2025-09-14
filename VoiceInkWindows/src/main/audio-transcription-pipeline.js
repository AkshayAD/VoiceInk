/**
 * Audio Transcription Pipeline
 * Integrates WASAPI audio recording with Whisper.cpp transcription
 */

const EventEmitter = require('events');

class AudioTranscriptionPipeline extends EventEmitter {
    constructor() {
        super();
        this.audioRecorder = null;
        this.whisperTranscriber = null;
        this.isRecording = false;
        this.isTranscribing = false;
        this.currentModel = null;
        this.audioBuffer = [];
        this.config = {
            sampleRate: 16000,
            channels: 1,
            bitsPerSample: 16,
            chunkSizeMs: 5000, // 5 second chunks
            language: 'auto',
            modelPath: './models/ggml-base.en.bin'
        };
    }

    async initialize(options = {}) {
        // Merge configuration
        this.config = { ...this.config, ...options };
        
        try {
            // Load native modules (these would be real in Windows build)
            console.log('AudioTranscriptionPipeline: Loading native modules...');
            
            // In a real Windows build, these would load the compiled native modules:
            // const audioModule = require('../native/audio-recorder/build/Release/audiorecorder.node');
            // const whisperModule = require('../native/whisper-binding/build/Release/whisperbinding.node');
            
            // Mock implementation for demonstration
            this.audioRecorder = new MockAudioRecorder();
            this.whisperTranscriber = new MockWhisperTranscriber();
            
            // Initialize audio recorder
            const audioInit = await this.audioRecorder.initialize({
                sampleRate: this.config.sampleRate,
                channels: this.config.channels,
                bitsPerSample: this.config.bitsPerSample
            });
            
            if (!audioInit) {
                throw new Error('Failed to initialize audio recorder');
            }
            
            // Load Whisper model
            const modelLoaded = await this.whisperTranscriber.loadModel(this.config.modelPath);
            if (!modelLoaded) {
                throw new Error(`Failed to load Whisper model: ${this.config.modelPath}`);
            }
            
            this.currentModel = this.config.modelPath;
            
            console.log('AudioTranscriptionPipeline: Initialization complete');
            console.log(`  Audio: ${this.config.sampleRate}Hz, ${this.config.channels}ch, ${this.config.bitsPerSample}-bit`);
            console.log(`  Model: ${this.currentModel}`);
            
            this.emit('initialized');
            return true;
            
        } catch (error) {
            console.error('AudioTranscriptionPipeline: Initialization failed:', error.message);
            this.emit('error', error);
            return false;
        }
    }

    async startRecording() {
        if (this.isRecording) {
            console.log('AudioTranscriptionPipeline: Already recording');
            return true;
        }

        if (!this.audioRecorder || !this.whisperTranscriber) {
            throw new Error('Pipeline not initialized');
        }

        try {
            console.log('AudioTranscriptionPipeline: Starting audio recording...');
            
            // Clear previous audio buffer
            this.audioBuffer = [];
            
            // Start WASAPI recording
            const recordingStarted = await this.audioRecorder.startRecording();
            if (!recordingStarted) {
                throw new Error('Failed to start audio recording');
            }
            
            this.isRecording = true;
            
            // Set up periodic audio chunk processing
            this.audioProcessingInterval = setInterval(() => {
                this.processAudioChunk();
            }, this.config.chunkSizeMs);
            
            console.log('AudioTranscriptionPipeline: Recording started');
            this.emit('recordingStarted');
            return true;
            
        } catch (error) {
            console.error('AudioTranscriptionPipeline: Failed to start recording:', error.message);
            this.emit('error', error);
            return false;
        }
    }

    async stopRecording() {
        if (!this.isRecording) {
            console.log('AudioTranscriptionPipeline: Not currently recording');
            return true;
        }

        try {
            console.log('AudioTranscriptionPipeline: Stopping audio recording...');
            
            // Stop periodic processing
            if (this.audioProcessingInterval) {
                clearInterval(this.audioProcessingInterval);
                this.audioProcessingInterval = null;
            }
            
            // Stop WASAPI recording
            const result = await this.audioRecorder.stopRecording();
            
            this.isRecording = false;
            
            // Process any remaining audio data
            if (result.success && result.data && result.data.length > 0) {
                console.log(`AudioTranscriptionPipeline: Processing final audio chunk (${result.size} bytes)`);
                await this.transcribeAudioData(result.data);
            }
            
            console.log('AudioTranscriptionPipeline: Recording stopped');
            this.emit('recordingStopped');
            return true;
            
        } catch (error) {
            console.error('AudioTranscriptionPipeline: Failed to stop recording:', error.message);
            this.emit('error', error);
            return false;
        }
    }

    async processAudioChunk() {
        if (!this.isRecording || this.isTranscribing) {
            return;
        }

        try {
            // Get audio data from WASAPI buffer
            const chunkSize = Math.floor(this.config.sampleRate * this.config.chunkSizeMs / 1000) * 2; // 2 bytes per 16-bit sample
            const audioData = await this.audioRecorder.getAudioData(chunkSize);
            
            if (audioData && audioData.length > 0) {
                console.log(`AudioTranscriptionPipeline: Processing audio chunk (${audioData.length} bytes)`);
                await this.transcribeAudioData(audioData);
            }
            
        } catch (error) {
            console.error('AudioTranscriptionPipeline: Error processing audio chunk:', error.message);
            this.emit('error', error);
        }
    }

    async transcribeAudioData(audioBuffer) {
        if (this.isTranscribing) {
            console.log('AudioTranscriptionPipeline: Transcription in progress, queuing audio data');
            this.audioBuffer.push(audioBuffer);
            return;
        }

        this.isTranscribing = true;

        try {
            // Convert 16-bit PCM to float array for Whisper
            const floatArray = this.whisperTranscriber.convertPCMToFloat(audioBuffer);
            
            console.log(`AudioTranscriptionPipeline: Transcribing ${floatArray.length} audio samples`);
            
            // Perform transcription
            const result = await this.whisperTranscriber.transcribe(audioBuffer, this.config.language);
            
            if (result.success && result.text && result.text.trim().length > 0) {
                console.log(`AudioTranscriptionPipeline: Transcription result: "${result.text}"`);
                
                const transcriptionResult = {
                    text: result.text.trim(),
                    language: result.language,
                    confidence: result.confidence,
                    duration: result.duration,
                    timestamp: Date.now()
                };
                
                this.emit('transcription', transcriptionResult);
            } else {
                console.log('AudioTranscriptionPipeline: No transcription result or empty text');
            }
            
        } catch (error) {
            console.error('AudioTranscriptionPipeline: Transcription failed:', error.message);
            this.emit('transcriptionError', error);
        } finally {
            this.isTranscribing = false;
            
            // Process queued audio data
            if (this.audioBuffer.length > 0) {
                const nextBuffer = this.audioBuffer.shift();
                setImmediate(() => this.transcribeAudioData(nextBuffer));
            }
        }
    }

    async changeModel(modelPath) {
        console.log(`AudioTranscriptionPipeline: Changing model to ${modelPath}`);
        
        try {
            const wasRecording = this.isRecording;
            
            // Stop recording if active
            if (wasRecording) {
                await this.stopRecording();
            }
            
            // Load new model
            const success = await this.whisperTranscriber.loadModel(modelPath);
            if (!success) {
                throw new Error(`Failed to load model: ${modelPath}`);
            }
            
            this.currentModel = modelPath;
            this.config.modelPath = modelPath;
            
            // Restart recording if it was active
            if (wasRecording) {
                await this.startRecording();
            }
            
            console.log(`AudioTranscriptionPipeline: Model changed to ${modelPath}`);
            this.emit('modelChanged', modelPath);
            return true;
            
        } catch (error) {
            console.error('AudioTranscriptionPipeline: Model change failed:', error.message);
            this.emit('error', error);
            return false;
        }
    }

    async getAvailableModels() {
        if (!this.whisperTranscriber) {
            throw new Error('Pipeline not initialized');
        }
        
        return await this.whisperTranscriber.getAvailableModels('./models');
    }

    getCurrentLevel() {
        if (!this.audioRecorder) {
            return 0;
        }
        return this.audioRecorder.getLevel();
    }

    getStatus() {
        return {
            initialized: !!(this.audioRecorder && this.whisperTranscriber),
            recording: this.isRecording,
            transcribing: this.isTranscribing,
            currentModel: this.currentModel,
            audioLevel: this.getCurrentLevel(),
            config: { ...this.config }
        };
    }

    async cleanup() {
        console.log('AudioTranscriptionPipeline: Cleaning up...');
        
        await this.stopRecording();
        
        if (this.audioProcessingInterval) {
            clearInterval(this.audioProcessingInterval);
        }
        
        if (this.whisperTranscriber) {
            await this.whisperTranscriber.unloadModel();
        }
        
        this.audioRecorder = null;
        this.whisperTranscriber = null;
        this.removeAllListeners();
        
        console.log('AudioTranscriptionPipeline: Cleanup complete');
    }
}

// Mock implementations for testing (these would be real native modules in Windows)
class MockAudioRecorder {
    constructor() {
        this.initialized = false;
        this.recording = false;
        this.audioData = [];
        this.level = 0;
    }

    async initialize(config) {
        console.log('MockAudioRecorder: Initializing with config:', config);
        this.initialized = true;
        return true;
    }

    async startRecording() {
        if (!this.initialized) return false;
        console.log('MockAudioRecorder: Starting recording');
        this.recording = true;
        this.simulateAudio();
        return true;
    }

    async stopRecording() {
        console.log('MockAudioRecorder: Stopping recording');
        this.recording = false;
        
        // Return mock audio data
        const mockAudioData = Buffer.alloc(16000 * 2); // 1 second of 16-bit audio
        return {
            success: true,
            data: mockAudioData,
            size: mockAudioData.length,
            duration: 1.0
        };
    }

    async getAudioData(size) {
        if (!this.recording) return Buffer.alloc(0);
        
        // Return mock audio data
        return Buffer.alloc(Math.min(size, 8000)); // Mock chunk
    }

    getLevel() {
        if (!this.recording) return 0;
        // Simulate varying audio levels
        this.level = Math.random() * 100;
        return this.level;
    }

    simulateAudio() {
        if (this.recording) {
            // Simulate audio data collection
            setTimeout(() => this.simulateAudio(), 100);
        }
    }
}

class MockWhisperTranscriber {
    constructor() {
        this.modelLoaded = false;
        this.currentModel = null;
    }

    async loadModel(modelPath) {
        console.log('MockWhisperTranscriber: Loading model from', modelPath);
        this.modelLoaded = true;
        this.currentModel = modelPath;
        return true;
    }

    async unloadModel() {
        console.log('MockWhisperTranscriber: Unloading model');
        this.modelLoaded = false;
        this.currentModel = null;
        return true;
    }

    convertPCMToFloat(buffer) {
        // Mock conversion: return array of appropriate size
        const sampleCount = buffer.length / 2;
        return new Array(sampleCount).fill(0);
    }

    async transcribe(audioBuffer, language) {
        if (!this.modelLoaded) {
            throw new Error('Model not loaded');
        }

        console.log('MockWhisperTranscriber: Transcribing audio buffer');
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Return mock transcription
        const mockTexts = [
            "Hello, this is a test transcription from the voice to text system.",
            "The quick brown fox jumps over the lazy dog.",
            "VoiceInk is working correctly with WASAPI and Whisper integration.",
            "This demonstrates real-time voice transcription capabilities.",
            "The audio pipeline is processing speech successfully."
        ];
        
        return {
            success: true,
            text: mockTexts[Math.floor(Math.random() * mockTexts.length)],
            language: language === 'auto' ? 'en' : language,
            confidence: 0.85 + Math.random() * 0.1,
            duration: audioBuffer.length / 32000 // Approximate duration
        };
    }

    async getAvailableModels(directory) {
        return [
            { name: 'ggml-tiny.en.bin', path: `${directory}/ggml-tiny.en.bin`, sizeMB: 39, isMultilingual: false, isLoaded: false },
            { name: 'ggml-base.en.bin', path: `${directory}/ggml-base.en.bin`, sizeMB: 147, isMultilingual: false, isLoaded: this.currentModel?.includes('base.en') },
            { name: 'ggml-small.en.bin', path: `${directory}/ggml-small.en.bin`, sizeMB: 488, isMultilingual: false, isLoaded: false }
        ];
    }
}

module.exports = AudioTranscriptionPipeline;