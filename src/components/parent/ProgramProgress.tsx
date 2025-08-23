import React from 'react'
import { Clock, User, Target, Calendar, TrendingUp, CheckCircle } from 'lucide-react'
import type { TherapyProgramProgress } from '@/types/parent-portal'

interface ProgramProgressProps {
  programs: TherapyProgramProgress[]
  className?: string
}

export const ProgramProgress: React.FC<ProgramProgressProps> = ({
  programs,
  className = ''
}) => {
  const getProgramTypeColor = (type: string) => {
    switch (type) {
      case 'ABA':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'SPEECH':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'OT':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'PT':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'BEHAVIORAL':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getProgramTypeName = (type: string) => {
    const names: Record<string, string> = {
      ABA: 'تحليل السلوك التطبيقي',
      SPEECH: 'علاج النطق واللغة',
      OT: 'العلاج الوظيفي',
      PT: 'العلاج الطبيعي',
      BEHAVIORAL: 'تعديل السلوك'
    }
    return names[type] || type
  }

  if (!programs.length) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-right">
          البرامج العلاجية الحالية
        </h3>
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد برامج علاجية نشطة</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 text-right">
          البرامج العلاجية الحالية
        </h3>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Target className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-600">
            {programs.length} برنامج
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {programs.map((program, _index) => (
          <div key={program.programId} className="border border-gray-200 rounded-lg p-5">
            {/* Program Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 text-right">
                <div className="flex items-center justify-end mb-2">
                  <h4 className="font-semibold text-gray-900 ml-3">
                    {program.programName}
                  </h4>
                  <div className={`
                    px-2 py-1 rounded-full text-xs font-medium border
                    ${getProgramTypeColor(program.programType)}
                  `}>
                    {getProgramTypeName(program.programType)}
                  </div>
                </div>
                <div className="flex items-center justify-end text-sm text-gray-600 mb-2">
                  <span className="ml-1">{program.therapistName}</span>
                  <User className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-end text-sm text-gray-600">
                  <span className="ml-1">{program.currentLevel}</span>
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {program.progressPercentage}%
                </span>
                <span className="text-sm text-gray-600 text-right">
                  التقدم العام
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                  style={{ width: `${program.progressPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Weekly Sessions Progress */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <p className="text-blue-800 text-sm font-medium">الجلسات الأسبوعية</p>
                    <p className="text-blue-900 text-lg font-bold">
                      {program.weeklySessionsCompleted}/{program.weeklySessionsTarget}
                    </p>
                  </div>
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div className="mt-2">
                  <div className="w-full bg-blue-200 rounded-full h-1">
                    <div
                      className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(program.weeklySessionsCompleted / program.weeklySessionsTarget) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <p className="text-green-800 text-sm font-medium">الإنجاز المتوقع</p>
                    <p className="text-green-900 text-lg font-bold">
                      {new Date(program.estimatedCompletionDate).toLocaleDateString('ar-SA', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Recent Notes */}
            {program.recentNotes && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2 text-right">
                  آخر ملاحظات المعالج
                </h5>
                <p className="text-sm text-gray-700 text-right">
                  "{program.recentNotes}"
                </p>
              </div>
            )}

            {/* Next Milestone */}
            <div className="flex items-start space-x-3 space-x-reverse bg-yellow-50 p-3 rounded-lg">
              <Target className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-right">
                <h5 className="font-medium text-yellow-900 mb-1">
                  الهدف القادم
                </h5>
                <p className="text-sm text-yellow-800">
                  {program.nextMilestone}
                </p>
              </div>
            </div>

            {/* Program Timeline */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  بدء البرنامج: {new Date(program.startDate).toLocaleDateString('ar-SA')}
                </span>
                <span>
                  الإنجاز المتوقع: {new Date(program.estimatedCompletionDate).toLocaleDateString('ar-SA')}
                </span>
              </div>
              
              {/* Timeline Bar */}
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${program.progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Overall Progress Summary */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="text-right">
            <h4 className="font-semibold text-gray-900 mb-1">
              ملخص التقدم العام
            </h4>
            <p className="text-sm text-gray-700">
              متوسط التقدم عبر جميع البرامج
            </p>
          </div>
          <div className="text-left">
            <div className="flex items-center justify-end mb-2">
              <span className="text-2xl font-bold text-blue-600 ml-2">
                {Math.round(programs.reduce((sum, p) => sum + p.progressPercentage, 0) / programs.length)}%
              </span>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-xs text-gray-600">
              {programs.filter(p => p.progressPercentage >= 70).length} من {programs.length} برامج متقدمة
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}