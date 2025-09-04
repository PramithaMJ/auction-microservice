import { BadRequestError, validateRequest } from '@jjmauction/common';
import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { Op } from 'sequelize';

import { User, PasswordReset } from '../models';
import { toHash } from '../utils/to-hash';
import { natsWrapper } from '../nats-wrapper-circuit-breaker';

const router = express.Router();

router.post(
  '/api/users/reset-password',
  [
    body('token')
      .trim()
      .notEmpty()
      .withMessage('Token is required'),
    body('password')
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage('Password must be between 4 and 20 characters')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { token, password } = req.body;

    console.log(`Password reset attempt with token: ${token}`);

    // Find valid reset token
    const resetRequest = await PasswordReset.findOne({
      where: {
        token,
        used: false,
        expires: { [Op.gt]: new Date() }
      }
    });

    if (!resetRequest) {
      console.log('Invalid or expired reset token');
      throw new BadRequestError('Invalid or expired reset token');
    }

    // Find the user
    const user = await User.findByPk(resetRequest.userId);

    if (!user) {
      console.log('User not found for reset token');
      throw new BadRequestError('User not found');
    }

    // Hash the new password
    const hashedPassword = await toHash(password);

    // Update the user's password
    await user.update({ password: hashedPassword });

    // Mark token as used
    await resetRequest.update({ used: true });

    console.log(`Password reset completed for user: ${user.email}`);

    // Publish password changed event
    try {
      await natsWrapper.client.publish(
        'password:reset-completed',
        JSON.stringify({
          userId: user.id,
          email: user.email,
          name: user.name
        })
      );
      console.log('Password reset completed event published');
    } catch (error) {
      console.error('Failed to publish password reset completed event:', error);
    }

    res.status(200).send({ message: 'Password has been reset successfully' });
  }
);

export { router as resetPasswordRouter };
