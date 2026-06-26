# Frontend Setup & Implementation

## Initial Setup

### Step 1: Create React App with Vite

```powershell
cd "C:\Users\amatu\OneDrive\Documents\Personalized_AI"

# Create frontend folder
npm create vite@latest frontend -- --template react-ts

cd frontend
npm install
```

### Step 2: Install Dependencies

```powershell
# Core dependencies
npm install react-router-dom @tanstack/react-query axios socket.io-client

# UI libraries
npm install @headlessui/react @heroicons/react
npm install tailwindcss postcss autoprefixer
npm install clsx tailwind-merge

# Date handling
npm install date-fns

# Forms
npm install react-hook-form zod @hookform/resolvers

# PWA
npm install vite-plugin-pwa workbox-window -D
```

### Step 3: Configure Tailwind CSS

```powershell
npx tailwindcss init -p
```

Update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [],
}
```

### Step 4: Configure Vite for PWA

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Personal AI Assistant',
        short_name: 'AI Assistant',
        description: 'Your personal productivity and study AI',
        theme_color: '#0ea5e9',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
```

## Project Structure

```
frontend/src/
├── components/          # Reusable components
│   ├── Layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── MobileNav.tsx
│   ├── Calendar/
│   │   ├── CalendarView.tsx
│   │   └── TaskCard.tsx
│   ├── Chat/
│   │   ├── ChatInterface.tsx
│   │   ├── Message.tsx
│   │   └── FileUpload.tsx
│   ├── Dashboard/
│   │   ├── StatsCard.tsx
│   │   └── QuickActions.tsx
│   └── ui/              # Basic UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       └── Card.tsx
├── pages/               # Page components
│   ├── HomePage.tsx
│   ├── StudyPage.tsx
│   ├── SchedulePage.tsx
│   ├── AnalyticsPage.tsx
│   └── SettingsPage.tsx
├── hooks/               # Custom React hooks
│   ├── useApi.ts
│   ├── useTasks.ts
│   └── useScreenTime.ts
├── services/            # API clients
│   ├── api.ts
│   ├── tasks.ts
│   ├── study.ts
│   └── tracking.ts
├── types/               # TypeScript types
│   ├── task.ts
│   ├── study.ts
│   └── tracking.ts
├── utils/               # Utility functions
│   ├── format.ts
│   └── storage.ts
├── App.tsx
├── main.tsx
└── index.css
```

## Core Implementation

### 1. API Client (`src/services/api.ts`)

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 2. Types (`src/types/task.ts`)

```typescript
export interface Task {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  category?: string;
  reminder_enabled: boolean;
  reminder_time?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  reminder_enabled?: boolean;
  reminder_time?: string;
}

export interface TaskUpdate extends Partial<TaskCreate> {
  status?: 'pending' | 'in_progress' | 'completed';
}
```

### 3. Task Service (`src/services/tasks.ts`)

```typescript
import api from './api';
import { Task, TaskCreate, TaskUpdate } from '../types/task';

export const taskService = {
  getAll: async (filters?: { status?: string; category?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    
    const response = await api.get<Task[]>(`/api/tasks?${params}`);
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Task>(`/api/tasks/${id}`);
    return response.data;
  },

  create: async (task: TaskCreate) => {
    const response = await api.post<Task>('/api/tasks', task);
    return response.data;
  },

  update: async (id: number, updates: TaskUpdate) => {
    const response = await api.put<Task>(`/api/tasks/${id}`, updates);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/api/tasks/${id}`);
  },
};
```

### 4. Custom Hook (`src/hooks/useTasks.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../services/tasks';
import { TaskCreate, TaskUpdate } from '../types/task';

export function useTasks(filters?: { status?: string; category?: string }) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => taskService.getAll(filters),
  });
}

export function useTask(id: number) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => taskService.getById(id),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: TaskCreate) => taskService.create(task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: TaskUpdate }) =>
      taskService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => taskService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

### 5. Main App (`src/App.tsx`)

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import StudyPage from './pages/StudyPage';
import SchedulePage from './pages/SchedulePage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="study" element={<StudyPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

### 6. Layout Component (`src/components/Layout/Layout.tsx`)

```typescript
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <Sidebar open={true} onClose={() => {}} />
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}
```

### 7. Homepage (`src/pages/HomePage.tsx`)

```typescript
import { useTasks } from '../hooks/useTasks';
import StatsCard from '../components/Dashboard/StatsCard';
import TaskCard from '../components/Calendar/TaskCard';

export default function HomePage() {
  const { data: tasks, isLoading } = useTasks({ status: 'pending' });

  const stats = {
    tasksToday: tasks?.filter(t => {
      const due = new Date(t.due_date || '');
      return due.toDateString() === new Date().toDateString();
    }).length || 0,
    totalTasks: tasks?.length || 0,
    completed: 0, // Would come from analytics
    screenTime: '2h 34m', // Would come from tracking
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">
        Welcome Back!
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Tasks Today"
          value={stats.tasksToday}
          icon="📅"
          trend="+2 from yesterday"
        />
        <StatsCard
          title="Pending Tasks"
          value={stats.totalTasks}
          icon="✓"
          trend="3 urgent"
        />
        <StatsCard
          title="Completed This Week"
          value={stats.completed}
          icon="🎯"
          trend="+12%"
        />
        <StatsCard
          title="Screen Time Today"
          value={stats.screenTime}
          icon="⏱️"
          trend="-30 min vs avg"
        />
      </div>

      {/* Upcoming Tasks */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Upcoming Tasks</h2>
        
        {isLoading ? (
          <div>Loading...</div>
        ) : tasks && tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.slice(0, 5).map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No pending tasks! 🎉</p>
        )}
      </div>
    </div>
  );
}
```

Continue to [BROWSER_EXTENSION.md](BROWSER_EXTENSION.md) for screen time tracker implementation...
