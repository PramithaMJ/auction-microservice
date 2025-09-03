import { QueryInterface, DataTypes } from 'sequelize';
import { db } from '../models';

export const addSlugColumnToListingsRead = async (): Promise<void> => {
  const queryInterface = db.getQueryInterface();
  
  try {
    // Check if the slug column already exists
    const tableDescription = await queryInterface.describeTable('listings_read');
    
    if (!tableDescription.slug) {
      console.log('Adding slug column to listings_read table...');
      
      await queryInterface.addColumn('listings_read', 'slug', {
        type: DataTypes.STRING,
        allowNull: true,
      });
      
      console.log('Successfully added slug column to listings_read table');
    } else {
      console.log('Slug column already exists in listings_read table');
    }
  } catch (error) {
    console.error('Error adding slug column:', error);
    throw error;
  }
};
