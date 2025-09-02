# UI/UX Specification - Arkan Growth Center Therapy Management System

## 📋 Document Overview

**Project:** Arkan Growth Center Therapy Plans Manager (نظام أركان النمو لإدارة البرامج التعليمية الفردية)
**Version:** 1.0 
**Status:** Production-Ready (75-80% Complete)
**Last Updated:** August 2025

## 🎯 Executive Summary

This specification defines the comprehensive UI/UX design system for the Arkan Growth Center therapy management application - a bilingual (Arabic RTL/English LTR) healthcare platform designed for Saudi Arabian special education centers.

### Key Design Principles
- **Arabic-First Design**: Primary language is Arabic with full RTL support
- **Medical-Grade UX**: Healthcare-appropriate interactions and workflows  
- **Performance-Optimized**: Sub-2-second load times with mobile-first approach
- **Accessibility Compliant**: WCAG 2.1 AA standards for inclusive design

---

## 🏗️ Technical Foundation

### Core Technology Stack
```yaml
Frontend Architecture:
  - React 18.2 with TypeScript 5.3 (strict mode)
  - Vite 5.0 build system
  - Tailwind CSS 3.4 for styling
  - shadcn/ui component library
  - TanStack Query for state management
  - React Hook Form + Zod for forms
  - i18next for internationalization

Performance Targets:
  - Initial Load: < 2 seconds
  - API Response: < 500ms  
  - Bundle Size: < 500KB initial
  - Arabic Font Load: < 1 second
```

### Project Structure
```
src/
├── components/
│   ├── ui/                    # shadcn/ui base components
│   ├── modules/              # Feature-specific components
│   │   ├── therapy/          # Therapy session components
│   │   ├── student/          # Student management
│   │   ├── parent/           # Parent portal
│   │   └── billing/          # Financial components
├── hooks/                    # Custom React hooks
├── lib/
│   ├── api/                  # Supabase integration
│   ├── validators/           # Zod schemas
│   └── utils/               # Shared utilities
├── locales/
│   ├── ar/                  # Arabic translations
│   └── en/                  # English translations
└── types/                   # TypeScript definitions
```

---

## 🎨 Design System

### Color Palette

#### Primary Colors
```css
:root {
  /* Healthcare Teal - Primary Brand */
  --primary: 179 62% 52%;         /* #4ABAD3 - Main teal */
  --primary-foreground: 0 0% 98%; /* White text on primary */
  
  /* Medical Green - Secondary */
  --secondary: 142 69% 58%;       /* #4ADB7A - Success green */
  --secondary-foreground: 0 0% 98%;
  
  /* Neutral Grays */
  --background: 0 0% 98%;         /* #FAFAFA - Page background */
  --foreground: 222 47% 11%;      /* #0F172A - Primary text */
  --muted: 210 40% 96%;          /* #F1F5F9 - Muted background */
  --muted-foreground: 215 16% 46%; /* #64748B - Muted text */
  
  /* Status Colors */
  --destructive: 0 84% 60%;       /* #EF4444 - Error/danger */
  --warning: 48 96% 53%;          /* #EAB308 - Warning */
  --success: 142 76% 36%;         /* #16A34A - Success */
}
```

#### Dark Mode Support
```css
[data-theme="dark"] {
  --background: 222 47% 11%;      /* Dark background */
  --foreground: 213 31% 91%;      /* Light text */
  --primary: 179 62% 45%;         /* Adjusted primary for contrast */
  --muted: 223 47% 16%;          /* Dark muted background */
}
```

#### Semantic Color Usage
- **Primary Teal**: Main actions, headers, navigation
- **Medical Green**: Success states, completed tasks, positive indicators
- **Warning Amber**: Attention required, pending states
- **Destructive Red**: Errors, critical actions, deletions
- **Neutral Gray**: Text, borders, backgrounds

### Typography System

#### Font Stack
```css
/* Arabic-First Font Configuration */
:root {
  --font-arabic: 'Tajawal', 'Cairo', 'IBM Plex Sans Arabic', system-ui;
  --font-english: 'Inter', 'system-ui', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}

/* Dynamic font family based on language */
html[lang="ar"] * {
  font-family: var(--font-arabic);
}

html[lang="en"] * {
  font-family: var(--font-english);
}
```

#### Type Scale
```css
.text-h1 { font-size: 2.5rem; line-height: 1.2; font-weight: 700; }    /* 40px */
.text-h2 { font-size: 2rem; line-height: 1.25; font-weight: 600; }     /* 32px */
.text-h3 { font-size: 1.5rem; line-height: 1.33; font-weight: 600; }   /* 24px */
.text-h4 { font-size: 1.25rem; line-height: 1.4; font-weight: 500; }   /* 20px */
.text-body-lg { font-size: 1.125rem; line-height: 1.56; }              /* 18px */
.text-body { font-size: 1rem; line-height: 1.5; }                      /* 16px */
.text-body-sm { font-size: 0.875rem; line-height: 1.43; }              /* 14px */
.text-caption { font-size: 0.75rem; line-height: 1.33; }               /* 12px */
```

