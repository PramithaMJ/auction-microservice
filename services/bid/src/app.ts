import 'express-async-errors';

import { NotFoundError, currentUser, errorHandler } from '@jjmauction/common';
import { json } from 'body-parser';
import cookieSession from 'cookie-session';
import express, { Request, Response, NextFunction } from 'express';

import { createBidRouter } from './routes/create-bid';
import { deleteBidRouter } from './routes/delete-bid';
import { getBidsRouter } from './routes/get-bids';
import { getUserBidsRouter } from './routes/get-users-bids';
import { natsWrapper } from './nats-wrapper-circuit-breaker';

const app = express();

app.set('trust proxy', true);
app.use(json());
app.use(cookieSession({ signed: false, secure: false }));
app.use(currentUser as any);

app.use(deleteBidRouter);
app.use(createBidRouter);
app.use(getUserBidsRouter);
app.use(getBidsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'bid',
    timestamp: new Date().toISOString()
  });
});

// Ready check endpoint
app.get('/ready', (req, res) => {
  const natsHealth = natsWrapper.getHealthStatus();
  if (natsHealth.connected) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', reason: 'NATS not connected' });
  }
});

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
