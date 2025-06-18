import {createAsyncThunk, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {chromeStorageAdapter} from '@/lib/store/storage';
import type {StoredPost, WorkerStatus} from '@/lib/types/post';

// Feed interface
export interface Feed {
  id: string;
  name: string;
  type: 'profile' | 'group';
  url: string;
  unitId: string; // Facebook unit ID
  isActive: boolean;
  backupEnabled: boolean;
  backupRepo: string;
  backupInterval: number; // in minutes - how often to scan for new posts
  lastBackup?: string;
  lastScan?: string; // timestamp of last successful scan
  postsCount?: number;
  createdAt: string;
  updatedAt: string;
}

// State interface
export interface WatcherState {
  feeds: Feed[];
  posts: StoredPost[];
  workerStatus: WorkerStatus | null;
  loading: {
    feeds: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    posts: boolean;
    postsForDate: boolean;
    workerStatus: boolean;
    scanning: Record<string, boolean>; // feedId -> scanning status
    backing: Record<string, boolean>; // feedId -> backup status
  };
  error: {
    feeds: string | null;
    create: string | null;
    update: string | null;
    delete: string | null;
    posts: string | null;
    postsForDate: string | null;
    workerStatus: string | null;
    scanning: Record<string, string>; // feedId -> error message
    backing: Record<string, string>; // feedId -> error message
  };
}

// Chrome storage key
const FEEDS_STORAGE_KEY = 'watcher_feeds';

// Helper functions for Chrome storage
const saveFeedsToStorage = async (feeds: Feed[]): Promise<void> => {
  try {
    await chromeStorageAdapter.setItem(FEEDS_STORAGE_KEY, JSON.stringify(feeds));
  } catch (error) {
    console.error('Failed to save feeds to storage:', error);
  }
};

const getFeedsFromStorage = async (): Promise<Feed[]> => {
  try {
    const feedsJson = await chromeStorageAdapter.getItem(FEEDS_STORAGE_KEY);
    return feedsJson ? JSON.parse(feedsJson) : [];
  } catch (error) {
    console.error('Failed to get feeds from storage:', error);
    return [];
  }
};

// Initial state
const initialState: WatcherState = {
  feeds: [],
  posts: [],
  workerStatus: null,
  loading: {
    feeds: false,
    create: false,
    update: false,
    delete: false,
    posts: false,
    postsForDate: false,
    workerStatus: false,
    scanning: {},
    backing: {},
  },
  error: {
    feeds: null,
    create: null,
    update: null,
    delete: null,
    posts: null,
    postsForDate: null,
    workerStatus: null,
    scanning: {},
    backing: {},
  },
};

// Async thunks
export const loadFeeds = createAsyncThunk(
  'watcher/loadFeeds',
  async (_, { rejectWithValue }) => {
    try {
      const feeds = await getFeedsFromStorage();
      return feeds;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load feeds');
    }
  }
);

export const createFeed = createAsyncThunk(
  'watcher/createFeed',
  async (feedData: Omit<Feed, 'id' | 'createdAt' | 'updatedAt'>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { watcher: WatcherState };
      const newFeed: Feed = {
        ...feedData,
        // Ensure backupInterval has a valid default value
        backupInterval: (feedData.backupInterval && feedData.backupInterval > 0) ? feedData.backupInterval : 60,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedFeeds = [...state.watcher.feeds, newFeed];
      await saveFeedsToStorage(updatedFeeds);

      return newFeed;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create feed');
    }
  }
);

export const updateFeed = createAsyncThunk(
  'watcher/updateFeed',
  async (params: { id: string; updates: Partial<Feed> }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { watcher: WatcherState };
      const feedIndex = state.watcher.feeds.findIndex(feed => feed.id === params.id);

      if (feedIndex === -1) {
        return rejectWithValue('Feed not found');
      }

      // Ensure backupInterval is valid if being updated
      const updates = { ...params.updates };
      if (updates.backupInterval !== undefined) {
        updates.backupInterval = (updates.backupInterval && updates.backupInterval > 0) ? updates.backupInterval : 60;
      }

      const updatedFeed = {
        ...state.watcher.feeds[feedIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const updatedFeeds = [...state.watcher.feeds];
      updatedFeeds[feedIndex] = updatedFeed;

      await saveFeedsToStorage(updatedFeeds);

      return updatedFeed;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update feed');
    }
  }
);

export const deleteFeed = createAsyncThunk(
  'watcher/deleteFeed',
  async (feedId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { watcher: WatcherState };
      const updatedFeeds = state.watcher.feeds.filter(feed => feed.id !== feedId);

      await saveFeedsToStorage(updatedFeeds);

      return feedId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete feed');
    }
  }
);

export const toggleFeedActive = createAsyncThunk(
  'watcher/toggleFeedActive',
  async (feedId: string, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { watcher: WatcherState };
      const feed = state.watcher.feeds.find(f => f.id === feedId);

      if (!feed) {
        return rejectWithValue('Feed not found');
      }

      const result = await dispatch(updateFeed({
        id: feedId,
        updates: { isActive: !feed.isActive }
      }));

      return result.payload as Feed;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to toggle feed status');
    }
  }
);