#### RTL Typography Enhancements
```css
/* Arabic text improvements */
html[lang="ar"] {
  .text-h1, .text-h2, .text-h3 { letter-spacing: -0.025em; }
  .text-body { letter-spacing: 0.01em; }
  p { text-align: right; hyphens: auto; }
}

/* Number formatting utilities */
.numbers-arabic { font-feature-settings: 'locl' 1; }
.numbers-western { font-feature-settings: 'locl' 0; }
```

---

## 🧩 Component Architecture

### Core UI Components (shadcn/ui Based)

#### Button Component
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'gradient';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
  language?: 'ar' | 'en';
}

// Usage Examples:
<Button variant="gradient" size="lg">إنشاء جلسة جديدة</Button>
<Button variant="outline" className="rtl:ml-2 ltr:mr-2">Cancel</Button>
```

#### Card Component Patterns
```typescript
interface TherapySessionCardProps {
  session: TherapySession;
  language: 'ar' | 'en';
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

// Responsive card with Arabic/English layouts
<Card className="hover:shadow-lg transition-shadow">
  <CardHeader className={cn("pb-2", isRTL && "text-right")}>
    <CardTitle className="flex items-center gap-2">
      {isRTL ? <CalendarIcon className="h-4 w-4 ml-2" /> : <CalendarIcon className="h-4 w-4 mr-2" />}
      {t('therapy.sessionTitle')}
    </CardTitle>
  </CardHeader>
</Card>
```

#### Form Components
```typescript
interface FormFieldProps {
  label: string;
  name: string;
  required?: boolean;
  language: 'ar' | 'en';
  validation?: ZodSchema;
}

// Bilingual form field with validation
<FormField
  control={form.control}
  name="studentName"
  render={({ field }) => (
    <FormItem>
      <FormLabel className={cn(isRTL && "text-right")}>
        {t('forms.studentName')}
        {required && <span className="text-destructive mr-1">*</span>}
      </FormLabel>
      <FormControl>
        <Input 
          {...field} 
          dir={isRTL ? "rtl" : "ltr"}
          placeholder={t('forms.studentNamePlaceholder')}
          className={cn("transition-colors", errors.studentName && "border-destructive")}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Layout Components

#### Header Component
```typescript
interface HeaderProps {
  user: User;
  language: 'ar' | 'en';
  onLanguageChange: (lang: 'ar' | 'en') => void;
  onLogout: () => void;
}

// Features: Bilingual navigation, user menu, notifications
<Header className="sticky top-0 z-50 bg-background/95 backdrop-blur">
  <div className="flex items-center justify-between px-4 py-3">
    <Logo language={language} />
    <div className="flex items-center gap-4">
      <LanguageToggle current={language} onChange={onLanguageChange} />
      <NotificationDropdown />
      <UserMenu user={user} onLogout={onLogout} />
    </div>
  </div>
</Header>
```

#### Sidebar Navigation
```typescript
interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentPath: string;
  language: 'ar' | 'en';
}

// Responsive sidebar with RTL support
<Sidebar className={cn(
  "fixed inset-y-0 z-40 w-64 transform transition-transform",
  isRTL ? "right-0" : "left-0",
  isOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"
)}>
  <nav className="mt-8 px-4">
    <SidebarSection title={t('nav.therapy')}>
      <SidebarLink href="/sessions" icon={CalendarIcon}>
        {t('nav.sessions')}
      </SidebarLink>
      <SidebarLink href="/students" icon={UserIcon}>
        {t('nav.students')}
      </SidebarLink>
    </SidebarSection>
  </nav>
</Sidebar>
```

---

## 📱 Responsive Design Framework

### Breakpoint System
```css
/* Mobile-first responsive breakpoints */
:root {
  --breakpoint-sm: 640px;   /* Small tablets */
  --breakpoint-md: 768px;   /* Tablets */
  --breakpoint-lg: 1024px;  /* Laptops */
  --breakpoint-xl: 1280px;  /* Desktop */
  --breakpoint-2xl: 1536px; /* Large desktop */
}

/* Tailwind CSS responsive utilities */
.container {
  max-width: 100%;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .container { max-width: 640px; padding: 0 1.5rem; }
}
@media (min-width: 768px) {
  .container { max-width: 768px; padding: 0 2rem; }
}
@media (min-width: 1024px) {
  .container { max-width: 1024px; }
}
```

### Responsive Layout Patterns

#### Dashboard Layout
```typescript
// Mobile-first dashboard with collapsible sidebar
<div className="flex min-h-screen bg-background">
  {/* Mobile: Hidden sidebar, toggle button */}
  <Sidebar 
    isOpen={sidebarOpen} 
    className="lg:translate-x-0 lg:static lg:inset-0" 
  />
  
  {/* Main content area */}
  <main className="flex-1 flex flex-col overflow-hidden">
    <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
    
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {children}
      </div>
    </div>
  </main>
</div>
```

#### Card Grid Responsive System
```css
/* Responsive grid for therapy session cards */
.session-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;                    /* Mobile: 1 column */
}

@media (min-width: 640px) {
  .session-grid { grid-template-columns: repeat(2, 1fr); }  /* Tablet: 2 columns */
}

@media (min-width: 1024px) {
  .session-grid { grid-template-columns: repeat(3, 1fr); }  /* Desktop: 3 columns */
}

@media (min-width: 1280px) {
  .session-grid { grid-template-columns: repeat(4, 1fr); }  /* Large: 4 columns */
}
```

#### Mobile-Optimized Forms
```typescript
// Stack form fields on mobile, side-by-side on desktop
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <FormField name="firstName" label={t('forms.firstName')} />
  <FormField name="lastName" label={t('forms.lastName')} />
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
  <FormField name="dateOfBirth" label={t('forms.dateOfBirth')} type="date" />
  <FormField name="gender" label={t('forms.gender')} type="select" />
  <FormField name="diagnosis" label={t('forms.diagnosis')} type="select" />
</div>
```

---

## 🌍 Bilingual & RTL Design Patterns

### Language Context Implementation
```typescript
// Language context for global state management
interface LanguageContextType {
  language: 'ar' | 'en';
  isRTL: boolean;
  setLanguage: (lang: 'ar' | 'en') => void;
  t: (key: string, options?: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar'); // Arabic-first
  const isRTL = language === 'ar';
  
  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  }, [language, isRTL]);
  
  return (
    <LanguageContext.Provider value={{ language, isRTL, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
```

### RTL CSS Utilities
```css
/* Custom RTL utilities for Tailwind CSS */
@layer utilities {
  /* Margin utilities */
  .rtl\:mr-auto { margin-right: auto; }
  .rtl\:ml-auto { margin-left: auto; }
  .rtl\:mr-4 { margin-right: 1rem; }
  .rtl\:ml-4 { margin-left: 1rem; }
  
  /* Padding utilities */
  .rtl\:pr-4 { padding-right: 1rem; }
  .rtl\:pl-4 { padding-left: 1rem; }
  
  /* Text alignment */
  .rtl\:text-right { text-align: right; }
  .rtl\:text-left { text-align: left; }
  
  /* Flexbox utilities */
  .rtl\:flex-row-reverse { flex-direction: row-reverse; }
  .rtl\:justify-end { justify-content: flex-end; }
  
  /* Transform utilities */
  .rtl\:scale-x-flip { transform: scaleX(-1); }
}

/* Automatic RTL support for icons */
[dir="rtl"] .icon-chevron-left { transform: scaleX(-1); }
[dir="rtl"] .icon-arrow-right { transform: scaleX(-1); }
```

### Bilingual Component Patterns
```typescript
// Bilingual text component with automatic direction
interface BilingualTextProps {
  ar: string;
  en: string;
  className?: string;
  component?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

const BilingualText: React.FC<BilingualTextProps> = ({ 
  ar, en, className, component: Component = 'span' 
}) => {
  const { language, isRTL } = useLanguage();
  const text = language === 'ar' ? ar : en;
  
  return (
    <Component 
      className={cn(className, isRTL && 'text-right')}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {text}
    </Component>
  );
};

// Usage:
<BilingualText 
  ar="مرحباً بك في نظام أركان النمو"
  en="Welcome to Arkan Growth Center"
  component="h1"
  className="text-2xl font-bold"
/>
```

### Translation File Structure
```typescript
// locales/ar/common.json
{
  "buttons": {
    "submit": "إرسال",
    "cancel": "إلغاء",
    "save": "حفظ",
    "delete": "حذف",
    "edit": "تحرير"
  },
  "navigation": {
    "dashboard": "لوحة التحكم",
    "students": "الطلاب",
    "therapy": "العلاج",
    "reports": "التقارير",
    "settings": "الإعدادات"
  },
  "forms": {
    "required": "هذا الحقل مطلوب",
    "invalid_email": "البريد الإلكتروني غير صحيح",
    "password_too_short": "كلمة المرور قصيرة جداً"
  }
}

// locales/en/common.json
{
  "buttons": {
    "submit": "Submit",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "students": "Students",
    "therapy": "Therapy",
    "reports": "Reports",
    "settings": "Settings"
  },
  "forms": {
    "required": "This field is required",
    "invalid_email": "Invalid email address",
    "password_too_short": "Password is too short"
  }
}
```

---

## 👤 User Experience Guidelines

### Navigation Patterns

#### Primary Navigation
```typescript
// Top-level navigation with breadcrumbs
<nav className="bg-primary text-primary-foreground">
  <div className="container flex items-center justify-between py-4">
    <div className="flex items-center gap-6">
      <Logo />
      <MainNavigation items={mainNavItems} />
    </div>
    
    <div className="flex items-center gap-4">
      <NotificationButton />
      <UserMenu />
    </div>
  </div>
</nav>

<Breadcrumbs className="py-2 px-4 bg-muted/50">
  <BreadcrumbItem href="/dashboard">{t('nav.dashboard')}</BreadcrumbItem>
  <BreadcrumbItem href="/students">{t('nav.students')}</BreadcrumbItem>
  <BreadcrumbItem current>{studentName}</BreadcrumbItem>
</Breadcrumbs>
```

#### Mobile Navigation
```typescript
// Bottom tab navigation for mobile
<div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t">
  <nav className="flex justify-around py-2">
    {mobileNavItems.map((item) => (
      <Link 
        key={item.href}
        to={item.href}
        className={cn(
          "flex flex-col items-center py-2 px-3 rounded-lg transition-colors",
          isActive(item.href) ? "text-primary bg-primary/10" : "text-muted-foreground"
        )}
      >
        <item.icon className="h-5 w-5 mb-1" />
        <span className="text-xs">{t(item.labelKey)}</span>
      </Link>
    ))}
  </nav>
</div>
```

### Loading States and Feedback

#### Loading Components
```typescript
// Skeleton loading patterns
export const SessionCardSkeleton = () => (
  <Card className="p-6">
    <div className="space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  </Card>
);

// Progressive loading with suspense
<Suspense fallback={<SessionListSkeleton count={6} />}>
  <SessionList />
</Suspense>
```

#### Toast Notifications
```typescript
interface ToastOptions {
  title: string;
  description?: string;
  variant: 'default' | 'success' | 'destructive' | 'warning';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Usage examples:
toast({
  title: t('notifications.sessionCreated'),
  description: t('notifications.sessionCreatedDesc'),
  variant: 'success',
  duration: 5000
});

toast({
  title: t('notifications.error'),
  description: t('notifications.sessionError'),
  variant: 'destructive',
  action: {
    label: t('actions.retry'),
    onClick: () => retryCreateSession()
  }
});
```

#### Progress Indicators
```typescript
// Multi-step form progress
<div className="mb-8">
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm text-muted-foreground">
      {t('forms.step')} {currentStep} {t('common.of')} {totalSteps}
    </span>
    <span className="text-sm font-medium">
      {Math.round((currentStep / totalSteps) * 100)}%
    </span>
  </div>
  <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
</div>

// File upload progress
<div className="space-y-2">
  {uploadProgress.map((file) => (
    <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
      <FileIcon className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <Progress value={file.progress} className="h-1 mt-1" />
      </div>
      <span className="text-xs text-muted-foreground">
        {file.progress}%
      </span>
    </div>
  ))}
</div>
```

### Error Handling Patterns

#### Error Boundaries
```typescript
interface ErrorBoundaryProps {
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  children: React.ReactNode;
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ 
  fallback: Fallback = DefaultErrorFallback, 
  children 
}) => {
  return (
    <ReactErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <Fallback error={error} retry={resetErrorBoundary} />
      )}
      onError={(error, errorInfo) => {
        console.error('Error caught by boundary:', error, errorInfo);
        // Send to error reporting service
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ 
  error, retry 
}) => (
  <Card className="p-6 text-center">
    <div className="mb-4">
      <AlertTriangleIcon className="h-12 w-12 text-destructive mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">{t('errors.something_went_wrong')}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t('errors.please_try_again')}
      </p>
    </div>
    <Button onClick={retry} variant="outline">
      {t('actions.try_again')}
    </Button>
  </Card>
);
```

#### Form Validation Feedback
```typescript
// Real-time validation with Zod + React Hook Form
const studentFormSchema = z.object({
  nameAr: z.string().min(2, t('validation.name_too_short')),
  nameEn: z.string().min(2, t('validation.name_too_short')),
  dateOfBirth: z.date().max(new Date(), t('validation.future_date_invalid')),
  parentEmail: z.string().email(t('validation.invalid_email'))
});

// Validation error display
<FormField
  control={form.control}
  name="parentEmail"
  render={({ field, fieldState: { error } }) => (
    <FormItem>
      <FormLabel>{t('forms.parent_email')}</FormLabel>
      <FormControl>
        <Input 
          {...field}
          type="email"
          className={cn(error && "border-destructive focus-visible:ring-destructive")}
        />
      </FormControl>
      <FormMessage className="text-destructive text-sm" />
    </FormItem>
  )}
/>
```

---

## ♿ Accessibility Standards

### WCAG 2.1 AA Compliance

#### Color Contrast Requirements
```css
/* Ensure minimum 4.5:1 contrast ratio for normal text */
.text-primary { color: #0F172A; } /* 18.25:1 contrast on white */
.text-secondary { color: #475569; } /* 7.25:1 contrast on white */
.text-muted { color: #64748B; } /* 4.54:1 contrast on white */

/* Large text (18pt+) needs minimum 3:1 contrast */
.text-large-muted { color: #94A3B8; } /* 3.07:1 contrast on white */

/* Interactive elements need sufficient contrast */
.btn-primary {
  background: #4ABAD3; /* 4.51:1 contrast with white text */
  color: white;
}

.btn-primary:hover {
  background: #3B9BC1; /* Maintains contrast on hover */
}
```

#### Keyboard Navigation Support
```typescript
// Keyboard navigation hook
const useKeyboardNavigation = (items: string[], onSelect: (item: string) => void) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex >= 0) onSelect(items[activeIndex]);
        break;
      case 'Escape':
        setActiveIndex(-1);
        break;
    }
  };
  
  return { activeIndex, handleKeyDown };
};

// Accessible dropdown menu
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button 
      variant="outline" 
      className="flex items-center gap-2"
      aria-expanded={isOpen}
      aria-haspopup="menu"
    >
      {t('actions.more_options')}
      <ChevronDownIcon className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-48">
    <DropdownMenuItem onSelect={() => onEdit()}>
      <EditIcon className="h-4 w-4 mr-2" />
      {t('actions.edit')}
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => onDelete()} className="text-destructive">
      <TrashIcon className="h-4 w-4 mr-2" />
      {t('actions.delete')}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### Screen Reader Support
```typescript
// ARIA live regions for dynamic content
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {statusMessage}
</div>

// Descriptive labels and landmarks
<main role="main" aria-label={t('aria.main_content')}>
  <section aria-labelledby="students-heading">
    <h2 id="students-heading">{t('students.list_title')}</h2>
    <div 
      role="grid" 
      aria-label={t('aria.students_grid')}
      aria-rowcount={totalStudents}
    >
      {students.map((student, index) => (
        <div 
          key={student.id}
          role="gridcell"
          aria-rowindex={index + 1}
          aria-label={`${student.name}, ${t('aria.student_info')}`}
        >
          <StudentCard student={student} />
        </div>
      ))}
    </div>
  </section>
</main>

// Skip links for keyboard users
<a 
  href="#main-content" 
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
>
  {t('aria.skip_to_content')}
</a>
```

#### Focus Management
```typescript
// Focus trap for modals
import { useFocusTrap } from '@/hooks/useFocusTrap';

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const modalRef = useFocusTrap(isOpen);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={modalRef}
        className="sm:max-w-lg"
        aria-describedby="modal-description"
      >
        {children}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-muted rounded-md"
          aria-label={t('actions.close_modal')}
        >
          <XIcon className="h-4 w-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
};

// Focus restoration after actions
const useActionFocus = () => {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  };
  
  const restoreFocus = () => {
    previousFocusRef.current?.focus();
  };
  
  return { saveFocus, restoreFocus };
};
```

---

## ⚡ Performance & Optimization

### Code Splitting Strategy

#### Route-Based Splitting
```typescript
// Lazy load major route components
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Students = lazy(() => import('@/pages/Students'));
const TherapySessions = lazy(() => import('@/pages/TherapySessions'));
const Reports = lazy(() => import('@/pages/Reports'));

// Route configuration with suspense
const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/dashboard" element={
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    } />
    <Route path="/students/*" element={
      <Suspense fallback={<PageSkeleton />}>
        <Students />
      </Suspense>
    } />
    {/* More routes... */}
  </Routes>
);
```

#### Component-Level Splitting
```typescript
// Heavy components loaded on demand
const ChartComponent = lazy(() => import('@/components/modules/reports/ChartComponent'));
const DataTable = lazy(() => import('@/components/modules/shared/DataTable'));

