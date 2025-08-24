import express, { Request, Response } from 'express';
import { Sequelize } from 'sequelize';

import { Listing } from '../models';

const router = express.Router();

router.get('/api/listings/', async (req: Request, res: Response) => {
  const searchParam = req.query.search;
  const search = typeof searchParam === 'string' ? searchParam : '';

  console.log('=== GET LISTINGS DEBUG ===');
  console.log('req.query.search:', req.query.search);
  console.log('search variable:', search);
  console.log('search type:', typeof search);
  console.log('search length:', search.length);
  console.log('search falsy?:', !search);
  console.log('will use search?:', !!search);

  const listings =
    search && search.trim().length > 0
      ? await Listing.findAll({
          attributes: {
            include: [
              [
                Sequelize.literal(
                  `MATCH (title) AGAINST('${search}' IN NATURAL LANGUAGE MODE)`
                ),
                'score',
              ],
            ],
          },
          where: Sequelize.literal(
            `MATCH (title) AGAINST('${search}' IN NATURAL LANGUAGE MODE)`
          ),
          order: [[Sequelize.literal('score'), 'DESC']],
        })
      : await Listing.findAll();

  console.log('listings found:', listings.length);
  console.log('=== END DEBUG ===');

  res.status(200).send(listings);
});

export { router as getListingsRouter };
