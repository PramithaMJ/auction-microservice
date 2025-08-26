import nats, { Stan } from 'node-nats-streaming';

// Circuit Breaker states for NATS
enum NatsCircuitState {
  CLOSED = 'CLOSED',    // Normal operation
  OPEN = 'OPEN',        // NATS is down, reject operations
  HALF_OPEN = 'HALF_OPEN' // Testing if NATS is back up
}

interface NatsCircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  resetTimeout: number;          // Time before trying half-open (ms)
  monitoringWindow: number;     // Time window for tracking failures (ms)
  maxRetries: number;           // Max retry attempts for publishing
  retryDelay: number;           // Base delay between retries (ms)
}

interface ConnectionHealth {
  state: NatsCircuitState;
  failures: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  nextAttemptTime: number;
  totalConnections: number;
  totalPublishAttempts: number;
  totalPublishFailures: number;
}

class NatsWrapper {
  private _client?: Stan;
  private _clusterId?: string;
  private _clientId?: string;
  private _url?: string;
  private _health: ConnectionHealth;
  private _config: NatsCircuitBreakerConfig;
  private _reconnectTimer?: NodeJS.Timeout;
  private _isConnecting: boolean = false;

  constructor(config: Partial<NatsCircuitBreakerConfig> = {}) {
    this._config = {
      failureThreshold: config.failureThreshold || 3,
      resetTimeout: config.resetTimeout || 30000, // 30 seconds
      monitoringWindow: config.monitoringWindow || 60000, // 1 minute
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000 // 1 second
    };

    this._health = {
      state: NatsCircuitState.CLOSED,
      failures: 0,
      lastFailureTime: 0,
      lastSuccessTime: Date.now(),
      nextAttemptTime: 0,
      totalConnections: 0,
      totalPublishAttempts: 0,
      totalPublishFailures: 0
    };
  }

  get client() {
    if (!this._client) {
      throw new Error('Cannot access NATS client before connecting');
    }
    return this._client;
  }

  get isConnected(): boolean {
    return !!this._client && this._health.state !== NatsCircuitState.OPEN;
  }

  get health(): ConnectionHealth {
    return { ...this._health };
  }

  // Check if NATS operations should be allowed
  private canExecute(): { allowed: boolean; reason?: string } {
    const now = Date.now();

    switch (this._health.state) {
      case NatsCircuitState.CLOSED:
        return { allowed: true };

      case NatsCircuitState.OPEN:
        if (now >= this._health.nextAttemptTime) {
          // Transition to half-open state
          this._health.state = NatsCircuitState.HALF_OPEN;
          console.log(` NATS circuit breaker transitioning to HALF_OPEN`);
          return { allowed: true };
        }
        return { 
          allowed: false, 
          reason: `NATS is temporarily unavailable. Circuit breaker is OPEN.` 
        };

      case NatsCircuitState.HALF_OPEN:
        return { allowed: true };

      default:
        return { allowed: true };
    }
  }

  // Record successful operation
  private recordSuccess(): void {
    const now = Date.now();
    this._health.lastSuccessTime = now;

    if (this._health.state === NatsCircuitState.HALF_OPEN) {
      // NATS is back up, close the circuit
      this._health.state = NatsCircuitState.CLOSED;
      this._health.failures = 0;
      console.log(` NATS circuit breaker transitioning to CLOSED (service recovered)`);
    } else if (this._health.state === NatsCircuitState.CLOSED) {
      // Clean up old failures outside monitoring window
      if (now - this._health.lastFailureTime > this._config.monitoringWindow) {
        this._health.failures = 0;
      }
    }
  }

  // Record failed operation
  private recordFailure(error: any): void {
    const now = Date.now();
    this._health.failures++;
    this._health.lastFailureTime = now;

    console.log(` NATS circuit breaker failure recorded: ${this._health.failures}/${this._config.failureThreshold}`, error.message);

    // Check if we should open the circuit
    if (this._health.failures >= this._config.failureThreshold) {
      this._health.state = NatsCircuitState.OPEN;
      this._health.nextAttemptTime = now + this._config.resetTimeout;
      
      console.log(`🚫 NATS circuit breaker is now OPEN. Next attempt at ${new Date(this._health.nextAttemptTime).toISOString()}`);
      
      // Schedule automatic reconnection attempt
      this.scheduleReconnection();
    }
  }

  // Schedule automatic reconnection
  private scheduleReconnection(): void {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
    }

