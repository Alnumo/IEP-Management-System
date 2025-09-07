# Quick Reference - Key Files and Entry Points

### Critical Files for Understanding the System

- **Main Entry**: `src/main.tsx` - React application entry point
- **Configuration**: `.env` variables, `vite.config.ts`, `tsconfig.json`
- **Core Business Logic**: `src/services/` (75+ service files)
- **API Definitions**: Supabase client in `src/lib/supabase.ts`
- **Database Models**: `database/*.sql` (52+ migration files)
- **Key Algorithms**: Assessment scoring (pending), IEP generation (pending)
- **Router Configuration**: `src/App.tsx` with React Router v6
- **Internationalization**: `src/contexts/LanguageContext.tsx`

### Enhancement Impact Areas for Production Completion

Files/modules affected by planned enhancements:

- **Testing Infrastructure**: All components in `src/components/` need test coverage
- **IEP Management**: `src/components/iep/` (mostly missing), `src/services/iep-service.ts`
- **Communication System**: `src/services/messaging-service.ts`, `src/hooks/useRealTimeMessaging.ts`
- **Financial Management**: `src/services/payment-gateway-service.ts`, `src/services/installment-payment-service.ts`
- **Security**: `src/services/encryption-service.ts`, `src/services/security-service.ts`
- **Assessment Automation**: `src/services/assessment-analysis-service.ts`
