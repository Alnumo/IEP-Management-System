// Progress Tracking Page - Monitor student advancement and analytics  
import { useState } from 'react'
import { Calendar, BarChart3, PieChart, Filter, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/contexts/LanguageContext'

interface ProgressMetric {
  id: string
  studentName: string
  category: string
  currentScore: number
  previousScore: number
  improvement: number
  lastAssessment: string
  status: 'improving' | 'stable' | 'declining'
}

export default function ProgressTrackingPage() {
  const { language } = useLanguage()
  
  const [progressData] = useState<ProgressMetric[]>([
    {
      id: '1',
      studentName: language === 'ar' ? 'أحمد محمد' : 'Ahmed Mohammed',
      category: language === 'ar' ? 'المهارات الحركية' : 'Motor Skills',
      currentScore: 85,
      previousScore: 75,
      improvement: 13.3,
      lastAssessment: '2024-03-15',
      status: 'improving'
    },
    {
      id: '2',
      studentName: language === 'ar' ? 'فاطمة أحمد' : 'Fatima Ahmed', 
      category: language === 'ar' ? 'التواصل' : 'Communication',
      currentScore: 78,
      previousScore: 80,
      improvement: -2.5,
      lastAssessment: '2024-03-10',
      status: 'declining'
    },
    {
      id: '3',
      studentName: language === 'ar' ? 'عبد الله علي' : 'Abdullah Ali',
      category: language === 'ar' ? 'المهارات الاجتماعية' : 'Social Skills',
      currentScore: 72,
      previousScore: 71,
      improvement: 1.4,
      lastAssessment: '2024-03-12',
      status: 'stable'
    }
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'improving': return 'bg-green-100 text-green-800'
      case 'stable': return 'bg-blue-100 text-blue-800'
      case 'declining': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'improving': return '↗️'
      case 'stable': return '→'
      case 'declining': return '↘️'
      default: return '-'
    }
  }

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'متابعة التقدم' : 'Progress Tracking'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'مراقبة تقدم الطلاب وتحليل الأداء' : 'Monitor student progress and performance analytics'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 ml-2" />
            {language === 'ar' ? 'تصفية' : 'Filter'}
          </Button>
          <Button>
            <Download className="w-4 h-4 ml-2" />
            {language === 'ar' ? 'تصدير' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'إجمالي الطلاب' : 'Total Students'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">
              +12% {language === 'ar' ? 'من الشهر الماضي' : 'from last month'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'متوسط التحسن' : 'Average Improvement'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+8.7%</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'خلال 3 أشهر' : 'over 3 months'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الطلاب المتحسنون' : 'Improving Students'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">128</div>
            <p className="text-xs text-muted-foreground">82% {language === 'ar' ? 'من الطلاب' : 'of students'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'التقييمات المكتملة' : 'Assessments Completed'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">487</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'هذا الشهر' : 'this month'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="individual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="individual">
            {language === 'ar' ? 'التقدم الفردي' : 'Individual Progress'}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            {language === 'ar' ? 'التحليلات' : 'Analytics'}
          </TabsTrigger>
          <TabsTrigger value="reports">
            {language === 'ar' ? 'التقارير' : 'Reports'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'تقدم الطلاب الفردي' : 'Individual Student Progress'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progressData.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {student.studentName}
                      </h4>
                      <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {student.category}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">{student.currentScore}%</div>
                        <div className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'النتيجة الحالية' : 'Current Score'}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getStatusIcon(student.status)}</span>
                        <div className={`text-sm font-medium ${
                          student.improvement >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {student.improvement > 0 ? '+' : ''}{student.improvement.toFixed(1)}%
                        </div>
                      </div>
                      
                      <Badge className={getStatusColor(student.status)}>
                        {language === 'ar' 
                          ? (student.status === 'improving' ? 'متحسن' : student.status === 'stable' ? 'مستقر' : 'متراجع')
                          : student.status
                        }
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  <BarChart3 className="w-5 h-5" />
                  {language === 'ar' ? 'التحسن حسب الفئة' : 'Improvement by Category'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'المهارات الحركية' : 'Motor Skills'}
                      </span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'التواصل' : 'Communication'}
                      </span>
                      <span>72%</span>
                    </div>
                    <Progress value={72} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'المهارات الاجتماعية' : 'Social Skills'}
                      </span>
                      <span>68%</span>
                    </div>
                    <Progress value={68} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  <PieChart className="w-5 h-5" />
                  {language === 'ar' ? 'توزيع حالة التقدم' : 'Progress Status Distribution'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'متحسن' : 'Improving'}
                      </span>
                    </div>
                    <span className="text-sm font-medium">82% (128)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'مستقر' : 'Stable'}
                      </span>
                    </div>
                    <span className="text-sm font-medium">15% (23)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'متراجع' : 'Declining'}
                      </span>
                    </div>
                    <span className="text-sm font-medium">3% (5)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className={`${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'تقارير التقدم' : 'Progress Reports'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className={`text-lg font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'التقارير قيد التطوير' : 'Reports Coming Soon'}
                </h3>
                <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' 
                    ? 'سيتم إضافة تقارير مفصلة قريباً' 
                    : 'Detailed progress reports will be available soon'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}