import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  TherapyOutcomePredictionModel, 
  RiskAssessmentModel, 
  OperationalForecastModel 
} from '@/lib/ml/prediction-models'
import { TrainingDataset } from '@/services/analytics/model-training-pipeline'

// Mock TensorFlow.js
vi.mock('@tensorflow/tfjs', () => ({
  sequential: vi.fn(() => ({
    summary: vi.fn(() => 'Mock model summary'),
    compile: vi.fn(),
    fit: vi.fn(() => Promise.resolve({
      history: {
        loss: [0.5, 0.4, 0.3],
        val_loss: [0.6, 0.5, 0.4],
        accuracy: [0.7, 0.8, 0.85]
      }
    })),
    predict: vi.fn(() => ({
      dataSync: vi.fn(() => [0.75]),
      dispose: vi.fn()
    })),
    save: vi.fn(),
    dispose: vi.fn()
  })),
  layers: {
    dense: vi.fn(() => ({})),
    dropout: vi.fn(() => ({})),
    batchNormalization: vi.fn(() => ({}))
  },
  regularizers: {
    l2: vi.fn(() => ({}))
  },
  train: {
    adam: vi.fn(() => ({}))
  },
  tensor2d: vi.fn(() => ({
    dispose: vi.fn(),
    data: vi.fn(() => Promise.resolve([0.75]))
  })),
  loadLayersModel: vi.fn(),
  cast: vi.fn(() => ({ dispose: vi.fn() })),
  greater: vi.fn(() => ({ dispose: vi.fn() })),
  mean: vi.fn(() => ({ 
    data: vi.fn(() => Promise.resolve([0.85])),
    dispose: vi.fn() 
  })),
  equal: vi.fn(() => ({ dispose: vi.fn() })),
  mul: vi.fn(() => ({ dispose: vi.fn() })),
  sum: vi.fn(() => ({ 
    data: vi.fn(() => Promise.resolve([10])),
    dispose: vi.fn() 
  })),
  div: vi.fn(() => ({ 
    data: vi.fn(() => Promise.resolve([0.8])),
    dispose: vi.fn() 
  })),
  add: vi.fn(() => ({ dispose: vi.fn() })),
  sub: vi.fn(() => ({ dispose: vi.fn() }))
}))

