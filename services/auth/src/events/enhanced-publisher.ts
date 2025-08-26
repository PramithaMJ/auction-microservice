import { Stan } from 'node-nats-streaming';
import { Subjects } from '@jjmauction/common';

interface Event {
  subject: Subjects;
  data: any;
}

export abstract class PublisherWithCircuitBreaker<T extends Event> {
  abstract subject: T['subject'];
  protected client: Stan;
  protected natsWrapper: any; // Reference to the enhanced nats wrapper

  constructor(client: Stan, natsWrapper?: any) {
    this.client = client;
    this.natsWrapper = natsWrapper;
  }

  async publish(data: T['data'], options: { retries?: number, fallback?: boolean } = {}): Promise<void> {
    try {
      // Use enhanced safePublish if natsWrapper is available
      if (this.natsWrapper && typeof this.natsWrapper.safePublish === 'function') {
        await this.natsWrapper.safePublish(this.subject, data, options);
      } else {
        // Fallback to standard publishing
        await this.standardPublish(data);
      }
    } catch (error) {
      console.error(`📤❌ Failed to publish event to ${this.subject}:`, error);
      
      if (options.fallback !== false) {
        // Log the failed event for potential replay
        const fallbackData = this.createFallback(data, error);
        console.log(`📝 Event fallback logged:`, fallbackData);
        
        // In a production environment, you might want to store this in a database
        // or message queue for later processing
        this.handlePublishFailure(fallbackData);
      }
      
      throw error;
    }
  }

  private standardPublish(data: T['data']): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.publish(this.subject, JSON.stringify(data), (err: any) => {
        if (err) {
          reject(err);
        } else {
          console.log('📤 Event published to subject', this.subject);
          resolve();
        }
      });
    });
  }

  private createFallback(data: T['data'], error: any): any {
    return {
      subject: this.subject,
      data,
      error: error.message,
      timestamp: new Date().toISOString(),
      status: 'failed',
      retryable: true
    };
  }

  private handlePublishFailure(fallbackData: any): void {
    // In a real-world scenario, you would:
    // 1. Store in a database table for failed events
    // 2. Add to a retry queue (Redis, etc.)
    // 3. Send to a dead letter queue
    // 4. Trigger an alert/notification
    
    console.log(` Event marked for retry: ${fallbackData.subject}`);
    
    // For now, just log it - but you could implement actual persistence here
    // Example: this.storeForRetry(fallbackData);
  }

  // Method to check if publishing is currently available
  public canPublish(): boolean {
    if (this.natsWrapper && typeof this.natsWrapper.isConnected !== 'undefined') {
      return this.natsWrapper.isConnected;
    }
    return !!this.client;
  }

  // Get health status for this publisher
  public getHealthStatus(): any {
    return {
      subject: this.subject,
      canPublish: this.canPublish(),
      natsHealth: this.natsWrapper?.getHealthStatus?.() || 'No circuit breaker data available'
    };
  }
}
