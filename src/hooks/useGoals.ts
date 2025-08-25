// Goal Management Hook
import { useState, useEffect } from 'react'
import { TherapyGoal, CreateTherapyGoal, GoalProgressData, GoalReviewNote } from '@/types/therapy-data'

export interface GoalFilters {
  student_id?: string
  therapy_type?: 'aba' | 'speech' | 'occupational' | 'physical'
  status?: 'active' | 'achieved' | 'discontinued' | 'modified'
  priority?: 'high' | 'medium' | 'low'
  date_from?: string
  date_to?: string
}

export interface GoalStats {
  total: number
  active: number
  achieved: number
  discontinued: number
  modified: number
  high_priority: number
  medium_priority: number
  low_priority: number
  avg_progress_percentage: number
}

export function useGoals() {
  const [goals, setGoals] = useState<TherapyGoal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mock data for development
  const mockGoals: TherapyGoal[] = [
    {
      id: '1',
      student_id: 'student-1',
      therapist_id: 'therapist-1',
      therapy_type: 'aba',
      goal_category: 'Communication',
      goal_description: 'Increase verbal requests for preferred items',
      target_behavior: 'Use 2-word phrases to request preferred items',
      baseline_measurement: {
        measurement_type: 'frequency',
        baseline_value: 2,
        baseline_date: '2024-01-15',
        measurement_unit: 'requests per session',
        measurement_context: 'Structured teaching session'
      },
      target_criteria: {
        target_value: 15,
        target_unit: 'requests per session',
        success_criteria: 'Use 2-word phrases for 15 requests per session across 3 consecutive sessions',
        consecutive_sessions_required: 3,
        generalization_required: true,
        maintenance_period_days: 30
      },
      priority_level: 'high',
      goal_status: 'active',
      start_date: '2024-01-15',
      target_date: '2024-06-15',
      data_collection_method: 'Frequency count',
      measurement_frequency: 'Every session',
      progress_data: [
        {
          id: 'progress-1',
          measurement_date: '2024-01-20',
          measured_value: 3,
          measurement_context: 'Structured teaching',
          notes: 'Good progress, using gestures with vocalizations',
          recorded_by: 'therapist-1',
          trend_direction: 'improving'
        },
        {
          id: 'progress-2',
          measurement_date: '2024-02-01',
          measured_value: 7,
          measurement_context: 'Structured teaching',
          notes: 'Clear improvement in verbal requests',
          recorded_by: 'therapist-1',
          trend_direction: 'improving'
        }
      ],
      strategies_interventions: ['Visual prompts', 'Verbal modeling', 'Reinforcement schedule'],
      materials_resources: ['Picture cards', 'Preferred items', 'Data collection sheets'],
      environmental_supports: ['Quiet setting', 'Minimize distractions'],
      review_notes: [],
      mastery_criteria_met: false,
      generalization_settings: ['Home', 'Classroom'],
      maintenance_plan: 'Weekly probes after achieving mastery',
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2024-02-01T15:30:00Z',
      created_by: 'therapist-1'
    },
    {
      id: '2',
      student_id: 'student-1',
      therapist_id: 'therapist-2',
      therapy_type: 'speech',
      goal_category: 'Articulation',
      goal_description: 'Improve /r/ sound production in words',
      target_behavior: 'Correctly produce /r/ sound in initial position words',
      baseline_measurement: {
        measurement_type: 'percentage',
        baseline_value: 25,
        baseline_date: '2024-01-10',
        measurement_unit: 'percent correct',
        measurement_context: '20 words containing initial /r/'
      },
      target_criteria: {
        target_value: 80,
        target_unit: 'percent correct',
        success_criteria: '80% accuracy across 3 consecutive sessions',
        consecutive_sessions_required: 3,
        generalization_required: true,
        maintenance_period_days: 30
      },
      priority_level: 'medium',
      goal_status: 'active',
      start_date: '2024-01-10',
      target_date: '2024-05-10',
      data_collection_method: 'Percentage correct',
      measurement_frequency: 'Weekly',
      progress_data: [
        {
          id: 'progress-3',
          measurement_date: '2024-01-17',
          measured_value: 35,
          measurement_context: '20 words containing initial /r/',
          notes: 'Shows awareness of sound, needs visual cues',
          recorded_by: 'therapist-2',
          trend_direction: 'improving'
        }
      ],
      strategies_interventions: ['Visual cues', 'Tactile feedback', 'Mirror work'],
      materials_resources: ['Articulation cards', 'Mirror', 'Recording device'],
      environmental_supports: ['Quiet therapy room', 'Good lighting'],
      review_notes: [],
      mastery_criteria_met: false,
      generalization_settings: ['Classroom', 'Home'],
      maintenance_plan: 'Monthly probes after achieving mastery',
      created_at: '2024-01-10T10:00:00Z',
      updated_at: '2024-01-17T14:00:00Z',
      created_by: 'therapist-2'
    }
  ]

  useEffect(() => {
    // Initialize with mock data
    setGoals(mockGoals)
  }, [])

  const fetchGoals = async (filters?: GoalFilters) => {
    setLoading(true)
    setError(null)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      let filteredGoals = [...mockGoals]
      
      if (filters) {
        if (filters.student_id) {
          filteredGoals = filteredGoals.filter(goal => goal.student_id === filters.student_id)
        }
        if (filters.therapy_type) {
          filteredGoals = filteredGoals.filter(goal => goal.therapy_type === filters.therapy_type)
        }
        if (filters.status) {
          filteredGoals = filteredGoals.filter(goal => goal.goal_status === filters.status)
        }
        if (filters.priority) {
          filteredGoals = filteredGoals.filter(goal => goal.priority_level === filters.priority)
        }
      }
      
      setGoals(filteredGoals)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goals')
    } finally {
      setLoading(false)
    }
  }

  const createGoal = async (goalData: CreateTherapyGoal): Promise<TherapyGoal> => {
    setLoading(true)
    setError(null)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newGoal: TherapyGoal = {
        ...goalData,
        id: `goal-${Date.now()}`,
        progress_data: [],
        review_notes: [],
        mastery_criteria_met: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'current-user'
      }
      
      setGoals(prev => [...prev, newGoal])
      return newGoal
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateGoal = async (id: string, updates: Partial<TherapyGoal>): Promise<TherapyGoal> => {
    setLoading(true)
    setError(null)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const updatedGoal = {
        ...goals.find(g => g.id === id)!,
        ...updates,
        updated_at: new Date().toISOString()
      }
      
      setGoals(prev => prev.map(g => g.id === id ? updatedGoal : g))
      return updatedGoal
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteGoal = async (id: string): Promise<void> => {
    setLoading(true)
    setError(null)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setGoals(prev => prev.filter(g => g.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const addProgressData = async (goalId: string, progressData: Omit<GoalProgressData, 'id'>): Promise<void> => {
    setLoading(true)
    setError(null)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const newProgressData: GoalProgressData = {
        ...progressData,
        id: `progress-${Date.now()}`
      }
      
      setGoals(prev => prev.map(goal => 
        goal.id === goalId 
          ? { 
              ...goal, 
              progress_data: [...goal.progress_data, newProgressData],
              updated_at: new Date().toISOString()
            }
          : goal
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add progress data')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const addReviewNote = async (goalId: string, reviewNote: Omit<GoalReviewNote, 'id'>): Promise<void> => {
    setLoading(true)
    setError(null)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const newReviewNote: GoalReviewNote = {
        ...reviewNote,
        id: `review-${Date.now()}`
      }
      
      setGoals(prev => prev.map(goal => 
        goal.id === goalId 
          ? { 
              ...goal, 
              review_notes: [...goal.review_notes, newReviewNote],
              updated_at: new Date().toISOString()
            }
          : goal
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add review note')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getGoalStats = (filteredGoals = goals): GoalStats => {
    const stats: GoalStats = {
      total: filteredGoals.length,
      active: filteredGoals.filter(g => g.goal_status === 'active').length,
      achieved: filteredGoals.filter(g => g.goal_status === 'achieved').length,
      discontinued: filteredGoals.filter(g => g.goal_status === 'discontinued').length,
      modified: filteredGoals.filter(g => g.goal_status === 'modified').length,
      high_priority: filteredGoals.filter(g => g.priority_level === 'high').length,
      medium_priority: filteredGoals.filter(g => g.priority_level === 'medium').length,
      low_priority: filteredGoals.filter(g => g.priority_level === 'low').length,
      avg_progress_percentage: 0
    }

    // Calculate average progress percentage
    if (filteredGoals.length > 0) {
      const totalProgress = filteredGoals.reduce((sum, goal) => {
        const latestProgress = goal.progress_data[goal.progress_data.length - 1]
        if (latestProgress && goal.target_criteria.target_value > 0) {
          return sum + (latestProgress.measured_value / goal.target_criteria.target_value * 100)
        }
        return sum
      }, 0)
      stats.avg_progress_percentage = Math.round(totalProgress / filteredGoals.length)
    }

    return stats
  }

  const getGoalProgress = (goal: TherapyGoal): number => {
    const latestProgress = goal.progress_data[goal.progress_data.length - 1]
    if (!latestProgress || goal.target_criteria.target_value === 0) return 0
    
    return Math.min(100, Math.round((latestProgress.measured_value / goal.target_criteria.target_value) * 100))
  }

  const getGoalById = (id: string): TherapyGoal | undefined => {
    return goals.find(goal => goal.id === id)
  }

  return {
    goals,
    loading,
    error,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    addProgressData,
    addReviewNote,
    getGoalStats,
    getGoalProgress,
    getGoalById
  }
}