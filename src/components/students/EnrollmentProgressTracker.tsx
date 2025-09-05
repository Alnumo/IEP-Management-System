// Story 6.1: Individual progress tracker component for monitoring student enrollment progress

import React, { useState, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  CheckCircle, 
  AlertCircle, 
  Activity,
  Users,
  FileText,
  BarChart3
} from 'lucide-react'
import type { IndividualizedEnrollment } from '@/types/individualized-enrollment'
import type { ProgramTemplate } from '@/types/program-templates'

interface SessionProgress {
  id: string
  session_date: string
  session_type: string
  duration_minutes: number
  goals_addressed: string[]
  progress_rating: 1 | 2 | 3 | 4 | 5 // 1=Poor, 5=Excellent
  therapist_notes: string
  parent_feedback?: string
  attendance_status: 'present' | 'absent' | 'late' | 'cancelled'
  behavioral_observations: {
    cooperation: 1 | 2 | 3 | 4 | 5
    engagement: 1 | 2 | 3 | 4 | 5
    communication: 1 | 2 | 3 | 4 | 5
    focus: 1 | 2 | 3 | 4 | 5
  }
}

interface GoalProgress {
  goal_id: string
  goal_text_ar: string
  goal_text_en: string
  target_date: string
  current_progress: number // 0-100
  milestone_count: number
  completed_milestones: number
  priority: 'high' | 'medium' | 'low'
  status: 'on_track' | 'at_risk' | 'behind' | 'completed'
  last_assessed: string
}

interface EnrollmentProgressTrackerProps {
  enrollment: IndividualizedEnrollment
  programTemplate: ProgramTemplate
  sessionHistory?: SessionProgress[]
  goalProgress?: GoalProgress[]
  onUpdateProgress?: (goalId: string, progress: number) => void
  onAddMilestone?: (goalId: string, milestone: string) => void
  onGenerateReport?: () => void
  className?: string
}

