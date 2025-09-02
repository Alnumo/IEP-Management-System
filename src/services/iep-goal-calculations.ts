import { 
  IEPGoal, 
  IEPGoalObjective, 
  IEPProgressData, 
  MeasurementMethod, 
  ProgressStatus,
  GoalStatus
} from '@/types/iep';

/**
 * Advanced IEP Goal Progress Calculation Service
 * حساب تقدم الأهداف التعليمية الفردية المتقدم
 * 
 * Implements IDEA 2024 compliant progress calculation algorithms
 * for comprehensive goal tracking and mastery determination
 */

// =============================================================================
// PROGRESS CALCULATION INTERFACES
// =============================================================================

export interface ProgressCalculationResult {
  currentProgress: number; // 0-100 percentage
  progressStatus: ProgressStatus;
  isOnTrack: boolean;
  projectedCompletionDate: Date | null;
  recommendedAction: RecommendedAction;
  confidenceLevel: number; // 0-100 confidence in calculation
  trendDirection: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  velocityPerWeek: number; // Rate of progress per week
}

export interface ObjectiveProgressResult {
  objectiveId: string;
  masteryLevel: number; // 0-100
  isMastered: boolean;
  masteryDate: Date | null;
  sessionsToMastery: number | null;
  consistencyScore: number; // How consistent the performance is
}

export interface GoalAnalytics {
  baselineToCurrentGain: number;
  percentOfGoalAchieved: number;
  expectedProgressByNow: number;
  progressVariance: number; // Difference from expected
  dataQualityScore: number; // Quality of collected data
  statisticalSignificance: number; // Confidence in progress
}

export interface MasteryPrediction {
  predictedMasteryDate: Date | null;
  probabilityOfMastery: number; // 0-100
  requiredSessionsRemaining: number | null;
  riskFactors: string[];
  strengthFactors: string[];
}

export type RecommendedAction = 
  | 'continue_current_intervention'
  | 'increase_intervention_intensity'
  | 'modify_intervention_strategy'
  | 'consider_goal_revision'
  | 'prepare_for_mastery'
  | 'collect_more_data'
  | 'schedule_team_meeting';

// =============================================================================
// MAIN CALCULATION SERVICE
// =============================================================================

export class IEPGoalCalculationService {
  
  /**
   * Calculate comprehensive progress for an IEP goal
   * حساب التقدم الشامل لهدف البرنامج التعليمي الفردي
   */
  static calculateGoalProgress(
    goal: IEPGoal, 
    progressData: IEPProgressData[]
  ): ProgressCalculationResult {
    if (!progressData.length) {
      return this.generateNoDataResult();
    }

    const sortedData = progressData.sort((a, b) => 
      new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime()
    );

    const currentProgress = this.calculateCurrentProgressPercentage(goal, progressData);
    const trendDirection = this.calculateTrendDirection(sortedData, goal.measurement_method);
    const velocityPerWeek = this.calculateProgressVelocity(sortedData, goal.measurement_method);
    const isOnTrack = this.isGoalOnTrack(goal, currentProgress, sortedData);
    const projectedCompletionDate = this.projectCompletionDate(
      goal, currentProgress, velocityPerWeek
    );

    const progressStatus = this.determineProgressStatus(currentProgress, goal);
    const recommendedAction = this.determineRecommendedAction(
      currentProgress, trendDirection, isOnTrack, goal
    );
    const confidenceLevel = this.calculateConfidenceLevel(progressData, goal);

    return {
      currentProgress,
      progressStatus,
      isOnTrack,
      projectedCompletionDate,
      recommendedAction,
      confidenceLevel,
      trendDirection,
      velocityPerWeek
    };
  }