// Conditional loading based on user role
const AdminPanel = lazy(() => import('@/components/modules/admin/AdminPanel'));

const ConditionalAdminPanel: React.FC = () => {
  const { user } = useAuth();
  
  if (user?.role !== 'admin') return null;
  
  return (
    <Suspense fallback={<AdminPanelSkeleton />}>
      <AdminPanel />
    </Suspense>
  );
};
```

### Bundle Optimization with Vite

#### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'query-vendor': ['@tanstack/react-query'],
          
          // Feature chunks
          'therapy-module': ['src/components/modules/therapy'],
          'student-module': ['src/components/modules/student'],
          'billing-module': ['src/components/modules/billing'],
        },
      },
    },
    chunkSizeWarningLimit: 600, // 600kb warning threshold
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
  },
});
```

### TanStack Query Optimization

#### Caching Strategy
```typescript
// Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry for 4xx errors
        if (error.status >= 400 && error.status < 500) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        toast({
          title: t('errors.mutation_failed'),
          description: error.message,
          variant: 'destructive',
        });
      },
    },
  },
});

// Optimistic updates for better UX
const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateStudent,
    onMutate: async (updatedStudent) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['students', updatedStudent.id]);
      
      // Snapshot previous value
      const previousStudent = queryClient.getQueryData(['students', updatedStudent.id]);
      
      // Optimistically update
      queryClient.setQueryData(['students', updatedStudent.id], updatedStudent);
      
      return { previousStudent };
    },
    onError: (err, updatedStudent, context) => {
      // Rollback on error
      queryClient.setQueryData(
        ['students', updatedStudent.id], 
        context?.previousStudent
      );
    },
    onSettled: (data, error, updatedStudent) => {
      // Refetch after mutation
      queryClient.invalidateQueries(['students', updatedStudent.id]);
    },
  });
};
```

