# Complete Quick Start Guide

Get your Personal AI Assistant up and running in 30 minutes!

## 📋 Prerequisites Checklist

Before you start, make sure you have:

- [ ] **Python 3.11+** installed ([download](https://www.python.org/downloads/))
- [ ] **Node.js 18+** installed ([download](https://nodejs.org/))
- [ ] **Git** installed ([download](https://git-scm.com/))
- [ ] **LLM API Key** from [OpenRouter](https://openrouter.ai/) OR [Groq](https://groq.com/) (both free!)
- [ ] **Code editor** (VS Code recommended)
- [ ] **At least 8GB RAM** (16GB recommended for better LLM performance)

---

## 🚀 Installation (Step-by-Step)

### Step 1: Get an API Key (5 minutes)

**Option A: OpenRouter (Recommended)** - More model options
1. Go to [https://openrouter.ai/](https://openrouter.ai/)
2. Click "Sign In" (use Google/GitHub)
3. Go to Settings → Keys
4. Click "Create Key"
5. Copy your API key (starts with `sk-or-...`)

**Option B: Groq** - Faster inference
1. Go to [https://groq.com/](https://console.groq.com/)
2. Sign up for free account
3. Navigate to API Keys
4. Create new key
5. Copy your API key

---

### Step 2: Set Up Backend (10 minutes)

Open PowerShell and run:

```powershell
# Navigate to your project
cd "C:\Users\amatu\OneDrive\Documents\Personalized_AI"

# Create backend structure
New-Item -ItemType Directory -Force -Path backend\app\api
New-Item -ItemType Directory -Force -Path backend\app\core
New-Item -ItemType Directory -Force -Path backend\app\models
New-Item -ItemType Directory -Force -Path backend\app\services
New-Item -ItemType Directory -Force -Path backend\app\utils
New-Item -ItemType Directory -Force -Path backend\data\uploads
New-Item -ItemType Directory -Force -Path backend\data\chroma

# Create Python virtual environment
cd backend
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1
# If you get an error, run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Create requirements.txt
@"
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6
python-dotenv==1.0.1
sqlalchemy==2.0.25
aiosqlite==0.19.0
pydantic==2.5.3
pydantic-settings==2.1.0
chromadb==0.4.22
openai==1.10.0
httpx==0.26.0
apscheduler==3.10.4
websockets==12.0
pypdf2==3.0.1
python-docx==1.1.0
python-magic-bin==0.4.14
markdown==3.5.2
beautifulsoup4==4.12.3
aiofiles==23.2.1
"@ | Out-File -FilePath requirements.txt -Encoding UTF8

# Install dependencies (this takes a few minutes)
pip install -r requirements.txt
```

**Create `.env` file:**

```powershell
# Still in backend folder
@"
HOST=0.0.0.0
PORT=8000
DATABASE_URL=sqlite+aiosqlite:///./data/app.db

# IMPORTANT: Replace with YOUR API key!
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-YOUR-KEY-HERE
LLM_MODEL=meta-llama/llama-3.1-8b-instruct:free

# If using Groq instead, use:
# LLM_PROVIDER=groq
# GROQ_API_KEY=your-groq-key-here
# LLM_MODEL=llama-3.1-8b-instant

CHROMA_PERSIST_DIR=./data/chroma
MAX_UPLOAD_SIZE=10485760
ALLOWED_EXTENSIONS=pdf,docx,txt,md
SCHEDULER_ENABLED=true
TIMEZONE=UTC
PUSH_NOTIFICATIONS_ENABLED=true
SCREEN_TIME_CHECK_INTERVAL=300
SCREEN_TIME_WARNING_THRESHOLD=7200
SECRET_KEY=change-this-to-random-string-in-production
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
"@ | Out-File -FilePath .env -Encoding UTF8
```

⚠️ **IMPORTANT**: Edit `.env` and replace `YOUR-KEY-HERE` with your actual API key!

**Copy code files** from the documentation:
- Copy all code from `docs/API_IMPLEMENTATION.md` into appropriate files
- Copy all code from `docs/SERVICES.md` into appropriate files
- See the detailed file structure in the documentation

---

### Step 3: Set Up Frontend (10 minutes)

Open a NEW PowerShell window:

```powershell
cd "C:\Users\amatu\OneDrive\Documents\Personalized_AI"

# Create React app with Vite
npm create vite@latest frontend -- --template react-ts

cd frontend

# Install dependencies
npm install react-router-dom @tanstack/react-query axios socket.io-client
npm install @headlessui/react @heroicons/react
npm install clsx tailwind-merge date-fns
npm install react-hook-form zod @hookform/resolvers
npm install vite-plugin-pwa workbox-window -D

# Set up Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Configure Tailwind CSS:**

Edit `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Edit `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Copy frontend code** from `docs/FRONTEND_SETUP.md`

**Create `.env`:**
```powershell
@"
VITE_API_URL=http://localhost:8000
"@ | Out-File -FilePath .env -Encoding UTF8
```

---

### Step 4: Set Up Browser Extension (5 minutes)

```powershell
cd "C:\Users\amatu\OneDrive\Documents\Personalized_AI"

# Create extension folder
New-Item -ItemType Directory -Force -Path browser-extension\popup
New-Item -ItemType Directory -Force -Path browser-extension\icons
```

**Copy all files** from `docs/BROWSER_EXTENSION.md`

**Create simple icons** (or use any 16x16, 48x48, 128x128 PNG images):
- Place icon files in `browser-extension/icons/`
- Name them: `icon16.png`, `icon48.png`, `icon128.png`

**Load in Chrome:**
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select `C:\Users\amatu\OneDrive\Documents\Personalized_AI\browser-extension`

---

## ▶️ Running the Application

### Start Backend

```powershell
# Terminal 1
cd "C:\Users\amatu\OneDrive\Documents\Personalized_AI\backend"
.\venv\Scripts\Activate.ps1
python main.py
```

You should see:
```
✓ Database initialized
✓ Scheduler started
🚀 Server started on http://0.0.0.0:8000
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Start Frontend

```powershell
# Terminal 2 (new window)
cd "C:\Users\amatu\OneDrive\Documents\Personalized_AI\frontend"
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

### Access the App

1. Open browser: `http://localhost:3000`
2. You should see your AI Assistant!

---

## ✅ Verify Everything Works

### Test 1: Backend API
Open browser to `http://localhost:8000` - should show:
```json
{
  "message": "Personal AI Assistant API",
  "version": "1.0.0",
  "status": "running"
}
```

### Test 2: Create a Task
1. Go to `http://localhost:3000`
2. Try creating a task
3. Should appear in your task list

### Test 3: Upload a Document
1. Go to Study section
2. Create a folder (e.g., "Math")
3. Upload a PDF or text file
4. Ask a question about the document
5. Should get AI response based on your document!

### Test 4: Browser Extension
1. Click extension icon in Chrome toolbar
2. Should see screen time stats
3. Browse some websites
4. Check stats updating

---

## 📱 Access from Phone (Same WiFi)

### Find Your Computer's IP

```powershell
ipconfig | Select-String IPv4
```

Look for something like `192.168.1.100`

### Update Configuration

1. **Edit `backend/.env`:**
   ```env
   CORS_ORIGINS=http://localhost:3000,http://192.168.1.100:3000
   ```

2. **Edit `frontend/.env`:**
   ```env
   VITE_API_URL=http://192.168.1.100:8000
   ```

3. **Edit `frontend/vite.config.ts`:**
   ```typescript
   server: {
     host: '0.0.0.0',  // Add this line
     port: 3000,
     // ...
   }
   ```

### Allow Firewall

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Personal AI Backend" -Direction Inbound -Port 8000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Personal AI Frontend" -Direction Inbound -Port 3000 -Protocol TCP -Action Allow
```

### Restart Services

Stop (Ctrl+C) and restart both backend and frontend.

### Access from Phone

1. Make sure phone is on SAME WiFi
2. Open browser on phone
3. Go to: `http://192.168.1.100:3000` (use YOUR IP)
4. Should work!

### Install as App on Phone

**iPhone:**
- Safari → Share → Add to Home Screen

**Android:**
- Chrome → Menu → Add to Home Screen

---

## 🎯 Next Steps

Now that everything is running, you can:

1. **Upload study materials**
   - Create folders for different subjects
   - Upload PDFs, Word docs, notes
   - Chat with your documents

2. **Set goals and schedules**
   - Create long-term goals
   - Let AI generate schedules
   - Get automatic reminders

3. **Track productivity**
   - Monitor screen time
   - View weekly reports
   - Set usage limits

4. **Customize settings**
   - Adjust notification preferences
   - Set screen time thresholds
   - Choose preferred study folders

---

## 🐛 Common Issues

### "Module not found" errors
```powershell
# Make sure virtual environment is activated
.\venv\Scripts\Activate.ps1

# Reinstall dependencies
pip install -r requirements.txt
```

### "Port already in use"
```powershell
# Kill process on port 8000
netstat -ano | findstr :8000
# Note the PID, then:
taskkill /PID <PID> /F
```

### "API key invalid"
- Double-check your API key in `backend/.env`
- Make sure there are no quotes around it
- Verify it's the right key for your provider (OpenRouter vs Groq)

### Can't access from phone
1. Verify both devices on same WiFi
2. Check firewall rules
3. Verify IP address is correct
4. Try `http://IP:8000/health` first to test backend

---

## 📚 Documentation Reference

- **[Setup Details](SETUP.md)** - Complete installation guide
- **[API Implementation](API_IMPLEMENTATION.md)** - Backend code
- **[Services](SERVICES.md)** - LLM and RAG services
- **[Frontend](FRONTEND_SETUP.md)** - React app setup
- **[Browser Extension](BROWSER_EXTENSION.md)** - Screen time tracker
- **[Deployment](DEPLOYMENT.md)** - Network and cloud deployment
- **[Architecture Overview](README.md)** - System design

---

## 💡 Tips

- **Start with one subject**: Upload a few PDFs from one subject first to test
- **Set realistic goals**: Start with small, achievable objectives
- **Check screen time**: Review your usage patterns weekly
- **Backup your data**: Copy `backend/data/` folder regularly
- **Update regularly**: Pull latest code and update dependencies

---

## 🎉 You're All Set!

Your personal AI assistant is now running! It will:
- ✅ Help you study with your own materials
- ✅ Manage your schedule and reminders
- ✅ Track your screen time
- ✅ Work on your laptop and phone
- ✅ Keep all data private and local
- ✅ Cost you $0/month (on free tiers)

Enjoy your new AI-powered productivity system! 🚀
