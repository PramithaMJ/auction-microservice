import { createClient } from 'redis';

interface SagaState {
  sagaId: string;
  userId?: string;
  userEmail: string;
  userName: string;
  userAvatar: string;
  state: string;
  completedSteps: string[];
  startedAt: string;
  lastUpdatedAt: string;
  compensationRequired?: boolean;
  error?: string;
}

class SagaStateManager {
  private client: any;
  private connected: boolean = false;

  async connect(url: string = 'redis://localhost:6379'): Promise<void> {
    try {
      this.client = createClient({ url });
      
      this.client.on('error', (err: any) => {
        console.error(' Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log(' Connected to Redis for saga state management');
        this.connected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.error(' Failed to connect to Redis:', error);
      throw error;
    }
  }

  async saveSagaState(sagaState: SagaState): Promise<void> {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }

    const key = `saga:user-registration:${sagaState.sagaId}`;
    const value = JSON.stringify({
      ...sagaState,
      lastUpdatedAt: new Date().toISOString()
    });

    try {
      await this.client.setEx(key, 3600, value); // Expire after 1 hour
      console.log(` Saved saga state for ${sagaState.sagaId}: ${sagaState.state}`);
    } catch (error) {
      console.error(` Failed to save saga state for ${sagaState.sagaId}:`, error);
      throw error;
    }
  }

  async getSagaState(sagaId: string): Promise<SagaState | null> {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }

    const key = `saga:user-registration:${sagaId}`;
    
    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }
      
      return JSON.parse(value) as SagaState;
    } catch (error) {
      console.error(` Failed to get saga state for ${sagaId}:`, error);
      throw error;
    }
  }

  async deleteSagaState(sagaId: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }

    const key = `saga:user-registration:${sagaId}`;
    
    try {
      await this.client.del(key);
      console.log(`🗑️ Deleted saga state for ${sagaId}`);
    } catch (error) {
      console.error(` Failed to delete saga state for ${sagaId}:`, error);
      throw error;
    }
  }

  async getAllActiveSagas(): Promise<SagaState[]> {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }

    try {
      const keys = await this.client.keys('saga:user-registration:*');
      const sagas: SagaState[] = [];

      for (const key of keys) {
        const value = await this.client.get(key);
        if (value) {
          sagas.push(JSON.parse(value) as SagaState);
        }
      }

      return sagas;
    } catch (error) {
      console.error(' Failed to get all active sagas:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
      console.log('🔌 Redis client disconnected');
    }
  }
}

export const sagaStateManager = new SagaStateManager();
export { SagaState };