  /**
   * Calculate objective-level progress and mastery
   * حساب تقدم الأهداف الفرعية والإتقان
   */
  static calculateObjectiveProgress(
    objective: IEPGoalObjective,
    progressData: IEPProgressData[]
  ): ObjectiveProgressResult {
    const objectiveData = progressData.filter(data => data.objective_id === objective.id);
    
    if (!objectiveData.length) {
      return {
        objectiveId: objective.id,
        masteryLevel: 0,
        isMastered: false,
        masteryDate: null,
        sessionsToMastery: null,
        consistencyScore: 0
      };
    }

    const masteryLevel = this.calculateObjectiveMasteryLevel(objective, objectiveData);
    const consistencyScore = this.calculateConsistencyScore(objectiveData);
    const isMastered = this.isObjectiveMastered(objective, objectiveData, consistencyScore);
    const masteryDate = isMastered ? this.determineMasteryDate(objectiveData, objective) : null;
    const sessionsToMastery = isMastered ? null : this.estimateSessionsToMastery(
      objective, objectiveData, masteryLevel
    );

    return {
      objectiveId: objective.id,
      masteryLevel,
      isMastered,
      masteryDate,
      sessionsToMastery,
      consistencyScore
    };
  }

  /**
   * Generate comprehensive goal analytics
   * إنشاء تحليلات شاملة للهدف
   */
  static generateGoalAnalytics(
    goal: IEPGoal,
    progressData: IEPProgressData[]
  ): GoalAnalytics {
    if (!progressData.length) {
      return this.generateEmptyAnalytics();
    }

    const sortedData = progressData.sort((a, b) => 
      new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime()
    );

    const baselineValue = this.extractBaselineValue(goal);
    const currentValue = this.getCurrentValue(sortedData, goal.measurement_method);
    const targetValue = this.getTargetValue(goal);

    const baselineToCurrentGain = currentValue - baselineValue;
    const percentOfGoalAchieved = Math.min(100, (baselineToCurrentGain / (targetValue - baselineValue)) * 100);
    const expectedProgressByNow = this.calculateExpectedProgress(goal, new Date());
    const progressVariance = percentOfGoalAchieved - expectedProgressByNow;
    const dataQualityScore = this.assessDataQuality(progressData);
    const statisticalSignificance = this.calculateStatisticalSignificance(progressData);

    return {
      baselineToCurrentGain,
      percentOfGoalAchieved: Math.max(0, percentOfGoalAchieved),
      expectedProgressByNow,
      progressVariance,
      dataQualityScore,
      statisticalSignificance
    };
  }

  /**
   * Predict mastery timeline and probability
   * توقع جدول الإتقان والاحتمالية
   */
  static predictMastery(
    goal: IEPGoal,
    progressData: IEPProgressData[]
  ): MasteryPrediction {
    if (progressData.length < 3) {
      return {
        predictedMasteryDate: null,
        probabilityOfMastery: 0,
        requiredSessionsRemaining: null,
        riskFactors: ['Insufficient data for prediction'],
        strengthFactors: []
      };
    }

    const currentProgress = this.calculateCurrentProgressPercentage(goal, progressData);
    const velocity = this.calculateProgressVelocity(progressData, goal.measurement_method);
    const consistency = this.calculateConsistencyScore(progressData);
    
    const remainingProgress = 100 - currentProgress;
    const weeksToMastery = velocity > 0 ? remainingProgress / velocity : null;
    
    const predictedMasteryDate = weeksToMastery ? 
      new Date(Date.now() + weeksToMastery * 7 * 24 * 60 * 60 * 1000) : null;

    const probabilityOfMastery = this.calculateMasteryProbability(
      currentProgress, velocity, consistency, goal
    );

    const sessionsPerWeek = this.estimateSessionsPerWeek(goal);
    const requiredSessionsRemaining = weeksToMastery && sessionsPerWeek ? 
      Math.ceil(weeksToMastery * sessionsPerWeek) : null;

    const riskFactors = this.identifyRiskFactors(goal, progressData, velocity, consistency);
    const strengthFactors = this.identifyStrengthFactors(goal, progressData, velocity, consistency);

    return {
      predictedMasteryDate,
      probabilityOfMastery,
      requiredSessionsRemaining,
      riskFactors,
      strengthFactors
    };
  }

  // =============================================================================
  // PRIVATE CALCULATION METHODS
  // =============================================================================

  private static calculateCurrentProgressPercentage(
    goal: IEPGoal, 
    progressData: IEPProgressData[]
  ): number {
    const latestData = progressData[progressData.length - 1];
    if (!latestData) return 0;

    const currentValue = this.extractProgressValue(latestData, goal.measurement_method);
    const targetValue = this.getTargetValue(goal);
    const baselineValue = this.extractBaselineValue(goal);

    if (targetValue === baselineValue) return 0;

    const progressMade = currentValue - baselineValue;
    const totalProgressNeeded = targetValue - baselineValue;
    
    return Math.min(100, Math.max(0, (progressMade / totalProgressNeeded) * 100));
  }

