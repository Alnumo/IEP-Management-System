/**
 * @file AttendanceAnalyticsDashboard.tsx
 * @description Comprehensive attendance analytics dashboard for dual-level QR attendance system
 * @version 3.2.1
 * @author Dev Agent - Story 3.2
 */

import { useState, useEffect } from 'react';
import { Calendar, Users, Clock, MapPin, TrendingUp, Filter, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAttendanceAnalytics, useCurrentFacilityAttendance, useAttendanceTrends } from '@/hooks/useAttendance';
import { toast } from 'sonner';

interface AttendanceAnalyticsDashboardProps {
  className?: string;
}

interface AttendanceFilters {
  dateRange: {
    from: Date;
    to: Date;
  };
  studentId?: string;
  therapistId?: string;
  programType?: string;
  eventType?: 'center_check_in' | 'center_check_out' | 'session_check_in' | 'all';
  location?: string;
}

export const AttendanceAnalyticsDashboard = ({ className }: AttendanceAnalyticsDashboardProps) => {
  const { language, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<AttendanceFilters>({
    dateRange: {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      to: new Date()
    },
    eventType: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data hooks
  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useAttendanceAnalytics(filters);
  const { data: currentAttendance = [], isLoading: currentLoading, refetch: refetchCurrent } = useCurrentFacilityAttendance();
  const { data: trendsData, isLoading: trendsLoading } = useAttendanceTrends(filters.dateRange);

  // Auto-refresh current attendance every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchCurrent();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetchCurrent]);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchAnalytics(), refetchCurrent()]);
      toast.success(language === 'ar' ? 'تم تحديث البيانات' : 'Data refreshed');
    } catch (error) {
      toast.error(language === 'ar' ? 'خطأ في تحديث البيانات' : 'Error refreshing data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportData = () => {
    // Export analytics data to CSV
    const csvData = generateCSVReport(analyticsData, language);
    downloadCSV(csvData, `attendance-report-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(language === 'ar' ? 'تم تصدير التقرير' : 'Report exported');
  };

  const filteredCurrentAttendance = currentAttendance.filter(record => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      record.student_name_en?.toLowerCase().includes(searchLower) ||
      record.student_name_ar?.toLowerCase().includes(searchLower) ||
      record.scan_location?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className={`space-y-6 ${className || ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {language === 'ar' ? 'تحليل الحضور والغياب' : 'Attendance Analytics'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'نظام متقدم لتتبع وتحليل حضور الطلاب والجلسات' 
              : 'Advanced attendance tracking and analytics system'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportData}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {language === 'ar' ? 'تصدير' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {language === 'ar' ? 'المرشحات' : 'Filters'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'نطاق التاريخ' : 'Date Range'}
              </Label>
              <DatePickerWithRange
                value={filters.dateRange}
                onChange={(range) => setFilters(prev => ({ ...prev, dateRange: range }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'نوع الحدث' : 'Event Type'}
              </Label>
              <Select 
                value={filters.eventType} 
                onValueChange={(value: any) => setFilters(prev => ({ ...prev, eventType: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === 'ar' ? 'جميع الأحداث' : 'All Events'}
                  </SelectItem>
                  <SelectItem value="center_check_in">
                    {language === 'ar' ? 'دخول المركز' : 'Center Check-in'}
                  </SelectItem>
                  <SelectItem value="center_check_out">
                    {language === 'ar' ? 'خروج المركز' : 'Center Check-out'}
                  </SelectItem>
                  <SelectItem value="session_check_in">
                    {language === 'ar' ? 'حضور الجلسة' : 'Session Check-in'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'الموقع' : 'Location'}
              </Label>
              <Select 
                value={filters.location || ''} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, location: value || undefined }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={language === 'ar' ? 'جميع المواقع' : 'All Locations'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    {language === 'ar' ? 'جميع المواقع' : 'All Locations'}
                  </SelectItem>
                  <SelectItem value="Main Entrance">
                    {language === 'ar' ? 'المدخل الرئيسي' : 'Main Entrance'}
                  </SelectItem>
                  <SelectItem value="Emergency Exit">
                    {language === 'ar' ? 'مخرج الطوارئ' : 'Emergency Exit'}
                  </SelectItem>
                  <SelectItem value="Room 101">Room 101</SelectItem>
                  <SelectItem value="Room 102">Room 102</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'البحث' : 'Search'}
              </Label>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'البحث عن طالب...' : 'Search for student...'}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="realtime" className="gap-2">
            <Users className="h-4 w-4" />
            {language === 'ar' ? 'الحضور الحالي' : 'Current Attendance'}
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <Clock className="h-4 w-4" />
            {language === 'ar' ? 'الاتجاهات' : 'Trends'}
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-2">
            <MapPin className="h-4 w-4" />
            {language === 'ar' ? 'المواقع' : 'Locations'}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <OverviewMetrics 
            data={analyticsData} 
            loading={analyticsLoading} 
            language={language}
          />
        </TabsContent>

        {/* Real-time Tab */}
        <TabsContent value="realtime" className="space-y-4">
          <RealTimeAttendance 
            data={filteredCurrentAttendance}
            loading={currentLoading}
            language={language}
            searchTerm={searchTerm}
          />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <AttendanceTrends 
            data={trendsData}
            loading={trendsLoading}
            language={language}
            dateRange={filters.dateRange}
          />
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-4">
          <LocationAnalytics 
            data={analyticsData}
            loading={analyticsLoading}
            language={language}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Overview Metrics Component
const OverviewMetrics = ({ data, loading, language }: any) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: language === 'ar' ? 'إجمالي الحضور اليوم' : 'Total Attendance Today',
      value: data?.total_attendance_today || 0,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: language === 'ar' ? 'الحضور الحالي' : 'Currently Present',
      value: data?.currently_present || 0,
      icon: Clock,
      color: 'text-green-600'
    },
    {
      title: language === 'ar' ? 'الجلسات النشطة' : 'Active Sessions',
      value: data?.active_sessions || 0,
      icon: Calendar,
      color: 'text-purple-600'
    },
    {
      title: language === 'ar' ? 'معدل الحضور' : 'Attendance Rate',
      value: `${data?.attendance_rate || 0}%`,
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </p>
                <p className="text-2xl font-bold">{metric.value}</p>
              </div>
              <metric.icon className={`h-8 w-8 ${metric.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Real-time Attendance Component
const RealTimeAttendance = ({ data, loading, language, searchTerm }: any) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {language === 'ar' ? 'الحضور الحالي' : 'Currently in Facility'}
          </span>
          <Badge variant="outline">
            {data.length} {language === 'ar' ? 'طالب' : 'students'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>{language === 'ar' ? 'لا يوجد طلاب في المركز حالياً' : 'No students currently in facility'}</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {data.map((record: any) => (
              <div key={record.student_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">
                      {language === 'ar' ? record.student_name_ar : record.student_name_en}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(record.check_in_time).toLocaleTimeString()}
                      </span>
                      {record.scan_location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {record.scan_location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'مدة البقاء' : 'Duration'}
                  </div>
                  <div className="font-semibold">
                    {record.minutes_in_facility} {language === 'ar' ? 'دقيقة' : 'min'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Attendance Trends Component  
const AttendanceTrends = ({ data, loading, language, dateRange }: any) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {language === 'ar' ? 'اتجاهات الحضور' : 'Attendance Trends'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 animate-pulse bg-gray-200 rounded"></div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>{language === 'ar' ? 'رسم بياني لاتجاهات الحضور' : 'Attendance trends chart would go here'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Location Analytics Component
const LocationAnalytics = ({ data, loading, language }: any) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {language === 'ar' ? 'تحليل المواقع' : 'Location Analytics'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 animate-pulse bg-gray-200 rounded"></div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <MapPin className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>{language === 'ar' ? 'تحليل استخدام المواقع' : 'Location usage analytics would go here'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper functions
const generateCSVReport = (data: any, language: string) => {
  // Generate CSV data from analytics
  const headers = language === 'ar' 
    ? ['التاريخ', 'إجمالي الحضور', 'الجلسات النشطة', 'معدل الحضور']
    : ['Date', 'Total Attendance', 'Active Sessions', 'Attendance Rate'];
    
  return [headers.join(',')].join('\n');
};

const downloadCSV = (csvData: string, filename: string) => {
  const blob = new Blob([csvData], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};