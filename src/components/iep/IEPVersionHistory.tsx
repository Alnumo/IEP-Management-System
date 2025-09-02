/**
 * IEP Version History Component
 * Displays and manages IEP document versions with comparison features
 * IDEA 2024 Compliant - Bilingual Support
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  History, 
  FileText, 
  Eye, 
  Download, 
  GitCompare,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import type { IEP, IEPStatus, IEPWorkflowStage } from '@/types/iep'
import { cn } from '@/lib/utils'

// =============================================================================
// INTERFACES
// =============================================================================

interface IEPVersionHistoryProps {
  iepId: string
  currentVersion: IEP
}

interface IEPVersion {
  id: string
  version_number: number
  iep_data: IEP
  created_at: string
  created_by: string
  created_by_name: string
  change_summary_ar?: string
  change_summary_en?: string
  status: IEPStatus
  workflow_stage: IEPWorkflowStage
  is_current_version: boolean
}

interface VersionComparison {
  field: string
  label_ar: string
  label_en: string
  old_value: any
  new_value: any
  change_type: 'added' | 'modified' | 'removed'
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function IEPVersionHistory({ iepId, currentVersion }: IEPVersionHistoryProps) {
  const { language, isRTL } = useLanguage()
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false)

  // Fetch version history
  const { data: versions, isLoading } = useQuery({
    queryKey: ['iep-versions', iepId],
    queryFn: async (): Promise<IEPVersion[]> => {
      const { data, error } = await supabase
        .from('iep_versions')
        .select(`
          *,
          profiles!created_by(full_name)
        `)
        .eq('iep_id', iepId)
        .order('version_number', { ascending: false })

      if (error) throw error

      return data?.map(version => ({
        ...version,
        created_by_name: version.profiles?.full_name || 'Unknown User',
        iep_data: JSON.parse(version.iep_data)
      })) || []
    }
  })

  // Status badge configuration
  const getStatusBadge = (status: IEPStatus) => {
    const statusConfig = {
      draft: { 
        variant: 'secondary' as const, 
        label_ar: 'مسودة', 
        label_en: 'Draft' 
      },
      review: { 
        variant: 'outline' as const, 
        label_ar: 'قيد المراجعة', 
        label_en: 'Under Review' 
      },
      approved: { 
        variant: 'default' as const, 
        label_ar: 'معتمد', 
        label_en: 'Approved' 
      },
      active: { 
        variant: 'default' as const, 
        label_ar: 'نشط', 
        label_en: 'Active' 
      },
      expired: { 
        variant: 'destructive' as const, 
        label_ar: 'منتهي الصلاحية', 
        label_en: 'Expired' 
      },
      archived: { 
        variant: 'secondary' as const, 
        label_ar: 'مؤرشف', 
        label_en: 'Archived' 
      }
    }

    const config = statusConfig[status]
    return (
      <Badge variant={config.variant}>
        {language === 'ar' ? config.label_ar : config.label_en}
      </Badge>
    )
  }

  // Handle version comparison
  const handleVersionComparison = () => {
    if (selectedVersions.length === 2) {
      setComparisonDialogOpen(true)
    }
  }

  // Toggle version selection
  const toggleVersionSelection = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId)
      } else if (prev.length < 2) {
        return [...prev, versionId]
      } else {
        return [prev[1], versionId]
      }
    })
  }

  // Generate version comparison
  const generateComparison = useMemo(() => {
    if (selectedVersions.length !== 2 || !versions) return []

    const version1 = versions.find(v => v.id === selectedVersions[0])
    const version2 = versions.find(v => v.id === selectedVersions[1])

    if (!version1 || !version2) return []

    const comparisons: VersionComparison[] = []
    const fieldsToCompare = [
      { key: 'present_levels_academic_ar', label_ar: 'المستوى الأكاديمي', label_en: 'Academic Level' },
      { key: 'present_levels_functional_ar', label_ar: 'المستوى الوظيفي', label_en: 'Functional Level' },
      { key: 'accommodations_ar', label_ar: 'التسهيلات', label_en: 'Accommodations' },
      { key: 'lre_justification_ar', label_ar: 'مبرر البيئة التعليمية', label_en: 'LRE Justification' },
      { key: 'mainstreaming_percentage', label_ar: 'نسبة الدمج', label_en: 'Mainstreaming %' }
    ]

    fieldsToCompare.forEach(field => {
      const oldValue = version1.iep_data[field.key]
      const newValue = version2.iep_data[field.key]

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        comparisons.push({
          field: field.key,
          label_ar: field.label_ar,
          label_en: field.label_en,
          old_value: oldValue,
          new_value: newValue,
          change_type: oldValue && newValue ? 'modified' : newValue ? 'added' : 'removed'
        })
      }
    })

    return comparisons
  }, [selectedVersions, versions])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header with comparison controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5" />
          <h3 className={cn("text-lg font-semibold", isRTL ? "font-arabic" : "")}>
            {language === 'ar' ? 'سجل الإصدارات' : 'Version History'}
          </h3>
        </div>

        {selectedVersions.length === 2 && (
          <Dialog open={comparisonDialogOpen} onOpenChange={setComparisonDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <GitCompare className="w-4 h-4" />
                {language === 'ar' ? 'مقارنة الإصدارات' : 'Compare Versions'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className={isRTL ? "font-arabic" : ""}>
                  {language === 'ar' ? 'مقارنة الإصدارات' : 'Version Comparison'}
                </DialogTitle>
                <DialogDescription>
                  {language === 'ar' 
                    ? 'مقارنة التغييرات بين الإصدارات المختارة'
                    : 'Compare changes between selected versions'
                  }
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <VersionComparisonView 
                  comparisons={generateComparison}
                  versions={versions?.filter(v => selectedVersions.includes(v.id)) || []}
                  language={language}
                  isRTL={isRTL}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Version history list */}
      <Card>
        <CardContent className="p-0">
          {versions && versions.length > 0 ? (
            <div className="space-y-0">
              {versions.map((version, index) => (
                <div key={version.id}>
                  <div 
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                      selectedVersions.includes(version.id) && "bg-primary/10 border-primary/20",
                      version.is_current_version && "bg-green-50 border-l-4 border-l-green-500"
                    )}
                    onClick={() => toggleVersionSelection(version.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span className={cn("font-medium", isRTL ? "font-arabic" : "")}>
                            {language === 'ar' ? `الإصدار ${version.version_number}` : `Version ${version.version_number}`}
                          </span>
                          {version.is_current_version && (
                            <Badge variant="default" className="text-xs">
                              {language === 'ar' ? 'الحالي' : 'Current'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {getStatusBadge(version.status)}
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(version.created_at), 'PPP', { 
                              locale: language === 'ar' ? ar : undefined 
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(version.created_at), { 
                              addSuffix: true,
                              locale: language === 'ar' ? ar : undefined 
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>{version.created_by_name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-3 h-3 mr-1" />
                          {language === 'ar' ? 'عرض' : 'View'}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-3 h-3 mr-1" />
                          {language === 'ar' ? 'تحميل' : 'Download'}
                        </Button>
                      </div>
                    </div>

                    {/* Change summary */}
                    {version.change_summary_ar && (
                      <div className="mt-3 p-3 bg-muted/30 rounded-md">
                        <div className="text-sm">
                          <strong>{language === 'ar' ? 'ملخص التغييرات:' : 'Change Summary:'}</strong>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {language === 'ar' ? version.change_summary_ar : version.change_summary_en}
                        </div>
                      </div>
                    )}
                  </div>
                  {index < versions.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{language === 'ar' ? 'لا توجد إصدارات سابقة' : 'No version history available'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selection info */}
      {selectedVersions.length > 0 && (
        <div className="p-3 bg-primary/10 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              {language === 'ar' 
                ? `تم اختيار ${selectedVersions.length} إصدار${selectedVersions.length === 2 ? 'ين' : ''}`
                : `${selectedVersions.length} version${selectedVersions.length === 1 ? '' : 's'} selected`
              }
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedVersions([])}
            >
              {language === 'ar' ? 'إلغاء التحديد' : 'Clear Selection'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// VERSION COMPARISON COMPONENT
// =============================================================================

function VersionComparisonView({ 
  comparisons, 
  versions, 
  language, 
  isRTL 
}: {
  comparisons: VersionComparison[]
  versions: IEPVersion[]
  language: 'ar' | 'en'
  isRTL: boolean
}) {
  if (!versions || versions.length !== 2) return null

  const [oldVersion, newVersion] = versions.sort((a, b) => a.version_number - b.version_number)

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Version headers */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {language === 'ar' ? `الإصدار ${oldVersion.version_number}` : `Version ${oldVersion.version_number}`}
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              {format(new Date(oldVersion.created_at), 'PPP', { 
                locale: language === 'ar' ? ar : undefined 
              })}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {language === 'ar' ? `الإصدار ${newVersion.version_number}` : `Version ${newVersion.version_number}`}
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              {format(new Date(newVersion.created_at), 'PPP', { 
                locale: language === 'ar' ? ar : undefined 
              })}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Comparisons */}
      {comparisons.length > 0 ? (
        <div className="space-y-4">
          <h4 className={cn("font-semibold", isRTL ? "font-arabic" : "")}>
            {language === 'ar' ? 'التغييرات المكتشفة' : 'Detected Changes'}
          </h4>

          {comparisons.map((comparison, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {comparison.change_type === 'added' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {comparison.change_type === 'modified' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                  {comparison.change_type === 'removed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  
                  <CardTitle className="text-sm">
                    {language === 'ar' ? comparison.label_ar : comparison.label_en}
                  </CardTitle>

                  <Badge 
                    variant={comparison.change_type === 'added' ? 'default' : comparison.change_type === 'modified' ? 'secondary' : 'destructive'}
                    className="text-xs"
                  >
                    {comparison.change_type === 'added' && (language === 'ar' ? 'مضاف' : 'Added')}
                    {comparison.change_type === 'modified' && (language === 'ar' ? 'معدل' : 'Modified')}
                    {comparison.change_type === 'removed' && (language === 'ar' ? 'محذوف' : 'Removed')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                      {language === 'ar' ? 'القديم' : 'Before'}
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                      {Array.isArray(comparison.old_value) 
                        ? comparison.old_value.join(', ') 
                        : comparison.old_value || (language === 'ar' ? 'غير محدد' : 'Not set')
                      }
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                      {language === 'ar' ? 'الجديد' : 'After'}
                    </div>
                    <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                      {Array.isArray(comparison.new_value) 
                        ? comparison.new_value.join(', ') 
                        : comparison.new_value || (language === 'ar' ? 'غير محدد' : 'Not set')
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{language === 'ar' ? 'لا توجد اختلافات بين الإصدارات' : 'No differences found between versions'}</p>
        </div>
      )}
    </div>
  )
}