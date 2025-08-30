import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import {
  TrendingUpIcon, TrendingDownIcon, ClockIcon, UsersIcon,
  CalendarIcon, MapPinIcon, AlertTriangleIcon, CheckCircleIcon,
  ActivityIcon, BarChartIcon, PieChartIcon, TargetIcon,
  RefreshCwIcon, DownloadIcon, FilterIcon, SettingsIcon,
  BrainIcon, TimerIcon, DollarSignIcon, WrenchIcon
} from 'lucide-react';
import {
  OperationalMetrics, SessionUtilization, TherapistPerformance,
  FacilityUtilization, OperationalInsight, NoShowPrediction,
  WaitTimeAnalysis, ResourceOptimization,
  operationalAnalyticsService
} from '../../services/operational-analytics-service';

interface OperationalDashboardProps {
  dateRange?: {
    start: string;
    end: string;
  };
}

export const OperationalAnalyticsDashboard: React.FC<OperationalDashboardProps> = ({
  dateRange
}) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('last6months');

  // Data states
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [utilizationData, setUtilizationData] = useState<SessionUtilization[]>([]);
  const [therapistPerformance, setTherapistPerformance] = useState<TherapistPerformance[]>([]);
  const [facilityUtilization, setFacilityUtilization] = useState<FacilityUtilization[]>([]);
  const [operationalInsights, setOperationalInsights] = useState<OperationalInsight[]>([]);
  const [noShowPredictions, setNoShowPredictions] = useState<NoShowPrediction[]>([]);
  const [waitTimeAnalysis, setWaitTimeAnalysis] = useState<WaitTimeAnalysis[]>([]);
  const [resourceOptimization, setResourceOptimization] = useState<ResourceOptimization[]>([]);
  const [efficiencyScores, setEfficiencyScores] = useState<any>(null);

  useEffect(() => {
    loadOperationalData();
  }, [selectedPeriod, dateRange]);

  const loadOperationalData = async () => {
    setLoading(true);
    try {
      const [
        metricsData,
        utilizationChartData,
        therapistData,
        facilityData,
        insightsData,
        noShowData,
        waitTimeData,
        optimizationData,
        efficiencyData
      ] = await Promise.all([
        operationalAnalyticsService.getOperationalMetrics(dateRange),
        operationalAnalyticsService.getSessionUtilizationData(dateRange),
        operationalAnalyticsService.getTherapistPerformance(dateRange),
        operationalAnalyticsService.getFacilityUtilization(dateRange),
        operationalAnalyticsService.generateOperationalInsights(),
        operationalAnalyticsService.predictNoShows(dateRange),
        operationalAnalyticsService.getWaitTimeAnalysis(dateRange),
        operationalAnalyticsService.getResourceOptimizationRecommendations(),
        operationalAnalyticsService.calculateEfficiencyScores(dateRange)
      ]);

      setMetrics(metricsData);
      setUtilizationData(utilizationChartData);
      setTherapistPerformance(therapistData);
      setFacilityUtilization(facilityData);
      setOperationalInsights(insightsData);
      setNoShowPredictions(noShowData);
      setWaitTimeAnalysis(waitTimeData);
      setResourceOptimization(optimizationData);
      setEfficiencyScores(efficiencyData);

    } catch (error) {
      console.error('Failed to load operational data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount);
  };

  // Chart colors
  const chartColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Operational Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ActivityIcon className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Session Utilization')}</p>
                <p className="text-xl font-bold text-green-600">
                  {metrics?.sessionUtilizationRate.toFixed(1) || 0}%
                </p>
                <p className="text-xs text-gray-600">
                  {metrics?.completedSessions || 0} / {metrics?.totalSessions || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UsersIcon className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Therapist Utilization')}</p>
                <p className="text-xl font-bold text-blue-600">
                  {metrics?.therapistUtilizationRate.toFixed(1) || 0}%
                </p>
                <p className="text-xs text-gray-600">
                  {therapistPerformance.length} {t('active therapists')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPinIcon className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Facility Utilization')}</p>
                <p className="text-xl font-bold text-purple-600">
                  {metrics?.facilityUtilizationRate.toFixed(1) || 0}%
                </p>
                <p className="text-xs text-gray-600">
                  {facilityUtilization.length} {t('therapy rooms')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSignIcon className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Revenue per Session')}</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(metrics?.revenuePerSession || 0)}
                </p>
                <p className="text-xs text-green-600">
                  <TrendingUpIcon className="h-3 w-3 inline" /> +5.2% {t('vs last month')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Utilization Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChartIcon className="h-5 w-5" />
            <span>{t('Session Utilization Trends')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'revenue' ? formatCurrency(Number(value)) : `${value}${name.includes('Rate') ? '%' : ''}`,
                  t(name)
                ]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="utilisationRate"
                stackId="1"
                stroke="#8884d8"
                fill="#8884d8"
                name={t('Utilization Rate')}
              />
              <Area
                type="monotone"
                dataKey="completedSlots"
                stackId="2"
                stroke="#82ca9d"
                fill="#82ca9d"
                name={t('Completed Sessions')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Efficiency Scores */}
      {efficiencyScores && (
        <Card>
          <CardHeader>
            <CardTitle>{t('Operational Efficiency Scores')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getPerformanceColor(efficiencyScores.overallEfficiency)}`}>
                  {efficiencyScores.overallEfficiency}%
                </div>
                <div className="text-sm text-gray-600">{t('Overall')}</div>
                <Progress value={efficiencyScores.overallEfficiency} className="mt-2 h-2" />
              </div>
              
              <div className="text-center">
                <div className={`text-3xl font-bold ${getPerformanceColor(efficiencyScores.therapistEfficiency)}`}>
                  {efficiencyScores.therapistEfficiency}%
                </div>
                <div className="text-sm text-gray-600">{t('Therapist')}</div>
                <Progress value={efficiencyScores.therapistEfficiency} className="mt-2 h-2" />
              </div>
              
              <div className="text-center">
                <div className={`text-3xl font-bold ${getPerformanceColor(efficiencyScores.facilityEfficiency)}`}>
                  {efficiencyScores.facilityEfficiency}%
                </div>
                <div className="text-sm text-gray-600">{t('Facility')}</div>
                <Progress value={efficiencyScores.facilityEfficiency} className="mt-2 h-2" />
              </div>
              
              <div className="text-center">
                <div className={`text-3xl font-bold ${getPerformanceColor(efficiencyScores.resourceEfficiency)}`}>
                  {efficiencyScores.resourceEfficiency}%
                </div>
                <div className="text-sm text-gray-600">{t('Resource')}</div>
                <Progress value={efficiencyScores.resourceEfficiency} className="mt-2 h-2" />
              </div>
              
              <div className="text-center">
                <div className={`text-3xl font-bold ${getPerformanceColor(efficiencyScores.costEfficiency)}`}>
                  {efficiencyScores.costEfficiency}%
                </div>
                <div className="text-sm text-gray-600">{t('Cost')}</div>
                <Progress value={efficiencyScores.costEfficiency} className="mt-2 h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderTherapistTab = () => (
    <div className="space-y-6">
      {/* Top Performers */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">{t('Top Performer')}</p>
            <p className="text-lg font-bold text-green-600">
              {therapistPerformance[0]?.efficiencyScore || 0}%
            </p>
            <p className="text-xs text-gray-600">
              {i18n.language === 'ar' ? therapistPerformance[0]?.therapistNameAr : therapistPerformance[0]?.therapistName}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <UsersIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">{t('Avg Utilization')}</p>
            <p className="text-lg font-bold text-blue-600">
              {therapistPerformance.reduce((sum, t) => sum + t.utilizationRate, 0) / therapistPerformance.length || 0}%
            </p>
            <p className="text-xs text-gray-600">{t('across all therapists')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <DollarSignIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">{t('Total Revenue')}</p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(therapistPerformance.reduce((sum, t) => sum + t.revenueGenerated, 0))}
            </p>
            <p className="text-xs text-gray-600">{t('this period')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Therapist Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Therapist Performance Analytics')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Therapist')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Utilization')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Sessions')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('No-Show Rate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Efficiency Score')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Revenue')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Rating')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {therapistPerformance.map((therapist) => (
                  <tr key={therapist.therapistId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {i18n.language === 'ar' ? therapist.therapistNameAr : therapist.therapistName}
                      </div>
                      <div className="text-sm text-gray-500">{therapist.specialization}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{therapist.utilizationRate}%</span>
                        </div>
                        <Progress value={therapist.utilizationRate} className="h-2" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {therapist.completedSessions}/{therapist.totalSessions}
                      </div>
                      <div className="text-sm text-gray-500">
                        {therapist.patientsServed} {t('patients')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-semibold ${therapist.noShowRate > 2 ? 'text-red-600' : 'text-green-600'}`}>
                        {therapist.noShowRate}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-bold ${getPerformanceColor(therapist.efficiencyScore)}`}>
                        {therapist.efficiencyScore}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(therapist.revenueGenerated)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-semibold">{therapist.averageSessionRating}</span>
                        <span className="text-yellow-500 ml-1">★</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Performance Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Therapist Performance Comparison')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={therapistPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="utilizationRate" name={t('Utilization Rate')} unit="%" />
              <YAxis dataKey="efficiencyScore" name={t('Efficiency Score')} unit="%" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload[0]) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border rounded-lg shadow">
                        <p className="font-medium">{i18n.language === 'ar' ? data.therapistNameAr : data.therapistName}</p>
                        <p className="text-sm text-gray-600">{data.specialization}</p>
                        <p className="text-sm">{t('Utilization')}: {data.utilizationRate}%</p>
                        <p className="text-sm">{t('Efficiency')}: {data.efficiencyScore}%</p>
                        <p className="text-sm">{t('Revenue')}: {formatCurrency(data.revenueGenerated)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter dataKey="efficiencyScore" fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const renderFacilityTab = () => (
    <div className="space-y-6">
      {/* Facility Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <MapPinIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">{t('Total Rooms')}</p>
            <p className="text-2xl font-bold text-blue-600">{facilityUtilization.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <ActivityIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">{t('Avg Utilization')}</p>
            <p className="text-2xl font-bold text-green-600">
              {Math.round(facilityUtilization.reduce((sum, f) => sum + f.utilizationRate, 0) / facilityUtilization.length)}%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <ClockIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">{t('Total Hours Used')}</p>
            <p className="text-2xl font-bold text-purple-600">
              {facilityUtilization.reduce((sum, f) => sum + f.usedHours, 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSignIcon className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">{t('Revenue per Hour')}</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(facilityUtilization.reduce((sum, f) => sum + f.revenuePerHour * f.usedHours, 0) / facilityUtilization.reduce((sum, f) => sum + f.usedHours, 0) || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Room Utilization Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Room Utilization Rates')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={facilityUtilization} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="roomName" type="category" width={120} />
              <Tooltip formatter={(value) => [`${value}%`, t('Utilization Rate')]} />
              <Bar 
                dataKey="utilizationRate" 
                fill={(entry: any) => entry.utilizationRate > 85 ? '#82ca9d' : entry.utilizationRate > 70 ? '#ffc658' : '#ff7c7c'}
                name={t('Utilization Rate')}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Facility Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Facility Analytics Details')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Room')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Type')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Utilization')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Hours Used')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Revenue/Hour')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Equipment Usage')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {facilityUtilization.map((facility) => (
                  <tr key={facility.roomId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{facility.roomName}</div>
                      <div className="text-sm text-gray-500">
                        {t('Capacity')}: {facility.capacity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{facility.roomType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{facility.utilizationRate}%</span>
                        </div>
                        <Progress 
                          value={facility.utilizationRate} 
                          className={`h-2 ${facility.utilizationRate > 85 ? '[&>div]:bg-green-600' : facility.utilizationRate > 70 ? '[&>div]:bg-yellow-600' : '[&>div]:bg-red-600'}`}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {facility.usedHours}/{facility.totalHours}
                      </div>
                      <div className="text-sm text-gray-500">
                        {facility.maintenanceHours}h {t('maintenance')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(facility.revenuePerHour)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {Object.entries(facility.equipmentUtilization).map(([equipment, usage]) => (
                          <div key={equipment} className="flex items-center space-x-2">
                            <span className="text-xs text-gray-600 w-20 truncate">{equipment}</span>
                            <div className="flex-1">
                              <Progress value={usage} className="h-1" />
                            </div>
                            <span className="text-xs text-gray-600">{usage}%</span>
                          </div>
                        ))}
                      </div>
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
      {/* High Priority Alerts */}
      {operationalInsights.filter(i => i.priority === 'high' || i.priority === 'critical').length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangleIcon className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong>{t('Action Required')}:</strong> {operationalInsights.filter(i => i.priority === 'high' || i.priority === 'critical').length} {t('high-priority operational issues need attention')}.
          </AlertDescription>
        </Alert>
      )}

      {/* No-Show Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BrainIcon className="h-5 w-5" />
            <span>{t('No-Show Risk Predictions')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {noShowPredictions.map((prediction) => (
              <div key={prediction.appointmentId} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium">{prediction.studentName}</h4>
                      <Badge className={`${prediction.noShowProbability > 70 ? 'bg-red-100 text-red-800' : prediction.noShowProbability > 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {prediction.noShowProbability}% {t('risk')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {new Date(prediction.appointmentDate).toLocaleDateString(i18n.language)} {t('at')} {prediction.appointmentTime}
                    </p>
                    
                    <div className="text-sm text-gray-600 mb-3">
                      <p className="font-medium mb-1">{t('Risk Factors')}:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {prediction.riskFactors.slice(0, 3).map((factor, index) => (
                          <li key={index}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="text-sm">
                      <p className="font-medium mb-1">{t('Recommended Actions')}:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        {prediction.preventiveActions.slice(0, 2).map((action, index) => (
                          <li key={index}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Operational Insights */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Operational Insights & Recommendations')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {operationalInsights.map((insight) => (
              <div key={insight.id} className={`border rounded-lg p-4 ${getPriorityColor(insight.priority)} border`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">
                      {i18n.language === 'ar' ? insight.titleAr : insight.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {i18n.language === 'ar' ? insight.descriptionAr : insight.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge className={getPriorityColor(insight.priority)}>
                      {t(insight.priority)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {t(insight.type)}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  {insight.potentialSavings > 0 && (
                    <div>
                      <p className="text-xs text-gray-600">{t('Potential Savings')}</p>
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(insight.potentialSavings)}/{t('month')}
                      </p>
                    </div>
                  )}
                  {insight.potentialRevenueIncrease > 0 && (
                    <div>
                      <p className="text-xs text-gray-600">{t('Revenue Opportunity')}</p>
                      <p className="text-sm font-semibold text-blue-600">
                        {formatCurrency(insight.potentialRevenueIncrease)}/{t('month')}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">{t('Key Actions')}:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {insight.recommendedActions.slice(0, 3).map((action, index) => (
                      <li key={index} className="flex items-start">
                        <span className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{t('Impact')}: {t(insight.impact)}</span>
                    <span>{t('Complexity')}: {t(insight.implementation)}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      {t('Review')}
                    </Button>
                    <Button size="sm">
                      {t('Implement')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('Loading operational analytics...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">{t('Operational Analytics Dashboard')}</h2>
          <p className="text-gray-600">{t('Monitor efficiency, utilization, and operational performance')}</p>
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
          
          <Button variant="outline" onClick={loadOperationalData}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            {t('Refresh')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
          <TabsTrigger value="therapists">{t('Therapists')}</TabsTrigger>
          <TabsTrigger value="facility">{t('Facility')}</TabsTrigger>
          <TabsTrigger value="insights">{t('AI Insights')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">{renderOverviewTab()}</TabsContent>
        <TabsContent value="therapists">{renderTherapistTab()}</TabsContent>
        <TabsContent value="facility">{renderFacilityTab()}</TabsContent>
        <TabsContent value="insights">{renderInsightsTab()}</TabsContent>
      </Tabs>
    </div>
  );
};