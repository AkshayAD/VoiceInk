# 🎙️ VoiceInk Windows

**Professional voice-to-text application with AI-powered transcription for Windows**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/voiceink/voiceink-windows)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)](https://github.com/voiceink/voiceink-windows)
[![License](https://img.shields.io/badge/license-GPL--3.0-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-99%25-blue.svg)](https://github.com/voiceink/voiceink-windows)

## ⚡ One-Click Setup

**Ready to use in 2 minutes with real transcription!**

1. **Download**: `git clone https://github.com/yourusername/voiceink-windows.git`
2. **Setup**: Right-click `SETUP.bat` → "Run as administrator"  
3. **Start**: Double-click `START_VOICEINK.bat`

**That's it!** VoiceInk launches with working audio recording and AI transcription.

[📖 **Full Setup Guide →**](DOWNLOAD_AND_RUN.md)

## Features

✅ **Core Features**
- Real-time voice recording with WASAPI
- Local transcription using whisper.cpp
- Multiple Whisper model support (tiny to large)
- Voice Activity Detection (VAD)
- Audio level monitoring

✅ **UI/UX**
- Modern React-based interface with Tailwind CSS
- Dark/Light theme support
- System tray integration
- Mini recorder overlay (always-on-top)
- Transcription history with search
- Real-time metrics dashboard

✅ **System Integration**
- Global hotkeys (customizable)
- Clipboard management with smart paste
- Active window detection
- Browser URL detection
- Auto-start on login
- Text insertion via SendInput

✅ **Advanced Features**
- Power Mode (app-specific profiles)
- AI Enhancement (OpenAI/Anthropic integration)
- Custom dictionary support
- Text replacements
- Screen context capture
- Multi-language support

## Prerequisites

- Windows 10 (1903+) or Windows 11
- Node.js 18+ and npm
- Visual Studio 2022 or Build Tools for Visual Studio (for native modules)
- Python 3.x (for node-gyp)
- FFmpeg (optional, for better audio support)

## Quick Start

### 1. Install Dependencies

```bash
# Clone the repository
cd VoiceInkWindows

# Install npm packages
npm install

# Build native modules
npm run build:native
```

### 2. Download Whisper Models

Models will be automatically downloaded on first use, or you can pre-download:

```bash
# Download base English model (recommended for start)
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin -o resources/models/ggml-base.en.bin
```

### 3. Development

```bash
# Start development server with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
```

### 4. Build for Production

```bash
# Build the application
npm run build

# Create Windows installer
npm run dist:win

# Create portable executable
npm run dist:portable
```

## Project Structure

```
VoiceInkWindows/
├── src/
│   ├── main/           # Electron main process
│   │   ├── audio/      # Audio recording (WASAPI)
│   │   ├── whisper/    # Transcription service
│   │   ├── system/     # Windows integration
│   │   └── database/   # SQLite with Prisma
│   ├── renderer/       # React UI
│   │   ├── components/ # UI components
│   │   ├── pages/      # Application pages
│   │   └── stores/     # State management (Zustand)
│   └── native/         # C++ native modules
├── prisma/             # Database schema
├── resources/          # Assets and models
└── claude.md          # Development documentation
```

## Configuration

### Hotkeys (Default)
- `Alt+Space` - Toggle recording
- `Alt+Shift+R` - Toggle mini recorder
- `Alt+Shift+V` - Paste last transcription

### Audio Settings
- Sample Rate: 16kHz (Whisper requirement)
- Channels: Mono
- Bit Depth: 16-bit
- Format: WAV

## Building from Source

### Windows Native Modules

If you encounter issues with native modules:

1. Install Windows Build Tools:
```bash
npm install --global windows-build-tools
```

2. Rebuild native modules:
```bash
npm run build:native
# or
npx electron-rebuild
```

### whisper.cpp Integration

The project includes whisper.cpp as a native Node.js addon. To rebuild:

```bash
cd src/native/whisper-binding
node-gyp rebuild
```

## Performance Optimization

- **Model Selection**: Use `base.en` for best speed/accuracy balance
- **GPU Acceleration**: Enable CUDA/DirectML if available
- **Memory**: ~200MB idle, ~500MB during transcription
- **CPU**: <5% idle, 20-40% during transcription

## Troubleshooting

### Audio Recording Issues
- Ensure microphone permissions are granted
- Check Windows Privacy Settings > Microphone
- Try running as Administrator

### Transcription Failures
- Verify model files exist in `resources/models/`
- Check available disk space (models need 50MB-2GB)
- Review logs in `%APPDATA%/voiceink-windows/logs/`

### Hotkey Conflicts
- Check for conflicts with other applications
- Try alternative key combinations
- Disable conflicting apps temporarily

## API Keys (Optional)

For cloud transcription fallback and AI enhancement:

1. Create `.env` file:
```env
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

2. Or set in Settings > API Keys

## Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

## Distribution

Built installers will be in `dist-electron/`:
- `VoiceInk-Setup-1.0.0.exe` - NSIS installer
- `VoiceInk-1.0.0-portable.exe` - Portable version

## Security

- Code signing recommended for distribution
- API keys stored in system keychain
- Local-only processing by default
- No telemetry or data collection

## Known Limitations

1. **Browser URL Detection**: Limited to window title parsing
2. **GPU Acceleration**: Requires manual CUDA setup
3. **Multiple Monitors**: Mini recorder appears on primary only
4. **Network Drives**: Models must be on local disk

## Contributing

See [claude.md](claude.md) for development guidelines and architecture decisions.

## License

GPL-3.0 (matching original VoiceInk license)

## Credits

- Original VoiceInk by Pax
- whisper.cpp by Georgi Gerganov
- Electron, React, and all open-source dependencies

---

Built with ❤️ for Windows users who need powerful voice-to-text capabilities.