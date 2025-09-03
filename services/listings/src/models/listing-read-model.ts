// CQRS Read Model for Listings
// This model is used for fast, denormalized queries (read side)
import { DataTypes, Model, Sequelize, BuildOptions } from 'sequelize';

export interface ListingReadAttributes {
  id: string;
  title: string;
  description: string;
  currentPrice: number;
  endDate: Date;
  imageUrl: string;
  imageId: string;
  smallImage: string;
  largeImage: string;
  sellerId: string;
  sellerName: string;
  status: string;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ListingReadModel extends Model<ListingReadAttributes>, ListingReadAttributes {}

export type ListingReadStatic = typeof Model & {
  new (values?: object, options?: BuildOptions): ListingReadModel;
};

export const ListingReadFactory = (sequelize: Sequelize): ListingReadStatic => {
  const ListingRead = <ListingReadStatic>sequelize.define(
    'listings_read',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      title: DataTypes.STRING,
      description: DataTypes.STRING,
      currentPrice: DataTypes.FLOAT,
      endDate: DataTypes.DATE,
      imageUrl: DataTypes.STRING,
      imageId: DataTypes.STRING,
      smallImage: DataTypes.STRING,
      largeImage: DataTypes.STRING,
      sellerId: DataTypes.UUID,
      sellerName: DataTypes.STRING,
      status: DataTypes.STRING,
      slug: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      tableName: 'listings_read',
    }
  );
  return ListingRead;
};
