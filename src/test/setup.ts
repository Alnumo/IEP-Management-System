import '@testing-library/jest-dom'

// Mock environment variables for testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock navigator for QR code scanner
Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: {
    getCurrentPosition: (success: Function) => {
      success({
        coords: {
          latitude: 24.7136,
          longitude: 46.6753,
        },
      })
    },
  },
})

// Mock crypto for QR code hashing
Object.defineProperty(window, 'crypto', {
  writable: true,
  value: {
    subtle: {
      digest: async () => new ArrayBuffer(32),
    },
  },
})

// Enhanced Supabase Client Mock for Vitest
import { vi } from 'vitest'

const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  like: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  contains: vi.fn().mockReturnThis(),
  containedBy: vi.fn().mockReturnThis(),
  rangeGt: vi.fn().mockReturnThis(),
  rangeGte: vi.fn().mockReturnThis(),
  rangeLt: vi.fn().mockReturnThis(),
  rangeLte: vi.fn().mockReturnThis(),
  rangeAdjacent: vi.fn().mockReturnThis(),
  overlaps: vi.fn().mockReturnThis(),
  textSearch: vi.fn().mockReturnThis(),
  match: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  abortSignal: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  csv: vi.fn().mockResolvedValue({ data: '', error: null }),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
  storage: {
    from: vi.fn().mockReturnThis(),
    upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
    download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
    remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    list: vi.fn().mockResolvedValue({ data: [], error: null }),
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'test-url' }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'test-public-url' } }),
  },
  channel: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  removeChannel: vi.fn(),
  removeAllChannels: vi.fn(),
  getChannels: vi.fn().mockReturnValue([]),
}

// Mock all Supabase client methods to return successful responses by default
mockSupabaseClient.from.mockImplementation(() => ({
  ...mockSupabaseClient,
  then: vi.fn().mockResolvedValue({ data: [], error: null })
}))

// Global mock for @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Mock React Router Dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
    useParams: () => ({}),
  }
})

// Mock Language Context
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'ar',
    isRTL: true,
    toggleLanguage: vi.fn(),
    setLanguage: vi.fn(),
    t: (key: string) => key,
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock Auth Context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'parent',
      parent_profile: {
        id: 'test-parent-id',
        student_id: 'test-student-id',
        preferred_language: 'ar',
      }
    },
    isLoading: false,
    isAuthenticated: true,
    role: 'parent',
    parentProfile: {
      id: 'test-parent-id',
      student_id: 'test-student-id',
      preferred_language: 'ar',
    },
    requires2FA: false,
    is2FAVerified: true,
    needs2FAVerification: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshUser: vi.fn(),
    checkPermission: vi.fn().mockReturnValue(true),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'ar',
      changeLanguage: vi.fn(),
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock HTML5 QR Code Scanner
vi.mock('html5-qrcode', () => ({
  Html5QrcodeScanner: vi.fn().mockImplementation(() => ({
    render: vi.fn(),
    clear: vi.fn(),
  })),
  Html5QrcodeSupportedFormats: {
    QR_CODE: 0,
  },
}))

// Mock jsPDF
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    text: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    getStringUnitWidth: vi.fn().mockReturnValue(10),
    internal: {
      pageSize: {
        getWidth: vi.fn().mockReturnValue(200),
        getHeight: vi.fn().mockReturnValue(300),
      },
    },
  })),
}))

// Mock URL API for file uploads
Object.defineProperty(window, 'URL', {
  writable: true,
  value: {
    createObjectURL: vi.fn().mockReturnValue('mock-object-url'),
    revokeObjectURL: vi.fn(),
  },
})

// Mock FileReader for file processing
Object.defineProperty(window, 'FileReader', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readAsDataURL: vi.fn(),
    readAsText: vi.fn(),
    result: 'mock-file-content',
  })),
})