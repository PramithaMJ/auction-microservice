import express from 'express';
import { getHealthStatus } from './index';
import { expirationQueue } from './queues/expiration-queue';
import { QueueCleanup } from './utils/queue-cleanup';

const app = express();
const PORT = process.env.HEALTH_PORT || 8080;

// Health check endpoint
app.get('/health', (req, res) => {
  try {
    const health = getHealthStatus();
    const statusCode = health.healthy ? 200 : 503;
    
    res.status(statusCode).json({
      status: health.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'expiration',
      version: process.env.npm_package_version || '1.0.0',
      ...health,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'expiration',
      error: error.message,
    });
  }
});

// Queue status endpoint
app.get('/queue-status', async (req, res) => {
  try {
    const stats = await QueueCleanup.getQueueStats();
    
    if (!stats) {
      return res.status(500).json({
        error: 'Failed to get queue statistics'
      });
    }

    res.json({
      timestamp: new Date().toISOString(),
      ...stats
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get queue status',
      message: error.message,
    });
  }
});

// Manual cleanup endpoint (for admin use)
app.post('/cleanup', async (req, res) => {
  try {
    const { 
      emergency = false,
      removeCompletedJobs = 50,
      removeFailedJobs = 100,
      retryFailedJobs = true,
      maxRetryAttempts = 3 
    } = req.body;

    let result;
    
    if (emergency) {
      console.log(' Manual emergency cleanup requested');
      result = await QueueCleanup.emergencyCleanup();
    } else {
      console.log('🧹 Manual cleanup requested');
      result = await QueueCleanup.cleanupAndRetry({
        removeCompletedJobs,
        removeFailedJobs,
        retryFailedJobs,
        maxRetryAttempts
      });
    }

    res.json({
      timestamp: new Date().toISOString(),
      emergency,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      error: 'Cleanup operation failed',
      message: error.message,
    });
  }
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  try {
    const health = getHealthStatus();
    
    // Simple Prometheus-style metrics
    const metrics = [
      `# HELP expiration_service_healthy Whether the expiration service is healthy`,
      `# TYPE expiration_service_healthy gauge`,
      `expiration_service_healthy ${health.healthy ? 1 : 0}`,
      ``,
      `# HELP expiration_service_uptime_seconds Service uptime in seconds`,
      `# TYPE expiration_service_uptime_seconds counter`,
      `expiration_service_uptime_seconds ${health.uptime}`,
      ``,
      `# HELP expiration_nats_connected Whether NATS is connected`,
      `# TYPE expiration_nats_connected gauge`,
      `expiration_nats_connected ${health.natsConnected ? 1 : 0}`,
      ``,
      `# HELP expiration_reconnection_attempts_total Total NATS reconnection attempts`,
      `# TYPE expiration_reconnection_attempts_total counter`,
      `expiration_reconnection_attempts_total ${health.monitor.reconnectionAttempts}`,
      ``,
      `# HELP expiration_processed_total Total processed expirations`,
      `# TYPE expiration_processed_total counter`,
      `expiration_processed_total ${health.monitor.totalExpiredListings}`,
      ``,
      `# HELP expiration_failed_total Total failed expirations`,
      `# TYPE expiration_failed_total counter`,
      `expiration_failed_total ${health.monitor.failedExpirations}`,
    ];
    
    res.set('Content-Type', 'text/plain');
    res.send(metrics.join('\n'));
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error.message,
    });
  }
});

// Ready check (for Kubernetes readiness probes)
app.get('/ready', (req, res) => {
  const health = getHealthStatus();
  if (health.healthy && health.natsConnected) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', reason: 'NATS not connected or service unhealthy' });
  }
});

// Start health server
export const startHealthServer = () => {
  app.listen(PORT, () => {
    console.log(` Health server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   Queue status: http://localhost:${PORT}/queue-status`);
    console.log(`   Manual cleanup: POST http://localhost:${PORT}/cleanup`);
    console.log(`   Metrics: http://localhost:${PORT}/metrics`);
    console.log(`   Ready check: http://localhost:${PORT}/ready`);
  });
};
