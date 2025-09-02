/**
 * Alert Delivery Integration Tests
 * 
 * Tests the complete alert delivery workflow from creation to notification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { alertNotificationService } from '../../services/alert-notification-service';
import PerformanceAlerts from '../../components/admin/PerformanceAlerts';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } }
      }))
    }
  }
}));

// Mock fetch for n8n webhook calls
global.fetch = vi.fn();

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

// Mock data
const mockAlertRules = [
  {
    id: 'rule-1',
    rule_name: 'Page Load Time Alert',
    metric_name: 'page_load_time',
    threshold_value: 2000,
    comparison_operator: 'greater_than',
    severity: 'high',
    enabled: true,
    notification_channels: ['channel-1', 'channel-2'],
    description: 'Alert when page load time exceeds 2 seconds',
    created_at: new Date().toISOString()
  }
];

const mockNotificationChannels = [
  {
    id: 'channel-1',
    name: 'Email Alerts',
    type: 'email',
    enabled: true,
    config: { recipient: 'admin@example.com' }
  },
  {
    id: 'channel-2',
    name: 'WhatsApp Alerts',
    type: 'whatsapp',
    enabled: true,
    config: { recipient: '+966501234567' }
  }
];

const mockActiveAlerts = [
  {
    id: 'alert-1',
    alert_type: 'page_load_time_exceeded',
    severity: 'high',
    metric_name: 'page_load_time',
    threshold_value: 2000,
    actual_value: 3500,
    alert_data: {
      description: 'Page load time has exceeded the configured threshold',
      evaluation_window_minutes: 5
    },
    created_at: new Date().toISOString(),
    resolved_at: null
  }
];

describe('Alert Delivery Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default Supabase mocks
    const mockFrom = vi.fn((table: string) => {
      switch (table) {
        case 'alert_rules':
          return {
            select: vi.fn(() => ({
              is: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: mockAlertRules,
                  error: null
                }))
              }))
            }))
          };
        case 'notification_channels':
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: mockNotificationChannels,
                  error: null
                }))
              }))
            }))
          };
        case 'performance_alerts':
          return {
            select: vi.fn(() => ({
              is: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: mockActiveAlerts,
                  error: null
                }))
              })),
              not: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({
                    data: [],
                    error: null
                  }))
                }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                error: null
              }))
            }))
          };
        default:
          return {
            select: vi.fn(() => Promise.resolve({ data: [], error: null })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: { id: 'new-rule-id' },
                  error: null
                }))
              }))
            }))
          };
      }
    });

    (supabase.from as any).mockImplementation(mockFrom);
  });

  describe('PerformanceAlerts Component Integration', () => {
    it('should render alert statistics correctly', async () => {
      renderWithQueryClient(<PerformanceAlerts />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // Active alerts count
      });

      // Check critical alerts count
      expect(screen.getByText('0')).toBeInTheDocument(); // No critical alerts in mock data

      // Check active rules count
      expect(screen.getByText('1')).toBeInTheDocument(); // One active rule
    });

    it('should display active alerts correctly', async () => {
      renderWithQueryClient(<PerformanceAlerts />);

      await waitFor(() => {
        expect(screen.getByText(/Page Load Time Exceeded/)).toBeInTheDocument();
      });

      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('page_load_time')).toBeInTheDocument();
      expect(screen.getByText('3500')).toBeInTheDocument();
      expect(screen.getByText(/threshold: 2000/)).toBeInTheDocument();
    });

    it('should allow creating new alert rules', async () => {
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'new-rule-id' },
            error: null
          }))
        }))
      }));

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'alert_rules') {
          return {
            select: vi.fn(() => ({
              is: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: mockAlertRules,
                  error: null
                }))
              }))
            })),
            insert: mockInsert
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: mockNotificationChannels,
                error: null
              }))
            }))
          }))
        };
      });

      renderWithQueryClient(<PerformanceAlerts />);

      // Click on Rules tab
      const rulesTab = screen.getByText(/Rules/);
      fireEvent.click(rulesTab);

      await waitFor(() => {
        expect(screen.getByText(/Alert Rules/)).toBeInTheDocument();
      });

      // Click New Rule button
      const newRuleButton = screen.getByText(/New Rule/);
      fireEvent.click(newRuleButton);

      await waitFor(() => {
        expect(screen.getByText(/Create New Alert Rule/)).toBeInTheDocument();
      });

      // Should show the create rule dialog
      expect(screen.getByText(/Metric Name/)).toBeInTheDocument();
      expect(screen.getByText(/Threshold/)).toBeInTheDocument();
      expect(screen.getByText(/Severity/)).toBeInTheDocument();
    });

    it('should allow resolving alerts', async () => {
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          error: null
        }))
      }));

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'performance_alerts') {
          return {
            select: vi.fn(() => ({
              is: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: mockActiveAlerts,
                  error: null
                }))
              }))
            })),
            update: mockUpdate
          };
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null }))
        };
      });

      renderWithQueryClient(<PerformanceAlerts />);

      await waitFor(() => {
        expect(screen.getByText(/Resolve/)).toBeInTheDocument();
      });

      const resolveButton = screen.getByText(/Resolve/);
      fireEvent.click(resolveButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('AlertNotificationService Integration', () => {
    it('should process complete alert delivery workflow', async () => {
      // Mock successful webhook responses
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

      global.fetch = mockFetch;

      // Mock pending deliveries
      const mockPendingDeliveries = [
        {
          id: 'delivery-1',
          alert_id: 'alert-1',
          channel_id: 'channel-1',
          delivery_status: 'pending',
          retry_count: 0,
          notification_channels: mockNotificationChannels[0],
          performance_alerts: mockActiveAlerts[0]
        },
        {
          id: 'delivery-2',
          alert_id: 'alert-1',
          channel_id: 'channel-2',
          delivery_status: 'pending',
          retry_count: 0,
          notification_channels: mockNotificationChannels[1],
          performance_alerts: mockActiveAlerts[0]
        }
      ];

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: mockPendingDeliveries,
                error: null
              }))
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            error: null
          }))
        }))
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      // Process pending deliveries
      await alertNotificationService.processPendingDeliveries();

      // Verify n8n webhook calls were made
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Verify email delivery call
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/email'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('admin@example.com')
        })
      );

      // Verify WhatsApp delivery call
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/whatsapp'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('+966501234567')
        })
      );
    });

    it('should handle delivery failures with retry logic', async () => {
      // Mock failed webhook response
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Server Error')
        });

      global.fetch = mockFetch;

      // Mock pending delivery with retry
      const mockPendingDelivery = [
        {
          id: 'delivery-1',
          alert_id: 'alert-1',
          channel_id: 'channel-1',
          delivery_status: 'retrying',
          retry_count: 1,
          notification_channels: { ...mockNotificationChannels[0], retry_attempts: 3 },
          performance_alerts: mockActiveAlerts[0]
        }
      ];

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }));

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: mockPendingDelivery,
                error: null
              }))
            }))
          }))
        })),
        update: mockUpdate
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      await alertNotificationService.processPendingDeliveries();

      // Verify delivery was attempted
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Verify status was updated to retrying (not failed since retry_count < retry_attempts)
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should get accurate delivery statistics', async () => {
      const mockDeliveryData = [
        { delivery_status: 'sent', delivery_method: 'email', created_at: new Date().toISOString() },
        { delivery_status: 'sent', delivery_method: 'whatsapp', created_at: new Date().toISOString() },
        { delivery_status: 'failed', delivery_method: 'email', created_at: new Date().toISOString() },
        { delivery_status: 'pending', delivery_method: 'whatsapp', created_at: new Date().toISOString() }
      ];

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          gte: vi.fn(() => Promise.resolve({
            data: mockDeliveryData,
            error: null
          }))
        }))
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      const stats = await alertNotificationService.getDeliveryStats('24h');

      expect(stats).toEqual({
        total: 4,
        sent: 2,
        failed: 1,
        pending: 1,
        retrying: 0,
        by_method: {
          email: 2,
          whatsapp: 2
        },
        success_rate: 50
      });
    });
  });

  describe('End-to-End Alert Workflow', () => {
    it('should simulate complete alert lifecycle', async () => {
      // 1. Alert is created (simulated via database function)
      const alertId = 'test-alert-123';
      
      // Mock scheduling notifications
      const mockRpc = vi.fn(() => Promise.resolve({
        data: 2, // 2 notifications scheduled
        error: null
      }));
      (supabase.rpc as any).mockImplementation(mockRpc);

      // 2. Schedule notifications
      const notificationCount = await alertNotificationService.scheduleAlertNotifications(alertId);
      expect(notificationCount).toBe(2);
      expect(mockRpc).toHaveBeenCalledWith('schedule_alert_notifications', { 
        p_alert_id: alertId 
      });

      // 3. Process deliveries (successful)
      const mockFetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      }));
      global.fetch = mockFetch;

      const mockPendingDeliveries = [
        {
          id: 'delivery-1',
          alert_id: alertId,
          channel_id: 'channel-1',
          delivery_status: 'pending',
          retry_count: 0,
          notification_channels: mockNotificationChannels[0],
          performance_alerts: {
            id: alertId,
            alert_type: 'test_alert',
            severity: 'high',
            metric_name: 'test_metric',
            threshold_value: 100,
            actual_value: 150,
            alert_data: {},
            created_at: new Date().toISOString()
          }
        }
      ];

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: mockPendingDeliveries,
                error: null
              }))
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      await alertNotificationService.processPendingDeliveries();

      // 4. Verify delivery was attempted
      expect(mockFetch).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/email'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
  });
});