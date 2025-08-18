import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  FileText, 
  FolderOpen, 
  Users, 
  Settings,
  X
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

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        `fixed inset-y-0 ${isRTL ? 'right-0 border-l' : 'left-0 border-r'} z-50 w-64 bg-background transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0`,
        isOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full")
      )}>
        <div className="flex flex-col h-full">
          {/* Mobile close button */}
          <div className="flex items-center justify-between p-4 border-b md:hidden">
            <h2 className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'القائمة' : 'Menu'}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => onClose()}
                  className={cn(
                    `flex items-center ${isRTL ? 'space-x-3 space-x-reverse' : 'space-x-3'} px-3 py-2 rounded-lg text-sm transition-colors`,
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className={language === 'ar' ? 'font-arabic' : ''}>{t(item.key)}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <div className="text-xs text-muted-foreground text-center">
              <p className={language === 'ar' ? 'font-arabic' : ''}>{t('app.title')}</p>
              <p>{language === 'ar' ? 'النسخة 1.0.0' : 'Version 1.0.0'}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}