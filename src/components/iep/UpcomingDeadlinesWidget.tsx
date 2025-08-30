import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, AlertCircle, User, ExternalLink } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { IEP } from '@/types/iep'

interface UpcomingDeadlinesWidgetProps {
  ieps?: IEP[]
  isLoading?: boolean
}

interface DeadlineItem {
  id: string
  iep_id: string
  student_name: string
  student_name_ar: string
  deadline_type: 'annual_review' | 'triennial_evaluation' | 'transition_plan' | 'goal_review'
  deadline_date: string
  days_until_due: number
  priority: 'overdue' | 'urgent' | 'upcoming' | 'future'
  status: string
}

export const UpcomingDeadlinesWidget = ({ ieps = [], isLoading }: UpcomingDeadlinesWidgetProps) => {
  const { language, isRTL } = useLanguage()

  const getDeadlineTypeLabel = (type: string) => {
    const labels = {
      annual_review: {
        en: 'Annual Review',
        ar: 'مراجعة سنوية'
      },
      triennial_evaluation: {
        en: 'Triennial Evaluation',
        ar: 'تقييم ثلاثي السنوات'
      },
      transition_plan: {
        en: 'Transition Plan',
        ar: 'خطة الانتقال'
      },
      goal_review: {
        en: 'Goal Review',
        ar: 'مراجعة الأهداف'
      }
    }
    return labels[type as keyof typeof labels]?.[language] || type
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200'
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'upcoming': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'future': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'overdue': return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'urgent': return <Clock className="w-4 h-4 text-orange-600" />
      case 'upcoming': return <Calendar className="w-4 h-4 text-yellow-600" />
      case 'future': return <Calendar className="w-4 h-4 text-blue-600" />
      default: return <Calendar className="w-4 h-4 text-gray-600" />
    }
  }

  const calculateDaysUntilDue = (dateString: string): number => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getDaysBadgeText = (days: number) => {
    if (language === 'ar') {
      if (days < 0) return `متأخر ${Math.abs(days)} يوم`
      if (days === 0) return 'اليوم'
      if (days === 1) return 'غداً'
      if (days <= 7) return `خلال ${days} أيام`
      if (days <= 30) return `خلال ${days} يوم`
      return `خلال ${days} يوم`
    } else {
      if (days < 0) return `${Math.abs(days)} days overdue`
      if (days === 0) return 'Due today'
      if (days === 1) return 'Due tomorrow'
      if (days <= 7) return `Due in ${days} days`
      if (days <= 30) return `Due in ${days} days`
      return `Due in ${days} days`
    }
  }

  // Generate deadline items from IEPs
  const generateDeadlineItems = (): DeadlineItem[] => {
    const deadlines: DeadlineItem[] = []

    ieps.forEach(iep => {
      // Annual review deadline
      if (iep.annual_review_date) {
        const days = calculateDaysUntilDue(iep.annual_review_date)
        let priority: DeadlineItem['priority'] = 'future'
        if (days < 0) priority = 'overdue'
        else if (days <= 7) priority = 'urgent'
        else if (days <= 30) priority = 'upcoming'

        deadlines.push({
          id: `${iep.id}-annual`,
          iep_id: iep.id,
          student_name: `${iep.student?.first_name_en || iep.student?.first_name_ar} ${iep.student?.last_name_en || iep.student?.last_name_ar}`,
          student_name_ar: `${iep.student?.first_name_ar} ${iep.student?.last_name_ar}`,
          deadline_type: 'annual_review',
          deadline_date: iep.annual_review_date,
          days_until_due: days,
          priority,
          status: iep.status
        })
      }

      // Triennial evaluation deadline
      if (iep.triennial_evaluation_date) {
        const days = calculateDaysUntilDue(iep.triennial_evaluation_date)
        let priority: DeadlineItem['priority'] = 'future'
        if (days < 0) priority = 'overdue'
        else if (days <= 14) priority = 'urgent'
        else if (days <= 60) priority = 'upcoming'

        deadlines.push({
          id: `${iep.id}-triennial`,
          iep_id: iep.id,
          student_name: `${iep.student?.first_name_en || iep.student?.first_name_ar} ${iep.student?.last_name_en || iep.student?.last_name_ar}`,
          student_name_ar: `${iep.student?.first_name_ar} ${iep.student?.last_name_ar}`,
          deadline_type: 'triennial_evaluation',
          deadline_date: iep.triennial_evaluation_date,
          days_until_due: days,
          priority,
          status: iep.status
        })
      }

      // Transition plan deadline (for students 16+)
      if (iep.transition_plan_date) {
        const days = calculateDaysUntilDue(iep.transition_plan_date)
        let priority: DeadlineItem['priority'] = 'future'
        if (days < 0) priority = 'overdue'
        else if (days <= 30) priority = 'urgent'
        else if (days <= 90) priority = 'upcoming'

        deadlines.push({
          id: `${iep.id}-transition`,
          iep_id: iep.id,
          student_name: `${iep.student?.first_name_en || iep.student?.first_name_ar} ${iep.student?.last_name_en || iep.student?.last_name_ar}`,
          student_name_ar: `${iep.student?.first_name_ar} ${iep.student?.last_name_ar}`,
          deadline_type: 'transition_plan',
          deadline_date: iep.transition_plan_date,
          days_until_due: days,
          priority,
          status: iep.status
        })
      }
    })

    // Sort by priority and then by days until due
    return deadlines
      .filter(d => d.days_until_due <= 90) // Only show deadlines within 90 days
      .sort((a, b) => {
        const priorityOrder = { overdue: 0, urgent: 1, upcoming: 2, future: 3 }
        const aPriority = priorityOrder[a.priority]
        const bPriority = priorityOrder[b.priority]
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority
        }
        return a.days_until_due - b.days_until_due
      })
      .slice(0, 8) // Limit to 8 most important deadlines
  }

  const deadlines = generateDeadlineItems()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Calendar className="h-5 w-5 text-blue-600" />
            {language === 'ar' ? 'المواعيد النهائية القادمة' : 'Upcoming Deadlines'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const overdueDeadlines = deadlines.filter(d => d.priority === 'overdue')
  const urgentDeadlines = deadlines.filter(d => d.priority === 'urgent')
  const upcomingDeadlines = deadlines.filter(d => d.priority === 'upcoming')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Calendar className="h-5 w-5 text-blue-600" />
            {language === 'ar' ? 'المواعيد النهائية القادمة' : 'Upcoming Deadlines'}
          </CardTitle>
          {deadlines.length > 0 && (
            <Badge variant={overdueDeadlines.length > 0 ? 'destructive' : urgentDeadlines.length > 0 ? 'secondary' : 'default'}>
              {deadlines.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {deadlines.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <p className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'لا توجد مواعيد نهائية قادمة' : 'No upcoming deadlines'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {/* Overdue Items First */}
            {overdueDeadlines.map((deadline) => (
              <div key={deadline.id} className="border rounded-lg p-3 bg-red-50 border-red-200">
                <div className="flex items-start gap-3">
                  {getPriorityIcon(deadline.priority)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={getPriorityColor(deadline.priority)} variant="outline">
                        {language === 'ar' ? 'متأخر' : 'OVERDUE'}
                      </Badge>
                      <span className={`text-xs font-medium text-red-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {getDaysBadgeText(deadline.days_until_due)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      <User className="w-3 h-3 text-gray-500" />
                      <p className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? deadline.student_name_ar : deadline.student_name}
                      </p>
                    </div>
                    <p className={`text-xs text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {getDeadlineTypeLabel(deadline.deadline_type)}
                    </p>
                    <p className={`text-xs text-gray-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {new Date(deadline.deadline_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Urgent Items */}
            {urgentDeadlines.map((deadline) => (
              <div key={deadline.id} className="border rounded-lg p-3 bg-orange-50 border-orange-200">
                <div className="flex items-start gap-3">
                  {getPriorityIcon(deadline.priority)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={getPriorityColor(deadline.priority)} variant="outline">
                        {language === 'ar' ? 'عاجل' : 'URGENT'}
                      </Badge>
                      <span className={`text-xs font-medium text-orange-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {getDaysBadgeText(deadline.days_until_due)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      <User className="w-3 h-3 text-gray-500" />
                      <p className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? deadline.student_name_ar : deadline.student_name}
                      </p>
                    </div>
                    <p className={`text-xs text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {getDeadlineTypeLabel(deadline.deadline_type)}
                    </p>
                    <p className={`text-xs text-gray-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {new Date(deadline.deadline_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Upcoming Items */}
            {upcomingDeadlines.map((deadline) => (
              <div key={deadline.id} className="border rounded-lg p-3">
                <div className="flex items-start gap-3">
                  {getPriorityIcon(deadline.priority)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={getPriorityColor(deadline.priority)} variant="outline">
                        {language === 'ar' ? 'قادم' : 'UPCOMING'}
                      </Badge>
                      <span className={`text-xs font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {getDaysBadgeText(deadline.days_until_due)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      <User className="w-3 h-3 text-gray-500" />
                      <p className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? deadline.student_name_ar : deadline.student_name}
                      </p>
                    </div>
                    <p className={`text-xs text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {getDeadlineTypeLabel(deadline.deadline_type)}
                    </p>
                    <p className={`text-xs text-gray-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {new Date(deadline.deadline_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {deadlines.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <Button variant="outline" size="sm" className="w-full">
              <span className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'عرض جميع المواعيد النهائية' : 'View All Deadlines'}
              </span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}