import { ListingCreatedListener } from './events/listeners/listing-created-listener';
import { natsWrapper } from './nats-wrapper-circuit-breaker';

const start = async () => {
  try {
    console.log('🚀 Starting Expiration Service...');
    
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

    await natsWrapper.connect(
      process.env.NATS_CLUSTER_ID,
      process.env.NATS_CLIENT_ID,
      process.env.NATS_URL
    );
    
    console.log(' Connected to NATS');

    natsWrapper.client.on('close', () => {
      console.log('⚠️  NATS connection closed!');
      process.exit();
    });

    process.on('SIGINT', () => natsWrapper.client.close());
    process.on('SIGTERM', () => natsWrapper.client.close());

    new ListingCreatedListener(natsWrapper.client).listen();
    console.log('👂 Listening for listing created events');
    
    console.log('🎉 Expiration Service started successfully');
  } catch (err) {
    console.error('💥 Failed to start Expiration Service:', err);
    process.exit(1);
  }
};

start();
