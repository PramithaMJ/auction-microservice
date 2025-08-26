import 'express-async-errors';

import { NotFoundError, currentUser, errorHandler } from '@jjmauction/common';
import { json } from 'body-parser';
import cookieSession from 'cookie-session';
import express from 'express';

import { currentUserRouter } from './routes/current-user';
import { signinRouter } from './routes/signin';
import { signoutRouter } from './routes/signout';
import { signupRouter } from './routes/signup';
import { updatePasswordRouter } from './routes/update-password';
import { natsWrapper } from './nats-wrapper-circuit-breaker';

const app = express();

app.set('trust proxy', true);
app.use(json());
app.use(cookieSession({ signed: false, secure: false }));
app.use(currentUser as express.RequestHandler);

app.use(updatePasswordRouter);
app.use(currentUserRouter);
app.use(signinRouter);
app.use(signoutRouter);
app.use(signupRouter);

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

app.all('*', () => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
