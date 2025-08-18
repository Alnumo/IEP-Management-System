import { ChevronLeft, Home } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  className?: string
}

// Default breadcrumb mapping based on routes
const getDefaultBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'الرئيسية', href: '/' }
  ]

  if (segments.length === 0) {
    return breadcrumbs
  }

  // Route mappings
  const routeLabels: Record<string, string> = {
    'plans': 'البرامج العلاجية',
    'categories': 'التصنيفات',
    'users': 'المستخدمين',
    'settings': 'الإعدادات',
    'add': 'إضافة جديد',
    'edit': 'تعديل',
  }

  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const label = routeLabels[segment] || segment
    
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
  const breadcrumbs = items || getDefaultBreadcrumbs(location.pathname)

  return (
    <nav className={cn("flex items-center space-x-1 space-x-reverse text-sm", className)}>
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center space-x-1 space-x-reverse">
          {index === 0 && (
            <Home className="h-4 w-4 text-muted-foreground ml-1" />
          )}
          
          {item.href ? (
            <Link
              to={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors font-arabic"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium font-arabic">
              {item.label}
            </span>
          )}
          
          {index < breadcrumbs.length - 1 && (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      ))}
    </nav>
  )
}