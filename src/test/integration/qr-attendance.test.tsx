import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { QRAttendanceSystem } from '@/components/qr/QRAttendanceSystem'
import React from 'react'

// Mock the LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    language: 'en',
    isRTL: false,
  })),
  LanguageContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
    Consumer: () => null,
    displayName: 'MockLanguageContext',
  },
}))

// Mock HTML5 QR Code scanner
vi.mock('html5-qrcode', () => ({
  Html5QrcodeScanner: vi.fn().mockImplementation(() => ({
    render: vi.fn(),
    clear: vi.fn(),
  })),
}))

// Mock hooks
vi.mock('@/hooks/useAttendance', () => ({
  useAttendanceRecords: vi.fn(() => ({
    data: [
      {
        id: 'attendance-1',
        student_id: 'student-1',
        student_name: 'Ahmed Mohammed',
        check_in_time: new Date().toISOString(),
        status: 'checked_in',
      },
    ],
    isLoading: false,
  })),
  useAttendanceStats: vi.fn(() => ({
    data: {
      totalStudents: 25,
      checkedIn: 18,
      inSession: 12,
    },
  })),
  useCheckInStudent: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  })),
  useStartSession: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  })),
  useRealTimeAttendance: vi.fn(() => [
    {
      id: 'live-1',
      student_id: 'student-1',
      student_name: 'Sarah Ahmed',
      check_in_time: new Date().toISOString(),
      status: 'checked_in',
    },
  ]),
  useValidateQRCode: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ valid: true }),
  })),
}))

describe('QR Attendance System Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        component
      )
    )
  }

  it('should render QR attendance system for student mode', () => {
    renderWithProviders(
      React.createElement(QRAttendanceSystem, { mode: 'student' })
    )

    expect(screen.getByText('QR Attendance System')).toBeInTheDocument()
    expect(screen.getByText('In Session')).toBeInTheDocument()
    expect(screen.getByText('Present Today')).toBeInTheDocument()
  })

  it('should show attendance records', () => {
    renderWithProviders(
      React.createElement(QRAttendanceSystem, { mode: 'student' })
    )

    expect(screen.getByText('Ahmed Mohammed')).toBeInTheDocument()
    expect(screen.getAllByText('Checked In').length).toBeGreaterThan(0)
  })

  it('should handle QR scanner activation', async () => {
    renderWithProviders(
      React.createElement(QRAttendanceSystem, { mode: 'student' })
    )

    const scanButton = screen.getByRole('button', { name: 'Open Camera' })
    fireEvent.click(scanButton)

    await waitFor(() => {
      expect(screen.getByText('Stop Scanning')).toBeInTheDocument()
    })
  })

  it('should display appropriate content for different modes', () => {
    const { rerender } = renderWithProviders(
      React.createElement(QRAttendanceSystem, { mode: 'student' })
    )

    expect(screen.getByText('QR Attendance System')).toBeInTheDocument()

    rerender(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(QRAttendanceSystem, { mode: 'therapist' })
      )
    )

    expect(screen.getByText('QR Attendance System')).toBeInTheDocument()
  })

  it('should handle Arabic language mode', async () => {
    const { useLanguage } = await import('@/contexts/LanguageContext')
    vi.mocked(useLanguage).mockReturnValue({
      language: 'ar',
      setLanguage: vi.fn(),
      isRTL: true,
    })

    renderWithProviders(
      React.createElement(QRAttendanceSystem, { mode: 'student' })
    )

    expect(screen.getByText('نظام الحضور بالرمز المربع')).toBeInTheDocument()
  })

  it('should show offline status when disconnected', () => {
    // Override the network status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    renderWithProviders(
      React.createElement(QRAttendanceSystem, { mode: 'student' })
    )

    expect(screen.getByText('Offline')).toBeInTheDocument()
  })
})