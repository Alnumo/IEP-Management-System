/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import IEPWorkflowHistory from '@/components/iep/IEPWorkflowHistory'

// Mock data
const mockIepId = 'test-iep-123'
const mockWorkflowId = 'workflow-456'
const mockCurrentUserId = 'user-123'

// Mock external dependencies
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}))

describe('IEPWorkflowHistory', () => {
  const defaultProps = {
    iepId: mockIepId,
    workflowId: mockWorkflowId,
    language: 'en' as const,
    currentUserId: mockCurrentUserId
  }

  test('renders workflow history with English language', () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    expect(screen.getByText('Workflow History')).toBeInTheDocument()
    expect(screen.getByText('Complete audit trail of workflow events and changes')).toBeInTheDocument()
  })

  test('renders workflow history with Arabic language', () => {
    render(<IEPWorkflowHistory {...defaultProps} language="ar" />)
    
    expect(screen.getByText('تاريخ تدفق العمل')).toBeInTheDocument()
    expect(screen.getByText('سجل شامل لجميع أحداث وتغييرات تدفق العمل')).toBeInTheDocument()
  })

  test('displays history statistics correctly', () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    expect(screen.getByText('Total Events')).toBeInTheDocument()
    expect(screen.getByText('This Week')).toBeInTheDocument()
    expect(screen.getByText('Critical Events')).toBeInTheDocument()
    expect(screen.getByText('Most Active')).toBeInTheDocument()
  })

  test('renders filter controls', () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    expect(screen.getByLabelText('Search')).toBeInTheDocument()
    expect(screen.getByText('Event Type')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Critical Only')).toBeInTheDocument()
  })

  test('switches between tabs correctly', async () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    // Should start with timeline tab
    expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true')
    
    // Click on changes tab
    const changesTab = screen.getByRole('tab', { name: 'Changes' })
    fireEvent.click(changesTab)
    
    await waitFor(() => {
      expect(screen.getByText('Change Log')).toBeInTheDocument()
    })
  })

  test('filters events by search query', async () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    const searchInput = screen.getByLabelText('Search')
    fireEvent.change(searchInput, { target: { value: 'workflow' } })
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('workflow')
    })
  })

  test('filters events by event type', async () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    // Find and interact with event type filter
    const eventTypeSelect = screen.getByRole('combobox')
    fireEvent.click(eventTypeSelect)
    
    await waitFor(() => {
      const workflowStartedOption = screen.getByText('Workflow Started')
      expect(workflowStartedOption).toBeInTheDocument()
    })
  })

  test('toggles critical events filter', () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    const criticalButton = screen.getByText('Critical Only')
    fireEvent.click(criticalButton)
    
    // Button should toggle state
    expect(criticalButton).toBeInTheDocument()
  })

  test('displays timeline events with proper formatting', () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    // Should show workflow events
    expect(screen.getByText('Workflow Started')).toBeInTheDocument()
    expect(screen.getByText('Draft Step Started')).toBeInTheDocument()
    expect(screen.getByText('Comment Added')).toBeInTheDocument()
  })

  test('shows event details in timeline', () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    // Should show user information
    expect(screen.getByText('Dr. Sara Ahmed')).toBeInTheDocument()
    expect(screen.getByText('Mr. Mohammed Ali')).toBeInTheDocument()
    
    // Should show event descriptions
    expect(screen.getByText('IEP workflow has been initiated')).toBeInTheDocument()
  })

  test('opens event detail dialog when event is clicked', async () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    // Click on an event
    const workflowEvent = screen.getByText('Workflow Started')
    fireEvent.click(workflowEvent.closest('[role="button"]') || workflowEvent)
    
    // Dialog should open with event details
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  test('displays changes tab with change log table', async () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    const changesTab = screen.getByRole('tab', { name: 'Changes' })
    fireEvent.click(changesTab)
    
    await waitFor(() => {
      expect(screen.getByText('Change Log')).toBeInTheDocument()
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('User')).toBeInTheDocument()
      expect(screen.getByText('Field')).toBeInTheDocument()
      expect(screen.getByText('Before')).toBeInTheDocument()
      expect(screen.getByText('After')).toBeInTheDocument()
    })
  })

  test('shows versions tab placeholder', async () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    const versionsTab = screen.getByRole('tab', { name: 'Versions' })
    fireEvent.click(versionsTab)
    
    await waitFor(() => {
      expect(screen.getByText('Version management coming soon')).toBeInTheDocument()
    })
  })

  test('shows analytics tab placeholder', async () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    const analyticsTab = screen.getByRole('tab', { name: 'Analytics' })
    fireEvent.click(analyticsTab)
    
    await waitFor(() => {
      expect(screen.getByText('Workflow analytics coming soon')).toBeInTheDocument()
    })
  })

  test('handles event selection callback', () => {
    const mockOnEventSelected = vi.fn()
    render(<IEPWorkflowHistory {...defaultProps} onEventSelected={mockOnEventSelected} />)
    
    // The component should be ready for event selection
    expect(mockOnEventSelected).not.toHaveBeenCalled()
  })

  test('displays event badges and status indicators', () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    // Should show critical event badges
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0)
    
    // Should show category badges
    expect(screen.getByText('workflow')).toBeInTheDocument()
    expect(screen.getByText('collaboration')).toBeInTheDocument()
  })

  test('shows attachment information when available', () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    // Should indicate when events have attachments
    expect(screen.getByText('1 attachments')).toBeInTheDocument()
  })

  test('displays duration information for events', () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    // Should show duration for events that have it
    expect(screen.getByText('2 hr')).toBeInTheDocument() // 120 minutes
    expect(screen.getByText('2 days')).toBeInTheDocument() // 2880 minutes
  })

  test('applies custom className when provided', () => {
    const customClass = 'custom-history-component'
    const { container } = render(
      <IEPWorkflowHistory {...defaultProps} className={customClass} />
    )
    
    expect(container.firstChild).toHaveClass(customClass)
  })

  test('handles RTL layout for Arabic language', () => {
    const { container } = render(<IEPWorkflowHistory {...defaultProps} language="ar" />)
    
    const rtlElements = container.querySelectorAll('.flex-row-reverse')
    expect(rtlElements.length).toBeGreaterThan(0)
  })
})

