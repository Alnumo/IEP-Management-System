// Tests for MediaUpload Component
// Story 1.3: Media-Rich Progress Documentation Workflow

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MediaUpload } from './MediaUpload'
import { mediaUploadService } from '@/lib/services/mediaUploadService'
import type { SessionMedia } from '@/types/media'

// Mock the translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'media.upload.title': 'Upload Media',
        'media.upload.uploadType': 'Upload Type',
        'media.upload.selectUploadType': 'Select upload type',
        'media.upload.dragDropFiles': 'Drag and drop files here',
        'media.upload.dropFiles': 'Drop files here',
        'media.upload.supportedFormats': 'Supported formats: JPG, PNG, MP4, PDF',
        'media.upload.maxFileSize': 'Maximum file size: 50MB',
        'media.upload.selectFiles': 'Select Files',
        'media.upload.selectedFiles': 'Selected Files',
        'media.upload.captionArabic': 'Caption (Arabic)',
        'media.upload.captionEnglish': 'Caption (English)',
        'media.upload.captionArabicPlaceholder': 'Enter Arabic caption',
        'media.upload.captionEnglishPlaceholder': 'Enter English caption',
        'media.upload.tags': 'Tags',
        'media.upload.addTag': 'Add tag',
        'media.upload.markAsPrivate': 'Mark as private',
        'media.upload.markAsFeatured': 'Mark as featured',
        'media.upload.uploading': 'Uploading...',
        'media.upload.uploadFiles': 'Upload Files',
        'media.uploadTypes.sessionDocumentation': 'Session Documentation',
        'media.uploadTypes.homePractice': 'Home Practice',
        'media.uploadTypes.progressUpdate': 'Progress Update',
        'media.uploadTypes.milestoneCelebration': 'Milestone Celebration',
        'common.clear': 'Clear',
        'common.dismiss': 'Dismiss'
      }
      return translations[key] || key
    }
  })
}))

// Mock the media upload service
vi.mock('@/lib/services/mediaUploadService', () => ({
  mediaUploadService: {
    uploadFiles: vi.fn(),
    uploadFile: vi.fn(),
    cancelUpload: vi.fn(),
    getUploadProgress: vi.fn(),
    subscribeToProgress: vi.fn(),
    unsubscribeFromProgress: vi.fn()
  }
}))

// Mock react-dropzone
const mockGetRootProps = vi.fn(() => ({}))
const mockGetInputProps = vi.fn(() => ({}))
const mockIsDragActive = false

vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(() => ({
    getRootProps: mockGetRootProps,
    getInputProps: mockGetInputProps,
    isDragActive: mockIsDragActive
  }))
}))

// Mock URL.createObjectURL
Object.defineProperty(global.URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mock-object-url')
})

Object.defineProperty(global.URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn()
})

// Mock File constructor
global.File = class extends File {
  constructor(chunks: BlobPart[], name: string, options?: FilePropertyBag) {
    super(chunks, name, options)
  }
}

