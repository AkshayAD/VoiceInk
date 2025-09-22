#!/usr/bin/env node

/**
 * Test script to verify native module loading for VoiceInk Windows
 * This script tests if the services attempt to load native modules first
 * and shows what happens when native modules aren't available
 */

const path = require('path');

console.log('🔍 VoiceInk Windows - Native Module Loading Test');
console.log('='.repeat(50));

// Test helper to simulate module loading attempt
function testModuleLoading(modulePath, serviceName) {
    console.log(`\n📦 Testing ${serviceName}:`);
    console.log(`   Attempting to load: ${modulePath}`);
    
    try {
        const resolvedPath = path.resolve(modulePath);
        console.log(`   Resolved path: ${resolvedPath}`);
        
        // Check if file exists
        const fs = require('fs');
        if (fs.existsSync(resolvedPath)) {
            console.log(`   ✅ Native module file exists`);
            
            // Try to require the module
            try {
                const module = require(resolvedPath);
                console.log(`   ✅ Native module loaded successfully`);
                console.log(`   📊 Module exports:`, Object.keys(module));
                return { success: true, module, error: null };
            } catch (requireError) {
                console.log(`   ❌ Native module failed to load:`, requireError.message);
                return { success: false, module: null, error: requireError };
            }
        } else {
            console.log(`   ❌ Native module file does not exist`);
            return { success: false, module: null, error: new Error('File not found') };
        }
    } catch (error) {
        console.log(`   ❌ Error accessing module:`, error.message);
        return { success: false, module: null, error };
    }
}

// Test both native modules
console.log(`\n🎯 Testing Native Module Loading Behavior:`);

// Paths that the services will attempt to load
const audioModulePath = path.join(__dirname, 'src/main/../build/Release/audiorecorder.node');
const whisperModulePath = path.join(__dirname, 'src/main/../build/Release/whisperbinding.node');

// Test WASAPI Audio Recorder
const audioResult = testModuleLoading(audioModulePath, 'WASAPI Audio Recorder');

// Test Whisper Transcription
const whisperResult = testModuleLoading(whisperModulePath, 'Whisper Transcription');

// Test the actual service initialization
console.log(`\n🔧 Testing Service Initialization:`);

try {
    console.log(`\n📡 Testing AudioRecorder service...`);
    
    // Mock require to see what paths are attempted
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    
    const attemptedPaths = [];
    Module.prototype.require = function(id) {
        if (id.includes('.node')) {
            attemptedPaths.push(id);
            console.log(`   📍 Attempted to load: ${id}`);
        }
        return originalRequire.apply(this, arguments);
    };
    
    // Test loading the audio recorder service
    try {
        const audioRecorderPath = path.join(__dirname, 'src/main/services/audioRecorder.ts');
        if (require('fs').existsSync(audioRecorderPath)) {
            console.log(`   ✅ AudioRecorder TypeScript file exists`);
            console.log(`   ⚠️  Note: Cannot test TypeScript directly in Node.js without compilation`);
        } else {
            console.log(`   ❌ AudioRecorder TypeScript file not found at:`, audioRecorderPath);
        }
    } catch (error) {
        console.log(`   ❌ Error testing AudioRecorder service:`, error.message);
    }
    
    // Test loading the transcription service
    try {
        const transcriptionServicePath = path.join(__dirname, 'src/main/services/transcriptionService.ts');
        if (require('fs').existsSync(transcriptionServicePath)) {
            console.log(`   ✅ TranscriptionService TypeScript file exists`);
            console.log(`   ⚠️  Note: Cannot test TypeScript directly in Node.js without compilation`);
        } else {
            console.log(`   ❌ TranscriptionService TypeScript file not found at:`, transcriptionServicePath);
        }
    } catch (error) {
        console.log(`   ❌ Error testing TranscriptionService:`, error.message);
    }
    
    // Restore original require
    Module.prototype.require = originalRequire;
    
} catch (error) {
    console.log(`   ❌ Error during service testing:`, error.message);
}

// Summary
console.log(`\n📋 Summary:`);
console.log('='.repeat(30));

console.log(`\n🎤 Audio Recorder (WASAPI):`);
if (audioResult.success) {
    console.log(`   Status: ✅ Native module available and loadable`);
    console.log(`   Implementation: Native WASAPI`);
} else {
    console.log(`   Status: ❌ Native module not available`);
    console.log(`   Fallback: Will use MockAudioRecorder`);
    console.log(`   Error: ${audioResult.error.message}`);
}

console.log(`\n🎙️  Transcription Service (Whisper.cpp):`);
if (whisperResult.success) {
    console.log(`   Status: ✅ Native module available and loadable`);
    console.log(`   Implementation: Native Whisper.cpp`);
} else {
    console.log(`   Status: ❌ Native module not available`);
    console.log(`   Fallback: Will use MockTranscriptionService`);
    console.log(`   Error: ${whisperResult.error.message}`);
}

console.log(`\n📝 Recommendations:`);
console.log('-'.repeat(20));

if (!audioResult.success && !whisperResult.success) {
    console.log(`   1. Both native modules are missing - this is expected in development`);
    console.log(`   2. To build native modules, run: npm run build:native`);
    console.log(`   3. Requires Windows SDK and Visual Studio Build Tools`);
    console.log(`   4. Services will gracefully fall back to mock implementations`);
} else if (!audioResult.success) {
    console.log(`   1. WASAPI audio module needs to be built`);
    console.log(`   2. Run: npm run build:native`);
} else if (!whisperResult.success) {
    console.log(`   1. Whisper transcription module needs to be built`);
    console.log(`   2. Run: npm run build:native`);
    console.log(`   3. Ensure whisper.cpp is compiled and available`);
} else {
    console.log(`   ✅ All native modules are available!`);
    console.log(`   🚀 VoiceInk will use native implementations for best performance`);
}

console.log(`\n🔧 Build Instructions:`);
console.log('-'.repeat(20));
console.log(`   1. Install Windows SDK 10`);
console.log(`   2. Install Visual Studio Build Tools 2019/2022`);
console.log(`   3. Clone and build whisper.cpp:`);
console.log(`      git clone https://github.com/ggerganov/whisper.cpp.git`);
console.log(`      cd whisper.cpp && mkdir build && cd build`);
console.log(`      cmake .. && cmake --build . --config Release`);
console.log(`   4. Build native modules:`);
console.log(`      cd VoiceInkWindows && npm run build:native`);

console.log(`\n✨ Test completed!`);