import { createClient } from 'redis';

export interface SagaState {
  sagaId: string;
  sagaType: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
  state: string;
  completedSteps: string[];
  startedAt: string;
  lastUpdatedAt: string;
  compensationRequired?: boolean;
  error?: string;
  retryCount?: number;
  maxRetries?: number;
  timeoutAt?: string;
  metadata?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface SagaMetrics {
  totalActiveSagas: number;
  sagasByType: Record<string, number>;
  sagasByState: Record<string, number>;
  averageExecutionTime: number;
  successRate: number;
  retryRate: number;
  timeoutRate: number;
  oldestSaga?: string;
  stalledSagas: number;
}

class EnhancedSagaStateManager {
  private client: any;
  private connected: boolean = false;
  private readonly SAGA_TIMEOUT_MINUTES = 30;
  private readonly MAX_RETRIES = 3;

  async connect(url: string = 'redis://localhost:6379'): Promise<void> {
    try {
      this.client = createClient({ url });
      
      this.client.on('error', (err: any) => {
        console.error(' Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log(' Connected to Redis for enhanced saga state management');
        this.connected = true;
      });

      await this.client.connect();
      
      // Start background tasks
      this.startStalledSagaDetection();
      this.startMetricsCollection();
    } catch (error) {
      console.error(' Failed to connect to Redis:', error);
      throw error;
    }
  }

  async saveSagaState(sagaState: SagaState): Promise<void> {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }

    const key = `saga:${sagaState.sagaType}:${sagaState.sagaId}`;
    const now = new Date().toISOString();
    
    // Calculate timeout if not set
    if (!sagaState.timeoutAt) {
      const timeoutDate = new Date();
      timeoutDate.setMinutes(timeoutDate.getMinutes() + this.SAGA_TIMEOUT_MINUTES);
      sagaState.timeoutAt = timeoutDate.toISOString();
    }

    const value = JSON.stringify({
      ...sagaState,
      lastUpdatedAt: now,
      retryCount: sagaState.retryCount || 0,
      maxRetries: sagaState.maxRetries || this.MAX_RETRIES,
      priority: sagaState.priority || 'medium'
    });

    await Promise.all([
      this.client.set(key, value, { EX: 86400 }), // 24 hour expiry
      this.client.zAdd('saga:active', { score: Date.now(), value: sagaState.sagaId }),
      this.client.zAdd(`saga:by-type:${sagaState.sagaType}`, { score: Date.now(), value: sagaState.sagaId }),
      this.client.hIncrBy('saga:metrics:daily', `total:${sagaState.sagaType}`, 1)
    ]);

    console.log(`💾 Saved saga state: ${sagaState.sagaId} - ${sagaState.state}`);
  }

  async getSagaState(sagaType: string, sagaId: string): Promise<SagaState | null> {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }

    const key = `saga:${sagaType}:${sagaId}`;
    const value = await this.client.get(key);
    
    if (!value) {
      return null;
    }

    return JSON.parse(value) as SagaState;
  }

  async getAllActiveSagas(): Promise<SagaState[]> {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }

    try {
      // Use ZRANGE with proper parameters for the new Redis client
      const sagaIds = await this.client.zRange('saga:active', 0, -1);
      const sagas: SagaState[] = [];

      for (const sagaId of sagaIds) {
        // Try to find saga in different types
        const types = ['user-registration', 'bid-placement', 'auction-completion', 'payment-processing'];
        
        for (const type of types) {
          const saga = await this.getSagaState(type, sagaId);
          if (saga) {
            sagas.push(saga);
            break;
          }
        }
      }

      return sagas;
    } catch (error) {
      console.error('🔴 Error getting active sagas:', error);
      return []; // Return empty array instead of throwing to prevent service crash
    }
  }

  async incrementRetryCount(sagaType: string, sagaId: string): Promise<boolean> {
    const saga = await this.getSagaState(sagaType, sagaId);
    if (!saga) return false;

    saga.retryCount = (saga.retryCount || 0) + 1;
    saga.lastUpdatedAt = new Date().toISOString();

    if (saga.retryCount >= (saga.maxRetries || this.MAX_RETRIES)) {
      saga.state = 'FAILED_MAX_RETRIES';
      await this.client.hIncrBy('saga:metrics:daily', `failed:${sagaType}:max_retries`, 1);
    }

    await this.saveSagaState(saga);
    return saga.retryCount < (saga.maxRetries || this.MAX_RETRIES);
  }

  async markSagaAsCompleted(sagaType: string, sagaId: string): Promise<void> {
    const saga = await this.getSagaState(sagaType, sagaId);
    if (!saga) return;

    saga.state = 'COMPLETED';
    saga.lastUpdatedAt = new Date().toISOString();
    
    await Promise.all([
      this.saveSagaState(saga),
      this.client.zRem('saga:active', sagaId),
      this.client.hIncrBy('saga:metrics:daily', `completed:${sagaType}`, 1)
    ]);

    console.log(` Saga completed: ${sagaId}`);
  }

  async markSagaAsFailed(sagaType: string, sagaId: string, error: string): Promise<void> {
    const saga = await this.getSagaState(sagaType, sagaId);
    if (!saga) return;

    saga.state = 'FAILED';
    saga.error = error;
    saga.lastUpdatedAt = new Date().toISOString();
    
    await Promise.all([
      this.saveSagaState(saga),
      this.client.zRem('saga:active', sagaId),
      this.client.hIncrBy('saga:metrics:daily', `failed:${sagaType}`, 1)
    ]);

    console.log(` Saga failed: ${sagaId} - ${error}`);
  }

  async cancelSaga(sagaType: string, sagaId: string): Promise<boolean> {
    const saga = await this.getSagaState(sagaType, sagaId);
    if (!saga) return false;

    saga.state = 'CANCELLED';
    saga.lastUpdatedAt = new Date().toISOString();
    
    await Promise.all([
      this.saveSagaState(saga),
      this.client.zRem('saga:active', sagaId),
      this.client.hIncrBy('saga:metrics:daily', `cancelled:${sagaType}`, 1)
    ]);

    console.log(` Saga cancelled: ${sagaId}`);
    return true;
  }

  async getStalledSagas(): Promise<SagaState[]> {
    const activeSagas = await this.getAllActiveSagas();
    const now = new Date();
    
    return activeSagas.filter(saga => {
      if (!saga.timeoutAt) return false;
      return new Date(saga.timeoutAt) < now;
    });
  }

  async getSagaMetrics(): Promise<SagaMetrics> {
    const activeSagas = await this.getAllActiveSagas();
    const dailyMetrics = await this.client.hGetAll('saga:metrics:daily');
    
    const sagasByType = activeSagas.reduce((acc, saga) => {
      acc[saga.sagaType] = (acc[saga.sagaType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sagasByState = activeSagas.reduce((acc, saga) => {
      acc[saga.state] = (acc[saga.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stalledSagas = await this.getStalledSagas();
    
    // Calculate success rate
    const totalCompleted = Object.keys(dailyMetrics)
      .filter(key => key.startsWith('completed:'))
      .reduce((sum, key) => sum + parseInt(dailyMetrics[key] || '0'), 0);
    
    const totalFailed = Object.keys(dailyMetrics)
      .filter(key => key.startsWith('failed:'))
      .reduce((sum, key) => sum + parseInt(dailyMetrics[key] || '0'), 0);
    
    const successRate = totalCompleted + totalFailed > 0 
      ? (totalCompleted / (totalCompleted + totalFailed)) * 100 
      : 0;

    return {
      totalActiveSagas: activeSagas.length,
      sagasByType,
      sagasByState,
      averageExecutionTime: 0, // TODO: Implement execution time tracking
      successRate,
      retryRate: 0, // TODO: Calculate retry rate
      timeoutRate: 0, // TODO: Calculate timeout rate
      oldestSaga: activeSagas.length > 0 
        ? activeSagas.reduce((oldest, current) => 
            new Date(current.startedAt) < new Date(oldest.startedAt) ? current : oldest
          ).sagaId
        : undefined,
      stalledSagas: stalledSagas.length
    };
  }

  private async startStalledSagaDetection(): Promise<void> {
    setInterval(async () => {
      try {
        const stalledSagas = await this.getStalledSagas();
        
        for (const saga of stalledSagas) {
          console.log(` Detected stalled saga: ${saga.sagaId} - ${saga.sagaType}`);
          
          // Attempt to retry or mark as failed
          const canRetry = await this.incrementRetryCount(saga.sagaType, saga.sagaId);
          if (!canRetry) {
            await this.markSagaAsFailed(saga.sagaType, saga.sagaId, 'Saga timeout exceeded');
          }
        }
      } catch (error) {
        console.error(' Error in stalled saga detection:', error);
      }
    }, 60000); // Check every minute
  }

  private async startMetricsCollection(): Promise<void> {
    // Reset daily metrics at midnight
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        await this.client.del('saga:metrics:daily');
        console.log(' Reset daily saga metrics');
      }
    }, 60000);
  }

  async disconnect(): Promise<void> {
    if (this.connected && this.client) {
      await this.client.disconnect();
      this.connected = false;
      console.log(' Disconnected from Redis');
    }
  }
}

export const enhancedSagaStateManager = new EnhancedSagaStateManager();
export { EnhancedSagaStateManager };
