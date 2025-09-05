// Story 6.1: Program template selector component for choosing base program types

import React, { useState, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Clock, Calendar, Target, Users, Star } from 'lucide-react'
import type { ProgramTemplate, ProgramTemplateSelector as ProgramTemplateSelectorType } from '@/types/program-templates'

interface ProgramTemplateSelectorProps {
  templates: ProgramTemplate[]
  selectedTemplateId?: string
  onTemplateSelect: (template: ProgramTemplate) => void
  onCustomize?: (templateId: string) => void
  studentAge?: number
  studentNeeds?: string[]
  showRecommendations?: boolean
  className?: string
}

interface FilterOptions {
  search: string
  duration: 'all' | 'short' | 'medium' | 'long'
  intensity: 'all' | 'low' | 'medium' | 'high'
  flexibility: 'all' | 'flexible' | 'structured'
}

export function ProgramTemplateSelector({
  templates,
  selectedTemplateId,
  onTemplateSelect,
  onCustomize,
  studentAge,
  studentNeeds = [],
  showRecommendations = false,
  className = ''
}: ProgramTemplateSelectorProps) {
  const { language, isRTL } = useLanguage()
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    duration: 'all',
    intensity: 'all',
    flexibility: 'all'
  })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const texts = {
    title: {
      ar: 'اختيار قالب البرنامج',
      en: 'Select Program Template'
    },
    search: {
      ar: 'البحث في البرامج...',
      en: 'Search programs...'
    },
    filters: {
      ar: 'المرشحات',
      en: 'Filters'
    },
    duration: {
      ar: 'المدة',
      en: 'Duration'
    },
    intensity: {
      ar: 'الكثافة',
      en: 'Intensity'
    },
    flexibility: {
      ar: 'المرونة',
      en: 'Flexibility'
    },
    allDurations: {
      ar: 'جميع المدد',
      en: 'All Durations'
    },
    shortTerm: {
      ar: 'قصير المدى (< 20 أسبوع)',
      en: 'Short Term (< 20 weeks)'
    },
    mediumTerm: {
      ar: 'متوسط المدى (20-40 أسبوع)',
      en: 'Medium Term (20-40 weeks)'
    },
    longTerm: {
      ar: 'طويل المدى (> 40 أسبوع)',
      en: 'Long Term (> 40 weeks)'
    },
    allIntensities: {
      ar: 'جميع المستويات',
      en: 'All Intensities'
    },
    lowIntensity: {
      ar: 'كثافة منخفضة',
      en: 'Low Intensity'
    },
    mediumIntensity: {
      ar: 'كثافة متوسطة',
      en: 'Medium Intensity'
    },
    highIntensity: {
      ar: 'كثافة عالية',
      en: 'High Intensity'
    },
    allFlexibility: {
      ar: 'جميع الأنواع',
      en: 'All Types'
    },
    flexible: {
      ar: 'مرن',
      en: 'Flexible'
    },
    structured: {
      ar: 'منظم',
      en: 'Structured'
    },
    recommended: {
      ar: 'موصى به',
      en: 'Recommended'
    },
    goals: {
      ar: 'الأهداف',
      en: 'Goals'
    },
    weeks: {
      ar: 'أسبوع',
      en: 'weeks'
    },
    sessionsPerWeek: {
      ar: 'جلسة/أسبوع',
      en: 'sessions/week'
    },
    select: {
      ar: 'اختيار',
      en: 'Select'
    },
    customize: {
      ar: 'تخصيص',
      en: 'Customize'
    },
    noResults: {
      ar: 'لا توجد برامج تطابق معايير البحث',
      en: 'No programs match the search criteria'
    }
  }

  // Calculate compatibility score for recommendations
  const calculateCompatibility = (template: ProgramTemplate): number => {
    let score = 0

    // Age compatibility (if provided)
    if (studentAge) {
      // Simple age-based scoring (can be enhanced with actual age ranges)
      if (template.program_type.includes('intensive') && studentAge >= 8) score += 20
      if (template.program_type.includes('behavioral') && studentAge >= 5) score += 20
      if (template.program_type.includes('growth') && studentAge >= 3) score += 20
    }

    // Needs compatibility
    if (studentNeeds.length > 0) {
      const templateGoals = template.default_goals.map(g => 
        (g.goal_en + ' ' + g.goal_ar).toLowerCase()
      ).join(' ')
      
      studentNeeds.forEach(need => {
        if (templateGoals.includes(need.toLowerCase())) {
          score += 30 / studentNeeds.length
        }
      })
    }

    // Base popularity score
    score += Math.random() * 30 // Simulated popularity score

    return Math.min(100, score)
  }

  const templatesWithScores = useMemo(() => {
    return templates.map(template => ({
      ...template,
      compatibility_score: showRecommendations ? calculateCompatibility(template) : 0,
      is_recommended: showRecommendations && calculateCompatibility(template) > 60
    }))
  }, [templates, showRecommendations, studentAge, studentNeeds])

  const filteredTemplates = useMemo(() => {
    return templatesWithScores.filter(template => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const nameMatch = template.program_name_ar.toLowerCase().includes(searchTerm) ||
                         template.program_name_en.toLowerCase().includes(searchTerm)
        const descMatch = (template.description_ar || '').toLowerCase().includes(searchTerm) ||
                         (template.description_en || '').toLowerCase().includes(searchTerm)
        if (!nameMatch && !descMatch) return false
      }

      // Duration filter
      if (filters.duration !== 'all') {
        const weeks = template.base_duration_weeks
        if (filters.duration === 'short' && weeks >= 20) return false
        if (filters.duration === 'medium' && (weeks < 20 || weeks > 40)) return false
        if (filters.duration === 'long' && weeks <= 40) return false
      }

      // Intensity filter (based on sessions per week)
      if (filters.intensity !== 'all') {
        const sessions = template.base_sessions_per_week
        if (filters.intensity === 'low' && sessions > 2) return false
        if (filters.intensity === 'medium' && (sessions < 2 || sessions > 4)) return false
        if (filters.intensity === 'high' && sessions <= 4) return false
      }

      // Flexibility filter
      if (filters.flexibility !== 'all') {
        const isFlexible = template.customization_options.schedule_flexibility
        if (filters.flexibility === 'flexible' && !isFlexible) return false
        if (filters.flexibility === 'structured' && isFlexible) return false
      }

      return true
    }).sort((a, b) => {
      if (showRecommendations && a.is_recommended !== b.is_recommended) {
        return a.is_recommended ? -1 : 1
      }
      return (b.compatibility_score || 0) - (a.compatibility_score || 0)
    })
  }, [templatesWithScores, filters, showRecommendations])

  const renderTemplateCard = (template: ProgramTemplate & { is_recommended?: boolean; compatibility_score?: number }) => (
    <Card 
      key={template.id} 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        selectedTemplateId === template.id ? 'ring-2 ring-primary' : ''
      } ${template.is_recommended ? 'border-primary' : ''}`}
      onClick={() => onTemplateSelect(template)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">
            {language === 'ar' ? template.program_name_ar : template.program_name_en}
            {template.is_recommended && (
              <Badge className="ml-2" variant="default">
                <Star className="w-3 h-3 mr-1" />
                {texts.recommended[language]}
              </Badge>
            )}
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          {language === 'ar' ? template.description_ar : template.description_en}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Program Details */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{template.base_duration_weeks} {texts.weeks[language]}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{template.base_sessions_per_week} {texts.sessionsPerWeek[language]}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>
                {template.customization_options.schedule_flexibility ? texts.flexible[language] : texts.structured[language]}
              </span>
            </div>
          </div>

          {/* Goals */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">
              {texts.goals[language]}
            </Label>
            <div className="flex flex-wrap gap-1">
              {template.default_goals.slice(0, 3).map((goal, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {language === 'ar' ? goal.goal_ar : goal.goal_en}
                </Badge>
              ))}
              {template.default_goals.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{template.default_goals.length - 3}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className={`flex gap-2 pt-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <Button
              size="sm"
              variant={selectedTemplateId === template.id ? "default" : "outline"}
              onClick={(e) => {
                e.stopPropagation()
                onTemplateSelect(template)
              }}
            >
              {texts.select[language]}
            </Button>
            {onCustomize && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onCustomize(template.id)
                }}
              >
                {texts.customize[language]}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-muted-foreground`} />
          <Input
            placeholder={texts.search[language]}
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className={`${isRTL ? 'pr-10' : 'pl-10'}`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-sm font-medium mb-1 block">
              {texts.duration[language]}
            </Label>
            <Select
              value={filters.duration}
              onValueChange={(value) => setFilters(prev => ({ ...prev, duration: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{texts.allDurations[language]}</SelectItem>
                <SelectItem value="short">{texts.shortTerm[language]}</SelectItem>
                <SelectItem value="medium">{texts.mediumTerm[language]}</SelectItem>
                <SelectItem value="long">{texts.longTerm[language]}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1 block">
              {texts.intensity[language]}
            </Label>
            <Select
              value={filters.intensity}
              onValueChange={(value) => setFilters(prev => ({ ...prev, intensity: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{texts.allIntensities[language]}</SelectItem>
                <SelectItem value="low">{texts.lowIntensity[language]}</SelectItem>
                <SelectItem value="medium">{texts.mediumIntensity[language]}</SelectItem>
                <SelectItem value="high">{texts.highIntensity[language]}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1 block">
              {texts.flexibility[language]}
            </Label>
            <Select
              value={filters.flexibility}
              onValueChange={(value) => setFilters(prev => ({ ...prev, flexibility: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{texts.allFlexibility[language]}</SelectItem>
                <SelectItem value="flexible">{texts.flexible[language]}</SelectItem>
                <SelectItem value="structured">{texts.structured[language]}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {texts.noResults[language]}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(renderTemplateCard)}
          </div>
        )}
      </div>
    </div>
  )
}