# Testing Strategy

Addressing the testing coverage gap identified in the gap-analysis.md is a top priority for this enhancement. The following strategy will be implemented to ensure the new features are robust and do not introduce regressions.

## Integration with Existing Tests

Existing Test Framework: All new tests will be added to the existing Vitest test suite.

Coverage Requirements: All new code (components, services, hooks) is required to meet a minimum of 80% unit test coverage. The overall project coverage should increase as a result of this enhancement.

## New Testing Requirements

Unit Tests for New Components: Every new React component (e.g., CRM Kanban board, Subscription Freeze modal) will have a corresponding .test.tsx file. Tests will cover rendering, user interactions, and all possible states (loading, error, success).

Integration Tests: New integration tests will be created to verify the end-to-end workflows of the new features. This is especially critical for:

The CRM lead creation flow (from n8n webhook to UI update).

The subscription freeze and auto-rescheduling logic.

The QR code attendance logging.

Regression Tests: A new suite of regression tests will be added to ensure that the core functionality of the existing system—such as student
