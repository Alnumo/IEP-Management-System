// Smart Recommendations Component - Phase 6 Implementation
// AI-powered treatment recommendations with confidence scoring

import { useState } from 'react'
import { Brain, Target, TrendingUp, Clock, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAIRecommendations, useGenerateRecommendations } from '@/hooks/useAIAnalytics'
import type { TreatmentRecommendation } from '@/types/ai-analytics'

interface SmartRecommendationsProps {
  studentId: string
  studentData?: any
  className?: string
}

export const SmartRecommendations = ({ studentId, studentData, className }: SmartRecommendationsProps) => {
  const { language } = useLanguage()
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null)

  const { data: recommendations = [], isLoading, error } = useAIRecommendations(studentId)
  const generateRecommendations = useGenerateRecommendations()

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50 border-green-200'
    if (confidence >= 0.8) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'intensive': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-blue-100 text-blue-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRecommendationTypeIcon = (type: string) => {
    switch (type) {
      case 'initial': return <Lightbulb className="w-4 h-4" />
      case 'adjustment': return <TrendingUp className="w-4 h-4" />
      case 'continuation': return <CheckCircle className="w-4 h-4" />
      case 'transition': return <Target className="w-4 h-4" />
      default: return <Brain className="w-4 h-4" />
    }
  }

  const handleGenerateRecommendations = () => {
    if (studentData) {
      generateRecommendations.mutate({ studentId, studentData })
    }
  }

  const handleAcceptRecommendation = (recommendationId: string) => {
    console.log('Accepting recommendation:', recommendationId)
    // In real implementation, this would update the recommendation status
  }

  const handleRejectRecommendation = (recommendationId: string) => {
    console.log('Rejecting recommendation:', recommendationId)
    // In real implementation, this would update the recommendation status
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'جاري إنشاء التوصيات الذكية...' : 'Generating smart recommendations...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">
              {language === 'ar' ? 'خطأ في تحميل التوصيات' : 'Error loading recommendations'}
            </p>
            <Button onClick={handleGenerateRecommendations} variant="outline">
              {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Brain className="w-5 h-5 text-purple-600" />
            {language === 'ar' ? 'التوصيات الذكية' : 'Smart Recommendations'}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-purple-600 border-purple-200">
              {language === 'ar' ? 'مدعوم بالذكاء الاصطناعي' : 'AI-Powered'}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateRecommendations}
              disabled={generateRecommendations.isPending}
            >
              {generateRecommendations.isPending 
                ? (language === 'ar' ? 'جاري التحليل...' : 'Analyzing...')
                : (language === 'ar' ? 'تحديث التوصيات' : 'Refresh Recommendations')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className={`text-lg font-medium text-gray-600 mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'لا توجد توصيات متاحة' : 'No Recommendations Available'}
            </h3>
            <p className={`text-gray-500 mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' 
                ? 'انقر على "إنشاء توصيات" لإنشاء توصيات علاجية مخصصة بناءً على بيانات الطالب'
                : 'Click "Generate Recommendations" to create personalized therapy recommendations based on student data'}
            </p>
            {studentData && (
              <Button onClick={handleGenerateRecommendations}>
                <Brain className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'إنشاء توصيات' : 'Generate Recommendations'}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((recommendation: TreatmentRecommendation) => (
              <div
                key={recommendation.id}
                className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
                  selectedRecommendation === recommendation.id ? 'ring-2 ring-purple-200 border-purple-300' : ''
                }`}
                onClick={() => setSelectedRecommendation(
                  selectedRecommendation === recommendation.id ? null : recommendation.id
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getRecommendationTypeIcon(recommendation.recommendationType)}
                    <div>
                      <h4 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'برنامج علاجي موصى به' : 'Recommended Therapy Program'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {recommendation.recommendationType === 'initial' 
                          ? (language === 'ar' ? 'توصية أولية' : 'Initial Recommendation')
                          : recommendation.recommendationType === 'adjustment'
                          ? (language === 'ar' ? 'تعديل البرنامج' : 'Program Adjustment')
                          : recommendation.recommendationType === 'continuation'
                          ? (language === 'ar' ? 'استمرار البرنامج' : 'Program Continuation')
                          : (language === 'ar' ? 'انتقال لبرنامج جديد' : 'Program Transition')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getIntensityColor(recommendation.recommendedIntensity)}>
                      {recommendation.recommendedIntensity}
                    </Badge>
                    <Badge className={getConfidenceColor(recommendation.confidenceScore)}>
                      {(recommendation.confidenceScore * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'مستوى الثقة:' : 'Confidence Level:'}
                    </span>
                    <span className="text-sm font-medium">
                      {(recommendation.confidenceScore * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={recommendation.confidenceScore * 100} className="h-2" />
                </div>

                {/* Program Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'ar' ? 'الجلسات الأسبوعية' : 'Weekly Sessions'}
                      </p>
                      <p className="text-lg font-bold">{recommendation.recommendedSessionsPerWeek}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'ar' ? 'مدة الجلسة' : 'Session Duration'}
                      </p>
                      <p className="text-lg font-bold">{recommendation.recommendedSessionDuration || 60} {language === 'ar' ? 'دقيقة' : 'min'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'ar' ? 'الكثافة' : 'Intensity'}
                      </p>
                      <p className="text-lg font-bold capitalize">{recommendation.recommendedIntensity}</p>
                    </div>
                  </div>
                </div>

                {/* Goals */}
                {recommendation.recommendedGoals && recommendation.recommendedGoals.length > 0 && (
                  <div className="mb-4">
                    <h5 className={`font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'الأهداف الموصى بها:' : 'Recommended Goals:'}
                    </h5>
                    <ul className="space-y-1">
                      {recommendation.recommendedGoals.map((goal, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          <span className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                            {goal}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Expanded Details */}
                {selectedRecommendation === recommendation.id && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h6 className={`font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'تفاصيل التوصية' : 'Recommendation Details'}
                        </h6>
                        <div className="bg-gray-50 rounded p-3">
                          <p className="text-sm text-muted-foreground">
                            {language === 'ar' 
                              ? 'تم إنشاء هذه التوصية بناءً على تحليل شامل لبيانات الطالب وأفضل الممارسات العلاجية'
                              : 'This recommendation was generated based on comprehensive analysis of student data and therapeutic best practices'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <h6 className={`font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'الخطوات التالية' : 'Next Steps'}
                        </h6>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span className="text-sm">
                              {language === 'ar' ? 'مراجعة مع الفريق العلاجي' : 'Review with therapy team'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span className="text-sm">
                              {language === 'ar' ? 'مناقشة مع الأسرة' : 'Discuss with family'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span className="text-sm">
                              {language === 'ar' ? 'تحديد الجدول الزمني' : 'Schedule implementation'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAcceptRecommendation(recommendation.id)
                    }}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {language === 'ar' ? 'قبول التوصية' : 'Accept Recommendation'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRejectRecommendation(recommendation.id)
                    }}
                  >
                    {language === 'ar' ? 'رفض' : 'Reject'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedRecommendation(
                        selectedRecommendation === recommendation.id ? null : recommendation.id
                      )
                    }}
                  >
                    {selectedRecommendation === recommendation.id
                      ? (language === 'ar' ? 'إخفاء' : 'Hide')
                      : (language === 'ar' ? 'عرض المزيد' : 'View More')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SmartRecommendations