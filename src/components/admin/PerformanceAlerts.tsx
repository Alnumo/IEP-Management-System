/**
 * Performance Alerts Component
 * 
 * @description Alert management and configuration component for performance monitoring
 * Handles alert creation, resolution, and notification settings
 * Supports Arabic RTL and English LTR layouts
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Bell, 
  CheckCircle, 
  Clock, 
  Mail, 
  MessageSquare,
  Settings,
  X,
  Plus
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import type { PerformanceAlert } from '@/types/performance';

interface AlertRule {
  id?: string;
  metric_name: string;
  threshold_value: number;
  comparison_operator: 'greater_than' | 'less_than' | 'equals';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notification_channels: string[];
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'whatsapp' | 'sms' | 'webhook';
  enabled: boolean;
  config: Record<string, any>;
}

const PerformanceAlerts: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('active');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<PerformanceAlert | null>(null);
  const [newRule, setNewRule] = useState<AlertRule>({
    metric_name: '',
    threshold_value: 0,
    comparison_operator: 'greater_than',
    severity: 'medium',
    enabled: true,
    notification_channels: [],
    description: ''
  });

  const queryClient = useQueryClient();

  // Fetch active alerts
  const { data: activeAlerts, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['performance-alerts', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_alerts')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PerformanceAlert[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch resolved alerts
  const { data: resolvedAlerts } = useQuery({
    queryKey: ['performance-alerts', 'resolved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_alerts')
        .select('*')
        .not('resolved_at', 'is', null)
        .order('resolved_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as PerformanceAlert[];
    },
  });

  // Fetch alert rules
  const { data: alertRules, isLoading: isLoadingRules } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_rules')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AlertRule[];
    },
  });

  // Resolve alert mutation
  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('performance_alerts')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-alerts'] });
    },
  });

  // Fetch notification channels
  const { data: notificationChannels } = useQuery({
    queryKey: ['notification-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_channels')
        .select('*')
        .eq('enabled', true)
        .order('channel_name');

      if (error) throw error;
      return data as NotificationChannel[];
    },
  });

  // Create alert rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (rule: AlertRule) => {
      const { data, error } = await supabase
        .from('alert_rules')
        .insert([{
          rule_name: rule.metric_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          metric_name: rule.metric_name,
          threshold_value: rule.threshold_value,
          comparison_operator: rule.comparison_operator,
          severity: rule.severity,
          enabled: rule.enabled,
          description: rule.description,
          notification_channels: rule.notification_channels,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      setIsCreateDialogOpen(false);
      resetNewRule();
    },
  });

  // Update alert rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ ruleId, updates }: { ruleId: string, updates: Partial<AlertRule> }) => {
      const { data, error } = await supabase
        .from('alert_rules')
        .update({
          ...updates,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', ruleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
  });

  // Delete alert rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('alert_rules')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
  });

  const resetNewRule = () => {
    setNewRule({
      metric_name: '',
      threshold_value: 0,
      comparison_operator: 'greater_than',
      severity: 'medium',
      enabled: true,
      notification_channels: [],
      description: ''
    });
  };

  const handleResolveAlert = (alertId: string) => {
    resolveAlertMutation.mutate(alertId);
  };

  const handleCreateRule = () => {
    if (newRule.metric_name && newRule.threshold_value > 0) {
      createRuleMutation.mutate(newRule);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'low':
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatAlertTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return document.dir === 'rtl' ? `منذ ${days} أيام` : `${days}d ago`;
    } else if (hours > 0) {
      return document.dir === 'rtl' ? `منذ ${hours} ساعات` : `${hours}h ago`;
    } else if (minutes > 0) {
      return document.dir === 'rtl' ? `منذ ${minutes} دقائق` : `${minutes}m ago`;
    } else {
      return document.dir === 'rtl' ? 'منذ قليل' : 'Just now';
    }
  };

  return (
    <div className="p-6" dir={document.dir}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {document.dir === 'rtl' ? 'تنبيهات الأداء' : 'Performance Alerts'}
          </h1>
          <p className="text-muted-foreground">
            {document.dir === 'rtl' 
              ? 'إدارة وتكوين تنبيهات مراقبة الأداء'
              : 'Manage and configure performance monitoring alerts'
            }
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {document.dir === 'rtl' ? 'قاعدة جديدة' : 'New Rule'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {document.dir === 'rtl' ? 'إنشاء قاعدة تنبيه جديدة' : 'Create New Alert Rule'}
              </DialogTitle>
              <DialogDescription>
                {document.dir === 'rtl' 
                  ? 'قم بتكوين قاعدة تنبيه لمراقبة مقاييس الأداء'
                  : 'Configure an alert rule to monitor performance metrics'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="metric-name">
                  {document.dir === 'rtl' ? 'اسم المقياس' : 'Metric Name'}
                </Label>
                <Select 
                  value={newRule.metric_name}
                  onValueChange={(value) => setNewRule({ ...newRule, metric_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={document.dir === 'rtl' ? 'اختر المقياس' : 'Select metric'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="page_load_time">
                      {document.dir === 'rtl' ? 'وقت تحميل الصفحة' : 'Page Load Time'}
                    </SelectItem>
                    <SelectItem value="api_response_time">
                      {document.dir === 'rtl' ? 'وقت استجابة API' : 'API Response Time'}
                    </SelectItem>
                    <SelectItem value="database_query_time">
                      {document.dir === 'rtl' ? 'وقت استعلام قاعدة البيانات' : 'Database Query Time'}
                    </SelectItem>
                    <SelectItem value="error_rate">
                      {document.dir === 'rtl' ? 'معدل الأخطاء' : 'Error Rate'}
                    </SelectItem>
                    <SelectItem value="memory_usage">
                      {document.dir === 'rtl' ? 'استخدام الذاكرة' : 'Memory Usage'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="operator">
                    {document.dir === 'rtl' ? 'المشغل' : 'Operator'}
                  </Label>
                  <Select 
                    value={newRule.comparison_operator}
                    onValueChange={(value: any) => setNewRule({ ...newRule, comparison_operator: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="greater_than">{'>'}</SelectItem>
                      <SelectItem value="less_than">{'<'}</SelectItem>
                      <SelectItem value="equals">{'='}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="threshold">
                    {document.dir === 'rtl' ? 'العتبة' : 'Threshold'}
                  </Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={newRule.threshold_value}
                    onChange={(e) => setNewRule({ ...newRule, threshold_value: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="severity">
                  {document.dir === 'rtl' ? 'الأهمية' : 'Severity'}
                </Label>
                <Select 
                  value={newRule.severity}
                  onValueChange={(value: any) => setNewRule({ ...newRule, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      {document.dir === 'rtl' ? 'منخفض' : 'Low'}
                    </SelectItem>
                    <SelectItem value="medium">
                      {document.dir === 'rtl' ? 'متوسط' : 'Medium'}
                    </SelectItem>
                    <SelectItem value="high">
                      {document.dir === 'rtl' ? 'عالي' : 'High'}
                    </SelectItem>
                    <SelectItem value="critical">
                      {document.dir === 'rtl' ? 'حرج' : 'Critical'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">
                  {document.dir === 'rtl' ? 'الوصف (اختياري)' : 'Description (Optional)'}
                </Label>
                <Textarea
                  id="description"
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  placeholder={document.dir === 'rtl' ? 'وصف القاعدة...' : 'Rule description...'}
                  rows={3}
                />
              </div>

              <div>
                <Label>
                  {document.dir === 'rtl' ? 'قنوات الإشعار' : 'Notification Channels'}
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto">
                  {notificationChannels?.map((channel) => (
                    <div key={channel.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`channel-${channel.id}`}
                        checked={newRule.notification_channels.includes(channel.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewRule({
                              ...newRule,
                              notification_channels: [...newRule.notification_channels, channel.id]
                            });
                          } else {
                            setNewRule({
                              ...newRule,
                              notification_channels: newRule.notification_channels.filter(id => id !== channel.id)
                            });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <Label htmlFor={`channel-${channel.id}`} className="text-sm">
                        {channel.name}
                      </Label>
                    </div>
                  )) || (
                    <div className="col-span-2 text-center text-sm text-muted-foreground py-4">
                      {document.dir === 'rtl' 
                        ? 'لا توجد قنوات إشعار متاحة'
                        : 'No notification channels available'
                      }
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={newRule.enabled}
                  onCheckedChange={(checked) => setNewRule({ ...newRule, enabled: checked })}
                />
                <Label>{document.dir === 'rtl' ? 'تفعيل القاعدة' : 'Enable Rule'}</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  {document.dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button 
                  onClick={handleCreateRule}
                  disabled={!newRule.metric_name || newRule.threshold_value <= 0}
                >
                  {document.dir === 'rtl' ? 'إنشاء' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alert Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {document.dir === 'rtl' ? 'التنبيهات النشطة' : 'Active Alerts'}
                </p>
                <p className="text-2xl font-bold">{activeAlerts?.length || 0}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {document.dir === 'rtl' ? 'حرجة' : 'Critical'}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {activeAlerts?.filter(a => a.severity === 'critical').length || 0}
                </p>
              </div>
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {document.dir === 'rtl' ? 'محلولة اليوم' : 'Resolved Today'}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {resolvedAlerts?.filter(a => {
                    const today = new Date();
                    const alertDate = new Date(a.resolved_at || '');
                    return alertDate.toDateString() === today.toDateString();
                  }).length || 0}
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {document.dir === 'rtl' ? 'قواعد نشطة' : 'Active Rules'}
                </p>
                <p className="text-2xl font-bold">{alertRules?.filter(r => r.enabled).length || 0}</p>
              </div>
              <Settings className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            {document.dir === 'rtl' ? 'نشطة' : 'Active'} ({activeAlerts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            {document.dir === 'rtl' ? 'محلولة' : 'Resolved'}
          </TabsTrigger>
          <TabsTrigger value="rules">
            {document.dir === 'rtl' ? 'القواعد' : 'Rules'}
          </TabsTrigger>
        </TabsList>

        {/* Active Alerts Tab */}
        <TabsContent value="active" className="space-y-4">
          {activeAlerts && activeAlerts.length > 0 ? (
            <div className="space-y-4">
              {activeAlerts.map((alert) => (
                <Card key={alert.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getSeverityIcon(alert.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-sm font-medium">
                              {alert.alert_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h3>
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              <span className="font-medium">
                                {document.dir === 'rtl' ? 'المقياس:' : 'Metric:'} 
                              </span> {alert.metric_name}
                            </p>
                            <p>
                              <span className="font-medium">
                                {document.dir === 'rtl' ? 'القيمة:' : 'Value:'} 
                              </span> {alert.actual_value} (threshold: {alert.threshold_value})
                            </p>
                            <p>
                              <span className="font-medium">
                                {document.dir === 'rtl' ? 'الوقت:' : 'Time:'} 
                              </span> {formatAlertTime(alert.created_at)}
                            </p>
                          </div>

                          {alert.alert_data && Object.keys(alert.alert_data).length > 0 && (
                            <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                              <details>
                                <summary className="cursor-pointer font-medium">
                                  {document.dir === 'rtl' ? 'تفاصيل إضافية' : 'Additional Details'}
                                </summary>
                                <pre className="mt-2 text-xs overflow-x-auto">
                                  {JSON.stringify(alert.alert_data, null, 2)}
                                </pre>
                              </details>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveAlert(alert.id)}
                          disabled={resolveAlertMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4" />
                          {document.dir === 'rtl' ? 'حل' : 'Resolve'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {document.dir === 'rtl' ? 'لا توجد تنبيهات نشطة' : 'No Active Alerts'}
                </h3>
                <p className="text-muted-foreground">
                  {document.dir === 'rtl' 
                    ? 'جميع أنظمة الأداء تعمل بشكل طبيعي'
                    : 'All performance systems are operating normally'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Resolved Alerts Tab */}
        <TabsContent value="resolved" className="space-y-4">
          {resolvedAlerts && resolvedAlerts.length > 0 ? (
            <div className="space-y-4">
              {resolvedAlerts.map((alert) => (
                <Card key={alert.id} className="opacity-75">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-sm font-medium">
                              {alert.alert_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h3>
                            <Badge variant="outline">
                              {document.dir === 'rtl' ? 'محلول' : 'Resolved'}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              <span className="font-medium">
                                {document.dir === 'rtl' ? 'محلول في:' : 'Resolved:'} 
                              </span> {alert.resolved_at ? formatAlertTime(alert.resolved_at) : 'N/A'}
                            </p>
                            <p>
                              <span className="font-medium">
                                {document.dir === 'rtl' ? 'المدة:' : 'Duration:'} 
                              </span> {alert.resolved_at ? Math.round((new Date(alert.resolved_at).getTime() - new Date(alert.created_at).getTime()) / 60000) : 0}m
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {document.dir === 'rtl' ? 'لا توجد تنبيهات محلولة' : 'No Resolved Alerts'}
                </h3>
                <p className="text-muted-foreground">
                  {document.dir === 'rtl' 
                    ? 'لم يتم حل أي تنبيهات بعد'
                    : 'No alerts have been resolved yet'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          {alertRules && alertRules.length > 0 ? (
            <div className="space-y-4">
              {alertRules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          <Settings className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-sm font-medium">
                              {rule.metric_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h3>
                            <Badge className={getSeverityColor(rule.severity)}>
                              {rule.severity}
                            </Badge>
                            <Badge variant={rule.enabled ? "default" : "secondary"}>
                              {rule.enabled 
                                ? (document.dir === 'rtl' ? 'مفعل' : 'Active')
                                : (document.dir === 'rtl' ? 'معطل' : 'Inactive')
                              }
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              <span className="font-medium">
                                {document.dir === 'rtl' ? 'الشرط:' : 'Condition:'} 
                              </span> {rule.metric_name} {rule.comparison_operator === 'greater_than' ? '>' : rule.comparison_operator === 'less_than' ? '<' : '='} {rule.threshold_value}
                            </p>
                            {rule.description && (
                              <p>
                                <span className="font-medium">
                                  {document.dir === 'rtl' ? 'الوصف:' : 'Description:'} 
                                </span> {rule.description}
                              </p>
                            )}
                            <p>
                              <span className="font-medium">
                                {document.dir === 'rtl' ? 'تم إنشاؤه:' : 'Created:'} 
                              </span> {rule.created_at ? formatAlertTime(rule.created_at) : 'N/A'}
                            </p>
                          </div>

                          {rule.notification_channels && rule.notification_channels.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs text-muted-foreground font-medium">
                                {document.dir === 'rtl' ? 'قنوات الإشعار:' : 'Notification Channels:'}
                              </span>
                              <div className="flex items-center space-x-1 mt-1">
                                {rule.notification_channels.map((channelId: string) => {
                                  const channel = notificationChannels?.find(c => c.id === channelId);
                                  if (!channel) return null;
                                  
                                  const getChannelIcon = (type: string) => {
                                    switch (type) {
                                      case 'email': return <Mail className="h-3 w-3" />;
                                      case 'whatsapp': return <MessageSquare className="h-3 w-3" />;
                                      case 'slack': return <MessageSquare className="h-3 w-3" />;
                                      default: return <Bell className="h-3 w-3" />;
                                    }
                                  };

                                  return (
                                    <Badge key={channelId} variant="outline" className="text-xs">
                                      {getChannelIcon(channel.type)}
                                      <span className="ml-1">{channel.name}</span>
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) => {
                            if (rule.id) {
                              updateRuleMutation.mutate({
                                ruleId: rule.id,
                                updates: { enabled: checked }
                              });
                            }
                          }}
                          disabled={updateRuleMutation.isPending}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (rule.id && window.confirm(
                              document.dir === 'rtl' 
                                ? 'هل أنت متأكد من حذف هذه القاعدة؟'
                                : 'Are you sure you want to delete this rule?'
                            )) {
                              deleteRuleMutation.mutate(rule.id);
                            }
                          }}
                          disabled={deleteRuleMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                          {document.dir === 'rtl' ? 'حذف' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {document.dir === 'rtl' ? 'لا توجد قواعد تنبيه' : 'No Alert Rules'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {document.dir === 'rtl' 
                    ? 'قم بإنشاء قاعدة تنبيه لبدء مراقبة مقاييس الأداء'
                    : 'Create an alert rule to start monitoring performance metrics'
                  }
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {document.dir === 'rtl' ? 'إنشاء قاعدة جديدة' : 'Create First Rule'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Notification Channels Section */}
          <Card>
            <CardHeader>
              <CardTitle>
                {document.dir === 'rtl' ? 'قنوات الإشعار' : 'Notification Channels'}
              </CardTitle>
              <CardDescription>
                {document.dir === 'rtl' 
                  ? 'قنوات الإشعار المتاحة لإرسال التنبيهات'
                  : 'Available notification channels for sending alerts'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notificationChannels && notificationChannels.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {notificationChannels.map((channel) => (
                    <div key={channel.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {channel.type === 'email' && <Mail className="h-5 w-5 text-blue-500" />}
                          {channel.type === 'whatsapp' && <MessageSquare className="h-5 w-5 text-green-500" />}
                          {channel.type === 'sms' && <MessageSquare className="h-5 w-5 text-orange-500" />}
                          {channel.type === 'webhook' && <Bell className="h-5 w-5 text-purple-500" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{channel.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{channel.type}</p>
                        </div>
                      </div>
                      <Badge variant={channel.enabled ? "default" : "secondary"}>
                        {channel.enabled 
                          ? (document.dir === 'rtl' ? 'مفعل' : 'Active')
                          : (document.dir === 'rtl' ? 'معطل' : 'Inactive')
                        }
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {document.dir === 'rtl' 
                      ? 'لا توجد قنوات إشعار متاحة'
                      : 'No notification channels available'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceAlerts;