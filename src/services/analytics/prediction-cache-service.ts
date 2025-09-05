import { supabase } from '@/lib/supabase'

export interface CacheEntry {
  key: string
  data: any
  expiresAt: Date
  metadata?: Record<string, any>
}

export interface CacheStats {
  totalEntries: number
  hitRate: number
  averageResponseTime: number
  memoryUsage: number
  expiredEntries: number
}

export class PredictionCacheService {
  private static readonly CACHE_PREFIX = 'pred_cache:'
  private static readonly DEFAULT_TTL = 24 * 60 * 60 * 1000 // 24 hours
  private static cacheStats: CacheStats = {
    totalEntries: 0,
    hitRate: 0,
    averageResponseTime: 0,
    memoryUsage: 0,
    expiredEntries: 0
  }

  /**
   * Get prediction from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now()
    
    try {
      const cacheKey = this.buildCacheKey(key)
      
      // Try to get from in-memory cache first (if available)
      const memoryResult = this.getFromMemoryCache<T>(cacheKey)
      if (memoryResult) {
        this.updateStats(startTime, true, 'memory')
        return memoryResult
      }

      // Fallback to database cache
      const { data, error } = await supabase
        .from('prediction_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        this.updateStats(startTime, false, 'database')
        return null
      }

      const cachedData = data.cached_data as T
      
      // Store in memory cache for faster access
      this.storeInMemoryCache(cacheKey, cachedData, new Date(data.expires_at))
      
      this.updateStats(startTime, true, 'database')
      return cachedData
    } catch (error) {
      console.error('Error getting from cache:', error)
      this.updateStats(startTime, false, 'error')
      return null
    }
  }

  /**
   * Store prediction in cache
   */
  static async set<T>(
    key: string, 
    data: T, 
    ttl: number = this.DEFAULT_TTL,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const cacheKey = this.buildCacheKey(key)
      const expiresAt = new Date(Date.now() + ttl)

      // Store in database cache
      const { error } = await supabase
        .from('prediction_cache')
        .upsert({
          cache_key: cacheKey,
          cached_data: data,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
          access_count: 1,
          metadata: metadata || {}
        })

      if (error) {
        console.error('Error storing in database cache:', error)
        return false
      }

      // Store in memory cache
      this.storeInMemoryCache(cacheKey, data, expiresAt)

      this.cacheStats.totalEntries++
      console.log(`Cached prediction with key: ${key}`)
      return true
    } catch (error) {
      console.error('Error setting cache:', error)
      return false
    }
  }

  /**
   * Delete specific cache entry
   */
  static async delete(key: string): Promise<boolean> {
    try {
      const cacheKey = this.buildCacheKey(key)

      // Remove from database
      const { error } = await supabase
        .from('prediction_cache')
        .delete()
        .eq('cache_key', cacheKey)

      if (error) {
        console.error('Error deleting from cache:', error)
        return false
      }

      // Remove from memory cache
      this.removeFromMemoryCache(cacheKey)

      console.log(`Deleted cache entry: ${key}`)
      return true
    } catch (error) {
      console.error('Error deleting cache entry:', error)
      return false
    }
  }

  /**
   * Clear expired cache entries
   */
  static async clearExpired(): Promise<{ deletedCount: number }> {
    try {
      const { data, error } = await supabase
        .from('prediction_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('cache_key')

      if (error) {
        throw error
      }

      const deletedCount = data?.length || 0
      this.cacheStats.expiredEntries += deletedCount

      // Clear expired entries from memory cache
      this.clearExpiredMemoryCache()

      console.log(`Cleared ${deletedCount} expired cache entries`)
      return { deletedCount }
    } catch (error) {
      console.error('Error clearing expired cache:', error)
      return { deletedCount: 0 }
    }
  }

  /**
   * Clear all cache entries for a student
   */
  static async clearStudentCache(studentId: string): Promise<{ deletedCount: number }> {
    try {
      const studentCachePattern = `${this.CACHE_PREFIX}student_${studentId}_`

      const { data, error } = await supabase
        .from('prediction_cache')
        .delete()
        .like('cache_key', `${studentCachePattern}%`)
        .select('cache_key')

      if (error) {
        throw error
      }

      const deletedCount = data?.length || 0

      // Clear from memory cache
      data?.forEach(entry => {
        this.removeFromMemoryCache(entry.cache_key)
      })

      console.log(`Cleared ${deletedCount} cache entries for student ${studentId}`)
      return { deletedCount }
    } catch (error) {
      console.error('Error clearing student cache:', error)
      return { deletedCount: 0 }
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<CacheStats> {
    try {
      // Get database stats
      const { data: cacheEntries } = await supabase
        .from('prediction_cache')
        .select('cache_key, created_at, expires_at, access_count')

      const totalEntries = cacheEntries?.length || 0
      const expiredEntries = cacheEntries?.filter(
        entry => new Date(entry.expires_at) < new Date()
      ).length || 0

      // Calculate hit rate from access patterns
      const totalAccesses = cacheEntries?.reduce((sum, entry) => sum + (entry.access_count || 1), 0) || 0
      const hitRate = totalAccesses > 0 ? (totalAccesses - totalEntries) / totalAccesses : 0

      // Update stats
      this.cacheStats = {
        ...this.cacheStats,
        totalEntries,
        expiredEntries,
        hitRate: Math.max(0, Math.min(1, hitRate))
      }

      return this.cacheStats
    } catch (error) {
      console.error('Error getting cache stats:', error)
      return this.cacheStats
    }
  }

  /**
   * Preload frequently accessed predictions
   */
  static async preloadFrequentPredictions(studentIds: string[]): Promise<void> {
    try {
      if (studentIds.length === 0) return

      console.log(`Preloading predictions for ${studentIds.length} students`)

      // Get most recent predictions for each student
      const { data: predictions } = await supabase
        .from('predictive_analytics')
        .select('*')
        .in('student_id', studentIds)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (!predictions) return

      // Group by student and prediction type
      const groupedPredictions: Record<string, any[]> = {}
      predictions.forEach(pred => {
        const key = `${pred.student_id}_${pred.prediction_type}`
        if (!groupedPredictions[key]) {
          groupedPredictions[key] = []
        }
        groupedPredictions[key].push(pred)
      })

      // Cache the most recent prediction for each student/type combination
      const cachePromises = Object.entries(groupedPredictions).map(([key, preds]) => {
        const mostRecent = preds[0] // Already ordered by created_at desc
        const cacheKey = `student_${mostRecent.student_id}_${mostRecent.prediction_type}`
        return this.set(cacheKey, mostRecent, 30 * 60 * 1000) // 30 minute TTL for preloaded data
      })

      await Promise.all(cachePromises)
      console.log(`Preloaded ${cachePromises.length} predictions`)
    } catch (error) {
      console.error('Error preloading predictions:', error)
    }
  }

  /**
   * Generate cache key with student-specific invalidation support
   */
  static buildCacheKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`
  }

  /**
   * Generate cache key for student prediction
   */
  static buildStudentPredictionKey(
    studentId: string, 
    predictionType: string, 
    parameters?: Record<string, any>
  ): string {
    let key = `student_${studentId}_${predictionType}`
    
    if (parameters && Object.keys(parameters).length > 0) {
      const paramHash = this.hashParameters(parameters)
      key += `_${paramHash}`
    }

    return key
  }

  /**
   * Invalidate cache when student data changes
   */
  static async invalidateStudentCache(studentId: string, reason?: string): Promise<void> {
    try {
      await this.clearStudentCache(studentId)
      
      console.log(`Invalidated cache for student ${studentId}${reason ? ` (${reason})` : ''}`)
    } catch (error) {
      console.error('Error invalidating student cache:', error)
    }
  }

  // Memory cache implementation (simple in-memory store)
  private static memoryCache: Map<string, { data: any; expiresAt: Date; accessCount: number }> = new Map()

  private static getFromMemoryCache<T>(key: string): T | null {
    const entry = this.memoryCache.get(key)
    
    if (!entry || entry.expiresAt < new Date()) {
      if (entry && entry.expiresAt < new Date()) {
        this.memoryCache.delete(key)
      }
      return null
    }

    entry.accessCount++
    return entry.data as T
  }

  private static storeInMemoryCache(key: string, data: any, expiresAt: Date): void {
    // Limit memory cache size
    if (this.memoryCache.size > 1000) {
      this.clearOldestMemoryCacheEntries()
    }

    this.memoryCache.set(key, {
      data,
      expiresAt,
      accessCount: 1
    })
  }

  private static removeFromMemoryCache(key: string): void {
    this.memoryCache.delete(key)
  }

  private static clearExpiredMemoryCache(): void {
    const now = new Date()
    const expiredKeys = Array.from(this.memoryCache.entries())
      .filter(([_, entry]) => entry.expiresAt < now)
      .map(([key, _]) => key)

    expiredKeys.forEach(key => this.memoryCache.delete(key))
  }

  private static clearOldestMemoryCacheEntries(): void {
    // Remove 10% of entries (LRU-style cleanup)
    const entries = Array.from(this.memoryCache.entries())
    const toRemove = Math.floor(entries.length * 0.1)
    
    // Sort by access count and remove least accessed
    entries
      .sort(([,a], [,b]) => a.accessCount - b.accessCount)
      .slice(0, toRemove)
      .forEach(([key]) => this.memoryCache.delete(key))
  }

  private static updateStats(startTime: number, hit: boolean, source: string): void {
    const responseTime = Date.now() - startTime
    
    // Update running averages (simplified)
    this.cacheStats.averageResponseTime = 
      (this.cacheStats.averageResponseTime + responseTime) / 2

    // Update hit rate (simplified)
    const hitCount = hit ? 1 : 0
    this.cacheStats.hitRate = (this.cacheStats.hitRate + hitCount) / 2

    // Estimate memory usage
    this.cacheStats.memoryUsage = this.memoryCache.size * 1024 // Rough estimate
  }

  private static hashParameters(parameters: Record<string, any>): string {
    // Simple hash function for parameters
    const paramString = JSON.stringify(parameters)
    let hash = 0
    
    for (let i = 0; i < paramString.length; i++) {
      const char = paramString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(36)
  }

  /**
   * Setup automated cache maintenance
   */
  static setupMaintenance(): void {
    // Clear expired entries every hour
    setInterval(async () => {
      try {
        await this.clearExpired()
      } catch (error) {
        console.error('Cache maintenance error:', error)
      }
    }, 60 * 60 * 1000) // 1 hour

    // Clear memory cache every 30 minutes
    setInterval(() => {
      this.clearExpiredMemoryCache()
    }, 30 * 60 * 1000) // 30 minutes

    console.log('Cache maintenance scheduled')
  }
}