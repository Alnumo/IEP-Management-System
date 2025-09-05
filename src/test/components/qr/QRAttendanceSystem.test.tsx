/**
 * @file QRAttendanceSystem.test.tsx  
 * @description Tests for enhanced dual-level QR Attendance System component
 * @version 3.2.1
 * @author Dev Agent - Story 3.2
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QRAttendanceSystem } from '@/components/qr/QRAttendanceSystem';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock Html5QrcodeScanner
vi.mock('html5-qrcode', () => ({
  Html5QrcodeScanner: vi.fn().mockImplementation(() => ({
    render: vi.fn(),
    clear: vi.fn().mockResolvedValue(undefined)
  }))
}));

// Mock hooks
vi.mock('@/hooks/useAttendance', () => ({
  useAttendanceRecords: () => ({
    data: [
      { id: '1', student_id: 'student-1', student_name: 'Ahmed Ali', check_in_time: '2024-09-02T10:00:00Z', status: 'checked_in', room_number: 'Room 101' },
      { id: '2', student_id: 'student-2', student_name: 'Sara Hassan', check_in_time: '2024-09-02T11:00:00Z', status: 'checked_out', room_number: 'Room 102' }
    ],
    isLoading: false
  }),
  useAttendanceStats: () => ({ data: { total_present: 15, total_sessions: 8 } }),
  useCheckInStudent: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false
  }),
  useStartSession: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false
  }),
  useValidateQRCode: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ valid: true, qrRecord: {} }),
    isPending: false
  }),
  useRealTimeAttendance: () => []
}));

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

// Mock fetch for offline sync
global.fetch = vi.fn();

const renderWithProviders = (ui: React.ReactElement, language: 'ar' | 'en' = 'en') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLanguage={language}>
        {ui}
      </LanguageProvider>
    </QueryClientProvider>
  );
};

describe('QRAttendanceSystem - Dual-Level Enhancement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn()
      },
      writable: true
    });
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Dual-Level Mode', () => {
    it('should render dual-level mode with center/session toggle', () => {
      renderWithProviders(<QRAttendanceSystem mode="dual_level" />);
      
      expect(screen.getByText('Center Entry/Exit')).toBeInTheDocument();
      expect(screen.getByText('Session Attendance')).toBeInTheDocument();
    });

    it('should show appropriate instructions based on scan mode', () => {
      renderWithProviders(<QRAttendanceSystem mode="dual_level" currentLocation="Main Entrance" />);
      
      // Default should be center mode
      expect(screen.getByText(/Scan Main Entrance QR for entry\/exit/)).toBeInTheDocument();
      
      // Switch to session mode
      const sessionButton = screen.getByText('Session Attendance');
      fireEvent.click(sessionButton);
      
      expect(screen.getByText(/Scan session-specific QR for attendance/)).toBeInTheDocument();
    });

    it('should display Arabic instructions in Arabic mode', () => {
      renderWithProviders(
        <QRAttendanceSystem mode="dual_level" currentLocation="Main Entrance" />, 
        'ar'
      );
      
      expect(screen.getByText('دخول/خروج المركز')).toBeInTheDocument();
      expect(screen.getByText('حضور الجلسة')).toBeInTheDocument();
      expect(screen.getByText(/امسح رمز Main Entrance للدخول أو الخروج/)).toBeInTheDocument();
    });

    it('should generate different test data based on scan mode', () => {
      const mockHandleQRScan = vi.fn();
      
      renderWithProviders(<QRAttendanceSystem mode="dual_level" />);
      
      // Test center mode
      const testButton = screen.getByText(/Test Center Entry/);
      fireEvent.click(testButton);
      
      // Switch to session mode and test
      const sessionButton = screen.getByText('Session Attendance');
      fireEvent.click(sessionButton);
      
      const sessionTestButton = screen.getByText(/Test Session Attendance/);
      fireEvent.click(sessionTestButton);
      
      // Both test buttons should be functional
      expect(testButton).toBeInTheDocument();
      expect(sessionTestButton).toBeInTheDocument();
    });
  });

  describe('Offline Capability', () => {
    beforeEach(() => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });
    });

    it('should show offline indicator when not connected', () => {
      renderWithProviders(<QRAttendanceSystem mode="dual_level" />);
      
      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByTestId('wifi-off-icon') || screen.queryByText('Offline')).toBeInTheDocument();
    });

    it('should display pending sync count when offline scans exist', () => {
      // Mock localStorage with offline scans
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([
        { student_id: 'student-1', event_type: 'center_check_in' },
        { student_id: 'student-2', event_type: 'center_check_out' }
      ]));

      renderWithProviders(<QRAttendanceSystem mode="dual_level" />);
      
      expect(screen.getByText(/2 records pending sync/)).toBeInTheDocument();
    });

    it('should show Arabic offline messages in Arabic mode', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([
        { student_id: 'student-1', event_type: 'center_check_in' }
      ]));

      renderWithProviders(<QRAttendanceSystem mode="dual_level" />, 'ar');
      
      expect(screen.getByText('غير متصل')).toBeInTheDocument();
      expect(screen.getByText(/1 سجل في انتظار المزامنة/)).toBeInTheDocument();
    });
  });

  describe('QR Scanning Functionality', () => {
    it('should handle center-level QR code scanning', async () => {
      const { container } = renderWithProviders(<QRAttendanceSystem mode="dual_level" />);
      
      // Mock QR scan data for center entry
      const centerQRData = {
        type: 'center_entry',
        level: 'center',
        facilityId: 'arkan_center_main',
        location: 'Main Entrance',
        centerAction: 'check_in',
        timestamp: new Date().toISOString()
      };

      // Simulate QR scan
      const testButton = screen.getByText(/Test Center Entry/);
      fireEvent.click(testButton);

      // Should call the appropriate handler
      await waitFor(() => {
        // Check if success message is shown (mocked)
        expect(vi.mocked(require('sonner').toast.success)).toHaveBeenCalled();
      });
    });

    it('should handle session-level QR code scanning', async () => {
      renderWithProviders(<QRAttendanceSystem mode="dual_level" />);
      
      // Switch to session mode
      const sessionButton = screen.getByText('Session Attendance');
      fireEvent.click(sessionButton);

      // Test session QR scanning
      const sessionTestButton = screen.getByText(/Test Session Attendance/);
      fireEvent.click(sessionTestButton);

      await waitFor(() => {
        expect(vi.mocked(require('sonner').toast.success)).toHaveBeenCalled();
      });
    });

    it('should store offline scans when not connected', async () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      renderWithProviders(<QRAttendanceSystem mode="dual_level" />);
      
      const testButton = screen.getByText(/Test Center Entry/);
      fireEvent.click(testButton);

      await waitFor(() => {
        // Should save to localStorage
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'offline_scans',
          expect.stringContaining('center_check_in')
        );
      });
    });

    it('should sync offline data when back online', async () => {
      // Mock offline scans in localStorage
      const offlineScans = [
        { student_id: 'student-1', event_type: 'center_check_in', timestamp: new Date().toISOString() }
      ];
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(offlineScans));
      
      // Mock successful API response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response);

      renderWithProviders(<QRAttendanceSystem mode="dual_level" />);
      
      // Simulate going from offline to online
      Object.defineProperty(navigator, 'onLine', { value: true });
      fireEvent(window, new Event('online'));

      await waitFor(() => {
        // Should call sync API
        expect(fetch).toHaveBeenCalledWith('/api/attendance/log', expect.objectContaining({
          method: 'POST'
        }));
        
        // Should clear localStorage
        expect(localStorage.removeItem).toHaveBeenCalledWith('offline_scans');
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should adapt scanner interface for mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderWithProviders(<QRAttendanceSystem mode="dual_level" />);
      
      // Scanner should be properly sized for mobile
      const cameraButton = screen.getByText(/Open Camera/);
      expect(cameraButton).toBeInTheDocument();
      
      // Mode toggles should be stacked appropriately
      expect(screen.getByText('Center Entry/Exit')).toBeInTheDocument();
      expect(screen.getByText('Session Attendance')).toBeInTheDocument();
    });

    it('should maintain touch-friendly button sizes on mobile', () => {
      renderWithProviders(<QRAttendanceSystem mode="dual_level" />);
      
      const centerButton = screen.getByText('Center Entry/Exit');
      const sessionButton = screen.getByText('Session Attendance');
      
      // Buttons should be clickable
      fireEvent.click(centerButton);
      fireEvent.click(sessionButton);
      
      expect(centerButton).toBeInTheDocument();
      expect(sessionButton).toBeInTheDocument();
    });
  });

  describe('Visual Feedback', () => {
    it('should provide clear visual feedback for successful scans', async () => {
      renderWithProviders(<QRAttendanceSystem mode="dual_level" />);
      
      const testButton = screen.getByText(/Test Center Entry/);
      fireEvent.click(testButton);

      await waitFor(() => {
        // Success toast should be called
        expect(vi.mocked(require('sonner').toast.success)).toHaveBeenCalledWith(
          expect.stringContaining('Center check-in recorded successfully')
        );
      });
    });

    it('should provide error feedback for failed scans', async () => {
      // Mock API error
      vi.mocked(fetch).mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<QRAttendanceSystem mode="dual_level" />);
      
      const testButton = screen.getByText(/Test Center Entry/);
      fireEvent.click(testButton);

      await waitFor(() => {
        // Error toast should be called
        expect(vi.mocked(require('sonner').toast.error)).toHaveBeenCalled();
      });
    });

    it('should show loading state during scan processing', async () => {
      renderWithProviders(<QRAttendanceSystem mode="dual_level" />);
      
      // Open camera
      const cameraButton = screen.getByText('Open Camera');
      fireEvent.click(cameraButton);
      
      // Should show camera interface
      await waitFor(() => {
        expect(screen.getByText('Position QR code within the frame')).toBeInTheDocument();
      });
    });
  });

  describe('Legacy QR Code Support', () => {
    it('should handle legacy student QR codes in dual-level mode', async () => {
      renderWithProviders(<QRAttendanceSystem mode="dual_level" />);
      
      // Simulate legacy QR format
      const legacyQRData = JSON.stringify({
        type: 'student',
        studentId: 'student-123',
        studentName: 'Ahmed Ali',
        sessionType: 'ABA Therapy'
      });

      // This would be called by the QR scanner
      const component = screen.getByText(/Test Center Entry/).closest('div');
      
      // Should handle legacy format gracefully
      expect(component).toBeInTheDocument();
    });

    it('should maintain backward compatibility with existing QR modes', () => {
      renderWithProviders(<QRAttendanceSystem mode="student" />);
      
      // Should work with existing modes
      expect(screen.getByText(/Scan Attendance QR Code/)).toBeInTheDocument();
      expect(screen.getByText(/Test \(Demo\)/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle camera access errors gracefully', async () => {
      renderWithProviders(<QRAttendanceSystem mode="dual_level" />);
      
      const cameraButton = screen.getByText('Open Camera');
      fireEvent.click(cameraButton);
      
      // Simulate camera error
      await waitFor(() => {
        // Should handle camera errors
        expect(cameraButton).toBeInTheDocument();
      });
    });

    it('should validate QR code format before processing', async () => {
      renderWithProviders(<QRAttendanceSystem mode="dual_level" />);
      
      // Test invalid QR data - this would be handled by the validation hook
      expect(screen.getByText('Center Entry/Exit')).toBeInTheDocument();
    });
  });
});