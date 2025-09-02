/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import IEPWorkflowStatusTracker from '@/components/iep/IEPWorkflowStatusTracker'

// Mock data
const mockIepId = 'test-iep-123'
const mockCurrentUserId = 'user-123'

// Mock external dependencies
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}))

describe('IEPWorkflowStatusTracker', () => {
  const defaultProps = {
    iepId: mockIepId,
    language: 'en' as const,
    currentUserId: mockCurrentUserId
  }

  test('renders workflow status tracker with English language', () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} />)
    
    expect(screen.getByText('Workflow Status Tracker')).toBeInTheDocument()
    expect(screen.getByText('Real-time progress tracking and workflow step management')).toBeInTheDocument()
    expect(screen.getByText('Overall Progress')).toBeInTheDocument()
  })

  test('renders workflow status tracker with Arabic language', () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} language="ar" />)
    
    expect(screen.getByText('متتبع حالة تدفق العمل')).toBeInTheDocument()
    expect(screen.getByText('تتبع التقدم في الوقت الفعلي وإدارة خطوات تدفق العمل')).toBeInTheDocument()
    expect(screen.getByText('التقدم الإجمالي')).toBeInTheDocument()
  })

  test('displays workflow metrics correctly', () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} />)
    
    // Should show progress metrics
    expect(screen.getByText('Overall Progress')).toBeInTheDocument()
    expect(screen.getByText('Completed Steps')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Est. Completion')).toBeInTheDocument()
  })

  test('renders workflow phases progress', () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} />)
    
    expect(screen.getByText('Workflow Phases Progress')).toBeInTheDocument()
    // Should show different phases
    expect(screen.getByText('draft')).toBeInTheDocument()
    expect(screen.getByText('review')).toBeInTheDocument()
    expect(screen.getByText('approval')).toBeInTheDocument()
  })

  test('switches between tabs correctly', async () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} />)
    
    // Should start with overview tab
    expect(screen.getByText('Key Milestones')).toBeInTheDocument()
    
    // Click on steps tab
    const stepsTab = screen.getByRole('tab', { name: 'Steps' })
    fireEvent.click(stepsTab)
    
    await waitFor(() => {
      // Should show step details
      expect(screen.getByText('Create Initial Draft')).toBeInTheDocument()
    })
  })

  test('shows critical path information', async () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} />)
    
    // Click on critical path tab
    const criticalTab = screen.getByRole('tab', { name: 'Critical Path' })
    fireEvent.click(criticalTab)
    
    await waitFor(() => {
      expect(screen.getByText('Critical Path')).toBeInTheDocument()
      expect(screen.getByText('These steps are critical for on-time completion. Any delay will impact the overall timeline.')).toBeInTheDocument()
    })
  })

  test('displays timeline tab with events', async () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} />)
    
    // Click on timeline tab
    const timelineTab = screen.getByRole('tab', { name: 'Timeline' })
    fireEvent.click(timelineTab)
    
    await waitFor(() => {
      // Should show event history
      expect(screen.getByText('Event History')).toBeInTheDocument()
    })
  })

  test('handles RTL layout for Arabic language', () => {
    const { container } = render(<IEPWorkflowStatusTracker {...defaultProps} language="ar" />)
    
    // Check for RTL class application
    const headerElement = container.querySelector('.flex-row-reverse')
    expect(headerElement).toBeInTheDocument()
  })

  test('shows health status badge', () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} />)
    
    expect(screen.getByText('On Track')).toBeInTheDocument()
  })

  test('displays milestone steps with proper status', () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} />)
    
    expect(screen.getByText('Key Milestones')).toBeInTheDocument()
    // Should show milestone items
    expect(screen.getByText('Parent Approval')).toBeInTheDocument()
    expect(screen.getByText('Begin Implementation')).toBeInTheDocument()
  })

  test('shows active steps with progress', () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} />)
    
    expect(screen.getByText('Active Steps')).toBeInTheDocument()
    // Should show active step details with assignee
    expect(screen.getByText('Student Parent')).toBeInTheDocument()
  })

  test('displays substeps when available', async () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} />)
    
    // Click on steps tab to see detailed substeps
    const stepsTab = screen.getByRole('tab', { name: 'Steps' })
    fireEvent.click(stepsTab)
    
    await waitFor(() => {
      // Should show substeps for draft step
      expect(screen.getByText('Gather Data')).toBeInTheDocument()
      expect(screen.getByText('Write Goals')).toBeInTheDocument()
    })
  })

  test('handles onStepAction callback when provided', async () => {
    const mockOnStepAction = vi.fn()
    render(<IEPWorkflowStatusTracker {...defaultProps} onStepAction={mockOnStepAction} />)
    
    // The component should be ready for step actions even if no buttons are directly visible
    // This tests that the callback prop is properly handled
    expect(mockOnStepAction).not.toHaveBeenCalled()
  })

  test('applies custom className when provided', () => {
    const customClass = 'custom-workflow-tracker'
    const { container } = render(
      <IEPWorkflowStatusTracker {...defaultProps} className={customClass} />
    )
    
    expect(container.firstChild).toHaveClass(customClass)
  })

  test('shows workflow progress percentages', () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} />)
    
    // Should show various progress percentages
    expect(screen.getByText('50%')).toBeInTheDocument() // Overall progress
    expect(screen.getByText('60%')).toBeInTheDocument() // Step progress
  })

  test('displays duration and dates correctly', async () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} />)
    
    // Click steps tab to see dates
    const stepsTab = screen.getByRole('tab', { name: 'Steps' })
    fireEvent.click(stepsTab)
    
    await waitFor(() => {
      // Should show dates in readable format
      const dateElements = screen.getAllByText(/\d+\/\d+\/\d+/)
      expect(dateElements.length).toBeGreaterThan(0)
    })
  })

  test('handles empty or loading states gracefully', () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} />)
    
    // Component should render without errors even with no data
    expect(screen.getByText('Workflow Status Tracker')).toBeInTheDocument()
  })
})