#### Background Data Fetching
```typescript
// Prefetch data for likely navigation
const usePrefetchStudentData = () => {
  const queryClient = useQueryClient();
  
  const prefetchStudent = (studentId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['students', studentId],
      queryFn: () => fetchStudent(studentId),
      staleTime: 5 * 60 * 1000,
    });
  };
  
  return { prefetchStudent };
};

// Usage in student list
const StudentListItem: React.FC<{ student: Student }> = ({ student }) => {
  const { prefetchStudent } = usePrefetchStudentData();
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onMouseEnter={() => prefetchStudent(student.id)}
      onClick={() => navigate(`/students/${student.id}`)}
    >
      <StudentCardContent student={student} />
    </Card>
  );
};
```

### Image and Asset Optimization

#### Image Loading Strategy
```typescript
// Progressive image loading component
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src, alt, width, height, className, priority = false
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {loading && (
        <Skeleton 
          className="absolute inset-0" 
          style={{ width, height }}
        />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        className={cn(
          "transition-opacity duration-300",
          loading ? "opacity-0" : "opacity-100",
          error && "hidden"
        )}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};
```

---

## 🛠️ Implementation Guidelines

### Component Development Workflow

#### 1. Component Planning Phase
```typescript
// Step 1: Define component interface
interface TherapySessionFormProps {
  // Required props
  sessionId?: string; // undefined for new sessions
  studentId: string;
  onSubmit: (data: SessionFormData) => Promise<void>;
  
  // Optional props
  initialData?: Partial<SessionFormData>;
  language: 'ar' | 'en';
  className?: string;
  
  // Event handlers
  onCancel?: () => void;
  onSave?: (data: SessionFormData) => Promise<void>;
}

// Step 2: Define data types
interface SessionFormData {
  studentId: string;
  therapistId: string;
  sessionDate: Date;
  sessionType: 'assessment' | 'therapy' | 'consultation';
  duration: number; // minutes
  notes: string;
  goals: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
}
```

