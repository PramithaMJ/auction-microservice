import { Sequelize } from 'sequelize';

import { ListingFactory } from './listing';
import { UserFactory } from './user';

const db =
  process.env.NODE_ENV == 'test'
    ? new Sequelize('sqlite::memory:', { logging: false })
    : new Sequelize(process.env.LISTINGS_MYSQL_URI!, {
        logging: false,
      });

const Listing = ListingFactory(db);
const User = UserFactory(db);

// Set up associations with explicit foreign key
User.hasMany(Listing, { foreignKey: 'userId', as: 'listings' });
Listing.belongsTo(User, { foreignKey: 'userId', as: 'User' });

export { db, Listing, User };