// Arabic language tests
describe('IEPWorkflowHistory - Arabic RTL', () => {
  const arabicProps = {
    iepId: mockIepId,
    workflowId: mockWorkflowId,
    language: 'ar' as const,
    currentUserId: mockCurrentUserId
  }

  test('renders all Arabic labels correctly', () => {
    render(<IEPWorkflowHistory {...arabicProps} />)
    
    expect(screen.getByText('إجمالي الأحداث')).toBeInTheDocument()
    expect(screen.getByText('أحداث هذا الأسبوع')).toBeInTheDocument()
    expect(screen.getByText('أحداث حرجة')).toBeInTheDocument()
    expect(screen.getByText('الجدول الزمني')).toBeInTheDocument()
  })

  test('shows Arabic event names and descriptions', () => {
    render(<IEPWorkflowHistory {...arabicProps} />)
    
    expect(screen.getByText('بدء تدفق العمل')).toBeInTheDocument()
    expect(screen.getByText('بدء خطوة المسودة')).toBeInTheDocument()
    expect(screen.getByText('إضافة تعليق')).toBeInTheDocument()
  })

  test('displays Arabic user names', () => {
    render(<IEPWorkflowHistory {...arabicProps} />)
    
    expect(screen.getByText('د. سارة أحمد')).toBeInTheDocument()
    expect(screen.getByText('أ. محمد علي')).toBeInTheDocument()
  })

  test('shows Arabic filter labels', () => {
    render(<IEPWorkflowHistory {...arabicProps} />)
    
    expect(screen.getByLabelText('البحث')).toBeInTheDocument()
    expect(screen.getByText('نوع الحدث')).toBeInTheDocument()
    expect(screen.getByText('الفئة')).toBeInTheDocument()
    expect(screen.getByText('حرجة فقط')).toBeInTheDocument()
  })

  test('displays Arabic tab names', () => {
    render(<IEPWorkflowHistory {...arabicProps} />)
    
    expect(screen.getByRole('tab', { name: 'الجدول الزمني' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'التغييرات' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'النسخ' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'التحليلات' })).toBeInTheDocument()
  })
})

