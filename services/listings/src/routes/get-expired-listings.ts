import { ListingStatus, requireAuth } from '@jjmauction/common';
import express, { Request, Response } from 'express';
import { Op } from 'sequelize';

import { Listing } from '../models';

const router = express.Router();

router.get(
  '/api/listings/expired',
  requireAuth,
  async (req: Request, res: Response) => {
    const listings = await Listing.findAll({
      where: {
        [Op.and]: [
          { userId: req.currentUser.id },
          {
            [Op.or]: [
              // Listings explicitly marked as expired
              { status: ListingStatus.Expired },
              // OR listings that are past their expiration time (but expiration service hasn't processed yet)
              {
                [Op.and]: [
                  { status: ListingStatus.Active },
                  { expiresAt: { [Op.lt]: new Date() } },
                ],
              },
            ],
          },
        ],
      },
    });

    res.status(200).send(listings);
  }
);

export { router as getExpiredListingsRouter };