export const toggleFeedBackup = createAsyncThunk(
  'watcher/toggleFeedBackup',
  async (feedId: string, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { watcher: WatcherState };
      const feed = state.watcher.feeds.find(f => f.id === feedId);

      if (!feed) {
        return rejectWithValue('Feed not found');
      }

      const result = await dispatch(updateFeed({
        id: feedId,
        updates: { backupEnabled: !feed.backupEnabled }
      }));

      return result.payload as Feed;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to toggle feed backup');
    }
  }
);

// Posts and Worker Status async thunks
export const loadPosts = createAsyncThunk(
  'watcher/loadPosts',
  async (params: { feedId?: string; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_POSTS',
        feedId: params.feedId,
        limit: params.limit,
      });

      if (response.success) {
        return response.posts;
      } else {
        return rejectWithValue(response.error || 'Failed to load posts');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load posts');
    }
  }
);

export const loadPostsForDate = createAsyncThunk(
  'watcher/loadPostsForDate',
  async (params: { feedId: string; date: string }, { rejectWithValue }) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'LOAD_POSTS_FOR_DATE',
        feedId: params.feedId,
        date: params.date,
      });

      if (response.success) {
        return response.posts;
      } else {
        return rejectWithValue(response.error || 'Failed to load posts for date');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load posts for date');
    }
  }
);

export const loadWorkerStatus = createAsyncThunk(
  'watcher/loadWorkerStatus',
  async (_, { rejectWithValue }) => {
    try {
      return await chrome.runtime.sendMessage({
        type: 'GET_WORKER_STATUS',
      }) as unknown as Promise<WorkerStatus>;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load worker status');
    }
  }
);

export const triggerFeedScan = createAsyncThunk(
  'watcher/triggerFeedScan',
  async (feedId: string, { rejectWithValue }) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRIGGER_FEED_SCAN',
        feedId,
      });

      if (response.success) {
        return response.result;
      } else {
        return rejectWithValue(response.error || 'Failed to trigger feed scan');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to trigger feed scan');
    }
  }
);

export const updatePostsCounts = createAsyncThunk(
  'watcher/updatePostsCounts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_POSTS_COUNTS',
      });

      if (response.success) {
        return true;
      } else {
        return rejectWithValue(response.error || 'Failed to update posts counts');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update posts counts');
    }
  }
);

