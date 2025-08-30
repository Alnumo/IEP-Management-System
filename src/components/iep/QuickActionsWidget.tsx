import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  FileText, 
  Search, 
  Calendar, 
  ClipboardCheck, 
  Users, 
  BarChart3, 
  Settings,
  Download,
  Upload
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface QuickAction {
  id: string
  title_en: string
  title_ar: string
  description_en: string
  description_ar: string
  icon: React.ReactNode
  action: () => void
  variant: 'default' | 'outline' | 'secondary' | 'ghost'
  category: 'create' | 'manage' | 'reports' | 'admin'
}

export const QuickActionsWidget = () => {
  const { language, isRTL } = useLanguage()

  const quickActions: QuickAction[] = [
    {
      id: 'create-iep',
      title_en: 'New IEP',
      title_ar: 'خطة تعليمية جديدة',
      description_en: 'Create a new Individualized Education Program',
      description_ar: 'إنشاء خطة تعليمية فردية جديدة',
      icon: <Plus className="w-4 h-4" />,
      action: () => console.log('Navigate to create IEP'),
      variant: 'default',
      category: 'create'
    },
    {
      id: 'search-ieps',
      title_en: 'Search IEPs',
      title_ar: 'البحث في الخطط',
      description_en: 'Find and filter existing IEPs',
      description_ar: 'البحث وتصفية الخطط التعليمية الموجودة',
      icon: <Search className="w-4 h-4" />,
      action: () => console.log('Navigate to IEP search'),
      variant: 'outline',
      category: 'manage'
    },
    {
      id: 'schedule-meeting',
      title_en: 'Schedule Meeting',
      title_ar: 'جدولة اجتماع',
      description_en: 'Schedule an IEP team meeting',
      description_ar: 'جدولة اجتماع فريق الخطة التعليمية',
      icon: <Calendar className="w-4 h-4" />,
      action: () => console.log('Navigate to meeting scheduler'),
      variant: 'outline',
      category: 'manage'
    },
    {
      id: 'review-compliance',
      title_en: 'Review Compliance',
      title_ar: 'مراجعة الامتثال',
      description_en: 'Check compliance status and issues',
      description_ar: 'فحص حالة الامتثال والمشاكل',
      icon: <ClipboardCheck className="w-4 h-4" />,
      action: () => console.log('Navigate to compliance review'),
      variant: 'secondary',
      category: 'manage'
    },
    {
      id: 'team-management',
      title_en: 'Manage Teams',
      title_ar: 'إدارة الفرق',
      description_en: 'Manage IEP team members and roles',
      description_ar: 'إدارة أعضاء فريق الخطة التعليمية والأدوار',
      icon: <Users className="w-4 h-4" />,
      action: () => console.log('Navigate to team management'),
      variant: 'outline',
      category: 'admin'
    },
    {
      id: 'generate-reports',
      title_en: 'Generate Reports',
      title_ar: 'إنشاء التقارير',
      description_en: 'Create compliance and progress reports',
      description_ar: 'إنشاء تقارير الامتثال والتقدم',
      icon: <BarChart3 className="w-4 h-4" />,
      action: () => console.log('Navigate to reports'),
      variant: 'outline',
      category: 'reports'
    },
    {
      id: 'export-data',
      title_en: 'Export Data',
      title_ar: 'تصدير البيانات',
      description_en: 'Export IEP data for external systems',
      description_ar: 'تصدير بيانات الخطط للأنظمة الخارجية',
      icon: <Download className="w-4 h-4" />,
      action: () => console.log('Navigate to data export'),
      variant: 'ghost',
      category: 'reports'
    },
    {
      id: 'import-data',
      title_en: 'Import Data',
      title_ar: 'استيراد البيانات',
      description_en: 'Import IEP data from external sources',
      description_ar: 'استيراد بيانات الخطط من مصادر خارجية',
      icon: <Upload className="w-4 h-4" />,
      action: () => console.log('Navigate to data import'),
      variant: 'ghost',
      category: 'admin'
    },
    {
      id: 'system-settings',
      title_en: 'Settings',
      title_ar: 'الإعدادات',
      description_en: 'Configure IEP system settings',
      description_ar: 'تكوين إعدادات نظام الخطط التعليمية',
      icon: <Settings className="w-4 h-4" />,
      action: () => console.log('Navigate to settings'),
      variant: 'ghost',
      category: 'admin'
    }
  ]

  const primaryActions = quickActions.filter(action => action.category === 'create')
  const managementActions = quickActions.filter(action => action.category === 'manage')
  const reportActions = quickActions.filter(action => action.category === 'reports')
  const adminActions = quickActions.filter(action => action.category === 'admin')

  const ActionButton = ({ action }: { action: QuickAction }) => (
    <Button
      key={action.id}
      variant={action.variant}
      size="sm"
      className={`w-full justify-start h-auto p-3 ${language === 'ar' ? 'font-arabic' : ''}`}
      onClick={action.action}
    >
      <div className={`flex items-center gap-3 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="flex-shrink-0">
          {action.icon}
        </div>
        <div className={`flex-1 text-left ${isRTL ? 'text-right' : ''} min-w-0`}>
          <div className="font-medium text-sm">
            {language === 'ar' ? action.title_ar : action.title_en}
          </div>
          <div className="text-xs text-muted-foreground line-clamp-2">
            {language === 'ar' ? action.description_ar : action.description_en}
          </div>
        </div>
      </div>
    </Button>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
          <FileText className="h-5 w-5 text-blue-600" />
          {language === 'ar' ? 'الإجراءات السريعة' : 'Quick Actions'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Actions */}
        <div className="space-y-3">
          <h4 className={`text-sm font-semibold text-gray-700 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إنشاء' : 'Create'}
          </h4>
          <div className="space-y-2">
            {primaryActions.map(action => (
              <ActionButton key={action.id} action={action} />
            ))}
          </div>
        </div>

        {/* Management Actions */}
        <div className="space-y-3">
          <h4 className={`text-sm font-semibold text-gray-700 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إدارة' : 'Manage'}
          </h4>
          <div className="space-y-2">
            {managementActions.map(action => (
              <ActionButton key={action.id} action={action} />
            ))}
          </div>
        </div>

        {/* Reports Actions */}
        <div className="space-y-3">
          <h4 className={`text-sm font-semibold text-gray-700 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'التقارير' : 'Reports'}
          </h4>
          <div className="space-y-2">
            {reportActions.map(action => (
              <ActionButton key={action.id} action={action} />
            ))}
          </div>
        </div>

        {/* Admin Actions */}
        <div className="space-y-3">
          <h4 className={`text-sm font-semibold text-gray-700 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إدارة النظام' : 'Administration'}
          </h4>
          <div className="space-y-2">
            {adminActions.map(action => (
              <ActionButton key={action.id} action={action} />
            ))}
          </div>
        </div>

        {/* Help Section */}
        <div className="pt-4 border-t">
          <Button variant="outline" size="sm" className="w-full">
            <span className={language === 'ar' ? 'font-arabic' : ''}>
              {language === 'ar' ? 'المساعدة والدعم' : 'Help & Support'}
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}