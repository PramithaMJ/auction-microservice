import {
  BadRequestError,
  ListingStatus,
  NotFoundError,
  requireAuth,
  validateRequest,
} from '@jjmauction/common';
import express, { Request, Response } from 'express';
import { body } from 'express-validator';

import { BidCreatedPublisher } from '../events/publishers/bid-created-publisher';
import { Bid, Listing, User, db } from '../models';
import { natsWrapper } from '../nats-wrapper-circuit-breaker';

const router = express.Router();

router.post(
  '/api/bids/:listingId',
  requireAuth,
  [
    body('amount')
      .isNumeric()
      .withMessage('Amount must be a number')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    await db.transaction(async (transaction) => {
      const { amount } = req.body;
      const listingId = req.params.listingId;

      const listing = await Listing.findOne({ where: { id: listingId } });

      if (!listing) {
        throw new NotFoundError();
      }

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

      // Check if user exists in the bid service database
      // The user should already exist from UserAccountCreated event
      const user = await User.findByPk(req.currentUser!.id, { transaction });
      if (!user) {
        throw new BadRequestError(
          'User account not fully initialized. Please try again in a moment.'
        );
      }

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

      res.status(201).send(bid);
    });
  }
);

export { router as createBidRouter };
