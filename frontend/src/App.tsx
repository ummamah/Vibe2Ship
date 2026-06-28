import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard'
import TasksPage from './pages/TasksPage'
import PlanPage from './pages/PlanPage'
import StudyPage from './pages/StudyPage'
import StudyFoldersPage from './pages/StudyFoldersPage'
import StudyCollectionPage from './pages/StudyCollectionPage'
import FocusTimerPage from './pages/FocusTimerPage'
import SchedulePage from './pages/SchedulePage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import NotificationProvider from './components/Notifications/NotificationProvider'
import SlideInNotification from './components/Notifications/SlideInNotification'
import { taskService } from './services/taskService'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

function CleanupRunner() {
  useEffect(() => {
    taskService.cleanupTasks().catch(err => 
      console.log('Cleanup failed (non-critical):', err.message)
    )
  }, [])
  return null
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-dark-bg">
            <CleanupRunner />
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="plan" element={<PlanPage />} />
                <Route path="study" element={<StudyFoldersPage />} />
                <Route path="study/:collectionId" element={<StudyCollectionPage />} />
                <Route path="focus" element={<FocusTimerPage />} />
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
            <SlideInNotification />
          </div>
        </BrowserRouter>
      </NotificationProvider>
    </QueryClientProvider>
  )
}

export default App