// Slice
const watcherSlice = createSlice({
  name: 'watcher',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.error = {
        feeds: null,
        create: null,
        update: null,
        delete: null,
        posts: null,
        postsForDate: null,
        workerStatus: null,
        scanning: {},
        backing: {},
      };
    },

    updateFeedLocal: (state, action: PayloadAction<{ id: string; updates: Partial<Feed> }>) => {
      const feedIndex = state.feeds.findIndex(feed => feed.id === action.payload.id);
      if (feedIndex !== -1) {
        state.feeds[feedIndex] = {
          ...state.feeds[feedIndex],
          ...action.payload.updates,
          updatedAt: new Date().toISOString(),
        };
      }
    },

    // Backup status actions
    setFeedScanningStatus: (state, action: PayloadAction<{ feedId: string; isScanning: boolean; error?: string }>) => {
      const { feedId, isScanning, error } = action.payload;
      state.loading.scanning[feedId] = isScanning;
      if (error) {
        state.error.scanning[feedId] = error;
      } else {
        delete state.error.scanning[feedId];
      }
    },

    setFeedBackupStatus: (state, action: PayloadAction<{ feedId: string; isBacking: boolean; error?: string }>) => {
      const { feedId, isBacking, error } = action.payload;
      state.loading.backing[feedId] = isBacking;
      if (error) {
        state.error.backing[feedId] = error;
      } else {
        delete state.error.backing[feedId];
      }
    },

    clearFeedStatus: (state, action: PayloadAction<string>) => {
      const feedId = action.payload;
      delete state.loading.scanning[feedId];
      delete state.loading.backing[feedId];
      delete state.error.scanning[feedId];
      delete state.error.backing[feedId];
    },
  },
  extraReducers: (builder) => {
    // Load Feeds
    builder
      .addCase(loadFeeds.pending, (state) => {
        state.loading.feeds = true;
        state.error.feeds = null;
      })
      .addCase(loadFeeds.fulfilled, (state, action) => {
        state.loading.feeds = false;
        state.feeds = action.payload;
      })
      .addCase(loadFeeds.rejected, (state, action) => {
        state.loading.feeds = false;
        state.error.feeds = action.payload as string;
      });

    // Create Feed
    builder
      .addCase(createFeed.pending, (state) => {
        state.loading.create = true;
        state.error.create = null;
      })
      .addCase(createFeed.fulfilled, (state, action) => {
        state.loading.create = false;
        state.feeds.push(action.payload);
      })
      .addCase(createFeed.rejected, (state, action) => {
        state.loading.create = false;
        state.error.create = action.payload as string;
      });

    // Update Feed
    builder
      .addCase(updateFeed.pending, (state) => {
        state.loading.update = true;
        state.error.update = null;
      })
      .addCase(updateFeed.fulfilled, (state, action) => {
        state.loading.update = false;
        const feedIndex = state.feeds.findIndex(feed => feed.id === action.payload.id);
        if (feedIndex !== -1) {
          state.feeds[feedIndex] = action.payload;
        }
      })
      .addCase(updateFeed.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update = action.payload as string;
      });

    // Delete Feed
    builder
      .addCase(deleteFeed.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
      })
      .addCase(deleteFeed.fulfilled, (state, action) => {
        state.loading.delete = false;
        const feedId = action.payload;
        state.feeds = state.feeds.filter(feed => feed.id !== feedId);

        // Clear loading and error states for deleted feed
        delete state.loading.scanning[feedId];
        delete state.loading.backing[feedId];
        delete state.error.scanning[feedId];
        delete state.error.backing[feedId];
      })
      .addCase(deleteFeed.rejected, (state, action) => {
        state.loading.delete = false;
        state.error.delete = action.payload as string;
      });

    // Toggle Feed Active
    builder
      .addCase(toggleFeedActive.fulfilled, (state, action) => {
        const feedIndex = state.feeds.findIndex(feed => feed.id === action.payload.id);
        if (feedIndex !== -1) {
          state.feeds[feedIndex] = action.payload;
        }
      });

    // Toggle Feed Backup
    builder
      .addCase(toggleFeedBackup.fulfilled, (state, action) => {
        const feedIndex = state.feeds.findIndex(feed => feed.id === action.payload.id);
        if (feedIndex !== -1) {
          state.feeds[feedIndex] = action.payload;
        }
      });

    // Load Posts
    builder
      .addCase(loadPosts.pending, (state) => {
        state.loading.posts = true;
        state.error.posts = null;
      })
      .addCase(loadPosts.fulfilled, (state, action) => {
        state.loading.posts = false;
        state.posts = action.payload;
      })
      .addCase(loadPosts.rejected, (state, action) => {
        state.loading.posts = false;
        state.error.posts = action.payload as string;
      });

    // Load Posts for Date
    builder
      .addCase(loadPostsForDate.pending, (state) => {
        state.loading.postsForDate = true;
        state.error.postsForDate = null;
      })
      .addCase(loadPostsForDate.fulfilled, (state, action) => {
        state.loading.postsForDate = false;
        // Merge the new posts with existing posts, avoiding duplicates
        const newPosts = action.payload;
        const existingPostIds = new Set(state.posts.map(p => p.id));
        const postsToAdd = newPosts.filter(post => !existingPostIds.has(post.id));
        state.posts = [...state.posts, ...postsToAdd];
      })
      .addCase(loadPostsForDate.rejected, (state, action) => {
        state.loading.postsForDate = false;
        state.error.postsForDate = action.payload as string;
      });

    // Load Worker Status
    builder
      .addCase(loadWorkerStatus.pending, (state) => {
        state.loading.workerStatus = true;
        state.error.workerStatus = null;
      })
      .addCase(loadWorkerStatus.fulfilled, (state, action) => {
        state.loading.workerStatus = false;
        state.workerStatus = action.payload;
      })
      .addCase(loadWorkerStatus.rejected, (state, action) => {
        state.loading.workerStatus = false;
        state.error.workerStatus = action.payload as string;
      });

    // Trigger Feed Scan
    builder
      .addCase(triggerFeedScan.pending, (state, action) => {
        // Extract feedId from the action meta
        const feedId = action.meta.arg;
        state.loading.scanning[feedId] = true;
        delete state.error.scanning[feedId];
      })
      .addCase(triggerFeedScan.fulfilled, (state, action) => {
        const feedId = action.payload.feedId;
        state.loading.scanning[feedId] = false;

        // Update worker status with scan result
        if (state.workerStatus) {
          state.workerStatus.scanResults[feedId] = action.payload;
          state.workerStatus.lastScanTime = new Date().toISOString();
        }
      })
      .addCase(triggerFeedScan.rejected, (state, action) => {
        const feedId = action.meta.arg;
        state.loading.scanning[feedId] = false;
        state.error.scanning[feedId] = action.payload as string || 'Scan failed';
      });

    // Update Posts Counts
    builder
      .addCase(updatePostsCounts.fulfilled, (state) => {
        // After updating posts counts, reload feeds to get updated counts
        // This will be handled by the component calling loadFeeds after updatePostsCounts
      });
  },
});

export const {
  clearErrors,
  updateFeedLocal,
  setFeedScanningStatus,
  setFeedBackupStatus,
  clearFeedStatus
} = watcherSlice.actions;
export default watcherSlice.reducer;
