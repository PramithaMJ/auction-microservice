import { BidPlacementSagaOrchestrator } from '../bid-placement-saga-orchestrator';
import { enhancedSagaStateManager } from '../enhanced-saga-state-manager';
import { natsWrapper } from '../nats-wrapper';

// Mock dependencies
jest.mock('../enhanced-saga-state-manager');
jest.mock('../nats-wrapper');

describe('BidPlacementSagaOrchestrator', () => {
  let orchestrator: BidPlacementSagaOrchestrator;
  
  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new BidPlacementSagaOrchestrator();
  });

  describe('startSaga', () => {
    it('should start bid placement saga successfully', async () => {
      const request = {
        bidId: 'bid-123',
        userId: 'user-123',
        listingId: 'listing-123',
        bidAmount: 1000,
        userEmail: 'test@example.com'
      };

      const mockSagaId = 'saga-123';
      (enhancedSagaStateManager.saveSagaState as jest.Mock).mockResolvedValue(undefined);
      (natsWrapper.client.publish as jest.Mock).mockResolvedValue(undefined);

      // Mock uuid to return predictable value
      const mockUuidv4 = jest.fn().mockReturnValue(mockSagaId);
      jest.doMock('uuid', () => ({ v4: mockUuidv4 }));

      const sagaId = await orchestrator.startSaga(request);

      expect(sagaId).toBe(mockSagaId);
      expect(enhancedSagaStateManager.saveSagaState).toHaveBeenCalledWith(
        expect.objectContaining({
          sagaId: mockSagaId,
          sagaType: 'bid-placement',
          userId: request.userId,
          userEmail: request.userEmail,
          state: 'STARTED',
          priority: 'high',
          metadata: expect.objectContaining({
            bidId: request.bidId,
            listingId: request.listingId,
            bidAmount: request.bidAmount
          })
        })
      );
    });

    it('should handle saga start failure', async () => {
      const request = {
        bidId: 'bid-123',
        userId: 'user-123',
        listingId: 'listing-123',
        bidAmount: 1000,
        userEmail: 'test@example.com'
      };

      const error = new Error('Failed to save saga state');
      (enhancedSagaStateManager.saveSagaState as jest.Mock).mockRejectedValue(error);
      (enhancedSagaStateManager.markSagaAsFailed as jest.Mock).mockResolvedValue(undefined);

      await expect(orchestrator.startSaga(request)).rejects.toThrow(error);
      expect(enhancedSagaStateManager.markSagaAsFailed).toHaveBeenCalled();
    });
  });

  describe('retrySaga', () => {
    it('should retry saga successfully', async () => {
      const sagaId = 'saga-123';
      const mockSaga = {
        sagaId,
        sagaType: 'bid-placement',
        state: 'BID_VALIDATED',
        retryCount: 1,
        metadata: { bidId: 'bid-123' }
      };

      (enhancedSagaStateManager.getSagaState as jest.Mock).mockResolvedValue(mockSaga);
      (enhancedSagaStateManager.incrementRetryCount as jest.Mock).mockResolvedValue(true);

      await orchestrator.retrySaga(sagaId);

      expect(enhancedSagaStateManager.incrementRetryCount).toHaveBeenCalledWith('bid-placement', sagaId);
    });

    it('should throw error when saga not found', async () => {
      const sagaId = 'non-existent-saga';
      (enhancedSagaStateManager.getSagaState as jest.Mock).mockResolvedValue(null);

      await expect(orchestrator.retrySaga(sagaId)).rejects.toThrow(`Saga ${sagaId} not found`);
    });

    it('should throw error when max retries exceeded', async () => {
      const sagaId = 'saga-123';
      const mockSaga = { sagaId, retryCount: 3 };

      (enhancedSagaStateManager.getSagaState as jest.Mock).mockResolvedValue(mockSaga);
      (enhancedSagaStateManager.incrementRetryCount as jest.Mock).mockResolvedValue(false);

      await expect(orchestrator.retrySaga(sagaId)).rejects.toThrow(`Saga ${sagaId} has exceeded maximum retry attempts`);
    });
  });

  describe('cancelSaga', () => {
    it('should cancel saga successfully', async () => {
      const sagaId = 'saga-123';
      const mockSaga = {
        sagaId,
        sagaType: 'bid-placement',
        state: 'BID_VALIDATED',
        completedSteps: ['BID_VALIDATED']
      };

      (enhancedSagaStateManager.getSagaState as jest.Mock).mockResolvedValue(mockSaga);
      (enhancedSagaStateManager.saveSagaState as jest.Mock).mockResolvedValue(undefined);
      (enhancedSagaStateManager.cancelSaga as jest.Mock).mockResolvedValue(true);
      (natsWrapper.client.publish as jest.Mock).mockResolvedValue(undefined);

      await orchestrator.cancelSaga(sagaId);

      expect(enhancedSagaStateManager.cancelSaga).toHaveBeenCalledWith('bid-placement', sagaId);
    });

    it('should throw error when trying to cancel completed saga', async () => {
      const sagaId = 'saga-123';
      const mockSaga = {
        sagaId,
        state: 'COMPLETED'
      };

      (enhancedSagaStateManager.getSagaState as jest.Mock).mockResolvedValue(mockSaga);

      await expect(orchestrator.cancelSaga(sagaId)).rejects.toThrow(`Cannot cancel completed saga ${sagaId}`);
    });
  });

  describe('handleTimeout', () => {
    it('should handle timeout and mark saga as failed', async () => {
      const sagaId = 'saga-123';
      const mockSaga = {
        sagaId,
        sagaType: 'bid-placement',
        state: 'BID_VALIDATED',
        completedSteps: ['BID_VALIDATED']
      };

      (enhancedSagaStateManager.getSagaState as jest.Mock).mockResolvedValue(mockSaga);
      (enhancedSagaStateManager.saveSagaState as jest.Mock).mockResolvedValue(undefined);
      (enhancedSagaStateManager.markSagaAsFailed as jest.Mock).mockResolvedValue(undefined);
      (natsWrapper.client.publish as jest.Mock).mockResolvedValue(undefined);

      await orchestrator.handleTimeout(sagaId);

      expect(enhancedSagaStateManager.markSagaAsFailed).toHaveBeenCalledWith(
        'bid-placement',
        sagaId,
        'Saga timeout'
      );
    });
  });

  describe('getAllActiveSagas', () => {
    it('should return only bid placement sagas', async () => {
      const allSagas = [
        { sagaId: 'saga-1', sagaType: 'bid-placement' },
        { sagaId: 'saga-2', sagaType: 'user-registration' },
        { sagaId: 'saga-3', sagaType: 'bid-placement' }
      ];

      (enhancedSagaStateManager.getAllActiveSagas as jest.Mock).mockResolvedValue(allSagas);

      const result = await orchestrator.getAllActiveSagas();

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { sagaId: 'saga-1', sagaType: 'bid-placement' },
        { sagaId: 'saga-3', sagaType: 'bid-placement' }
      ]);
    });
  });
});
