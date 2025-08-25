// Assessment Management Dashboard Component
import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { AssessmentToolRegistry } from './AssessmentToolRegistry'
import { VBMAPPAssessmentForm } from './VBMAPPAssessmentForm'
import { CELFAssessmentForm } from './CELFAssessmentForm'
import { 
  Calendar, 
  Clock, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Search,
  Brain,
  MessageCircle,
  Activity,
  Zap,
  Target,
  FileText,
  Download,
  Eye,
  Edit3
} from 'lucide-react'

// Mock data for demonstration
const MOCK_ASSESSMENTS = [
  {
    id: 'vbmapp-001',
    studentId: 'student-001',
    studentName: 'أحمد محمد',
    assessorId: 'assessor-001',
    assessorName: 'د. فاطمة العلي',
    assessmentType: 'VB-MAPP',
    domain: 'aba',
    status: 'completed',
    completionDate: '2024-01-15',
    overallScore: 85,
    percentile: 75,
    nextDueDate: '2024-07-15',
    priority: 'medium',
    milestones: {
      level1: 15,
      level2: 8,
      level3: 2
    },
    barriers: 3,
    recommendations: ['Continue intensive ABA intervention', 'Focus on social skills', 'Increase peer interactions']
  },
  {
    id: 'celf5-002',
    studentId: 'student-002',
    studentName: 'سارة أحمد',
    assessorId: 'assessor-002',
    assessorName: 'أ. محمد الحسن',
    assessmentType: 'CELF-5',
    domain: 'speech',
    status: 'in_progress',
    startDate: '2024-01-10',
    expectedCompletion: '2024-01-25',
    progressPercentage: 65,
    priority: 'high',
    subtestsCompleted: 4,
    totalSubtests: 7,
    currentScores: {
      receptive: 88,
      expressive: 92,
      core: 90
    }
  },
  {
    id: 'bot2-003',
    studentId: 'student-003',
    studentName: 'خالد علي',
    assessorId: 'assessor-003',
    assessorName: 'د. عائشة محمد',
    assessmentType: 'BOT-2',
    domain: 'occupational',
    status: 'scheduled',
    scheduledDate: '2024-01-30',
    priority: 'low',
    previousScore: 82,
    ageAtAssessment: 96
  },
  {
    id: 'pdms2-004',
    studentId: 'student-004',
    studentName: 'نور الدين',
    assessorId: 'assessor-001',
    assessorName: 'د. فاطمة العلي',
    assessmentType: 'PDMS-2',
    domain: 'physical',
    status: 'overdue',
    dueDate: '2024-01-05',
    priority: 'high',
    lastAssessment: '2023-07-05',
    daysPastDue: 20
  }
]

const STATUS_COLORS = {
  completed: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
}

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800'
}

const DOMAIN_ICONS = {
  aba: <Brain className="h-4 w-4" />,
  speech: <MessageCircle className="h-4 w-4" />,
  occupational: <Activity className="h-4 w-4" />,
  physical: <Zap className="h-4 w-4" />,
  multi_domain: <Target className="h-4 w-4" />
}

interface AssessmentDashboardProps {
  students?: Array<{ id: string; name_ar: string; name_en?: string }>
  assessors?: Array<{ id: string; name_ar: string; name_en?: string }>
}

