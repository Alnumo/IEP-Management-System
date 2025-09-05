export interface TimeSeriesDataPoint {
  timestamp: Date
  value: number
  metadata?: Record<string, any>
}

export interface ForecastResult {
  forecasts: {
    timestamp: Date
    predicted_value: number
    confidence_lower: number
    confidence_upper: number
  }[]
  accuracy_metrics: {
    mae: number // Mean Absolute Error
    rmse: number // Root Mean Square Error
    mape: number // Mean Absolute Percentage Error
  }
  seasonal_patterns: {
    trend: 'increasing' | 'decreasing' | 'stable'
    seasonality: 'weekly' | 'monthly' | 'quarterly' | 'none'
    seasonal_strength: number
  }
  model_metadata: {
    algorithm: string
    training_period: string
    forecast_horizon: number
    confidence_level: number
  }
}

export interface CapacityForecast {
  forecast_date: Date
  predicted_capacity: number
  predicted_utilization: number
  confidence_interval: {
    lower: number
    upper: number
  }
  capacity_warnings: {
    level: 'info' | 'warning' | 'critical'
    message: string
  }[]
}

export interface WorkloadForecast {
  therapist_id?: string
  forecast_period: 'weekly' | 'monthly' | 'quarterly'
  predicted_session_count: number
  predicted_hours: number
  utilization_rate: number
  recommendations: string[]
}

export class ForecastingAlgorithms {
  /**
   * Simple Moving Average forecasting
   */
  static simpleMovingAverage(
    data: TimeSeriesDataPoint[],
    window: number,
    forecastPeriods: number
  ): number[] {
    if (data.length < window) {
      throw new Error(`Insufficient data points. Need at least ${window}, got ${data.length}`)
    }

    const values = data.map(d => d.value)
    const forecasts: number[] = []

    // Calculate the last moving average
    const lastMA = values.slice(-window).reduce((sum, val) => sum + val, 0) / window

    // Simple approach: use last MA for all forecast periods
    for (let i = 0; i < forecastPeriods; i++) {
      forecasts.push(lastMA)
    }

    return forecasts
  }

  /**
   * Exponential Smoothing forecasting
   */
  static exponentialSmoothing(
    data: TimeSeriesDataPoint[],
    alpha: number = 0.3,
    forecastPeriods: number = 1
  ): number[] {
    if (data.length === 0) {
      throw new Error('No data provided for forecasting')
    }

    const values = data.map(d => d.value)
    let smoothedValue = values[0]

    // Calculate smoothed values
    for (let i = 1; i < values.length; i++) {
      smoothedValue = alpha * values[i] + (1 - alpha) * smoothedValue
    }

    // Forecast future periods
    const forecasts: number[] = []
    for (let i = 0; i < forecastPeriods; i++) {
      forecasts.push(smoothedValue)
    }

    return forecasts
  }

  /**
   * Linear trend forecasting
   */
  static linearTrend(
    data: TimeSeriesDataPoint[],
    forecastPeriods: number
  ): number[] {
    if (data.length < 2) {
      throw new Error('Need at least 2 data points for trend analysis')
    }

    const values = data.map(d => d.value)
    const n = values.length
    const x = Array.from({ length: n }, (_, i) => i + 1)

    // Calculate linear regression coefficients
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = values.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Generate forecasts
    const forecasts: number[] = []
    for (let i = 1; i <= forecastPeriods; i++) {
      const forecast = intercept + slope * (n + i)
      forecasts.push(Math.max(0, forecast)) // Ensure non-negative forecasts
    }

    return forecasts
  }

