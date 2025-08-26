import { app, sagaOrchestrator } from './app';
import { natsWrapper } from './nats-wrapper';
import { sagaStateManager } from './saga-state-manager';
import { UserAccountCreatedListener } from './events/listeners/user-account-created-listener';
import { ProfileCreatedListener } from './events/listeners/profile-created-listener';
import { WelcomeEmailSentListener } from './events/listeners/welcome-email-sent-listener';

(async () => {
  try {
    console.log('🚀 Starting Saga Orchestrator Service...');

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
    await natsWrapper.connect(
      process.env.NATS_CLUSTER_ID,
      process.env.NATS_CLIENT_ID,
      process.env.NATS_URL
    );

    // Connect to Redis for saga state management
    await sagaStateManager.connect(process.env.REDIS_URL);

    // Setup NATS event handlers
    natsWrapper.client.on('close', () => {
      console.log('📴 NATS connection closed!');
      process.exit();
    });

    process.on('SIGINT', async () => {
      console.log('📴 Received SIGINT, shutting down gracefully...');
      await natsWrapper.client.close();
      await sagaStateManager.close();
      process.exit();
    });

    process.on('SIGTERM', async () => {
      console.log('📴 Received SIGTERM, shutting down gracefully...');
      await natsWrapper.client.close();
      await sagaStateManager.close();
      process.exit();
    });

    // Start event listeners
    console.log('🎧 Starting event listeners...');
    new UserAccountCreatedListener(natsWrapper.client, sagaOrchestrator).listen();
    new ProfileCreatedListener(natsWrapper.client, sagaOrchestrator).listen();
    new WelcomeEmailSentListener(natsWrapper.client, sagaOrchestrator).listen();

    // Start HTTP server
    const port = process.env.PORT || 3108;
    app.listen(port, () => {
      console.log(`✅ Saga Orchestrator Service listening on port ${port}!`);
      console.log('📋 Available endpoints:');
      console.log(`   GET    /health - Service health check`);
      console.log(`   POST   /api/sagas/user-registration/start - Start user registration saga`);
      console.log(`   GET    /api/sagas/user-registration/:sagaId - Get saga status`);
      console.log(`   GET    /api/sagas/user-registration - Get all active sagas`);
      console.log(`   GET    /api/sagas/metrics - Get saga metrics`);
      console.log('');
      console.log('🎯 User Registration Saga Orchestrator is ready!');
    });

  } catch (err) {
    console.error('❌ Failed to start Saga Orchestrator Service:', err);
    process.exit(1);
  }
})();