export const AssessmentDashboard = ({
  students = [],
  assessors = []
}: AssessmentDashboardProps) => {
  const { language, isRTL } = useLanguage()
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [domainFilter, setDomainFilter] = useState('all')
  const [selectedTool, setSelectedTool] = useState<{ toolId: string; domain: string } | null>(null)

  // Calculate dashboard statistics
  const dashboardStats = useMemo(() => {
    const total = MOCK_ASSESSMENTS.length
    const completed = MOCK_ASSESSMENTS.filter(a => a.status === 'completed').length
    const inProgress = MOCK_ASSESSMENTS.filter(a => a.status === 'in_progress').length
    const overdue = MOCK_ASSESSMENTS.filter(a => a.status === 'overdue').length
    const scheduled = MOCK_ASSESSMENTS.filter(a => a.status === 'scheduled').length
    
    const completionRate = total > 0 ? (completed / total) * 100 : 0
    const averageScore = MOCK_ASSESSMENTS
      .filter(a => a.overallScore)
      .reduce((sum, a) => sum + (a.overallScore || 0), 0) / Math.max(1, MOCK_ASSESSMENTS.filter(a => a.overallScore).length)

    const domainBreakdown = MOCK_ASSESSMENTS.reduce((acc, assessment) => {
      acc[assessment.domain] = (acc[assessment.domain] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      completed,
      inProgress,
      overdue,
      scheduled,
      completionRate,
      averageScore,
      domainBreakdown
    }
  }, [])

  // Filter assessments based on search and filters
  const filteredAssessments = useMemo(() => {
    return MOCK_ASSESSMENTS.filter(assessment => {
      const matchesSearch = searchQuery === '' || 
        assessment.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assessment.assessmentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assessment.assessorName.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || assessment.status === statusFilter
      const matchesDomain = domainFilter === 'all' || assessment.domain === domainFilter

      return matchesSearch && matchesStatus && matchesDomain
    })
  }, [searchQuery, statusFilter, domainFilter])

  const handleNewAssessment = () => {
    // setShowNewAssessmentForm(true)
    setActiveTab('registry')
  }

  const handleToolSelection = (toolId: string, domain: string) => {
    setSelectedTool({ toolId, domain })
    if (toolId === 'vb-mapp' || toolId === 'celf-5') {
      setActiveTab('assessment')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />
      case 'scheduled': return <Calendar className="h-4 w-4 text-yellow-600" />
      case 'overdue': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
  }

  return (
    <div className={`space-y-6 ${language === 'ar' ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'ar' ? 'لوحة تحكم التقييمات' : 'Assessment Dashboard'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'إدارة وتتبع جميع التقييمات المعيارية للطلاب'
              : 'Manage and track all standardized assessments for students'
            }
          </p>
        </div>
        <Button onClick={handleNewAssessment}>
          <Plus className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'تقييم جديد' : 'New Assessment'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="assessments">
            {language === 'ar' ? 'التقييمات' : 'Assessments'}
          </TabsTrigger>
          <TabsTrigger value="registry">
            {language === 'ar' ? 'مكتبة الأدوات' : 'Tool Registry'}
          </TabsTrigger>
          <TabsTrigger value="assessment">
            {language === 'ar' ? 'تنفيذ التقييم' : 'Assessment'}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === 'ar' ? 'إجمالي التقييمات' : 'Total Assessments'}
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'جميع التقييمات' : 'All assessments'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === 'ar' ? 'المكتملة' : 'Completed'}
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{dashboardStats.completed}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(dashboardStats.completionRate)}% {language === 'ar' ? 'معدل الإكمال' : 'completion rate'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === 'ar' ? 'قيد التنفيذ' : 'In Progress'}
                </CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{dashboardStats.inProgress}</div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'تقييمات نشطة' : 'active assessments'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === 'ar' ? 'متأخرة' : 'Overdue'}
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{dashboardStats.overdue}</div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'تحتاج اهتمام' : 'need attention'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Domain Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'توزيع المجالات' : 'Domain Distribution'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(dashboardStats.domainBreakdown).map(([domain, count]) => (
                    <div key={domain} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {DOMAIN_ICONS[domain as keyof typeof DOMAIN_ICONS]}
                        <span className="text-sm">
                          {domain === 'aba' ? (language === 'ar' ? 'تحليل السلوك التطبيقي' : 'ABA') :
                           domain === 'speech' ? (language === 'ar' ? 'علاج النطق' : 'Speech') :
                           domain === 'occupational' ? (language === 'ar' ? 'العلاج المهني' : 'Occupational') :
                           domain === 'physical' ? (language === 'ar' ? 'العلاج الطبيعي' : 'Physical') :
                           (language === 'ar' ? 'متعدد المجالات' : 'Multi-Domain')
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={(count / dashboardStats.total) * 100} className="w-20 h-2" />
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'التقييمات الحديثة' : 'Recent Assessments'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MOCK_ASSESSMENTS.slice(0, 5).map((assessment) => (
                    <div key={assessment.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        {DOMAIN_ICONS[assessment.domain as keyof typeof DOMAIN_ICONS]}
                        <div>
                          <p className="text-sm font-medium">{assessment.studentName}</p>
                          <p className="text-xs text-muted-foreground">{assessment.assessmentType}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(assessment.status)}
                        <Badge className={`text-xs ${STATUS_COLORS[assessment.status as keyof typeof STATUS_COLORS]}`}>
                          {assessment.status === 'completed' ? (language === 'ar' ? 'مكتمل' : 'Completed') :
                           assessment.status === 'in_progress' ? (language === 'ar' ? 'قيد التنفيذ' : 'In Progress') :
                           assessment.status === 'scheduled' ? (language === 'ar' ? 'مجدول' : 'Scheduled') :
                           assessment.status === 'overdue' ? (language === 'ar' ? 'متأخر' : 'Overdue') :
                           assessment.status
                          }
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="space-y-6">
          
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                {language === 'ar' ? 'البحث والتصفية' : 'Search & Filter'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={language === 'ar' ? 'البحث في التقييمات...' : 'Search assessments...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'جميع الحالات' : 'All Statuses'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                    <SelectItem value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</SelectItem>
                    <SelectItem value="in_progress">{language === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</SelectItem>
                    <SelectItem value="scheduled">{language === 'ar' ? 'مجدول' : 'Scheduled'}</SelectItem>
                    <SelectItem value="overdue">{language === 'ar' ? 'متأخر' : 'Overdue'}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={domainFilter} onValueChange={setDomainFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'جميع المجالات' : 'All Domains'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'جميع المجالات' : 'All Domains'}</SelectItem>
                    <SelectItem value="aba">{language === 'ar' ? 'تحليل السلوك التطبيقي' : 'ABA'}</SelectItem>
                    <SelectItem value="speech">{language === 'ar' ? 'علاج النطق' : 'Speech'}</SelectItem>
                    <SelectItem value="occupational">{language === 'ar' ? 'العلاج المهني' : 'Occupational'}</SelectItem>
                    <SelectItem value="physical">{language === 'ar' ? 'العلاج الطبيعي' : 'Physical'}</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                  setDomainFilter('all')
                }}>
                  {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assessments List */}
          <div className="grid grid-cols-1 gap-4">
            {filteredAssessments.map((assessment) => (
              <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {DOMAIN_ICONS[assessment.domain as keyof typeof DOMAIN_ICONS]}
                        <Badge variant="outline" className="text-xs">
                          {assessment.assessmentType}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="font-semibold">{assessment.studentName}</h3>
                        <p className="text-sm text-muted-foreground">{assessment.assessorName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {assessment.status === 'completed' && (
                          <>
                            <div className="text-sm font-medium">
                              {language === 'ar' ? 'النتيجة:' : 'Score:'} {assessment.overallScore}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(assessment.completionDate)}
                            </div>
                          </>
                        )}
                        {assessment.status === 'in_progress' && (
                          <>
                            <div className="text-sm font-medium">
                              {Math.round(assessment.progressPercentage || 0)}% {language === 'ar' ? 'مكتمل' : 'Complete'}
                            </div>
                            <Progress value={assessment.progressPercentage || 0} className="w-20 h-2 mt-1" />
                          </>
                        )}
                        {assessment.status === 'scheduled' && (
                          <div className="text-sm font-medium">
                            {formatDate(assessment.scheduledDate)}
                          </div>
                        )}
                        {assessment.status === 'overdue' && (
                          <div className="text-sm font-medium text-red-600">
                            {assessment.daysPastDue || 0} {language === 'ar' ? 'يوم متأخر' : 'days overdue'}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusIcon(assessment.status)}
                        <Badge className={`text-xs ${STATUS_COLORS[assessment.status as keyof typeof STATUS_COLORS]}`}>
                          {assessment.status === 'completed' ? (language === 'ar' ? 'مكتمل' : 'Completed') :
                           assessment.status === 'in_progress' ? (language === 'ar' ? 'قيد التنفيذ' : 'In Progress') :
                           assessment.status === 'scheduled' ? (language === 'ar' ? 'مجدول' : 'Scheduled') :
                           assessment.status === 'overdue' ? (language === 'ar' ? 'متأخر' : 'Overdue') :
                           assessment.status
                          }
                        </Badge>
                        <Badge className={`text-xs ${PRIORITY_COLORS[assessment.priority as keyof typeof PRIORITY_COLORS]}`}>
                          {assessment.priority === 'high' ? (language === 'ar' ? 'عالي' : 'High') :
                           assessment.priority === 'medium' ? (language === 'ar' ? 'متوسط' : 'Medium') :
                           (language === 'ar' ? 'منخفض' : 'Low')
                          }
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          {language === 'ar' ? 'عرض' : 'View'}
                        </Button>
                        {assessment.status === 'in_progress' && (
                          <Button variant="outline" size="sm">
                            <Edit3 className="h-3 w-3 mr-1" />
                            {language === 'ar' ? 'متابعة' : 'Continue'}
                          </Button>
                        )}
                        {assessment.status === 'completed' && (
                          <Button variant="outline" size="sm">
                            <Download className="h-3 w-3 mr-1" />
                            {language === 'ar' ? 'تقرير' : 'Report'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredAssessments.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">
                  {language === 'ar' ? 'لم يتم العثور على تقييمات' : 'No assessments found'}
                </p>
                <p className="text-sm mt-1">
                  {language === 'ar' 
                    ? 'جرب تعديل معايير البحث أو إنشاء تقييم جديد'
                    : 'Try adjusting your search criteria or create a new assessment'
                  }
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tool Registry Tab */}
        <TabsContent value="registry" className="space-y-6">
          <AssessmentToolRegistry 
            onSelectTool={handleToolSelection}
            showFilters={true}
          />
        </TabsContent>

        {/* Assessment Form Tab */}
        <TabsContent value="assessment" className="space-y-6">
          {selectedTool?.toolId === 'vb-mapp' && (
            <VBMAPPAssessmentForm
              students={students}
              assessors={assessors}
              onSubmit={async (data) => {
                console.log('VB-MAPP Assessment submitted:', data)
                // Handle assessment submission
              }}
              onCancel={() => {
                setSelectedTool(null)
                setActiveTab('registry')
              }}
            />
          )}
          
          {selectedTool?.toolId === 'celf-5' && (
            <CELFAssessmentForm
              students={students}
              assessors={assessors}
              onSubmit={async (data) => {
                console.log('CELF-5 Assessment submitted:', data)
                // Handle assessment submission
              }}
              onCancel={() => {
                setSelectedTool(null)
                setActiveTab('registry')
              }}
            />
          )}

          {!selectedTool && (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">
                  {language === 'ar' ? 'اختر أداة تقييم للبدء' : 'Select an assessment tool to begin'}
                </p>
                <p className="text-sm mt-1">
                  {language === 'ar' 
                    ? 'انتقل إلى مكتبة الأدوات لاختيار أداة تقييم معيارية'
                    : 'Go to the Tool Registry to select a standardized assessment tool'
                  }
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveTab('registry')}
                >
                  {language === 'ar' ? 'استعراض الأدوات' : 'Browse Tools'}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AssessmentDashboard