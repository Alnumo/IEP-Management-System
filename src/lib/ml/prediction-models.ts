import * as tf from '@tensorflow/tfjs'
import { TrainingDataset } from '@/services/analytics/model-training-pipeline'

export interface ModelPrediction {
  prediction: number
  confidence: number
  confidenceInterval: {
    lower: number
    upper: number
  }
  riskFactors?: string[]
  clinicalExplanations?: {
    ar: string
    en: string
  }
}

export interface ModelPerformanceMetrics {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  auc: number
  lossHistory: number[]
  validationLoss: number[]
}

export abstract class BasePredictionModel {
  protected model: tf.Sequential | null = null
  protected modelVersion: string = '1.0.0'
  protected featureCount: number = 0
  protected isLoaded: boolean = false

  abstract getModelType(): 'therapy_outcome' | 'risk_assessment' | 'operational_forecast'
  abstract buildArchitecture(): tf.Sequential
  abstract preprocessInput(features: number[]): tf.Tensor2D
  abstract postprocessOutput(output: tf.Tensor): ModelPrediction

  /**
   * Initialize and build the model architecture
   */
  async initialize(featureCount: number): Promise<void> {
    this.featureCount = featureCount
    this.model = this.buildArchitecture()
    this.isLoaded = true
    console.log(`${this.getModelType()} model initialized with ${featureCount} features`)
  }

  /**
   * Train the model with provided dataset
   */
  async train(
    dataset: TrainingDataset,
    config: {
      epochs: number
      batchSize: number
      validationSplit: number
      learningRate: number
    } = {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      learningRate: 0.001
    }
  ): Promise<ModelPerformanceMetrics> {
    if (!this.model) {
      throw new Error('Model must be initialized before training')
    }

    console.log(`Training ${this.getModelType()} model...`)

    // Prepare tensors
    const features = tf.tensor2d(dataset.features)
    const labels = tf.tensor2d(dataset.labels.map(l => [l]))

    // Configure optimizer
    this.model.compile({
      optimizer: tf.train.adam(config.learningRate),
      loss: 'meanSquaredError',
      metrics: ['accuracy', 'precision', 'recall']
    })

    // Train model
    const history = await this.model.fit(features, labels, {
      epochs: config.epochs,
      batchSize: config.batchSize,
      validationSplit: config.validationSplit,
      verbose: 1,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, val_loss=${logs?.val_loss?.toFixed(4)}`)
          }
        }
      }
    })

    // Calculate performance metrics
    const metrics = await this.calculatePerformanceMetrics(features, labels, history)

    // Clean up tensors
    features.dispose()
    labels.dispose()

    console.log(`Training completed. Accuracy: ${metrics.accuracy.toFixed(3)}`)
    return metrics
  }

  /**
   * Make prediction for a single student
   */
  async predict(features: number[]): Promise<ModelPrediction> {
    if (!this.model || !this.isLoaded) {
      throw new Error('Model must be loaded before making predictions')
    }

    if (features.length !== this.featureCount) {
      throw new Error(`Feature count mismatch: expected ${this.featureCount}, got ${features.length}`)
    }

    const inputTensor = this.preprocessInput(features)
    const outputTensor = this.model.predict(inputTensor) as tf.Tensor

    const prediction = this.postprocessOutput(outputTensor)

    // Clean up tensors
    inputTensor.dispose()
    outputTensor.dispose()

    return prediction
  }

  /**
   * Make batch predictions
   */
  async batchPredict(featuresArray: number[][]): Promise<ModelPrediction[]> {
    if (!this.model || !this.isLoaded) {
      throw new Error('Model must be loaded before making predictions')
    }

    const predictions: ModelPrediction[] = []

    // Process in batches to manage memory
    const batchSize = 100
    for (let i = 0; i < featuresArray.length; i += batchSize) {
      const batch = featuresArray.slice(i, i + batchSize)
      const batchTensor = tf.tensor2d(batch)
      const outputTensor = this.model.predict(batchTensor) as tf.Tensor

      const batchPredictions = await this.processBatchOutput(outputTensor, batch.length)
      predictions.push(...batchPredictions)

      // Clean up tensors
      batchTensor.dispose()
      outputTensor.dispose()
    }

    return predictions
  }

  /**
   * Save model to storage
   */
  async saveModel(path: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save')
    }

    await this.model.save(`localstorage://${path}`)
    console.log(`Model saved to ${path}`)
  }

  /**
   * Load model from storage
   */
  async loadModel(path: string, featureCount: number): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(`localstorage://${path}`) as tf.Sequential
      this.featureCount = featureCount
      this.isLoaded = true
      console.log(`Model loaded from ${path}`)
    } catch (error) {
      throw new Error(`Failed to load model: ${error}`)
    }
  }

