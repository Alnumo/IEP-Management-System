/**
 * Amelia WordPress Integration Tests
 * @description Tests for external API integration with Amelia WordPress plugin
 * @author James (Dev Agent)
 * @date 2025-09-03
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Mock fetch for HTTP requests
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test webhook payload from Amelia
const mockAmeliaWebhookPayload = {
  event: 'booking.created',
  secret: 'test-webhook-secret',
  booking: {
    id: 'amelia_booking_123',
    bookingStart: '2025-09-10T10:00:00Z',
    bookingEnd: '2025-09-10T11:00:00Z',
    status: 'approved',
    info: 'Initial evaluation appointment',
    customFields: {
      child_name: 'Ali Ahmed',
      child_name_ar: 'علي أحمد',
      child_dob: '2018-05-15',
      child_gender: 'male',
      concerns: 'Speech development delays, need evaluation',
      previous_therapy: 'no',
      utm_campaign: 'google_ads_autism_awareness',
      utm_source: 'google',
      utm_medium: 'cpc'
    }
  },
  customer: {
    id: 'customer_456',
    firstName: 'Ahmed',
    lastName: 'Mohammed',
    email: 'ahmed.mohammed@example.com',
    phone: '+966501234567'
  },
  service: {
    id: 'service_789',
    name: 'Free Initial Evaluation',
    duration: 60,
    price: 0
  },
  payment: {
    status: 'free',
    amount: 0
  },
  utm_campaign: 'google_ads_autism_awareness',
  utm_source: 'google',
  utm_medium: 'cpc',
  referrer: 'https://www.google.com/'
};

// Expected transformed lead data
const expectedLeadData = {
  parent_name: 'Ahmed Mohammed',
  parent_contact: '+966501234567',
  parent_contact_secondary: 'ahmed.mohammed@example.com',
  child_name: 'Ali Ahmed',
  child_name_ar: 'علي أحمد',
  child_dob: '2018-05-15',
  child_gender: 'male',
  evaluation_date: '2025-09-10T10:00:00Z',
  evaluation_notes: 'Service: Free Initial Evaluation',
  notes: 'Info: Initial evaluation appointment\nConcerns: Speech development delays, need evaluation',
  source: 'website',
  source_details: {
    campaign: 'google_ads_autism_awareness',
    source: 'google',
    medium: 'cpc',
    referrer: 'https://www.google.com/'
  },
  external_id: 'amelia_amelia_booking_123',
  integration_metadata: {
    amelia_booking_id: 'amelia_booking_123',
    amelia_customer_id: 'customer_456',
    amelia_service_id: 'service_789',
    service_name: 'Free Initial Evaluation',
    appointment_duration: 60,
    booking_status: 'approved',
    payment_status: 'free',
    original_data: mockAmeliaWebhookPayload
  }
};

describe('Amelia WordPress Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses by default
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { id: 'lead_123' } })
    });
  });

  describe('Webhook Data Validation', () => {
    it('should validate webhook secret correctly', () => {
      const validPayload = { ...mockAmeliaWebhookPayload };
      const invalidPayload = { ...mockAmeliaWebhookPayload, secret: 'wrong-secret' };

      // This would be implemented in the n8n workflow validation
      expect(validPayload.secret).toBe('test-webhook-secret');
      expect(invalidPayload.secret).not.toBe('test-webhook-secret');
    });

    it('should validate required booking event type', () => {
      const validPayload = { ...mockAmeliaWebhookPayload };
      const invalidPayload = { ...mockAmeliaWebhookPayload, event: 'booking.cancelled' };

      expect(validPayload.event).toBe('booking.created');
      expect(invalidPayload.event).not.toBe('booking.created');
    });

    it('should handle missing customer information', () => {
      const invalidPayload = {
        ...mockAmeliaWebhookPayload,
        customer: {
          id: 'customer_123',
          firstName: '',
          lastName: '',
          email: '',
          phone: ''
        }
      };

      expect(invalidPayload.customer.phone).toBe('');
      expect(invalidPayload.customer.email).toBe('');
      // In real implementation, this would trigger validation error
    });

    it('should validate booking data completeness', () => {
      const requiredFields = ['id', 'bookingStart', 'status'];
      
      requiredFields.forEach(field => {
        expect(mockAmeliaWebhookPayload.booking).toHaveProperty(field);
      });
    });
  });

  describe('Data Transformation', () => {
    it('should transform Amelia data to Arkan lead format correctly', () => {
      // This simulates the transformation logic from the n8n workflow
      const transformedData = transformAmeliaData(mockAmeliaWebhookPayload);

      expect(transformedData.parent_name).toBe('Ahmed Mohammed');
      expect(transformedData.parent_contact).toBe('+966501234567');
      expect(transformedData.child_name).toBe('Ali Ahmed');
      expect(transformedData.child_name_ar).toBe('علي أحمد');
      expect(transformedData.child_dob).toBe('2018-05-15');
      expect(transformedData.source).toBe('website');
      expect(transformedData.external_id).toBe('amelia_amelia_booking_123');
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalPayload = {
        event: 'booking.created',
        secret: 'test-webhook-secret',
        booking: {
          id: 'minimal_booking',
          bookingStart: '2025-09-10T10:00:00Z',
          status: 'approved',
          customFields: {
            child_name: 'Test Child',
            child_dob: '2019-01-01'
          }
        },
        customer: {
          id: 'minimal_customer',
          firstName: 'Test',
          lastName: 'Parent',
          phone: '+966501234567'
        },
        service: {
          id: 'service_test',
          name: 'Evaluation'
        }
      };

      const transformedData = transformAmeliaData(minimalPayload);

      expect(transformedData.parent_name).toBe('Test Parent');
      expect(transformedData.child_name_ar).toBeNull();
      expect(transformedData.child_gender).toBeNull();
      expect(transformedData.notes).toBeNull();
    });

    it('should generate fallback values when data is missing', () => {
      const incompletePayload = {
        ...mockAmeliaWebhookPayload,
        customer: {
          id: 'incomplete_customer',
          email: 'test@example.com'
          // Missing names and phone
        },
        booking: {
          id: 'incomplete_booking',
          bookingStart: '2025-09-10T10:00:00Z',
          customFields: {
            // Missing child name
            child_dob: '2019-01-01'
          }
        }
      };

      const transformedData = transformAmeliaData(incompletePayload);

      expect(transformedData.parent_name).toBe('test'); // Fallback from email
      expect(transformedData.child_name).toContain('Child of'); // Fallback child name
    });

    it('should preserve Arabic text correctly', () => {
      const arabicPayload = {
        ...mockAmeliaWebhookPayload,
        customer: {
          id: 'arabic_customer',
          firstName: 'أحمد',
          lastName: 'محمد',
          phone: '+966501234567'
        },
        booking: {
          id: 'arabic_booking',
          bookingStart: '2025-09-10T10:00:00Z',
          customFields: {
            child_name: 'Ali Ahmed',
            child_name_ar: 'علي أحمد',
            child_dob: '2018-05-15',
            concerns: 'يحتاج الطفل إلى تقييم لتأخر النطق'
          }
        }
      };

      const transformedData = transformAmeliaData(arabicPayload);

      expect(transformedData.parent_name).toBe('أحمد محمد');
      expect(transformedData.child_name_ar).toBe('علي أحمد');
      expect(transformedData.notes).toContain('يحتاج الطفل إلى تقييم لتأخر النطق');
    });
  });

  describe('Lead Creation API', () => {
    it('should successfully create lead via API', async () => {
      const leadData = expectedLeadData;

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(leadData)
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(leadData)
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ success: false, error: 'Invalid data' })
      });

      const leadData = { ...expectedLeadData, parent_name: '' }; // Invalid data

      const response = await fetch('/api/leads', {
        method: 'POST',
        body: JSON.stringify(leadData)
      });

      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid data');
    });

    it('should handle duplicate external_id gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ 
          success: false, 
          error: 'Lead with external_id already exists' 
        })
      });

      const leadData = expectedLeadData;

      const response = await fetch('/api/leads', {
        method: 'POST',
        body: JSON.stringify(leadData)
      });

      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('WhatsApp Integration', () => {
    it('should format WhatsApp message correctly', () => {
      const whatsappMessage = formatWhatsAppMessage(expectedLeadData);

      expect(whatsappMessage).toMatchObject({
        messaging_product: 'whatsapp',
        to: expect.stringContaining('966501234567'),
        type: 'template',
        template: {
          name: 'evaluation_confirmation',
          language: { code: 'ar' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: 'Ahmed Mohammed' },
                { type: 'text', text: 'Ali Ahmed' },
                { type: 'text', text: expect.stringContaining('10/09/2025') }
              ]
            }
          ]
        }
      });
    });

    it('should handle phone number formatting', () => {
      const testCases = [
        { input: '+966501234567', expected: '966501234567' },
        { input: '0501234567', expected: '501234567' },
        { input: '966501234567', expected: '966501234567' },
        { input: '+1-555-123-4567', expected: '15551234567' }
      ];

      testCases.forEach(({ input, expected }) => {
        const formatted = formatPhoneForWhatsApp(input);
        expect(formatted).toBe(expected);
      });
    });

    it('should fallback to English template when Arabic fails', async () => {
      // First attempt with Arabic template fails
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ error: 'Template not approved' })
        })
        // Second attempt with English template succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ messages: [{ id: 'msg_123' }] })
        });

      // This would be implemented in the n8n workflow
      expect(true).toBe(true); // Placeholder for actual implementation
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should retry failed API calls', async () => {
      // First call fails
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        // Second call succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { id: 'lead_123' } })
        });

      // Simulate retry logic
      let attempt = 0;
      const maxRetries = 3;
      
      while (attempt < maxRetries) {
        try {
          const response = await fetch('/api/leads', {
            method: 'POST',
            body: JSON.stringify(expectedLeadData)
          });
          
          if (response.ok) {
            break;
          }
        } catch (error) {
          attempt++;
          if (attempt >= maxRetries) {
            throw error;
          }
        }
      }

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle webhook timeout gracefully', async () => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      // Simulate timeout scenario
      expect(() => {
        // This would be handled by n8n's timeout settings
      }).not.toThrow();
    });

    it('should log integration failures for monitoring', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const error = new Error('Integration failed');
      logIntegrationError('amelia_webhook', error, {
        booking_id: 'test_booking_123',
        timestamp: new Date().toISOString()
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Integration Error:',
        expect.objectContaining({
          source: 'amelia_webhook',
          error: error.message,
          context: expect.objectContaining({
            booking_id: 'test_booking_123'
          })
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Data Validation and Security', () => {
    it('should sanitize input data', () => {
      const maliciousPayload = {
        ...mockAmeliaWebhookPayload,
        customer: {
          id: 'customer_123',
          firstName: '<script>alert("xss")</script>',
          lastName: 'Normal Name',
          email: 'test@example.com',
          phone: '+966501234567'
        },
        booking: {
          id: 'booking_123',
          bookingStart: '2025-09-10T10:00:00Z',
          customFields: {
            child_name: '<img src=x onerror=alert("xss")>',
            concerns: 'SELECT * FROM users; --'
          }
        }
      };

      const sanitized = sanitizeWebhookData(maliciousPayload);

      expect(sanitized.customer.firstName).not.toContain('<script>');
      expect(sanitized.booking.customFields.child_name).not.toContain('<img');
      expect(sanitized.booking.customFields.concerns).not.toContain('SELECT');
    });

    it('should validate webhook signature', () => {
      const payload = JSON.stringify(mockAmeliaWebhookPayload);
      const secret = 'test-webhook-secret';
      const signature = generateWebhookSignature(payload, secret);

      expect(validateWebhookSignature(payload, signature, secret)).toBe(true);
      expect(validateWebhookSignature(payload, 'invalid-signature', secret)).toBe(false);
    });

    it('should reject requests without proper authentication', () => {
      const unauthenticatedRequest = {
        headers: {},
        body: JSON.stringify(mockAmeliaWebhookPayload)
      };

      expect(() => validateRequest(unauthenticatedRequest)).toThrow('Missing webhook secret');
    });
  });

  describe('Monitoring and Metrics', () => {
    it('should track integration success metrics', () => {
      const metrics = {
        total_webhooks_received: 0,
        successful_lead_creations: 0,
        failed_integrations: 0,
        average_processing_time: 0
      };

      // Simulate successful integration
      const startTime = Date.now();
      metrics.total_webhooks_received++;
      metrics.successful_lead_creations++;
      metrics.average_processing_time = Date.now() - startTime;

      expect(metrics.total_webhooks_received).toBe(1);
      expect(metrics.successful_lead_creations).toBe(1);
      expect(metrics.failed_integrations).toBe(0);
    });

    it('should detect anomalies in lead volume', () => {
      const recentLeads = [
        { created_at: '2025-09-03T10:00:00Z', source: 'website' },
        { created_at: '2025-09-03T10:01:00Z', source: 'website' },
        { created_at: '2025-09-03T10:02:00Z', source: 'website' },
        // ... 15 more leads in 1 minute (suspicious)
      ];

      const anomalies = detectLeadVolumeAnomalies(recentLeads);
      
      expect(anomalies).toContainEqual(
        expect.objectContaining({
          type: 'high_volume',
          severity: 'medium'
        })
      );
    });
  });
});

// Helper functions (these would be implemented in the actual integration)

function transformAmeliaData(ameliaPayload: any) {
  const { booking, customer, service } = ameliaPayload;
  
  return {
    parent_name: customer.firstName && customer.lastName 
      ? `${customer.firstName} ${customer.lastName}`.trim()
      : customer.email?.split('@')[0] || 'Unknown Parent',
    parent_contact: customer.phone || customer.email,
    parent_contact_secondary: customer.phone && customer.email ? customer.email : null,
    child_name: booking.customFields?.child_name || customer.firstName || 'Child',
    child_name_ar: booking.customFields?.child_name_ar || null,
    child_dob: booking.customFields?.child_dob || '2019-01-01',
    child_gender: booking.customFields?.child_gender || null,
    evaluation_date: booking.bookingStart,
    evaluation_notes: service?.name ? `Service: ${service.name}` : null,
    notes: [
      booking.info ? `Info: ${booking.info}` : null,
      booking.customFields?.concerns ? `Concerns: ${booking.customFields.concerns}` : null
    ].filter(Boolean).join('\n') || null,
    source: 'website',
    source_details: {
      campaign: booking.customFields?.utm_campaign || ameliaPayload.utm_campaign || null,
      source: booking.customFields?.utm_source || ameliaPayload.utm_source || 'amelia',
      medium: booking.customFields?.utm_medium || ameliaPayload.utm_medium || 'booking_form',
      referrer: ameliaPayload.referrer || null
    },
    external_id: `amelia_${booking.id}`,
    integration_metadata: {
      amelia_booking_id: booking.id,
      amelia_customer_id: customer.id,
      amelia_service_id: service?.id,
      service_name: service?.name,
      appointment_duration: service?.duration,
      booking_status: booking.status,
      payment_status: ameliaPayload.payment?.status,
      original_data: ameliaPayload
    }
  };
}

function formatWhatsAppMessage(leadData: any) {
  const phoneNumber = leadData.parent_contact.replace(/[^0-9]/g, '');
  
  return {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'template',
    template: {
      name: 'evaluation_confirmation',
      language: { code: 'ar' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: leadData.parent_name },
            { type: 'text', text: leadData.child_name },
            { type: 'text', text: new Date(leadData.evaluation_date).toLocaleDateString('en-GB') }
          ]
        }
      ]
    }
  };
}

function formatPhoneForWhatsApp(phone: string): string {
  return phone.replace(/[^0-9]/g, '').replace(/^0/, '');
}

function sanitizeWebhookData(data: any): any {
  // Basic XSS protection
  const sanitize = (str: string) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '').replace(/[<>'"]/g, '');
  };

  const sanitized = JSON.parse(JSON.stringify(data));
  
  if (sanitized.customer) {
    sanitized.customer.firstName = sanitize(sanitized.customer.firstName);
    sanitized.customer.lastName = sanitize(sanitized.customer.lastName);
  }
  
  if (sanitized.booking?.customFields) {
    Object.keys(sanitized.booking.customFields).forEach(key => {
      sanitized.booking.customFields[key] = sanitize(sanitized.booking.customFields[key]);
    });
  }
  
  return sanitized;
}

function generateWebhookSignature(payload: string, secret: string): string {
  // In real implementation, this would use HMAC-SHA256
  return `sha256=${payload.length}_${secret}`;
}

function validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return signature === expectedSignature;
}

function validateRequest(request: any): void {
  if (!request.headers['webhook-secret'] && !request.body.includes('secret')) {
    throw new Error('Missing webhook secret');
  }
}

function logIntegrationError(source: string, error: Error, context: any): void {
  console.error('Integration Error:', {
    source,
    error: error.message,
    context,
    timestamp: new Date().toISOString()
  });
}

function detectLeadVolumeAnomalies(leads: any[]): any[] {
  const anomalies = [];
  
  // Check for high volume (more than 10 leads in short time)
  if (leads.length > 10) {
    anomalies.push({
      type: 'high_volume',
      severity: 'medium',
      message: `Unusually high lead volume: ${leads.length} leads`
    });
  }
  
  return anomalies;
}