const mockFiles = [
  new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' }),
  new File(['video content'], 'test-video.mp4', { type: 'video/mp4' })
]

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('MediaUpload Component', () => {
  const defaultProps = {
    studentId: 'student-123',
    language: 'en' as const,
    onUploadComplete: vi.fn(),
    onUploadError: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset dropzone mock
    const { useDropzone } = require('react-dropzone')
    useDropzone.mockReturnValue({
      getRootProps: mockGetRootProps,
      getInputProps: mockGetInputProps,
      isDragActive: false
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders upload interface correctly', () => {
    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    expect(screen.getByText('Upload Media')).toBeInTheDocument()
    expect(screen.getByText('Upload Type')).toBeInTheDocument()
    expect(screen.getByText('Drag and drop files here')).toBeInTheDocument()
    expect(screen.getByText('Select Files')).toBeInTheDocument()
  })

  it('displays Arabic interface correctly when language is Arabic', () => {
    render(
      <MediaUpload {...defaultProps} language="ar" />, 
      { wrapper: createWrapper() }
    )

    const title = screen.getByText('Upload Media')
    expect(title).toBeInTheDocument()
    
    // Check for RTL classes and text alignment
    const captionTextarea = screen.getByPlaceholderText('Enter Arabic caption')
    expect(captionTextarea).toHaveAttribute('dir', 'rtl')
  })

  it('shows upload type selection options', async () => {
    const user = userEvent.setup()
    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    const uploadTypeSelect = screen.getByRole('combobox')
    await user.click(uploadTypeSelect)

    await waitFor(() => {
      expect(screen.getByText('Session Documentation')).toBeInTheDocument()
      expect(screen.getByText('Home Practice')).toBeInTheDocument()
      expect(screen.getByText('Progress Update')).toBeInTheDocument()
      expect(screen.getByText('Milestone Celebration')).toBeInTheDocument()
    })
  })

  it('handles file selection through dropzone', async () => {
    const onDrop = vi.fn()
    const { useDropzone } = require('react-dropzone')
    
    useDropzone.mockReturnValue({
      getRootProps: () => ({ onClick: vi.fn() }),
      getInputProps: () => ({}),
      isDragActive: false
    })

    // Mock the useDropzone to call onDrop when files are selected
    useDropzone.mockImplementation(({ onDrop: dropCallback }) => {
      setTimeout(() => dropCallback(mockFiles, []), 0)
      return {
        getRootProps: () => ({}),
        getInputProps: () => ({}),
        isDragActive: false
      }
    })

    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument()
      expect(screen.getByText('test-video.mp4')).toBeInTheDocument()
    })
  })

  it('displays selected files with proper information', async () => {
    const { useDropzone } = require('react-dropzone')
    
    useDropzone.mockImplementation(({ onDrop }) => {
      setTimeout(() => onDrop(mockFiles, []), 0)
      return {
        getRootProps: () => ({}),
        getInputProps: () => ({}),
        isDragActive: false
      }
    })

    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    await waitFor(() => {
      // Check file names are displayed
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument()
      expect(screen.getByText('test-video.mp4')).toBeInTheDocument()
      
      // Check file sizes are displayed (mocked as 0 bytes)
      expect(screen.getAllByText('0 Bytes')).toHaveLength(2)
    })
  })

  it('allows removing selected files', async () => {
    const user = userEvent.setup()
    const { useDropzone } = require('react-dropzone')
    
    useDropzone.mockImplementation(({ onDrop }) => {
      setTimeout(() => onDrop([mockFiles[0]], []), 0)
      return {
        getRootProps: () => ({}),
        getInputProps: () => ({}),
        isDragActive: false
      }
    })

    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument()
    })

    // Find and click remove button
    const removeButtons = screen.getAllByRole('button')
    const removeButton = removeButtons.find(button => {
      const svg = button.querySelector('svg')
      return svg?.innerHTML.includes('path') // X icon
    })

    if (removeButton) {
      await user.click(removeButton)
      
      await waitFor(() => {
        expect(screen.queryByText('test-image.jpg')).not.toBeInTheDocument()
      })
    }
  })

  it('handles caption input in both languages', async () => {
    const user = userEvent.setup()
    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    const arabicCaption = screen.getByPlaceholderText('Enter Arabic caption')
    const englishCaption = screen.getByPlaceholderText('Enter English caption')

    await user.type(arabicCaption, 'تسمية باللغة العربية')
    await user.type(englishCaption, 'English caption')

    expect(arabicCaption).toHaveValue('تسمية باللغة العربية')
    expect(englishCaption).toHaveValue('English caption')
  })

  it('handles tag management', async () => {
    const user = userEvent.setup()
    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    const tagInput = screen.getByPlaceholderText('Add tag')
    const addTagButton = screen.getByRole('button', { name: '' }) // Plus icon button

    // Add a tag
    await user.type(tagInput, 'progress')
    await user.click(addTagButton)

    expect(screen.getByText('progress')).toBeInTheDocument()

    // Remove the tag by clicking on it
    const tagElement = screen.getByText('progress')
    await user.click(tagElement)

    await waitFor(() => {
      expect(screen.queryByText('progress')).not.toBeInTheDocument()
    })
  })

  it('handles tag input with Enter key', async () => {
    const user = userEvent.setup()
    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    const tagInput = screen.getByPlaceholderText('Add tag')

    await user.type(tagInput, 'milestone')
    await user.keyboard('{Enter}')

    expect(screen.getByText('milestone')).toBeInTheDocument()
    expect(tagInput).toHaveValue('') // Input should be cleared
  })

  it('toggles privacy and featured switches', async () => {
    const user = userEvent.setup()
    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    const privateSwitch = screen.getByRole('switch', { name: /private/i })
    const featuredSwitch = screen.getByRole('switch', { name: /featured/i })

    expect(privateSwitch).not.toBeChecked()
    expect(featuredSwitch).not.toBeChecked()

    await user.click(privateSwitch)
    await user.click(featuredSwitch)

    expect(privateSwitch).toBeChecked()
    expect(featuredSwitch).toBeChecked()
  })

  it('handles successful file upload', async () => {
    const user = userEvent.setup()
    const mockUploadResult = {
      completed: [
        {
          id: 'media-1',
          file_name: 'test-image.jpg',
          student_id: 'student-123'
        } as SessionMedia
      ],
      failed: []
    }

    vi.mocked(mediaUploadService.uploadFiles).mockResolvedValue(mockUploadResult)

    const { useDropzone } = require('react-dropzone')
    useDropzone.mockImplementation(({ onDrop }) => {
      setTimeout(() => onDrop([mockFiles[0]], []), 0)
      return {
        getRootProps: () => ({}),
        getInputProps: () => ({}),
        isDragActive: false
      }
    })

    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument()
    })

    const uploadButton = screen.getByText('Upload Files')
    await user.click(uploadButton)

    await waitFor(() => {
      expect(mediaUploadService.uploadFiles).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(File)]),
        expect.objectContaining({
          studentId: 'student-123',
          uploadType: 'session_documentation'
        }),
        expect.any(Function)
      )
    })

    expect(defaultProps.onUploadComplete).toHaveBeenCalledWith(mockUploadResult.completed)
  })

  it('handles upload errors', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Upload failed due to network error'

    vi.mocked(mediaUploadService.uploadFiles).mockRejectedValue(new Error(errorMessage))

    const { useDropzone } = require('react-dropzone')
    useDropzone.mockImplementation(({ onDrop }) => {
      setTimeout(() => onDrop([mockFiles[0]], []), 0)
      return {
        getRootProps: () => ({}),
        getInputProps: () => ({}),
        isDragActive: false
      }
    })

    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument()
    })

    const uploadButton = screen.getByText('Upload Files')
    await user.click(uploadButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(defaultProps.onUploadError).toHaveBeenCalledWith(errorMessage)
    })
  })

  it('handles partial upload failures', async () => {
    const user = userEvent.setup()
    const mockUploadResult = {
      completed: [
        {
          id: 'media-1',
          file_name: 'test-image.jpg',
          student_id: 'student-123'
        } as SessionMedia
      ],
      failed: [
        {
          file: mockFiles[1],
          error: 'File type not supported'
        }
      ]
    }

    vi.mocked(mediaUploadService.uploadFiles).mockResolvedValue(mockUploadResult)

    const { useDropzone } = require('react-dropzone')
    useDropzone.mockImplementation(({ onDrop }) => {
      setTimeout(() => onDrop(mockFiles, []), 0)
      return {
        getRootProps: () => ({}),
        getInputProps: () => ({}),
        isDragActive: false
      }
    })

    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument()
      expect(screen.getByText('test-video.mp4')).toBeInTheDocument()
    })

    const uploadButton = screen.getByText('Upload Files')
    await user.click(uploadButton)

    await waitFor(() => {
      // Should show success for completed uploads
      expect(defaultProps.onUploadComplete).toHaveBeenCalledWith(mockUploadResult.completed)
      
      // Should show error message for failed uploads
      expect(screen.getByText('test-video.mp4: File type not supported')).toBeInTheDocument()
    })
  })

  it('shows loading state during upload', async () => {
    const user = userEvent.setup()
    
    // Create a promise that doesn't resolve immediately
    let resolveUpload: (value: any) => void
    const uploadPromise = new Promise(resolve => {
      resolveUpload = resolve
    })

    vi.mocked(mediaUploadService.uploadFiles).mockReturnValue(uploadPromise)

    const { useDropzone } = require('react-dropzone')
    useDropzone.mockImplementation(({ onDrop }) => {
      setTimeout(() => onDrop([mockFiles[0]], []), 0)
      return {
        getRootProps: () => ({}),
        getInputProps: () => ({}),
        isDragActive: false
      }
    })

    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument()
    })

    const uploadButton = screen.getByText('Upload Files')
    await user.click(uploadButton)

    // Should show loading state
    expect(screen.getByText('Uploading...')).toBeInTheDocument()
    expect(uploadButton).toBeDisabled()

    // Resolve the upload
    resolveUpload!({ completed: [], failed: [] })

    await waitFor(() => {
      expect(screen.queryByText('Uploading...')).not.toBeInTheDocument()
    })
  })

  it('clears form after successful upload', async () => {
    const user = userEvent.setup()
    const mockUploadResult = {
      completed: [{ id: 'media-1' } as SessionMedia],
      failed: []
    }

    vi.mocked(mediaUploadService.uploadFiles).mockResolvedValue(mockUploadResult)

    const { useDropzone } = require('react-dropzone')
    useDropzone.mockImplementation(({ onDrop }) => {
      setTimeout(() => onDrop([mockFiles[0]], []), 0)
      return {
        getRootProps: () => ({}),
        getInputProps: () => ({}),
        isDragActive: false
      }
    })

    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    // Add some form data
    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument()
    })

    const arabicCaption = screen.getByPlaceholderText('Enter Arabic caption')
    await user.type(arabicCaption, 'test caption')

    const uploadButton = screen.getByText('Upload Files')
    await user.click(uploadButton)

    await waitFor(() => {
      // Form should be cleared
      expect(screen.queryByText('test-image.jpg')).not.toBeInTheDocument()
      expect(arabicCaption).toHaveValue('')
    })
  })

  it('handles manual clear action', async () => {
    const user = userEvent.setup()
    
    const { useDropzone } = require('react-dropzone')
    useDropzone.mockImplementation(({ onDrop }) => {
      setTimeout(() => onDrop([mockFiles[0]], []), 0)
      return {
        getRootProps: () => ({}),
        getInputProps: () => ({}),
        isDragActive: false
      }
    })

    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument()
    })

    // Add some form data
    const arabicCaption = screen.getByPlaceholderText('Enter Arabic caption')
    await user.type(arabicCaption, 'test caption')

    // Clear the form
    const clearButton = screen.getByText('Clear')
    await user.click(clearButton)

    expect(screen.queryByText('test-image.jpg')).not.toBeInTheDocument()
    expect(arabicCaption).toHaveValue('')
  })

  it('disables upload button when no files selected', () => {
    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    const uploadButton = screen.getByText('Upload Files')
    expect(uploadButton).toBeDisabled()
  })

  it('handles rejected files from dropzone', async () => {
    const rejectedFiles = [
      {
        file: new File(['content'], 'large-file.jpg', { type: 'image/jpeg' }),
        errors: [{ message: 'File is too large' }]
      }
    ]

    const { useDropzone } = require('react-dropzone')
    useDropzone.mockImplementation(({ onDrop }) => {
      setTimeout(() => onDrop([], rejectedFiles), 0)
      return {
        getRootProps: () => ({}),
        getInputProps: () => ({}),
        isDragActive: false
      }
    })

    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('large-file.jpg: File is too large')).toBeInTheDocument()
    })
  })

  it('dismisses error messages', async () => {
    const user = userEvent.setup()
    
    const rejectedFiles = [
      {
        file: new File(['content'], 'invalid-file.exe', { type: 'application/exe' }),
        errors: [{ message: 'File type not supported' }]
      }
    ]

    const { useDropzone } = require('react-dropzone')
    useDropzone.mockImplementation(({ onDrop }) => {
      setTimeout(() => onDrop([], rejectedFiles), 0)
      return {
        getRootProps: () => ({}),
        getInputProps: () => ({}),
        isDragActive: false
      }
    })

    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('invalid-file.exe: File type not supported')).toBeInTheDocument()
    })

    const dismissButton = screen.getByText('Dismiss')
    await user.click(dismissButton)

    expect(screen.queryByText('invalid-file.exe: File type not supported')).not.toBeInTheDocument()
  })
})

