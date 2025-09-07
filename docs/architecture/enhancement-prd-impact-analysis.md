# Enhancement PRD Impact Analysis

### Files That Will Need Modification

Based on production completion requirements:

#### Testing Infrastructure (Story 1.1)
- Create `src/test/components/` directory structure
- Add tests for 213+ components
- Create `src/test/services/` for service tests
- Add `src/test/hooks/` for hook tests
- Configure coverage reporting

#### Security Compliance (Story 1.2)
- `src/services/encryption-service.ts` - Implement AES-256
- `src/services/security-service.ts` - Add 2FA
- `src/services/audit-service.ts` - Enhance audit trail
- `database/034_encryption_implementation.sql` - Apply encryption
- `database/036_two_factor_authentication.sql` - Enable 2FA

#### IEP Management (Story 1.3)
- `src/components/iep/` - Create all components
- `src/services/iep-service.ts` - Full implementation
- `src/hooks/useIEPs.ts` - Complete hook logic
- `src/pages/IEPDashboardPage.tsx` - Enhance page
- Arabic PDF generation system needed

#### Communication System (Story 1.4)
- `src/services/messaging-service.ts` - Implement real-time
- `src/hooks/useRealTimeMessaging.ts` - Add Supabase Realtime
- `src/services/whatsapp.ts` - WhatsApp Business API
- `src/components/communication/` - Build UI components
- `supabase/functions/` - Create message handlers

#### Financial Management (Story 1.5)
- `src/services/payment-gateway-service.ts` - PayTabs integration
- `src/services/installment-payment-service.ts` - Complete logic
- `src/services/invoice-generator.ts` - Implement generation
- `src/components/billing/` - Complete UI components
- Insurance API integration needed

### New Files/Modules Needed

- `src/components/iep/IEPCreationWizard.tsx`
- `src/components/iep/IEPEditor.tsx`
- `src/components/iep/IEPCollaboration.tsx`
- `src/services/realtime/subscription-manager.ts`
- `src/services/assessment-scoring/vb-mapp.ts`
- `src/services/assessment-scoring/celf-5.ts`
- `src/services/qr/qr-generator.ts`
- `src/services/qr/qr-validator.ts`
- `src/lib/arabic-pdf-generator.ts`
- Test files for ALL components and services

### Integration Considerations

- Must maintain existing Supabase client patterns
- Preserve TanStack Query caching strategy
- Follow existing shadcn/ui component patterns
- Maintain Arabic-first design philosophy
- Respect existing RLS policies
- Use established error handling patterns
- Follow current routing structure
