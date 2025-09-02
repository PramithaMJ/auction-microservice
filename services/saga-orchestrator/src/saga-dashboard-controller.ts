import { Request, Response } from 'express';
import { enhancedSagaStateManager, SagaMetrics } from './enhanced-saga-state-manager';
import { UserRegistrationSagaOrchestrator } from './user-registration-saga-orchestrator';
import { BidPlacementSagaOrchestrator } from './bid-placement-saga-orchestrator';
import { AuctionCompletionSagaOrchestrator } from './auction-completion-saga-orchestrator';
import { PaymentProcessingSagaOrchestrator } from './payment-processing-saga-orchestrator';

export class SagaDashboardController {
  private userRegistrationOrchestrator: UserRegistrationSagaOrchestrator;
  private bidPlacementOrchestrator: BidPlacementSagaOrchestrator;
  private auctionCompletionOrchestrator: AuctionCompletionSagaOrchestrator;
  private paymentProcessingOrchestrator: PaymentProcessingSagaOrchestrator;

  constructor() {
    this.userRegistrationOrchestrator = new UserRegistrationSagaOrchestrator();
    this.bidPlacementOrchestrator = new BidPlacementSagaOrchestrator();
    this.auctionCompletionOrchestrator = new AuctionCompletionSagaOrchestrator();
    this.paymentProcessingOrchestrator = new PaymentProcessingSagaOrchestrator();
  }

  // Enhanced metrics endpoint with detailed breakdown
  async getEnhancedMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await enhancedSagaStateManager.getSagaMetrics();
      const activeSagas = await enhancedSagaStateManager.getAllActiveSagas();
      const stalledSagas = await enhancedSagaStateManager.getStalledSagas();

      const enhancedMetrics = {
        ...metrics,
        activeSagasDetails: activeSagas.map(saga => ({
          sagaId: saga.sagaId,
          sagaType: saga.sagaType,
          state: saga.state,
          priority: saga.priority,
          startedAt: saga.startedAt,
          lastUpdatedAt: saga.lastUpdatedAt,
          retryCount: saga.retryCount || 0,
          completedSteps: saga.completedSteps.length,
          timeRunning: this.calculateTimeRunning(saga.startedAt),
          isStalled: stalledSagas.some(s => s.sagaId === saga.sagaId)
        })),
        stalledSagasDetails: stalledSagas.map(saga => ({
          sagaId: saga.sagaId,
          sagaType: saga.sagaType,
          state: saga.state,
          timeoutAt: saga.timeoutAt,
          timeOverdue: saga.timeoutAt ? this.calculateTimeOverdue(saga.timeoutAt) : 0
        })),
        systemHealth: {
          redisConnected: true, // TODO: Add actual Redis health check
          natsConnected: true,  // TODO: Add actual NATS health check
          totalSagaOrchestrators: 4,
          activeSagaOrchestrators: 4
        }
      };

