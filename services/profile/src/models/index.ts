import { Sequelize } from 'sequelize';

import { ProfileFactory } from './profile';

const db =
  process.env.NODE_ENV == 'test'
    ? new Sequelize('sqlite::memory:')
    : new Sequelize(process.env.PROFILE_MYSQL_URI!, {
        logging: false,
      });

const Profile = ProfileFactory(db);

export { db, Profile };
