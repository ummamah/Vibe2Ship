import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout/Layout'
import HomePage from './pages/HomePage'
import TasksPage from './pages/TasksPage'
import PlanPage from './pages/PlanPage'
import StudyPage from './pages/StudyPage'
import FocusTimerPage from './pages/FocusTimerPage'
import SchedulePage from './pages/SchedulePage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-dark-bg">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="plan" element={<PlanPage />} />
              <Route path="study" element={<StudyPage />} />
              <Route path="focus" element={<FocusTimerPage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App