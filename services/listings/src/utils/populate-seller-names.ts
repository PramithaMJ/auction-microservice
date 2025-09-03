import { Op } from 'sequelize';
import { ListingRead, User } from '../models';

export const populateSellerNames = async (): Promise<void> => {
  console.log(' Populating missing seller names in read model...');
  
  try {
    // Find all read model entries that have empty seller names
    const readEntries = await ListingRead.findAll({
      where: {
        sellerName: {
          [Op.or]: ['', null]
        }
      }
    });

    console.log(`Found ${readEntries.length} read model entries with missing seller names`);

    let updatedCount = 0;

    for (const readEntry of readEntries) {
      try {
        // Find the corresponding user
        const seller = await User.findByPk(readEntry.sellerId);
        
        if (seller) {
          await readEntry.update({ sellerName: seller.name });
          updatedCount++;
          console.log(` Updated seller name for listing ${readEntry.id}: ${seller.name}`);
        } else {
          console.log(` Seller ${readEntry.sellerId} not found for listing ${readEntry.id}`);
        }
      } catch (error) {
        console.error(` Failed to update seller name for listing ${readEntry.id}:`, error);
      }
    }

    console.log(` Seller name population complete! Updated ${updatedCount} read model entries`);
    return;
  } catch (error) {
    console.error(' Seller name population failed:', error);
    throw error;
  }
};