  /**
   * Seasonal decomposition and forecasting
   */
  static seasonalForecast(
    data: TimeSeriesDataPoint[],
    seasonLength: number,
    forecastPeriods: number
  ): ForecastResult {
    if (data.length < seasonLength * 2) {
      throw new Error(`Need at least ${seasonLength * 2} data points for seasonal analysis`)
    }

    const values = data.map(d => d.value)
    
    // Decompose into trend and seasonal components
    const { trend, seasonal, residual } = this.decomposeTimeSeries(values, seasonLength)
    
    // Forecast trend using linear regression
    const trendForecasts = this.linearTrend(
      trend.map((val, i) => ({ timestamp: data[i].timestamp, value: val })),
      forecastPeriods
    )

    // Apply seasonal pattern
    const forecasts = trendForecasts.map((trendValue, i) => {
      const seasonalIndex = (trend.length + i) % seasonLength
      const seasonalValue = seasonal[seasonalIndex] || 1
      const predictedValue = trendValue * seasonalValue

      const timestamp = new Date(data[data.length - 1].timestamp)
      timestamp.setDate(timestamp.getDate() + i + 1)

      return {
        timestamp,
        predicted_value: Math.max(0, predictedValue),
        confidence_lower: Math.max(0, predictedValue * 0.9),
        confidence_upper: predictedValue * 1.1
      }
    })

    // Calculate accuracy metrics
    const accuracy_metrics = this.calculateAccuracyMetrics(values, trend, seasonal)

    // Detect seasonal patterns
    const seasonal_patterns = this.analyzeSeasonalPatterns(values, seasonal, trend)

    return {
      forecasts,
      accuracy_metrics,
      seasonal_patterns,
      model_metadata: {
        algorithm: 'seasonal_decomposition',
        training_period: `${data.length} periods`,
        forecast_horizon: forecastPeriods,
        confidence_level: 0.9
      }
    }
  }

  /**
   * Forecast center capacity utilization
   */
  static forecastCapacity(
    historicalCapacity: TimeSeriesDataPoint[],
    forecastDays: number = 30
  ): CapacityForecast[] {
    if (historicalCapacity.length < 7) {
      throw new Error('Need at least 7 days of historical data for capacity forecasting')
    }

    const forecasts: CapacityForecast[] = []
    
    // Use seasonal forecasting with weekly patterns
    const weeklyForecast = this.seasonalForecast(historicalCapacity, 7, forecastDays)

    weeklyForecast.forecasts.forEach(forecast => {
      const predicted_capacity = forecast.predicted_value
      const predicted_utilization = Math.min(predicted_capacity / 100, 1.0) // Assuming capacity is out of 100

      // Generate capacity warnings
      const capacity_warnings = this.generateCapacityWarnings(predicted_utilization)

      forecasts.push({
        forecast_date: forecast.timestamp,
        predicted_capacity,
        predicted_utilization,
        confidence_interval: {
          lower: forecast.confidence_lower,
          upper: forecast.confidence_upper
        },
        capacity_warnings
      })
    })

    return forecasts
  }

  /**
   * Forecast therapist workload
   */
  static forecastWorkload(
    sessionHistory: TimeSeriesDataPoint[],
    therapistId?: string,
    period: 'weekly' | 'monthly' | 'quarterly' = 'monthly'
  ): WorkloadForecast {
    const periodDays = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 90
    const forecastResult = this.seasonalForecast(sessionHistory, 7, periodDays)

    const predicted_session_count = forecastResult.forecasts.reduce(
      (sum, f) => sum + f.predicted_value, 0
    )
    
    // Assume average session is 1 hour
    const predicted_hours = predicted_session_count * 1.0
    
    // Calculate utilization based on standard work hours
    const standardHours = period === 'weekly' ? 40 : period === 'monthly' ? 160 : 480
    const utilization_rate = Math.min(predicted_hours / standardHours, 1.0)

    // Generate recommendations
    const recommendations = this.generateWorkloadRecommendations(utilization_rate, predicted_hours)

    return {
      therapist_id: therapistId,
      forecast_period: period,
      predicted_session_count: Math.round(predicted_session_count),
      predicted_hours: Math.round(predicted_hours),
      utilization_rate,
      recommendations
    }
  }

  /**
   * Forecast operational metrics (enrollment, revenue, staffing)
   */
  static forecastOperationalMetrics(
    enrollmentData: TimeSeriesDataPoint[],
    revenueData: TimeSeriesDataPoint[],
    forecastPeriods: number = 12
  ): {
    enrollment: ForecastResult
    revenue: ForecastResult
    staffing_needs: {
      current_ratio: number
      predicted_ratio: number
      additional_staff_needed: number
    }
  } {
    // Forecast enrollment with monthly seasonality
    const enrollment = this.seasonalForecast(enrollmentData, 12, forecastPeriods)
    
    // Forecast revenue with quarterly patterns
    const revenue = this.seasonalForecast(revenueData, 4, forecastPeriods)

    // Calculate staffing needs based on enrollment forecasts
    const avgEnrollment = enrollment.forecasts.reduce((sum, f) => sum + f.predicted_value, 0) / forecastPeriods
    const currentAvgEnrollment = enrollmentData.slice(-12).reduce((sum, d) => sum + d.value, 0) / 12
    
    const current_ratio = 15 // Assume 1 staff per 15 students currently
    const predicted_ratio = current_ratio
    const additional_staff_needed = Math.max(0, Math.ceil((avgEnrollment - currentAvgEnrollment) / predicted_ratio))

    return {
      enrollment,
      revenue,
      staffing_needs: {
        current_ratio,
        predicted_ratio,
        additional_staff_needed
      }
    }
  }

