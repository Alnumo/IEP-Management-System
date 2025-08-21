import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router } from 'react-router-dom'
import { Toaster } from 'sonner'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AppRoutes } from './routes'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <Router>
          <div className="min-h-screen bg-background font-arabic">
            <AppRoutes />
            <Toaster richColors position="top-right" />
          </div>
        </Router>
      </LanguageProvider>
    </QueryClientProvider>
  )
}

export default App