#### 2. Implementation Template
```typescript
/**
 * Therapy Session Form Component
 * نموذج جلسة العلاج
 * 
 * @description Handles creation and editing of therapy sessions with bilingual support
 * @example
 * <TherapySessionForm 
 *   studentId="uuid" 
 *   onSubmit={handleSubmit}
 *   language="ar"
 * />
 */
export const TherapySessionForm: React.FC<TherapySessionFormProps> = ({
  sessionId,
  studentId,
  onSubmit,
  initialData,
  language,
  className,
  onCancel,
  onSave
}) => {
  // 1. Hooks and state
  const { t } = useTranslation(language);
  const isRTL = language === 'ar';
  const [loading, setLoading] = useState(false);
  
  // 2. Form setup
  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: initialData || {
      studentId,
      sessionDate: new Date(),
      sessionType: 'therapy',
      duration: 60,
      notes: '',
      goals: [],
      status: 'scheduled'
    }
  });
  
  // 3. Event handlers
  const handleSubmit = async (data: SessionFormData) => {
    try {
      setLoading(true);
      await onSubmit(data);
      toast({
        title: t('success.session_saved'),
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: t('errors.save_failed'),
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 4. Render
  return (
    <Card className={cn("p-6", className)}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="sessionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={isRTL ? "text-right" : ""}>
                    {t('forms.session_date')}
                  </FormLabel>
                  <FormControl>
                    <DatePicker {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* More fields... */}
          </div>
          
          {/* Action buttons */}
          <div className={cn(
            "flex gap-3 pt-4 border-t",
            isRTL ? "flex-row-reverse" : ""
          )}>
            <Button type="submit" loading={loading} className="min-w-24">
              {t('actions.save')}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                {t('actions.cancel')}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </Card>
  );
};
```

