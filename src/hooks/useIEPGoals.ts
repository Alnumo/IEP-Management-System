import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  IEPGoal, 
  IEPGoalObjective, 
  IEPProgressData, 
  CreateIEPGoalData, 
  UpdateIEPGoalData,
  IEPGoalFilters,
  GoalDomain,
  GoalStatus,
  ProgressStatus
} from '@/types/iep';
import { 
  IEPGoalCalculationService,
  ProgressCalculationResult,
  ObjectiveProgressResult,
  GoalAnalytics,
  MasteryPrediction
} from '@/services/iep-goal-calculations';
import { useToast } from '@/hooks/use-toast';

/**
 * IEP Goal Management Hook
 * خطاف إدارة أهداف البرنامج التعليمي الفردي
 * 
 * Comprehensive hook for managing IEP goals with advanced
 * progress calculations and analytics
 */

export interface IEPGoalStats {
  totalGoals: number;
  activeGoals: number;
  achievedGoals: number;
  modifiedGoals: number;
  discontinuedGoals: number;
  averageProgress: number;
  onTrackGoals: number;
  behindScheduleGoals: number;
  goalsNearingMastery: number;
  domainDistribution: Record<GoalDomain, number>;
}

export interface GoalProgressSummary {
  goalId: string;
  goalNumber: number;
  domain: GoalDomain;
  progressResult: ProgressCalculationResult;
  analytics: GoalAnalytics;
  masteryPrediction: MasteryPrediction;
  objectiveResults: ObjectiveProgressResult[];
}

