/**
 * Background Communication Service
 * Provides utilities for communicating with the background script
 */

import type {PostScanResult, StoredPost, WorkerStatus} from '@/lib/types/post';

export interface BackgroundMessage {
  type: string;
  [key: string]: any;
}

export interface BackgroundResponse {
  success: boolean;
  error?: string;
  [key: string]: any;
}

class BackgroundCommunicationService {
  /**
   * Send a message to the background script
   */
  private async sendMessage(message: BackgroundMessage): Promise<BackgroundResponse> {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (error) {
      console.error('Failed to send message to background script:', error);
      throw new Error('Failed to communicate with background script');
    }
  }

  /**
   * Get current worker status
   */
  async getWorkerStatus(): Promise<WorkerStatus> {
    return await this.sendMessage({type: 'GET_WORKER_STATUS'}) as unknown as Promise<WorkerStatus>;
  }

  /**
   * Trigger a manual scan for a specific feed
   */
  async triggerFeedScan(feedId: string): Promise<PostScanResult> {
    const response = await this.sendMessage({
      type: 'TRIGGER_FEED_SCAN',
      feedId,
    });

    if (response.success) {
      return response.result;
    } else {
      throw new Error(response.error || 'Failed to trigger feed scan');
    }
  }

  /**
   * Get posts for dashboard display
   */
  async getPosts(feedId?: string, limit?: number): Promise<StoredPost[]> {
    const response = await this.sendMessage({
      type: 'GET_POSTS',
      feedId,
      limit,
    });

    if (response.success) {
      return response.posts;
    } else {
      throw new Error(response.error || 'Failed to get posts');
    }
  }

  /**
   * Check if background script is available
   */
  async isBackgroundAvailable(): Promise<boolean> {
    try {
      await this.getWorkerStatus();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const backgroundCommunicationService = new BackgroundCommunicationService();
