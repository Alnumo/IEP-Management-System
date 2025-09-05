import { Menu, Search, Bell, User, Settings, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { useUnreadNotificationCount } from '@/hooks/useNotifications'

interface HeaderProps {
  onMenuClick: () => void
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { language, isRTL, toggleLanguage } = useLanguage()
  
  // Mock user ID - in real app, get from auth context
  const userId = 'current-user-id'
  const userType = 'admin' as const

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
        <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse order-1' : 'space-x-2 order-3'}`}>
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
          <NotificationCenter
            userId={userId}
            userType={userType}
            showAsDropdown={true}
            onNotificationClick={(notification) => {
              // Handle notification click - navigate to relevant page
              console.log('Notification clicked:', notification)
            }}
          />

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
              className={`w-full bg-white/10 border-white/20 text-white placeholder:text-white/60 rounded-full h-11 backdrop-blur-sm focus:bg-white/20 focus:border-white/40 ${isRTL ? 'pr-10 text-right' : 'pl-10'}`}
              style={{ 
                direction: isRTL ? 'rtl' : 'ltr',
                textAlign: isRTL ? 'right' : 'left'
              }}
            />
          </div>
        </div>

        {/* RIGHT SECTION: Logo and Branding */}
        <div className={`flex items-center ${isRTL ? 'space-x-2 md:space-x-4 space-x-reverse order-3' : 'space-x-2 md:space-x-4 order-1'}`}>
          {/* Logo Image */}
          <div className="flex items-center">
            <img
              src="/imgs/logo system.png"
              alt={language === 'ar' ? 'شعار مركز أركان النمو' : 'Arkan Growth Center Logo'}
              className="h-12 md:h-16 w-auto object-contain"
              onError={(e) => {
                // Fallback if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            {/* Fallback icon if image fails */}
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm hidden">
              <div className="w-6 h-6 md:w-8 md:h-8 bg-white rounded-xl flex items-center justify-center">
                <div className="w-4 h-4 md:w-6 md:h-6 bg-gradient-to-br from-teal-500 to-green-400 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}