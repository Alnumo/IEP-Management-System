# 🏥 Therapy Plans Manager - مدير البرامج العلاجية

A comprehensive therapy plans management system for **Arkan Al-Numo Center** with full Arabic and English language support.

![Arabic First Design](https://img.shields.io/badge/Arabic%20First-Design-green)
![React](https://img.shields.io/badge/React-18+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-blue)

## ✨ Features

### 🌐 **Bilingual Support**
- **Arabic-first design** with full RTL (Right-to-Left) support
- Complete English translation
- Arabic fonts integration (Tajawal, Cairo)
- Dynamic language switching

### 📋 **Therapy Plan Management**
- **CRUD Operations**: Create, Read, Update, Delete therapy plans
- **Session Types Management**: Multiple session types per program
  - اللغة والتخاطب (Speech & Language)
  - العلاج الوظيفي (Occupational Therapy)
  - العلاج النفسي والسلوكي (Psychological & Behavioral)
  - التعليمي (Educational)
- **Intelligent Pricing**: Program-based pricing with follow-up options
- **Real-time Calculations**: Automatic totals for sessions and pricing

### 🏷️ **Category Management**
- **Color-coded categories** with custom icons
- **Hierarchical organization** of therapy programs
- **Advanced filtering** and search capabilities

### 📱 **Responsive Design**
- **Mobile-first approach** with adaptive layouts
- **Touch-friendly interface** for tablets and phones
- **Progressive Web App** capabilities

### 🔧 **Advanced Features**
- **Form Validation** with Arabic error messages (Zod schemas)
- **Real-time Search** and filtering
- **Loading States** and error handling
- **Data Persistence** with Supabase backend
- **Type Safety** with full TypeScript integration

## 🚀 Tech Stack

### **Frontend**
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for component library
- **React Hook Form** with Zod validation
- **TanStack Query** for data management
- **React Router** for navigation

### **Backend & Database**
- **Supabase** for backend services
- **PostgreSQL** database with Row Level Security
- **Real-time subscriptions** for live updates
- **Authentication** and user management

### **Development & Deployment**
- **ESLint** and **TypeScript** for code quality
- **Netlify** for deployment and hosting
- **Hot Module Replacement** for development
- **Git** version control

## 🛠️ Installation & Setup

### **Prerequisites**
- Node.js 18+ and npm
- Git for version control

### **1. Clone the Repository**
```bash
git clone https://github.com/Alnumo/Therapy-Plans-Manager.git
cd Therapy-Plans-Manager
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Environment Setup**
```bash
# Copy environment variables
cp .env.example .env

# Configure your Supabase credentials in .env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **4. Start Development Server**
```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

## 📝 Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run preview          # Preview production build locally

# Building
npm run build            # Build for production
npm run build:netlify    # Build with Netlify optimizations

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues automatically
npm run type-check       # Run TypeScript type checking

# Deployment
npm run deploy           # Deploy to Netlify (production)
npm run deploy:preview   # Deploy preview to Netlify
```

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── forms/          # Form components (PlanForm, CategoryForm)
│   ├── layout/         # Layout components (Header, Sidebar)
│   ├── shared/         # Shared utilities (SearchFilter, etc.)
│   └── ui/             # shadcn/ui components
├── contexts/           # React contexts (LanguageContext)
├── hooks/              # Custom React hooks (usePlans, useCategories)
├── lib/                # Utilities and configurations
│   ├── validations.ts  # Zod schemas
│   ├── supabase.ts     # Supabase client
│   └── utils.ts        # Helper functions
├── pages/              # Page components
├── types/              # TypeScript type definitions
└── styles/             # Global styles and Tailwind config
```

## 🎨 Key Components

### **PlanForm Component**
- **4-tab interface**: Basic Info, Content, Details, Pricing
- **Session Types Management**: Add/remove multiple session types
- **Real-time Calculations**: Dynamic totals and pricing
- **Validation**: Comprehensive form validation with Arabic messages

### **Session Types System**
- **Multiple configurations** per program
- **Individual settings**: Duration, frequency, weeks
- **Smart totals**: Automatic calculation across all session types
- **Flexible pricing**: Program-based or per-session options

## 🌍 Internationalization

### **Language Support**
- **Primary**: Arabic (العربية) - RTL layout
- **Secondary**: English - LTR layout
- **Dynamic switching** without page reload
- **Context-aware translations**

### **Typography**
- **Arabic fonts**: Tajawal (primary), Cairo (display)
- **English fonts**: Inter (modern sans-serif)
- **Responsive typography** for all screen sizes

## 🔐 Database Schema

### **Core Tables**
- `therapy_plans` - Main therapy programs
- `plan_categories` - Program categories with colors/icons
- `session_types` - Session type configurations
- `plan_templates` - Reusable program templates

### **Security**
- **Row Level Security (RLS)** policies
- **User authentication** with role-based access
- **Data validation** at database level

## 📱 Responsive Design

### **Breakpoints**
- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+

### **Mobile Optimizations**
- **Touch-friendly buttons** and form elements
- **Collapsible navigation** and sidebar
- **Optimized typography** for readability
- **Reduced spacing** for mobile screens

## 🚢 Deployment

### **Netlify Deployment**
- **Automatic deployments** from GitHub
- **Environment variables** configuration
- **Build optimizations** for production
- **CDN distribution** for global performance

### **Build Configuration**
- **TypeScript compilation** with strict mode
- **Asset optimization** and minification
- **Tree shaking** for smaller bundle sizes
- **Source maps** for debugging

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Arkan Al-Numo Center** for the project requirements
- **shadcn/ui** for the excellent component library
- **Supabase** for the backend infrastructure
- **Tailwind CSS** for the utility-first styling approach

---

<div align="center">

**Built with ❤️ for Arkan Al-Numo Center**

*مبني بحب لمركز أركان النمو*

</div>