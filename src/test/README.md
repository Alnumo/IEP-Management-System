# Testing Standards and Guidelines

This document outlines the testing standards and patterns for the Arkan Al-Numo IEP Management System.

## Testing Framework

- **Test Runner**: Vitest
- **Component Testing**: React Testing Library
- **User Interactions**: @testing-library/user-event
- **Mocking**: Vitest built-in mocking
- **Coverage**: @vitest/coverage-v8

## Test Organization

```
src/
├── test/
│   ├── setup.ts              # Global test setup
│   ├── templates/             # Test templates for different patterns
│   │   ├── component.test.template.tsx
│   │   ├── hook.test.template.ts
│   │   └── api-integration.test.template.ts
│   ├── __tests__/            # Shared test utilities and integration tests
│   ├── lib/                  # Library function tests
│   ├── components/           # Component tests
│   └── hooks/                # Custom hook tests
```

## Test Patterns

### 1. Component Tests

**Location**: Co-located with components using `.test.tsx` extension
**Template**: `src/test/templates/component.test.template.tsx`

#### Required Test Categories:
- **Rendering**: Basic render, loading states, error states
- **User Interactions**: Button clicks, form submissions, keyboard navigation
- **Accessibility**: ARIA attributes, keyboard navigation
- **Bilingual Support**: Arabic RTL and English LTR layouts
- **Error Boundaries**: Error handling within ErrorBoundary
- **TanStack Query Integration**: Loading, success, and error states

#### Example:
```typescript
describe('StudentForm', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderWithProviders(<StudentForm />)
      expect(screen.getByRole('form')).toBeInTheDocument()
    })
  })

  describe('Bilingual Support', () => {
    it('renders correctly in Arabic (RTL)', () => {
      renderWithProviders(<StudentForm language="ar" />)
      expect(screen.getByTestId('form-container')).toHaveAttribute('dir', 'rtl')
    })
  })
})
```

### 2. Custom Hook Tests

**Location**: Co-located with hooks using `.test.ts` extension
**Template**: `src/test/templates/hook.test.template.ts`

#### Required Test Categories:
- **Initial State**: Default values and configuration
- **Data Fetching**: Success, loading, and error states
- **Parameters**: Custom parameters and parameter changes
- **Mutations**: Success and error handling
- **Cache Management**: Refetching and cache invalidation
- **Cleanup**: Resource cleanup on unmount

#### Example:
```typescript
describe('useStudents', () => {
  it('fetches students successfully', async () => {
    const { result } = renderHook(() => useStudents(), { wrapper })
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    
    expect(result.current.data).toHaveLength(5)
  })
})
```

### 3. API Integration Tests

**Location**: `src/services/__tests__/`
**Template**: `src/test/templates/api-integration.test.template.ts`

#### Required Test Categories:
- **CRUD Operations**: Create, Read, Update, Delete
- **Row Level Security**: Different user roles and permissions
- **Data Validation**: Constraints, required fields, data types
- **Pagination and Filtering**: Complex queries and filtering
- **Real-time Subscriptions**: WebSocket connections
- **Error Handling**: Retry logic, error categorization
- **Performance**: Caching strategies

#### Example:
```typescript
describe('Student API', () => {
  it('creates student with validation', async () => {
    const studentData = { name: 'John Doe', age: 12 }
    const result = await studentService.create(studentData)
    
    expect(result.id).toBeDefined()
    expect(result.name).toBe('John Doe')
  })
})
```

## Testing Best Practices

### 1. Arrange, Act, Assert Pattern
```typescript
it('should update student name', async () => {
  // Arrange
  const student = { id: '123', name: 'Old Name' }
  const updatedData = { name: 'New Name' }
  
  // Act
  const result = await updateStudent(student.id, updatedData)
  
  // Assert
  expect(result.name).toBe('New Name')
})
```

### 2. Test Provider Setup
Always wrap components that use React Query or other contexts:

```typescript
const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}
```

### 3. Mocking External Dependencies
```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: mockData, error: null }))
    }))
  }
}))
```

### 4. User Event Interactions
```typescript
const user = userEvent.setup()

// Prefer user interactions over fireEvent
await user.click(button)
await user.type(input, 'test text')
await user.tab()
```

### 5. Async Testing
```typescript
// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
})

// Use findBy queries for elements that appear asynchronously
const successMessage = await screen.findByText('Success')
```

### 6. Bilingual Testing Requirements
Every UI component must test both Arabic and English:

```typescript
describe('Bilingual Support', () => {
  it('renders correctly in Arabic (RTL)', () => {
    renderWithProviders(<Component language="ar" />)
    expect(container).toHaveAttribute('dir', 'rtl')
  })
  
  it('renders correctly in English (LTR)', () => {
    renderWithProviders(<Component language="en" />)
    expect(container).toHaveAttribute('dir', 'ltr')
  })
})
```

## Coverage Requirements

- **Minimum**: 80% coverage for all metrics (lines, functions, branches, statements)
- **Component Coverage**: 100% for critical user-facing components
- **Hook Coverage**: 95% for custom hooks
- **Service Coverage**: 90% for API services

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test StudentForm.test.tsx

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui
```

## CI/CD Integration

Tests run automatically on:
- Every commit (pre-commit hook)
- Pull requests to main/develop
- Scheduled nightly runs

Coverage reports are generated and uploaded to Codecov for tracking progress toward the 80% coverage goal.

## Common Issues and Solutions

### 1. Act Warnings
```typescript
// Wrap state updates in act()
await act(async () => {
  result.current.updateData(newData)
})
```

### 2. Timer Mocking
```typescript
// Mock timers for components with delays
vi.useFakeTimers()
vi.advanceTimersByTime(1000)
vi.useRealTimers()
```

### 3. Supabase Mocking
```typescript
// Mock Supabase for consistent test behavior
const mockSupabase = {
  from: () => ({ select: () => ({ data: [], error: null }) })
}
```

This testing infrastructure ensures comprehensive coverage and maintains high code quality standards across the Arkan Al-Numo system.