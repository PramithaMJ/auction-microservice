import { BuildOptions, DataTypes, Model, Sequelize, UUIDV4 } from 'sequelize';

export interface PasswordResetAttributes {
  id: string;
  userId: string;
  token: string;
  expires: Date;
  used: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PasswordResetModel
  extends Model<PasswordResetAttributes>,
    PasswordResetAttributes {}

export class PasswordReset extends Model<PasswordResetModel, PasswordResetAttributes> {}

export type PasswordResetStatic = typeof Model & {
  new (values?: object, options?: BuildOptions): PasswordResetModel;
};

const PasswordResetFactory = (sequelize: Sequelize): PasswordResetStatic => {
  const PasswordReset = <PasswordResetStatic>sequelize.define(
    'password_resets',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: UUIDV4,
        unique: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      token: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      expires: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      timestamps: true,
      version: false,
    }
  );

  return PasswordReset;
};

export default PasswordResetFactory;
