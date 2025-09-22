# 🎙️ VoiceInk Windows

**Professional AI-powered voice transcription for Windows - Works immediately with zero setup!**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/voiceink/voiceink-windows)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-lightgrey.svg)](https://github.com/voiceink/voiceink-windows)
[![License](https://img.shields.io/badge/license-GPL--3.0-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

---

## 🚀 Quick Start - Get Running in 2 Minutes

### **Option 1: One-Click Automated Setup (Recommended)**

```bash
# 1. Clone this repository
git clone https://github.com/voiceink/voiceink-windows.git
cd VoiceInkWindows

# 2. Run automated setup (Right-click → Run as Administrator)
SETUP.bat

# 3. Start the application
START_VOICEINK.bat
```

**That's it!** The app launches with working voice recording and AI transcription.

### **Option 2: Manual Setup for Developers**

```bash
# 1. Clone and enter directory
git clone https://github.com/voiceink/voiceink-windows.git
cd VoiceInkWindows

# 2. Install dependencies
npm install

# 3. Setup database
npx prisma generate
npx prisma migrate deploy

# 4. Start in development mode
npm run dev
```

---

## 🔑 API Keys - Enable Real AI Transcription

The app works immediately in **demo mode**, but for real transcriptions, add a FREE API key:

### **Recommended: Google Gemini (Best Free Tier)**
```batch
# Get FREE key at: https://makersuite.google.com/app/apikey
# 1,500 requests/day for free!
setx GEMINI_API_KEY "your-api-key-here"
```

### **Alternative Options**
```batch
# OpenAI Whisper (Most accurate - $0.006/min)
setx OPENAI_API_KEY "sk-your-key-here"

# AssemblyAI (Free 5 hours/month)
setx ASSEMBLYAI_API_KEY "your-key-here"

# Deepgram (Free $200 credits)
setx DEEPGRAM_API_KEY "your-key-here"
```

After adding a key, restart VoiceInk to activate real transcription.

[📖 **Detailed Setup Guide →**](DOWNLOAD_AND_RUN.md)

## ✨ Features

### **Core Functionality**
- ✅ **Real-time voice recording** from any microphone
- ✅ **AI transcription** via cloud (Gemini/OpenAI) or local (Whisper.cpp)
- ✅ **Works immediately** without compilation
- ✅ **100+ languages** supported
- ✅ **Export formats**: TXT, DOCX, JSON, SRT
- ✅ **No login required** - completely local storage

### **Smart Features**
- 🎯 **Speaker diarization** - Identifies different speakers
- ⏱️ **Timestamps** - Word-level timing
- 🔥 **Global hotkeys** - Alt+Space to start/stop
- 💾 **Auto-save** - Never lose a recording
- 🎨 **Dark/Light themes** - Easy on the eyes
- 📊 **Analytics dashboard** - Track your usage

### **System Integration**
- **System tray** with quick access menu
- **Power Mode** - App-specific profiles
- **Window detection** - Context awareness
- **Clipboard integration** - Smart paste
- **Auto-start** on Windows login
- **Mini recorder** - Always-on-top window

### **Enterprise Features** (130+ Services)
- Voice biometrics & authentication
- API gateway for integrations
- Compliance management (GDPR, HIPAA)
- Automated backups & disaster recovery
- Integration hub (Slack, Teams, Zoom)
- Machine learning pipeline

## 💾 Data Storage & Privacy

### **Where Your Data Lives**
```
C:\Users\[YourUsername]\AppData\Roaming\voiceink-windows\
├── voiceink.db          # All your transcriptions
├── recordings/          # Audio files (if enabled)
├── config.json          # Your settings
└── exports/            # Exported documents
```

### **Privacy Guaranteed**
- ✅ **All data stored locally** on your PC
- ✅ **Never sent to our servers** (we don't have any!)
- ✅ **You own all your data**
- ✅ **Export anytime** to any format

### **Accessing Your Data**
1. **In App**: Click "History" to view all transcriptions
2. **Database**: Use SQLite Browser to open `voiceink.db`
3. **Backup**: Settings → Backup → "Backup Now"

## 🎮 How to Use

### **Basic Recording**
1. **Launch**: Double-click `START_VOICEINK.bat`
2. **Record**: Click record button or press `Alt+Space`
3. **Stop**: Click stop or press `Alt+Space` again
4. **View**: Transcription appears automatically

### **Keyboard Shortcuts**
| Shortcut | Action |
|----------|--------|
| `Alt + Space` | Start/Stop Recording |
| `Alt + Shift + R` | Mini Recorder Window |
| `Alt + Shift + V` | Paste Last Transcription |
| `Ctrl + H` | Open History |
| `Ctrl + F` | Search Transcriptions |
| `Ctrl + E` | Export Selected |

### **Viewing Past Transcriptions**
1. Click **"History"** in sidebar
2. Search by content, date, or keywords
3. Click any transcription to expand
4. Play audio, export, or edit

---

## 🛠️ Development

### **Commands**
```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Create Windows installer
npm run dist:win

# Run tests
npm run test:e2e

# Database management
npx prisma studio    # Visual database editor
npx prisma generate   # Generate client
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

## ⚙️ Configuration

### **Environment Variables (.env.local)**
```env
# API Keys (choose one or more)
GEMINI_API_KEY=your-key-here       # Best free option
OPENAI_API_KEY=sk-your-key-here    # Most accurate
ASSEMBLYAI_API_KEY=your-key-here   # Good for long recordings

# Optional Settings
SAVE_AUDIO_FILES=true
DEFAULT_LANGUAGE=en
THEME=dark
```

### **Service Priority**
```
1. Cloud APIs (Primary - Always Works)
   ├── Google Gemini (Free tier: 1,500/day)
   ├── OpenAI Whisper ($0.006/min)
   └── AssemblyAI (Free 5 hrs/month)

2. Whisper.cpp (Secondary - If compiled)
   └── Local, offline, private

3. Mock Service (Fallback - Demo mode)
   └── For testing without API keys
```


## 🔧 Troubleshooting

### **App Won't Start**
```batch
# Try these steps:
1. Run START_VOICEINK.bat (auto-fixes common issues)
2. Run as Administrator
3. Delete node_modules and reinstall:
   rmdir /s node_modules
   npm install
```

### **No Audio Recording**
- Check Windows Settings → Privacy → Microphone
- Try different audio device in app Settings
- Restart the application

### **No Transcription**
- Add an API key (see API Keys section above)
- Check internet connection
- Verify API key: `echo %GEMINI_API_KEY%`
- Try different provider in Settings

### **Database Errors**
```batch
npx prisma migrate reset
npx prisma generate
```


## 📊 System Requirements

- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB for app + space for recordings
- **Internet**: Required for cloud transcription (optional for offline mode)
- **Node.js**: Version 18+ (auto-installed by SETUP.bat)

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

```bash
# Fork, clone, and create feature branch
git checkout -b feature/amazing-feature

# Make changes and test
npm run test

# Submit pull request
```

---

## 📄 License

**GPL-3.0** - This is free and open source software. See [LICENSE](../LICENSE) file.

---

## 🙏 Credits

- **Original VoiceInk** by Pax (macOS version)
- **Google** for Gemini API
- **OpenAI** for Whisper models
- **whisper.cpp** by Georgi Gerganov
- **Electron & React** teams
- All contributors and users

---

## 📞 Support

- 📖 **Setup Guide**: [DOWNLOAD_AND_RUN.md](DOWNLOAD_AND_RUN.md)
- 🐛 **Issues**: [GitHub Issues](https://github.com/voiceink/voiceink-windows/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/voiceink/voiceink-windows/discussions)

---

## 🚀 Roadmap

### **Version 1.1** (Next Release)
- [ ] Real-time streaming transcription
- [ ] Mobile companion app
- [ ] Cloud sync between devices
- [ ] Plugin system for extensions

### **Version 1.2** (Future)
- [ ] Video transcription support
- [ ] Team collaboration features
- [ ] AI-powered editing tools
- [ ] Custom voice training

---

**Made with ❤️ for Windows users who need powerful voice transcription**

⭐ **If this helps you, please star the repo!**

🔥 **Ready to use in 2 minutes - No compilation needed!**