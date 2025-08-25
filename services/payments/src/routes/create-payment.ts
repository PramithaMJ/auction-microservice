import {
  BadRequestError,
  ListingStatus,
  NotFoundError,
  requireAuth,
  validateRequest,
} from '@jjmauction/common';
import express, { Request, Response } from 'express';
import { body } from 'express-validator';

import { PaymentCreatedPublisher } from '../events/publishers/payment-created-publisher';
import { EmailCreatedPublisher } from '../events/publishers/email-created-publisher';
import { Listing, Payment, User } from '../models';
import { natsWrapper } from '../nats-wrapper';
import { stripe } from '../stripe';

const router = express.Router();

router.post(
  '/api/payments',
  requireAuth,
  [body('token').not().isEmpty(), body('listingId').not().isEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    const { token, listingId } = req.body;

    const listing = await Listing.findOne({ where: { id: listingId } });

    if (!listing) {
      throw new NotFoundError();
    }

    // Fetch the winner's email from the User table
    let winnerEmail = undefined;
    if (listing.winnerId) {
      const winner = await User.findOne({ where: { id: listing.winnerId } });
      winnerEmail = winner?.email;
    }

    if (listing.status !== ListingStatus.AwaitingPayment) {
      throw new BadRequestError(
        'You can only pay for listings that are sold and awaiting payment'
      );
    }

    if (listing.winnerId !== req.currentUser!.id) {
      throw new BadRequestError(
        'Only auction winners can pay for sold listings'
      );
    }

    const charge = await stripe.charges.create({
      currency: 'usd',
      amount: listing.amount,
      source: token,
    });

    const payment = await Payment.create({
      listingId: listing.id!,
      stripeId: charge.id,
    });

    new PaymentCreatedPublisher(natsWrapper.client).publish({
      id: listing.id!,
      version: payment.version!,
    });

    // Send email notification to the winner
    if (winnerEmail) {
      await new EmailCreatedPublisher(natsWrapper.client).publish({
        email: winnerEmail,
        subject: `Payment received for auction: ${listing.id}`,
        text: `Your payment for the auction (ID: ${listing.id}) was successful. Thank you!`
      });
    }

    res.status(201).send({ id: payment.id });
  }
);

export { router as createPaymentRouter };
