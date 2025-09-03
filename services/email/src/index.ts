// Initialize tracing first
import './tracing-init';

import { EmailCreatedListener } from './events/listeners/email-created-listener';
import { ProfileCreatedListener } from './events/listeners/profile-created-listener';
import { BidCreatedListener } from './events/listeners/bid-created-listener';
import { ListingUpdatedListener } from './events/listeners/listing-updated-listener';
import { natsWrapper } from './nats-wrapper-circuit-breaker';
import { app } from './app';

(async () => {
  try {
    console.log('The profile service has started');

    if (!process.env.EMAIL) {
      throw new Error('EMAIL must be defined');
    }

    if (!process.env.EMAIL_PASSWORD) {
      throw new Error('EMAIL_PASSWORD must be defined');
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

    await new EmailCreatedListener(natsWrapper.client).listen();
    await new ProfileCreatedListener(natsWrapper.client).listen();
    await new BidCreatedListener(natsWrapper.client).listen();
    await new ListingUpdatedListener(natsWrapper.client).listen();

    app.listen(3106, () => {
      console.log('Email service listening on port 3106');
    });

    console.log('The email service has started up successfully');
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
})();
