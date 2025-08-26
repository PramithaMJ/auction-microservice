import 'express-async-errors';
import { json } from 'body-parser';
import express from 'express';
import { NotFoundError, errorHandler } from '@jjmauction/common';
import { ErrorRequestHandler } from 'express';
import { UserRegistrationSagaOrchestrator } from './user-registration-saga-orchestrator';

// Initialize saga orchestrator
const sagaOrchestrator = new UserRegistrationSagaOrchestrator();

const app = express();

app.set('trust proxy', true);
app.use(json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'saga-orchestrator',
    timestamp: new Date().toISOString()
  });
});

// Start user registration saga endpoint
app.post('/api/sagas/user-registration/start', async (req, res) => {
  const { userId, userEmail, userName, userAvatar } = req.body;

  try {
    const sagaId = await sagaOrchestrator.startUserRegistrationSaga({
      userId,
      userEmail,
      userName,
      userAvatar
    });

    res.status(201).json({
      sagaId,
      message: 'User registration saga started',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to start user registration saga',
      message: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
});

// Get saga status endpoint
app.get('/api/sagas/user-registration/:sagaId', async (req, res) => {
  const { sagaId } = req.params;

  try {
    const sagaState = await sagaOrchestrator.getSagaStatus(sagaId);
    
    if (!sagaState) {
      return res.status(404).json({
        error: 'Saga not found',
        sagaId,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      sagaState,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get saga status',
      message: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
});

// Get all active sagas endpoint
app.get('/api/sagas/user-registration', async (req, res) => {
  try {
    const activeSagas = await sagaOrchestrator.getAllActiveSagas();
    
    res.status(200).json({
      activeSagas,
      count: activeSagas.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get active sagas',
      message: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
});

// Saga metrics endpoint
app.get('/api/sagas/metrics', async (req, res) => {
  try {
    const activeSagas = await sagaOrchestrator.getAllActiveSagas();
    
    const metrics = {
      totalActiveSagas: activeSagas.length,
      sagasByState: activeSagas.reduce((acc, saga) => {
        acc[saga.state] = (acc[saga.state] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      oldestSaga: activeSagas.length > 0 
        ? activeSagas.reduce((oldest, current) => 
            new Date(current.startedAt) < new Date(oldest.startedAt) ? current : oldest
          ).startedAt
        : null,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(metrics);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get saga metrics',
      message: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
});

app.all('*', () => {
  throw new NotFoundError();
});
app.use(errorHandler as ErrorRequestHandler);

export { app, sagaOrchestrator };
