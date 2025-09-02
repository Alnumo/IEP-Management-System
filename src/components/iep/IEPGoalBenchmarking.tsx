import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  Award,
  Filter,
  Download,
  Calendar,
  Zap,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter
} from 'recharts';

import { useIEPGoals } from '@/hooks/useIEPGoals';
import { 
  GoalDomain, 
  GoalStatus, 
  IEPGoal
} from '@/types/iep';

interface IEPGoalBenchmarkingProps {
  iepId: string;
  language: 'ar' | 'en';
  className?: string;
}

interface BenchmarkFilters {
  domain?: GoalDomain;
  ageGroup?: 'early_childhood' | 'elementary' | 'middle_school' | 'high_school';
  disabilityCategory?: string;
  timeframe?: 'current_year' | 'last_year' | 'all_time';
  comparisonType?: 'peer_group' | 'district_average' | 'state_standards';
}

interface PeerComparison {
  domain: GoalDomain;
  studentProgress: number;
  peerAverage: number;
  districtAverage: number;
  percentile: number;
  progressVelocity: number;
  peerVelocity: number;
  recommendation: string;
}

interface BenchmarkMetrics {
  overallPerformance: {
    studentScore: number;
    peerAverage: number;
    districtAverage: number;
    percentile: number;
  };
  domainPerformance: PeerComparison[];
  progressVelocity: {
    current: number;
    target: number;
    peerAverage: number;
  };
  achievementPrediction: {
    onTrackForGraduation: boolean;
    expectedOutcomes: string[];
    riskFactors: string[];
  };
}

interface HistoricalTrend {
  period: string;
  studentProgress: number;
  peerAverage: number;
  districtAverage: number;
}

