import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Breadcrumbs } from './Breadcrumbs'

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isRTL } = useLanguage()

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div 
      className="min-h-screen bg-background" 
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        direction: isRTL ? 'rtl' : 'ltr',
        textAlign: isRTL ? 'right' : 'left'
      }}
    >
      <Header onMenuClick={toggleSidebar} />
      
      <div className="flex pt-20 gap-0"> {/* Add top padding for fixed header */}
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        
        <main 
          className={`flex-1 p-4 sm:p-6 z-layer-content transition-all duration-300 ${isRTL ? 'md:pr-4' : 'md:pl-4'} main-content-spacing`}
          style={{
            direction: isRTL ? 'rtl' : 'ltr',
            textAlign: isRTL ? 'right' : 'left'
          }}
        >
          <div className="mb-4 sm:mb-6">
            <Breadcrumbs />
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  )
}