# Therapy Management Examples

This folder contains comprehensive examples demonstrating UI/UX patterns, components, and best practices for building bilingual Arabic/English therapy management applications using React, TypeScript, and modern web technologies.

## 📁 Folder Structure

```
examples/
├── components/          # Reusable UI components
├── layouts/            # Layout patterns and containers
├── styles/             # CSS examples and design systems
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── tests/              # Testing examples and patterns
├── api/                # API integration examples
├── forms/              # Form validation and patterns
└── README.md           # This file
```

## 🎯 Purpose

These examples serve as:
- **Reference implementations** for common therapy app patterns
- **Best practices** for Arabic/RTL support and accessibility
- **Code templates** for rapid development
- **Testing patterns** for quality assurance
- **Design system** documentation and usage

## 🌍 Bilingual Support

All examples demonstrate:
- **Arabic/English** bilingual text support
- **RTL (Right-to-Left)** layout patterns
- **Font switching** between Arabic and Latin fonts
- **Cultural considerations** for Arabic UX
- **Accessibility** features for both languages

## 📦 Components

### ExampleCard (`components/ExampleCard.tsx`)
Demonstrates card design patterns with:
- Arabic/RTL text support
- Loading and error states
- Progress visualization
- Status indicators
- Gradient styling
- Responsive design

**Usage:**
```tsx
<ExampleCard
  title={{ ar: "جلسة علاج النطق", en: "Speech Therapy Session" }}
  status="completed"
  progress={85}
  isLoading={false}
/>
```

### BaseButton (`components/BaseButton.tsx`)
Comprehensive button component featuring:
- Multiple variants (primary, secondary, outline, etc.)
- Loading states with spinners
- Icon integration
- Arabic text support
- Accessibility features
- Gradient effects

**Usage:**
```tsx
<BaseButton
  variant="primary"
  size="lg"
  isLoading={isSubmitting}
  icon={<Save className="w-4 h-4" />}
>
  {language === 'ar' ? 'حفظ' : 'Save'}
</BaseButton>
```

### ProgressCard (`components/ProgressCard.tsx`)
Therapy progress tracking with:
- Multiple progress metrics
- Trend indicators
- Animated progress bars
- Student information display
- Arabic number formatting

**Usage:**
```tsx
<ProgressCard
  student={{ name: "أحمد محمد", nameEn: "Ahmed Mohammed" }}
  metrics={[
    { label: "النطق", labelEn: "Speech", value: 75, trend: "up" },
    { label: "التركيز", labelEn: "Focus", value: 60, trend: "stable" }
  ]}
/>
```

### ArabicTextDisplay (`components/ArabicTextDisplay.tsx`)
Specialized Arabic text rendering with:
- RTL text direction
- Arabic font handling
- Mixed Arabic/English content
- Text formatting variants
- Translation display

**Usage:**
```tsx
<ArabicTextDisplay
  text="مرحباً بكم في نظام إدارة العلاج"
  translation="Welcome to the Therapy Management System"
  variant="title"
  showTranslation={true}
/>
```

## 🏗️ Layouts

### DashboardLayout (`layouts/DashboardLayout.tsx`)
Complete dashboard layout featuring:
- Responsive sidebar navigation
- RTL-aware header and navigation
- Stats cards with Arabic numbers
- Glass morphism design
- Mobile-friendly collapsible menu

### RTLWrapper (`layouts/RTLWrapper.tsx`)
Universal RTL layout wrapper with:
- Automatic language detection
- Flex/Grid container support
- Font family switching
- Direction-aware spacing

### MobileResponsive (`layouts/MobileResponsive.tsx`)
Mobile-first responsive patterns:
- Touch-friendly interfaces
- Collapsible sections
- Arabic text scaling
- Bottom navigation
- Swipe gestures

## 🎨 Styles

### Arabic RTL (`styles/arabic-rtl.css`)
Comprehensive Arabic styling including:
- Font family definitions
- Text direction utilities
- Form input styling
- Icon positioning
- Animation support
- High contrast mode
- Print styles

### Color System (`styles/color-system.css`)
Therapy-focused color palette:
- Teal/green gradients
- Therapy type color coding
- Accessibility considerations
- Dark mode support

### Responsive Utilities (`styles/responsive-utilities.css`)
Mobile-first responsive patterns:
- Breakpoint utilities
- Touch-friendly sizing
- Arabic text scaling
- Container queries

## 🪝 Hooks

### useLanguage (`hooks/useLanguage.ts`)
Language management hook providing:
- Arabic/English switching
- RTL detection
- Font family management
- Text formatting utilities
- Arabic text validation
- Responsive text sizing

**Usage:**
```tsx
const { language, isRTL, formatText, validateArabicText } = useLanguage()
```

