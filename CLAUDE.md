# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VoiceInk is a cross-platform voice-to-text application with AI-powered transcription. This repository contains:

1. **VoiceInk macOS** (Swift/SwiftUI) - Production app using whisper.cpp
2. **VoiceInkWindows** (Electron/TypeScript/React) - Windows port currently in development

The Windows version is an Electron application being migrated from the macOS version, implementing the same core features with platform-specific optimizations.

## Architecture

### VoiceInkWindows Structure

- **Main Process** (`src/main/`): Electron main process handling system APIs, audio recording, and AI transcription
- **Renderer Process** (`src/renderer/`): React UI with TypeScript, using Tailwind CSS and Radix UI components
- **Preload Script** (`src/preload/`): Secure IPC bridge between main and renderer processes
- **Native Modules** (`src/native/`): C++ bindings for WASAPI audio and Whisper.cpp integration

### Key Components

- **Audio Pipeline**: Mock services in development (`mockAudioRecorder.ts`, `mockTranscriptionService.ts`) that will be replaced with real WASAPI and Whisper.cpp implementations
- **Database**: Prisma ORM with SQLite for storing transcriptions and user data
- **IPC Architecture**: Comprehensive handlers in `audioHandlers.ts` for communication between processes
- **UI System**: Component-based React architecture with layout, feature, and UI component separation

### Data Flow

1. Audio captured via WASAPI (Windows) or Core Audio (macOS)
2. Real-time processing through whisper.cpp models
3. Transcription results stored in SQLite database via Prisma
4. UI updates through IPC events for real-time display
5. Power Mode system detects active applications for context-aware processing

## Development Commands

### VoiceInkWindows (Electron)

```bash
cd VoiceInkWindows

# Development
npm run dev          # Start development with hot reload
npm run build        # Build for production
npm run preview      # Preview production build
npm run build:native # Compile C++ native modules (requires Windows SDK)

# Database operations
npx prisma generate  # Generate Prisma client
npx prisma migrate dev --name init  # Create new migration
npx prisma studio    # Open database GUI

# Testing
node test-mock-services.js  # Test mock services integration
```

### VoiceInk macOS (Swift)

```bash
# Build whisper.cpp framework (required dependency)
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp && ./build-xcframework.sh

# Build VoiceInk macOS
# Open VoiceInk.xcodeproj in Xcode
# Add whisper.xcframework to project
# Build with Cmd+B, Run with Cmd+R
```

## Implementation Status

### VoiceInkWindows Progress (Steps 1-30 completed)

- ✅ **Foundation**: Electron app structure, IPC communication, database setup
- ✅ **UI Components**: Complete React component library with 27+ components
- ✅ **Mock Services**: Functional audio recording and transcription simulation
- ⚠️ **Native Audio**: Mock implementation ready for WASAPI integration
- ⚠️ **AI Transcription**: Mock implementation ready for Whisper.cpp integration

### Current Development Phase

Working on Steps 31-40: Backend Integration & System Features. The mock services demonstrate the complete workflow and architecture, ready for real implementation.

## Technical Notes

### Windows-Specific Development

- WASAPI audio recording requires Windows SDK and Visual Studio Build Tools
- Whisper.cpp integration needs C++ compilation environment
- Native modules won't compile on non-Windows systems (use mocks for development)

### Database Schema

Core entities:
- `Transcription`: Audio transcription records with metadata
- `Settings`: User preferences and configuration
- `PowerProfile`: App-specific transcription profiles

### IPC API Structure

The preload script exposes these APIs to the renderer:
- `electronAPI.audio.*`: Audio recording and device management
- `electronAPI.transcription.*`: AI model management and transcription
- `electronAPI.workflow.*`: Combined recording + transcription operations
- `electronAPI.settings.*`: Application settings persistence
- `electronAPI.file.*`: File operations and exports

### Component Architecture

- **Layout Components**: `MainLayout`, `TitleBar`, `Sidebar` for app structure
- **Feature Components**: `RecordingButton`, `TranscriptionDisplay`, `AudioLevelMeter` for core functionality  
- **UI Components**: `Button`, `Card`, `Input`, `Badge` for design system
- **Page Components**: `Dashboard`, `RecorderPage`, `HistoryPage`, etc. for application screens

## Key Dependencies

### VoiceInkWindows
- **Electron**: Desktop app framework
- **React + TypeScript**: UI framework with type safety
- **Tailwind CSS + Radix UI**: Design system and component library
- **Prisma**: Database ORM and migrations
- **whisper.cpp**: AI transcription models (to be integrated)

### VoiceInk macOS
- **whisper.cpp**: Core transcription engine
- **SwiftUI**: Native UI framework
- **Core Audio**: macOS audio system integration

## Development Workflow

1. **UI Development**: Use mock services to develop and test React components
2. **Backend Development**: Implement real WASAPI and Whisper.cpp services on Windows
3. **Integration**: Replace mock services with real implementations
4. **Testing**: Use provided test scripts to verify functionality
5. **Cross-Platform**: Ensure feature parity between macOS and Windows versions

The mock services provide a complete functional preview of the final application, allowing UI development to proceed independently of native implementation.