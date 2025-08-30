import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import {
  TrendingUpIcon, TrendingDownIcon, AlertTriangleIcon, CheckCircleIcon,
  BrainIcon, HeartIcon, EyeIcon, FileTextIcon, CalendarIcon,
  UsersIcon, ActivityIcon, TargetIcon, StarIcon, ClockIcon,
  RefreshCwIcon, DownloadIcon, FilterIcon, AlertCircleIcon
} from 'lucide-react';
import {
  ClinicalMetrics, TreatmentOutcome, SkillDomainProgress,
  TherapyEffectiveness, PredictiveInsight, OutcomeMeasurement,
  clinicalAnalyticsService
} from '../../services/clinical-analytics-service';

interface ClinicalDashboardProps {
  dateRange?: {
    start: string;
    end: string;
  };
}

export const ClinicalAnalyticsDashboard: React.FC<ClinicalDashboardProps> = ({
  dateRange
}) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('last6months');
  const [selectedInsight, setSelectedInsight] = useState<PredictiveInsight | null>(null);

  // Data states
  const [metrics, setMetrics] = useState<ClinicalMetrics | null>(null);
  const [treatmentOutcomes, setTreatmentOutcomes] = useState<TreatmentOutcome[]>([]);
  const [skillDomainProgress, setSkillDomainProgress] = useState<SkillDomainProgress[]>([]);
  const [therapyEffectiveness, setTherapyEffectiveness] = useState<TherapyEffectiveness[]>([]);
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsight[]>([]);
  const [parentSatisfaction, setParentSatisfaction] = useState<any>(null);

  useEffect(() => {
    loadClinicalData();
  }, [selectedPeriod, dateRange]);

  const loadClinicalData = async () => {
    setLoading(true);
    try {
      const [
        metricsData,
        outcomesData,
        skillProgressData,
        effectivenessData,
        insightsData,
        satisfactionData
      ] = await Promise.all([
        clinicalAnalyticsService.getClinicalMetrics(dateRange),
        clinicalAnalyticsService.getTreatmentOutcomes(),
        clinicalAnalyticsService.getSkillDomainProgress(dateRange),
        clinicalAnalyticsService.getTherapyEffectiveness(),
        clinicalAnalyticsService.generatePredictiveInsights(),
        clinicalAnalyticsService.getParentSatisfactionData(dateRange)
      ]);

      setMetrics(metricsData);
      setTreatmentOutcomes(outcomesData);
      setSkillDomainProgress(skillProgressData);
      setTherapyEffectiveness(effectivenessData);
      setPredictiveInsights(insightsData);
      setParentSatisfaction(satisfactionData);

    } catch (error) {
      console.error('Failed to load clinical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertCircleIcon className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertTriangleIcon className="h-4 w-4 text-orange-600" />;
      case 'medium': return <ClockIcon className="h-4 w-4 text-yellow-600" />;
      case 'low': return <CheckCircleIcon className="h-4 w-4 text-blue-600" />;
      default: return <CheckCircleIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  // Chart colors
  const chartColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Clinical Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UsersIcon className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Active Patients')}</p>
                <p className="text-xl font-bold text-blue-600">
                  {metrics?.activePatients || 0}
                </p>
                <p className="text-xs text-gray-600">
                  {t('of')} {metrics?.totalPatients || 0} {t('total')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TargetIcon className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Goal Achievement')}</p>
                <p className="text-xl font-bold text-green-600">
                  {metrics?.goalAchievementRate.toFixed(1) || 0}%
                </p>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                  <div 
                    className="bg-green-600 h-1 rounded-full" 
                    style={{ width: `${metrics?.goalAchievementRate || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUpIcon className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Improvement Rate')}</p>
                <p className="text-xl font-bold text-purple-600">
                  {metrics?.outcomeImprovementRate.toFixed(1) || 0}%
                </p>
                <p className="text-xs text-green-600">
                  <TrendingUpIcon className="h-3 w-3 inline" /> +2.3% {t('vs last month')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ActivityIcon className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Session Completion')}</p>
                <p className="text-xl font-bold text-orange-600">
                  {metrics?.sessionCompletionRate.toFixed(1) || 0}%
                </p>
                <p className="text-xs text-gray-600">
                  {metrics?.averageSessionsPerPatient.toFixed(1)} {t('avg per patient')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skill Domain Progress Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BrainIcon className="h-5 w-5" />
            <span>{t('Skill Domain Progress')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={skillDomainProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={i18n.language === 'ar' ? 'domainAr' : 'domain'} 
                angle={-45} 
                textAnchor="end" 
                height={80}
              />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  `${value}%`, 
                  name === 'averageImprovement' ? t('Average Improvement') : name
                ]}
              />
              <Bar dataKey="averageImprovement" fill="#8884d8" name={t('Average Improvement')} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Therapy Effectiveness Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Therapy Effectiveness Comparison')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={therapyEffectiveness.map(therapy => ({
              ...therapy,
              name: therapy.therapyType
            }))}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis angle={0} domain={[0, 100]} />
              <Radar
                name={t('Success Rate')}
                dataKey="successRate"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.2}
              />
              <Radar
                name={t('Parent Satisfaction')}
                dataKey={(item) => item.parentSatisfactionScore * 20} // Scale to 100
                stroke="#82ca9d"
                fill="#82ca9d"
                fillOpacity={0.2}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const renderOutcomesTab = () => (
    <div className="space-y-6">
      {/* Treatment Outcomes Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">{t('Low Risk Patients')}</p>
            <p className="text-2xl font-bold text-green-600">
              {treatmentOutcomes.filter(o => o.riskLevel === 'low').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangleIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">{t('Medium Risk Patients')}</p>
            <p className="text-2xl font-bold text-yellow-600">
              {treatmentOutcomes.filter(o => o.riskLevel === 'medium').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircleIcon className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">{t('High Risk Patients')}</p>
            <p className="text-2xl font-bold text-red-600">
              {treatmentOutcomes.filter(o => o.riskLevel === 'high').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Patient Outcomes */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Patient Treatment Outcomes')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Patient')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Program')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Progress')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Goals')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Risk Level')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Next Review')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {treatmentOutcomes.map((outcome) => (
                  <tr key={outcome.studentId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {i18n.language === 'ar' ? outcome.studentNameAr : outcome.studentName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {t('Since')}: {new Date(outcome.startDate).toLocaleDateString(i18n.language)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{outcome.programType}</div>
                      <div className="text-sm text-gray-500">
                        {outcome.completedSessions}/{outcome.totalSessions} {t('sessions')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{outcome.overallProgress}%</span>
                        </div>
                        <Progress value={outcome.overallProgress} className="h-2" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {outcome.goalsAchieved}/{outcome.totalGoals}
                      </div>
                      <div className="text-sm text-gray-500">
                        {Math.round((outcome.goalsAchieved / outcome.totalGoals) * 100)}% {t('achieved')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={`${getRiskLevelColor(outcome.riskLevel)} border`}>
                        {t(outcome.riskLevel)} {t('risk')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(outcome.nextReviewDate).toLocaleDateString(i18n.language)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm">
                        <EyeIcon className="h-4 w-4 mr-1" />
                        {t('View Details')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderInsightsTab = () => (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {predictiveInsights.filter(i => i.priority === 'critical').length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircleIcon className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <strong>{t('Critical Alert')}:</strong> {predictiveInsights.filter(i => i.priority === 'critical').length} {t('students require immediate attention')}.
          </AlertDescription>
        </Alert>
      )}

      {/* Predictive Insights List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BrainIcon className="h-5 w-5" />
            <span>{t('AI-Powered Insights')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {predictiveInsights.map((insight) => (
              <div
                key={insight.id}
                className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${getPriorityColor(insight.priority)}`}
                onClick={() => setSelectedInsight(insight)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getPriorityIcon(insight.priority)}
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {i18n.language === 'ar' ? insight.titleAr : insight.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {i18n.language === 'ar' ? insight.descriptionAr : insight.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {t(insight.type)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {t('Confidence')}: {insight.confidence}%
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(insight.generatedAt).toLocaleDateString(i18n.language)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge className={`${getPriorityColor(insight.priority)} ml-2`}>
                    {t(insight.priority)}
                  </Badge>
                </div>

                {insight.recommendedActions.length > 0 && (
                  <div className="mt-3 pl-7">
                    <p className="text-sm font-medium text-gray-700 mb-1">{t('Recommended Actions')}:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {insight.recommendedActions.slice(0, 2).map((action, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                          {action}
                        </li>
                      ))}
                      {insight.recommendedActions.length > 2 && (
                        <li className="text-xs text-blue-600 cursor-pointer">
                          +{insight.recommendedActions.length - 2} {t('more actions')}
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderEffectivenessTab = () => (
    <div className="space-y-6">
      {/* Therapy Effectiveness Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {therapyEffectiveness.map((therapy, index) => (
          <Card key={therapy.therapyType}>
            <CardHeader>
              <CardTitle className="text-lg">{therapy.therapyType}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('Success Rate')}</span>
                  <span className="font-semibold">{therapy.successRate}%</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('Avg Improvement')}</span>
                  <span className="font-semibold">{therapy.averageImprovement}%</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('Dropout Rate')}</span>
                  <span className="font-semibold text-red-600">{therapy.dropoutRate}%</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('Parent Satisfaction')}</span>
                  <div className="flex items-center space-x-1">
                    <StarIcon className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="font-semibold">{therapy.parentSatisfactionScore}</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="text-sm text-gray-600 mb-1">{t('Overall Effectiveness')}</div>
                  <Progress 
                    value={(therapy.successRate + therapy.averageImprovement + (therapy.parentSatisfactionScore * 20) - therapy.dropoutRate) / 4} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Effectiveness Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Therapy Effectiveness Comparison')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={therapyEffectiveness}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="therapyType" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="successRate"
                stackId="1"
                stroke="#8884d8"
                fill="#8884d8"
                name={t('Success Rate')}
              />
              <Area
                type="monotone"
                dataKey="averageImprovement"
                stackId="1"
                stroke="#82ca9d"
                fill="#82ca9d"
                name={t('Average Improvement')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Parent Satisfaction Overview */}
      {parentSatisfaction && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <HeartIcon className="h-5 w-5" />
              <span>{t('Parent Satisfaction Overview')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {parentSatisfaction.overallScore}
                </div>
                <div className="text-sm text-gray-600">{t('Overall Score')}</div>
                <div className="flex justify-center mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon
                      key={star}
                      className={`h-4 w-4 ${star <= parentSatisfaction.overallScore ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {parentSatisfaction.responseRate}%
                </div>
                <div className="text-sm text-gray-600">{t('Response Rate')}</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {parentSatisfaction.topPraises.length}
                </div>
                <div className="text-sm text-gray-600">{t('Top Praises')}</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {parentSatisfaction.improvementAreas.length}
                </div>
                <div className="text-sm text-gray-600">{t('Areas to Improve')}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-green-700 mb-2">{t('Top Praises')}</h4>
                <ul className="space-y-1 text-sm">
                  {parentSatisfaction.topPraises.map((praise: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                      {praise}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-orange-700 mb-2">{t('Improvement Areas')}</h4>
                <ul className="space-y-1 text-sm">
                  {parentSatisfaction.improvementAreas.map((area: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <AlertTriangleIcon className="h-4 w-4 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('Loading clinical analytics...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">{t('Clinical Analytics Dashboard')}</h2>
          <p className="text-gray-600">{t('Track treatment outcomes and therapy effectiveness')}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last30days">{t('Last 30 Days')}</SelectItem>
              <SelectItem value="last3months">{t('Last 3 Months')}</SelectItem>
              <SelectItem value="last6months">{t('Last 6 Months')}</SelectItem>
              <SelectItem value="lastyear">{t('Last Year')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            <DownloadIcon className="h-4 w-4 mr-2" />
            {t('Export Report')}
          </Button>
          
          <Button variant="outline" onClick={loadClinicalData}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            {t('Refresh')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
          <TabsTrigger value="outcomes">{t('Treatment Outcomes')}</TabsTrigger>
          <TabsTrigger value="insights">{t('AI Insights')}</TabsTrigger>
          <TabsTrigger value="effectiveness">{t('Effectiveness')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">{renderOverviewTab()}</TabsContent>
        <TabsContent value="outcomes">{renderOutcomesTab()}</TabsContent>
        <TabsContent value="insights">{renderInsightsTab()}</TabsContent>
        <TabsContent value="effectiveness">{renderEffectivenessTab()}</TabsContent>
      </Tabs>

      {/* Insight Detail Dialog */}
      {selectedInsight && (
        <Dialog open={!!selectedInsight} onOpenChange={() => setSelectedInsight(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {getPriorityIcon(selectedInsight.priority)}
                <span>
                  {i18n.language === 'ar' ? selectedInsight.titleAr : selectedInsight.title}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-gray-700">
                  {i18n.language === 'ar' ? selectedInsight.descriptionAr : selectedInsight.description}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <Badge className={getPriorityColor(selectedInsight.priority)}>
                  {t(selectedInsight.priority)} {t('Priority')}
                </Badge>
                <Badge variant="outline">
                  {t('Confidence')}: {selectedInsight.confidence}%
                </Badge>
              </div>

              <div>
                <h4 className="font-medium mb-2">{t('Recommended Actions')}</h4>
                <ul className="space-y-2">
                  {selectedInsight.recommendedActions.map((action, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-sm">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline">
                  {t('Mark as Reviewed')}
                </Button>
                <Button>
                  {t('Take Action')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};