  /**
   * Get model summary
   */
  getModelSummary(): string {
    if (!this.model) {
      return 'Model not initialized'
    }

    return this.model.summary()
  }

  /**
   * Dispose of model resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose()
      this.model = null
      this.isLoaded = false
    }
  }

  /**
   * Calculate comprehensive performance metrics
   */
  protected async calculatePerformanceMetrics(
    features: tf.Tensor2D,
    labels: tf.Tensor2D,
    history: tf.History
  ): Promise<ModelPerformanceMetrics> {
    if (!this.model) {
      throw new Error('Model not available for evaluation')
    }

    const predictions = this.model.predict(features) as tf.Tensor2D
    
    // Calculate accuracy
    const accuracy = await this.calculateAccuracy(predictions, labels)
    
    // Calculate precision, recall, F1
    const { precision, recall, f1Score } = await this.calculateClassificationMetrics(predictions, labels)
    
    // Calculate AUC
    const auc = await this.calculateAUC(predictions, labels)

    const lossHistory = history.history.loss as number[]
    const validationLoss = history.history.val_loss as number[]

    predictions.dispose()

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      auc,
      lossHistory,
      validationLoss
    }
  }

  /**
   * Calculate accuracy metric
   */
  protected async calculateAccuracy(predictions: tf.Tensor2D, labels: tf.Tensor2D): Promise<number> {
    const binaryPreds = tf.cast(tf.greater(predictions, 0.5), 'float32')
    const binaryLabels = tf.cast(tf.greater(labels, 0.5), 'float32')
    const accuracy = tf.mean(tf.cast(tf.equal(binaryPreds, binaryLabels), 'float32'))
    
    const accuracyValue = await accuracy.data()
    
    binaryPreds.dispose()
    binaryLabels.dispose()
    accuracy.dispose()
    
    return accuracyValue[0]
  }

  /**
   * Calculate precision, recall, and F1 score
   */
  protected async calculateClassificationMetrics(
    predictions: tf.Tensor2D,
    labels: tf.Tensor2D
  ): Promise<{ precision: number; recall: number; f1Score: number }> {
    const threshold = 0.5
    const binaryPreds = tf.cast(tf.greater(predictions, threshold), 'float32')
    const binaryLabels = tf.cast(tf.greater(labels, threshold), 'float32')

    // True Positives, False Positives, False Negatives
    const tp = tf.sum(tf.mul(binaryPreds, binaryLabels))
    const fp = tf.sum(tf.mul(binaryPreds, tf.sub(1, binaryLabels)))
    const fn = tf.sum(tf.mul(tf.sub(1, binaryPreds), binaryLabels))

    const precision = tf.div(tp, tf.add(tp, fp))
    const recall = tf.div(tp, tf.add(tp, fn))
    const f1Score = tf.div(tf.mul(2, tf.mul(precision, recall)), tf.add(precision, recall))

    const [precisionValue, recallValue, f1Value] = await Promise.all([
      precision.data(),
      recall.data(),
      f1Score.data()
    ])

    // Clean up tensors
    binaryPreds.dispose()
    binaryLabels.dispose()
    tp.dispose()
    fp.dispose()
    fn.dispose()
    precision.dispose()
    recall.dispose()
    f1Score.dispose()

    return {
      precision: precisionValue[0] || 0,
      recall: recallValue[0] || 0,
      f1Score: f1Value[0] || 0
    }
  }

  /**
   * Calculate Area Under Curve (AUC) metric
   */
  protected async calculateAUC(predictions: tf.Tensor2D, labels: tf.Tensor2D): Promise<number> {
    // Simplified AUC calculation using trapezoidal rule
    const predValues = await predictions.data()
    const labelValues = await labels.data()

    const pairs = Array.from({ length: predValues.length }, (_, i) => ({
      pred: predValues[i],
      label: labelValues[i]
    })).sort((a, b) => b.pred - a.pred)

    let tpr = 0, fpr = 0, auc = 0
    const totalPos = pairs.filter(p => p.label > 0.5).length
    const totalNeg = pairs.length - totalPos

    if (totalPos === 0 || totalNeg === 0) return 0.5

    let prevFpr = 0
    for (const pair of pairs) {
      if (pair.label > 0.5) {
        tpr += 1 / totalPos
      } else {
        fpr += 1 / totalNeg
        auc += (fpr - prevFpr) * tpr
        prevFpr = fpr
      }
    }

    return Math.max(0, Math.min(1, auc))
  }

  /**
   * Process batch output tensor into predictions array
   */
  protected async processBatchOutput(outputTensor: tf.Tensor, batchSize: number): Promise<ModelPrediction[]> {
    const outputData = await outputTensor.data()
    const predictions: ModelPrediction[] = []

    for (let i = 0; i < batchSize; i++) {
      const prediction = outputData[i]
      predictions.push({
        prediction,
        confidence: Math.abs(prediction - 0.5) * 2, // Simple confidence based on distance from threshold
        confidenceInterval: {
          lower: Math.max(0, prediction - 0.1),
          upper: Math.min(1, prediction + 0.1)
        }
      })
    }

    return predictions
  }
}

