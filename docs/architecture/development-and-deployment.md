# Development and Deployment

### Local Development Setup

```bash
# Actual steps that work
1. Clone repository
2. Copy .env.example to .env (MUST have all variables)
3. npm install (takes ~3-5 minutes)
4. npm run dev (starts on http://localhost:5173)

# Known issues:
- Missing env vars cause cryptic errors
- Port 5173 must be free
- Supabase project must be running
- Database migrations must be run manually
```

### Build and Deployment Process

- **Build Command**: `npm run build:production` (uses special tsconfig)
- **Deployment**: Automatic via Netlify on git push
- **Environments**: Dev (local), Production (Netlify)
- **Database Migrations**: Manual via Supabase dashboard
- **Edge Functions**: Manual deployment required
- **Environment Variables**: Set in Netlify dashboard