const IEPGoalBenchmarking: React.FC<IEPGoalBenchmarkingProps> = ({
  iepId,
  language,
  className
}) => {
  const { t } = useTranslation();
  const isRTL = language === 'ar';
  
  const [filters, setFilters] = useState<BenchmarkFilters>({
    ageGroup: 'elementary',
    timeframe: 'current_year',
    comparisonType: 'peer_group'
  });
  
  const [activeTab, setActiveTab] = useState<'overview' | 'domains' | 'trends' | 'predictions'>('overview');

  const {
    goals,
    goalStats,
    goalProgressSummaries,
    goalsLoading
  } = useIEPGoals(iepId);

  // =============================================================================
  // MOCK BENCHMARK DATA (In real implementation, this would come from API)
  // =============================================================================

  const benchmarkMetrics = useMemo<BenchmarkMetrics>(() => {
    const domains: GoalDomain[] = [
      'academic_reading',
      'academic_writing', 
      'academic_math',
      'communication_expressive',
      'communication_receptive',
      'behavioral_social'
    ];

    const domainPerformance: PeerComparison[] = domains.map(domain => {
      const domainGoals = goals.filter(g => g.domain === domain);
      const avgProgress = domainGoals.length > 0 
        ? domainGoals.reduce((sum, g) => sum + g.current_progress_percentage, 0) / domainGoals.length
        : 0;
      
      // Mock peer and district data
      const peerAverage = Math.max(30, Math.min(85, avgProgress + Math.random() * 20 - 10));
      const districtAverage = Math.max(40, Math.min(90, avgProgress + Math.random() * 15 - 7.5));
      const percentile = Math.round(Math.random() * 100);

      return {
        domain,
        studentProgress: Math.round(avgProgress),
        peerAverage: Math.round(peerAverage),
        districtAverage: Math.round(districtAverage),
        percentile,
        progressVelocity: Math.round(Math.random() * 10 + 2),
        peerVelocity: Math.round(Math.random() * 8 + 3),
        recommendation: avgProgress > peerAverage ? 'maintain_pace' : 'increase_intensity'
      };
    });

    const overallScore = Math.round(goalStats.averageProgress);
    const overallPeerAverage = Math.round(domainPerformance.reduce((sum, d) => sum + d.peerAverage, 0) / domainPerformance.length);
    const overallDistrictAverage = Math.round(domainPerformance.reduce((sum, d) => sum + d.districtAverage, 0) / domainPerformance.length);

    return {
      overallPerformance: {
        studentScore: overallScore,
        peerAverage: overallPeerAverage,
        districtAverage: overallDistrictAverage,
        percentile: Math.round((overallScore / overallDistrictAverage) * 100)
      },
      domainPerformance,
      progressVelocity: {
        current: 3.2,
        target: 4.0,
        peerAverage: 2.8
      },
      achievementPrediction: {
        onTrackForGraduation: overallScore > 60,
        expectedOutcomes: overallScore > 70 
          ? ['Independent living skills', 'Post-secondary education readiness', 'Competitive employment potential']
          : ['Supported living arrangement', 'Vocational training readiness', 'Community integration'],
        riskFactors: overallScore < 50 
          ? ['Below peer performance', 'Slow progress velocity', 'Multiple domain challenges']
          : []
      }
    };
  }, [goals, goalStats]);

  const historicalTrends = useMemo<HistoricalTrend[]>(() => {
    return [
      {
        period: 'Q1 2024',
        studentProgress: 25,
        peerAverage: 30,
        districtAverage: 35
      },
      {
        period: 'Q2 2024',
        studentProgress: 42,
        peerAverage: 45,
        districtAverage: 50
      },
      {
        period: 'Q3 2024',
        studentProgress: 58,
        peerAverage: 60,
        districtAverage: 62
      },
      {
        period: 'Q4 2024',
        studentProgress: goalStats.averageProgress || 65,
        peerAverage: 68,
        districtAverage: 70
      }
    ];
  }, [goalStats.averageProgress]);

  const radarChartData = useMemo(() => {
    return benchmarkMetrics.domainPerformance.map(domain => ({
      domain: getDomainShortName(domain.domain),
      student: domain.studentProgress,
      peer: domain.peerAverage,
      district: domain.districtAverage,
      fullMark: 100
    }));
  }, [benchmarkMetrics.domainPerformance]);

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  const getDomainShortName = (domain: GoalDomain): string => {
    const shortNames: Record<GoalDomain, { ar: string; en: string }> = {
      academic_reading: { ar: 'القراءة', en: 'Reading' },
      academic_writing: { ar: 'الكتابة', en: 'Writing' },
      academic_math: { ar: 'الرياضيات', en: 'Math' },
      academic_science: { ar: 'العلوم', en: 'Science' },
      communication_expressive: { ar: 'التعبير', en: 'Expression' },
      communication_receptive: { ar: 'الاستقبال', en: 'Reception' },
      communication_social: { ar: 'التواصل', en: 'Social' },
      behavioral_social: { ar: 'السلوك', en: 'Behavior' },
      behavioral_attention: { ar: 'الانتباه', en: 'Attention' },
      behavioral_self_regulation: { ar: 'التنظيم', en: 'Regulation' },
      functional_daily_living: { ar: 'الحياة اليومية', en: 'Daily Living' },
      functional_mobility: { ar: 'الحركة', en: 'Mobility' },
      functional_self_care: { ar: 'الرعاية الذاتية', en: 'Self-Care' },
      motor_fine: { ar: 'الحركة الدقيقة', en: 'Fine Motor' },
      motor_gross: { ar: 'الحركة الكبيرة', en: 'Gross Motor' },
      vocational: { ar: 'المهني', en: 'Vocational' },
      transition: { ar: 'الانتقال', en: 'Transition' }
    };
    
    return shortNames[domain]?.[language] || domain;
  };

  const getDomainFullName = (domain: GoalDomain): string => {
    const fullNames: Record<GoalDomain, { ar: string; en: string }> = {
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
    
    return fullNames[domain]?.[language] || domain;
  };

  const getPerformanceColor = (studentScore: number, peerAverage: number): string => {
    if (studentScore > peerAverage + 10) return 'text-green-600';
    if (studentScore > peerAverage - 5) return 'text-blue-600';
    if (studentScore > peerAverage - 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceIcon = (studentScore: number, peerAverage: number) => {
    if (studentScore > peerAverage + 10) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (studentScore > peerAverage - 5) return <Target className="h-4 w-4 text-blue-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getRecommendationText = (recommendation: string): string => {
    const recommendations: Record<string, { ar: string; en: string }> = {
      maintain_pace: { ar: 'حافظ على الوتيرة الحالية', en: 'Maintain current pace' },
      increase_intensity: { ar: 'زيادة كثافة التدخل', en: 'Increase intervention intensity' },
      modify_strategy: { ar: 'تعديل الاستراتيجية', en: 'Modify strategy' }
    };
    
    return recommendations[recommendation]?.[language] || recommendation;
  };

  if (goalsLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('benchmarking.goal_benchmarking')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('benchmarking.peer_comparison_analysis')}
          </p>
        </div>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Select value={filters.comparisonType} onValueChange={(value: any) => 
            setFilters(prev => ({ ...prev, comparisonType: value }))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="peer_group">{t('benchmarking.peer_group')}</SelectItem>
              <SelectItem value="district_average">{t('benchmarking.district_average')}</SelectItem>
              <SelectItem value="state_standards">{t('benchmarking.state_standards')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('actions.export')}
          </Button>
        </div>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('benchmarking.overall_performance')}
                </p>
                <p className="text-2xl font-bold">
                  {benchmarkMetrics.overallPerformance.studentScore}%
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('benchmarking.peer_avg')}: {benchmarkMetrics.overallPerformance.peerAverage}%
                </p>
              </div>
              <div className="text-center">
                {getPerformanceIcon(
                  benchmarkMetrics.overallPerformance.studentScore,
                  benchmarkMetrics.overallPerformance.peerAverage
                )}
                <p className="text-xs font-medium mt-1">
                  {benchmarkMetrics.overallPerformance.percentile}th
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('benchmarking.percentile')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('benchmarking.progress_velocity')}
                </p>
                <p className="text-2xl font-bold">
                  {benchmarkMetrics.progressVelocity.current}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('benchmarking.target')}: {benchmarkMetrics.progressVelocity.target}
                </p>
              </div>
              <div className="text-center">
                <Zap className={`h-8 w-8 ${
                  benchmarkMetrics.progressVelocity.current >= benchmarkMetrics.progressVelocity.target 
                    ? 'text-green-600' 
                    : 'text-yellow-600'
                }`} />
                <p className="text-xs text-muted-foreground">
                  {t('benchmarking.points_per_month')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('benchmarking.graduation_readiness')}
                </p>
                <p className="text-lg font-bold">
                  {benchmarkMetrics.achievementPrediction.onTrackForGraduation 
                    ? t('common.on_track') 
                    : t('common.needs_support')
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {benchmarkMetrics.achievementPrediction.expectedOutcomes.length} {t('benchmarking.outcomes')}
                </p>
              </div>
              <div className="text-center">
                {benchmarkMetrics.achievementPrediction.onTrackForGraduation ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Benchmarking Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="domains">{t('tabs.domain_comparison')}</TabsTrigger>
          <TabsTrigger value="trends">{t('tabs.historical_trends')}</TabsTrigger>
          <TabsTrigger value="predictions">{t('tabs.outcome_predictions')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Target className="h-5 w-5" />
                  {t('charts.domain_performance_radar')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarChartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="domain" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name={t('benchmarking.student')}
                      dataKey="student"
                      stroke="#4ABAD3"
                      fill="#4ABAD3"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name={t('benchmarking.peer_average')}
                      dataKey="peer"
                      stroke="#4ADB7A"
                      fill="#4ADB7A"
                      fillOpacity={0.2}
                    />
                    <Radar
                      name={t('benchmarking.district_average')}
                      dataKey="district"
                      stroke="#EAB308"
                      fill="#EAB308"
                      fillOpacity={0.1}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance Gaps */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <BarChart3 className="h-5 w-5" />
                  {t('benchmarking.performance_gaps')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {benchmarkMetrics.domainPerformance
                    .sort((a, b) => (b.peerAverage - b.studentProgress) - (a.peerAverage - a.studentProgress))
                    .slice(0, 6)
                    .map((domain) => {
                      const gap = domain.peerAverage - domain.studentProgress;
                      return (
                        <div key={domain.domain} className={`flex items-center justify-between p-3 border rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={isRTL ? 'text-right' : ''}>
                            <p className="font-medium">{getDomainFullName(domain.domain)}</p>
                            <p className={`text-sm ${getPerformanceColor(domain.studentProgress, domain.peerAverage)}`}>
                              {gap > 0 ? '-' : '+'}{Math.abs(gap).toFixed(0)} {t('benchmarking.points_vs_peers')}
                            </p>
                          </div>
                          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="text-center">
                              <p className="text-sm font-medium">{domain.studentProgress}%</p>
                              <p className="text-xs text-muted-foreground">{t('benchmarking.student')}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium">{domain.peerAverage}%</p>
                              <p className="text-xs text-muted-foreground">{t('benchmarking.peers')}</p>
                            </div>
                            {getPerformanceIcon(domain.studentProgress, domain.peerAverage)}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Domain Comparison Tab */}
        <TabsContent value="domains" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <BarChart3 className="h-5 w-5" />
                {t('charts.domain_performance_comparison')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart
                  data={benchmarkMetrics.domainPerformance.map(d => ({
                    domain: getDomainShortName(d.domain),
                    student: d.studentProgress,
                    peer: d.peerAverage,
                    district: d.districtAverage
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="domain" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="student" fill="#4ABAD3" name={t('benchmarking.student')} />
                  <Bar dataKey="peer" fill="#4ADB7A" name={t('benchmarking.peer_average')} />
                  <Bar dataKey="district" fill="#EAB308" name={t('benchmarking.district_average')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Target className="h-5 w-5" />
                {t('benchmarking.domain_recommendations')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {benchmarkMetrics.domainPerformance.map((domain) => (
                  <div key={domain.domain} className={`p-4 border rounded-lg ${isRTL ? 'text-right' : ''}`}>
                    <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <h4 className="font-medium">{getDomainFullName(domain.domain)}</h4>
                      {getPerformanceIcon(domain.studentProgress, domain.peerAverage)}
                    </div>
                    <div className="space-y-2">
                      <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span>{t('benchmarking.current')}: {domain.studentProgress}%</span>
                        <span>{t('benchmarking.peer')}: {domain.peerAverage}%</span>
                      </div>
                      <Progress value={domain.studentProgress} className="h-2" />
                      <p className="text-sm text-muted-foreground">
                        {getRecommendationText(domain.recommendation)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historical Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <TrendingUp className="h-5 w-5" />
                {t('charts.progress_trends_comparison')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={historicalTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="studentProgress" fill="#4ABAD3" name={t('benchmarking.student_progress')} />
                  <Bar dataKey="peerAverage" fill="#4ADB7A" name={t('benchmarking.peer_average')} />
                  <Bar dataKey="districtAverage" fill="#EAB308" name={t('benchmarking.district_average')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outcome Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expected Outcomes */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Award className="h-5 w-5" />
                  {t('benchmarking.expected_outcomes')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {benchmarkMetrics.achievementPrediction.expectedOutcomes.map((outcome, index) => (
                    <div key={index} className={`flex items-center gap-3 p-3 border rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <p className={`text-sm ${isRTL ? 'text-right' : ''}`}>{outcome}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Risk Factors */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <AlertCircle className="h-5 w-5" />
                  {t('benchmarking.risk_factors')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {benchmarkMetrics.achievementPrediction.riskFactors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t('benchmarking.no_significant_risks')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {benchmarkMetrics.achievementPrediction.riskFactors.map((risk, index) => (
                      <div key={index} className={`flex items-center gap-3 p-3 border border-red-200 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        <p className={`text-sm ${isRTL ? 'text-right' : ''}`}>{risk}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IEPGoalBenchmarking;