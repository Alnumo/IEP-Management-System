import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  FileText, 
  FolderOpen, 
  Users, 
  Settings,
  X,
  GraduationCap,
  BookOpen,
  Calendar,
  UserCheck,
  ClipboardList,
  Brain,
  UserCog,
  Archive,
  Activity,
  Stethoscope,
  Target,
  TrendingUp,
  FileSearch,
  QrCode,
  MessageCircle,
  CreditCard,
  Cog,
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navigation = [
  // Dashboard
  {
    key: 'navigation.dashboard',
    href: '/',
    icon: LayoutDashboard,
    category: 'main'
  },
  
  // Student Management
  {
    key: 'navigation.students',
    href: '/students',
    icon: GraduationCap,
    category: 'students'
  },
  {
    key: 'navigation.enrollments',
    href: '/enrollments',
    icon: ClipboardList,
    category: 'students'
  },
  
  // Therapy Programs
  {
    key: 'navigation.plans',
    href: '/plans',
    icon: FileText,
    category: 'therapy'
  },
  {
    key: 'navigation.therapy_programs',
    href: '/therapy-programs',
    icon: Brain,
    category: 'therapy'
  },
  {
    key: 'navigation.courses',
    href: '/courses',
    icon: BookOpen,
    category: 'therapy'
  },
  {
    key: 'navigation.sessions',
    href: '/sessions',
    icon: Calendar,
    category: 'therapy'
  },
  
  // Medical & Assessment
  {
    key: 'navigation.medical_records',
    href: '/medical-records',
    icon: Stethoscope,
    category: 'medical'
  },
  {
    key: 'navigation.medical_consultants',
    href: '/medical-consultants',
    icon: UserCog,
    category: 'medical'
  },
  {
    key: 'navigation.clinical_documentation',
    href: '/clinical-documentation',
    icon: FileText,
    category: 'medical'
  },
  {
    key: 'navigation.assessments',
    href: '/assessments',
    icon: FileSearch,
    category: 'medical'
  },
  {
    key: 'navigation.goals',
    href: '/therapeutic-goals',
    icon: Target,
    category: 'medical'
  },
  {
    key: 'navigation.progress',
    href: '/progress-tracking',
    icon: TrendingUp,
    category: 'medical'
  },
  
  // Integration Systems
  {
    key: 'navigation.qr_attendance',
    href: '/qr-attendance',
    icon: QrCode,
    category: 'system'
  },
  {
    key: 'navigation.whatsapp',
    href: '/whatsapp',
    icon: MessageCircle,
    category: 'system'
  },
  {
    key: 'navigation.insurance',
    href: '/insurance',
    icon: CreditCard,
    category: 'system'
  },
  
  // Staff Management
  {
    key: 'navigation.therapists',
    href: '/therapists',
    icon: UserCheck,
    category: 'staff'
  },
  {
    key: 'navigation.users',
    href: '/users',
    icon: Users,
    category: 'staff'
  },
  
  
  // AI Analytics & Enterprise Features
  {
    key: 'navigation.ai_analytics',
    href: '/ai-analytics',
    icon: Brain,
    category: 'system'
  },
  {
    key: 'navigation.enterprise_automation',
    href: '/enterprise-automation',
    icon: Cog,
    category: 'system'
  },
  {
    key: 'navigation.multi_center_management',
    href: '/multi-center-management',
    icon: Building2,
    category: 'system'
  },
  
  // Parent Portal
  {
    key: 'navigation.parent_login',
    href: '/parent-login',
    icon: UserCheck,
    category: 'parent'
  },
  
  // System
  {
    key: 'navigation.categories',
    href: '/categories',
    icon: FolderOpen,
    category: 'system'
  },
  {
    key: 'navigation.settings',
    href: '/settings',
    icon: Settings,
    category: 'system'
  },
]

const navigationCategories = [
  { key: 'main', icon: LayoutDashboard },
  { key: 'students', icon: GraduationCap },
  { key: 'therapy', icon: Brain },
  { key: 'medical', icon: Activity },
  { key: 'staff', icon: UserCog },
  { key: 'parent', icon: UserCheck },
  { key: 'system', icon: Archive }
]

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation()
  const { language, isRTL } = useLanguage()
  const { t } = useTranslation()

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[950] bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
             <aside className={cn(
         `fixed top-20 bottom-0 ${isRTL ? 'right-0' : 'left-0'} z-[900] w-80 sidebar-modern transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:top-0 md:z-auto`,
         isOpen ? "translate-x-0 md:translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full"),
         isOpen ? "z-[1050] md:z-[900]" : ""
       )}>
                 <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
              {/* Logo image */}
              <img 
                src="/imgs/Final-Logo-01.png" 
                alt="Arkan Logo" 
                className="w-16 h-12 object-contain"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="md:hidden hover:bg-gray-100 rounded-xl"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {navigationCategories.map((category) => {
                const categoryItems = navigation.filter(item => item.category === category.key)
                if (categoryItems.length === 0) return null
                
                return (
                  <div key={category.key} className="space-y-2">
                    {/* Category Header - Skip for main dashboard */}
                    {category.key !== 'main' && (
                      <div className={`flex items-center px-2 py-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <category.icon className={`w-4 h-4 text-muted-foreground ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        <span className={`text-xs font-semibold text-muted-foreground uppercase tracking-wider ${language === 'ar' ? 'font-arabic' : ''} ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t(`navigation.category.${category.key}`)}
                        </span>
                      </div>
                    )}
                    
                    {/* Category Items */}
                    {categoryItems.map((item) => {
                      const isActive = location.pathname === item.href || (item.href === '/' && location.pathname === '/dashboard')
                      const Icon = item.icon
                      
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={onClose}
                          className={cn(
                            "nav-item",
                            isActive && "active"
                          )}
                          style={{
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                            textAlign: isRTL ? 'right' : 'left'
                          }}
                        >
                          <Icon className={`w-5 h-5 ${isRTL ? 'ml-3' : 'mr-3'}`} />
                          <span className={`flex-1 font-medium ${language === 'ar' ? 'font-arabic' : ''} ${isRTL ? 'text-right' : 'text-left'}`}>
                            {t(item.key)}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
            <div className="bg-gradient-to-r from-teal-50 to-green-50 rounded-xl p-4">
              <h3 className={`font-semibold text-foreground mb-2 ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
                {language === 'ar' ? 'المؤسسات الكبرى القائمة' : 'Major Established Institutions'}
              </h3>
              <p className={`text-sm text-muted-foreground mb-3 ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
                {language === 'ar' ? 'المستفيدين النشطين - 96' : 'Active Beneficiaries - 96'}
              </p>
              <Button className="w-full btn-primary text-sm">
                {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
              </Button>
            </div>
          </div>
       </div>
      </aside>
    </>
  )
}