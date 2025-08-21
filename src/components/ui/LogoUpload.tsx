import React, { useState, useRef } from 'react'
import { Upload, Image as ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'

interface LogoUploadProps {
  onLogoChange: (logoUrl: string | null) => void
  currentLogo?: string | null
  aspectRatio?: 'square' | 'horizontal' | 'vertical'
  maxSize?: number // in MB
  className?: string
}

export const LogoUpload = ({ 
  onLogoChange, 
  currentLogo, 
  aspectRatio = 'horizontal',
  maxSize = 5,
  className = ''
}: LogoUploadProps) => {
  const { language } = useLanguage()
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    setError(null)

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(language === 'ar' ? 'يرجى اختيار ملف صورة صالح' : 'Please select a valid image file')
      return
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(language === 'ar' ? `حجم الملف يجب أن يكون أقل من ${maxSize} ميجابايت` : `File size must be less than ${maxSize} MB`)
      return
    }

    // Create preview URL
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      onLogoChange(result)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const removeLogo = () => {
    onLogoChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square': return 'aspect-square'
      case 'vertical': return 'aspect-[3/4]'
      case 'horizontal': 
      default: return 'aspect-[4/1]'
    }
  }

  return (
    <div className={`w-full ${className}`}>
      {currentLogo ? (
        <div className={`relative ${getAspectRatioClass()} w-full max-w-sm mx-auto`}>
          <img
            src={currentLogo}
            alt={language === 'ar' ? 'شعار المؤسسة' : 'Organization Logo'}
            className="w-full h-full object-contain rounded-lg border border-gray-200 bg-white"
          />
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={removeLogo}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          className={`
            ${getAspectRatioClass()} w-full max-w-sm mx-auto
            border-2 border-dashed rounded-lg transition-colors cursor-pointer
            ${isDragging 
              ? 'border-teal-500 bg-teal-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              {isDragging ? (
                <Upload className="w-6 h-6 text-teal-500" />
              ) : (
                <ImageIcon className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <p className={`text-sm font-medium text-gray-900 mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'رفع شعار المؤسسة' : 'Upload Organization Logo'}
            </p>
            <p className={`text-xs text-gray-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' 
                ? `PNG, JPG, SVG حتى ${maxSize} ميجابايت`
                : `PNG, JPG, SVG up to ${maxSize} MB`
              }
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className={`text-sm text-red-600 mt-2 ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
          {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  )
}
