/**
 * Performance Dashboard Component
 * 
 * @description Comprehensive performance monitoring dashboard with real-time metrics
 * Displays Web Vitals, database performance, API metrics, and system health
 * Supports Arabic RTL and English LTR layouts
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Globe, 
  Monitor,
  RefreshCw,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';

import usePerformanceMetrics from '@/hooks/usePerformanceMetrics';
import { supabase } from '@/lib/supabase';
import type { 
  PerformanceAlert, 
  PerformanceRating,
  DatabasePerformanceStats 
} from '@/types/performance';

interface DashboardProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface SystemHealthMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold: number;
}

const PerformanceDashboard: React.FC<DashboardProps> = ({
  className = '',
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
}) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Performance metrics hook
  const {
    webVitals,
    customMetrics,
    summary,
    recentAlerts,
    databaseStats,
    isLoading,
    isLoadingStats,
    refreshMetrics,
    getPerformanceRating,
    thresholds
  } = usePerformanceMetrics();

  // System health metrics
  const { data: systemHealth, isLoading: isLoadingHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_health_metrics')
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 30000, // 30 seconds
  });

  // Real-time session data
  const { data: activeUsers } = useQuery({
    queryKey: ['active-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_metrics')
        .select('created_at, metadata')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .eq('metric_name', 'rum_session_started');

      if (error) throw error;
      return data?.length || 0;
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshMetrics();
      setLastUpdated(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshMetrics]);

  // Handle manual refresh
  const handleRefresh = async () => {
    await refreshMetrics();
    setLastUpdated(new Date());
  };

  // Get performance rating color
  const getRatingColor = (rating: PerformanceRating): string => {
    switch (rating) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Get alert severity color
  const getAlertColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  // Calculate overall system health score
  const calculateHealthScore = (): number => {
    if (!webVitals || !databaseStats) return 0;

    let score = 100;
    
    // Web Vitals impact (40% weight)
    if (webVitals.lcp && webVitals.lcp > 4000) score -= 15;
    else if (webVitals.lcp && webVitals.lcp > 2500) score -= 8;
    
    if (webVitals.fid && webVitals.fid > 300) score -= 10;
    else if (webVitals.fid && webVitals.fid > 100) score -= 5;
    
    if (webVitals.cls && webVitals.cls > 0.25) score -= 10;
    else if (webVitals.cls && webVitals.cls > 0.1) score -= 5;

    // Database performance impact (35% weight)
    if (databaseStats.avg_query_time_ms > 100) score -= 15;
    else if (databaseStats.avg_query_time_ms > 50) score -= 8;
    
    if (databaseStats.cache_hit_ratio < 80) score -= 10;
    else if (databaseStats.cache_hit_ratio < 90) score -= 5;

    // Active alerts impact (25% weight)
    if (recentAlerts) {
      const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical').length;
      const highAlerts = recentAlerts.filter(a => a.severity === 'high').length;
      
      score -= criticalAlerts * 8;
      score -= highAlerts * 4;
    }

    return Math.max(0, Math.min(100, score));
  };

  const healthScore = calculateHealthScore();

  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-8 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`} dir={document.dir}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {document.dir === 'rtl' ? 'لوحة مراقبة الأداء' : 'Performance Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {document.dir === 'rtl' 
              ? 'مراقبة شاملة لأداء النظام في الوقت الفعلي'
              : 'Comprehensive real-time system performance monitoring'
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">
            {document.dir === 'rtl' ? 'آخر تحديث:' : 'Last updated:'} {' '}
            {lastUpdated.toLocaleTimeString()}
          </span>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={isLoadingStats}
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
            {document.dir === 'rtl' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* System Health Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Overall Health Score */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {document.dir === 'rtl' ? 'صحة النظام العامة' : 'System Health'}
                </p>
                <p className="text-2xl font-bold">{healthScore}%</p>
              </div>
              <div className={`p-2 rounded-full ${
                healthScore >= 90 ? 'bg-green-100 text-green-600' :
                healthScore >= 70 ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>
                {healthScore >= 90 ? <CheckCircle className="h-5 w-5" /> : 
                 healthScore >= 70 ? <Activity className="h-5 w-5" /> : 
                 <AlertTriangle className="h-5 w-5" />}
              </div>
            </div>
            <Progress value={healthScore} className="mt-2" />
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {document.dir === 'rtl' ? 'المستخدمين النشطين' : 'Active Users'}
                </p>
                <p className="text-2xl font-bold">{activeUsers || 0}</p>
              </div>
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {document.dir === 'rtl' ? 'آخر 5 دقائق' : 'Last 5 minutes'}
            </p>
          </CardContent>
        </Card>

        {/* Database Performance */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {document.dir === 'rtl' ? 'أداء قاعدة البيانات' : 'Database Performance'}
                </p>
                <p className="text-2xl font-bold">
                  {databaseStats?.avg_query_time_ms?.toFixed(1) || 0}ms
                </p>
              </div>
              <div className={`p-2 rounded-full ${
                (databaseStats?.avg_query_time_ms || 0) < 50 ? 'bg-green-100 text-green-600' :
                (databaseStats?.avg_query_time_ms || 0) < 100 ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>
                <Database className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {document.dir === 'rtl' ? 'متوسط زمن الاستعلام' : 'Avg query time'}
            </p>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {document.dir === 'rtl' ? 'التنبيهات النشطة' : 'Active Alerts'}
                </p>
                <p className="text-2xl font-bold">{recentAlerts?.length || 0}</p>
              </div>
              <div className={`p-2 rounded-full ${
                (recentAlerts?.length || 0) === 0 ? 'bg-green-100 text-green-600' :
                (recentAlerts?.filter(a => a.severity === 'critical').length || 0) > 0 ? 'bg-red-100 text-red-600' :
                'bg-yellow-100 text-yellow-600'
              }`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {recentAlerts?.filter(a => a.severity === 'critical').length || 0} {' '}
              {document.dir === 'rtl' ? 'حرجة' : 'critical'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            {document.dir === 'rtl' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="web-vitals">
            {document.dir === 'rtl' ? 'مؤشرات الويب' : 'Web Vitals'}
          </TabsTrigger>
          <TabsTrigger value="database">
            {document.dir === 'rtl' ? 'قاعدة البيانات' : 'Database'}
          </TabsTrigger>
          <TabsTrigger value="alerts">
            {document.dir === 'rtl' ? 'التنبيهات' : 'Alerts'}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Web Vitals Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="h-5 w-5" />
                  <span>{document.dir === 'rtl' ? 'مؤشرات الأداء الرئيسية' : 'Core Web Vitals'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {webVitals.lcp !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {document.dir === 'rtl' ? 'أكبر رسم للمحتوى' : 'Largest Contentful Paint'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono">{webVitals.lcp}ms</span>
                      <Badge className={getRatingColor(getPerformanceRating('webVitalsLCP', webVitals.lcp))}>
                        {getPerformanceRating('webVitalsLCP', webVitals.lcp)}
                      </Badge>
                    </div>
                  </div>
                )}
                
                {webVitals.fid !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {document.dir === 'rtl' ? 'تأخير الإدخال الأول' : 'First Input Delay'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono">{webVitals.fid}ms</span>
                      <Badge className={getRatingColor(getPerformanceRating('webVitalsFID', webVitals.fid))}>
                        {getPerformanceRating('webVitalsFID', webVitals.fid)}
                      </Badge>
                    </div>
                  </div>
                )}
                
                {webVitals.cls !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {document.dir === 'rtl' ? 'تغيير التخطيط التراكمي' : 'Cumulative Layout Shift'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono">{webVitals.cls.toFixed(3)}</span>
                      <Badge className={getRatingColor(getPerformanceRating('webVitalsCLS', webVitals.cls))}>
                        {getPerformanceRating('webVitalsCLS', webVitals.cls)}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Database Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>{document.dir === 'rtl' ? 'إحصائيات قاعدة البيانات' : 'Database Statistics'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {databaseStats && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {document.dir === 'rtl' ? 'معدل إصابة التخزين المؤقت' : 'Cache Hit Ratio'}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-mono">{databaseStats.cache_hit_ratio.toFixed(1)}%</span>
                        <Badge className={databaseStats.cache_hit_ratio >= 90 ? getRatingColor('excellent') : 
                                        databaseStats.cache_hit_ratio >= 80 ? getRatingColor('good') : 
                                        getRatingColor('poor')}>
                          {databaseStats.cache_hit_ratio >= 90 ? 'excellent' : 
                           databaseStats.cache_hit_ratio >= 80 ? 'good' : 'poor'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {document.dir === 'rtl' ? 'الاستعلامات البطيئة' : 'Slow Queries'}
                      </span>
                      <span className="text-sm font-mono">{databaseStats.slow_queries_count}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {document.dir === 'rtl' ? 'الاتصالات النشطة' : 'Active Connections'}
                      </span>
                      <span className="text-sm font-mono">{databaseStats.active_connections}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Web Vitals Tab */}
        <TabsContent value="web-vitals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(webVitals).map(([key, value]) => {
              if (value === null) return null;
              
              const metricNames = {
                lcp: document.dir === 'rtl' ? 'أكبر رسم للمحتوى' : 'Largest Contentful Paint',
                fid: document.dir === 'rtl' ? 'تأخير الإدخال الأول' : 'First Input Delay',
                cls: document.dir === 'rtl' ? 'تغيير التخطيط التراكمي' : 'Cumulative Layout Shift',
                fcp: document.dir === 'rtl' ? 'أول رسم للمحتوى' : 'First Contentful Paint',
                ttfb: document.dir === 'rtl' ? 'الوقت للبايت الأول' : 'Time to First Byte',
              };

              const rating = key === 'cls' 
                ? getPerformanceRating('webVitalsCLS', value)
                : key === 'lcp' 
                ? getPerformanceRating('webVitalsLCP', value)
                : key === 'fid'
                ? getPerformanceRating('webVitalsFID', value)
                : 'good';

              return (
                <Card key={key}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {metricNames[key as keyof typeof metricNames]}
                      </span>
                      <Badge className={getRatingColor(rating)}>
                        {rating}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">
                      {key === 'cls' ? value.toFixed(3) : `${Math.round(value)}${key === 'cls' ? '' : 'ms'}`}
                    </div>
                    <Progress 
                      value={key === 'cls' ? Math.min(100, (value / 0.5) * 100) : Math.min(100, (value / thresholds[`webVitals${key.toUpperCase()}` as keyof typeof thresholds]) * 100)}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          {databaseStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{document.dir === 'rtl' ? 'أداء الاستعلامات' : 'Query Performance'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">{document.dir === 'rtl' ? 'متوسط وقت الاستعلام' : 'Average Query Time'}</span>
                      <span className="text-sm font-mono">{databaseStats.avg_query_time_ms.toFixed(2)}ms</span>
                    </div>
                    <Progress value={Math.min(100, (databaseStats.avg_query_time_ms / 100) * 100)} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">{document.dir === 'rtl' ? 'إجمالي الاستعلامات' : 'Total Queries'}</span>
                      <span className="text-sm font-mono">{databaseStats.total_queries_count.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">{document.dir === 'rtl' ? 'الاستعلامات البطيئة' : 'Slow Queries'}</span>
                      <span className="text-sm font-mono text-yellow-600">{databaseStats.slow_queries_count}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{document.dir === 'rtl' ? 'صحة النظام' : 'System Health'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">{document.dir === 'rtl' ? 'معدل إصابة التخزين المؤقت' : 'Cache Hit Ratio'}</span>
                      <span className="text-sm font-mono text-green-600">{databaseStats.cache_hit_ratio.toFixed(1)}%</span>
                    </div>
                    <Progress value={databaseStats.cache_hit_ratio} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">{document.dir === 'rtl' ? 'الاتصالات النشطة' : 'Active Connections'}</span>
                      <span className="text-sm font-mono">{databaseStats.active_connections}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {databaseStats?.top_slow_tables && databaseStats.top_slow_tables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{document.dir === 'rtl' ? 'أبطأ الجداول' : 'Slowest Tables'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {databaseStats.top_slow_tables.map((table, index) => (
                    <div key={table.table_name} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{index + 1}</span>
                        <span className="font-medium">{table.table_name}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{table.avg_time.toFixed(2)}ms</span>
                        <span>{table.query_count} queries</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {recentAlerts && recentAlerts.length > 0 ? (
            <div className="space-y-4">
              {recentAlerts.map((alert) => (
                <Alert key={alert.id} className={getAlertColor(alert.severity)}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>{alert.alert_type.replace(/_/g, ' ')}</span>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription className="mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">
                          {document.dir === 'rtl' ? 'المقياس:' : 'Metric:'} 
                        </span> {alert.metric_name}
                      </div>
                      <div>
                        <span className="font-medium">
                          {document.dir === 'rtl' ? 'القيمة:' : 'Value:'} 
                        </span> {alert.actual_value} / {alert.threshold_value}
                      </div>
                      <div>
                        <span className="font-medium">
                          {document.dir === 'rtl' ? 'الوقت:' : 'Time:'} 
                        </span> {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
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
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;