### Testing Requirements

#### Component Testing Template
```typescript
// __tests__/components/TherapySessionForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TherapySessionForm } from '@/components/modules/therapy/TherapySessionForm';
import { TestProviders } from '@/test-utils/TestProviders';

describe('TherapySessionForm', () => {
  const defaultProps = {
    studentId: 'test-student-id',
    onSubmit: jest.fn(),
    language: 'en' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Functionality Tests', () => {
    it('renders all required fields', () => {
      render(<TherapySessionForm {...defaultProps} />, { wrapper: TestProviders });
      
      expect(screen.getByLabelText(/session date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/session type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('submits form with valid data', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      render(<TherapySessionForm {...defaultProps} onSubmit={onSubmit} />, { 
        wrapper: TestProviders 
      });
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/notes/i), {
        target: { value: 'Test session notes' }
      });
      
      // Submit
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            studentId: 'test-student-id',
            notes: 'Test session notes'
          })
        );
      });
    });

    it('displays validation errors for invalid data', async () => {
      render(<TherapySessionForm {...defaultProps} />, { wrapper: TestProviders });
      
      // Submit empty form
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/duration is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Localization Tests', () => {
    it('renders correctly in Arabic (RTL)', () => {
      render(<TherapySessionForm {...defaultProps} language="ar" />, { 
        wrapper: TestProviders 
      });
      
      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('dir', 'rtl');
      expect(screen.getByText('حفظ')).toBeInTheDocument(); // Save in Arabic
    });

    it('renders correctly in English (LTR)', () => {
      render(<TherapySessionForm {...defaultProps} language="en" />, { 
        wrapper: TestProviders 
      });
      
      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('dir', 'ltr');
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('switches languages dynamically', async () => {
      const { rerender } = render(
        <TherapySessionForm {...defaultProps} language="en" />, 
        { wrapper: TestProviders }
      );
      
      expect(screen.getByText('Save')).toBeInTheDocument();
      
      rerender(<TherapySessionForm {...defaultProps} language="ar" />);
      
      expect(screen.getByText('حفظ')).toBeInTheDocument();
    });
  });

  describe('Responsive Design Tests', () => {
    it('adapts layout for mobile (320px)', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });
      
      render(<TherapySessionForm {...defaultProps} />, { wrapper: TestProviders });
      
      const formGrid = screen.getByTestId('form-grid');
      expect(formGrid).toHaveClass('grid-cols-1');
    });

    it('uses two-column layout on desktop (1024px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      
      render(<TherapySessionForm {...defaultProps} />, { wrapper: TestProviders });
      
      const formGrid = screen.getByTestId('form-grid');
      expect(formGrid).toHaveClass('md:grid-cols-2');
    });
  });
});
```

