/**
 * Post-related type definitions for the Feed Watcher
 */

export interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  updated_time?: string;
  from?: {
    id: string;
    name: string;
  };
  attachments?: {
    data: Array<{
      type: string;
      media?: {
        image?: {
          src: string;
        };
      };
      description?: string;
      title?: string;
      url?: string;
    }>;
  };
  reactions?: {
    summary: {
      total_count: number;
    };
  };
  is_broadcast?: boolean;
}

export interface StoredPost {
  id: string;
  feedId: string;
  feedName: string;
  feedType: 'profile' | 'group';
  content: FacebookPost;
  createdAt: string;
  updatedAt: string;
  backedUp: boolean;
  backupPath?: string;
  backupCommitSha?: string;
}

export interface PostScanResult {
  feedId: string;
  feedName: string;
  newPosts: FacebookPost[];
  totalScanned: number;
  errors?: string[];
}

export interface WorkerStatus {
  isRunning: boolean;
  activeFeeds: number;
  lastScanTime: string | null;
  nextScanTimes: Record<string, string>; // feedId -> next scan time
  scanResults: Record<string, PostScanResult>; // feedId -> last scan result
}