/**
 * Therapy Outcome Prediction Model
 * Predicts success rates and goal achievement timelines
 */
export class TherapyOutcomePredictionModel extends BasePredictionModel {
  getModelType(): 'therapy_outcome' {
    return 'therapy_outcome'
  }

  buildArchitecture(): tf.Sequential {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [this.featureCount],
          units: 128,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid'
        })
      ]
    })

    return model
  }

  preprocessInput(features: number[]): tf.Tensor2D {
    return tf.tensor2d([features])
  }

  postprocessOutput(output: tf.Tensor): ModelPrediction {
    const prediction = output.dataSync()[0]
    const confidence = Math.abs(prediction - 0.5) * 2

    // Generate risk factors based on prediction
    const riskFactors: string[] = []
    if (prediction < 0.4) {
      riskFactors.push('Low therapy engagement', 'Inconsistent attendance', 'Limited progress on assessments')
    } else if (prediction < 0.7) {
      riskFactors.push('Moderate therapy challenges', 'Variable session outcomes')
    }

    return {
      prediction,
      confidence,
      confidenceInterval: {
        lower: Math.max(0, prediction - 0.1),
        upper: Math.min(1, prediction + 0.1)
      },
      riskFactors,
      clinicalExplanations: {
        ar: this.generateArabicExplanation(prediction, confidence),
        en: this.generateEnglishExplanation(prediction, confidence)
      }
    }
  }

  private generateArabicExplanation(prediction: number, confidence: number): string {
    if (prediction > 0.7) {
      return `احتمالية نجاح العلاج عالية (${(prediction * 100).toFixed(0)}%). نسبة الثقة: ${(confidence * 100).toFixed(0)}%.`
    } else if (prediction > 0.4) {
      return `احتمالية نجاح العلاج متوسطة (${(prediction * 100).toFixed(0)}%). قد تحتاج خطة العلاج إلى تعديل.`
    } else {
      return `احتمالية نجاح العلاج منخفضة (${(prediction * 100).toFixed(0)}%). يُنصح بمراجعة خطة العلاج وتكثيف المتابعة.`
    }
  }

  private generateEnglishExplanation(prediction: number, confidence: number): string {
    if (prediction > 0.7) {
      return `High therapy success probability (${(prediction * 100).toFixed(0)}%). Confidence: ${(confidence * 100).toFixed(0)}%.`
    } else if (prediction > 0.4) {
      return `Moderate therapy success probability (${(prediction * 100).toFixed(0)}%). Consider plan adjustments.`
    } else {
      return `Low therapy success probability (${(prediction * 100).toFixed(0)}%). Recommend therapy plan review and increased monitoring.`
    }
  }
}

