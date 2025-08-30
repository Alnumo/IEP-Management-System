import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface IEPStatsData {
  total: number
  active: number
  draft: number
  review: number
  expired: number
  due_for_review: number
  compliance_issues: number
  by_disability?: Array<{
    disability: string
    count: number
  }>
  by_grade?: Array<{
    grade: string
    count: number
  }>
  monthly_trend?: Array<{
    month: string
    created: number
    completed: number
    reviewed: number
  }>
}

interface IEPStatsChartProps {
  data?: IEPStatsData
  timeframe: 'week' | 'month' | 'quarter'
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export const IEPStatsChart = ({ data, timeframe }: IEPStatsChartProps) => {
  const { language, isRTL } = useLanguage()

  if (!data) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">
          {language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading chart data...'}
        </div>
      </div>
    )
  }

  const statusData = [
    { 
      name: language === 'ar' ? 'نشطة' : 'Active', 
      value: data.active, 
      color: '#22c55e' 
    },
    { 
      name: language === 'ar' ? 'مسودة' : 'Draft', 
      value: data.draft, 
      color: '#3b82f6' 
    },
    { 
      name: language === 'ar' ? 'مراجعة' : 'Review', 
      value: data.review, 
      color: '#eab308' 
    },
    { 
      name: language === 'ar' ? 'منتهية الصلاحية' : 'Expired', 
      value: data.expired, 
      color: '#ef4444' 
    }
  ]

  const trendData = data.monthly_trend || []
  const gradeData = data.by_grade || []
  const disabilityData = data.by_disability || []

  return (
    <div className="space-y-4">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="trends" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'الاتجاهات' : 'Trends'}
          </TabsTrigger>
          <TabsTrigger value="grades" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'الصفوف' : 'Grades'}
          </TabsTrigger>
          <TabsTrigger value="disabilities" className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'الإعاقات' : 'Disabilities'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'توزيع حالة الخطط' : 'IEP Status Distribution'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value, percent }) => 
                        `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                      }
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [value, name]}
                      labelStyle={{ direction: isRTL ? 'rtl' : 'ltr' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'المؤشرات الرئيسية' : 'Key Metrics'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'إجمالي الخطط التعليمية' : 'Total IEPs'}
                    </span>
                    <span className="text-2xl font-bold">{data.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'معدل النشاط' : 'Activity Rate'}
                    </span>
                    <span className="text-lg font-semibold text-green-600">
                      {data.total > 0 ? ((data.active / data.total) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'تحتاج مراجعة' : 'Need Review'}
                    </span>
                    <span className="text-lg font-semibold text-yellow-600">
                      {data.due_for_review}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'مشاكل الامتثال' : 'Compliance Issues'}
                    </span>
                    <span className="text-lg font-semibold text-red-600">
                      {data.compliance_issues}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'اتجاهات الخطط التعليمية الشهرية' : 'Monthly IEP Trends'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    style={{ direction: isRTL ? 'rtl' : 'ltr' }}
                  />
                  <YAxis />
                  <Tooltip 
                    labelStyle={{ direction: isRTL ? 'rtl' : 'ltr' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="created" 
                    fill="#3b82f6" 
                    name={language === 'ar' ? 'تم إنشاؤها' : 'Created'}
                  />
                  <Bar 
                    dataKey="completed" 
                    fill="#22c55e" 
                    name={language === 'ar' ? 'تم إكمالها' : 'Completed'}
                  />
                  <Bar 
                    dataKey="reviewed" 
                    fill="#eab308" 
                    name={language === 'ar' ? 'تم مراجعتها' : 'Reviewed'}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'توزيع الخطط حسب الصف' : 'IEPs by Grade Level'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={gradeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="grade"
                    style={{ direction: isRTL ? 'rtl' : 'ltr' }}
                  />
                  <YAxis />
                  <Tooltip 
                    labelStyle={{ direction: isRTL ? 'rtl' : 'ltr' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#8884d8"
                    name={language === 'ar' ? 'عدد الخطط' : 'Number of IEPs'}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disabilities" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'توزيع الخطط حسب نوع الإعاقة' : 'IEPs by Disability Type'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={disabilityData} 
                  layout="horizontal"
                  margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="disability" 
                    type="category"
                    width={120}
                    style={{ fontSize: '12px', direction: isRTL ? 'rtl' : 'ltr' }}
                  />
                  <Tooltip 
                    labelStyle={{ direction: isRTL ? 'rtl' : 'ltr' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#82ca9d"
                    name={language === 'ar' ? 'عدد الخطط' : 'Number of IEPs'}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}