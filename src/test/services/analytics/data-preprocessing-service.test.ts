import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DataPreprocessingService, type MLTrainingData } from '@/services/analytics/data-preprocessing-service'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

const mockSupabaseQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis()
}

describe('DataPreprocessingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(supabase.from as any).mockReturnValue(mockSupabaseQuery)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('extractTrainingData', () => {
    it('should extract training data successfully', async () => {
      const mockData: MLTrainingData[] = [
        {
          student_id: '123',
          enrollment_date: '2024-01-01',
          medical_records: { diagnosis_codes: ['F80.1'] },
          total_sessions: 10,
          attendance_rate: 0.8,
          avg_assessment_score: 0.7,
          assessment_variety: 3,
          avg_session_hours: 1.0,
          goals_achieved: 5,
          dropout_events: 0,
          difficulty_level: 'intermediate',
          duration_weeks: 12,
          sessions_per_week: 2
        }
      ]

      mockSupabaseQuery.order.mockResolvedValueOnce({
        data: mockData,
        error: null
      })

      const result = await DataPreprocessingService.extractTrainingData()

      expect(supabase.from).toHaveBeenCalledWith('ml_training_data')
      expect(mockSupabaseQuery.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseQuery.order).toHaveBeenCalledWith('enrollment_date', { ascending: false })
      expect(result).toEqual(mockData)
    })

    it('should handle database errors', async () => {
      mockSupabaseQuery.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      })

      await expect(DataPreprocessingService.extractTrainingData()).rejects.toThrow(
        'Failed to extract ML training data'
      )
    })
  })

  describe('extractStudentData', () => {
    it('should extract single student data successfully', async () => {
      const mockData: MLTrainingData = {
        student_id: '123',
        enrollment_date: '2024-01-01',
        medical_records: { diagnosis_codes: ['F80.1'] },
        total_sessions: 10,
        attendance_rate: 0.8,
        avg_assessment_score: 0.7,
        assessment_variety: 3,
        avg_session_hours: 1.0,
        goals_achieved: 5,
        dropout_events: 0,
        difficulty_level: 'intermediate',
        duration_weeks: 12,
        sessions_per_week: 2
      }

      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: mockData,
        error: null
      })

      const result = await DataPreprocessingService.extractStudentData('123')

      expect(supabase.from).toHaveBeenCalledWith('ml_training_data')
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('student_id', '123')
      expect(result).toEqual(mockData)
    })

    it('should return null for non-existent student', async () => {
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' } // Not found error
      })

      const result = await DataPreprocessingService.extractStudentData('nonexistent')

      expect(result).toBeNull()
    })

    it('should handle other database errors', async () => {
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: 'OTHER' }
      })

      await expect(DataPreprocessingService.extractStudentData('123')).rejects.toThrow(
        'Failed to extract data for student 123'
      )
    })
  })

  describe('preprocessFeatures', () => {
    it('should preprocess features successfully', async () => {
      const rawData: MLTrainingData[] = [
        {
          student_id: '123',
          enrollment_date: '2024-01-01',
          medical_records: { diagnosis_codes: ['F80.1'], medications: [], allergies: [] },
          total_sessions: 10,
          attendance_rate: 0.8,
          avg_assessment_score: 0.7,
          assessment_variety: 3,
          avg_session_hours: 1.0,
          goals_achieved: 5,
          dropout_events: 0,
          difficulty_level: 'intermediate',
          duration_weeks: 12,
          sessions_per_week: 2
        }
      ]

      const result = await DataPreprocessingService.preprocessFeatures(rawData)

      expect(result).toHaveLength(1)
      expect(result[0].student_id).toBe('123')
      expect(result[0].normalized_data).toHaveLength(11) // Expected feature count
      expect(result[0].feature_names).toBeDefined()
      expect(result[0].demographic_features).toBeDefined()
      expect(result[0].therapy_features).toBeDefined()
      expect(result[0].progress_features).toBeDefined()
      expect(result[0].engagement_features).toBeDefined()
    })

    it('should return empty array for empty input', async () => {
      const result = await DataPreprocessingService.preprocessFeatures([])
      expect(result).toEqual([])
    })

    it('should handle medical records correctly', async () => {
      const rawData: MLTrainingData[] = [
        {
          student_id: '123',
          enrollment_date: '2024-01-01',
          medical_records: {
            diagnosis_codes: ['F80.1', 'F84.0'],
            medications: ['med1'],
            allergies: ['allergy1', 'allergy2']
          },
          total_sessions: 10,
          attendance_rate: 0.8,
          avg_assessment_score: 0.7,
          assessment_variety: 3,
          avg_session_hours: 1.0,
          goals_achieved: 5,
          dropout_events: 0,
          difficulty_level: 'complex',
          duration_weeks: 12,
          sessions_per_week: 2
        }
      ]

      const result = await DataPreprocessingService.preprocessFeatures(rawData)

      // Medical complexity should be calculated based on multiple factors
      expect(result[0].normalized_data).toBeDefined()
      // Complexity should be higher due to multiple diagnosis codes, medications, and allergies
      const medicalComplexityFeature = result[0].normalized_data[10] // Last feature is medical complexity
      expect(medicalComplexityFeature).toBeGreaterThan(0)
    })
  })

  describe('preprocessSingleStudent', () => {
    it('should preprocess single student successfully', async () => {
      const mockStudentData: MLTrainingData = {
        student_id: '123',
        enrollment_date: '2024-01-01',
        medical_records: { diagnosis_codes: ['F80.1'] },
        total_sessions: 10,
        attendance_rate: 0.8,
        avg_assessment_score: 0.7,
        assessment_variety: 3,
        avg_session_hours: 1.0,
        goals_achieved: 5,
        dropout_events: 0,
        difficulty_level: 'intermediate',
        duration_weeks: 12,
        sessions_per_week: 2
      }

      const mockRecentData: MLTrainingData[] = [mockStudentData]

      // Mock the service methods
      vi.spyOn(DataPreprocessingService, 'extractStudentData')
        .mockResolvedValueOnce(mockStudentData)
      vi.spyOn(DataPreprocessingService, 'extractTrainingData')
        .mockResolvedValueOnce(mockRecentData)

      const result = await DataPreprocessingService.preprocessSingleStudent('123')

      expect(result).toBeDefined()
      expect(result!.student_id).toBe('123')
      expect(result!.normalized_data).toBeDefined()
    })

    it('should return null for non-existent student', async () => {
      vi.spyOn(DataPreprocessingService, 'extractStudentData')
        .mockResolvedValueOnce(null)

      const result = await DataPreprocessingService.preprocessSingleStudent('nonexistent')

      expect(result).toBeNull()
    })

    it('should throw error when insufficient context data', async () => {
      const mockStudentData: MLTrainingData = {
        student_id: '123',
        enrollment_date: '2024-01-01',
        medical_records: { diagnosis_codes: ['F80.1'] },
        total_sessions: 10,
        attendance_rate: 0.8,
        avg_assessment_score: 0.7,
        assessment_variety: 3,
        avg_session_hours: 1.0,
        goals_achieved: 5,
        dropout_events: 0,
        difficulty_level: 'intermediate',
        duration_weeks: 12,
        sessions_per_week: 2
      }

      vi.spyOn(DataPreprocessingService, 'extractStudentData')
        .mockResolvedValueOnce(mockStudentData)
      vi.spyOn(DataPreprocessingService, 'extractTrainingData')
        .mockResolvedValueOnce([]) // No context data

      await expect(DataPreprocessingService.preprocessSingleStudent('123'))
        .rejects.toThrow('Insufficient data for feature normalization')
    })
  })

  describe('validatePreprocessedData', () => {
    it('should validate good data successfully', () => {
      const goodFeatures = [
        {
          student_id: '123',
          demographic_features: [0.5, 0.3],
          therapy_features: [0.7, 0.8, 0.6],
          progress_features: [0.9, 0.7, 0.8, 0.6],
          engagement_features: [0.8, 0.5],
          normalized_data: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.5, 0.3],
          feature_names: Array(11).fill('feature')
        }
      ]

      const result = DataPreprocessingService.validatePreprocessedData(goodFeatures)

      expect(result.isValid).toBe(true)
      expect(result.issues).toEqual([])
    })

    it('should detect NaN values', () => {
      const badFeatures = [
        {
          student_id: '123',
          demographic_features: [0.5, 0.3],
          therapy_features: [0.7, 0.8, 0.6],
          progress_features: [0.9, 0.7, 0.8, 0.6],
          engagement_features: [0.8, 0.5],
          normalized_data: [NaN, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.5, 0.3],
          feature_names: Array(11).fill('feature')
        }
      ]

      const result = DataPreprocessingService.validatePreprocessedData(badFeatures)

      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Student 123: Contains NaN values')
    })

    it('should detect infinite values', () => {
      const badFeatures = [
        {
          student_id: '123',
          demographic_features: [0.5, 0.3],
          therapy_features: [0.7, 0.8, 0.6],
          progress_features: [0.9, 0.7, 0.8, 0.6],
          engagement_features: [0.8, 0.5],
          normalized_data: [Infinity, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.5, 0.3],
          feature_names: Array(11).fill('feature')
        }
      ]

      const result = DataPreprocessingService.validatePreprocessedData(badFeatures)

      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Student 123: Contains infinite values')
    })

    it('should detect feature count mismatch', () => {
      const badFeatures = [
        {
          student_id: '123',
          demographic_features: [0.5, 0.3],
          therapy_features: [0.7, 0.8, 0.6],
          progress_features: [0.9, 0.7, 0.8, 0.6],
          engagement_features: [0.8, 0.5],
          normalized_data: [0.1, 0.2, 0.3], // Too few features
          feature_names: Array(11).fill('feature')
        }
      ]

      const result = DataPreprocessingService.validatePreprocessedData(badFeatures)

      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Student 123: Feature count mismatch')
    })

    it('should handle empty input', () => {
      const result = DataPreprocessingService.validatePreprocessedData([])

      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('No preprocessed features found')
    })
  })

  describe('feature calculation methods', () => {
    it('should calculate medical complexity correctly', () => {
      // Test via preprocessFeatures since calculateMedicalComplexityScore is private
      const testData: MLTrainingData[] = [
        {
          student_id: '123',
          enrollment_date: '2024-01-01',
          medical_records: {
            diagnosis_codes: ['F80.1', 'F84.0', 'F90.0'], // 3 diagnoses
            medications: ['med1', 'med2'], // 2 medications
            allergies: ['allergy1'] // 1 allergy
          },
          total_sessions: 10,
          attendance_rate: 0.8,
          avg_assessment_score: 0.7,
          assessment_variety: 3,
          avg_session_hours: 1.0,
          goals_achieved: 5,
          dropout_events: 0,
          difficulty_level: 'complex',
          duration_weeks: 12,
          sessions_per_week: 2
        }
      ]

      return DataPreprocessingService.preprocessFeatures(testData).then(result => {
        expect(result).toHaveLength(1)
        // Medical complexity should be higher for this complex case
        const medicalComplexity = result[0].normalized_data[10]
        expect(medicalComplexity).toBeGreaterThan(0.5)
        expect(medicalComplexity).toBeLessThanOrEqual(1.0)
      })
    })

    it('should handle null medical records', () => {
      const testData: MLTrainingData[] = [
        {
          student_id: '123',
          enrollment_date: '2024-01-01',
          medical_records: null,
          total_sessions: 10,
          attendance_rate: 0.8,
          avg_assessment_score: 0.7,
          assessment_variety: 3,
          avg_session_hours: 1.0,
          goals_achieved: 5,
          dropout_events: 0,
          difficulty_level: 'beginner',
          duration_weeks: 12,
          sessions_per_week: 2
        }
      ]

      return DataPreprocessingService.preprocessFeatures(testData).then(result => {
        expect(result).toHaveLength(1)
        // Medical complexity should be 0 for null records
        const medicalComplexity = result[0].normalized_data[10]
        expect(medicalComplexity).toBe(0)
      })
    })
  })

  describe('difficulty level encoding', () => {
    it('should encode difficulty levels correctly', () => {
      const testCases = [
        { difficulty: 'beginner', expected: 0.2 },
        { difficulty: 'intermediate', expected: 0.5 },
        { difficulty: 'advanced', expected: 0.8 },
        { difficulty: 'complex', expected: 1.0 },
        { difficulty: 'unknown', expected: 0.5 }
      ]

      const testData: MLTrainingData[] = testCases.map(tc => ({
        student_id: `student-${tc.difficulty}`,
        enrollment_date: '2024-01-01',
        medical_records: { diagnosis_codes: ['F80.1'] },
        total_sessions: 10,
        attendance_rate: 0.8,
        avg_assessment_score: 0.7,
        assessment_variety: 3,
        avg_session_hours: 1.0,
        goals_achieved: 5,
        dropout_events: 0,
        difficulty_level: tc.difficulty,
        duration_weeks: 12,
        sessions_per_week: 2
      }))

      return DataPreprocessingService.preprocessFeatures(testData).then(result => {
        expect(result).toHaveLength(testCases.length)
        
        result.forEach((processed, index) => {
          // Difficulty level is encoded in therapy features (index 0)
          const encodedDifficulty = processed.therapy_features[0]
          expect(encodedDifficulty).toBeCloseTo(testCases[index].expected, 1)
        })
      })
    })
  })
})