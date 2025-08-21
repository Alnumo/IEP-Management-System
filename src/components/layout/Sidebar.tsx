import { useState, useEffect } from 'react'
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
  ClipboardList
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
  {
    key: 'navigation.dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    key: 'navigation.plans',
    href: '/plans',
    icon: FileText,
  },
  {
    key: 'navigation.categories',
    href: '/categories',
    icon: FolderOpen,
  },
  {
    key: 'navigation.students',
    href: '/students',
    icon: GraduationCap,
  },
  {
    key: 'navigation.courses',
    href: '/courses',
    icon: BookOpen,
  },
  {
    key: 'navigation.sessions',
    href: '/sessions',
    icon: Calendar,
  },
  {
    key: 'navigation.therapists',
    href: '/therapists',
    icon: UserCheck,
  },
  {
    key: 'navigation.enrollments',
    href: '/enrollments',
    icon: ClipboardList,
  },
  {
    key: 'navigation.users',
    href: '/users',
    icon: Users,
  },
  {
    key: 'navigation.settings',
    href: '/settings',
    icon: Settings,
  },
]

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation()
  const { language, isRTL } = useLanguage()
  const { t } = useTranslation()
  const [sidebarLogo, setSidebarLogo] = useState<string | null>(null)

  // Load sidebar logo from localStorage
  useEffect(() => {
    const savedLogo = localStorage.getItem('sidebar-logo')
    if (savedLogo) {
      setSidebarLogo(savedLogo)
    }

    // Listen for logo updates
    const handleLogoUpdate = () => {
      const updatedLogo = localStorage.getItem('sidebar-logo')
      setSidebarLogo(updatedLogo)
    }

    window.addEventListener('logo-updated', handleLogoUpdate)
    return () => window.removeEventListener('logo-updated', handleLogoUpdate)
  }, [])

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
           <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
             <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
               {/* Custom Logo or Default Icon */}
               {sidebarLogo ? (
                 <div className="sidebar-logo-container">
                   <img
                     src={sidebarLogo}
                     alt={language === 'ar' ? 'شعار المؤسسة' : 'Organization Logo'}
                     className="w-full h-full object-contain"
                   />
                 </div>
               ) : (
                 <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-500 rounded-xl flex items-center justify-center">
                   <div className="w-6 h-6 bg-white rounded-lg"></div>
                 </div>
               )}
               
               <div className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
                 <h2 className={`font-bold text-gray-900 ${language === 'ar' ? 'font-arabic' : ''}`}>
                   {language === 'ar' ? 'مركز أركان النمو' : 'Arkan Growth'}
                 </h2>
                 <p className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                   {language === 'ar' ? 'نظام الإدارة' : 'Management System'}
                 </p>
               </div>
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
             <div className="space-y-2">
               {navigation.map((item) => {
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
           </nav>


                     {/* Sidebar footer */}
           <div className="p-4 border-t border-gray-200/50">
             <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-4">
               <h3 className={`font-semibold text-gray-900 mb-2 ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
                 {language === 'ar' ? 'المؤسسات الكبرى القائمة' : 'Major Established Institutions'}
               </h3>
               <p className={`text-sm text-gray-600 mb-3 ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
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