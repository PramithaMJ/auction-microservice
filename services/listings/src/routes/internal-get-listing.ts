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
        attributes: ['id', 'name', 'email'], // Include email field
        required: false, // LEFT JOIN instead of INNER JOIN
      },
      where: { id: listingId },
    });

    if (!listing) {
      console.log(`[Internal API] Listing not found: ${listingId}`);
      throw new NotFoundError();
    }

    console.log(`[Internal API] Listing found: ${listing.title}`);
    console.log(`[Internal API] Listing userId: ${listing.userId}`);
    
    // Also try to find the user separately to debug
    const userExists = await User.findByPk(listing.userId);
    console.log(`[Internal API] User exists separately:`, userExists ? {
      id: userExists.id,
      name: userExists.name,
      email: userExists.email
    } : 'User not found in database');
    
    console.log(`[Internal API] Associated user:`, listing.User ? {
      id: listing.User.id,
      name: listing.User.name,
      email: listing.User.email
    } : 'No user found');
    
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
        name: associatedUser.name,
        email: associatedUser.email
      } : null
    });
  }
);

export { router as internalGetListingRouter };
