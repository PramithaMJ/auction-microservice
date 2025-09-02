// Initialize tracing first
import './tracing-init';

import { app } from './app';
import { BidCreatedListener } from './events/listeners/bid-created-listener';
import { BidDeletedListener } from './events/listeners/bid-deleted-listener';
import { ListingExpiredListener } from './events/listeners/listing-expired-listener';
import { UserCreatedListener } from './events/listeners/user-created-listener';
import { UserAccountCreatedListener } from './events/listeners/user-account-created-listener';
import { ListingCreatedListener } from './events/listeners/listing-created-listener';
import { ListingUpdatedListener } from './events/listeners/listing-updated-listener';
import { ListingDeletedListener } from './events/listeners/listing-deleted-listener';
import { db } from './models';
import { natsWrapper } from './nats-wrapper-circuit-breaker';
import { socketIOWrapper } from './socket-io-wrapper';
import { populateMissingSlugs } from './utils/populate-slugs';

(async () => {
  try {
    console.log('The listings service has started');

    if (!process.env.LISTINGS_MYSQL_URI) {
      throw new Error('LISTINGS_MYSQL_URI must be defined');
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

    if (!process.env.AWS_ACCESS_KEY_ID) {
      throw new Error('AWS_ACCESS_KEY_ID must be defined');
    }

    if (!process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS_SECRET_ACCESS_KEY must be defined');
    }

    if (!process.env.AWS_S3_BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET_NAME must be defined');
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

    // Populate missing slugs in read model after DB sync
    await populateMissingSlugs();

    const port = process.env.PORT || 3103;
    const server = app.listen(port, () =>
      console.log(`Listening on port ${port}!`)
    );

    socketIOWrapper.listen(server);

    socketIOWrapper.io.of('/socket').on('connection', (socket) => {
      const room = socket.handshake['query']['r_var'];

      socket.on('join', () => {
        socket.join(room);
        console.log('[socket]', 'join room :', room);
      });

      socket.on('unsubscribe', (room) => {
        socket.leave(room);
        console.log('[socket]', 'left room :', room);
      });

      socket.on('disconnect', (reason) => {
        console.log('[socket]', 'disconected :', reason);
      });
    });

    new BidCreatedListener(natsWrapper.client).listen();
    new BidDeletedListener(natsWrapper.client).listen();
    new UserCreatedListener(natsWrapper.client).listen();
    new UserAccountCreatedListener(natsWrapper.client).listen();
    new ListingExpiredListener(natsWrapper.client).listen();
    new ListingCreatedListener(natsWrapper.client).listen();
    new ListingUpdatedListener(natsWrapper.client).listen();
    new ListingDeletedListener(natsWrapper.client).listen();

    console.log('The listings service has started up successfully');
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
})();