/**
 * Risk Assessment Model
 * Identifies at-risk students for dropout or plan failure
 */
export class RiskAssessmentModel extends BasePredictionModel {
  getModelType(): 'risk_assessment' {
    return 'risk_assessment'
  }

  buildArchitecture(): tf.Sequential {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [this.featureCount],
          units: 96,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.4 }),
        tf.layers.dense({
          units: 48,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 24,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid'
        })
      ]
    })

    return model
  }

  preprocessInput(features: number[]): tf.Tensor2D {
    return tf.tensor2d([features])
  }

  postprocessOutput(output: tf.Tensor): ModelPrediction {
    const riskScore = output.dataSync()[0]
    const confidence = Math.abs(riskScore - 0.5) * 2

    // Generate specific risk factors
    const riskFactors: string[] = []
    if (riskScore > 0.7) {
      riskFactors.push('High dropout risk', 'Poor attendance pattern', 'Declining assessment scores')
    } else if (riskScore > 0.4) {
      riskFactors.push('Moderate risk indicators', 'Inconsistent engagement')
    }

    return {
      prediction: riskScore,
      confidence,
      confidenceInterval: {
        lower: Math.max(0, riskScore - 0.15),
        upper: Math.min(1, riskScore + 0.15)
      },
      riskFactors,
      clinicalExplanations: {
        ar: this.generateArabicRiskExplanation(riskScore),
        en: this.generateEnglishRiskExplanation(riskScore)
      }
    }
  }

  private generateArabicRiskExplanation(riskScore: number): string {
    if (riskScore > 0.7) {
      return `مخاطر عالية لانقطاع العلاج (${(riskScore * 100).toFixed(0)}%). يُنصح بالتدخل الفوري ومراجعة خطة العلاج.`
    } else if (riskScore > 0.4) {
      return `مخاطر متوسطة (${(riskScore * 100).toFixed(0)}%). يُنصح بمراقبة إضافية وتقييم استمرارية العلاج.`
    } else {
      return `مخاطر منخفضة (${(riskScore * 100).toFixed(0)}%). الطالب يواصل العلاج بشكل مناسب.`
    }
  }

  private generateEnglishRiskExplanation(riskScore: number): string {
    if (riskScore > 0.7) {
      return `High risk of therapy discontinuation (${(riskScore * 100).toFixed(0)}%). Immediate intervention recommended.`
    } else if (riskScore > 0.4) {
      return `Moderate risk level (${(riskScore * 100).toFixed(0)}%). Additional monitoring advised.`
    } else {
      return `Low risk (${(riskScore * 100).toFixed(0)}%). Student maintaining appropriate therapy progress.`
    }
  }
}

/**
 * Operational Forecast Model
 * Predicts center capacity and resource utilization
 */
export class OperationalForecastModel extends BasePredictionModel {
  getModelType(): 'operational_forecast' {
    return 'operational_forecast'
  }

  buildArchitecture(): tf.Sequential {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [this.featureCount],
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'linear' // Linear activation for regression
        })
      ]
    })

    return model
  }

  preprocessInput(features: number[]): tf.Tensor2D {
    return tf.tensor2d([features])
  }

  postprocessOutput(output: tf.Tensor): ModelPrediction {
    const forecast = output.dataSync()[0]
    const confidence = 0.8 // Higher confidence for operational forecasts

    return {
      prediction: forecast,
      confidence,
      confidenceInterval: {
        lower: forecast * 0.9,
        upper: forecast * 1.1
      },
      clinicalExplanations: {
        ar: `التوقعات التشغيلية: ${forecast.toFixed(2)}. مستوى الثقة: ${(confidence * 100).toFixed(0)}%.`,
        en: `Operational forecast: ${forecast.toFixed(2)}. Confidence level: ${(confidence * 100).toFixed(0)}%.`
      }
    }
  }
}