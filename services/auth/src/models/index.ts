import { Sequelize } from 'sequelize';

import { UserFactory } from './user';
import PasswordResetFactory from './password-reset';

const db =
  process.env.NODE_ENV == 'test'
    ? new Sequelize('sqlite::memory:', { logging: false })
    : new Sequelize(process.env.AUTH_MYSQL_URI!, {
        logging: false,
      });

const User = UserFactory(db);
const PasswordReset = PasswordResetFactory(db);

export { db, User, PasswordReset };
