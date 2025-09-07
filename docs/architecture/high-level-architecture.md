# High Level Architecture

### Technical Summary

A sophisticated bilingual (Arabic RTL/English LTR) healthcare ERP system built with React 18, TypeScript 5.3, and Supabase backend. Currently 75-80% complete with production deployment targeted in 5-7 months.

### Actual Tech Stack (from package.json)

| Category        | Technology           | Version   | Notes                                      |
| --------------- | -------------------- | --------- | ------------------------------------------ |
| Runtime         | Node.js              | 18+       | Required for build tools                  |
| Framework       | React                | 18.2.0    | With hooks and concurrent features        |
| Language        | TypeScript           | 5.2.2     | Strict mode enabled                       |
| Build Tool      | Vite                 | 5.0.8     | Fast HMR and bundling                     |
| Styling         | Tailwind CSS         | 3.4.12    | With RTL support via tailwind-merge       |
| UI Components   | shadcn/ui + Radix    | Various   | Composable component architecture         |
| State Mgmt      | TanStack Query       | 5.56.2    | Server state with 5-min cache             |
| Forms           | React Hook Form      | 7.53.0    | With Zod validation                       |
| Backend         | Supabase             | 2.45.4    | PostgreSQL + Auth + Realtime              |
| Routing         | React Router DOM     | 6.26.1    | Client-side routing                       |
| i18n            | i18next              | 23.7.6    | Arabic/English support                    |
| Testing         | Vitest               | 3.2.4     | **0% coverage - CRITICAL GAP**            |
| Error Tracking  | Sentry               | 10.8.0    | Production error monitoring               |
| Deployment      | Netlify              | -         | Automatic deployments from git            |

### Repository Structure Reality Check

- **Type**: Monorepo - single repository for entire application
- **Package Manager**: npm (package-lock.json present)
- **Notable Issues**: 
  - No monorepo tools (nx, lerna) despite complexity
  - Mixed naming conventions between components
  - Inconsistent service patterns
