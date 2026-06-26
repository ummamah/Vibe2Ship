# System Architecture & Data Flow

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT DEVICES                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  💻 Desktop/Laptop          📱 Mobile Phone                 │
│  ├─ Chrome Browser          ├─ Safari/Chrome               │
│  ├─ PWA App                 ├─ PWA App (installed)         │
│  └─ Browser Extension       └─ Push Notifications          │
│                                                              │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP/WebSocket
                 │ (WiFi Network: 192.168.x.x)
                 │
┌────────────────▼────────────────────────────────────────────┐
│                    YOUR LAPTOP                               │
│                 (Windows Machine)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  FRONTEND (Port 3000)                                 │  │
│  │  ========================================             │  │
│  │  React + TypeScript + Vite                           │  │
│  │  ├─ Pages (Home, Study, Schedule, Analytics)         │  │
│  │  ├─ Components (Chat, Calendar, Dashboard)           │  │
│  │  ├─ State Management (React Query)                   │  │
│  │  └─ PWA (Service Workers, Offline Support)           │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │ REST API + WebSocket              │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │  BACKEND (Port 8000)                                  │  │
│  │  ========================================             │  │
│  │  FastAPI + Python                                     │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  API LAYER                                    │   │  │
│  │  │  /api/tasks      - Task management           │   │  │
│  │  │  /api/schedule   - Goal-based scheduling     │   │  │
│  │  │  /api/study      - File upload & RAG chat    │   │  │
│  │  │  /api/tracking   - Screen time data          │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  SERVICES LAYER                               │   │  │
│  │  │                                                │   │  │
│  │  │  ┌──────────────┐  ┌──────────────┐         │   │  │
│  │  │  │  LLM Service │  │  RAG Service │         │   │  │
│  │  │  │              │  │              │         │   │  │
│  │  │  │ • OpenRouter│  │ • ChromaDB   │         │   │  │
│  │  │  │ • Groq API  │  │ • Embeddings │         │   │  │
│  │  │  │ • Prompts   │  │ • Similarity │         │   │  │
│  │  │  └──────┬───────┘  └──────┬───────┘         │   │  │
│  │  │         │                  │                  │   │  │
│  │  │  ┌──────▼──────────────────▼─────┐          │   │  │
│  │  │  │   File Processor               │          │   │  │
│  │  │  │   • PDF extraction             │          │   │  │
│  │  │  │   • DOCX parsing               │          │   │  │
│  │  │  │   • Text chunking              │          │   │  │
│  │  │  └────────────────────────────────┘          │   │  │
│  │  │                                                │   │  │
│  │  │  ┌────────────────────────────────┐          │   │  │
│  │  │  │   Background Scheduler          │          │   │  │
│  │  │  │   • Check reminders (1 min)     │          │   │  │
│  │  │  │   • Screen time check (30 min)  │          │   │  │
│  │  │  │   • Notifications               │          │   │  │
│  │  │  └────────────────────────────────┘          │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  DATA LAYER                                   │   │  │
│  │  │                                                │   │  │
│  │  │  ┌──────────────┐  ┌──────────────┐         │   │  │
│  │  │  │   SQLite DB  │  │  ChromaDB    │         │   │  │
│  │  │  │              │  │   (Vectors)  │         │   │  │
│  │  │  │ • Tasks      │  │              │         │   │  │
│  │  │  │ • Schedules  │  │ • Documents  │         │   │  │
│  │  │  │ • Screen time│  │ • Embeddings│         │   │  │
│  │  │  │ • Settings   │  │ • Metadata   │         │   │  │
│  │  │  └──────────────┘  └──────────────┘         │   │  │
│  │  │                                                │   │  │
│  │  │  ┌────────────────────────────────┐          │   │  │
│  │  │  │   File Storage                  │          │   │  │
│  │  │  │   data/uploads/                 │          │   │  │
│  │  │  │   ├─ math/                      │          │   │  │
│  │  │  │   ├─ physics/                   │          │   │  │
│  │  │  │   └─ programming/               │          │   │  │
│  │  │  └────────────────────────────────┘          │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS (Optional)
                         ▼
            ┌───────────────────────────┐
            │    Cloud LLM APIs          │
            │    (External Services)     │
            ├───────────────────────────┤
            │  • OpenRouter.ai (Free)    │
            │  • Groq.com (Free)         │
            │                            │
            │  Sends: Prompts + Context  │
            │  Returns: AI Responses     │
            └───────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Study AI - RAG (Retrieval Augmented Generation)

