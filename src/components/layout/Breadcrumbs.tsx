import { ChevronLeft, ChevronRight, Home } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  className?: string
}

// Default breadcrumb mapping based on routes
const getDefaultBreadcrumbs = (pathname: string, language: string): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = [
    { label: language === 'ar' ? 'الرئيسية' : 'Home', href: '/' }
  ]

  if (segments.length === 0) {
    return breadcrumbs
  }

  // Route mappings
  const routeLabels: Record<string, { ar: string, en: string }> = {
    'plans': { ar: 'البرامج العلاجية', en: 'Plans' },
    'categories': { ar: 'التصنيفات', en: 'Categories' },
    'users': { ar: 'المستخدمين', en: 'Users' },
    'students': { ar: 'الطلاب', en: 'Students' },
    'courses': { ar: 'الدورات', en: 'Courses' },
    'settings': { ar: 'الإعدادات', en: 'Settings' },
    'add': { ar: 'إضافة طالب', en: 'Add Student' },
    'edit': { ar: 'تعديل', en: 'Edit' },
  }

  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const labelObj = routeLabels[segment]
    const label = labelObj ? labelObj[language as keyof typeof labelObj] : segment
    
    // Don't make the last item clickable
    const isLast = index === segments.length - 1
    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath
    })
  })

  return breadcrumbs
}

export const Breadcrumbs = ({ items, className }: BreadcrumbsProps) => {
  const location = useLocation()
  const { language, isRTL } = useLanguage()
  const breadcrumbs = items || getDefaultBreadcrumbs(location.pathname, language)

  return (
    <nav className={cn(
      "flex items-center text-sm",
      isRTL ? "space-x-1 space-x-reverse" : "space-x-1",
      className
    )} dir={isRTL ? 'rtl' : 'ltr'}>
      {breadcrumbs.map((item, index) => (
        <div key={index} className={cn(
          "flex items-center",
          isRTL ? "space-x-1 space-x-reverse" : "space-x-1"
        )}>
          {index === 0 && (
            <Home className={cn(
              "h-4 w-4 text-muted-foreground",
              isRTL ? "mr-1" : "ml-1"
            )} />
          )}
          
          {item.href ? (
            <Link
              to={item.href}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-colors",
                language === 'ar' ? 'font-arabic' : ''
              )}
            >
              {item.label}
            </Link>
          ) : (
            <span className={cn(
              "text-foreground font-medium",
              language === 'ar' ? 'font-arabic' : ''
            )}>
              {item.label}
            </span>
          )}
          
          {index < breadcrumbs.length - 1 && (
            isRTL ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            )
          )}
        </div>
      ))}
    </nav>
  )
}