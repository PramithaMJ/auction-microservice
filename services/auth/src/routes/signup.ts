import { BadRequestError, validateRequest } from '@jjmauction/common';
import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import gravatar from 'gravatar';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import axios from 'axios';

import { EmailCreatedPublisher } from '../events/publishers/email-created-publisher';
import { UserCreatedPublisher } from '../events/publishers/user-created-publisher';
import { EmailCreatedPublisherEnhanced } from '../events/publishers/email-created-publisher-enhanced';
import { UserCreatedPublisherEnhanced } from '../events/publishers/user-created-publisher-enhanced';
import { UserAccountCreatedPublisher } from '../events/publishers/user-account-created-publisher';
import { User } from '../models';
import { natsWrapper } from '../nats-wrapper-circuit-breaker';
import { toHash } from '../utils/to-hash';

const router = express.Router();

router.post(
  '/api/auth/signup',
  [
    body('email').isEmail().withMessage('Email must be valid'),
    body('password')
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage('Password must be between 4 and 20 characters'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { email, name, password } = req.body;

    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email }, { name }] },
    });

    if (existingUser) {
      throw new BadRequestError('That email or username is already in use');
    }

    const hashedPassword = await toHash(password);

    const avatar = gravatar.url(email, {
      s: '200',
      r: 'pg',
      d: 'mm',
    });

    const user = await User.create({
      name,
      email,
      avatar,
      password: hashedPassword,
    });

    const userJwt = jwt.sign(
      {
        id: user.id,
      },
      process.env.JWT_KEY!
    );

    // Start User Registration Saga instead of publishing events directly
    try {
      const sagaOrchestratorUrl = process.env.SAGA_ORCHESTRATOR_URL || 'http://localhost:3108';
      
      console.log(`🚀 Starting User Registration Saga for user: ${user.email}`);
      
      const sagaResponse = await axios.post(`${sagaOrchestratorUrl}/api/sagas/user-registration/start`, {
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        userAvatar: user.avatar
      });

      console.log(` User Registration Saga started: ${sagaResponse.data.sagaId}`);

      // Also publish UserAccountCreated event for the saga
      await new UserAccountCreatedPublisher(natsWrapper.client, natsWrapper).publish({
        sagaId: sagaResponse.data.sagaId,
        userId: user.id!,
        userEmail: user.email,
        userName: user.name,
        userAvatar: user.avatar,
        version: user.version!,
        timestamp: new Date().toISOString()
      }, { retries: 2 });

    } catch (error) {
      console.log(' Failed to start User Registration Saga, falling back to direct events');
      
      // Fallback to original event publishing if saga fails
      try {
        await new UserCreatedPublisherEnhanced(natsWrapper.client, natsWrapper).publish({
          id: user.id!,
          name,
          email,
          avatar,
          version: user.version!,
        }, { retries: 2 });
      } catch (fallbackError) {
        console.log(' Failed to publish UserCreated event, but user registration succeeded');
      }

      try {
        await new EmailCreatedPublisherEnhanced(natsWrapper.client, natsWrapper).publish({
          email: user.email,
          subject: 'Thank you for registering an account!',
          text: `Hello ${user.name}. Thank you for registering an account with auctionweb.site!`,
        }, { retries: 2 });
      } catch (fallbackError) {
        console.log(' Failed to publish EmailCreated event, but user registration succeeded');
      }
    }

    req.session = { jwt: userJwt };
    res.status(201).send(user);
  }
);

export { router as signupRouter };
