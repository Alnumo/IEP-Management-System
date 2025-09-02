/**
 * Alert Notification Service Tests
 * 
 * Tests for the alert notification delivery system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { alertNotificationService } from '../../services/alert-notification-service';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        is: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              error: null,
              data: []
            }))
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          error: null
        }))
      }))
    })),
    rpc: vi.fn(() => ({
      error: null,
      data: 3
    }))
  }
}));

// Mock fetch
global.fetch = vi.fn();

describe('AlertNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processPendingDeliveries', () => {
    it('should handle no pending deliveries gracefully', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      }));
      
      (supabase.from as any).mockImplementation(mockFrom);

      await expect(alertNotificationService.processPendingDeliveries()).resolves.not.toThrow();
    });

    it('should handle database errors', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Database error' }
              }))
            }))
          }))
        }))
      }));
      
      (supabase.from as any).mockImplementation(mockFrom);

      await expect(alertNotificationService.processPendingDeliveries()).resolves.not.toThrow();
    });
  });

  describe('scheduleAlertNotifications', () => {
    it('should schedule notifications for a new alert', async () => {
      const alertId = 'test-alert-id';
      
      const mockRpc = vi.fn(() => Promise.resolve({
        data: 3,
        error: null
      }));
      
      (supabase.rpc as any).mockImplementation(mockRpc);

      const result = await alertNotificationService.scheduleAlertNotifications(alertId);

      expect(mockRpc).toHaveBeenCalledWith('schedule_alert_notifications', { 
        p_alert_id: alertId 
      });
      expect(result).toBe(3);
    });

    it('should handle errors when scheduling notifications', async () => {
      const alertId = 'test-alert-id';
      
      const mockRpc = vi.fn(() => Promise.resolve({
        data: null,
        error: { message: 'Failed to schedule' }
      }));
      
      (supabase.rpc as any).mockImplementation(mockRpc);

      const result = await alertNotificationService.scheduleAlertNotifications(alertId);

      expect(result).toBe(0);
    });
  });

  describe('getDeliveryStats', () => {
    it('should return delivery statistics', async () => {
      const mockData = [
        { delivery_status: 'sent', delivery_method: 'email', created_at: new Date().toISOString() },
        { delivery_status: 'failed', delivery_method: 'whatsapp', created_at: new Date().toISOString() },
        { delivery_status: 'pending', delivery_method: 'email', created_at: new Date().toISOString() }
      ];

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          gte: vi.fn(() => Promise.resolve({
            data: mockData,
            error: null
          }))
        }))
      }));
      
      (supabase.from as any).mockImplementation(mockFrom);

      const stats = await alertNotificationService.getDeliveryStats('24h');

      expect(stats).toEqual({
        total: 3,
        sent: 1,
        failed: 1,
        pending: 1,
        retrying: 0,
        by_method: {
          email: 2,
          whatsapp: 1
        },
        success_rate: 33
      });
    });

    it('should handle empty results', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          gte: vi.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        }))
      }));
      
      (supabase.from as any).mockImplementation(mockFrom);

      const stats = await alertNotificationService.getDeliveryStats('1h');

      expect(stats).toEqual({
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
        retrying: 0,
        by_method: {},
        success_rate: 0
      });
    });
  });

  describe('email delivery', () => {
    it('should successfully deliver email notifications via n8n webhook', async () => {
      const mockFetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      }));
      
      global.fetch = mockFetch;

      const channel = {
        id: 'channel-1',
        channel_name: 'Email Alerts',
        channel_type: 'email' as const,
        enabled: true,
        config: { recipient: 'admin@example.com' },
        retry_attempts: 3,
        retry_delay_seconds: 60,
        rate_limit_per_hour: 100
      };

      const content = {
        subject: 'Test Alert',
        body: 'Test alert message',
        alert: { id: 'alert-1' }
      };

      // Access private method through any casting
      const service = alertNotificationService as any;
      const result = await service.deliverEmail(channel, content);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/email'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('admin@example.com')
        })
      );
    });

    it('should handle email delivery failures', async () => {
      const mockFetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server Error')
      }));
      
      global.fetch = mockFetch;

      const channel = {
        id: 'channel-1',
        channel_name: 'Email Alerts',
        channel_type: 'email' as const,
        enabled: true,
        config: { recipient: 'admin@example.com' },
        retry_attempts: 3,
        retry_delay_seconds: 60,
        rate_limit_per_hour: 100
      };

      const content = {
        subject: 'Test Alert',
        body: 'Test alert message',
        alert: { id: 'alert-1' }
      };

      const service = alertNotificationService as any;
      const result = await service.deliverEmail(channel, content);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('HTTP 500');
    });
  });

  describe('WhatsApp delivery', () => {
    it('should successfully deliver WhatsApp notifications', async () => {
      const mockFetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      }));
      
      global.fetch = mockFetch;

      const channel = {
        id: 'channel-2',
        channel_name: 'WhatsApp Alerts',
        channel_type: 'whatsapp' as const,
        enabled: true,
        config: { recipient: '+966501234567' },
        retry_attempts: 3,
        retry_delay_seconds: 60,
        rate_limit_per_hour: 50
      };

      const content = {
        subject: 'Test Alert',
        body: '**Critical Alert**\n\nTest message',
        alert: { id: 'alert-1' }
      };

      const service = alertNotificationService as any;
      const result = await service.deliverWhatsApp(channel, content);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/whatsapp'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('+966501234567')
        })
      );
    });
  });

  describe('webhook delivery', () => {
    it('should successfully deliver webhook notifications', async () => {
      const mockFetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ received: true })
      }));
      
      global.fetch = mockFetch;

      const channel = {
        id: 'channel-3',
        channel_name: 'Webhook Alerts',
        channel_type: 'webhook' as const,
        enabled: true,
        config: { 
          url: 'https://api.example.com/alerts',
          method: 'POST',
          headers: { 'Authorization': 'Bearer token' }
        },
        retry_attempts: 3,
        retry_delay_seconds: 60,
        rate_limit_per_hour: 200
      };

      const content = {
        subject: 'Test Alert',
        body: 'Test webhook alert',
        alert: { id: 'alert-1', severity: 'high' },
        severity: 'high'
      };

      const service = alertNotificationService as any;
      const result = await service.deliverWebhook(channel, content);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/alerts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer token'
          })
        })
      );
    });
  });

  describe('Slack delivery', () => {
    it('should successfully deliver Slack notifications with blocks', async () => {
      const mockFetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true })
      }));
      
      global.fetch = mockFetch;

      const channel = {
        id: 'channel-4',
        channel_name: 'Slack Alerts',
        channel_type: 'slack' as const,
        enabled: true,
        config: { channel: '#alerts' },
        retry_attempts: 3,
        retry_delay_seconds: 60,
        rate_limit_per_hour: 100
      };

      const content = {
        subject: 'Critical Alert',
        body: '**Performance issue detected**',
        alert: { id: 'alert-1' },
        severity: 'critical',
        metric_name: 'page_load_time',
        actual_value: 5000,
        threshold_value: 2000
      };

      const service = alertNotificationService as any;
      const result = await service.deliverSlack(channel, content);

      expect(result.success).toBe(true);
      
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain('/slack');
      
      const body = JSON.parse(callArgs[1].body);
      expect(body.message).toHaveProperty('blocks');
      expect(body.message.blocks).toHaveLength(3); // header, section with fields, and body section
    });
  });
});