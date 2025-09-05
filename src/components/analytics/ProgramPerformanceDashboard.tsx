/**
 * Program-Wide Performance Reporting Dashboard
 * 
 * Comprehensive dashboard component for displaying analytics across all enrollments
 * in a program. Features comparative analysis, trend visualization, performance
 * metrics, and bilingual support with real-time data updates.
 * 
 * Key Features:
 * - Program-wide analytics with drill-down capabilities
 * - Comparative performance across students and therapists
 * - Interactive charts and visualizations
 * - Metric filtering and customization
 * - Real-time data updates and alerts
 * - Export functionality for reports
 * - Bilingual interface (Arabic RTL/English LTR)
 * 
 * @author BMad Development Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter
} from 'recharts';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Target,
  Award,
  Download,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
import { useI18n } from '../../hooks/useI18n';
import type {
  ProgressMetricDefinition,
  MetricCalculationResult,
  MetricComparison
} from '../../types/progress-metrics';
import type {
  ProgramTemplate,
  IndividualizedEnrollment
} from '../../types/individualized-enrollment';
import {
  individualProgressAnalyticsService
} from '../../services/analytics/individual-progress-analytics-service';
import {
  comparativeAnalyticsService
} from '../../services/analytics/comparative-analytics-service';
import {
  progressMetricConfigService
} from '../../services/analytics/progress-metric-configuration-service';

interface ProgramPerformanceDashboardProps {
  programTemplateId: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  onExportRequest?: (format: 'pdf' | 'excel' | 'csv') => void;
  onDrillDown?: (enrollmentId: string, metricId: string) => void;
}

interface ProgramAnalyticsSummary {
  total_enrollments: number;
  active_enrollments: number;
  completed_enrollments: number;
  average_program_duration_days: number;
  average_sessions_per_week: number;
  overall_satisfaction_rating: number;
  completion_rate_percentage: number;
  retention_rate_percentage: number;
  program_effectiveness_score: number;
}

interface EnrollmentPerformanceData {
  enrollment_id: string;
  student_name: string;
  student_name_ar: string;
  therapist_name: string;
  start_date: string;
  current_progress_percentage: number;
  key_metrics: Record<string, MetricCalculationResult>;
  trend_indicators: Record<string, 'improving' | 'declining' | 'stable'>;
  risk_flags: Array<{
    type: 'attendance' | 'progress' | 'engagement' | 'behavioral';
    severity: 'low' | 'medium' | 'high';
    message_ar: string;
    message_en: string;
  }>;
  last_session_date: string;
  next_review_date: string;
}

interface TherapistPerformanceData {
  therapist_id: string;
  therapist_name: string;
  enrollments_count: number;
  average_student_progress: number;
  session_completion_rate: number;
  student_satisfaction_rating: number;
  specialization_areas: string[];
  performance_trends: Record<string, number>;
}

const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

export const ProgramPerformanceDashboard: React.FC<ProgramPerformanceDashboardProps> = ({
  programTemplateId,
  dateRange,
  onExportRequest,
  onDrillDown
}) => {
  const { language, isRTL, t } = useI18n();
  const queryClient = useQueryClient();

  // State management
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'radar'>('bar');
  const [showInactiveEnrollments, setShowInactiveEnrollments] = useState(false);
  const [selectedTherapist, setSelectedTherapist] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch program template data
  const { data: programTemplate, isLoading: programLoading } = useQuery({
    queryKey: ['program-template', programTemplateId],
    queryFn: async () => {
      // Mock implementation - replace with actual API call
      const mockTemplate: ProgramTemplate = {
        id: programTemplateId,
        name_ar: 'برنامج النمو المتقدم',
        name_en: 'Advanced Development Program',
        description_ar: 'برنامج شامل لتنمية مهارات الأطفال',
        description_en: 'Comprehensive program for child development',
        category: 'autism',
        target_age_range: { min: 3, max: 12 },
        default_duration_weeks: 24,
        default_sessions_per_week: 2,
        default_goals: [],
        customization_options: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'system',
        is_active: true
      };
      return mockTemplate;
    },
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  // Fetch program metrics
  const { data: programMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['program-metrics', programTemplateId, refreshKey],
    queryFn: async () => {
      const result = await progressMetricConfigService.getMetricDefinitions(
        'program_specific',
        programTemplateId,
        true
      );
      return result.success ? result.metrics : [];
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch enrollments data
  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['program-enrollments', programTemplateId, dateRange, showInactiveEnrollments, refreshKey],
    queryFn: async () => {
      // Mock implementation - replace with actual API call
      const mockEnrollments: IndividualizedEnrollment[] = [
        {
          id: 'enrollment-1',
          student_id: 'student-1',
          program_template_id: programTemplateId,
          individual_start_date: '2025-08-01',
          individual_end_date: '2025-12-01',
          custom_schedule: {},
          assigned_therapist_id: 'therapist-1',
          program_modifications: {},
          enrollment_status: 'active',
          created_at: '2025-08-01T00:00:00Z',
          updated_at: '2025-08-15T00:00:00Z',
          created_by: 'admin-1',
          updated_by: 'admin-1'
        },
        {
          id: 'enrollment-2',
          student_id: 'student-2',
          program_template_id: programTemplateId,
          individual_start_date: '2025-07-15',
          individual_end_date: '2025-11-15',
          custom_schedule: {},
          assigned_therapist_id: 'therapist-2',
          program_modifications: {},
          enrollment_status: 'active',
          created_at: '2025-07-15T00:00:00Z',
          updated_at: '2025-08-20T00:00:00Z',
          created_by: 'admin-1',
          updated_by: 'therapist-2'
        }
      ];
      return mockEnrollments;
    },
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  // Fetch program analytics summary
  const { data: analyticsSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['program-analytics-summary', programTemplateId, dateRange, refreshKey],
    queryFn: async () => {
      // Mock implementation - replace with actual service call
      const mockSummary: ProgramAnalyticsSummary = {
        total_enrollments: 25,
        active_enrollments: 18,
        completed_enrollments: 7,
        average_program_duration_days: 168,
        average_sessions_per_week: 2.3,
        overall_satisfaction_rating: 4.6,
        completion_rate_percentage: 87.5,
        retention_rate_percentage: 92.8,
        program_effectiveness_score: 8.4
      };
      return mockSummary;
    },
    staleTime: 5 * 60 * 1000
  });

  // Fetch enrollment performance data
  const { data: enrollmentPerformance, isLoading: performanceLoading } = useQuery({
    queryKey: ['enrollment-performance', programTemplateId, selectedMetrics, dateRange, refreshKey],
    queryFn: async () => {
      if (!enrollmentsData || enrollmentsData.length === 0) return [];
      
      // Mock performance data generation
      const mockPerformance: EnrollmentPerformanceData[] = enrollmentsData.map(enrollment => ({
        enrollment_id: enrollment.id,
        student_name: `Student ${enrollment.student_id.slice(-1)}`,
        student_name_ar: `الطالب ${enrollment.student_id.slice(-1)}`,
        therapist_name: `Therapist ${enrollment.assigned_therapist_id?.slice(-1) || '1'}`,
        start_date: enrollment.individual_start_date,
        current_progress_percentage: Math.random() * 100,
        key_metrics: {},
        trend_indicators: {
          'communication': Math.random() > 0.6 ? 'improving' : Math.random() > 0.3 ? 'stable' : 'declining',
          'social_interaction': Math.random() > 0.6 ? 'improving' : Math.random() > 0.3 ? 'stable' : 'declining',
          'behavioral': Math.random() > 0.6 ? 'improving' : Math.random() > 0.3 ? 'stable' : 'declining'
        },
        risk_flags: [],
        last_session_date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        next_review_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }));
      
      return mockPerformance;
    },
    enabled: !!enrollmentsData,
    staleTime: 3 * 60 * 1000
  });

  // Fetch therapist performance data
  const { data: therapistPerformance, isLoading: therapistLoading } = useQuery({
    queryKey: ['therapist-performance', programTemplateId, dateRange, refreshKey],
    queryFn: async () => {
      // Mock therapist performance data
      const mockTherapists: TherapistPerformanceData[] = [
        {
          therapist_id: 'therapist-1',
          therapist_name: 'د. أحمد محمد',
          enrollments_count: 8,
          average_student_progress: 78.5,
          session_completion_rate: 94.2,
          student_satisfaction_rating: 4.7,
          specialization_areas: ['autism', 'behavioral_therapy'],
          performance_trends: { '2025-07': 75.2, '2025-08': 78.5, '2025-09': 80.1 }
        },
        {
          therapist_id: 'therapist-2',
          therapist_name: 'د. فاطمة علي',
          enrollments_count: 6,
          average_student_progress: 82.3,
          session_completion_rate: 96.8,
          student_satisfaction_rating: 4.9,
          specialization_areas: ['speech_therapy', 'communication'],
          performance_trends: { '2025-07': 79.1, '2025-08': 82.3, '2025-09': 84.6 }
        }
      ];
      return mockTherapists;
    },
    staleTime: 10 * 60 * 1000
  });

  // Initialize selected metrics
  useEffect(() => {
    if (programMetrics && programMetrics.length > 0 && selectedMetrics.length === 0) {
      setSelectedMetrics(programMetrics.slice(0, 3).map(m => m.id));
    }
  }, [programMetrics, selectedMetrics.length]);

  // Computed data for charts
  const chartData = useMemo(() => {
    if (!enrollmentPerformance) return [];
    
    return enrollmentPerformance.map(enrollment => ({
      name: language === 'ar' ? enrollment.student_name_ar : enrollment.student_name,
      progress: Math.round(enrollment.current_progress_percentage),
      communication: Math.random() * 100,
      social: Math.random() * 100,
      behavioral: Math.random() * 100,
      enrollment_id: enrollment.enrollment_id
    }));
  }, [enrollmentPerformance, language]);

  // Trend data for line charts
  const trendData = useMemo(() => {
    const months = ['يوليو', 'أغسطس', 'سبتمبر'];
    const monthsEn = ['July', 'August', 'September'];
    
    return (language === 'ar' ? months : monthsEn).map((month, index) => ({
      month,
      program_average: 75 + index * 3 + Math.random() * 5,
      completion_rate: 85 + index * 2 + Math.random() * 3,
      satisfaction: 4.4 + index * 0.1 + Math.random() * 0.2
    }));
  }, [language]);

  // Handlers
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    queryClient.invalidateQueries({ queryKey: ['program-analytics-summary'] });
    queryClient.invalidateQueries({ queryKey: ['enrollment-performance'] });
    queryClient.invalidateQueries({ queryKey: ['therapist-performance'] });
  }, [queryClient]);

  const handleExport = useCallback((format: 'pdf' | 'excel' | 'csv') => {
    onExportRequest?.(format);
  }, [onExportRequest]);

  const handleMetricToggle = useCallback((metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  }, []);

  const handleDrillDownClick = useCallback((enrollmentId: string, metricId?: string) => {
    onDrillDown?.(enrollmentId, metricId || selectedMetrics[0] || '');
  }, [onDrillDown, selectedMetrics]);

  if (programLoading || metricsLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className={`${isRTL ? 'mr-3' : 'ml-3'} text-lg`}>
          {t('loading_program_analytics', 'جاري تحميل تحليلات البرنامج')}
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {programTemplate 
              ? (language === 'ar' ? programTemplate.name_ar : programTemplate.name_en)
              : t('program_performance_dashboard', 'لوحة قياس أداء البرنامج')
            }
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('comprehensive_program_analytics', 'تحليلات شاملة لأداء البرنامج والطلاب المسجلين')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={summaryLoading}
          >
            <RefreshCw className={`w-4 h-4 ${summaryLoading ? 'animate-spin' : ''} ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('refresh', 'تحديث')}
          </Button>
          
          <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">{t('bar_chart', 'مخطط أعمدة')}</SelectItem>
              <SelectItem value="line">{t('line_chart', 'مخطط خطي')}</SelectItem>
              <SelectItem value="pie">{t('pie_chart', 'مخطط دائري')}</SelectItem>
              <SelectItem value="radar">{t('radar_chart', 'مخطط رادار')}</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => handleExport('pdf')}
            size="sm"
          >
            <Download className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('export', 'تصدير')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {analyticsSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} text-blue-600`} />
                {t('total_enrollments', 'إجمالي التسجيلات')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsSummary.total_enrollments}</div>
              <div className="text-sm text-muted-foreground">
                {analyticsSummary.active_enrollments} {t('active', 'نشط')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Target className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} text-green-600`} />
                {t('completion_rate', 'معدل الإنجاز')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsSummary.completion_rate_percentage}%</div>
              <div className="text-sm text-muted-foreground flex items-center">
                <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
                +2.3% {t('from_last_month', 'من الشهر الماضي')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Award className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} text-yellow-600`} />
                {t('satisfaction_rating', 'تقييم الرضا')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsSummary.overall_satisfaction_rating}/5</div>
              <div className="text-sm text-muted-foreground">
                {t('based_on_parent_feedback', 'بناءً على تقييم الأهالي')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} text-purple-600`} />
                {t('program_effectiveness', 'فعالية البرنامج')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsSummary.program_effectiveness_score}/10</div>
              <div className="text-sm text-muted-foreground">
                {t('composite_score', 'النتيجة المركبة')}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('overview', 'نظرة عامة')}</TabsTrigger>
          <TabsTrigger value="students">{t('students', 'الطلاب')}</TabsTrigger>
          <TabsTrigger value="therapists">{t('therapists', 'المعالجين')}</TabsTrigger>
          <TabsTrigger value="metrics">{t('metrics', 'المقاييس')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progress Trends */}
            <Card>
              <CardHeader>
                <CardTitle>{t('progress_trends', 'اتجاهات التقدم')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="program_average" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name={t('program_average', 'متوسط البرنامج')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completion_rate" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name={t('completion_rate', 'معدل الإنجاز')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Student Progress Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{t('progress_distribution', 'توزيع التقدم')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  {chartType === 'bar' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="progress" fill="#3b82f6" name={t('progress_percentage', 'نسبة التقدم')} />
                    </BarChart>
                  ) : chartType === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={chartData.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="progress"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {chartData.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="progress" fill="#3b82f6" name={t('progress_percentage', 'نسبة التقدم')} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('student_performance', 'أداء الطلاب')}</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInactiveEnrollments(!showInactiveEnrollments)}
              >
                {showInactiveEnrollments ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showInactiveEnrollments 
                  ? t('hide_inactive', 'إخفاء غير النشط') 
                  : t('show_inactive', 'عرض غير النشط')
                }
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {enrollmentPerformance && enrollmentPerformance.map((enrollment) => (
              <Card key={enrollment.enrollment_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>
                          {language === 'ar' 
                            ? enrollment.student_name_ar.charAt(0)
                            : enrollment.student_name.charAt(0)
                          }
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <h4 className="font-medium">
                          {language === 'ar' ? enrollment.student_name_ar : enrollment.student_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {t('therapist', 'المعالج')}: {enrollment.therapist_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('started', 'بدأ في')}: {enrollment.start_date}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.round(enrollment.current_progress_percentage)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('progress', 'التقدم')}
                        </div>
                      </div>

                      <div className="flex gap-1">
                        {Object.entries(enrollment.trend_indicators).map(([metric, trend]) => (
                          <Badge
                            key={metric}
                            variant={
                              trend === 'improving' ? 'default' :
                              trend === 'declining' ? 'destructive' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {trend === 'improving' ? <TrendingUp className="w-3 h-3" /> :
                             trend === 'declining' ? <TrendingDown className="w-3 h-3" /> :
                             '→'}
                          </Badge>
                        ))}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDrillDownClick(enrollment.enrollment_id)}
                      >
                        {t('details', 'التفاصيل')}
                      </Button>
                    </div>
                  </div>

                  {enrollment.risk_flags.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">
                          {t('attention_required', 'يتطلب انتباه')}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        {enrollment.risk_flags.map((flag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {language === 'ar' ? flag.message_ar : flag.message_en}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Therapists Tab */}
        <TabsContent value="therapists" className="space-y-6">
          <h3 className="text-lg font-semibold">{t('therapist_performance', 'أداء المعالجين')}</h3>
          
          <div className="grid gap-4">
            {therapistPerformance && therapistPerformance.map((therapist) => (
              <Card key={therapist.therapist_id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>{therapist.therapist_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <h4 className="font-medium">{therapist.therapist_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {therapist.enrollments_count} {t('students', 'طلاب')}
                        </p>
                        <div className="flex gap-2 mt-1">
                          {therapist.specialization_areas.map((area, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {t(area, area)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {Math.round(therapist.average_student_progress)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('avg_progress', 'متوسط التقدم')}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {therapist.student_satisfaction_rating}/5
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('satisfaction', 'الرضا')}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('program_metrics', 'مقاييس البرنامج')}</h3>
            <Button variant="outline" size="sm">
              <Settings className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('customize_metrics', 'تخصيص المقاييس')}
            </Button>
          </div>

          <div className="grid gap-4">
            {programMetrics && programMetrics.map((metric) => (
              <Card key={metric.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(metric.id)}
                        onChange={() => handleMetricToggle(metric.id)}
                        className="w-4 h-4"
                      />
                      
                      <div>
                        <h4 className="font-medium">
                          {language === 'ar' ? metric.name_ar : metric.name_en}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? metric.description_ar : metric.description_en}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {t(metric.metric_type, metric.metric_type)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {t(metric.data_source, metric.data_source)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};