### Performance Monitoring

#### Performance Metrics Tracking
```typescript
// Performance monitoring hook
export const usePerformanceMetrics = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Log slow renders (>16ms threshold for 60fps)
      if (renderTime > 16) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
      
      // Send to analytics service
      analytics.track('component_render_time', {
        component: componentName,
        renderTime: renderTime,
        timestamp: Date.now()
      });
    };
  }, [componentName]);
};

// Web Vitals tracking
export const trackWebVitals = () => {
  getCLS(console.log);  // Cumulative Layout Shift
  getFID(console.log);  // First Input Delay
  getFCP(console.log);  // First Contentful Paint
  getLCP(console.log);  // Largest Contentful Paint
  getTTFB(console.log); // Time to First Byte
};
```

---

## 📋 Quality Assurance Checklist

### Pre-Deployment Checklist

#### ✅ Code Quality
- [ ] TypeScript strict mode with no `any` types
- [ ] ESLint passes with no errors
- [ ] Prettier formatting applied
- [ ] No console.log statements in production code
- [ ] All functions have proper JSDoc documentation
- [ ] Component props have TypeScript interfaces

#### ✅ Functionality Testing
- [ ] All user flows work as expected
- [ ] Form validation works correctly
- [ ] Error handling displays appropriate messages
- [ ] Loading states show during async operations
- [ ] Success notifications appear after actions
- [ ] Data persistence works correctly

