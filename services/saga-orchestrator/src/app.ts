import 'express-async-errors';
import { json } from 'body-parser';
import express from 'express';
import path from 'path';
import { NotFoundError, errorHandler } from './common';
import { ErrorRequestHandler } from 'express';
import { UserRegistrationSagaOrchestrator } from './user-registration-saga-orchestrator';
import { BidPlacementSagaOrchestrator } from './bid-placement-saga-orchestrator';
import { AuctionCompletionSagaOrchestrator } from './auction-completion-saga-orchestrator';
import { PaymentProcessingSagaOrchestrator } from './payment-processing-saga-orchestrator';
import { SagaDashboardController } from './saga-dashboard-controller';
import { enhancedSagaStateManager } from './enhanced-saga-state-manager';

// Initialize saga orchestrators
const userRegistrationOrchestrator = new UserRegistrationSagaOrchestrator();
const bidPlacementOrchestrator = new BidPlacementSagaOrchestrator();
const auctionCompletionOrchestrator = new AuctionCompletionSagaOrchestrator();
const paymentProcessingOrchestrator = new PaymentProcessingSagaOrchestrator();
const dashboardController = new SagaDashboardController();

const app = express();

app.set('trust proxy', true);
app.use(json());

// Serve static files for dashboard
app.use('/dashboard', express.static(path.join(__dirname, '../public')));

// Redirect root to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard/dashboard.html');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'saga-orchestrator',
    timestamp: new Date().toISOString()
  });
});

// ===== USER REGISTRATION SAGA ENDPOINTS =====

// Start user registration saga endpoint
app.post('/api/sagas/user-registration/start', async (req, res) => {
  const { userId, userEmail, userName, userAvatar } = req.body;

  try {
    const sagaId = await userRegistrationOrchestrator.startSaga({
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

// ===== BID PLACEMENT SAGA ENDPOINTS =====

// Start bid placement saga endpoint
app.post('/api/sagas/bid-placement/start', async (req, res) => {
  const { bidId, userId, listingId, bidAmount, userEmail } = req.body;

  try {
    const sagaId = await bidPlacementOrchestrator.startSaga({
      bidId,
      userId,
      listingId,
      bidAmount,
      userEmail
    });

    res.status(201).json({
      sagaId,
      message: 'Bid placement saga started',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to start bid placement saga',
      message: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
});

// ===== AUCTION COMPLETION SAGA ENDPOINTS =====

// Start auction completion saga endpoint
app.post('/api/sagas/auction-completion/start', async (req, res) => {
  const { listingId, winnerId, winningBid, sellerId } = req.body;

  try {
    const sagaId = await auctionCompletionOrchestrator.startSaga({
      listingId,
      winnerId,
      winningBid,
      sellerId
    });

    res.status(201).json({
      sagaId,
      message: 'Auction completion saga started',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to start auction completion saga',
      message: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
});

// ===== PAYMENT PROCESSING SAGA ENDPOINTS =====

// Start payment processing saga endpoint
app.post('/api/sagas/payment-processing/start', async (req, res) => {
  const { paymentId, userId, listingId, amount, paymentMethod } = req.body;

  try {
    const sagaId = await paymentProcessingOrchestrator.startSaga({
      paymentId,
      userId,
      listingId,
      amount,
      paymentMethod
    });

    res.status(201).json({
      sagaId,
      message: 'Payment processing saga started',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to start payment processing saga',
      message: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
});

// ===== ENHANCED MONITORING AND DASHBOARD ENDPOINTS =====

// Enhanced metrics endpoint
app.get('/api/sagas/metrics/enhanced', dashboardController.getEnhancedMetrics.bind(dashboardController));

// Get saga status (works across all saga types)
app.get('/api/sagas/:sagaId/status', dashboardController.getSagaStatus.bind(dashboardController));

// Retry saga endpoint
app.post('/api/sagas/:sagaId/retry', dashboardController.retrySaga.bind(dashboardController));

// Cancel saga endpoint
app.post('/api/sagas/:sagaId/cancel', dashboardController.cancelSaga.bind(dashboardController));

// Get stalled sagas
app.get('/api/sagas/stalled', dashboardController.getStalledSagas.bind(dashboardController));

// Get saga history and analytics
app.get('/api/sagas/history', dashboardController.getSagaHistory.bind(dashboardController));

// Bulk retry stalled sagas
app.post('/api/sagas/bulk/retry-stalled', dashboardController.bulkRetryStalled.bind(dashboardController));

// ===== LEGACY ENDPOINTS (for backward compatibility) =====

// Get user registration saga status endpoint
app.get('/api/sagas/user-registration/:sagaId', async (req, res) => {
  const { sagaId } = req.params;

  try {
    const sagaState = await userRegistrationOrchestrator.getSagaStatus(sagaId);
    
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

// Get all active user registration sagas endpoint
app.get('/api/sagas/user-registration', async (req, res) => {
  try {
    const activeSagas = await userRegistrationOrchestrator.getAllActiveSagas();
    
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

// Basic saga metrics endpoint (legacy)
app.get('/api/sagas/metrics', async (req, res) => {
  try {
    const metrics = await enhancedSagaStateManager.getSagaMetrics();
    res.status(200).json({
      ...metrics,
      timestamp: new Date().toISOString()
    });
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

export { 
  app, 
  userRegistrationOrchestrator,
  bidPlacementOrchestrator,
  auctionCompletionOrchestrator,
  paymentProcessingOrchestrator,
  dashboardController,
  enhancedSagaStateManager
};