export function EnrollmentProgressTracker({
  enrollment,
  programTemplate,
  sessionHistory = [],
  goalProgress = [],
  onUpdateProgress,
  onAddMilestone,
  onGenerateReport,
  className = ''
}: EnrollmentProgressTrackerProps) {
  const { language, isRTL } = useLanguage()
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)

  const texts = {
    title: {
      ar: 'تتبع تقدم التسجيل',
      en: 'Enrollment Progress Tracker'
    },
    overview: {
      ar: 'نظرة عامة',
      en: 'Overview'
    },
    goals: {
      ar: 'الأهداف',
      en: 'Goals'
    },
    sessions: {
      ar: 'الجلسات',
      en: 'Sessions'
    },
    analytics: {
      ar: 'التحليلات',
      en: 'Analytics'
    },
    programProgress: {
      ar: 'تقدم البرنامج',
      en: 'Program Progress'
    },
    completionRate: {
      ar: 'معدل الإنجاز',
      en: 'Completion Rate'
    },
    attendanceRate: {
      ar: 'معدل الحضور',
      en: 'Attendance Rate'
    },
    averageRating: {
      ar: 'التقييم المتوسط',
      en: 'Average Rating'
    },
    totalSessions: {
      ar: 'إجمالي الجلسات',
      en: 'Total Sessions'
    },
    completedSessions: {
      ar: 'الجلسات المكتملة',
      en: 'Completed Sessions'
    },
    upcomingSessions: {
      ar: 'الجلسات القادمة',
      en: 'Upcoming Sessions'
    },
    onTrack: {
      ar: 'في المسار الصحيح',
      en: 'On Track'
    },
    atRisk: {
      ar: 'في خطر',
      en: 'At Risk'
    },
    behind: {
      ar: 'متأخر',
      en: 'Behind'
    },
    completed: {
      ar: 'مكتمل',
      en: 'Completed'
    },
    highPriority: {
      ar: 'أولوية عالية',
      en: 'High Priority'
    },
    mediumPriority: {
      ar: 'أولوية متوسطة',
      en: 'Medium Priority'
    },
    lowPriority: {
      ar: 'أولوية منخفضة',
      en: 'Low Priority'
    },
    present: {
      ar: 'حاضر',
      en: 'Present'
    },
    absent: {
      ar: 'غائب',
      en: 'Absent'
    },
    late: {
      ar: 'متأخر',
      en: 'Late'
    },
    cancelled: {
      ar: 'ملغي',
      en: 'Cancelled'
    },
    excellent: {
      ar: 'ممتاز',
      en: 'Excellent'
    },
    good: {
      ar: 'جيد',
      en: 'Good'
    },
    average: {
      ar: 'متوسط',
      en: 'Average'
    },
    poor: {
      ar: 'ضعيف',
      en: 'Poor'
    },
    generateReport: {
      ar: 'إنشاء تقرير',
      en: 'Generate Report'
    },
    noSessions: {
      ar: 'لا توجد جلسات مسجلة',
      en: 'No sessions recorded'
    },
    noGoals: {
      ar: 'لا توجد أهداف محددة',
      en: 'No goals defined'
    }
  }

  // Calculate overall statistics
  const statistics = useMemo(() => {
    const totalPlannedSessions = enrollment.custom_schedule.sessions_per_week * 
      ((new Date(enrollment.individual_end_date).getTime() - new Date(enrollment.individual_start_date).getTime()) / (1000 * 60 * 60 * 24 * 7))
    
    const completedSessions = sessionHistory.filter(s => s.attendance_status === 'present').length
    const attendedSessions = sessionHistory.filter(s => ['present', 'late'].includes(s.attendance_status)).length
    const averageRating = attendedSessions > 0 ? 
      sessionHistory.filter(s => s.attendance_status === 'present')
        .reduce((sum, s) => sum + s.progress_rating, 0) / completedSessions : 0

    const overallGoalProgress = goalProgress.length > 0 ? 
      goalProgress.reduce((sum, g) => sum + g.current_progress, 0) / goalProgress.length : 0

    return {
      totalPlannedSessions: Math.ceil(totalPlannedSessions),
      completedSessions,
      attendanceRate: sessionHistory.length > 0 ? (attendedSessions / sessionHistory.length) * 100 : 0,
      completionRate: totalPlannedSessions > 0 ? (completedSessions / totalPlannedSessions) * 100 : 0,
      averageRating,
      overallGoalProgress,
      goalsOnTrack: goalProgress.filter(g => g.status === 'on_track').length,
      goalsAtRisk: goalProgress.filter(g => g.status === 'at_risk').length,
      goalsBehind: goalProgress.filter(g => g.status === 'behind').length,
      goalsCompleted: goalProgress.filter(g => g.status === 'completed').length
    }
  }, [enrollment, sessionHistory, goalProgress])

  // Get status color and icon
  const getStatusDisplay = (status: GoalProgress['status']) => {
    switch (status) {
      case 'on_track':
        return {
          color: 'bg-green-100 text-green-800',
          icon: <CheckCircle className="w-4 h-4" />,
          text: texts.onTrack[language]
        }
      case 'at_risk':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: <AlertCircle className="w-4 h-4" />,
          text: texts.atRisk[language]
        }
      case 'behind':
        return {
          color: 'bg-red-100 text-red-800',
          icon: <TrendingDown className="w-4 h-4" />,
          text: texts.behind[language]
        }
      case 'completed':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: <CheckCircle className="w-4 h-4" />,
          text: texts.completed[language]
        }
    }
  }

  const getPriorityDisplay = (priority: GoalProgress['priority']) => {
    switch (priority) {
      case 'high':
        return {
          color: 'bg-red-100 text-red-800',
          text: texts.highPriority[language]
        }
      case 'medium':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          text: texts.mediumPriority[language]
        }
      case 'low':
        return {
          color: 'bg-gray-100 text-gray-800',
          text: texts.lowPriority[language]
        }
    }
  }

  const getAttendanceDisplay = (status: SessionProgress['attendance_status']) => {
    const displays = {
      present: { color: 'bg-green-100 text-green-800', text: texts.present[language] },
      absent: { color: 'bg-red-100 text-red-800', text: texts.absent[language] },
      late: { color: 'bg-yellow-100 text-yellow-800', text: texts.late[language] },
      cancelled: { color: 'bg-gray-100 text-gray-800', text: texts.cancelled[language] }
    }
    return displays[status]
  }

  const getRatingText = (rating: number) => {
    const ratings = {
      5: texts.excellent[language],
      4: texts.good[language],
      3: texts.average[language],
      2: texts.poor[language],
      1: texts.poor[language]
    }
    return ratings[rating as keyof typeof ratings]
  }

  return (
    <div className={`space-y-6 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <h2 className="text-2xl font-bold">{texts.title[language]}</h2>
        {onGenerateReport && (
          <Button onClick={onGenerateReport} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            {texts.generateReport[language]}
          </Button>
        )}
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {texts.completionRate[language]}
                </p>
                <p className="text-2xl font-bold">{statistics.completionRate.toFixed(1)}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <Progress value={statistics.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {texts.attendanceRate[language]}
                </p>
                <p className="text-2xl font-bold">{statistics.attendanceRate.toFixed(1)}%</p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
            <Progress value={statistics.attendanceRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {texts.averageRating[language]}
                </p>
                <p className="text-2xl font-bold">{statistics.averageRating.toFixed(1)}/5</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map(star => (
                <div 
                  key={star}
                  className={`w-4 h-4 rounded-sm ${
                    star <= statistics.averageRating ? 'bg-yellow-400' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {texts.completedSessions[language]}
                </p>
                <p className="text-2xl font-bold">
                  {statistics.completedSessions}/{statistics.totalPlannedSessions}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
            <Progress 
              value={(statistics.completedSessions / statistics.totalPlannedSessions) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{texts.overview[language]}</TabsTrigger>
          <TabsTrigger value="goals">{texts.goals[language]}</TabsTrigger>
          <TabsTrigger value="sessions">{texts.sessions[language]}</TabsTrigger>
          <TabsTrigger value="analytics">{texts.analytics[language]}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Goal Status Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  {texts.goals[language]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{texts.completed[language]}</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {statistics.goalsCompleted}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{texts.onTrack[language]}</span>
                    <Badge className="bg-green-100 text-green-800">
                      {statistics.goalsOnTrack}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{texts.atRisk[language]}</span>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {statistics.goalsAtRisk}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{texts.behind[language]}</span>
                    <Badge className="bg-red-100 text-red-800">
                      {statistics.goalsBehind}
                    </Badge>
                  </div>
                </div>
                <Progress value={statistics.overallGoalProgress} className="mt-4" />
                <p className="text-sm text-muted-foreground mt-2">
                  {statistics.overallGoalProgress.toFixed(1)}% {texts.completionRate[language]}
                </p>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionHistory.slice(0, 5).length > 0 ? (
                  <div className="space-y-3">
                    {sessionHistory.slice(-5).reverse().map((session, index) => (
                      <div key={session.id} className="flex items-center gap-3 p-2 rounded border">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {session.session_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.session_date).toLocaleDateString(
                              language === 'ar' ? 'ar-SA' : 'en-US'
                            )}
                          </p>
                        </div>
                        <Badge className={getAttendanceDisplay(session.attendance_status).color}>
                          {getAttendanceDisplay(session.attendance_status).text}
                        </Badge>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <div 
                              key={star}
                              className={`w-3 h-3 rounded-sm ${
                                star <= session.progress_rating ? 'bg-yellow-400' : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{texts.noSessions[language]}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          {goalProgress.length > 0 ? (
            <div className="space-y-4">
              {goalProgress.map((goal) => {
                const statusDisplay = getStatusDisplay(goal.status)
                const priorityDisplay = getPriorityDisplay(goal.priority)
                
                return (
                  <Card key={goal.goal_id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium">
                              {language === 'ar' ? goal.goal_text_ar : goal.goal_text_en}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Target: {new Date(goal.target_date).toLocaleDateString(
                                language === 'ar' ? 'ar-SA' : 'en-US'
                              )}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={priorityDisplay.color}>
                              {priorityDisplay.text}
                            </Badge>
                            <Badge className={statusDisplay.color}>
                              {statusDisplay.icon}
                              <span className="ml-1">{statusDisplay.text}</span>
                            </Badge>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Progress</span>
                            <span className="text-sm text-muted-foreground">
                              {goal.current_progress}%
                            </span>
                          </div>
                          <Progress value={goal.current_progress} />
                        </div>

                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <span>
                            Milestones: {goal.completed_milestones}/{goal.milestone_count}
                          </span>
                          <span>
                            Last assessed: {new Date(goal.last_assessed).toLocaleDateString(
                              language === 'ar' ? 'ar-SA' : 'en-US'
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{texts.noGoals[language]}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          {sessionHistory.length > 0 ? (
            <div className="space-y-4">
              {sessionHistory.slice().reverse().map((session) => {
                const attendanceDisplay = getAttendanceDisplay(session.attendance_status)
                
                return (
                  <Card key={session.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{session.session_type}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(session.session_date).toLocaleDateString(
                                language === 'ar' ? 'ar-SA' : 'en-US'
                              )} • {session.duration_minutes} minutes
                            </p>
                          </div>
                          <div className="flex gap-2 items-center">
                            <Badge className={attendanceDisplay.color}>
                              {attendanceDisplay.text}
                            </Badge>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map(star => (
                                <div 
                                  key={star}
                                  className={`w-4 h-4 rounded-sm ${
                                    star <= session.progress_rating ? 'bg-yellow-400' : 'bg-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {session.goals_addressed.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Goals Addressed:</p>
                            <div className="flex flex-wrap gap-1">
                              {session.goals_addressed.map((goal, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {goal}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {session.therapist_notes && (
                          <div>
                            <p className="text-sm font-medium mb-1">Therapist Notes:</p>
                            <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                              {session.therapist_notes}
                            </p>
                          </div>
                        )}

                        {session.parent_feedback && (
                          <div>
                            <p className="text-sm font-medium mb-1">Parent Feedback:</p>
                            <p className="text-sm text-muted-foreground bg-blue-50 p-2 rounded">
                              {session.parent_feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{texts.noSessions[language]}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Behavioral Observations Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Behavioral Observations</CardTitle>
              </CardHeader>
              <CardContent>
                {sessionHistory.filter(s => s.attendance_status === 'present').length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries({
                      cooperation: 'Cooperation',
                      engagement: 'Engagement', 
                      communication: 'Communication',
                      focus: 'Focus'
                    }).map(([key, label]) => {
                      const scores = sessionHistory
                        .filter(s => s.attendance_status === 'present')
                        .map(s => s.behavioral_observations[key as keyof typeof s.behavioral_observations])
                      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
                      
                      return (
                        <div key={key}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">{label}</span>
                            <span className="text-sm text-muted-foreground">
                              {average.toFixed(1)}/5
                            </span>
                          </div>
                          <Progress value={average * 20} />
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No behavioral data available</p>
                )}
              </CardContent>
            </Card>

            {/* Goals Progress Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Goals Progress Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {goalProgress.length > 0 ? (
                  <div className="space-y-4">
                    {goalProgress.map((goal) => (
                      <div key={goal.goal_id}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium truncate">
                            {language === 'ar' ? goal.goal_text_ar : goal.goal_text_en}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {goal.current_progress}%
                          </span>
                        </div>
                        <Progress value={goal.current_progress} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No goals progress data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}