### useTherapyData (`hooks/useTherapyData.ts`)
Therapy data management with:
- CRUD operations
- Loading states
- Error handling
- Arabic text formatting
- Progress tracking
- Real-time updates

**Usage:**
```tsx
const {
  sessions,
  isLoading,
  error,
  createSession,
  updateSession,
  deleteSession
} = useTherapyData()
```

## 📝 Types

### Therapy Types (`types/therapy-types.ts`)
Comprehensive TypeScript definitions for:
- Bilingual text interfaces
- Therapy domain entities
- Component props
- API responses
- Form validation
- State management

**Key Types:**
```typescript
interface BilingualText {
  ar: string
  en: string
}

interface TherapySession {
  id: string
  title: BilingualText
  type: TherapyType
  student: Student
  therapist: Therapist
  scheduledDate: Date
  status: SessionStatus
}
```

## 🧪 Testing

### Component Testing (`tests/component-testing.test.tsx`)
Testing patterns for:
- Arabic/RTL component rendering
- User interactions
- Accessibility compliance
- Loading and error states
- Mock context providers

**Example Test:**
```tsx
test('renders Arabic text with RTL direction', () => {
  render(
    <LanguageProvider initialLanguage="ar">
      <ArabicTextDisplay text="مرحباً" />
    </LanguageProvider>
  )
  
  expect(screen.getByText('مرحباً')).toHaveAttribute('dir', 'rtl')
})
```

## 🔌 API Integration

### Supabase Client (`api/supabase-client.ts`)
Supabase integration examples:
- Type-safe CRUD operations
- Arabic text handling
- Real-time subscriptions
- File upload management
- Error handling with bilingual messages
- Search and statistics

**Usage:**
```tsx
const { data, error } = await createTherapySession({
  title: { ar: "جلسة علاج", en: "Therapy Session" },
  type: "speech",
  studentId: "student-123"
})
```

## 📋 Forms

### Therapy Session Form (`forms/therapy-session-form.tsx`)
Multi-step form example featuring:
- React Hook Form + Zod validation
- Arabic text validation patterns
- Bilingual error messages
- Step-by-step workflow
- Real-time validation
- File upload integration

**Features:**
- Arabic regex validation
- Custom validation rules
- Conditional field requirements
- Progress indicator
- Accessibility compliance

## 🚀 Getting Started

1. **Install Dependencies:**
   ```bash
   npm install react-hook-form @hookform/resolvers zod
   npm install @radix-ui/react-* lucide-react
   ```

2. **Copy Examples:**
   Copy the relevant example files to your project and modify as needed.

3. **Configure Tailwind:**
   Ensure your `tailwind.config.js` includes Arabic fonts and RTL support:
   ```js
   module.exports = {
     content: ['./src/**/*.{js,ts,jsx,tsx}'],
     theme: {
       extend: {
         fontFamily: {
           arabic: ['Tajawal', 'Cairo', 'system-ui', 'sans-serif'],
         }
       }
     }
   }
   ```

4. **Setup Language Context:**
   Implement the `LanguageProvider` in your app root to enable bilingual support.

## 🎨 Design Principles

### Arabic-First Design
- Arabic text is the primary language
- RTL layout is the default
- Arabic typography considerations
- Cultural color preferences

### Accessibility
- WCAG 2.1 AA compliance
- Screen reader support
- Keyboard navigation
- High contrast mode
- Focus management

### Performance
- Lazy loading patterns
- Optimized re-renders
- Efficient state management
- Bundle size optimization

### Responsive Design
- Mobile-first approach
- Touch-friendly interfaces
- Flexible layouts
- Progressive enhancement

## 🔧 Customization

### Theming
Modify CSS custom properties in `styles/color-system.css`:
```css
:root {
  --primary-teal: #14b8a6;
  --primary-green: #10b981;
  --therapy-speech: #3b82f6;
  --therapy-physical: #8b5cf6;
}
```

### Typography
Adjust Arabic fonts in `styles/arabic-rtl.css`:
```css
.font-arabic {
  font-family: 'Tajawal', 'Cairo', 'Amiri', system-ui, sans-serif;
}
```

### Components
Extend base components by:
1. Copying the example component
2. Modifying props and styling
3. Adding new variants or features
4. Updating TypeScript types

## 📚 Additional Resources

- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Validation Library](https://zod.dev/)
- [Radix UI Components](https://www.radix-ui.com/)
- [Tailwind CSS RTL Plugin](https://github.com/20lives/tailwindcss-rtl)
- [Arabic Web Typography](https://www.w3.org/International/articles/arabic-type/)

## 🤝 Contributing

When adding new examples:
1. Follow the established patterns
2. Include Arabic/RTL support
3. Add comprehensive documentation
4. Include usage examples
5. Write tests for complex components
6. Update this README

## 📄 License

These examples are part of the Alnumo IEP therapy management system and are intended for educational and development purposes within the project scope.
