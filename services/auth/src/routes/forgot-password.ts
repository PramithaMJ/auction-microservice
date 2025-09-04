import { BadRequestError, validateRequest } from '@jjmauction/common';
import crypto from 'crypto';
import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

import { User, PasswordReset } from '../models';
import { natsWrapper } from '../nats-wrapper-circuit-breaker';

const router = express.Router();

router.post(
  '/api/users/forgot-password',
  [
    body('email')
      .isEmail()
      .withMessage('Email must be valid')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    
    // Don't reveal if user exists or not
    if (!user) {
      return res.status(200).send({ 
        message: 'If your email is registered, you will receive a password reset link.' 
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration time (1 hour)
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    // Create password reset record
    await PasswordReset.create({
      id: uuidv4(),
      userId: user.id,
      token,
      expires,
      used: false
    });

    console.log(`Password reset requested for user: ${user.email}, token: ${token}`);

    // Publish event for email service to send reset email
    try {
      await natsWrapper.client.publish(
        'password:reset-requested', 
        JSON.stringify({
          userId: user.id,
          email: user.email,
          name: user.name,
          token,
          expires: expires.toISOString()
        })
      );
      console.log('Password reset event published successfully');
    } catch (error) {
      console.error('Failed to publish password reset event:', error);
    }

    res.status(200).send({ 
      message: 'If your email is registered, you will receive a password reset link.' 
    });
  }
);

export { router as forgotPasswordRouter };
