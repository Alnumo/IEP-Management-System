import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Target, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Plus,
  Search,
  Filter,
  BarChart3,
  Calendar,
  Users,
  Award
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useGoals, GoalFilters } from '@/hooks/useGoals'
import GoalCard from './GoalCard'
import GoalForm from './GoalForm'
import ProgressDialog from './ProgressDialog'
import GoalProgressChart from './GoalProgressChart'
import { TherapyGoal, CreateTherapyGoal } from '@/types/therapy-data'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function GoalsDashboard() {
  const { language } = useLanguage()
  const { goals, loading, createGoal, getGoalStats } = useGoals()
  const [filters, setFilters] = useState<GoalFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGoal, setSelectedGoal] = useState<TherapyGoal | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showProgressChart, setShowProgressChart] = useState(false)
  const [showProgressDialog, setShowProgressDialog] = useState(false)

  const stats = getGoalStats(goals)
  
  const filteredGoals = goals.filter(goal => {
    const matchesSearch = searchQuery === '' || 
      goal.goal_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      goal.goal_category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      goal.target_behavior.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesTherapyType = !filters.therapy_type || goal.therapy_type === filters.therapy_type
    const matchesStatus = !filters.status || goal.goal_status === filters.status
    const matchesPriority = !filters.priority || goal.priority_level === filters.priority
    const matchesStudent = !filters.student_id || goal.student_id === filters.student_id
    
    return matchesSearch && matchesTherapyType && matchesStatus && matchesPriority && matchesStudent
  })

  const handleCreateGoal = async (goalData: CreateTherapyGoal) => {
    try {
      await createGoal(goalData)
      setShowCreateForm(false)
    } catch (error) {
      console.error('Failed to create goal:', error)
    }
  }

  const getStatIcon = (type: string) => {
    switch (type) {
      case 'total': return <Target className="w-8 h-8 text-blue-500" />
      case 'active': return <Clock className="w-8 h-8 text-green-500" />
      case 'achieved': return <CheckCircle className="w-8 h-8 text-emerald-500" />
      case 'high_priority': return <AlertCircle className="w-8 h-8 text-red-500" />
      default: return <BarChart3 className="w-8 h-8 text-purple-500" />
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-blue-600'
  }

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'لوحة تحكم الأهداف العلاجية' : 'Therapeutic Goals Dashboard'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إدارة ومتابعة الأهداف العلاجية للطلاب' : 'Manage and track therapeutic goals for students'}
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {language === 'ar' ? 'إضافة هدف' : 'Add Goal'}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'إجمالي الأهداف' : 'Total Goals'}
                </p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              {getStatIcon('total')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'الأهداف النشطة' : 'Active Goals'}
                </p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              {getStatIcon('active')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'الأهداف المحققة' : 'Achieved Goals'}
                </p>
                <p className="text-2xl font-bold text-emerald-600">{stats.achieved}</p>
              </div>
              {getStatIcon('achieved')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'متوسط التقدم' : 'Average Progress'}
                </p>
                <p className={`text-2xl font-bold ${getProgressColor(stats.avg_progress_percentage)}`}>
                  {stats.avg_progress_percentage}%
                </p>
              </div>
              {getStatIcon('progress')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={language === 'ar' ? 'البحث في الأهداف...' : 'Search goals...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select 
                value={filters.therapy_type || 'all'} 
                onValueChange={(value) => setFilters({...filters, therapy_type: value === 'all' ? undefined : value as any})}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={language === 'ar' ? 'نوع العلاج' : 'Therapy Type'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'جميع الأنواع' : 'All Types'}</SelectItem>
                  <SelectItem value="aba">{language === 'ar' ? 'العلاج السلوكي' : 'ABA'}</SelectItem>
                  <SelectItem value="speech">{language === 'ar' ? 'علاج النطق' : 'Speech'}</SelectItem>
                  <SelectItem value="occupational">{language === 'ar' ? 'العلاج الوظيفي' : 'OT'}</SelectItem>
                  <SelectItem value="physical">{language === 'ar' ? 'العلاج الطبيعي' : 'PT'}</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.status || 'all'} 
                onValueChange={(value) => setFilters({...filters, status: value === 'all' ? undefined : value as any})}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</SelectItem>
                  <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                  <SelectItem value="achieved">{language === 'ar' ? 'محقق' : 'Achieved'}</SelectItem>
                  <SelectItem value="paused">{language === 'ar' ? 'متوقف' : 'Paused'}</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.priority || 'all'} 
                onValueChange={(value) => setFilters({...filters, priority: value === 'all' ? undefined : value as any})}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={language === 'ar' ? 'الأولوية' : 'Priority'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'جميع الأولويات' : 'All Priorities'}</SelectItem>
                  <SelectItem value="high">{language === 'ar' ? 'عالية' : 'High'}</SelectItem>
                  <SelectItem value="medium">{language === 'ar' ? 'متوسطة' : 'Medium'}</SelectItem>
                  <SelectItem value="low">{language === 'ar' ? 'منخفضة' : 'Low'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters */}
          {(filters.therapy_type || filters.status || filters.priority || searchQuery) && (
            <div className="flex items-center gap-2 mt-3">
              <span className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'المرشحات النشطة:' : 'Active filters:'}
              </span>
              {filters.therapy_type && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilters({...filters, therapy_type: undefined})}>
                  {filters.therapy_type} ×
                </Badge>
              )}
              {filters.status && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilters({...filters, status: undefined})}>
                  {filters.status} ×
                </Badge>
              )}
              {filters.priority && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilters({...filters, priority: undefined})}>
                  {filters.priority} ×
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchQuery('')}>
                  "{searchQuery}" ×
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setFilters({})
                  setSearchQuery('')
                }}
              >
                {language === 'ar' ? 'مسح الكل' : 'Clear all'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goals Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'الأهداف' : 'Goals'} ({filteredGoals.length})
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-2 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-gray-200 rounded flex-1"></div>
                    <div className="h-8 bg-gray-200 rounded flex-1"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredGoals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 space-y-3">
              <Target className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className={`font-medium text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'لا توجد أهداف' : 'No Goals Found'}
                </h3>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {searchQuery || Object.keys(filters).some(key => filters[key as keyof GoalFilters])
                    ? (language === 'ar' ? 'لا توجد أهداف تطابق المرشحات' : 'No goals match your filters')
                    : (language === 'ar' ? 'ابدأ بإضافة هدف علاجي' : 'Start by adding a therapeutic goal')
                  }
                </p>
              </div>
              {!searchQuery && !Object.keys(filters).some(key => filters[key as keyof GoalFilters]) && (
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'إضافة هدف' : 'Add Goal'}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={(goal) => {
                  setSelectedGoal(goal)
                  setShowCreateForm(true)
                }}
                onViewProgress={(goal) => {
                  setSelectedGoal(goal)
                  setShowProgressChart(true)
                }}
                onAddProgress={(goal) => {
                  setSelectedGoal(goal)
                  setShowProgressDialog(true)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      
      {/* Create/Edit Goal Form */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={language === 'ar' ? 'font-arabic' : ''}>
              {selectedGoal 
                ? (language === 'ar' ? 'تعديل الهدف' : 'Edit Goal')
                : (language === 'ar' ? 'إضافة هدف جديد' : 'Add New Goal')
              }
            </DialogTitle>
          </DialogHeader>
          <GoalForm
            onSubmit={handleCreateGoal}
            onCancel={() => {
              setShowCreateForm(false)
              setSelectedGoal(null)
            }}
            initialData={selectedGoal || undefined}
            isLoading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Progress Chart */}
      <Dialog open={showProgressChart} onOpenChange={setShowProgressChart}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={language === 'ar' ? 'font-arabic' : ''}>
              {language === 'ar' ? 'مخطط التقدم' : 'Progress Chart'}
            </DialogTitle>
          </DialogHeader>
          {selectedGoal && (
            <GoalProgressChart goal={selectedGoal} />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Progress Dialog */}
      {selectedGoal && (
        <ProgressDialog
          goal={selectedGoal}
          open={showProgressDialog}
          onOpenChange={(open) => {
            setShowProgressDialog(open)
            if (!open) setSelectedGoal(null)
          }}
        />
      )}
    </div>
  )
}