  /**
   * Decompose time series into trend, seasonal, and residual components
   */
  private static decomposeTimeSeries(
    values: number[],
    seasonLength: number
  ): {
    trend: number[]
    seasonal: number[]
    residual: number[]
  } {
    const n = values.length
    const trend: number[] = []
    const seasonal: number[] = []
    const residual: number[] = []

    // Calculate trend using centered moving average
    const halfSeason = Math.floor(seasonLength / 2)
    
    for (let i = 0; i < n; i++) {
      if (i < halfSeason || i >= n - halfSeason) {
        trend.push(values[i]) // Use actual value for edges
      } else {
        const windowSum = values.slice(i - halfSeason, i + halfSeason + 1)
          .reduce((sum, val) => sum + val, 0)
        trend.push(windowSum / seasonLength)
      }
    }

    // Calculate seasonal component
    const seasonalAverages: number[] = Array(seasonLength).fill(0)
    const seasonalCounts: number[] = Array(seasonLength).fill(0)

    for (let i = 0; i < n; i++) {
      const seasonIndex = i % seasonLength
      const detrended = values[i] - trend[i]
      seasonalAverages[seasonIndex] += detrended
      seasonalCounts[seasonIndex]++
    }

    // Average seasonal components
    for (let i = 0; i < seasonLength; i++) {
      if (seasonalCounts[i] > 0) {
        seasonalAverages[i] /= seasonalCounts[i]
      }
    }

    // Apply seasonal pattern to all data points
    for (let i = 0; i < n; i++) {
      const seasonIndex = i % seasonLength
      seasonal.push(seasonalAverages[seasonIndex])
      residual.push(values[i] - trend[i] - seasonal[i])
    }

    return { trend, seasonal, residual }
  }

  /**
   * Calculate forecast accuracy metrics
   */
  private static calculateAccuracyMetrics(
    actual: number[],
    trend: number[],
    seasonal: number[]
  ): {
    mae: number
    rmse: number
    mape: number
  } {
    const n = Math.min(actual.length, trend.length, seasonal.length)
    let sumAbsError = 0
    let sumSquaredError = 0
    let sumPercentError = 0

    for (let i = 0; i < n; i++) {
      const predicted = trend[i] + seasonal[i]
      const error = actual[i] - predicted
      const absError = Math.abs(error)
      const percentError = actual[i] !== 0 ? Math.abs(error / actual[i]) : 0

      sumAbsError += absError
      sumSquaredError += error * error
      sumPercentError += percentError
    }

    return {
      mae: sumAbsError / n,
      rmse: Math.sqrt(sumSquaredError / n),
      mape: (sumPercentError / n) * 100
    }
  }

  /**
   * Analyze seasonal patterns in the data
   */
  private static analyzeSeasonalPatterns(
    values: number[],
    seasonal: number[],
    trend: number[]
  ): {
    trend: 'increasing' | 'decreasing' | 'stable'
    seasonality: 'weekly' | 'monthly' | 'quarterly' | 'none'
    seasonal_strength: number
  } {
    // Analyze trend
    const firstHalf = trend.slice(0, Math.floor(trend.length / 2))
    const secondHalf = trend.slice(Math.floor(trend.length / 2))
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
    
    let trendDirection: 'increasing' | 'decreasing' | 'stable'
    const trendDiff = (secondAvg - firstAvg) / firstAvg
    
    if (trendDiff > 0.05) trendDirection = 'increasing'
    else if (trendDiff < -0.05) trendDirection = 'decreasing'
    else trendDirection = 'stable'

    // Analyze seasonality strength
    const seasonalVariance = seasonal.reduce((sum, val) => {
      const mean = seasonal.reduce((s, v) => s + v, 0) / seasonal.length
      return sum + Math.pow(val - mean, 2)
    }, 0) / seasonal.length

    const totalVariance = values.reduce((sum, val) => {
      const mean = values.reduce((s, v) => s + v, 0) / values.length
      return sum + Math.pow(val - mean, 2)
    }, 0) / values.length

    const seasonal_strength = totalVariance > 0 ? seasonalVariance / totalVariance : 0

    // Determine seasonality type based on data length and patterns
    let seasonality: 'weekly' | 'monthly' | 'quarterly' | 'none'
    if (seasonal_strength < 0.1) {
      seasonality = 'none'
    } else if (values.length >= 28) {
      seasonality = 'monthly'
    } else if (values.length >= 12) {
      seasonality = 'quarterly'
    } else {
      seasonality = 'weekly'
    }

    return {
      trend: trendDirection,
      seasonality,
      seasonal_strength
    }
  }

