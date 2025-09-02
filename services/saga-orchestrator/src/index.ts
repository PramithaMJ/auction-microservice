import { 
  app, 
  initializeOrchestrators,
  enhancedSagaStateManager
} from './app';
import { natsWrapper } from './nats-wrapper';

(async () => {
  try {
    console.log(' Starting Enhanced Saga Orchestrator Service...');

    // Environment validation
    if (!process.env.NATS_URL) {
      throw new Error('NATS_URL must be defined');
    }
    if (!process.env.NATS_CLIENT_ID) {
      throw new Error('NATS_CLIENT_ID must be defined');
    }
    if (!process.env.NATS_CLUSTER_ID) {
      throw new Error('NATS_CLUSTER_ID must be defined');
    }
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL must be defined');
    }

    // Connect to NATS
    console.log(' Connecting to NATS...');
    await natsWrapper.connect(
      process.env.NATS_CLUSTER_ID,
      process.env.NATS_CLIENT_ID,
      process.env.NATS_URL
    );

    // Connect to Redis for saga state management
    console.log('🔗 Connecting to Redis...');
    await enhancedSagaStateManager.connect(process.env.REDIS_URL);

    // Initialize orchestrators after connections are established
    console.log('🚀 Initializing saga orchestrators...');
    initializeOrchestrators();

    // Graceful shutdown setup
    natsWrapper.client.on('close', () => {
      console.log(' NATS connection closed!');
      process.exit();
    });

    process.on('SIGINT', async () => {
      console.log(' Received SIGINT, gracefully shutting down...');
      await enhancedSagaStateManager.disconnect();
      process.exit();
    });

    process.on('SIGTERM', async () => {
      console.log(' Received SIGTERM, gracefully shutting down...');
      await enhancedSagaStateManager.disconnect();
      process.exit();
    });

    // Start HTTP server
    const port = process.env.PORT || 3108;
    app.listen(port, () => {
      console.log(` Enhanced Saga Orchestrator Service is running on port ${port}`);
      console.log('');
      console.log(' Available Saga Types:');
      console.log('   - User Registration Saga');
      console.log('   - Bid Placement Saga');
      console.log('   - Auction Completion Saga');
      console.log('   - Payment Processing Saga');
      console.log('');
      console.log(' Enhanced Features:');
      console.log('   - Retry mechanism');
      console.log('   - Saga cancellation');
      console.log('   - Timeout handling');
      console.log('   - Stalled saga detection');
      console.log('   - Advanced monitoring dashboard');
      console.log('   - Real-time metrics');
      console.log('');
      console.log('🌐 API Endpoints:');
      console.log('   GET    /health - Service health check');
      console.log('   GET    /api/sagas/metrics/enhanced - Enhanced metrics');
      console.log('   GET    /api/sagas/:sagaId/status - Get saga status');
      console.log('   POST   /api/sagas/:sagaId/retry - Retry saga');
      console.log('   POST   /api/sagas/:sagaId/cancel - Cancel saga');
      console.log('   GET    /api/sagas/stalled - Get stalled sagas');
      console.log('   POST   /api/sagas/bulk/retry-stalled - Bulk retry stalled');
      console.log('');
      console.log(' Saga-specific endpoints:');
      console.log('   POST   /api/sagas/user-registration/start');
      console.log('   POST   /api/sagas/bid-placement/start');
      console.log('   POST   /api/sagas/auction-completion/start');
      console.log('   POST   /api/sagas/payment-processing/start');
    });

  } catch (error) {
    console.error(' Failed to start Saga Orchestrator Service:', error);
    process.exit(1);
  }
})();
