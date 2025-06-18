/**
 * Hook for listening to worker status updates from background script
 */

import { useEffect } from 'react';
import { useAppDispatch } from '@/lib/store';
import { setFeedScanningStatus, setFeedBackupStatus } from '@/lib/store/slices/watcherSlice';

interface WorkerStatusUpdate {
  type: string;
  updateType: string;
  data: {
    feedId: string;
    isScanning?: boolean;
    isBacking?: boolean;
    error?: string;
  };
}

export const useWorkerStatus = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleMessage = (message: WorkerStatusUpdate) => {
      if (message.type === 'WORKER_STATUS_UPDATE') {
        const { updateType, data } = message;

        switch (updateType) {
          case 'FEED_SCAN_STATUS':
            dispatch(setFeedScanningStatus({
              feedId: data.feedId,
              isScanning: data.isScanning || false,
              error: data.error,
            }));
            break;

          case 'FEED_BACKUP_STATUS':
            dispatch(setFeedBackupStatus({
              feedId: data.feedId,
              isBacking: data.isBacking || false,
              error: data.error,
            }));
            break;

          default:
            console.log('Unknown worker status update type:', updateType);
        }
      }
    };

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);

    // Cleanup listener on unmount
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [dispatch]);
};
