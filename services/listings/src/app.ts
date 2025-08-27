import 'express-async-errors';

import { NotFoundError, currentUser, errorHandler } from '@jjmauction/common';
import { json } from 'body-parser';
import cookieSession from 'cookie-session';
import express, { Request, Response, NextFunction } from 'express';

import { createListingRouter } from './routes/create-listing';
import { deleteListingRouter } from './routes/delete-listing';
import { getExpiredListingsRouter } from './routes/get-expired-listings';
import { getListingRouter } from './routes/get-listing';
import { getListingsRouter } from './routes/get-listings';
import { getSoldListingsRouter } from './routes/get-sold-listings';
import { getUserListingsRouter } from './routes/get-users-listings';
import { internalGetListingRouter } from './routes/internal-get-listing';
import { natsWrapper } from './nats-wrapper-circuit-breaker';

const app = express();

app.set('trust proxy', true);
app.use(json());
app.use(cookieSession({ signed: false, secure: false }));
app.use(currentUser as any);

// Health check endpoint
app.get('/healthcheck', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'listings' });
});

app.use(deleteListingRouter);
app.use(createListingRouter);
app.use(getListingsRouter);
app.use(getSoldListingsRouter);
app.use(getExpiredListingsRouter);
app.use(getUserListingsRouter);
app.use(getListingRouter);
app.use(internalGetListingRouter);


// NATS Circuit Breaker endpoints
app.get('/nats/health', (req, res) => {
  try {
    const healthStatus = natsWrapper.getHealthStatus();
    const statusCode = healthStatus.connected ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: 'Failed to get NATS health status'
    });
  }
});

app.post('/nats/circuit-breaker/reset', (req, res) => {
  try {
    natsWrapper.resetCircuitBreaker();
    res.status(200).json({
      message: 'NATS circuit breaker has been reset',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reset NATS circuit breaker'
    });
  }
});

app.all('*', (req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