#### ✅ Bilingual & RTL Testing
- [ ] All text uses i18n keys (no hardcoded strings)
- [ ] Arabic interface displays correctly (RTL)
- [ ] English interface displays correctly (LTR)
- [ ] Language switching works without page refresh
- [ ] Icons and images flip correctly for RTL
- [ ] Form layouts work in both directions

#### ✅ Responsive Design
- [ ] Mobile (320px-768px) layout works correctly
- [ ] Tablet (768px-1024px) layout is functional
- [ ] Desktop (1024px+) layout is optimal
- [ ] Touch targets are minimum 44px on mobile
- [ ] Text remains readable at all sizes
- [ ] Images and media scale appropriately

#### ✅ Accessibility Compliance
- [ ] Color contrast meets WCAG 2.1 AA standards
- [ ] All interactive elements are keyboard accessible
- [ ] Screen reader compatibility tested
- [ ] ARIA labels and roles properly implemented
- [ ] Focus management works correctly
- [ ] Skip links available for keyboard users

#### ✅ Performance Verification
- [ ] Initial page load < 2 seconds
- [ ] API responses < 500ms average
- [ ] No memory leaks detected
- [ ] Bundle size within acceptable limits
- [ ] Images optimized and compressed
- [ ] Lazy loading implemented where appropriate

#### ✅ Browser Compatibility
- [ ] Chrome (latest 2 versions) ✓
- [ ] Firefox (latest 2 versions) ✓
- [ ] Safari (latest 2 versions) ✓
- [ ] Edge (latest 2 versions) ✓
- [ ] Mobile Safari (iOS 14+) ✓
- [ ] Chrome Mobile (Android 10+) ✓

---

## 🔮 Future Roadmap & Scalability

### Planned Enhancements

#### Phase 1: Core Improvements (Q1 2025)
- **Progressive Web App (PWA)** implementation
  - Service worker for offline functionality
  - App manifest for mobile installation
  - Background sync for data updates

- **Advanced Animations** with Framer Motion
  - Page transitions and micro-interactions
  - Loading animations and progress indicators
  - Success/error state animations

#### Phase 2: Advanced Features (Q2 2025)
- **Real-time Collaboration**
  - Live editing of therapy notes
  - Real-time session status updates
  - Collaborative IEP planning

- **Advanced Data Visualization**
  - Interactive charts for progress tracking
  - Therapy outcome analytics
  - Parent engagement metrics

#### Phase 3: AI Integration (Q3 2025)
- **AI-Powered Insights**
  - Therapy recommendation engine
  - Progress prediction models
  - Automated report generation

### Scalability Considerations

#### Architecture Evolution
```typescript
// Micro-frontend architecture preparation
interface ModuleFederationConfig {
  name: string;
  remotes: {
    therapy: string;
    billing: string;
    reports: string;
  };
  shared: {
    react: { singleton: true };
    'react-dom': { singleton: true };
    '@tanstack/react-query': { singleton: true };
  };
}

// Component library evolution
export interface DesignSystemConfig {
  version: string;
  theme: ThemeConfig;
  components: ComponentManifest;
  tokens: DesignTokens;
  documentation: ComponentDocs;
}
```

#### Performance Scaling Strategy
```typescript
// Advanced caching with service worker
const cacheStrategy = {
  // Static assets - Cache First
  static: new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  }),
  
  // API responses - Network First with fallback
  api: new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new BackgroundSyncPlugin('api-sync', {
        maxRetentionTime: 24 * 60 // Retry for max of 24 hours
      }),
    ],
  }),
};
```

---

## 📚 Documentation & Resources

### Development Resources
- **Figma Design System**: [Link to design files]
- **Component Storybook**: [Link to Storybook instance]
- **API Documentation**: [Link to API docs]
- **Testing Guidelines**: [Link to testing docs]

### External References
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/docs)
- [TanStack Query Guide](https://tanstack.com/query/latest)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Validation Schema](https://zod.dev/)
- [i18next Internationalization](https://react.i18next.com/)

### Style Guides
- [Arabic Typography Best Practices](https://fonts.google.com/knowledge/glossary/arabic)
- [RTL Web Development Guide](https://rtlstyling.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Saudi UX Design Considerations](https://www.saudiux.com/)

---

**Document Information**
- **Created:** August 30, 2025
- **Last Updated:** August 30, 2025
- **Version:** 1.0.0
- **Status:** Production Ready
- **Next Review:** September 30, 2025

*This specification serves as the single source of truth for UI/UX development in the Arkan Growth Center therapy management system. All updates should be reviewed and approved by the development team.*