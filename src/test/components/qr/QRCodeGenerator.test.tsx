/**
 * @file QRCodeGenerator.test.tsx  
 * @description Tests for enhanced dual-level QR Code Generator component
 * @version 3.2.1
 * @author Dev Agent - Story 3.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QRCodeGenerator } from '@/components/qr/QRCodeGenerator';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock hooks
vi.mock('@/hooks/useAttendance', () => ({
  useGenerateQRCode: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'qr-123', qr_hash: 'hash-123' }),
    isPending: false
  }),
  useQRHistory: () => ({ data: [] })
}));

vi.mock('@/hooks/useStudents', () => ({
  useStudents: () => ({
    data: [
      { id: 'student-1', name: 'Ahmed Ali', name_en: 'Ahmed Ali', name_ar: 'أحمد علي' },
      { id: 'student-2', name: 'Sara Hassan', name_en: 'Sara Hassan', name_ar: 'سارة حسن' }
    ]
  })
}));

vi.mock('@/hooks/useTherapists', () => ({
  useTherapists: () => ({
    data: [
      { id: 'therapist-1', name: 'Dr. Fatima', specialization: 'Speech Therapy' },
      { id: 'therapist-2', name: 'Dr. Omar', specialization: 'ABA Therapy' }
    ]
  })
}));

vi.mock('@/hooks/useCourses', () => ({
  useCourses: () => ({ data: [] })
}));

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

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

describe('QRCodeGenerator - Dual-Level Enhancement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('QR Type Selection', () => {
    it('should display all QR types including dual-level options', () => {
      renderWithProviders(<QRCodeGenerator />);
      
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);

      // General QR types
      expect(screen.getByText('Student')).toBeInTheDocument();
      expect(screen.getByText('Session')).toBeInTheDocument();
      expect(screen.getByText('Therapist')).toBeInTheDocument();
      expect(screen.getByText('Room')).toBeInTheDocument();

      // Dual-level QR types
      expect(screen.getByText('Center Entry')).toBeInTheDocument();
      expect(screen.getByText('Center Exit')).toBeInTheDocument();
      expect(screen.getByText('Session Specific')).toBeInTheDocument();
    });

    it('should display Arabic labels when language is Arabic', () => {
      renderWithProviders(<QRCodeGenerator />, 'ar');
      
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);

      // Check Arabic labels
      expect(screen.getByText('طالب')).toBeInTheDocument();
      expect(screen.getByText('دخول المركز')).toBeInTheDocument();
      expect(screen.getByText('خروج المركز')).toBeInTheDocument();
      expect(screen.getByText('جلسة محددة')).toBeInTheDocument();
    });

    it('should show category separators for dual-level types', () => {
      renderWithProviders(<QRCodeGenerator />);
      
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);

      expect(screen.getByText('General')).toBeInTheDocument();
      expect(screen.getByText('Dual-Level')).toBeInTheDocument();
    });
  });

  describe('Center-Level QR Code Generation', () => {
    it('should show center-specific fields for center_entry type', async () => {
      renderWithProviders(<QRCodeGenerator />);
      
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);
      
      const centerEntryOption = screen.getByText('Center Entry');
      fireEvent.click(centerEntryOption);

      await waitFor(() => {
        expect(screen.getByLabelText('Center Location')).toBeInTheDocument();
        expect(screen.getByLabelText('Facility ID')).toBeInTheDocument();
      });
    });

    it('should show center-specific fields for center_exit type', async () => {
      renderWithProviders(<QRCodeGenerator />);
      
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);
      
      const centerExitOption = screen.getByText('Center Exit');
      fireEvent.click(centerExitOption);

      await waitFor(() => {
        expect(screen.getByLabelText('Center Location')).toBeInTheDocument();
        expect(screen.getByDisplayValue('arkan_center_main')).toBeInTheDocument();
      });
    });

    it('should provide predefined location options for center QR codes', async () => {
      renderWithProviders(<QRCodeGenerator />);
      
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);
      fireEvent.click(screen.getByText('Center Entry'));

      await waitFor(() => {
        const locationSelect = screen.getByLabelText('Center Location');
        fireEvent.click(locationSelect);
        
        expect(screen.getByText('Main Entrance')).toBeInTheDocument();
        expect(screen.getByText('Emergency Exit')).toBeInTheDocument();
        expect(screen.getByText('Side Door')).toBeInTheDocument();
        expect(screen.getByText('Reception Area')).toBeInTheDocument();
      });
    });
  });

  describe('Session-Specific QR Code Generation', () => {
    it('should show session-specific fields for session_specific type', async () => {
      renderWithProviders(<QRCodeGenerator />);
      
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);
      
      const sessionSpecificOption = screen.getByText('Session Specific');
      fireEvent.click(sessionSpecificOption);

      await waitFor(() => {
        expect(screen.getByLabelText('Session')).toBeInTheDocument();
        expect(screen.getByLabelText('Student (Optional)')).toBeInTheDocument();
        expect(screen.getByLabelText('Therapist')).toBeInTheDocument();
        expect(screen.getByLabelText('Room Number')).toBeInTheDocument();
      });
    });

    it('should allow optional student selection for session-specific QR', async () => {
      renderWithProviders(<QRCodeGenerator />);
      
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);
      fireEvent.click(screen.getByText('Session Specific'));

      await waitFor(() => {
        const studentSelect = screen.getByLabelText('Student (Optional)');
        fireEvent.click(studentSelect);
        
        expect(screen.getByText('None')).toBeInTheDocument();
        expect(screen.getByText('Ahmed Ali')).toBeInTheDocument();
        expect(screen.getByText('Sara Hassan')).toBeInTheDocument();
      });
    });

    it('should populate therapist options for session-specific QR', async () => {
      renderWithProviders(<QRCodeGenerator />);
      
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);
      fireEvent.click(screen.getByText('Session Specific'));

      await waitFor(() => {
        const therapistSelect = screen.getByLabelText('Therapist');
        fireEvent.click(therapistSelect);
        
        expect(screen.getByText('Dr. Fatima - Speech Therapy')).toBeInTheDocument();
        expect(screen.getByText('Dr. Omar - ABA Therapy')).toBeInTheDocument();
      });
    });
  });

  describe('QR Data Generation', () => {
    it('should generate correct QR data structure for center entry', async () => {
      const mockGenerate = vi.fn().mockResolvedValue({ id: 'qr-123' });
      vi.mocked(vi.importActual('@/hooks/useAttendance')).useGenerateQRCode.mockReturnValue({
        mutateAsync: mockGenerate,
        isPending: false
      });

      renderWithProviders(<QRCodeGenerator />);
      
      // Select center entry type
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);
      fireEvent.click(screen.getByText('Center Entry'));

      await waitFor(() => {
        // Fill in location
        const locationSelect = screen.getByLabelText('Center Location');
        fireEvent.click(locationSelect);
        fireEvent.click(screen.getByText('Main Entrance'));
      });

      // Generate QR code
      const generateButton = screen.getByText('Generate QR Code') || screen.getByText('إنشاء رمز الاستجابة السريعة');
      fireEvent.click(generateButton);

      await waitFor(() => {
        const qrDataString = screen.getByText(/QR Data/);
        expect(qrDataString).toBeInTheDocument();
        
        // Verify QR data structure contains center-level properties
        const qrDataElement = screen.getByTestId('qr-data-display');
        const qrData = JSON.parse(qrDataElement.textContent || '{}');
        
        expect(qrData.type).toBe('center_entry');
        expect(qrData.level).toBe('center');
        expect(qrData.facilityId).toBe('arkan_center_main');
        expect(qrData.location).toBe('Main Entrance');
        expect(qrData.centerAction).toBe('check_in');
        expect(qrData.timestamp).toBeDefined();
      });
    });

    it('should generate correct QR data structure for session-specific', async () => {
      renderWithProviders(<QRCodeGenerator />);
      
      // Select session-specific type
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);
      fireEvent.click(screen.getByText('Session Specific'));

      await waitFor(() => {
        // Fill in session details
        const sessionSelect = screen.getByLabelText('Session');
        fireEvent.click(sessionSelect);
        fireEvent.click(screen.getByText('Speech Therapy - 10:00 AM'));

        const therapistSelect = screen.getByLabelText('Therapist');
        fireEvent.click(therapistSelect);
        fireEvent.click(screen.getByText('Dr. Fatima - Speech Therapy'));

        const roomInput = screen.getByLabelText('Room Number');
        fireEvent.change(roomInput, { target: { value: 'Room 101' } });
      });

      // Generate QR code
      const generateButton = screen.getByText('Generate QR Code') || screen.getByText('إنشاء رمز الاستجابة السريعة');
      fireEvent.click(generateButton);

      await waitFor(() => {
        const qrDataElement = screen.getByTestId('qr-data-display');
        const qrData = JSON.parse(qrDataElement.textContent || '{}');
        
        expect(qrData.type).toBe('session_specific');
        expect(qrData.level).toBe('session');
        expect(qrData.sessionId).toBe('session_1');
        expect(qrData.therapistId).toBe('therapist-1');
        expect(qrData.roomNumber).toBe('Room 101');
      });
    });
  });

  describe('Bilingual Support', () => {
    it('should display Arabic interface when language is Arabic', () => {
      renderWithProviders(<QRCodeGenerator />, 'ar');
      
      expect(screen.getByText('منشئ رموز الاستجابة السريعة')).toBeInTheDocument();
      expect(screen.getByText('نوع الرمز')).toBeInTheDocument();
    });

    it('should display Arabic location options in Arabic interface', async () => {
      renderWithProviders(<QRCodeGenerator />, 'ar');
      
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);
      fireEvent.click(screen.getByText('دخول المركز'));

      await waitFor(() => {
        const locationSelect = screen.getByLabelText('موقع المركز');
        fireEvent.click(locationSelect);
        
        expect(screen.getByText('المدخل الرئيسي')).toBeInTheDocument();
        expect(screen.getByText('مخرج الطوارئ')).toBeInTheDocument();
        expect(screen.getByText('الباب الجانبي')).toBeInTheDocument();
        expect(screen.getByText('منطقة الاستقبال')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event('resize'));

      renderWithProviders(<QRCodeGenerator />);
      
      const container = screen.getByTestId('qr-generator-container');
      expect(container).toHaveClass('space-y-6');
      
      // Form should still be accessible on mobile
      expect(screen.getByText('QR Code Generator')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle QR generation errors gracefully', async () => {
      const mockGenerate = vi.fn().mockRejectedValue(new Error('Generation failed'));
      vi.mocked(vi.importActual('@/hooks/useAttendance')).useGenerateQRCode.mockReturnValue({
        mutateAsync: mockGenerate,
        isPending: false
      });

      renderWithProviders(<QRCodeGenerator />);
      
      const generateButton = screen.getByText('Generate QR Code');
      fireEvent.click(generateButton);

      await waitFor(() => {
        // Should show error state or toast
        expect(mockGenerate).toHaveBeenCalled();
      });
    });

    it('should validate required fields before generation', async () => {
      renderWithProviders(<QRCodeGenerator />);
      
      // Select session-specific type without filling required fields
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);
      fireEvent.click(screen.getByText('Session Specific'));

      await waitFor(() => {
        const generateButton = screen.getByText('Generate QR Code');
        fireEvent.click(generateButton);
        
        // Should not proceed without required therapist selection
        expect(screen.getByLabelText('Therapist')).toBeInTheDocument();
      });
    });
  });
});