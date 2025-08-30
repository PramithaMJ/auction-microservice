import { expirationQueue } from '../queues/expiration-queue';

interface CleanupOptions {
  removeCompletedJobs?: number;
  removeFailedJobs?: number;
  retryFailedJobs?: boolean;
  maxRetryAttempts?: number;
}

class QueueCleanup {
  
  /**
   * Clean up old jobs and retry failed ones
   */
  static async cleanupAndRetry(options: CleanupOptions = {}) {
    const {
      removeCompletedJobs = 50,
      removeFailedJobs = 100,
      retryFailedJobs = true,
      maxRetryAttempts = 3
    } = options;

    console.log('🧹 Starting queue cleanup...');

    try {
      // Get current queue status
      const failed = await expirationQueue.getFailed();
      const completed = await expirationQueue.getCompleted();
      
      console.log(` Queue status: ${failed.length} failed, ${completed.length} completed`);

      // Clean completed jobs
      if (completed.length > removeCompletedJobs) {
        await expirationQueue.clean(0, 'completed', removeCompletedJobs);
        console.log(` Cleaned ${completed.length - removeCompletedJobs} completed jobs`);
      }

      // Handle failed jobs
      if (failed.length > 0) {
        console.log(`🔍 Processing ${failed.length} failed jobs...`);
        
        let retried = 0;
        let removed = 0;

        for (const job of failed) {
          try {
            const jobData = job.data;
            const attemptsMade = job.attemptsMade || 0;
            
            console.log(` Failed job ${job.id}: ${JSON.stringify(jobData)}, attempts: ${attemptsMade}`);
            
            if (retryFailedJobs && attemptsMade < maxRetryAttempts) {
              // Retry the job
              await job.retry();
              retried++;
              console.log(` Retried job ${job.id} for listing ${jobData.id}`);
            } else {
              // Log critical failure and remove
              console.error(' CRITICAL_EXPIRATION_FAILURE - Max attempts reached', {
                jobId: job.id,
                listingId: jobData.id,
                attempts: attemptsMade,
                failedReason: job.failedReason,
                timestamp: new Date().toISOString(),
              });
              
              await job.remove();
              removed++;
            }
          } catch (error) {
            console.error(` Error processing failed job ${job.id}:`, error);
          }
        }

        console.log(` Cleanup summary: ${retried} jobs retried, ${removed} jobs removed`);
      }

      // Clean old failed jobs if too many
      if (failed.length > removeFailedJobs) {
        await expirationQueue.clean(0, 'failed', removeFailedJobs);
        console.log(`🗑️  Cleaned old failed jobs, keeping last ${removeFailedJobs}`);
      }

      console.log(' Queue cleanup completed');
      
      return {
        success: true,
        summary: {
          failedJobsProcessed: failed.length,
          completedJobsCleaned: Math.max(0, completed.length - removeCompletedJobs),
        }
      };

    } catch (error) {
      console.error(' Queue cleanup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get detailed queue statistics
   */
  static async getQueueStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        expirationQueue.getWaiting(),
        expirationQueue.getActive(),
        expirationQueue.getCompleted(),
        expirationQueue.getFailed(),
        expirationQueue.getDelayed(),
      ]);

      return {
        counts: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
        },
        details: {
          failed: failed.slice(0, 5).map(job => ({
            id: job.id,
            data: job.data,
            failedReason: job.failedReason,
            attemptsMade: job.attemptsMade,
            timestamp: job.timestamp,
          })),
          delayed: delayed.slice(0, 5).map(job => ({
            id: job.id,
            data: job.data,
            delay: job.opts.delay,
            attempts: job.opts.attempts,
          })),
        }
      };
    } catch (error) {
      console.error(' Failed to get queue stats:', error);
      return null;
    }
  }

  /**
   * Emergency cleanup - removes all failed jobs and retries active ones
   */
  static async emergencyCleanup() {
    console.log(' Starting emergency cleanup...');
    
    try {
      // Remove all failed jobs
      await expirationQueue.clean(0, 'failed');
      console.log('🗑️  Removed all failed jobs');

      // Clean stalled jobs
      await expirationQueue.clean(5000, 'active');
      console.log(' Cleaned stalled jobs');

      // Get stats after cleanup
      const stats = await this.getQueueStats();
      console.log(' Post-cleanup stats:', stats?.counts);

      return { success: true };
    } catch (error) {
      console.error(' Emergency cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export { QueueCleanup };
