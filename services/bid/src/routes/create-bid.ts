import {
  BadRequestError,
  ListingStatus,
  NotFoundError,
  requireAuth,
  validateRequest,
} from '@jjmauction/common';
import express, { Request, Response } from 'express';

import { BidCreatedPublisher } from '../events/publishers/bid-created-publisher';
import { EmailCreatedPublisher } from '../events/publishers/email-created-publisher';
import { Bid, Listing, User, db } from '../models';
import { natsWrapper } from '../nats-wrapper';

const router = express.Router();

router.post(
  '/api/bids/:listingId',
  requireAuth,
  validateRequest,
  async (req: Request, res: Response) => {
    await db.transaction(async (transaction) => {
      const { amount } = req.body;
      const listingId = req.params.listingId;

      const listing = await Listing.findOne({ where: { id: listingId } });

      if (!listing) {
        throw new NotFoundError();
      }

      // Fetch the listing owner
      const owner = await User.findOne({ where: { id: listing.userId } });

      if (listing.status !== ListingStatus.Active) {
        throw new BadRequestError(
          'You can only bid on listings which are active'
        );
      }

      if (listing.currentPrice >= amount) {
        throw new BadRequestError('Bids must be greater than the current bid');
      }

      if (req.currentUser!.id === listing.userId) {
        throw new BadRequestError(
          'Sellers cannot place bids on there own listings'
        );
      }

      // Ensure user exists in the bid service database
      await User.findOrCreate({
        where: { id: req.currentUser!.id },
        defaults: {
          id: req.currentUser!.id,
          name: 'Unknown User', // Placeholder - will be updated when user events arrive
          email: 'unknown@email.com',
          avatar: '',
          version: 0,
        },
        transaction,
      });

      const bid = await Bid.create(
        {
          listingId,
          amount: Math.floor(amount),
          userId: req.currentUser!.id,
        },
        { transaction }
      );

      new BidCreatedPublisher(natsWrapper.client).publish({
        listingId,
        amount,
        userId: req.currentUser!.id,
        version: bid.version!,
      });

      // Send email notification to the listing owner
      if (owner && owner.email) {
        await new EmailCreatedPublisher(natsWrapper.client).publish({
          email: owner.email,
          subject: `New bid placed on your item: ${listing.title}`,
          text: `A new bid of $${(amount / 100).toFixed(2)} has been placed on your item "${listing.title}".`,
          version: 1
        });
      }

      res.status(201).send(bid);
    });
  }
);

export { router as createBidRouter };
