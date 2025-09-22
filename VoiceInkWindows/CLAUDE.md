# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

VoiceInk Windows is a port of the macOS VoiceInk voice-to-text application. **Current state: Steps 1-5 of 100 complete** (foundation only, no real functionality yet).

## Essential Commands

```bash
# Development (simplified package.json currently active)
npm install              # Install minimal dependencies
npm run dev             # Start Electron app (GUI fails in container, build works)
npm run build:native    # Compile C++ stub modules (audiorecorder.node, whisperbinding.node)

# Test native modules
node -e "const a=require('./build/Release/audiorecorder.node'); console.log(new a.AudioRecorder().getDevices())"
node -e "const w=require('./build/Release/whisperbinding.node'); const t=new w.Whisper(); t.loadModel('test'); console.log(t.isLoaded())"

# Switch between configurations
cp package-simple.json package.json    # Use minimal config (currently active)
cp package-original.json package.json  # Use full config (will fail - many deps don't exist)
cp electron.vite.config-simple.ts electron.vite.config.ts  # Simple config
```

## Architecture & Key Files

### Working Files (Steps 1-5)
- `src/main/main-simple.ts` - Minimal Electron main process that works
- `src/preload/preload-simple.ts` - Basic preload with native module test
- `src/renderer/App-simple.tsx` - React app with Hello World button
- `src/native/audio-recorder/addon.cpp` - Stub C++ audio module (compiles, returns fake data)
- `src/native/whisper-binding/addon.cpp` - Stub C++ whisper module (compiles, returns fake text)
- `binding.gyp` - Node-gyp configuration that actually works

### Non-Working Scaffolding (Steps 6-100)
- `src/main/index.ts` - Full app with non-existent dependencies
- `src/main/audio/recorder.ts` - Uses FFmpeg that doesn't exist
- `src/main/whisper/service.ts` - References whisper.cpp that isn't compiled
- `src/renderer/App.tsx` - Imports UI components that don't exist
- All files in `src/renderer/pages/`, `components/`, `stores/` - Not implemented

## Critical Implementation Details

### Native Module Loading
```javascript
// In preload or main process only, NOT renderer
const audio = require('../../build/Release/audiorecorder.node')
const whisper = require('../../build/Release/whisperbinding.node')
```

### Current Limitations
1. **Container environment**: `libnss3.so` missing, Electron GUI won't display
2. **Audio recording**: Stub returns 1KB buffer, no real WASAPI implementation
3. **Whisper transcription**: Returns hardcoded "Hello world" text
4. **Database**: Prisma schema exists but not connected/tested
5. **IPC**: Structure exists but not fully wired up

## Implementation Status Tracking

Use `IMPLEMENTATION_PLAN.md` for the 100-step plan. Current status:
- ✅ Steps 1-5: Foundation complete
- ⏳ Steps 6-10: IPC, database, React UI (next batch)
- ❌ Steps 11-100: Not started

Use `VERIFICATION_PROMPT.md` to verify actual functionality before claiming completion.

## Development Approach

1. **Always verify functionality** - Run the actual commands, don't assume
2. **Use simple versions first** - Get `*-simple.ts` files working before complex ones
3. **Check native module compilation** - `npm run build:native` must succeed
4. **Test in isolation** - Use `node -e` commands to test modules directly
5. **Document real vs stub** - Be explicit about what's fake implementation

## Known Issues Requiring Fixes

1. **Package.json has wrong dependencies** - Many packages listed don't exist or aren't used
2. **PostCSS/Tailwind not configured** - Removed to get build working
3. **Electron can't display GUI** - Container limitation, but build/compilation works
4. **No real audio/whisper implementation** - Just C++ stubs that compile

## Next Implementation Priority

Complete Steps 6-10:
1. Wire up IPC between main-simple.ts and App-simple.tsx
2. Test Prisma database connection
3. Make Hello World button actually call native modules
4. Add window controls (min/max/close)
5. Verify React hot reload works

## Build System Notes

- **Main entry**: `out/main/index.js` (not `dist/`)
- **Native modules**: Built to `build/Release/*.node`
- **Vite dev server**: Runs on http://localhost:5173
- **TypeScript**: Compiles successfully, no type errors in simple files
- **node-gyp**: Works with Python 3.12.3, gcc/g++ available

Remember: This is a Windows port that currently runs on Linux for development. Real Windows-specific code (WASAPI, SendInput, etc.) will need actual Windows environment for testing.