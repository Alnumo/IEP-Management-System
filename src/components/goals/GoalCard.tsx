import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Target, 
  TrendingUp, 
  Edit, 
  MoreHorizontal, 
  CheckCircle, 
  Clock, 
  Pause,
  AlertCircle,
  BarChart3,
  FileText
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { TherapyGoal } from '@/types/therapy-data'
import { useGoals } from '@/hooks/useGoals'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface GoalCardProps {
  goal: TherapyGoal
  onEdit?: (goal: TherapyGoal) => void
  onViewProgress?: (goal: TherapyGoal) => void
  onAddProgress?: (goal: TherapyGoal) => void
  onReview?: (goal: TherapyGoal) => void
}

export default function GoalCard({ goal, onEdit, onViewProgress, onAddProgress, onReview }: GoalCardProps) {
  const { language } = useLanguage()
  const { getGoalProgress, updateGoal } = useGoals()
  const [isUpdating, setIsUpdating] = useState(false)

  const progress = getGoalProgress(goal)
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': 
      case 'achieved': 
        return 'bg-green-100 text-green-800 border-green-200'
      case 'active': 
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'paused': 
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'discontinued':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'modified':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': 
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': 
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': 
        return 'bg-green-100 text-green-800 border-green-200'
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTherapyTypeColor = (type: string) => {
    switch (type) {
      case 'aba': 
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      case 'speech': 
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'occupational': 
        return 'bg-teal-100 text-teal-800 border-teal-200'
      case 'physical': 
        return 'bg-cyan-100 text-cyan-800 border-cyan-200'
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'achieved':
        return <CheckCircle className="w-3 h-3" />
      case 'active':
        return <Clock className="w-3 h-3" />
      case 'paused':
        return <Pause className="w-3 h-3" />
      case 'discontinued':
        return <AlertCircle className="w-3 h-3" />
      default:
        return <Target className="w-3 h-3" />
    }
  }

  const getStatusText = (status: string) => {
    const statusMap = {
      'active': language === 'ar' ? 'نشط' : 'Active',
      'achieved': language === 'ar' ? 'محقق' : 'Achieved',
      'completed': language === 'ar' ? 'مكتمل' : 'Completed',
      'paused': language === 'ar' ? 'متوقف مؤقتاً' : 'Paused',
      'discontinued': language === 'ar' ? 'متوقف' : 'Discontinued',
      'modified': language === 'ar' ? 'معدّل' : 'Modified'
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  const getPriorityText = (priority: string) => {
    const priorityMap = {
      'high': language === 'ar' ? 'عالي' : 'High',
      'medium': language === 'ar' ? 'متوسط' : 'Medium',
      'low': language === 'ar' ? 'منخفض' : 'Low'
    }
    return priorityMap[priority as keyof typeof priorityMap] || priority
  }

  const getTherapyTypeText = (type: string) => {
    const typeMap = {
      'aba': language === 'ar' ? 'العلاج السلوكي' : 'ABA Therapy',
      'speech': language === 'ar' ? 'علاج النطق' : 'Speech Therapy',
      'occupational': language === 'ar' ? 'العلاج الوظيفي' : 'Occupational Therapy',
      'physical': language === 'ar' ? 'العلاج الطبيعي' : 'Physical Therapy'
    }
    return typeMap[type as keyof typeof typeMap] || type
  }

  const handleStatusChange = async (newStatus: string) => {
    if (goal.goal_status === newStatus) return
    
    setIsUpdating(true)
    try {
      await updateGoal(goal.id, { goal_status: newStatus as any })
    } catch (error) {
      console.error('Failed to update goal status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600'
    if (progress >= 60) return 'text-yellow-600'
    return 'text-blue-600'
  }

  const isOverdue = new Date(goal.target_date) < new Date() && goal.goal_status === 'active'
  const daysUntilTarget = Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  return (
    <Card className={`relative transition-all duration-200 hover:shadow-md ${isOverdue ? 'border-red-200 bg-red-50/50' : ''}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getTherapyTypeColor(goal.therapy_type)}>
                {getTherapyTypeText(goal.therapy_type)}
              </Badge>
              <Badge className={getStatusColor(goal.goal_status)}>
                {getStatusIcon(goal.goal_status)}
                <span className="ml-1">{getStatusText(goal.goal_status)}</span>
              </Badge>
              <Badge className={getPriorityColor(goal.priority_level)}>
                {getPriorityText(goal.priority_level)}
              </Badge>
            </div>
            
            <CardTitle className={`text-lg leading-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
              {goal.goal_description}
            </CardTitle>
            
            <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              <span className="font-medium">{language === 'ar' ? 'الفئة:' : 'Category:'}</span> {goal.goal_category}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isUpdating}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(goal)}>
                  <Edit className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddProgress?.(goal)}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'إضافة تقدم' : 'Add Progress'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewProgress?.(goal)}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'عرض التقدم' : 'View Progress'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onReview?.(goal)}>
                  <FileText className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'مراجعة' : 'Review'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {goal.goal_status === 'active' && (
                  <>
                    <DropdownMenuItem onClick={() => handleStatusChange('paused')}>
                      <Pause className="w-4 h-4 mr-2" />
                      {language === 'ar' ? 'إيقاف مؤقت' : 'Pause'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange('achieved')}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {language === 'ar' ? 'تحديد كمحقق' : 'Mark as Achieved'}
                    </DropdownMenuItem>
                  </>
                )}
                {goal.goal_status === 'paused' && (
                  <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                    <Clock className="w-4 h-4 mr-2" />
                    {language === 'ar' ? 'استئناف' : 'Resume'}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Target Behavior */}
        <div>
          <p className={`text-sm font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'السلوك المستهدف:' : 'Target Behavior:'}
          </p>
          <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {goal.target_behavior}
          </p>
        </div>

        <Separator />

        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'التقدم' : 'Progress'}
            </span>
            <span className={`text-sm font-semibold ${getProgressColor(progress)}`}>
              {progress}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {goal.progress_data.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {language === 'ar' ? 'آخر قياس:' : 'Last measured:'} {goal.progress_data[goal.progress_data.length - 1].measured_value} {goal.target_criteria.target_unit}
              </span>
              <span>
                {language === 'ar' ? 'الهدف:' : 'Target:'} {goal.target_criteria.target_value} {goal.target_criteria.target_unit}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Timeline Information */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'تاريخ البداية' : 'Start Date'}
            </span>
            <span>{new Date(goal.start_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'التاريخ المستهدف' : 'Target Date'}
            </span>
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
              {new Date(goal.target_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
              {isOverdue && (
                <span className="ml-1">
                  ({language === 'ar' ? 'متأخر' : 'Overdue'})
                </span>
              )}
            </span>
          </div>
          {!isOverdue && daysUntilTarget >= 0 && (
            <div className="flex items-center justify-between">
              <span className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'الأيام المتبقية' : 'Days Remaining'}
              </span>
              <span className={daysUntilTarget <= 7 ? 'text-orange-600 font-medium' : ''}>
                {daysUntilTarget} {language === 'ar' ? 'أيام' : 'days'}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onViewProgress?.(goal)}
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            {language === 'ar' ? 'التقدم' : 'Progress'}
          </Button>
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => onEdit?.(goal)}
          >
            <Edit className="w-4 h-4 mr-1" />
            {language === 'ar' ? 'تعديل' : 'Edit'}
          </Button>
        </div>

        {/* Latest Review Note */}
        {goal.review_notes.length > 0 && (
          <>
            <Separator />
            <div className="p-3 bg-muted/50 rounded-md">
              <p className={`text-xs font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'آخر مراجعة:' : 'Latest Review:'}
              </p>
              <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {goal.review_notes[goal.review_notes.length - 1].progress_summary}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(goal.review_notes[goal.review_notes.length - 1].review_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}