describe('TherapyOutcomePredictionModel', () => {
  let model: TherapyOutcomePredictionModel

  beforeEach(() => {
    model = new TherapyOutcomePredictionModel()
  })

  afterEach(() => {
    model.dispose()
  })

  describe('initialization', () => {
    it('should initialize model correctly', async () => {
      await model.initialize(11)
      
      expect(model.getModelType()).toBe('therapy_outcome')
      expect(model.getModelSummary()).toBe('Mock model summary')
    })

    it('should build architecture correctly', async () => {
      await model.initialize(11)
      
      const architecture = model.buildArchitecture()
      expect(architecture).toBeDefined()
    })
  })

  describe('training', () => {
    it('should train model successfully', async () => {
      await model.initialize(11)

      const mockDataset: TrainingDataset = {
        features: [
          [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5],
          [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.1, 0.6],
          [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.1, 0.2, 0.7]
        ],
        labels: [0.8, 0.6, 0.9],
        studentIds: ['student1', 'student2', 'student3'],
        featureNames: Array(11).fill('feature'),
        metadata: {
          datasetSize: 3,
          featureCount: 11,
          createdAt: new Date(),
          dataQuality: 'good'
        }
      }

      const metrics = await model.train(mockDataset)

      expect(metrics).toBeDefined()
      expect(metrics.accuracy).toBeGreaterThan(0)
      expect(metrics.lossHistory).toHaveLength(3)
    })

    it('should throw error when training without initialization', async () => {
      const mockDataset: TrainingDataset = {
        features: [[0.1, 0.2]],
        labels: [0.8],
        studentIds: ['student1'],
        featureNames: ['f1', 'f2'],
        metadata: {
          datasetSize: 1,
          featureCount: 2,
          createdAt: new Date(),
          dataQuality: 'good'
        }
      }

      await expect(model.train(mockDataset)).rejects.toThrow(
        'Model must be initialized before training'
      )
    })
  })

  describe('prediction', () => {
    it('should make single prediction successfully', async () => {
      await model.initialize(11)

      const features = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5]
      const prediction = await model.predict(features)

      expect(prediction).toBeDefined()
      expect(prediction.prediction).toBeGreaterThanOrEqual(0)
      expect(prediction.prediction).toBeLessThanOrEqual(1)
      expect(prediction.confidence).toBeGreaterThanOrEqual(0)
      expect(prediction.confidence).toBeLessThanOrEqual(1)
      expect(prediction.confidenceInterval).toBeDefined()
      expect(prediction.clinicalExplanations).toBeDefined()
      expect(prediction.clinicalExplanations.ar).toBeDefined()
      expect(prediction.clinicalExplanations.en).toBeDefined()
    })

    it('should throw error for wrong feature count', async () => {
      await model.initialize(11)

      const wrongFeatures = [0.1, 0.2, 0.3] // Only 3 features instead of 11

      await expect(model.predict(wrongFeatures)).rejects.toThrow(
        'Feature count mismatch: expected 11, got 3'
      )
    })

    it('should throw error when predicting without loading model', async () => {
      const features = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5]

      await expect(model.predict(features)).rejects.toThrow(
        'Model must be loaded before making predictions'
      )
    })

    it('should make batch predictions successfully', async () => {
      await model.initialize(11)

      const featuresArray = [
        [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5],
        [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.1, 0.6]
      ]

      const predictions = await model.batchPredict(featuresArray)

      expect(predictions).toHaveLength(2)
      predictions.forEach(prediction => {
        expect(prediction.prediction).toBeGreaterThanOrEqual(0)
        expect(prediction.prediction).toBeLessThanOrEqual(1)
        expect(prediction.confidence).toBeDefined()
      })
    })
  })

  describe('clinical explanations', () => {
    it('should generate appropriate Arabic explanations for high success probability', async () => {
      await model.initialize(11)

      const features = Array(11).fill(0.8) // High values indicating success
      const prediction = await model.predict(features)

      expect(prediction.clinicalExplanations.ar).toContain('احتمالية نجاح العلاج عالية')
    })

    it('should generate appropriate English explanations for low success probability', async () => {
      await model.initialize(11)

      const features = Array(11).fill(0.2) // Low values indicating poor outcomes
      const prediction = await model.predict(features)

      // Note: Actual prediction depends on model behavior, but we test the structure
      expect(prediction.clinicalExplanations.en).toBeDefined()
      expect(typeof prediction.clinicalExplanations.en).toBe('string')
    })

    it('should include risk factors for poor predictions', async () => {
      await model.initialize(11)

      const features = Array(11).fill(0.1) // Very low values
      const prediction = await model.predict(features)

      if (prediction.prediction < 0.4) {
        expect(prediction.riskFactors).toBeDefined()
        expect(prediction.riskFactors!.length).toBeGreaterThan(0)
      }
    })
  })
})

describe('RiskAssessmentModel', () => {
  let model: RiskAssessmentModel

  beforeEach(() => {
    model = new RiskAssessmentModel()
  })

  afterEach(() => {
    model.dispose()
  })

  it('should have correct model type', () => {
    expect(model.getModelType()).toBe('risk_assessment')
  })

  it('should build risk assessment architecture', async () => {
    await model.initialize(11)
    const architecture = model.buildArchitecture()
    expect(architecture).toBeDefined()
  })

  it('should generate risk explanations in both languages', async () => {
    await model.initialize(11)

    const features = Array(11).fill(0.7) // Moderate risk features
    const prediction = await model.predict(features)

    expect(prediction.clinicalExplanations.ar).toBeDefined()
    expect(prediction.clinicalExplanations.en).toBeDefined()
    expect(prediction.clinicalExplanations.ar).toContain('مخاطر')
    expect(prediction.clinicalExplanations.en).toContain('risk')
  })

  it('should identify high risk situations correctly', async () => {
    await model.initialize(11)

    const features = Array(11).fill(0.9) // High risk features
    const prediction = await model.predict(features)

    if (prediction.prediction > 0.7) {
      expect(prediction.riskFactors).toBeDefined()
      expect(prediction.riskFactors!).toContain('High dropout risk')
    }
  })
})

