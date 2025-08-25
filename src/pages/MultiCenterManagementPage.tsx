// Multi-Center Management Dashboard - Phase 8 Implementation
// Franchise network oversight and centralized operations

import { useState } from 'react'
import { 
  Building2, 
  MapPin, 
  TrendingUp, 
  DollarSign,
  BarChart3,
  Globe,
  Settings,
  Award
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useLanguage } from '@/contexts/LanguageContext'

export default function MultiCenterManagementPage() {
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState('overview')
  
  // Mock data for multi-center operations
  const networkOverview = {
    totalCenters: 12,
    activeCenters: 10,
    preOpeningCenters: 2,
    plannedCenters: 5,
    totalRevenue: 2850000,
    monthlyGrowth: 8.3,
    averageSatisfaction: 4.7,
    complianceScore: 96
  }

  const centerPerformance = [
    {
      id: '1',
      name: 'مركز أركان - شمال الرياض',
      city: 'الرياض',
      province: 'الرياض',
      status: 'operational',
      monthlyRevenue: 145000,
      patientCount: 89,
      satisfactionScore: 4.8,
      complianceScore: 98,
      performanceRank: 1
    },
    {
      id: '2', 
      name: 'مركز أركان - وسط جدة',
      city: 'جدة',
      province: 'مكة المكرمة',
      status: 'operational',
      monthlyRevenue: 132000,
      patientCount: 76,
      satisfactionScore: 4.6,
      complianceScore: 95,
      performanceRank: 2
    },
    {
      id: '3',
      name: 'مركز أركان - الدمام',
      city: 'الدمام',
      province: 'المنطقة الشرقية',
      status: 'pre_opening',
      monthlyRevenue: 0,
      patientCount: 0,
      satisfactionScore: 0,
      complianceScore: 87,
      performanceRank: null
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-100 text-green-800'
      case 'pre_opening': return 'bg-yellow-100 text-yellow-800'
      case 'planning': return 'bg-blue-100 text-blue-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPerformanceColor = (rank: number | null) => {
    if (!rank) return 'bg-gray-100 text-gray-800'
    if (rank <= 3) return 'bg-green-100 text-green-800'
    if (rank <= 7) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold text-gray-900 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إدارة المراكز المتعددة' : 'Multi-Center Management'}
              </h1>
              <p className={`text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إشراف شبكة المراكز والعمليات المركزية' : 'Franchise network oversight and centralized operations'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-green-600 border-green-200">
              {language === 'ar' ? 'الشبكة نشطة' : 'Network Active'}
            </Badge>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'إعدادات' : 'Settings'}
            </Button>
          </div>
        </div>
      </div>

      {/* Network Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'إجمالي المراكز' : 'Total Centers'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{networkOverview.totalCenters}</p>
                <p className="text-xs text-gray-500">
                  {networkOverview.activeCenters} {language === 'ar' ? 'نشط' : 'active'}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'الإيرادات الشهرية' : 'Monthly Revenue'}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {language === 'ar' ? 'ر.س' : 'SAR'} {networkOverview.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-green-500 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +{networkOverview.monthlyGrowth}% {language === 'ar' ? 'هذا الشهر' : 'this month'}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'رضا العملاء' : 'Customer Satisfaction'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{networkOverview.averageSatisfaction}/5.0</p>
                <p className="text-xs text-gray-500">
                  {language === 'ar' ? 'متوسط الشبكة' : 'Network average'}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'مستوى التطابق' : 'Compliance Score'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{networkOverview.complianceScore}%</p>
                <p className="text-xs text-gray-500">
                  {language === 'ar' ? 'المتطلبات التنظيمية' : 'Regulatory requirements'}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="centers" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'المراكز' : 'Centers'}
          </TabsTrigger>
          <TabsTrigger value="franchise" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'الامتياز' : 'Franchise'}
          </TabsTrigger>
          <TabsTrigger value="analytics" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'التحليلات' : 'Analytics'}
          </TabsTrigger>
          <TabsTrigger value="expansion" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'التوسع' : 'Expansion'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Network Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <BarChart3 className="w-5 h-5" />
                {language === 'ar' ? 'أداء الشبكة' : 'Network Performance'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Overall Network Health */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'صحة الشبكة الإجمالية' : 'Overall Network Health'}
                    </span>
                    <span className="text-sm text-gray-600">92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>

                {/* Revenue Growth */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'نمو الإيرادات' : 'Revenue Growth'}
                    </span>
                    <span className="text-sm text-gray-600">+{networkOverview.monthlyGrowth}%</span>
                  </div>
                  <Progress value={networkOverview.monthlyGrowth * 10} className="h-2" />
                </div>

                {/* Operational Excellence */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'التميز التشغيلي' : 'Operational Excellence'}
                    </span>
                    <span className="text-sm text-gray-600">88%</span>
                  </div>
                  <Progress value={88} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Geographic Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <MapPin className="w-5 h-5" />
                {language === 'ar' ? 'التوزيع الجغرافي' : 'Geographic Distribution'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-2xl font-bold text-blue-600">5</h3>
                  <p className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'منطقة الرياض' : 'Riyadh Province'}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <h3 className="text-2xl font-bold text-green-600">4</h3>
                  <p className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'منطقة مكة المكرمة' : 'Makkah Province'}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <h3 className="text-2xl font-bold text-purple-600">3</h3>
                  <p className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'المنطقة الشرقية' : 'Eastern Province'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="centers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Building2 className="w-5 h-5" />
                {language === 'ar' ? 'أداء المراكز' : 'Center Performance'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {centerPerformance.map((center) => (
                  <div key={center.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className={`font-semibold text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {center.name}
                        </h4>
                        <p className="text-sm text-gray-600 flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {center.city}, {center.province}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(center.status)}>
                          {center.status === 'operational' 
                            ? (language === 'ar' ? 'تشغيلي' : 'Operational')
                            : (language === 'ar' ? 'قيد الافتتاح' : 'Pre-opening')}
                        </Badge>
                        {center.performanceRank && (
                          <Badge className={getPerformanceColor(center.performanceRank)}>
                            #{center.performanceRank}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">
                          {language === 'ar' ? 'الإيرادات الشهرية' : 'Monthly Revenue'}
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          {language === 'ar' ? 'ر.س' : 'SAR'} {center.monthlyRevenue.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">
                          {language === 'ar' ? 'عدد المرضى' : 'Patient Count'}
                        </p>
                        <p className="text-lg font-bold text-blue-600">{center.patientCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">
                          {language === 'ar' ? 'رضا المرضى' : 'Satisfaction'}
                        </p>
                        <p className="text-lg font-bold text-purple-600">
                          {center.satisfactionScore > 0 ? `${center.satisfactionScore}/5.0` : 'N/A'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">
                          {language === 'ar' ? 'التطابق' : 'Compliance'}
                        </p>
                        <p className="text-lg font-bold text-orange-600">{center.complianceScore}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="franchise" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Globe className="w-5 h-5" />
                {language === 'ar' ? 'إدارة الامتياز التجاري' : 'Franchise Management'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'إحصائيات الامتياز' : 'Franchise Statistics'}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {language === 'ar' ? 'إجمالي اتفاقيات الامتياز:' : 'Total Franchise Agreements:'}
                      </span>
                      <span className="font-medium">8</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {language === 'ar' ? 'الاتفاقيات النشطة:' : 'Active Agreements:'}
                      </span>
                      <span className="font-medium">6</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {language === 'ar' ? 'متوسط رسوم الامتياز:' : 'Average Royalty Rate:'}
                      </span>
                      <span className="font-medium">6.0%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {language === 'ar' ? 'معدل التحصيل:' : 'Collection Rate:'}
                      </span>
                      <span className="font-medium text-green-600">98.5%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الدعم والتدريب' : 'Support & Training'}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {language === 'ar' ? 'برامج التدريب المكتملة:' : 'Training Programs Completed:'}
                      </span>
                      <span className="font-medium">15</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {language === 'ar' ? 'الزيارات التشغيلية:' : 'Operational Visits:'}
                      </span>
                      <span className="font-medium">24</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {language === 'ar' ? 'تذاكر الدعم المحلولة:' : 'Support Tickets Resolved:'}
                      </span>
                      <span className="font-medium">89</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {language === 'ar' ? 'رضا أصحاب الامتياز:' : 'Franchisee Satisfaction:'}
                      </span>
                      <span className="font-medium text-purple-600">4.6/5.0</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <BarChart3 className="w-5 h-5" />
                {language === 'ar' ? 'تحليلات متعددة المراكز' : 'Multi-Center Analytics'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className={`text-lg font-medium text-gray-900 mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'تحليلات تفاعلية قادمة' : 'Interactive Analytics Coming Soon'}
                </h3>
                <p className={`text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' 
                    ? 'ستتضمن لوحة التحكم هذه مخططات تفاعلية ومقاييس أداء متقدمة'
                    : 'This dashboard will include interactive charts and advanced performance metrics'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expansion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Globe className="w-5 h-5" />
                {language === 'ar' ? 'خطط التوسع' : 'Expansion Plans'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                          <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'مراكز مخططة' : 'Planned Centers'}
                        </h3>
                        <p className="text-2xl font-bold text-blue-600">5</p>
                        <p className="text-xs text-gray-500">
                          {language === 'ar' ? 'للعام القادم' : 'Next year'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                          <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'الاستثمار المطلوب' : 'Investment Required'}
                        </h3>
                        <p className="text-lg font-bold text-green-600">
                          {language === 'ar' ? 'ر.س' : 'SAR'} 4.2M
                        </p>
                        <p className="text-xs text-gray-500">
                          {language === 'ar' ? 'إجمالي' : 'Total'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                          <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'العائد المتوقع' : 'Expected ROI'}
                        </h3>
                        <p className="text-lg font-bold text-purple-600">24%</p>
                        <p className="text-xs text-gray-500">
                          {language === 'ar' ? 'سنوياً' : 'Annually'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className={`font-medium mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'المواقع المستهدفة للتوسع' : 'Target Expansion Locations'}
                  </h4>
                  <div className="space-y-3">
                    {[
                      { city: 'الخبر', province: 'المنطقة الشرقية', priority: 'high', investment: 850000 },
                      { city: 'المدينة المنورة', province: 'المدينة المنورة', priority: 'medium', investment: 780000 },
                      { city: 'تبوك', province: 'تبوك', priority: 'medium', investment: 720000 },
                      { city: 'عسير', province: 'عسير', priority: 'low', investment: 690000 },
                    ].map((location, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h5 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {location.city}
                          </h5>
                          <p className="text-sm text-gray-600">{location.province}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={
                            location.priority === 'high' ? 'bg-red-100 text-red-800' :
                            location.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }>
                            {location.priority === 'high' 
                              ? (language === 'ar' ? 'أولوية عالية' : 'High Priority')
                              : location.priority === 'medium'
                              ? (language === 'ar' ? 'أولوية متوسطة' : 'Medium Priority') 
                              : (language === 'ar' ? 'أولوية منخفضة' : 'Low Priority')}
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">
                            {language === 'ar' ? 'ر.س' : 'SAR'} {location.investment.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}