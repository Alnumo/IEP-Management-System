import { Menu, Search, Bell, User, Settings, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'

interface HeaderProps {
  onMenuClick: () => void
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { language, isRTL, toggleLanguage } = useLanguage()
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo and title */}
        <div className={`flex items-center ${isRTL ? 'space-x-4 space-x-reverse mr-4' : 'space-x-4 ml-4'}`}>
          <div className="flex flex-col">
            <h1 className={`text-lg font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
              {t('app.title')}
            </h1>
            <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              {t('app.subtitle')}
            </p>
          </div>
        </div>

        {/* Search bar - hidden on mobile */}
        <div className={`hidden md:flex flex-1 max-w-md ${isRTL ? 'mr-4' : 'ml-4'}`}>
          <div className="relative w-full">
            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
            <Input
              placeholder={t('plans.searchPlaceholder')}
              className={`${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
        </div>

        {/* Navigation actions */}
        <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse mr-auto' : 'space-x-2 ml-auto'}`}>
          {/* Language toggle */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-sm gap-1"
            onClick={toggleLanguage}
          >
            <Globe className="h-4 w-4" />
            {language === 'ar' ? 'العربية' : 'English'}
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <Badge 
              variant="destructive" 
              className={`absolute -top-1 ${isRTL ? '-left-1' : '-right-1'} h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs`}
            >
              3
            </Badge>
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>

          {/* User menu */}
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}