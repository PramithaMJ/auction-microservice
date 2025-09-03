// Initialize tracing first
import './tracing-init';

import { app } from './app';
import { ListingCreatedListener } from './events/listeners/listing-created-listener';
import { ListingUpdatedListener } from './events/listeners/listing-updated-listener';
import { db } from './models';
import { natsWrapper } from './nats-wrapper-circuit-breaker';
import { syncExistingListings } from './utils/sync-listings';

(async () => {
  try {
    console.log('The payments service has started');

    if (!process.env.PAYMENTS_MYSQL_URI) {
      throw new Error('PAYMENTS_MYSQL_URI must be defined');
    }

    if (!process.env.JWT_KEY) {
      throw new Error('JWT_KEY must be defined');
    }

    if (!process.env.NATS_CLIENT_ID) {
      throw new Error('NATS_CLIENT_ID must be defined');
    }

    if (!process.env.NATS_URL) {
      throw new Error('NATS_URL must be defined');
    }

    if (!process.env.NATS_CLUSTER_ID) {
      throw new Error('NATS_CLUSTER_ID must be defined');
    }

    if (!process.env.STRIPE_KEY) {
      throw new Error('STRIPE_KEY must be defined');
    }

    await natsWrapper.connect(
      process.env.NATS_CLUSTER_ID,
      process.env.NATS_CLIENT_ID,
      process.env.NATS_URL
    );

    natsWrapper.client.on('close', () => {
      console.log('NATS connection closed!');
      process.exit();
    });

    process.on('SIGINT', () => natsWrapper.client.close());
    process.on('SIGTERM', () => natsWrapper.client.close());

    await db.authenticate();
    await db.sync();
    console.log('Conneted to MySQL');

    // Start event listeners
    new ListingCreatedListener(natsWrapper.client).listen();
    new ListingUpdatedListener(natsWrapper.client).listen();
    console.log('Event listeners started');

    // Sync existing listings from listings service
    console.log('Syncing existing listings...');
    try {
      const { syncExistingListings } = await import('./utils/sync-listings');
      await syncExistingListings();
      console.log(' Existing listings synced successfully');
    } catch (error) {
      console.error(' Failed to sync existing listings:', error);
      // Don't exit - this is non-critical for service operation
    }

    const port = process.env.PORT || 3104;
    app.listen(port, () => console.log(`Listening on port ${port}!`));

    console.log('The payments service has started up successfully');
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
})();
