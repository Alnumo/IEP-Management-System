# Appendix - Useful Commands and Scripts

### Frequently Used Commands

```bash
npm run dev           # Start development server
npm run build         # Development build
npm run build:production # Production build with strict TypeScript
npm run lint          # ESLint check
npm run type-check    # TypeScript validation
npm run test:db       # Test Supabase connection
npm run deploy        # Deploy to Netlify production
npm run deploy:preview # Deploy to Netlify preview
```

### Debugging and Troubleshooting

- **Logs**: Browser console for frontend, Supabase dashboard for backend
- **Debug Mode**: Set `DEBUG=true` in .env for verbose logging
- **Common Issues**:
  - White screen: Check browser console for missing env vars
  - API errors: Verify Supabase project is running
  - Arabic text issues: Clear browser cache
  - Build failures: Run `npm run type-check` first
  - Database errors: Check RLS policies in Supabase

### Critical Warnings

1. **DO NOT** modify database migrations without understanding dependencies
2. **DO NOT** disable RLS policies in production
3. **DO NOT** commit .env files to repository
4. **ALWAYS** test Arabic RTL layout after UI changes
5. **ALWAYS** run type-check before committing
6. **VERIFY** Supabase connection before deployment
