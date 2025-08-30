import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router } from 'react-router-dom'
import { Toaster } from 'sonner'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AppRoutes } from './routes'
import { logConfigurationStatus } from './lib/env-validation'
import ErrorBoundary from '@/components/error/ErrorBoundary'
import { errorMonitoring } from '@/lib/error-monitoring'

// Validate environment configuration on app startup
logConfigurationStatus()

// Enhanced QueryClient with error handling and retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      retry: (failureCount, error) => {
        // Custom retry logic
        if (failureCount >= 3) return false
        
        // Don't retry on auth errors
        if (error.message.includes('Authentication')) return false
        if (error.message.includes('Unauthorized')) return false
        
        // Retry on network/server errors
        return error.message.includes('Network') || 
               error.message.includes('fetch') ||
               error.message.includes('500') ||
               error.message.includes('502') ||
               error.message.includes('503')
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error) => {
        // More conservative retry for mutations
        if (failureCount >= 2) return false
        return error.message.includes('Network') || error.message.includes('timeout')
      },
      onError: (error) => {
        errorMonitoring.reportError(error as Error, {
          component: 'Mutation',
          action: 'mutation_error'
        })
      }
    }
  },
  queryCache: undefined, // Will use default
  mutationCache: undefined // Will use default
})

// Set up global error reporting
queryClient.getQueryCache().config.onError = (error) => {
  errorMonitoring.reportError(error as Error, {
    component: 'Query',
    action: 'query_error'
  })
}

function App() {
  return (
    <ErrorBoundary 
      level="app" 
      onError={(error, errorInfo, errorId) => {
        errorMonitoring.reportError(error, {
          component: 'App',
          action: 'app_crash',
          metadata: { errorId, componentStack: errorInfo.componentStack }
        })
      }}
    >
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <Router>
            <div className="min-h-screen bg-background font-arabic">
              <ErrorBoundary level="page">
                <AppRoutes />
              </ErrorBoundary>
              <Toaster richColors position="top-right" />
            </div>
          </Router>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App