export const useIEPGoals = (iepId?: string, filters?: IEPGoalFilters) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // =============================================================================
  // QUERY KEYS
  // =============================================================================

  const queryKeys = {
    all: ['iep-goals'] as const,
    lists: () => [...queryKeys.all, 'list'] as const,
    list: (iepId?: string, filters?: IEPGoalFilters) => 
      [...queryKeys.lists(), { iepId, filters }] as const,
    detail: (goalId: string) => [...queryKeys.all, 'detail', goalId] as const,
    progress: (goalId: string) => [...queryKeys.all, 'progress', goalId] as const,
    objectives: (goalId: string) => [...queryKeys.all, 'objectives', goalId] as const,
    analytics: (goalId: string) => [...queryKeys.all, 'analytics', goalId] as const,
  };

  // =============================================================================
  // DATA FETCHING QUERIES
  // =============================================================================

  const {
    data: goals = [],
    isLoading: goalsLoading,
    error: goalsError,
    refetch: refetchGoals
  } = useQuery({
    queryKey: queryKeys.list(iepId, filters),
    queryFn: async () => {
      // Mock API call - replace with actual API
      const response = await fetch(`/api/iep-goals?iepId=${iepId}&${new URLSearchParams(filters as Record<string, string>)}`);
      if (!response.ok) throw new Error('Failed to fetch IEP goals');
      return response.json() as Promise<IEPGoal[]>;
    },
    enabled: !!iepId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const {
    data: selectedGoal,
    isLoading: selectedGoalLoading,
    error: selectedGoalError
  } = useQuery({
    queryKey: queryKeys.detail(selectedGoalId!),
    queryFn: async () => {
      const response = await fetch(`/api/iep-goals/${selectedGoalId}`);
      if (!response.ok) throw new Error('Failed to fetch goal details');
      return response.json() as Promise<IEPGoal>;
    },
    enabled: !!selectedGoalId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: progressData = [],
    isLoading: progressLoading
  } = useQuery({
    queryKey: queryKeys.progress(selectedGoalId!),
    queryFn: async () => {
      const response = await fetch(`/api/iep-goals/${selectedGoalId}/progress`);
      if (!response.ok) throw new Error('Failed to fetch progress data');
      return response.json() as Promise<IEPProgressData[]>;
    },
    enabled: !!selectedGoalId,
    staleTime: 2 * 60 * 1000, // 2 minutes for progress data
  });

  const {
    data: objectives = [],
    isLoading: objectivesLoading
  } = useQuery({
    queryKey: queryKeys.objectives(selectedGoalId!),
    queryFn: async () => {
      const response = await fetch(`/api/iep-goals/${selectedGoalId}/objectives`);
      if (!response.ok) throw new Error('Failed to fetch objectives');
      return response.json() as Promise<IEPGoalObjective[]>;
    },
    enabled: !!selectedGoalId,
    staleTime: 5 * 60 * 1000,
  });

  // =============================================================================
  // MUTATIONS
  // =============================================================================

  const createGoalMutation = useMutation({
    mutationFn: async (goalData: CreateIEPGoalData) => {
      const response = await fetch('/api/iep-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      });
      if (!response.ok) throw new Error('Failed to create goal');
      return response.json() as Promise<IEPGoal>;
    },
    onSuccess: (newGoal) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      toast({
        title: 'Goal Created Successfully',
        description: `Goal ${newGoal.goal_number} has been added to the IEP.`,
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Create Goal',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ goalId, updates }: { goalId: string; updates: UpdateIEPGoalData }) => {
      const response = await fetch(`/api/iep-goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update goal');
      return response.json() as Promise<IEPGoal>;
    },
    onSuccess: (updatedGoal) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedGoal.id) });
      toast({
        title: 'Goal Updated Successfully',
        description: `Goal ${updatedGoal.goal_number} has been updated.`,
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Update Goal',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const response = await fetch(`/api/iep-goals/${goalId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete goal');
    },
    onSuccess: (_, goalId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.removeQueries({ queryKey: queryKeys.detail(goalId) });
      if (selectedGoalId === goalId) {
        setSelectedGoalId(null);
      }
      toast({
        title: 'Goal Deleted Successfully',
        description: 'The goal has been removed from the IEP.',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Delete Goal',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const addProgressDataMutation = useMutation({
    mutationFn: async ({ goalId, progressData }: { 
      goalId: string; 
      progressData: Omit<IEPProgressData, 'id' | 'goal_id'> 
    }) => {
      const response = await fetch(`/api/iep-goals/${goalId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progressData),
      });
      if (!response.ok) throw new Error('Failed to add progress data');
      return response.json() as Promise<IEPProgressData>;
    },
    onSuccess: (_, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progress(goalId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics(goalId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() }); // For updated stats
      toast({
        title: 'Progress Data Added',
        description: 'Progress data has been successfully recorded.',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Add Progress Data',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createObjectiveMutation = useMutation({
    mutationFn: async ({ goalId, objective }: { 
      goalId: string; 
      objective: Omit<IEPGoalObjective, 'id' | 'goal_id' | 'created_at' | 'updated_at'> 
    }) => {
      const response = await fetch(`/api/iep-goals/${goalId}/objectives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(objective),
      });
      if (!response.ok) throw new Error('Failed to create objective');
      return response.json() as Promise<IEPGoalObjective>;
    },
    onSuccess: (_, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives(goalId) });
      toast({
        title: 'Objective Created',
        description: 'New objective has been added to the goal.',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Create Objective',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // =============================================================================
  // CALCULATED DATA AND ANALYTICS
  // =============================================================================

  const goalStats = useMemo<IEPGoalStats>(() => {
    if (!goals.length) {
      return {
        totalGoals: 0,
        activeGoals: 0,
        achievedGoals: 0,
        modifiedGoals: 0,
        discontinuedGoals: 0,
        averageProgress: 0,
        onTrackGoals: 0,
        behindScheduleGoals: 0,
        goalsNearingMastery: 0,
        domainDistribution: {} as Record<GoalDomain, number>,
      };
    }

    const totalGoals = goals.length;
    const activeGoals = goals.filter(g => g.goal_status === 'active').length;
    const achievedGoals = goals.filter(g => g.goal_status === 'achieved').length;
    const modifiedGoals = goals.filter(g => g.goal_status === 'modified').length;
    const discontinuedGoals = goals.filter(g => g.goal_status === 'discontinued').length;

    const progressSum = goals.reduce((sum, goal) => sum + goal.current_progress_percentage, 0);
    const averageProgress = totalGoals > 0 ? Math.round(progressSum / totalGoals) : 0;

    const onTrackGoals = goals.filter(g => g.current_progress_percentage >= 70).length;
    const behindScheduleGoals = goals.filter(g => g.current_progress_percentage < 40).length;
    const goalsNearingMastery = goals.filter(g => g.current_progress_percentage >= 80).length;

    const domainDistribution = goals.reduce((acc, goal) => {
      acc[goal.domain] = (acc[goal.domain] || 0) + 1;
      return acc;
    }, {} as Record<GoalDomain, number>);

    return {
      totalGoals,
      activeGoals,
      achievedGoals,
      modifiedGoals,
      discontinuedGoals,
      averageProgress,
      onTrackGoals,
      behindScheduleGoals,
      goalsNearingMastery,
      domainDistribution,
    };
  }, [goals]);

  const goalProgressSummaries = useMemo<GoalProgressSummary[]>(() => {
    return goals.map(goal => {
      // For now, use empty progress data - in real implementation,
      // we would fetch progress data for each goal
      const goalProgressData: IEPProgressData[] = [];
      const goalObjectives: IEPGoalObjective[] = goal.objectives || [];

      const progressResult = IEPGoalCalculationService.calculateGoalProgress(goal, goalProgressData);
      const analytics = IEPGoalCalculationService.generateGoalAnalytics(goal, goalProgressData);
      const masteryPrediction = IEPGoalCalculationService.predictMastery(goal, goalProgressData);

      const objectiveResults = goalObjectives.map(objective => 
        IEPGoalCalculationService.calculateObjectiveProgress(objective, goalProgressData)
      );

      return {
        goalId: goal.id,
        goalNumber: goal.goal_number,
        domain: goal.domain,
        progressResult,
        analytics,
        masteryPrediction,
        objectiveResults,
      };
    });
  }, [goals]);

  const selectedGoalProgress = useMemo<ProgressCalculationResult | null>(() => {
    if (!selectedGoal || !progressData.length) return null;
    return IEPGoalCalculationService.calculateGoalProgress(selectedGoal, progressData);
  }, [selectedGoal, progressData]);

  const selectedGoalAnalytics = useMemo<GoalAnalytics | null>(() => {
    if (!selectedGoal || !progressData.length) return null;
    return IEPGoalCalculationService.generateGoalAnalytics(selectedGoal, progressData);
  }, [selectedGoal, progressData]);

  const selectedGoalMasteryPrediction = useMemo<MasteryPrediction | null>(() => {
    if (!selectedGoal || !progressData.length) return null;
    return IEPGoalCalculationService.predictMastery(selectedGoal, progressData);
  }, [selectedGoal, progressData]);

  const objectiveProgressResults = useMemo<ObjectiveProgressResult[]>(() => {
    if (!objectives.length || !progressData.length) return [];
    return objectives.map(objective => 
      IEPGoalCalculationService.calculateObjectiveProgress(objective, progressData)
    );
  }, [objectives, progressData]);

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  const getGoalsByDomain = useCallback((domain: GoalDomain): IEPGoal[] => {
    return goals.filter(goal => goal.domain === domain);
  }, [goals]);

  const getGoalsByStatus = useCallback((status: GoalStatus): IEPGoal[] => {
    return goals.filter(goal => goal.goal_status === status);
  }, [goals]);

  const getGoalsByProgress = useCallback((minProgress: number, maxProgress: number): IEPGoal[] => {
    return goals.filter(goal => 
      goal.current_progress_percentage >= minProgress && 
      goal.current_progress_percentage <= maxProgress
    );
  }, [goals]);

  const calculateAverageProgressByDomain = useCallback((domain: GoalDomain): number => {
    const domainGoals = getGoalsByDomain(domain);
    if (!domainGoals.length) return 0;
    
    const totalProgress = domainGoals.reduce((sum, goal) => sum + goal.current_progress_percentage, 0);
    return Math.round(totalProgress / domainGoals.length);
  }, [getGoalsByDomain]);

  const isGoalOnTrack = useCallback((goalId: string): boolean => {
    const summary = goalProgressSummaries.find(s => s.goalId === goalId);
    return summary?.progressResult.isOnTrack ?? false;
  }, [goalProgressSummaries]);

  const getRecommendedAction = useCallback((goalId: string): string => {
    const summary = goalProgressSummaries.find(s => s.goalId === goalId);
    return summary?.progressResult.recommendedAction ?? 'collect_more_data';
  }, [goalProgressSummaries]);

  // =============================================================================
  // ACTION FUNCTIONS
  // =============================================================================

  const createGoal = useCallback((goalData: CreateIEPGoalData) => {
    return createGoalMutation.mutateAsync(goalData);
  }, [createGoalMutation]);

  const updateGoal = useCallback((goalId: string, updates: UpdateIEPGoalData) => {
    return updateGoalMutation.mutateAsync({ goalId, updates });
  }, [updateGoalMutation]);

  const deleteGoal = useCallback((goalId: string) => {
    return deleteGoalMutation.mutateAsync(goalId);
  }, [deleteGoalMutation]);

  const addProgressData = useCallback((goalId: string, progressData: Omit<IEPProgressData, 'id' | 'goal_id'>) => {
    return addProgressDataMutation.mutateAsync({ goalId, progressData });
  }, [addProgressDataMutation]);

  const createObjective = useCallback((goalId: string, objective: Omit<IEPGoalObjective, 'id' | 'goal_id' | 'created_at' | 'updated_at'>) => {
    return createObjectiveMutation.mutateAsync({ goalId, objective });
  }, [createObjectiveMutation]);

  const selectGoal = useCallback((goalId: string | null) => {
    setSelectedGoalId(goalId);
  }, []);

  const refreshData = useCallback(() => {
    refetchGoals();
    if (selectedGoalId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(selectedGoalId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress(selectedGoalId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives(selectedGoalId) });
    }
  }, [refetchGoals, selectedGoalId, queryClient]);

  // =============================================================================
  // RETURN HOOK INTERFACE
  // =============================================================================

  return {
    // Data
    goals,
    goalStats,
    goalProgressSummaries,
    selectedGoal,
    selectedGoalProgress,
    selectedGoalAnalytics,
    selectedGoalMasteryPrediction,
    progressData,
    objectives,
    objectiveProgressResults,

    // Loading states
    goalsLoading,
    selectedGoalLoading,
    progressLoading,
    objectivesLoading,
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending,
    isAddingProgress: addProgressDataMutation.isPending,
    isCreatingObjective: createObjectiveMutation.isPending,

    // Error states
    goalsError,
    selectedGoalError,

    // Actions
    createGoal,
    updateGoal,
    deleteGoal,
    addProgressData,
    createObjective,
    selectGoal,
    refreshData,

    // Helper functions
    getGoalsByDomain,
    getGoalsByStatus,
    getGoalsByProgress,
    calculateAverageProgressByDomain,
    isGoalOnTrack,
    getRecommendedAction,

    // Selection state
    selectedGoalId,
  };
};

export default useIEPGoals;