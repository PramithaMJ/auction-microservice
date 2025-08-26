import express from 'express';
import { json } from 'body-parser';
import cookieSession from 'cookie-session';
import { natsWrapper } from './nats-wrapper-circuit-breaker';

const app = express();
app.set('trust proxy', true);
app.use(json());
app.use(
  cookieSession({
    signed: false,
    secure: process.env.NODE_ENV !== 'test',
  })
);

// Health check endpoint
app.get('/api/email/health', (req, res) => {
  res.status(200).json({
    service: 'email',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// NATS health check endpoint
app.get('/api/email/health/nats', (req, res) => {
  const natsHealth = natsWrapper.getHealthStatus();
  
  if (natsHealth.isHealthy) {
    res.status(200).json({
      service: 'email-nats',
      status: 'healthy',
      circuitBreaker: natsHealth.circuitBreakerState,
      connectionState: natsHealth.connectionState,
      lastError: natsHealth.lastError,
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      service: 'email-nats',
      status: 'unhealthy',
      circuitBreaker: natsHealth.circuitBreakerState,
      connectionState: natsHealth.connectionState,
      lastError: natsHealth.lastError,
      timestamp: new Date().toISOString(),
    });
  }
});

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

export { app };
