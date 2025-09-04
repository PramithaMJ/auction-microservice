import { QueryInterface, DataTypes } from 'sequelize';
import { db } from '../models';

export const addImageIdColumnToProfiles = async (): Promise<void> => {
  const queryInterface = db.getQueryInterface();
  
  try {
    // Check if the imageId column already exists
    const tableDescription = await queryInterface.describeTable('profiles');
    
    if (!tableDescription.imageId) {
      console.log('Adding imageId column to profiles table...');
      
      await queryInterface.addColumn('profiles', 'imageId', {
        type: DataTypes.STRING,
        allowNull: true,
      });
      
      console.log('Successfully added imageId column to profiles table');
    } else {
      console.log('ImageId column already exists in profiles table');
    }
  } catch (error) {
    console.error('Error adding imageId column:', error);
    throw error;
  }
};
