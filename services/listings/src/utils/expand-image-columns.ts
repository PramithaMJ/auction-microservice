import { QueryInterface } from 'sequelize';
import { db } from '../models';

export async function expandImageColumns() {
  console.log(' Expanding image columns in listings_read table...');
  
  try {
    const queryInterface: QueryInterface = db.getQueryInterface();
    
    // Check current column definitions
    const tableDescription = await queryInterface.describeTable('listings_read');
    
    // Expand smallImage column if it exists and is too small
    if (tableDescription.smallImage) {
      console.log('Current smallImage column:', tableDescription.smallImage);
      
      await queryInterface.changeColumn('listings_read', 'smallImage', {
        type: 'TEXT',
        allowNull: true
      });
      console.log(' Expanded smallImage column to TEXT');
    }
    
    // Expand largeImage column if it exists and is too small  
    if (tableDescription.largeImage) {
      console.log('Current largeImage column:', tableDescription.largeImage);
      
      await queryInterface.changeColumn('listings_read', 'largeImage', {
        type: 'TEXT', 
        allowNull: true
      });
      console.log(' Expanded largeImage column to TEXT');
    }
    
    // Expand imageUrl column if it exists and is too small
    if (tableDescription.imageUrl) {
      console.log('Current imageUrl column:', tableDescription.imageUrl);
      
      await queryInterface.changeColumn('listings_read', 'imageUrl', {
        type: 'TEXT',
        allowNull: true
      });
      console.log(' Expanded imageUrl column to TEXT');
    }
    
    console.log(' Image columns expansion completed successfully');
  } catch (error) {
    console.error(' Failed to expand image columns:', error);
    throw error;
  }
}