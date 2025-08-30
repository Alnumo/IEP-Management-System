# Technical Architecture

## Current Technology Stack

**Languages**: TypeScript (100% coverage target), JavaScript  
**Frameworks**: React 18 with Vite build system, TailwindCSS with RTL support  
**Database**: Supabase PostgreSQL with Row Level Security, 25+ existing migrations  
**Infrastructure**: Supabase backend with Netlify frontend hosting, CDN for media delivery  
**External Dependencies**: shadcn/ui components, TanStack Query, React Hook Form + Zod, Lucide icons

## Integration Architecture

**Database Integration**: Extend existing schema with new tables for messages, media, assignments while maintaining referential integrity  
**API Integration**: Leverage Supabase real-time subscriptions and extend existing custom hooks pattern  
**Frontend Integration**: Build on established component patterns and integrate with existing routing and authentication  
**Testing Integration**: Extend existing testing approach with communication-specific test scenarios

## Code Organization Standards

**File Structure**: Follow existing src/components/modules pattern with new communication/, assignment/, and scheduling/ subdirectories  
**Naming Conventions**: Maintain established PascalCase components, camelCase hooks (use*, get*), kebab-case file names  
**Coding Standards**: TypeScript-first development, comprehensive Zod validation, React Hook Form patterns  
**Documentation Standards**: Inline JSDoc comments for complex logic, README updates for new module integration
