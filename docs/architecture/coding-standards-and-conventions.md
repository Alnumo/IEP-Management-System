# Coding Standards and Conventions

To ensure the new code integrates seamlessly with your existing, high-quality codebase, all development for this enhancement will adhere to the following standards. These rules are mandatory for all developers, both human and AI, to maintain consistency.

## Existing Standards Compliance

Code Style: We will continue to use the same ESLint and Prettier configurations that are already in the project. The existing linting rules must pass without any new warnings or errors.

Testing Patterns: All new tests will be written using Vitest and React Testing Library, mirroring the existing testing architecture. The established "Arrange, Act, Assert" pattern will be used for all unit tests.

Documentation Style: All new functions, components, and types must include bilingual JSDoc comments (Arabic and English), following the pattern established in your development standards.

## Critical Integration Rules

Type Sharing: All new TypeScript types that are shared between the frontend and backend (e.g., API response models) must be defined in the src/types/ directory to ensure a single source of truth.

API Calls: All frontend API interactions must be managed through the TanStack Query v5 library. Direct fetch calls are prohibited to ensure consistent caching, refetching, and error handling.

Environment Variables: All new environment variables must be prefixed with VITE_ and accessed through the validated environment object, never directly via import.meta.env.

Error Handling: All new components must be designed to work within the existing multi-level ErrorBoundary structure to handle potential errors gracefully.