  private static calculateTrendDirection(
    sortedData: IEPProgressData[], 
    method: MeasurementMethod
  ): 'improving' | 'stable' | 'declining' | 'insufficient_data' {
    if (sortedData.length < 3) return 'insufficient_data';

    const recentData = sortedData.slice(-5); // Last 5 data points
    const values = recentData.map(data => this.extractProgressValue(data, method));
    
    let improvingCount = 0;
    let decliningCount = 0;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) improvingCount++;
      else if (values[i] < values[i - 1]) decliningCount++;
    }

    if (improvingCount > decliningCount) return 'improving';
    if (decliningCount > improvingCount) return 'declining';
    return 'stable';
  }

  private static calculateProgressVelocity(
    progressData: IEPProgressData[], 
    method: MeasurementMethod
  ): number {
    if (progressData.length < 2) return 0;

    const sortedData = progressData.sort((a, b) => 
      new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime()
    );

    const firstPoint = sortedData[0];
    const lastPoint = sortedData[sortedData.length - 1];
    
    const firstValue = this.extractProgressValue(firstPoint, method);
    const lastValue = this.extractProgressValue(lastPoint, method);
    
    const timeDifferenceMs = new Date(lastPoint.collection_date).getTime() - 
                           new Date(firstPoint.collection_date).getTime();
    const timeDifferenceWeeks = timeDifferenceMs / (7 * 24 * 60 * 60 * 1000);
    
    if (timeDifferenceWeeks === 0) return 0;
    
    return (lastValue - firstValue) / timeDifferenceWeeks;
  }

  private static isGoalOnTrack(
    goal: IEPGoal, 
    currentProgress: number, 
    progressData: IEPProgressData[]
  ): boolean {
    const expectedProgress = this.calculateExpectedProgress(goal, new Date());
    const tolerance = 15; // 15% tolerance
    
    return currentProgress >= (expectedProgress - tolerance);
  }

  private static calculateExpectedProgress(goal: IEPGoal, currentDate: Date): number {
    const startDate = new Date(goal.created_at);
    const endDate = new Date(goal.target_completion_date);
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = currentDate.getTime() - startDate.getTime();
    
    if (totalDuration <= 0) return 0;
    
    return Math.min(100, (elapsedDuration / totalDuration) * 100);
  }

  private static projectCompletionDate(
    goal: IEPGoal, 
    currentProgress: number, 
    velocityPerWeek: number
  ): Date | null {
    if (velocityPerWeek <= 0 || currentProgress >= 100) return null;

    const remainingProgress = 100 - currentProgress;
    const weeksToCompletion = remainingProgress / velocityPerWeek;
    
    return new Date(Date.now() + weeksToCompletion * 7 * 24 * 60 * 60 * 1000);
  }

  private static determineProgressStatus(
    currentProgress: number, 
    goal: IEPGoal
  ): ProgressStatus {
    if (currentProgress >= 100) return 'mastered';
    if (currentProgress >= 80) return 'progressing';
    if (currentProgress >= 40) return 'progressing';
    if (currentProgress >= 10) return 'introduced';
    return 'not_started';
  }

  private static determineRecommendedAction(
    currentProgress: number,
    trendDirection: string,
    isOnTrack: boolean,
    goal: IEPGoal
  ): RecommendedAction {
    if (currentProgress >= 90) return 'prepare_for_mastery';
    if (!isOnTrack && trendDirection === 'declining') return 'schedule_team_meeting';
    if (!isOnTrack && trendDirection === 'stable') return 'modify_intervention_strategy';
    if (currentProgress < 10) return 'increase_intervention_intensity';
    if (trendDirection === 'insufficient_data') return 'collect_more_data';
    return 'continue_current_intervention';
  }

  private static calculateConfidenceLevel(
    progressData: IEPProgressData[], 
    goal: IEPGoal
  ): number {
    let confidence = 50; // Base confidence
    
    // More data points = higher confidence
    if (progressData.length >= 10) confidence += 30;
    else if (progressData.length >= 5) confidence += 20;
    else if (progressData.length >= 3) confidence += 10;
    
    // Consistent measurement method = higher confidence
    const consistentMethod = progressData.every(data => 
      this.extractProgressValue(data, goal.measurement_method) !== null
    );
    if (consistentMethod) confidence += 20;
    
    return Math.min(100, confidence);
  }

  private static extractProgressValue(
    data: IEPProgressData, 
    method: MeasurementMethod
  ): number {
    switch (method) {
      case 'frequency':
        return data.frequency_count || 0;
      case 'percentage':
        return data.percentage_achieved || 0;
      case 'duration':
        return data.duration_minutes || 0;
      case 'trials':
        return data.trials_successful || 0;
      default:
        return data.score_achieved || 0;
    }
  }

  private static getTargetValue(goal: IEPGoal): number {
    return goal.target_percentage || 
           goal.target_frequency || 
           goal.target_duration_minutes || 
           goal.target_accuracy_percentage || 
           100;
  }

  private static extractBaselineValue(goal: IEPGoal): number {
    // This would need to be extracted from goal baseline data
    // For now, return 0 as baseline
    return 0;
  }

  private static getCurrentValue(
    progressData: IEPProgressData[], 
    method: MeasurementMethod
  ): number {
    const latest = progressData[progressData.length - 1];
    return this.extractProgressValue(latest, method);
  }

  private static calculateObjectiveMasteryLevel(
    objective: IEPGoalObjective,
    progressData: IEPProgressData[]
  ): number {
    if (!progressData.length) return 0;

    const latestData = progressData[progressData.length - 1];
    const targetValue = objective.target_percentage || objective.target_frequency || 100;
    const currentValue = latestData.percentage_achieved || latestData.frequency_count || 0;

    return Math.min(100, (currentValue / targetValue) * 100);
  }

  private static calculateConsistencyScore(progressData: IEPProgressData[]): number {
    if (progressData.length < 3) return 0;

    const values = progressData.slice(-5).map(data => 
      data.percentage_achieved || data.frequency_count || 0
    );

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Higher consistency = lower standard deviation relative to mean
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;
    return Math.max(0, 100 - (coefficientOfVariation * 100));
  }

  private static isObjectiveMastered(
    objective: IEPGoalObjective,
    progressData: IEPProgressData[],
    consistencyScore: number
  ): boolean {
    if (objective.is_mastered) return true;
    
    const masteryLevel = this.calculateObjectiveMasteryLevel(objective, progressData);
    return masteryLevel >= 80 && consistencyScore >= 70;
  }

  private static determineMasteryDate(
    progressData: IEPProgressData[],
    objective: IEPGoalObjective
  ): Date | null {
    if (objective.mastery_date) return new Date(objective.mastery_date);
    
    // Find first date where mastery criteria were met
    const masteryThreshold = 80;
    for (const data of progressData.reverse()) {
      const value = data.percentage_achieved || data.frequency_count || 0;
      const target = objective.target_percentage || objective.target_frequency || 100;
      if ((value / target) * 100 >= masteryThreshold) {
        return new Date(data.collection_date);
      }
    }
    
    return null;
  }

  private static estimateSessionsToMastery(
    objective: IEPGoalObjective,
    progressData: IEPProgressData[],
    currentMasteryLevel: number
  ): number | null {
    const remainingProgress = 100 - currentMasteryLevel;
    if (remainingProgress <= 0) return 0;
    
    const averageGainPerSession = this.calculateAverageGainPerSession(progressData);
    if (averageGainPerSession <= 0) return null;
    
    return Math.ceil(remainingProgress / averageGainPerSession);
  }

  private static calculateAverageGainPerSession(progressData: IEPProgressData[]): number {
    if (progressData.length < 2) return 0;
    
    const gains: number[] = [];
    for (let i = 1; i < progressData.length; i++) {
      const currentValue = progressData[i].percentage_achieved || 0;
      const previousValue = progressData[i - 1].percentage_achieved || 0;
      gains.push(currentValue - previousValue);
    }
    
    return gains.reduce((sum, gain) => sum + gain, 0) / gains.length;
  }

  private static generateNoDataResult(): ProgressCalculationResult {
    return {
      currentProgress: 0,
      progressStatus: 'not_started',
      isOnTrack: false,
      projectedCompletionDate: null,
      recommendedAction: 'collect_more_data',
      confidenceLevel: 0,
      trendDirection: 'insufficient_data',
      velocityPerWeek: 0
    };
  }

  private static generateEmptyAnalytics(): GoalAnalytics {
    return {
      baselineToCurrentGain: 0,
      percentOfGoalAchieved: 0,
      expectedProgressByNow: 0,
      progressVariance: 0,
      dataQualityScore: 0,
      statisticalSignificance: 0
    };
  }

  private static calculateMasteryProbability(
    currentProgress: number,
    velocity: number,
    consistency: number,
    goal: IEPGoal
  ): number {
    if (currentProgress >= 100) return 100;
    
    let probability = currentProgress * 0.6; // Base on current progress
    
    if (velocity > 0) probability += Math.min(30, velocity * 2); // Positive velocity
    if (consistency > 70) probability += 20; // High consistency
    
    // Time factor - less time remaining reduces probability
    const timeRemaining = this.getTimeRemainingDays(goal);
    if (timeRemaining < 30) probability *= 0.8;
    if (timeRemaining < 7) probability *= 0.5;
    
    return Math.min(100, Math.max(0, probability));
  }

  private static getTimeRemainingDays(goal: IEPGoal): number {
    const now = new Date();
    const endDate = new Date(goal.target_completion_date);
    return Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  }

  private static identifyRiskFactors(
    goal: IEPGoal,
    progressData: IEPProgressData[],
    velocity: number,
    consistency: number
  ): string[] {
    const risks: string[] = [];
    
    if (velocity <= 0) risks.push('No positive progress trend');
    if (consistency < 50) risks.push('Inconsistent performance');
    if (progressData.length < 5) risks.push('Insufficient data collection');
    if (this.getTimeRemainingDays(goal) < 30) risks.push('Limited time remaining');
    
    return risks;
  }

  private static identifyStrengthFactors(
    goal: IEPGoal,
    progressData: IEPProgressData[],
    velocity: number,
    consistency: number
  ): string[] {
    const strengths: string[] = [];
    
    if (velocity > 2) strengths.push('Strong positive progress trend');
    if (consistency > 80) strengths.push('Highly consistent performance');
    if (progressData.length >= 10) strengths.push('Comprehensive data collection');
    
    return strengths;
  }

  private static estimateSessionsPerWeek(goal: IEPGoal): number {
    // Parse service frequency to estimate sessions per week
    // This would need more sophisticated parsing in real implementation
    return 3; // Default assumption
  }

  private static assessDataQuality(progressData: IEPProgressData[]): number {
    let quality = 100;
    
    // Check for missing data points
    const expectedDataPoints = this.calculateExpectedDataPoints(progressData);
    const actualDataPoints = progressData.length;
    const completeness = Math.min(100, (actualDataPoints / expectedDataPoints) * 100);
    
    // Check for data consistency
    const hasConsistentMeasurements = progressData.every(data => 
      data.score_achieved !== null || data.percentage_achieved !== null
    );
    
    quality = (completeness * 0.7) + (hasConsistentMeasurements ? 30 : 0);
    
    return Math.max(0, Math.min(100, quality));
  }

  private static calculateExpectedDataPoints(progressData: IEPProgressData[]): number {
    if (!progressData.length) return 1;
    
    const firstDate = new Date(progressData[0].collection_date);
    const lastDate = new Date(progressData[progressData.length - 1].collection_date);
    const daysDifference = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000));
    
    // Assume data should be collected 2-3 times per week
    return Math.ceil(daysDifference / 3);
  }

  private static calculateStatisticalSignificance(progressData: IEPProgressData[]): number {
    if (progressData.length < 3) return 0;
    
    // Simple trend analysis - more sophisticated statistics would be needed in practice
    const values = progressData.map(data => data.percentage_achieved || 0);
    const n = values.length;
    
    if (n < 3) return 0;
    
    // Calculate simple linear regression slope
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Convert slope to significance score (simplified)
    return Math.min(100, Math.abs(slope) * 10);
  }
}

export default IEPGoalCalculationService;