      res.status(200).json({
        metrics: enhancedMetrics,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to get enhanced metrics',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get saga status across all types
  async getSagaStatus(req: Request, res: Response): Promise<void> {
    const { sagaId } = req.params;
    const { type } = req.query;

    try {
      let sagaState = null;

      if (type) {
        sagaState = await enhancedSagaStateManager.getSagaState(type as string, sagaId);
      } else {
        // Search across all saga types
        const types = ['user-registration', 'bid-placement', 'auction-completion', 'payment-processing'];
        for (const sagaType of types) {
          sagaState = await enhancedSagaStateManager.getSagaState(sagaType, sagaId);
          if (sagaState) break;
        }
      }

      if (!sagaState) {
        res.status(404).json({
          error: 'Saga not found',
          sagaId,
          timestamp: new Date().toISOString()
        });
        return;
      }

      const enhancedStatus = {
        ...sagaState,
        timeRunning: this.calculateTimeRunning(sagaState.startedAt),
        progressPercentage: this.calculateProgressPercentage(sagaState),
        estimatedTimeRemaining: this.estimateTimeRemaining(sagaState),
        healthStatus: this.calculateHealthStatus(sagaState)
      };

      res.status(200).json({
        sagaState: enhancedStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to get saga status',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Retry saga endpoint
  async retrySaga(req: Request, res: Response): Promise<void> {
    const { sagaId } = req.params;
    const { type } = req.body;

    try {
      let orchestrator;
      switch (type) {
        case 'user-registration':
          orchestrator = this.userRegistrationOrchestrator;
          break;
        case 'bid-placement':
          orchestrator = this.bidPlacementOrchestrator;
          break;
        case 'auction-completion':
          orchestrator = this.auctionCompletionOrchestrator;
          break;
        case 'payment-processing':
          orchestrator = this.paymentProcessingOrchestrator;
          break;
        default:
          res.status(400).json({
            error: 'Invalid saga type',
            validTypes: ['user-registration', 'bid-placement', 'auction-completion', 'payment-processing'],
            timestamp: new Date().toISOString()
          });
          return;
      }

      await orchestrator.retrySaga(sagaId);

      res.status(200).json({
        message: 'Saga retry initiated',
        sagaId,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to retry saga',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Cancel saga endpoint
  async cancelSaga(req: Request, res: Response): Promise<void> {
    const { sagaId } = req.params;
    const { type, reason } = req.body;

    try {
      let orchestrator;
      switch (type) {
        case 'user-registration':
          orchestrator = this.userRegistrationOrchestrator;
          break;
        case 'bid-placement':
          orchestrator = this.bidPlacementOrchestrator;
          break;
        case 'auction-completion':
          orchestrator = this.auctionCompletionOrchestrator;
          break;
        case 'payment-processing':
          orchestrator = this.paymentProcessingOrchestrator;
          break;
        default:
          res.status(400).json({
            error: 'Invalid saga type',
            validTypes: ['user-registration', 'bid-placement', 'auction-completion', 'payment-processing'],
            timestamp: new Date().toISOString()
          });
          return;
      }

      await orchestrator.cancelSaga(sagaId);

      res.status(200).json({
        message: 'Saga cancellation initiated',
        sagaId,
        reason: reason || 'Manual cancellation',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to cancel saga',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get stalled sagas
  async getStalledSagas(req: Request, res: Response): Promise<void> {
    try {
      const stalledSagas = await enhancedSagaStateManager.getStalledSagas();
      
      const enhancedStalledSagas = stalledSagas.map(saga => ({
        ...saga,
        timeOverdue: saga.timeoutAt ? this.calculateTimeOverdue(saga.timeoutAt) : 0,
        recommendedAction: this.getRecommendedAction(saga)
      }));

      res.status(200).json({
        stalledSagas: enhancedStalledSagas,
        count: enhancedStalledSagas.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to get stalled sagas',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get saga history and analytics
  async getSagaHistory(req: Request, res: Response): Promise<void> {
    const { type, period = '24h', limit = 100 } = req.query;

    try {
      // This would typically query a time-series database or log aggregation system
      // For now, we'll return a mock response structure
      const history = {
        period: period,
        sagaType: type || 'all',
        totalExecutions: 0, // TODO: Implement actual analytics
        successRate: 0,
        averageExecutionTime: 0,
        failureReasons: [],
        timeline: [], // TODO: Implement timeline data
        trends: {
          executions: [],
          successRate: [],
          averageTime: []
        }
      };

      res.status(200).json({
        history,
        message: 'Saga history analytics (implementation in progress)',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to get saga history',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Bulk operations
  async bulkRetryStalled(req: Request, res: Response): Promise<void> {
    try {
      const stalledSagas = await enhancedSagaStateManager.getStalledSagas();
      const results = [];

      for (const saga of stalledSagas) {
        try {
          let orchestrator;
          switch (saga.sagaType) {
            case 'user-registration':
              orchestrator = this.userRegistrationOrchestrator;
              break;
            case 'bid-placement':
              orchestrator = this.bidPlacementOrchestrator;
              break;
            case 'auction-completion':
              orchestrator = this.auctionCompletionOrchestrator;
              break;
            case 'payment-processing':
              orchestrator = this.paymentProcessingOrchestrator;
              break;
            default:
              continue;
          }

          await orchestrator.retrySaga(saga.sagaId);
          results.push({ sagaId: saga.sagaId, status: 'retry_initiated' });
        } catch (error: any) {
          results.push({ sagaId: saga.sagaId, status: 'retry_failed', error: error.message });
        }
      }

      res.status(200).json({
        message: 'Bulk retry completed',
        results,
        totalProcessed: results.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to retry stalled sagas',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  private calculateTimeRunning(startedAt: string): number {
    return Date.now() - new Date(startedAt).getTime();
  }

  private calculateTimeOverdue(timeoutAt: string): number {
    const timeoutTime = new Date(timeoutAt).getTime();
    const now = Date.now();
    return Math.max(0, now - timeoutTime);
  }

  private calculateProgressPercentage(saga: any): number {
    // This would depend on the saga type and expected steps
    const totalStepsMap: { [key: string]: number } = {
      'user-registration': 4,
      'bid-placement': 6,
      'auction-completion': 7,
      'payment-processing': 6
    };

    const totalSteps = totalStepsMap[saga.sagaType] || 1;
    return Math.round((saga.completedSteps.length / totalSteps) * 100);
  }

  private estimateTimeRemaining(saga: any): number {
    // Simple estimation based on average execution time and progress
    const averageTimeMap: { [key: string]: number } = {
      'user-registration': 30000, // 30 seconds
      'bid-placement': 15000,     // 15 seconds
      'auction-completion': 60000, // 1 minute
      'payment-processing': 45000  // 45 seconds
    };

    const expectedTotalTime = averageTimeMap[saga.sagaType] || 30000;
    const timeRunning = this.calculateTimeRunning(saga.startedAt);
    const progress = this.calculateProgressPercentage(saga) / 100;
    
    if (progress === 0) return expectedTotalTime;
    
    const estimatedTotalTime = timeRunning / progress;
    return Math.max(0, estimatedTotalTime - timeRunning);
  }

  private calculateHealthStatus(saga: any): 'healthy' | 'warning' | 'critical' {
    const timeRunning = this.calculateTimeRunning(saga.startedAt);
    const retryCount = saga.retryCount || 0;
    
    if (retryCount >= 2 || timeRunning > 300000) { // 5 minutes
      return 'critical';
    } else if (retryCount >= 1 || timeRunning > 120000) { // 2 minutes
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  private getRecommendedAction(saga: any): string {
    const retryCount = saga.retryCount || 0;
    const timeOverdue = saga.timeoutAt ? this.calculateTimeOverdue(saga.timeoutAt) : 0;
    
    if (retryCount >= 3) {
      return 'manual_investigation_required';
    } else if (timeOverdue > 600000) { // 10 minutes overdue
      return 'force_cancel';
    } else {
      return 'retry';
    }
  }
}
