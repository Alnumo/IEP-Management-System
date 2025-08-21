import { useState, useEffect } from 'react'
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
  const [headerLogo, setHeaderLogo] = useState<string | null>(null)

  // Load header logo from localStorage
  useEffect(() => {
    const savedLogo = localStorage.getItem('header-logo')
    if (savedLogo) {
      setHeaderLogo(savedLogo)
    }

    // Listen for logo updates
    const handleLogoUpdate = () => {
      const updatedLogo = localStorage.getItem('header-logo')
      setHeaderLogo(updatedLogo)
    }

    window.addEventListener('logo-updated', handleLogoUpdate)
    return () => window.removeEventListener('logo-updated', handleLogoUpdate)
  }, [])

      return (
      <header 
        className="sticky top-0 z-[1000] w-full header-gradient border-b border-white/20 backdrop-blur-xl shadow-lg"
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{ 
          direction: isRTL ? 'rtl' : 'ltr',
          textAlign: isRTL ? 'right' : 'left'
        }}
      >
                      <div 
          className="container flex h-20 items-center px-4 md:px-6 justify-between" 
          style={{ 
            direction: isRTL ? 'rtl' : 'ltr',
            textAlign: isRTL ? 'right' : 'left'
          }}
        >
        {/* LEFT SECTION: User Controls (Language, Notifications, Settings, Profile) */}
        <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'} order-1`}>
          {/* Mobile menu button - visible on small screens */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-white/20 rounded-xl"
            onClick={onMenuClick}
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Language toggle - responsive */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="text-white hover:bg-white/20 rounded-xl h-12 px-2 md:px-4"
          >
            <Globe className={`h-5 w-5 ${isRTL ? 'ml-1 md:ml-2' : 'mr-1 md:mr-2'}`} />
            <span className={`hidden sm:inline ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'العربية' : 'English'}
            </span>
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-white hover:bg-white/20 rounded-xl h-12 w-12"
          >
            <Bell className="h-5 w-5" />
            <Badge className={`absolute -top-1 h-5 w-5 rounded-full p-0 bg-red-500 text-white text-xs flex items-center justify-center ${isRTL ? '-left-1' : '-right-1'}`}>
              3
            </Badge>
          </Button>

          {/* Settings - hidden on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex text-white hover:bg-white/20 rounded-xl h-12 w-12"
          >
            <Settings className="h-5 w-5" />
          </Button>

          {/* User profile */}
          <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'}`}>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className={`hidden lg:block ${language === 'ar' ? 'font-arabic' : ''}`} style={{ textAlign: isRTL ? 'right' : 'left' }}>
              <p className="text-sm font-medium text-white">
                {language === 'ar' ? 'أيمن الخزرجي' : 'Admin User'}
              </p>
              <p className="text-xs text-white/80">
                {language === 'ar' ? 'مدير' : 'Administrator'}
              </p>
            </div>
          </div>
        </div>

        {/* CENTER SECTION: Search bar - hidden on mobile */}
        <div className="hidden md:flex flex-1 max-w-md mx-6 order-2">
          <div className="relative w-full">
            <Search className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60 ${isRTL ? 'right-3' : 'left-3'}`} />
            <Input
              type="search"
              placeholder={language === 'ar' ? 'البحث...' : 'Search...'}
              className={`w-full bg-white/10 border-white/20 text-white placeholder:text-white/60 rounded-xl h-12 backdrop-blur-sm focus:bg-white/20 focus:border-white/40 ${isRTL ? 'pr-10 text-right' : 'pl-10'}`}
              style={{ 
                direction: isRTL ? 'rtl' : 'ltr',
                textAlign: isRTL ? 'right' : 'left'
              }}
            />
          </div>
        </div>

        {/* RIGHT SECTION: Logo and Branding */}
        <div className={`flex items-center ${isRTL ? 'space-x-2 md:space-x-4 space-x-reverse' : 'space-x-2 md:space-x-4'} order-3`}>
          {/* Custom Logo or Default Icon */}
          {headerLogo ? (
            <div className="header-logo-container">
              <img
                src={headerLogo}
                alt={language === 'ar' ? 'شعار المؤسسة' : 'Organization Logo'}
                className="h-full w-auto object-contain"
                style={{ maxWidth: '180px' }}
              />
            </div>
          ) : (
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <div className="w-6 h-6 md:w-8 md:h-8 bg-white rounded-xl flex items-center justify-center">
                <div className="w-4 h-4 md:w-6 md:h-6 bg-gradient-to-br from-teal-500 to-blue-500 rounded-lg"></div>
              </div>
            </div>
          )}
          
          {/* Organization Name */}
          <div className="flex flex-col" style={{ textAlign: isRTL ? 'right' : 'left' }}>
            <h1 className={`text-lg md:text-xl font-bold text-white ${language === 'ar' ? 'font-arabic' : ''}`} style={{ textAlign: isRTL ? 'right' : 'left' }}>
              {t('app.title')}
            </h1>
            <p className={`text-xs md:text-sm text-white/80 ${language === 'ar' ? 'font-arabic' : ''} hidden sm:block`} style={{ textAlign: isRTL ? 'right' : 'left' }}>
              {t('app.subtitle')}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}