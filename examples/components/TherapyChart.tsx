/**
 * Therapy Chart Examples
 * 
 * Why: Demonstrates data visualization patterns for therapy applications:
 * - Progress charts with Arabic labels
 * - RTL-aware chart layouts
 * - Therapy-specific metrics visualization
 * - Accessible charts for Arabic users
 * - Interactive progress tracking
 * - Responsive chart design
 */

import React, { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, Calendar, Target, Award } from 'lucide-react'
import { useLanguage } from '../hooks/useLanguage'
import { formatArabicProgress, toArabicNumerals, formatArabicDate } from '../utils/arabic-formatting'

export interface TherapyMetric {
  id: string
  label: { ar: string; en: string }
  value: number
  previousValue?: number
  target?: number
  unit?: { ar: string; en: string }
  color: string
  trend?: 'up' | 'down' | 'stable'
}

export interface ChartDataPoint {
  date: Date
  value: number
  label?: { ar: string; en: string }
}

export interface TherapyChartProps {
  title: { ar: string; en: string }
  metrics: TherapyMetric[]
  chartData?: ChartDataPoint[]
  type?: 'progress' | 'comparison' | 'timeline'
  showTrends?: boolean
  showTargets?: boolean
  height?: number
  className?: string
}

export const TherapyChart: React.FC<TherapyChartProps> = ({
  title,
  metrics,
  chartData = [],
  type = 'progress',
  showTrends = true,
  showTargets = true,
  height = 300,
  className = ''
}) => {
  const { language, isRTL } = useLanguage()

  // Calculate chart dimensions and scales
  const chartDimensions = useMemo(() => {
    const padding = 40
    const width = 100 // percentage
    const chartHeight = height - padding * 2

    const maxValue = Math.max(
      ...metrics.map(m => Math.max(m.value, m.target || 0)),
      ...chartData.map(d => d.value),
      100
    )

    return {
      width,
      height: chartHeight,
      padding,
      maxValue,
      scaleY: (value: number) => (chartHeight * (1 - value / maxValue))
    }
  }, [metrics, chartData, height])

  // Get trend icon
  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    const iconProps = { className: "w-4 h-4" }
    
    switch (trend) {
      case 'up':
        return <TrendingUp {...iconProps} className="w-4 h-4 text-green-500" />
      case 'down':
        return <TrendingDown {...iconProps} className="w-4 h-4 text-red-500" />
      case 'stable':
        return <Minus {...iconProps} className="w-4 h-4 text-gray-500" />
      default:
        return null
    }
  }

  // Render progress bars
  const renderProgressBars = () => (
    <div className="space-y-4">
      {metrics.map((metric, index) => {
        const progressPercentage = Math.min((metric.value / (metric.target || 100)) * 100, 100)
        const isOverTarget = metric.target && metric.value > metric.target
        
        return (
          <div key={metric.id} className="space-y-2">
            <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="font-medium text-gray-900">
                  {metric.label[language]}
                </span>
                {showTrends && getTrendIcon(metric.trend)}
              </div>
              
              <div className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="font-semibold" style={{ color: metric.color }}>
                  {language === 'ar' 
                    ? `${toArabicNumerals(metric.value.toString())}${metric.unit?.ar || '٪'}`
                    : `${metric.value}${metric.unit?.en || '%'}`
                  }
                </span>
                {showTargets && metric.target && (
                  <span className="text-gray-500">
                    / {language === 'ar' 
                      ? `${toArabicNumerals(metric.target.toString())}${metric.unit?.ar || '٪'}`
                      : `${metric.target}${metric.unit?.en || '%'}`
                    }
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ease-out ${
                    isOverTarget ? 'bg-gradient-to-r from-green-400 to-emerald-500' : ''
                  }`}
                  style={{
                    width: `${Math.min(progressPercentage, 100)}%`,
                    backgroundColor: !isOverTarget ? metric.color : undefined,
                    transform: isRTL ? 'scaleX(-1)' : undefined
                  }}
                />
              </div>
              
              {/* Target indicator */}
              {showTargets && metric.target && (
                <div
                  className="absolute top-0 w-0.5 h-3 bg-gray-600"
                  style={{
                    left: isRTL ? 'auto' : '100%',
                    right: isRTL ? '100%' : 'auto',
                    transform: `translateX(${isRTL ? '50%' : '-50%'})`
                  }}
                />
              )}
            </div>

            {/* Achievement badge */}
            {isOverTarget && (
              <div className={`flex items-center gap-1 text-xs text-green-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Award className="w-3 h-3" />
                <span>
                  {language === 'ar' ? 'تم تجاوز الهدف!' : 'Target exceeded!'}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  // Render timeline chart
  const renderTimelineChart = () => {
    if (chartData.length === 0) return null

    const points = chartData.map((point, index) => {
      const x = (index / (chartData.length - 1)) * (chartDimensions.width - 20) + 10
      const y = chartDimensions.scaleY(point.value)
      
      return { x, y, ...point }
    })

    // Create SVG path
    const pathData = points.reduce((path, point, index) => {
      const command = index === 0 ? 'M' : 'L'
      return `${path} ${command} ${point.x} ${point.y}`
    }, '')

    return (
      <div className="relative">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 100 ${height}`}
          className="overflow-visible"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(value => (
            <g key={value}>
              <line
                x1="10"
                y1={chartDimensions.scaleY(value)}
                x2="90"
                y2={chartDimensions.scaleY(value)}
                stroke="#e5e7eb"
                strokeWidth="0.5"
              />
              <text
                x={isRTL ? "95" : "5"}
                y={chartDimensions.scaleY(value) + 3}
                fontSize="8"
                fill="#6b7280"
                textAnchor={isRTL ? "start" : "end"}
              >
                {language === 'ar' ? toArabicNumerals(value.toString()) : value}%
              </text>
            </g>
          ))}

          {/* Chart line */}
          <path
            d={pathData}
            fill="none"
            stroke="#14b8a6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="3"
                fill="#14b8a6"
                stroke="white"
                strokeWidth="2"
              />
              
              {/* Tooltip on hover */}
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="transparent"
                className="cursor-pointer hover:fill-gray-100 hover:fill-opacity-50"
              >
                <title>
                  {formatArabicDate(point.date, { format: 'short' })}: {
                    language === 'ar' 
                      ? `${toArabicNumerals(point.value.toString())}٪`
                      : `${point.value}%`
                  }
                </title>
              </circle>
            </g>
          ))}
        </svg>

        {/* Date labels */}
        <div className={`flex justify-between mt-2 text-xs text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {chartData.map((point, index) => {
            if (index % Math.ceil(chartData.length / 4) === 0 || index === chartData.length - 1) {
              return (
                <span key={index}>
                  {formatArabicDate(point.date, { format: 'short' })}
                </span>
              )
            }
            return null
          })}
        </div>
      </div>
    )
  }

  // Render comparison chart
  const renderComparisonChart = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="relative p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md"
          style={{ borderColor: metric.color + '20', backgroundColor: metric.color + '05' }}
        >
          <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: metric.color }}
            />
            {showTrends && getTrendIcon(metric.trend)}
          </div>
          
          <h4 className="text-sm font-medium text-gray-700 mb-1">
            {metric.label[language]}
          </h4>
          
          <div className="text-2xl font-bold mb-1" style={{ color: metric.color }}>
            {language === 'ar' 
              ? `${toArabicNumerals(metric.value.toString())}${metric.unit?.ar || '٪'}`
              : `${metric.value}${metric.unit?.en || '%'}`
            }
          </div>
          
          {showTargets && metric.target && (
            <div className="text-xs text-gray-500">
              {language === 'ar' ? 'الهدف:' : 'Target:'} {
                language === 'ar' 
                  ? `${toArabicNumerals(metric.target.toString())}${metric.unit?.ar || '٪'}`
                  : `${metric.target}${metric.unit?.en || '%'}`
              }
            </div>
          )}

          {/* Progress indicator */}
          {metric.target && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((metric.value / metric.target) * 100, 100)}%`,
                    backgroundColor: metric.color,
                    transform: isRTL ? 'scaleX(-1)' : undefined
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-lg font-semibold text-gray-900">
          {title[language]}
        </h3>
        
        <div className={`flex items-center gap-2 text-sm text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Calendar className="w-4 h-4" />
          <span>
            {language === 'ar' 
              ? formatArabicDate(new Date(), { format: 'short' })
              : new Date().toLocaleDateString()
            }
          </span>
        </div>
      </div>

      {/* Chart content */}
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        {type === 'progress' && renderProgressBars()}
        {type === 'timeline' && renderTimelineChart()}
        {type === 'comparison' && renderComparisonChart()}
      </div>

      {/* Legend */}
      {metrics.length > 1 && type !== 'comparison' && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className={`flex flex-wrap gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {metrics.map((metric) => (
              <div
                key={metric.id}
                className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: metric.color }}
                />
                <span className="text-sm text-gray-600">
                  {metric.label[language]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Specialized therapy progress components
export const SpeechProgressChart: React.FC<{ studentId: string }> = ({ studentId }) => {
  const { language } = useLanguage()

  // Mock data - in real app, this would come from API
  const speechMetrics: TherapyMetric[] = [
    {
      id: 'articulation',
      label: { ar: 'وضوح النطق', en: 'Articulation' },
      value: 75,
      previousValue: 65,
      target: 80,
      color: '#3b82f6',
      trend: 'up'
    },
    {
      id: 'fluency',
      label: { ar: 'الطلاقة', en: 'Fluency' },
      value: 60,
      previousValue: 58,
      target: 70,
      color: '#10b981',
      trend: 'up'
    },
    {
      id: 'comprehension',
      label: { ar: 'الفهم', en: 'Comprehension' },
      value: 85,
      previousValue: 85,
      target: 90,
      color: '#f59e0b',
      trend: 'stable'
    }
  ]

  return (
    <TherapyChart
      title={{ ar: 'تقدم علاج النطق', en: 'Speech Therapy Progress' }}
      metrics={speechMetrics}
      type="progress"
      showTrends={true}
      showTargets={true}
    />
  )
}

export const TherapyComparisonChart: React.FC<{ studentId: string }> = ({ studentId }) => {
  const comparisonMetrics: TherapyMetric[] = [
    {
      id: 'speech',
      label: { ar: 'النطق', en: 'Speech' },
      value: 75,
      target: 80,
      color: '#3b82f6',
      trend: 'up'
    },
    {
      id: 'physical',
      label: { ar: 'الحركة', en: 'Physical' },
      value: 68,
      target: 75,
      color: '#10b981',
      trend: 'up'
    },
    {
      id: 'cognitive',
      label: { ar: 'المعرفي', en: 'Cognitive' },
      value: 82,
      target: 85,
      color: '#f59e0b',
      trend: 'stable'
    },
    {
      id: 'behavioral',
      label: { ar: 'السلوكي', en: 'Behavioral' },
      value: 90,
      target: 85,
      color: '#8b5cf6',
      trend: 'up'
    }
  ]

  return (
    <TherapyChart
      title={{ ar: 'مقارنة أنواع العلاج', en: 'Therapy Types Comparison' }}
      metrics={comparisonMetrics}
      type="comparison"
      showTrends={true}
      showTargets={true}
    />
  )
}

// Usage Examples:
/*
function StudentDashboard({ studentId }: { studentId: string }) {
  const timelineData: ChartDataPoint[] = [
    { date: new Date('2024-01-01'), value: 45 },
    { date: new Date('2024-01-15'), value: 52 },
    { date: new Date('2024-02-01'), value: 58 },
    { date: new Date('2024-02-15'), value: 65 },
    { date: new Date('2024-03-01'), value: 75 },
  ]

  const progressMetrics: TherapyMetric[] = [
    {
      id: 'overall',
      label: { ar: 'التقدم العام', en: 'Overall Progress' },
      value: 75,
      target: 80,
      color: '#14b8a6',
      trend: 'up'
    }
  ]

  return (
    <div className="space-y-6">
      <SpeechProgressChart studentId={studentId} />
      
      <TherapyChart
        title={{ ar: 'التقدم عبر الزمن', en: 'Progress Over Time' }}
        metrics={progressMetrics}
        chartData={timelineData}
        type="timeline"
        height={250}
      />
      
      <TherapyComparisonChart studentId={studentId} />
    </div>
  )
}
*/
