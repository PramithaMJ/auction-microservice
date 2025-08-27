import { ListingCreatedListener } from './events/listeners/listing-created-listener';
import { natsWrapper } from './nats-wrapper-circuit-breaker';
import { startHealthServer } from './health-server';
import { QueueCleanup } from './utils/queue-cleanup';

// Health check and monitoring setup
let isHealthy = false;
let lastHealthCheck = Date.now();

const healthMonitor = {
  natsConnected: false,
  redisConnected: false,
  lastNatsConnection: null as Date | null,
  lastNatsDisconnection: null as Date | null,
  reconnectionAttempts: 0,
  totalExpiredListings: 0,
  failedExpirations: 0,
};

// Function to check and log health status
const logHealthStatus = () => {
  const status = {
    timestamp: new Date().toISOString(),
    nats: {
      connected: natsWrapper.isConnected,
      health: natsWrapper.getHealthStatus(),
    },
    monitor: healthMonitor,
    uptime: process.uptime(),
  };
  
  console.log('📊 Health Status:', JSON.stringify(status, null, 2));
  return status;
};

// Function to attempt NATS reconnection
const attemptReconnection = async (): Promise<boolean> => {
  if (!process.env.NATS_CLUSTER_ID || !process.env.NATS_CLIENT_ID || !process.env.NATS_URL) {
    console.error('❌ Missing NATS environment variables for reconnection');
    return false;
  }

  try {
    healthMonitor.reconnectionAttempts++;
    console.log(`🔄 Attempting NATS reconnection (attempt ${healthMonitor.reconnectionAttempts})`);
    
    await natsWrapper.connect(
      process.env.NATS_CLUSTER_ID,
      process.env.NATS_CLIENT_ID,
      process.env.NATS_URL
    );
    
    console.log('✅ NATS reconnection successful');
    healthMonitor.natsConnected = true;
    healthMonitor.lastNatsConnection = new Date();
    healthMonitor.reconnectionAttempts = 0; // Reset counter on success
    
    // Restart listeners
    new ListingCreatedListener(natsWrapper.client).listen();
    
    return true;
  } catch (error) {
    console.error(`❌ NATS reconnection failed (attempt ${healthMonitor.reconnectionAttempts}):`, error);
    return false;
  }
};

// Main startup function
(async () => {
  try {
    console.log('🚀 Starting Expiration Service...');
    
    // Validate environment variables
    if (!process.env.NATS_URL) {
      throw new Error('NATS_URL must be defined');
    }

    if (!process.env.NATS_CLIENT_ID) {
      throw new Error('NATS_CLIENT_ID must be defined');
    }

    if (!process.env.NATS_CLUSTER_ID) {
      throw new Error('NATS_CLUSTER_ID must be defined');
    }

    if (!process.env.REDIS_HOST) {
      throw new Error('REDIS_HOST must be defined');
    }

    console.log('🔧 Environment variables validated');

    // Initial NATS connection
    await natsWrapper.connect(
      process.env.NATS_CLUSTER_ID,
      process.env.NATS_CLIENT_ID,
      process.env.NATS_URL
    );

    console.log('✅ Initial NATS connection successful');
    healthMonitor.natsConnected = true;
    healthMonitor.lastNatsConnection = new Date();
    isHealthy = true;

    // Setup NATS event handlers
    natsWrapper.client.on('close', () => {
      console.log('⚠️  NATS connection closed!');
      healthMonitor.natsConnected = false;
      healthMonitor.lastNatsDisconnection = new Date();
      isHealthy = false;
      
      // Attempt reconnection after a delay
      setTimeout(async () => {
        console.log('🔄 Attempting automatic NATS reconnection...');
        const reconnected = await attemptReconnection();
        if (!reconnected) {
          console.error('❌ Automatic reconnection failed. Service may need manual restart.');
        }
      }, 5000); // Wait 5 seconds before reconnection
    });

    natsWrapper.client.on('error', (error) => {
      console.error('❌ NATS error:', error);
      healthMonitor.natsConnected = false;
    });

    natsWrapper.client.on('reconnecting', () => {
      console.log('🔄 NATS reconnecting...');
    });

    natsWrapper.client.on('reconnect', () => {
      console.log('✅ NATS reconnected');
      healthMonitor.natsConnected = true;
      healthMonitor.lastNatsConnection = new Date();
      isHealthy = true;
    });

    // Setup graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`📝 Received ${signal}. Starting graceful shutdown...`);
      isHealthy = false;
      
      if (natsWrapper.client) {
        natsWrapper.client.close();
      }
      
      setTimeout(() => {
        console.log('🛑 Forceful shutdown');
        process.exit(1);
      }, 10000); // Force exit after 10 seconds
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Start listeners
    new ListingCreatedListener(natsWrapper.client).listen();
    console.log('👂 Listing Created Listener started');

    // Start health monitoring server
    startHealthServer();

    // Setup health monitoring interval
    setInterval(() => {
      logHealthStatus();
      lastHealthCheck = Date.now();
      
      // Check if NATS connection is healthy
      if (!natsWrapper.isConnected && isHealthy) {
        console.warn('⚠️  NATS connection lost, marking service as unhealthy');
        isHealthy = false;
      }
    }, 30000); // Log health every 30 seconds

    // Setup periodic queue cleanup (every 10 minutes)
    setInterval(async () => {
      console.log('🧹 Running periodic queue cleanup...');
      const result = await QueueCleanup.cleanupAndRetry({
        removeCompletedJobs: 100,
        removeFailedJobs: 50,
        retryFailedJobs: true,
        maxRetryAttempts: 3
      });
      
      if (result.success) {
        console.log('✅ Periodic cleanup completed:', result.summary);
      } else {
        console.error('❌ Periodic cleanup failed:', result.error);
      }
    }, 10 * 60 * 1000); // Every 10 minutes

    // Initial queue cleanup on startup
    setTimeout(async () => {
      console.log('🧹 Running startup queue cleanup...');
      const stats = await QueueCleanup.getQueueStats();
      console.log('📊 Startup queue stats:', stats?.counts);
      
      if (stats && stats.counts.failed > 0) {
        console.log(`🔧 Found ${stats.counts.failed} failed jobs, attempting cleanup...`);
        await QueueCleanup.cleanupAndRetry();
      }
    }, 5000); // Wait 5 seconds after startup

    console.log('🎉 Expiration Service started successfully');
    console.log('📊 Initial health status:');
    logHealthStatus();

  } catch (err) {
    console.error('💥 Failed to start Expiration Service:', err);
    process.exit(1);
  }
})();

// Export health check function for potential HTTP health endpoint
export const getHealthStatus = () => ({
  healthy: isHealthy,
  lastHealthCheck,
  natsConnected: natsWrapper.isConnected,
  monitor: healthMonitor,
  uptime: process.uptime(),
});
