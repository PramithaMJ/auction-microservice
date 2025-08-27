import { NotFoundError } from '@jjmauction/common';
import express, { Request, Response } from 'express';

import { User } from '../models';

const router = express.Router();

// Internal API endpoint for fetching user details
// This endpoint is used by other services (like email service) to get user data
router.get(
  '/internal/api/users/:userId',
  async (req: Request, res: Response) => {
    const userId = req.params.userId;

    console.log(`[Internal API] Fetching user with ID: ${userId}`);

    const user = await User.findOne({ where: { id: userId } });

    if (!user) {
      console.log(`[Internal API] User not found: ${userId}`);
      throw new NotFoundError();
    }

    console.log(`[Internal API] User found: ${user.email}`);
    
    // Return the user information (exclude sensitive data like password)
    res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name || user.email.split('@')[0], // Use name field or generate from email
    });
  }
);

export { router as internalGetUserRouter };
