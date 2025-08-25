import { Sequelize } from 'sequelize';

import { ListingFactory } from './listing';
import { PaymentFactory } from './payment';
import { UserFactory } from './user';

const db =
  process.env.NODE_ENV == 'test'
    ? new Sequelize('sqlite::memory:', { logging: false })
    : new Sequelize(process.env.PAYMENTS_MYSQL_URI!, {
        logging: false,
      });

const Listing = ListingFactory(db);
const Payment = PaymentFactory(db);
const User = UserFactory(db);

export { db, Listing, Payment, User };
