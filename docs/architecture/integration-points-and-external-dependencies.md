# Integration Points and External Dependencies

### External Services

| Service          | Purpose            | Integration Type | Key Files                             | Status         |
| ---------------- | ------------------ | ---------------- | ------------------------------------- | -------------- |
| Supabase         | Backend + Auth     | SDK              | `src/lib/supabase.ts`                | Working        |
| WhatsApp Business| Notifications      | Planned API      | `src/services/whatsapp.ts`          | NOT INTEGRATED |
| PayTabs          | Saudi Payments     | Planned API      | `src/services/payment-gateway-service.ts` | NOT INTEGRATED |
| Stripe           | Int'l Payments     | Planned SDK      | Not implemented                      | NOT INTEGRATED |
| Sentry           | Error Tracking     | SDK              | `src/main.tsx`                      | Configured     |
| n8n              | Automation         | Webhooks         | `n8n/workflows/`                     | NOT CONNECTED  |
| Amelia           | Booking            | WordPress        | `docs/integrations/`                | Documented only|

### Internal Integration Points

- **Frontend-Backend**: Supabase client on all API calls
- **Real-time Updates**: Supabase Realtime subscriptions (NOT IMPLEMENTED)
- **File Storage**: Supabase Storage (partially implemented)
- **Authentication**: Supabase Auth with custom RLS policies
- **Background Jobs**: No queue system implemented
- **Caching**: TanStack Query with 5-minute stale time
- **State Management**: Mix of Context API and TanStack Query
