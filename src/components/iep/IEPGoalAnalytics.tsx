import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  BarChart3,
  PieChart,
  Calendar,
  Award,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as PieChartComponent, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { useIEPGoals } from '@/hooks/useIEPGoals';
import { 
  GoalDomain, 
  GoalStatus, 
  ProgressStatus,
  IEPGoal
} from '@/types/iep';
import { ProgressCalculationResult } from '@/services/iep-goal-calculations';

interface IEPGoalAnalyticsProps {
  iepId: string;
  language: 'ar' | 'en';
  className?: string;
}

interface AnalyticsFilters {
  domain?: GoalDomain;
  status?: GoalStatus;
  dateRange?: {
    from: Date;
    to: Date;
  };
  progressRange?: {
    min: number;
    max: number;
  };
}

interface DomainPerformance {
  domain: GoalDomain;
  totalGoals: number;
  averageProgress: number;
  achievedGoals: number;
  onTrackGoals: number;
  riskGoals: number;
}

interface ProgressTrend {
  date: string;
  overallProgress: number;
  activeGoals: number;
  achievedGoals: number;
  onTrackPercentage: number;
}

const IEPGoalAnalytics: React.FC<IEPGoalAnalyticsProps> = ({
  iepId,
  language,
  className
}) => {
  const { t } = useTranslation();
  const isRTL = language === 'ar';
  
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'domains' | 'predictions'>('overview');

  const {
    goals,
    goalStats,
    goalProgressSummaries,
    goalsLoading,
    refreshData
  } = useIEPGoals(iepId, filters);

  // =============================================================================
  // CALCULATED ANALYTICS DATA
  // =============================================================================

  const domainPerformanceData = useMemo<DomainPerformance[]>(() => {
    const domainMap = new Map<GoalDomain, DomainPerformance>();

    goalProgressSummaries.forEach(({ domain, progressResult }) => {
      if (!domainMap.has(domain)) {
        domainMap.set(domain, {
          domain,
          totalGoals: 0,
          averageProgress: 0,
          achievedGoals: 0,
          onTrackGoals: 0,
          riskGoals: 0,
        });
      }

      const domainData = domainMap.get(domain)!;
      domainData.totalGoals++;
      domainData.averageProgress += progressResult.currentProgress;
      
      if (progressResult.currentProgress >= 100) domainData.achievedGoals++;
      if (progressResult.isOnTrack) domainData.onTrackGoals++;
      if (progressResult.currentProgress < 40) domainData.riskGoals++;
    });

    return Array.from(domainMap.values()).map(data => ({
      ...data,
      averageProgress: Math.round(data.averageProgress / data.totalGoals)
    }));
  }, [goalProgressSummaries]);

  const progressTrendData = useMemo<ProgressTrend[]>(() => {
    // Mock trend data - in real implementation, this would come from historical data
    const mockTrends: ProgressTrend[] = [
      {
        date: '2024-01-01',
        overallProgress: 15,
        activeGoals: goalStats.activeGoals,
        achievedGoals: 0,
        onTrackPercentage: 80
      },
      {
        date: '2024-02-01',
        overallProgress: 28,
        activeGoals: goalStats.activeGoals,
        achievedGoals: 1,
        onTrackPercentage: 85
      },
      {
        date: '2024-03-01',
        overallProgress: 42,
        activeGoals: goalStats.activeGoals,
        achievedGoals: 2,
        onTrackPercentage: 90
      },
      {
        date: '2024-04-01',
        overallProgress: 58,
        activeGoals: goalStats.activeGoals,
        achievedGoals: 3,
        onTrackPercentage: 88
      },
      {
        date: '2024-05-01',
        overallProgress: 72,
        activeGoals: goalStats.activeGoals - 1,
        achievedGoals: goalStats.achievedGoals,
        onTrackPercentage: 92
      }
    ];

    return mockTrends;
  }, [goalStats]);

  const statusDistributionData = useMemo(() => {
    return [
      { name: t('status.active'), value: goalStats.activeGoals, color: '#4ABAD3' },
      { name: t('status.achieved'), value: goalStats.achievedGoals, color: '#4ADB7A' },
      { name: t('status.modified'), value: goalStats.modifiedGoals, color: '#EAB308' },
      { name: t('status.discontinued'), value: goalStats.discontinuedGoals, color: '#EF4444' },
    ].filter(item => item.value > 0);
  }, [goalStats, t]);

  const masteryPredictions = useMemo(() => {
    return goalProgressSummaries
      .filter(summary => summary.masteryPrediction.predictedMasteryDate)
      .sort((a, b) => {
        const dateA = a.masteryPrediction.predictedMasteryDate!.getTime();
        const dateB = b.masteryPrediction.predictedMasteryDate!.getTime();
        return dateA - dateB;
      })
      .slice(0, 5); // Top 5 goals closest to mastery
  }, [goalProgressSummaries]);

  const riskGoals = useMemo(() => {
    return goalProgressSummaries.filter(summary => 
      !summary.progressResult.isOnTrack || 
      summary.progressResult.trendDirection === 'declining'
    );
  }, [goalProgressSummaries]);

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  const handleFilterChange = (key: keyof AnalyticsFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExportAnalytics = () => {
    // Export analytics data to PDF/Excel
    console.log('Exporting analytics...');
  };

  const getStatusBadgeVariant = (status: GoalStatus) => {
    switch (status) {
      case 'active': return 'default';
      case 'achieved': return 'success';
      case 'modified': return 'warning';
      case 'discontinued': return 'destructive';
      default: return 'secondary';
    }
  };

  const getProgressStatusColor = (status: ProgressStatus) => {
    switch (status) {
      case 'mastered': return 'text-green-600';
      case 'progressing': return 'text-blue-600';
      case 'introduced': return 'text-yellow-600';
      case 'not_started': return 'text-gray-500';
      case 'maintained': return 'text-green-500';
      case 'discontinued': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getDomainNameTranslation = (domain: GoalDomain) => {
    const domainTranslations: Record<GoalDomain, { ar: string; en: string }> = {
      academic_reading: { ar: 'القراءة الأكاديمية', en: 'Academic Reading' },
      academic_writing: { ar: 'الكتابة الأكاديمية', en: 'Academic Writing' },
      academic_math: { ar: 'الرياضيات الأكاديمية', en: 'Academic Math' },
      academic_science: { ar: 'العلوم الأكاديمية', en: 'Academic Science' },
      communication_expressive: { ar: 'التواصل التعبيري', en: 'Expressive Communication' },
      communication_receptive: { ar: 'التواصل الاستقبالي', en: 'Receptive Communication' },
      communication_social: { ar: 'التواصل الاجتماعي', en: 'Social Communication' },
      behavioral_social: { ar: 'السلوك الاجتماعي', en: 'Social Behavior' },
      behavioral_attention: { ar: 'الانتباه السلوكي', en: 'Behavioral Attention' },
      behavioral_self_regulation: { ar: 'تنظيم الذات السلوكي', en: 'Behavioral Self-Regulation' },
      functional_daily_living: { ar: 'مهارات الحياة اليومية', en: 'Daily Living Skills' },
      functional_mobility: { ar: 'الحركة الوظيفية', en: 'Functional Mobility' },
      functional_self_care: { ar: 'الرعاية الذاتية', en: 'Self-Care' },
      motor_fine: { ar: 'المهارات الحركية الدقيقة', en: 'Fine Motor Skills' },
      motor_gross: { ar: 'المهارات الحركية الكبيرة', en: 'Gross Motor Skills' },
      vocational: { ar: 'المهني', en: 'Vocational' },
      transition: { ar: 'الانتقال', en: 'Transition' }
    };
    
    return domainTranslations[domain]?.[language] || domain;
  };

  if (goalsLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header and Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('analytics.goal_analytics')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('analytics.comprehensive_analysis')}
          </p>
        </div>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('actions.refresh')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportAnalytics}>
            <Download className="h-4 w-4 mr-2" />
            {t('actions.export')}
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('stats.total_goals')}
                </p>
                <p className="text-2xl font-bold">{goalStats.totalGoals}</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('stats.average_progress')}
                </p>
                <p className="text-2xl font-bold">{goalStats.averageProgress}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <Progress value={goalStats.averageProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('stats.on_track')}
                </p>
                <p className="text-2xl font-bold">{goalStats.onTrackGoals}</p>
                <p className="text-xs text-green-600">
                  {goalStats.totalGoals > 0 ? Math.round((goalStats.onTrackGoals / goalStats.totalGoals) * 100) : 0}% {t('common.of_total')}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('stats.at_risk')}
                </p>
                <p className="text-2xl font-bold">{riskGoals.length}</p>
                <p className="text-xs text-red-600">
                  {t('stats.need_attention')}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="progress">{t('tabs.progress_trends')}</TabsTrigger>
          <TabsTrigger value="domains">{t('tabs.domain_analysis')}</TabsTrigger>
          <TabsTrigger value="predictions">{t('tabs.predictions')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <PieChart className="h-5 w-5" />
                  {t('charts.status_distribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChartComponent>
                    <Pie
                      data={statusDistributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                    >
                      {statusDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChartComponent>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk Goals */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  {t('analytics.goals_at_risk')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {riskGoals.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      {t('analytics.no_risk_goals')}
                    </p>
                  ) : (
                    riskGoals.slice(0, 5).map(({ goalId, goalNumber, domain, progressResult }) => (
                      <div key={goalId} className={`flex items-center justify-between p-3 border rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={isRTL ? 'text-right' : ''}>
                          <p className="font-medium">
                            {t('goal.goal_number', { number: goalNumber })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getDomainNameTranslation(domain)}
                          </p>
                        </div>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Progress value={progressResult.currentProgress} className="w-20" />
                          <span className="text-sm font-medium min-w-[3rem]">
                            {Math.round(progressResult.currentProgress)}%
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Progress Trends Tab */}
        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <TrendingUp className="h-5 w-5" />
                {t('charts.progress_over_time')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={progressTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="overallProgress" 
                    stroke="#4ABAD3" 
                    strokeWidth={2}
                    name={t('charts.overall_progress')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="onTrackPercentage" 
                    stroke="#4ADB7A" 
                    strokeWidth={2}
                    name={t('charts.on_track_percentage')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Domain Analysis Tab */}
        <TabsContent value="domains" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <BarChart3 className="h-5 w-5" />
                {t('charts.domain_performance')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {domainPerformanceData.map((domain) => (
                  <div key={domain.domain} className={`flex items-center justify-between p-4 border rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={isRTL ? 'text-right' : ''}>
                      <p className="font-medium">{getDomainNameTranslation(domain.domain)}</p>
                      <div className={`flex items-center gap-4 text-sm text-muted-foreground mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span>{domain.totalGoals} {t('common.goals')}</span>
                        <span>{domain.achievedGoals} {t('common.achieved')}</span>
                        <span>{domain.onTrackGoals} {t('common.on_track')}</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Progress value={domain.averageProgress} className="w-32" />
                      <span className="text-sm font-medium min-w-[3rem]">
                        {domain.averageProgress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mastery Predictions */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Award className="h-5 w-5" />
                  {t('analytics.upcoming_masteries')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {masteryPredictions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      {t('analytics.no_predictions')}
                    </p>
                  ) : (
                    masteryPredictions.map(({ goalId, goalNumber, domain, masteryPrediction }) => (
                      <div key={goalId} className={`flex items-center justify-between p-3 border rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={isRTL ? 'text-right' : ''}>
                          <p className="font-medium">
                            {t('goal.goal_number', { number: goalNumber })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getDomainNameTranslation(domain)}
                          </p>
                        </div>
                        <div className={isRTL ? 'text-right' : ''}>
                          <p className="text-sm font-medium">
                            {masteryPrediction.predictedMasteryDate?.toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(masteryPrediction.probabilityOfMastery)}% {t('common.probability')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <AlertTriangle className="h-5 w-5" />
                  {t('analytics.recommendations')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {goalProgressSummaries
                    .filter(summary => summary.progressResult.recommendedAction !== 'continue_current_intervention')
                    .slice(0, 5)
                    .map(({ goalId, goalNumber, domain, progressResult }) => (
                      <div key={goalId} className={`p-3 border rounded-lg ${isRTL ? 'text-right' : ''}`}>
                        <p className="font-medium">
                          {t('goal.goal_number', { number: goalNumber })} - {getDomainNameTranslation(domain)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t(`recommendations.${progressResult.recommendedAction}`)}
                        </p>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IEPGoalAnalytics;