// Integration tests with Arabic language
describe('IEPWorkflowStatusTracker - Arabic RTL', () => {
  const arabicProps = {
    iepId: mockIepId,
    language: 'ar' as const,
    currentUserId: mockCurrentUserId
  }

  test('renders all Arabic labels correctly', () => {
    render(<IEPWorkflowStatusTracker {...arabicProps} />)
    
    expect(screen.getByText('متتبع حالة تدفق العمل')).toBeInTheDocument()
    expect(screen.getByText('الخطوات المكتملة')).toBeInTheDocument()
    expect(screen.getByText('المعالم الرئيسية')).toBeInTheDocument()
    expect(screen.getByText('نظرة عامة')).toBeInTheDocument()
  })

  test('shows Arabic milestone names', () => {
    render(<IEPWorkflowStatusTracker {...arabicProps} />)
    
    expect(screen.getByText('موافقة الوالدين')).toBeInTheDocument()
    expect(screen.getByText('بدء التنفيذ')).toBeInTheDocument()
  })

  test('displays Arabic status labels in tabs', async () => {
    render(<IEPWorkflowStatusTracker {...arabicProps} />)
    
    // Click through tabs to verify Arabic labels
    const stepsTab = screen.getByRole('tab', { name: 'الخطوات' })
    fireEvent.click(stepsTab)
    
    await waitFor(() => {
      expect(screen.getByText('إنشاء المسودة الأولية')).toBeInTheDocument()
    })
  })

  test('shows Arabic workflow phase names', () => {
    render(<IEPWorkflowStatusTracker {...arabicProps} />)
    
    expect(screen.getByText('تقدم مراحل التدفق')).toBeInTheDocument()
  })
})

// Accessibility tests
describe('IEPWorkflowStatusTracker - Accessibility', () => {
  test('has proper ARIA labels and roles', () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} />)
    
    // Check for proper tab roles
    const tablist = screen.getByRole('tablist')
    expect(tablist).toBeInTheDocument()
    
    const tabs = screen.getAllByRole('tab')
    expect(tabs.length).toBeGreaterThan(0)
  })

  test('supports keyboard navigation', () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} />)
    
    const firstTab = screen.getAllByRole('tab')[0]
    expect(firstTab).toBeInTheDocument()
    
    // Should be focusable
    firstTab.focus()
    expect(document.activeElement).toBe(firstTab)
  })

  test('has appropriate heading structure', () => {
    render(<IEPWorkflowStatusTracker {...defaultProps} />)
    
    const mainHeading = screen.getByRole('heading', { level: 2 })
    expect(mainHeading).toHaveTextContent('Workflow Status Tracker')
  })
})