import React from 'react'
import { Award, Star, Trophy, Lightbulb, Users, MessageSquare } from 'lucide-react'
import type { Achievement } from '@/types/parent-portal'

interface AchievementTimelineProps {
  achievements: Achievement[]
  className?: string
}

export const AchievementTimeline: React.FC<AchievementTimelineProps> = ({
  achievements,
  className = ''
}) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'social':
        return <Users className="w-5 h-5" />
      case 'communication':
        return <MessageSquare className="w-5 h-5" />
      case 'cognitive':
        return <Lightbulb className="w-5 h-5" />
      case 'motor':
        return <Star className="w-5 h-5" />
      case 'behavioral':
        return <Award className="w-5 h-5" />
      case 'academic':
        return <Trophy className="w-5 h-5" />
      default:
        return <Award className="w-5 h-5" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'social':
        return 'bg-purple-100 text-purple-700 border-purple-300'
      case 'communication':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'cognitive':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'motor':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'behavioral':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'academic':
        return 'bg-indigo-100 text-indigo-700 border-indigo-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getSignificanceStyle = (significance: string) => {
    switch (significance) {
      case 'milestone':
        return 'ring-4 ring-yellow-200 bg-yellow-500'
      case 'major':
        return 'ring-2 ring-green-200 bg-green-500'
      default:
        return 'bg-blue-500'
    }
  }

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      social: 'التفاعل الاجتماعي',
      communication: 'التواصل واللغة',
      cognitive: 'المعرفة والإدراك',
      motor: 'المهارات الحركية',
      behavioral: 'السلوك',
      academic: 'الأكاديمي'
    }
    return names[category] || category
  }

  if (!achievements.length) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">
          الإنجازات الحديثة
        </h3>
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد إنجازات مسجلة بعد</p>
          <p className="text-sm text-gray-400 mt-1">
            سيظهر هنا تقدم طفلك والإنجازات الجديدة
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 text-right">
          الإنجازات الحديثة
        </h3>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Trophy className="w-5 h-5 text-yellow-600" />
          <span className="text-sm font-medium text-gray-600">
            {achievements.length} إنجاز
          </span>
        </div>
      </div>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute right-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        <div className="space-y-6">
          {achievements.map((achievement, _index) => (
            <div key={achievement.id} className="relative flex items-start">
              {/* Timeline Dot */}
              <div className={`
                relative z-10 w-4 h-4 rounded-full ml-4 mt-2 flex-shrink-0
                ${getSignificanceStyle(achievement.significance)}
              `}>
                {achievement.significance === 'milestone' && (
                  <Star className="w-2 h-2 text-white absolute top-1 left-1" />
                )}
              </div>

              {/* Achievement Content */}
              <div className="flex-1 min-w-0">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className={`
                        flex items-center px-2 py-1 rounded-full text-xs font-medium border
                        ${getCategoryColor(achievement.category)}
                      `}>
                        {getCategoryIcon(achievement.category)}
                        <span className="mr-1">{getCategoryName(achievement.category)}</span>
                      </div>
                      {achievement.significance === 'milestone' && (
                        <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium border border-yellow-300">
                          <Star className="w-3 h-3 inline ml-1" />
                          معلم هام
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(achievement.achievedAt).toLocaleDateString('ar-SA')}
                    </span>
                  </div>

                  <h4 className="font-semibold text-gray-900 text-right mb-1">
                    {achievement.title}
                  </h4>
                  <p className="text-gray-700 text-sm text-right mb-3">
                    {achievement.description}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="text-left">
                      <span>المعالج: {achievement.therapistName}</span>
                    </div>
                    {achievement.photoUrl && (
                      <button className="text-blue-600 hover:text-blue-700 text-xs">
                        عرض الصورة
                      </button>
                    )}
                  </div>

                  {achievement.parentNotes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-1 text-right">ملاحظات ولي الأمر:</p>
                      <p className="text-sm text-gray-700 text-right italic">
                        "{achievement.parentNotes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View More Button */}
        {achievements.length >= 5 && (
          <div className="text-center mt-6">
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              عرض المزيد من الإنجازات
            </button>
          </div>
        )}
      </div>
    </div>
  )
}