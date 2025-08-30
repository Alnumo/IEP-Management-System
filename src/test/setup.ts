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