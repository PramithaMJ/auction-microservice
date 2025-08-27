import { NotFoundError } from '@jjmauction/common';
import express, { Request, Response } from 'express';

import { Listing, User } from '../models';

const router = express.Router();

// Internal API endpoint for fetching listing details with user information
// This endpoint is used by other services (like email service) to get listing data
router.get(
  '/internal/api/listings/:listingId',
  async (req: Request, res: Response) => {
    const listingId = req.params.listingId;

    console.log(`[Internal API] Fetching listing with ID: ${listingId}`);

    const listing = await Listing.findOne({
      include: {
        model: User,
        attributes: ['id', 'name'], // Only include necessary user fields
      },
      where: { id: listingId },
    });

    if (!listing) {
      console.log(`[Internal API] Listing not found: ${listingId}`);
      throw new NotFoundError();
    }

    console.log(`[Internal API] Listing found: ${listing.title}`);
    
    // Get the associated user data using the typed association
    const associatedUser = listing.User;
    
    // Return the listing with user information
    res.status(200).json({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      currentPrice: listing.currentPrice,
      startPrice: listing.startPrice,
      slug: listing.slug,
      expiresAt: listing.expiresAt,
      smallImage: listing.smallImage,
      largeImage: listing.largeImage,
      userId: listing.userId,
      user: associatedUser ? {
        id: associatedUser.id,
        name: associatedUser.name
      } : null
    });
  }
);

export { router as internalGetListingRouter };