  /**
   * Generate capacity warnings based on utilization
   */
  private static generateCapacityWarnings(utilization: number): {
    level: 'info' | 'warning' | 'critical'
    message: string
  }[] {
    const warnings = []

    if (utilization > 0.9) {
      warnings.push({
        level: 'critical' as const,
        message: 'Critical: Capacity utilization above 90%. Immediate capacity expansion needed.'
      })
    } else if (utilization > 0.8) {
      warnings.push({
        level: 'warning' as const,
        message: 'Warning: High capacity utilization. Consider scheduling optimization.'
      })
    } else if (utilization > 0.7) {
      warnings.push({
        level: 'info' as const,
        message: 'Info: Moderate capacity utilization. Monitor trends closely.'
      })
    } else {
      warnings.push({
        level: 'info' as const,
        message: 'Info: Capacity utilization within normal range.'
      })
    }

    return warnings
  }

  /**
   * Generate workload recommendations
   */
  private static generateWorkloadRecommendations(
    utilizationRate: number,
    predictedHours: number
  ): string[] {
    const recommendations = []

    if (utilizationRate > 0.9) {
      recommendations.push('Consider redistributing sessions to balance workload')
      recommendations.push('Evaluate need for additional therapy staff')
      recommendations.push('Review session efficiency and duration')
    } else if (utilizationRate > 0.8) {
      recommendations.push('Monitor workload closely for signs of overutilization')
      recommendations.push('Consider flexible scheduling options')
    } else if (utilizationRate < 0.5) {
      recommendations.push('Low utilization detected - consider additional case assignments')
      recommendations.push('Evaluate scheduling optimization opportunities')
    } else {
      recommendations.push('Workload within optimal range')
      recommendations.push('Continue current scheduling patterns')
    }

    if (predictedHours > 200) {
      recommendations.push('High predicted hours - ensure adequate breaks and recovery time')
    }

    return recommendations
  }

  /**
   * Validate time series data quality
   */
  static validateTimeSeriesData(data: TimeSeriesDataPoint[]): {
    isValid: boolean
    issues: string[]
    recommendations: string[]
  } {
    const issues = []
    const recommendations = []

    if (data.length === 0) {
      issues.push('No data points provided')
      return { isValid: false, issues, recommendations }
    }

    if (data.length < 7) {
      issues.push('Insufficient data points for reliable forecasting')
      recommendations.push('Collect at least 7 data points for basic forecasting')
    }

    // Check for missing or null values
    const missingValues = data.filter(d => d.value === null || d.value === undefined || isNaN(d.value)).length
    if (missingValues > 0) {
      issues.push(`${missingValues} data points have missing or invalid values`)
      recommendations.push('Clean or interpolate missing values before forecasting')
    }

    // Check temporal ordering
    const isOrdered = data.every((d, i) => 
      i === 0 || d.timestamp >= data[i - 1].timestamp
    )
    if (!isOrdered) {
      issues.push('Data points are not in chronological order')
      recommendations.push('Sort data by timestamp before forecasting')
    }

    // Check for extreme outliers
    const values = data.map(d => d.value).filter(v => !isNaN(v))
    if (values.length > 0) {
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length
      const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length)
      
      const outliers = values.filter(v => Math.abs(v - mean) > 3 * std).length
      if (outliers > values.length * 0.1) {
        issues.push(`High number of outliers detected (${outliers} points)`)
        recommendations.push('Review and potentially clean extreme outliers')
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    }
  }
}