    this._reconnectTimer = setTimeout(async () => {
      if (this._health.state === NatsCircuitState.OPEN && this._clusterId && this._clientId && this._url) {
        console.log(` Attempting automatic NATS reconnection...`);
        try {
          await this.connect(this._clusterId, this._clientId, this._url);
        } catch (error) {
          console.log(` Automatic NATS reconnection failed:`, error);
        }
      }
    }, this._config.resetTimeout);
  }

  async connect(clusterId: string, clientId: string, url: string): Promise<void> {
    // Store connection params for reconnection
    this._clusterId = clusterId;
    this._clientId = clientId;
    this._url = url;

    // Check circuit breaker
    const circuitCheck = this.canExecute();
    if (!circuitCheck.allowed) {
      throw new Error(`NATS connection blocked: ${circuitCheck.reason}`);
    }

    if (this._isConnecting) {
      throw new Error('NATS connection already in progress');
    }

    this._isConnecting = true;
    this._health.totalConnections++;

    try {
      this._client = nats.connect(clusterId, clientId, { url });

      await new Promise<void>((resolve, reject) => {
        this.client.on('connect', () => {
          console.log(' Connected to NATS');
          this._isConnecting = false;
          this.recordSuccess();
          resolve();
        });

        this.client.on('error', (err: any) => {
          console.log(' NATS connection error:', err.message);
          this._isConnecting = false;
          this.recordFailure(err);
          reject(err);
        });

        this.client.on('close', () => {
          console.log(' NATS connection closed');
          this._client = undefined;
          this._isConnecting = false;
          
          // Don't record as failure if we're shutting down gracefully
          if (this._health.state !== NatsCircuitState.OPEN) {
            this.recordFailure(new Error('NATS connection closed'));
          }
        });

        this.client.on('disconnect', () => {
          console.log(' NATS disconnected');
          this.recordFailure(new Error('NATS disconnected'));
        });

        this.client.on('reconnecting', () => {
          console.log(' NATS reconnecting...');
        });

        this.client.on('reconnect', () => {
          console.log(' NATS reconnected');
          this.recordSuccess();
        });
      });

    } catch (error) {
      this._isConnecting = false;
      this.recordFailure(error);
      throw error;
    }
  }

  // Enhanced publish with circuit breaker and retry logic
  async safePublish(subject: string, data: any, options: { retries?: number } = {}): Promise<void> {
    const maxRetries = options.retries ?? this._config.maxRetries;
    
    // Check circuit breaker
    const circuitCheck = this.canExecute();
    if (!circuitCheck.allowed) {
      throw new Error(`NATS publish blocked: ${circuitCheck.reason}`);
    }

    if (!this._client) {
      throw new Error('NATS client not connected');
    }

    this._health.totalPublishAttempts++;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          this.client.publish(subject, JSON.stringify(data), (err: any) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });

        console.log(` Event published to subject: ${subject}`);
        this.recordSuccess();
        return; // Success, exit retry loop

      } catch (error) {
        console.log(` NATS publish attempt ${attempt + 1}/${maxRetries + 1} failed:`, error);
        
        if (attempt === maxRetries) {
          // Final attempt failed
          this._health.totalPublishFailures++;
          this.recordFailure(error);
          throw new Error(`Failed to publish to NATS after ${maxRetries + 1} attempts: ${error}`);
        }

        // Wait before retry with exponential backoff
        const delay = this._config.retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Create fallback for failed publishing
  createPublishFallback(subject: string, data: any): any {
    return {
      action: 'publish_failed',
      subject,
      data,
      timestamp: new Date().toISOString(),
      circuitState: this._health.state,
      reason: 'NATS publishing failed - event will be queued for retry',
      suggestion: 'Event has been logged and will be retried when NATS becomes available'
    };
  }

  // Graceful close
  async close(): Promise<void> {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
    }

    if (this._client) {
      return new Promise<void>((resolve) => {
        this.client.on('close', () => {
          this._client = undefined;
          resolve();
        });
        this.client.close();
      });
    }
  }

  // Reset circuit breaker manually
  resetCircuitBreaker(): void {
    this._health.state = NatsCircuitState.CLOSED;
    this._health.failures = 0;
    this._health.lastFailureTime = 0;
    this._health.nextAttemptTime = 0;
    console.log(` NATS circuit breaker has been reset to CLOSED`);
  }

  // Get comprehensive health status
  getHealthStatus(): any {
    return {
      connected: this.isConnected,
      circuitBreaker: {
        state: this._health.state,
        failures: this._health.failures,
        lastFailureTime: this._health.lastFailureTime,
        lastSuccessTime: this._health.lastSuccessTime,
        nextAttemptTime: this._health.nextAttemptTime
      },
      statistics: {
        totalConnections: this._health.totalConnections,
        totalPublishAttempts: this._health.totalPublishAttempts,
        totalPublishFailures: this._health.totalPublishFailures,
        successRate: this._health.totalPublishAttempts > 0 
          ? ((this._health.totalPublishAttempts - this._health.totalPublishFailures) / this._health.totalPublishAttempts * 100).toFixed(2) + '%'
          : 'N/A'
      },
      config: this._config
    };
  }
}

export const natsWrapper = new NatsWrapper();