```
USER UPLOADS FILE
│
├─► Frontend: File Upload Component
    │
    ├─► POST /api/study/upload
        │
        └─► Backend receives file
            │
            ├─► File Processor extracts text
            │   ├─ PDF: PyPDF2
            │   ├─ DOCX: python-docx
            │   └─ TXT: direct read
            │
            ├─► Text Chunker splits into ~800 char pieces
            │   ["chunk 1...", "chunk 2...", ...]
            │
            ├─► ChromaDB creates embeddings (vectors)
            │   [0.234, 0.567, ...] for each chunk
            │
            └─► Store in vector database with metadata
                {text, source_file, page_number, folder_id}

USER ASKS QUESTION
│
├─► Frontend: Chat Interface
    │
    ├─► POST /api/study/chat
        │   {folder_id: "math", message: "Explain derivatives"}
        │
        └─► Backend RAG Service
            │
            ├─► Convert question to vector embedding
            │   "Explain derivatives" → [0.123, 0.789, ...]
            │
            ├─► ChromaDB similarity search
            │   Find top 5 most similar chunks in "math" folder
            │   Returns: [{text, score, metadata}, ...]
            │
            ├─► Build context from retrieved chunks
            │   context = "From textbook.pdf page 5:\n[chunk1]\n\n
            │              From notes.pdf page 2:\n[chunk2]..."
            │
            ├─► Send to LLM Service
            │   Prompt: "Context: {context}\n\nQuestion: {question}"
            │   │
            │   ├─► POST to OpenRouter/Groq API
            │   │
            │   └─► Receive AI response
            │
            └─► Return to frontend
                {response: "A derivative is...", sources: [...]}
```

### 2. Goal-Based Scheduling

```
USER SETS GOAL
│
├─► Frontend: "Learn React in 2 months"
    │
    ├─► POST /api/schedule/generate
        │   {
        │     goal: "Learn React",
        │     deadline: "2024-05-01",
        │     hours_per_day: 2
        │   }
        │
        └─► Backend Schedule Service
            │
            ├─► Build AI prompt
            │   "Break down this goal into weekly milestones
            │    and daily tasks, considering 2 hours/day..."
            │
            ├─► Send to LLM Service
            │   │
            │   └─► Returns structured JSON:
            │       {
            │         milestones: [
            │           {week: 1, title: "React Basics", tasks: [...]},
            │           {week: 2, title: "Components", tasks: [...]}
            │         ]
            │       }
            │
            ├─► Create Task records in database
            │   For each task: INSERT INTO tasks (...)
            │
            ├─► Schedule reminders
            │   APScheduler adds jobs for each task
            │
            └─► Return to frontend
                Display calendar with all tasks
```

### 3. Screen Time Tracking

```
BROWSER EXTENSION TRACKS TIME
│
├─► background.js monitors active tab
    │   Every tab change:
    │   ├─ Save previous tab time
    │   ├─ Start timer for new tab
    │   └─ Store in chrome.storage.local
    │
    ├─► Every 5 minutes: Sync to backend
        │
        ├─► POST /api/tracking/screentime
            │   [
            │     {url: "youtube.com", duration: 1200, timestamp: "..."},
            │     {url: "github.com", duration: 900, timestamp: "..."}
            │   ]
            │
            └─► Backend stores in SQLite
                │
                ├─► Check if over daily limit (2 hours)
                │   │
                │   └─► If yes: Send notification
                │
                └─► Calculate statistics
                    ├─ Total time today
                    ├─ Time per domain
                    └─ Time per hour of day

FRONTEND DISPLAYS ANALYTICS
│
├─► GET /api/tracking/screentime/stats?days=7
    │
    └─► Backend calculates:
        {
          total_time: 72000,  // 20 hours
          by_domain: {
            "youtube.com": 10800,
            "github.com": 7200
          },
          by_hour: {
            "14": 3600,
            "20": 5400
          }
        }
        │
        └─► Frontend renders charts and graphs
```

### 4. Task Management with Reminders

```
USER CREATES TASK
│
├─► POST /api/tasks
    │   {
    │     title: "Study calc homework",
    │     due_date: "2024-03-15T18:00:00",
    │     reminder_enabled: true,
    │     reminder_time: "2024-03-15T17:00:00"
    │   }
    │
    └─► Backend
        │
        ├─► INSERT into tasks table (SQLite)
        │
        ├─► If reminder_enabled:
        │   └─► APScheduler.add_job(
        │       send_notification,
        │       run_time= "2024-03-15T17:00:00"
        │   )
        │
        └─► Return task to frontend

SCHEDULER RUNS IN BACKGROUND
│
├─► Every 1 minute: check_reminders()
    │
    ├─► Query tasks with reminder_time <= now
    │   AND reminder_sent = false
    │
    ├─► For each task:
    │   ├─► Send push notification (Web Push API)
    │   ├─► Send WebSocket message to connected clients
    │   └─► UPDATE tasks SET reminder_sent = true
    │
    └─► Devices receive notification
        ├─ Desktop: Browser notification
        └─ Mobile: PWA push notification
```

---

## Technology Stack Details

### Frontend

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React 18 + TypeScript | UI components, type safety |
| **Build Tool** | Vite | Fast dev server, HMR |
| **Routing** | React Router v6 | Page navigation |
| **State** | React Query | Server state, caching |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **UI Components** | Headless UI | Accessible components |
| **Forms** | React Hook Form + Zod | Form handling, validation |
| **HTTP Client** | Axios | API requests |
| **Real-time** | Socket.io Client | Live updates |
| **PWA** | Vite PWA Plugin | Service workers, offline |