describe('MediaUpload Component - Edge Cases', () => {
  const defaultProps = {
    studentId: 'student-123',
    language: 'en' as const
  }

  it('handles sessionId prop correctly', () => {
    render(
      <MediaUpload {...defaultProps} sessionId="session-456" />, 
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('Upload Media')).toBeInTheDocument()
  })

  it('prevents duplicate tags', async () => {
    const user = userEvent.setup()
    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    const tagInput = screen.getByPlaceholderText('Add tag')
    const addTagButton = screen.getByRole('button', { name: '' })

    // Add first tag
    await user.type(tagInput, 'duplicate')
    await user.click(addTagButton)

    expect(screen.getByText('duplicate')).toBeInTheDocument()

    // Try to add the same tag again
    await user.type(tagInput, 'duplicate')
    await user.click(addTagButton)

    // Should still only have one tag
    const tags = screen.getAllByText('duplicate')
    expect(tags).toHaveLength(1)
  })

  it('trims whitespace from tags', async () => {
    const user = userEvent.setup()
    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    const tagInput = screen.getByPlaceholderText('Add tag')

    await user.type(tagInput, '  whitespace  ')
    await user.keyboard('{Enter}')

    expect(screen.getByText('whitespace')).toBeInTheDocument()
    expect(screen.queryByText('  whitespace  ')).not.toBeInTheDocument()
  })

  it('ignores empty tags', async () => {
    const user = userEvent.setup()
    render(<MediaUpload {...defaultProps} />, { wrapper: createWrapper() })

    const tagInput = screen.getByPlaceholderText('Add tag')

    await user.type(tagInput, '   ')
    await user.keyboard('{Enter}')

    const tagsContainer = screen.queryByRole('group')
    expect(tagsContainer).not.toBeInTheDocument()
  })
})