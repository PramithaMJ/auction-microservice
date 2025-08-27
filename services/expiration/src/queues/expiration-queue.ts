import Queue from 'bull';

import { ExpirationCompletePublisher } from '../events/publishers/expiration-complete-publisher';
import { natsWrapper } from '../nats-wrapper-circuit-breaker';

interface Payload {
  id: string;
}

const expirationQueue = new Queue<Payload>('listing:expiration', {
  redis: {
    host: process.env.REDIS_HOST,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

expirationQueue.process(async (job) => {
  const { id } = job.data;
  
  console.log(`🔄 Processing expiration for listing: ${id}`);
  
  try {
    // Check if NATS is connected before attempting to publish
    if (!natsWrapper.isConnected) {
      console.warn(`⚠️  NATS not connected, retrying expiration for listing: ${id}`);
      throw new Error('NATS client not connected - will retry');
    }
    
    // Publish the expiration event
    await new ExpirationCompletePublisher(natsWrapper.client).publish({
      id,
    });
    
    console.log(`✅ Successfully processed expiration for listing: ${id}`);
  } catch (error) {
    console.error(`❌ Failed to process expiration for listing: ${id}`, error);
    
    // Check if this is the final attempt
    if (job.attemptsMade >= 3) {
      console.error(`🚨 Final attempt failed for listing: ${id}. Manual intervention may be required.`);
      
      // Log critical failure for monitoring
      console.error('CRITICAL_EXPIRATION_FAILURE', {
        listingId: id,
        attempts: job.attemptsMade,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
    
    throw error; // Re-throw to trigger Bull's retry mechanism
  }
});

// Add event listeners for better monitoring
expirationQueue.on('completed', (job) => {
  console.log(`✅ Expiration job completed for listing: ${job.data.id}`);
  // Increment success metrics if you have a metrics system
});

expirationQueue.on('failed', (job, err) => {
  console.error(`❌ Expiration job failed for listing: ${job.data.id}`, err.message);
  
  // Log detailed failure information
  console.error('EXPIRATION_JOB_FAILURE', {
    listingId: job.data.id,
    jobId: job.id,
    attempts: job.attemptsMade,
    maxAttempts: job.opts.attempts,
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });
});

expirationQueue.on('stalled', (job) => {
  console.warn(`⏸️  Expiration job stalled for listing: ${job.data.id}`);
  
  // Log stalled job information
  console.warn('EXPIRATION_JOB_STALLED', {
    listingId: job.data.id,
    jobId: job.id,
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint data
expirationQueue.on('active', (job) => {
  console.log(`🔄 Processing expiration job for listing: ${job.data.id} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`);
});

expirationQueue.on('progress', (job, progress) => {
  console.log(`📊 Expiration job progress for listing: ${job.data.id} - ${progress}%`);
});

expirationQueue.on('waiting', (jobId) => {
  console.log(`⏳ Expiration job ${jobId} is waiting in queue`);
});

export { expirationQueue };