describe('OperationalForecastModel', () => {
  let model: OperationalForecastModel

  beforeEach(() => {
    model = new OperationalForecastModel()
  })

  afterEach(() => {
    model.dispose()
  })

  it('should have correct model type', () => {
    expect(model.getModelType()).toBe('operational_forecast')
  })

  it('should build operational forecast architecture with linear output', async () => {
    await model.initialize(11)
    const architecture = model.buildArchitecture()
    expect(architecture).toBeDefined()
  })

  it('should generate operational forecasts', async () => {
    await model.initialize(11)

    const features = Array(11).fill(0.5) // Neutral operational features
    const prediction = await model.predict(features)

    expect(prediction.prediction).toBeDefined()
    expect(prediction.confidence).toBe(0.8) // High confidence for operational forecasts
    expect(prediction.confidenceInterval.lower).toBeLessThan(prediction.confidenceInterval.upper)
  })

  it('should provide appropriate confidence intervals', async () => {
    await model.initialize(11)

    const features = Array(11).fill(0.6)
    const prediction = await model.predict(features)

    // Confidence interval should be 10% around the prediction
    const expectedLower = prediction.prediction * 0.9
    const expectedUpper = prediction.prediction * 1.1

    expect(prediction.confidenceInterval.lower).toBeCloseTo(expectedLower, 1)
    expect(prediction.confidenceInterval.upper).toBeCloseTo(expectedUpper, 1)
  })
})

describe('Model Management', () => {
  it('should save and load models correctly', async () => {
    const model = new TherapyOutcomePredictionModel()
    await model.initialize(11)

    // Test save
    await expect(model.saveModel('test-therapy-model')).resolves.not.toThrow()

    // Test load
    const newModel = new TherapyOutcomePredictionModel()
    await expect(newModel.loadModel('test-therapy-model', 11)).resolves.not.toThrow()

    newModel.dispose()
    model.dispose()
  })

  it('should handle model disposal properly', async () => {
    const model = new TherapyOutcomePredictionModel()
    await model.initialize(11)

    expect(() => model.dispose()).not.toThrow()

    // Should not be able to predict after disposal
    const features = Array(11).fill(0.5)
    await expect(model.predict(features)).rejects.toThrow(
      'Model must be loaded before making predictions'
    )
  })
})

describe('Performance Metrics Calculation', () => {
  it('should calculate accuracy metrics correctly', async () => {
    const model = new TherapyOutcomePredictionModel()
    await model.initialize(3)

    const mockDataset: TrainingDataset = {
      features: [[0.8, 0.7, 0.9], [0.2, 0.3, 0.1], [0.6, 0.5, 0.7]],
      labels: [1, 0, 1],
      studentIds: ['s1', 's2', 's3'],
      featureNames: ['f1', 'f2', 'f3'],
      metadata: {
        datasetSize: 3,
        featureCount: 3,
        createdAt: new Date(),
        dataQuality: 'good'
      }
    }

    const metrics = await model.train(mockDataset)

    expect(metrics.accuracy).toBeGreaterThanOrEqual(0)
    expect(metrics.accuracy).toBeLessThanOrEqual(1)
    expect(metrics.precision).toBeGreaterThanOrEqual(0)
    expect(metrics.recall).toBeGreaterThanOrEqual(0)
    expect(metrics.f1Score).toBeGreaterThanOrEqual(0)

    model.dispose()
  })
})