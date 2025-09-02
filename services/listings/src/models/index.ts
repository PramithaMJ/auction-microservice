import { Sequelize } from 'sequelize';

import { ListingFactory } from './listing';
import { UserFactory } from './user';
import { ListingReadFactory } from './listing-read-model';

const db =
  process.env.NODE_ENV == 'test'
    ? new Sequelize('sqlite::memory:', { logging: false })
    : new Sequelize(process.env.LISTINGS_MYSQL_URI!, {
        logging: false,
      });

const Listing = ListingFactory(db);
const User = UserFactory(db);
const ListingRead = ListingReadFactory(db);

// Set up associations - temporarily without constraints to handle missing users
User.hasMany(Listing, { foreignKey: 'userId', as: 'listings', constraints: false });
Listing.belongsTo(User, { foreignKey: 'userId', as: 'User', constraints: false });

export { db, Listing, User, ListingRead };
