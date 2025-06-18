import {fbService} from './fb.service';
import githubService from './github.service';
import {chromeStorageAdapter} from '@/lib/store/storage';
import type {Feed} from '@/lib/store/slices/watcherSlice';
import type {FacebookPost, PostScanResult, StoredPost, WorkerStatus} from '@/lib/types/post';

const POSTS_STORAGE_KEY = 'feed_posts';
const WORKER_STATUS_KEY = 'worker_status';
const FEEDS_STORAGE_KEY = 'watcher_feeds';
const GITHUB_TOKEN_KEY = 'github_token';

class WorkerService {
  private mainLoopInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private isScanning = false;
  private status: WorkerStatus = {
    isRunning: false,
    activeFeeds: 0,
    lastScanTime: null,
    nextScanTimes: {},
    scanResults: {},
  };

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadStatus();
      await this.updateAllFeedsPostsCounts();
      this.startMainLoop();
      this.status.isRunning = true;
      await this.saveStatus();
      this.isInitialized = true;
    } catch (error) {
      throw error;
    }
  }

  private startMainLoop(): void {
    this.mainLoopInterval = setInterval(async () => {
      await this.runMainLoop();
    }, 60 * 1000);

    setTimeout(() => this.runMainLoop(), 1000);
  }

  private async runMainLoop(): Promise<void> {
    if (this.isScanning) {
      return;
    }

    try {
      this.isScanning = true;
      const feeds = await this.getFeeds();
      const activeFeeds = feeds.filter(feed => feed.isActive);
      this.status.activeFeeds = activeFeeds.length;

      if (activeFeeds.length === 0) {
        return;
      }

      const now = new Date();
      for (const feed of activeFeeds) {
        await this.checkAndScanFeed(feed, now);
      }

      await this.saveStatus();
    } catch (error) {
    } finally {
      this.isScanning = false;
    }
  }

  private async checkAndScanFeed(feed: Feed, now: Date): Promise<void> {
    try {
      const intervalMinutes = (feed.backupInterval && feed.backupInterval > 0) ? feed.backupInterval : 60;
      let nextScanTime: Date;

      if (feed.lastScan) {
        const lastScanTime = new Date(feed.lastScan);
        nextScanTime = new Date(lastScanTime.getTime() + (intervalMinutes * 60 * 1000));
      } else {
        nextScanTime = new Date(now.getTime() - 1000);
      }

      this.status.nextScanTimes[feed.id] = nextScanTime.toISOString();

      if (now >= nextScanTime) {
        await this.scanFeed(feed);
      }
    } catch (error) {
    }
  }

  async scanFeed(feed: Feed): Promise<PostScanResult> {
    const signedIn = await fbService.isFbSignedIn();
    if (!signedIn) {
      return {
        feedId: feed.id,
        feedName: feed.name,
        newPosts: [],
        totalScanned: 0,
        errors: ['Not signed in to Facebook']
      };
    }

    this.notifyUI('FEED_SCAN_STATUS', {feedId: feed.id, isScanning: true});

    const result: PostScanResult = {
      feedId: feed.id,
      feedName: feed.name,
      newPosts: [],
      totalScanned: 0,
      errors: [],
    };

    const scanStartTime = new Date();

    try {
      if (!fbService.fbId || !fbService.dtsg) {
        await fbService.authenticate();
      }

      const until = Math.floor(scanStartTime.getTime() / 1000);
      let since: number | undefined;

      if (feed.lastScan) {
        since = Math.floor(new Date(feed.lastScan).getTime() / 1000);
      } else {
        since = until - (24 * 60 * 60);
      }

      const posts: FacebookPost[] = await fbService.getPosts(feed.unitId, 10, since, until, feed.type);
      result.totalScanned = posts.length;

      const existingPosts = await this.getStoredPosts(feed.id);
      const existingPostIds = new Set(existingPosts.map(p => p.content.id));

      const newPosts = posts.filter(post => !existingPostIds.has(post.id));
      result.newPosts = newPosts;

      // Store new posts
      for (const post of newPosts) {
        const storedPost: StoredPost = {
          id: `${feed.id}_${post.id}`,
          feedId: feed.id,
          feedName: feed.name,
          feedType: feed.type,
          content: post,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          backedUp: false,
        };

        await this.storePost(storedPost);

        if (feed.backupEnabled && feed.backupRepo) {
          try {
            this.notifyUI('FEED_BACKUP_STATUS', {feedId: feed.id, isBacking: true});
            await this.backupPostToGitHub(storedPost, feed);
            this.notifyUI('FEED_BACKUP_STATUS', {feedId: feed.id, isBacking: false});
          } catch (error) {
            result.errors = result.errors || [];
            result.errors.push(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            this.notifyUI('FEED_BACKUP_STATUS', {
              feedId: feed.id,
              isBacking: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      if (newPosts.length > 0) {
        await this.updateFeedLastBackup(feed.id);
      }

      await this.updateFeedLastScan(feed.id, scanStartTime.toISOString());
      await this.updateFeedPostsCount(feed.id);

      this.status.lastScanTime = new Date().toISOString();
      this.status.scanResults[feed.id] = result;

      this.notifyUI('FEED_SCAN_STATUS', {feedId: feed.id, isScanning: false});
      return result;

    } catch (error) {
      result.errors = [error instanceof Error ? error.message : 'Unknown error'];
      this.status.scanResults[feed.id] = result;

      try {
        await this.updateFeedLastScan(feed.id, scanStartTime.toISOString());
        await this.updateFeedPostsCount(feed.id);
      } catch (updateError) {
      }

      this.notifyUI('FEED_SCAN_STATUS', {
        feedId: feed.id,
        isScanning: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  async backupPostToGitHub(post: StoredPost, feed: Feed): Promise<void> {
    try {
      const token = await chromeStorageAdapter.getItem(GITHUB_TOKEN_KEY);
      if (!token) {
        throw new Error('No GitHub token available');
      }

      githubService.setToken(token);

      const [owner, repo] = feed.backupRepo.split('/');
      if (!owner || !repo) {
        throw new Error('Invalid repository format. Expected: owner/repo');
      }

      if (!post.content.from) {
        post.content.from = {
          id: "0",
          name: "Anonymous Member"
        };
      } else {
        if (!post.content.from.id) {
          post.content.from.id = "0";
        }
        if (!post.content.from.name) {
          post.content.from.name = "Anonymous Member";
        }
      }

      const mdxContent = this.generateMDXContent(post);
      const fileName = this.generateFileName(post);
      const filePath = `posts/${feed.name.toLowerCase().replace(/\s+/g, '-')}/${fileName}`;

      const authorName = post.content.from.name;
      const response = await githubService.createMDXFile(
        owner,
        repo,
        filePath,
        mdxContent,
        `Add post from ${feed.name} by ${authorName}: ${post.content.id}`,
        {
          author: {
            name: 'FeedWatcher Bot',
            email: 'feedwatcher@bot.local',
          },
        }
      );

      post.backedUp = true;
      post.backupPath = filePath;
      post.backupCommitSha = response.commit.sha;
      post.updatedAt = new Date().toISOString();

      await this.storePost(post);
    } catch (error) {
      throw error;
    }
  }

  private generateMDXContent(post: StoredPost): string {
    const {content} = post;
    const createdDate = new Date(content.created_time);
    const authorName = content.from?.name || 'Anonymous Member';
    const authorId = content.from?.id || '0';

    let mdx = `---
title: "Post from ${authorName}"
author: "${authorName}"
authorId: "${authorId}"
date: "${content.created_time}"
feedName: "${post.feedName}"
feedType: "${post.feedType}"
postId: "${content.id}"
reactions: ${content.reactions?.summary?.total_count || 0}
---

# Post from ${authorName}

**Date:** ${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString()}
**Feed:** ${post.feedName} (${post.feedType})
**Post ID:** ${content.id}
**Author:** ${authorName} (${authorId})

`;

    if (content.message) {
      mdx += `## Content

${content.message}

`;
    }

    if (content.attachments?.data?.length) {
      mdx += `## Attachments

`;
      content.attachments.data.forEach((attachment, index) => {
        mdx += `### Attachment ${index + 1}
- **Type:** ${attachment.type}
`;
        if (attachment.title) mdx += `- **Title:** ${attachment.title}\n`;
        if (attachment.description) mdx += `- **Description:** ${attachment.description}\n`;
        if (attachment.url) mdx += `- **URL:** ${attachment.url}\n`;
        if (attachment.media?.image?.src) mdx += `- **Image:** ${attachment.media.image.src}\n`;
        mdx += '\n';
      });
    }

    if (content.reactions?.summary?.total_count) {
      mdx += `## Engagement

**Total Reactions:** ${content.reactions.summary.total_count}

`;
    }

    mdx += `---
*Backed up by FeedWatcher on ${new Date().toISOString()}*
`;

    return mdx;
  }

  private generateFileName(post: StoredPost): string {
    const date = new Date(post.content.created_time);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    const authorName = post.content.from?.name || 'anonymous-member';
    const safeAuthorName = authorName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
    return `${dateStr}_${timeStr}_${safeAuthorName}_${post.content.id}.mdx`;
  }

  async storePost(post: StoredPost): Promise<void> {
    try {
      const existingPosts = await this.getAllStoredPosts();
      const updatedPosts = existingPosts.filter(p => p.id !== post.id);
      updatedPosts.push(post);
      await chromeStorageAdapter.setItem(POSTS_STORAGE_KEY, JSON.stringify(updatedPosts));
    } catch (error) {
      throw error;
    }
  }

  async getStoredPosts(feedId: string): Promise<StoredPost[]> {
    try {
      const allPosts = await this.getAllStoredPosts();
      return allPosts.filter(post => post.feedId === feedId);
    } catch (error) {
      return [];
    }
  }

  async getAllStoredPosts(): Promise<StoredPost[]> {
    try {
      const postsJson = await chromeStorageAdapter.getItem(POSTS_STORAGE_KEY);
      return postsJson ? JSON.parse(postsJson) : [];
    } catch (error) {
      return [];
    }
  }

  async getFeeds(): Promise<Feed[]> {
    try {
      const feedsJson = await chromeStorageAdapter.getItem(FEEDS_STORAGE_KEY);
      return feedsJson ? JSON.parse(feedsJson) : [];
    } catch (error) {
      return [];
    }
  }


  async updateFeedLastBackup(feedId: string): Promise<void> {
    try {
      const feeds = await this.getFeeds();
      const feedIndex = feeds.findIndex(f => f.id === feedId);

      if (feedIndex !== -1) {
        feeds[feedIndex].lastBackup = new Date().toISOString();
        await chromeStorageAdapter.setItem(FEEDS_STORAGE_KEY, JSON.stringify(feeds));
      }
    } catch (error) {
    }
  }

  async updateFeedLastScan(feedId: string, scanTime: string): Promise<void> {
    try {
      const feeds = await this.getFeeds();
      const feedIndex = feeds.findIndex(f => f.id === feedId);

      if (feedIndex !== -1) {
        feeds[feedIndex].lastScan = scanTime;
        await chromeStorageAdapter.setItem(FEEDS_STORAGE_KEY, JSON.stringify(feeds));
      }
    } catch (error) {
    }
  }

  async updateFeedPostsCount(feedId: string): Promise<void> {
    try {
      const feeds = await this.getFeeds();
      const feedIndex = feeds.findIndex(f => f.id === feedId);

      if (feedIndex !== -1) {
        const posts = await this.getStoredPosts(feedId);
        const postsCount = posts.length;
        feeds[feedIndex].postsCount = postsCount;
        await chromeStorageAdapter.setItem(FEEDS_STORAGE_KEY, JSON.stringify(feeds));
      }
    } catch (error) {
    }
  }

  async updateAllFeedsPostsCounts(): Promise<void> {
    try {
      const feeds = await this.getFeeds();
      let updated = false;

      for (let i = 0; i < feeds.length; i++) {
        const posts = await this.getStoredPosts(feeds[i].id);
        const postsCount = posts.length;

        if (feeds[i].postsCount !== postsCount) {
          feeds[i].postsCount = postsCount;
          updated = true;
        }
      }

      if (updated) {
        await chromeStorageAdapter.setItem(FEEDS_STORAGE_KEY, JSON.stringify(feeds));
      }
    } catch (error) {
    }
  }

  async loadStatus(): Promise<void> {
    try {
      const statusJson = await chromeStorageAdapter.getItem(WORKER_STATUS_KEY);
      if (statusJson) {
        this.status = {...this.status, ...JSON.parse(statusJson)};
      }
    } catch (error) {
    }
  }

  async saveStatus(): Promise<void> {
    try {
      await chromeStorageAdapter.setItem(WORKER_STATUS_KEY, JSON.stringify(this.status));
    } catch (error) {
    }
  }

  getStatus(): WorkerStatus {
    return {...this.status};
  }

  async updateFeedConfiguration(feeds: Feed[]): Promise<void> {
    const activeFeeds = feeds.filter(feed => feed.isActive);
    this.status.activeFeeds = activeFeeds.length;
    await this.saveStatus();
  }

  async shutdown(): Promise<void> {
    if (this.mainLoopInterval) {
      clearInterval(this.mainLoopInterval);
      this.mainLoopInterval = null;
    }

    this.status.isRunning = false;
    this.status.activeFeeds = 0;
    this.status.nextScanTimes = {};
    this.status.scanResults = {};
    await this.saveStatus();
    this.isInitialized = false;
  }

  async triggerFeedScan(feedId: string): Promise<PostScanResult> {
    const feeds = await this.getFeeds();
    const feed = feeds.find(f => f.id === feedId);

    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`);
    }

    return await this.scanFeed(feed);
  }

  async getPostsForDashboard(feedId?: string, limit?: number): Promise<StoredPost[]> {
    try {
      let posts = feedId ? await this.getStoredPosts(feedId) : await this.getAllStoredPosts();
      posts.sort((a, b) => new Date(b.content.created_time).getTime() - new Date(a.content.created_time).getTime());

      if (limit && limit > 0) {
        posts = posts.slice(0, limit);
      }

      return posts;
    } catch (error) {
      return [];
    }
  }

  async loadPostsForDate(feedId: string, date: string): Promise<StoredPost[]> {
    try {
      const feeds = await this.getFeeds();
      const feed = feeds.find(f => f.id === feedId);
      if (!feed) {
        throw new Error('Feed not found');
      }

      if (!fbService.fbId || !fbService.dtsg) {
        await fbService.authenticate();
      }

      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const since = Math.floor(startOfDay.getTime() / 1000);
      const until = Math.floor(endOfDay.getTime() / 1000);

      const posts: FacebookPost[] = await fbService.getPosts(feed.unitId, 100, since, until, feed.type);
      const existingPosts = await this.getStoredPosts(feed.id);
      const existingPostIds = new Set(existingPosts.map(p => p.content.id));
      const newPosts = posts.filter(post => !existingPostIds.has(post.id));

      for (const post of newPosts) {
        const storedPost: StoredPost = {
          id: `${feed.id}_${post.id}`,
          feedId: feed.id,
          feedName: feed.name,
          feedType: feed.type,
          content: post,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          backedUp: false,
        };

        await this.storePost(storedPost);
      }

      await this.updateFeedPostsCount(feed.id);

      const allPostsForFeed = await this.getStoredPosts(feed.id);
      const postsForDate = allPostsForFeed.filter(post => {
        const postDate = new Date(post.content.created_time).toISOString().split('T')[0];
        return postDate === date;
      });

      postsForDate.sort((a, b) => new Date(b.content.created_time).getTime() - new Date(a.content.created_time).getTime());
      return postsForDate;
    } catch (error) {
      throw error;
    }
  }

  async deletePostsForFeed(feedId: string): Promise<void> {
    try {
      const allPosts = await this.getAllStoredPosts();
      const filteredPosts = allPosts.filter(post => post.feedId !== feedId);
      await chromeStorageAdapter.setItem(POSTS_STORAGE_KEY, JSON.stringify(filteredPosts));
      await this.updateFeedPostsCount(feedId);
    } catch (error) {
    }
  }

  private notifyUI(type: string, data: any): void {
    try {
      chrome.runtime.sendMessage({
        type: 'WORKER_STATUS_UPDATE',
        updateType: type,
        data,
      }).catch(() => {
      });
    } catch (error) {
    }
  }

  getFeedBackupStatus(feedId: string): { isScanning: boolean; isBacking: boolean } {
    return {
      isScanning: false,
      isBacking: false,
    };
  }

  isFeedBeingWatched(feedId: string): boolean {
    return this.status.isRunning;
  }

  getNextScanTime(feedId: string): string | null {
    return this.status.nextScanTimes[feedId] || null;
  }
}

export const workerService = new WorkerService();