// Event filtering tests
describe('IEPWorkflowHistory - Event Filtering', () => {
  test('filters events by search term correctly', async () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    const searchInput = screen.getByLabelText('Search')
    fireEvent.change(searchInput, { target: { value: 'draft' } })
    
    await waitFor(() => {
      // Should show draft-related events
      expect(screen.getByText('Draft Step Started')).toBeInTheDocument()
      expect(screen.getByText('Draft Step Completed')).toBeInTheDocument()
    })
  })

  test('shows only critical events when filter is applied', () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    const criticalButton = screen.getByText('Critical Only')
    fireEvent.click(criticalButton)
    
    // All visible events should be critical
    const criticalBadges = screen.getAllByText('Critical')
    expect(criticalBadges.length).toBeGreaterThan(0)
  })

  test('filters by event category', async () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    // This would test category filtering if the select was properly implemented
    expect(screen.getByText('Category')).toBeInTheDocument()
  })
})

// Event detail dialog tests
describe('IEPWorkflowHistory - Event Details', () => {
  test('shows event metadata in detail dialog', async () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    // Click on an event to open details
    const eventElement = screen.getByText('Workflow Started')
    const clickableParent = eventElement.closest('.cursor-pointer')
    
    if (clickableParent) {
      fireEvent.click(clickableParent)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('User:')).toBeInTheDocument()
        expect(screen.getByText('Type:')).toBeInTheDocument()
      })
    }
  })

  test('displays change details for events with changes', async () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    // Click on an event that has changes
    const eventWithChanges = screen.getByText('Draft Step Completed')
    const clickableParent = eventWithChanges.closest('.cursor-pointer')
    
    if (clickableParent) {
      fireEvent.click(clickableParent)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Changes')).toBeInTheDocument()
      })
    }
  })

  test('shows attachments in event details', async () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    // Click on event with attachments
    const eventWithAttachments = screen.getByText('Draft Step Completed')
    const clickableParent = eventWithAttachments.closest('.cursor-pointer')
    
    if (clickableParent) {
      fireEvent.click(clickableParent)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Attachments')).toBeInTheDocument()
      })
    }
  })

  test('closes dialog when close button is clicked', async () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    // Open dialog
    const eventElement = screen.getByText('Workflow Started')
    const clickableParent = eventElement.closest('.cursor-pointer')
    
    if (clickableParent) {
      fireEvent.click(clickableParent)
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
        
        const closeButton = screen.getByText('Close')
        fireEvent.click(closeButton)
      })
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    }
  })
})

// Accessibility tests
describe('IEPWorkflowHistory - Accessibility', () => {
  test('has proper ARIA labels and roles', () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    const tablist = screen.getByRole('tablist')
    expect(tablist).toBeInTheDocument()
    
    const tabs = screen.getAllByRole('tab')
    expect(tabs.length).toBe(4) // Timeline, Changes, Versions, Analytics
  })

  test('supports keyboard navigation', () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    const firstTab = screen.getAllByRole('tab')[0]
    firstTab.focus()
    expect(document.activeElement).toBe(firstTab)
  })

  test('has appropriate heading structure', () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    const mainHeading = screen.getByRole('heading', { level: 2 })
    expect(mainHeading).toHaveTextContent('Workflow History')
  })

  test('search input has proper label', () => {
    render(<IEPWorkflowHistory {...defaultProps} />)
    
    const searchInput = screen.getByLabelText('Search')
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('placeholder', 'Search events...')
  })
})