### Backend

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | FastAPI | Async web framework |
| **Server** | Uvicorn | ASGI server |
| **Database** | SQLite + SQLAlchemy | Relational data ORM |
| **Vector DB** | ChromaDB | Document embeddings |
| **LLM API** | OpenRouter/Groq | AI responses |
| **Scheduler** | APScheduler | Background tasks |
| **File Processing** | PyPDF2, python-docx | Document parsing |
| **WebSocket** | FastAPI WebSocket | Real-time communication |
| **Validation** | Pydantic | Data validation |

### Browser Extension

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Manifest** | V3 | Chrome extension config |
| **Background** | Service Worker | Tab monitoring |
| **Content Script** | JavaScript | Page-level tracking |
| **Storage** | chrome.storage.local | Data persistence |
| **UI** | HTML + CSS + JS | Popup interface |

---

## Security & Privacy Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PRIVACY LAYERS                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Layer 1: LOCAL STORAGE                                 │
│  ═══════════════════════════                            │
│  ✓ All files stored on your laptop                     │
│  ✓ SQLite database (local)                             │
│  ✓ Vector embeddings (local)                           │
│  ✓ Screen time data (local)                            │
│                                                          │
│  Layer 2: NETWORK ISOLATION                             │
│  ═══════════════════════════                            │
│  ✓ Access only via local WiFi                          │
│  ✓ No public IP exposure                               │
│  ✓ Firewall rules control access                       │
│  ✓ CORS restrictions                                    │
│                                                          │
│  Layer 3: MINIMAL CLOUD (Only for AI)                   │
│  ═══════════════════════════                            │
│  ✓ Only prompts sent to cloud LLM                      │
│  ✓ Full documents never leave your machine             │
│  ✓ Embeddings stay local                               │
│  ✓ No file uploads to cloud                            │
│                                                          │
│  Layer 4: NO TRACKING                                   │
│  ═══════════════════════════                            │
│  ✓ No analytics services                               │
│  ✓ No telemetry                                         │
│  ✓ No third-party cookies                              │
│  ✓ No data sharing                                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## File Structure Overview

```
Personalized_AI/
│
├── backend/                    # Python FastAPI server
│   ├── app/
│   │   ├── api/               # API route handlers
│   │   │   ├── tasks.py       # Task CRUD
│   │   │   ├── schedule.py    # Scheduling logic
│   │   │   ├── study.py       # File upload & RAG
│   │   │   └── tracking.py    # Screen time
│   │   ├── core/              # Core configuration
│   │   │   ├── config.py      # Environment settings
│   │   │   └── database.py    # DB connection
│   │   ├── models/            # SQLAlchemy models
│   │   ├── services/          # Business logic
│   │   │   ├── llm.py         # LLM integration
│   │   │   ├── rag.py         # RAG implementation
│   │   │   ├── scheduler.py   # Background tasks
│   │   │   └── notifications.py
│   │   └── utils/             # Helper functions
│   ├── data/                  # Local data storage
│   │   ├── app.db            # SQLite database
│   │   ├── chroma/           # Vector database
│   │   └── uploads/          # User files
│   ├── .env                   # Configuration
│   ├── requirements.txt       # Python dependencies
│   └── main.py               # Entry point
│
├── frontend/                  # React application
│   ├── public/                # Static assets
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── Layout/
│   │   │   ├── Calendar/
│   │   │   ├── Chat/
│   │   │   └── Dashboard/
│   │   ├── pages/             # Page components
│   │   ├── services/          # API clients
│   │   ├── hooks/             # Custom React hooks
│   │   ├── types/             # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── browser-extension/         # Chrome extension
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   └── popup/
│       ├── popup.html
│       ├── popup.js
│       └── popup.css
│
├── docs/                      # Documentation
│   ├── QUICKSTART.md
│   ├── SETUP.md
│   ├── API_IMPLEMENTATION.md
│   ├── SERVICES.md
│   ├── FRONTEND_SETUP.md
│   ├── BROWSER_EXTENSION.md
│   ├── DEPLOYMENT.md
│   ├── IMPLEMENTATION_ROADMAP.md
│   └── ARCHITECTURE.md (this file)
│
└── README.md                  # Project overview
```

---

## Scaling Considerations

### Current Setup (Personal Use)
- ✓ 1 user (you)
- ✓ Local laptop hosting
- ✓ WiFi network access
- ✓ Free tier APIs
- **Handles**: ~1000 documents, ~10000 tasks, unlimited screen time tracking

### Future Scaling Options

**More Users** (family members):
- Add authentication (JWT tokens)
- Multi-user database schema
- User-specific folders and data
- Still can run on same laptop

**More Performance**:
- Upgrade to PostgreSQL (from SQLite)
- Add Redis for caching
- Use better LLM models (paid tiers)
- Dedicated server/VPS

**More Features**:
- Mobile native apps (React Native)
- Voice input/output
- Image recognition for documents
- Calendar integrations (Google, Outlook)
- Email parsing and management

---

**Next**: Start building with [QUICKSTART.md](QUICKSTART.md)!
