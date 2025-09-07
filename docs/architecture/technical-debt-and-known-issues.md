# Technical Debt and Known Issues

### Critical Technical Debt

1. **Testing Infrastructure**: 0% test coverage despite Vitest setup - BLOCKING PRODUCTION
2. **IEP Management**: Core business feature only has database schema, no implementation
3. **Payment Integration**: Payment gateway service has test file but no implementation
4. **Communication System**: Database schema exists, no real-time messaging implemented
5. **Security Gaps**: 
   - Encryption service exists but not applied to medical records
   - No 2FA implementation despite database support
   - API security service incomplete
6. **Assessment Scoring**: No algorithms implemented for VB-MAPP, CELF-5, etc.
7. **QR Attendance**: UI components exist but no generation/validation logic
8. **Migration Conflicts**: Multiple files with same number (045_)
9. **Service Patterns**: Inconsistent patterns between older and newer services
10. **Component Testing**: Test files exist for some hooks but no component tests

### Workarounds and Gotchas

- **Environment Variables**: Must have all VITE_ prefixed vars or app crashes
- **Database Connections**: Supabase client singleton pattern required
- **Arabic Text**: Must use specific font loading order or text renders incorrectly
- **RLS Policies**: Some tables have disabled RLS (security risk)
- **Build Process**: Two different TypeScript configs (tsconfig.json vs tsconfig.production.json)
- **Date Handling**: Mixed use of date-fns and native Date objects
- **File Uploads**: No consistent file upload pattern across components
- **Real-time Subscriptions**: Not implemented despite Supabase support
- **Error Boundaries**: Minimal error handling, app crashes on errors
- **Memory Leaks**: No cleanup in useEffect hooks in older components
