// Initialize tracing first
import './tracing-init';

import { app } from './app';
import { UserCreatedListener } from './events/listeners/user-created-listener';
import { UserAccountCreatedListener } from './events/listeners/user-account-created-listener';
import { db } from './models';
import { natsWrapper } from './nats-wrapper-circuit-breaker';
import { addImageIdColumnToProfiles } from './utils/migration-helper';

(async () => {
  try {
    console.log('The profile service has started');

    if (!process.env.PROFILE_MYSQL_URI) {
      throw new Error('PROFILE_MYSQL_URI must be defined');
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
    
    // Ensure imageId column exists in profiles table
    await addImageIdColumnToProfiles();
    
    await db.sync();
    console.log('Conneted to MySQL');

    const port = process.env.PORT || 3105;
    app.listen(port, () => console.log(`Listening on port ${port}!`));

    new UserCreatedListener(natsWrapper.client).listen();
    new UserAccountCreatedListener(natsWrapper.client).listen();

    console.log('The profile service has started up successfully');
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
})();
