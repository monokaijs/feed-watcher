import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import githubService, { GitHubUser, GitHubRepo, GitHubCommit, TokenValidationResult } from '@/lib/services/github.service';
import { chromeStorageAdapter } from '@/lib/store/storage';

// Chrome storage keys
const GITHUB_TOKEN_KEY = 'github_token';

// Helper functions for Chrome storage
const saveTokenToStorage = async (token: string): Promise<void> => {
  try {
    await chromeStorageAdapter.setItem(GITHUB_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save GitHub token to storage:', error);
  }
};

const getTokenFromStorage = async (): Promise<string | null> => {
  try {
    return await chromeStorageAdapter.getItem(GITHUB_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get GitHub token from storage:', error);
    return null;
  }
};

const removeTokenFromStorage = async (): Promise<void> => {
  try {
    await chromeStorageAdapter.removeItem(GITHUB_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to remove GitHub token from storage:', error);
  }
};

// Helper to ensure token is set in service before API calls
const ensureTokenInService = async (): Promise<string | null> => {
  const token = await getTokenFromStorage();
  if (token) {
    githubService.setToken(token);
  }
  return token;
};

export interface GitHubState {
  // Authentication
  token: string | null;
  isAuthenticated: boolean;
  user: GitHubUser | null;
  tokenValidation: TokenValidationResult | null;

  // Repositories
  repositories: GitHubRepo[];
  selectedRepository: GitHubRepo | null;
  repositoryCommits: GitHubCommit[];
  searchResults: {
    items: GitHubRepo[];
    total_count: number;
  } | null;

  // UI State
  loading: {
    validateToken: boolean;
    repositories: boolean;
    commits: boolean;
    search: boolean;
  };

  error: {
    validateToken: string | null;
    repositories: string | null;
    commits: string | null;
    search: string | null;
  };

  // Pagination
  pagination: {
    repositories: {
      page: number;
      per_page: number;
      hasMore: boolean;
    };
    commits: {
      page: number;
      per_page: number;
      hasMore: boolean;
    };
    search: {
      page: number;
      per_page: number;
      hasMore: boolean;
    };
  };
}

const initialState: GitHubState = {
  token: null, // Will be loaded from Chrome storage
  isAuthenticated: false,
  user: null,
  tokenValidation: null,
  repositories: [],
  selectedRepository: null,
  repositoryCommits: [],
  searchResults: null,
  loading: {
    validateToken: false,
    repositories: false,
    commits: false,
    search: false,
  },
  error: {
    validateToken: null,
    repositories: null,
    commits: null,
    search: null,
  },
  pagination: {
    repositories: {
      page: 1,
      per_page: 30,
      hasMore: true,
    },
    commits: {
      page: 1,
      per_page: 30,
      hasMore: true,
    },
    search: {
      page: 1,
      per_page: 30,
      hasMore: true,
    },
  },
};

// Async Thunks
export const validateToken = createAsyncThunk(
  'github/validateToken',
  async (token: string, { rejectWithValue }) => {
    try {
      const result = await githubService.validateToken(token);
      if (result.valid) {
        githubService.setToken(token);
        await saveTokenToStorage(token);
      }
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to validate token');
    }
  }
);

export const loadTokenFromStorage = createAsyncThunk(
  'github/loadTokenFromStorage',
  async (_, { rejectWithValue }) => {
    try {
      const token = await getTokenFromStorage();
      if (token) {
        // Validate the stored token
        const result = await githubService.validateToken(token);
        if (result.valid) {
          githubService.setToken(token);
          return { token, ...result };
        } else {
          // Token is invalid, remove it from storage
          await removeTokenFromStorage();
          return rejectWithValue('Stored token is invalid');
        }
      }
      return rejectWithValue('No token found in storage');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load token from storage');
    }
  }
);

export const fetchRepositories = createAsyncThunk(
  'github/fetchRepositories',
  async (options: {
    type?: 'all' | 'owner' | 'public' | 'private' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
    append?: boolean;
  } | undefined = {}, { rejectWithValue }) => {
    try {
      const token = await ensureTokenInService();
      if (!token) {
        return rejectWithValue('No GitHub token available');
      }
      const repositories = await githubService.listRepositories(options);
      return { repositories, append: options.append || false };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch repositories');
    }
  }
);

export const searchRepositories = createAsyncThunk(
  'github/searchRepositories',
  async (params: {
    query: string;
    sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
    order?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
    append?: boolean;
  }, { rejectWithValue }) => {
    console.log('searching', params);
    try {
      const token = await ensureTokenInService();
      if (!token) {
        return rejectWithValue('No GitHub token available');
      }
      const result = await githubService.searchRepositories(params.query, params);
      return { ...result, append: params.append || false };
    } catch (error: any) {
      console.log('failed to search', error);
      return rejectWithValue(error.message || 'Failed to search repositories');
    }
  }
);

export const fetchRepositoryCommits = createAsyncThunk(
  'github/fetchRepositoryCommits',
  async (params: {
    owner: string;
    repo: string;
    sha?: string;
    path?: string;
    author?: string;
    since?: string;
    until?: string;
    page?: number;
    per_page?: number;
    append?: boolean;
  }, { rejectWithValue }) => {
    try {
      const token = await ensureTokenInService();
      if (!token) {
        return rejectWithValue('No GitHub token available');
      }
      const commits = await githubService.getRepositoryCommits(params.owner, params.repo, params);
      return { commits, append: params.append || false };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch commits');
    }
  }
);

export const fetchRepositoryDetails = createAsyncThunk(
  'github/fetchRepositoryDetails',
  async (params: { owner: string; repo: string }, { rejectWithValue }) => {
    try {
      const token = await ensureTokenInService();
      if (!token) {
        return rejectWithValue('No GitHub token available');
      }
      const repository = await githubService.getRepository(params.owner, params.repo);
      return repository;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch repository details');
    }
  }
);

const githubSlice = createSlice({
  name: 'github',
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      githubService.setToken(action.payload);
      // Save to Chrome storage asynchronously
      saveTokenToStorage(action.payload);
    },

    clearToken: (state) => {
      state.token = null;
      state.isAuthenticated = false;
      state.user = null;
      state.tokenValidation = null;
      state.repositories = [];
      state.selectedRepository = null;
      state.repositoryCommits = [];
      state.searchResults = null;
      githubService.clearToken();
      // Remove from Chrome storage asynchronously
      removeTokenFromStorage();
    },

    setSelectedRepository: (state, action: PayloadAction<GitHubRepo | null>) => {
      state.selectedRepository = action.payload;
      state.repositoryCommits = [];
      state.pagination.commits.page = 1;
      state.pagination.commits.hasMore = true;
    },

    clearRepositories: (state) => {
      state.repositories = [];
      state.pagination.repositories.page = 1;
      state.pagination.repositories.hasMore = true;
    },

    clearSearchResults: (state) => {
      state.searchResults = null;
      state.pagination.search.page = 1;
      state.pagination.search.hasMore = true;
    },

    clearCommits: (state) => {
      state.repositoryCommits = [];
      state.pagination.commits.page = 1;
      state.pagination.commits.hasMore = true;
    },

    clearErrors: (state) => {
      state.error = {
        validateToken: null,
        repositories: null,
        commits: null,
        search: null,
      };
    },
  },
  extraReducers: (builder) => {
    // Validate Token
    builder
      .addCase(validateToken.pending, (state) => {
        state.loading.validateToken = true;
        state.error.validateToken = null;
      })
      .addCase(validateToken.fulfilled, (state, action) => {
        state.loading.validateToken = false;
        state.tokenValidation = action.payload;
        if (action.payload.valid) {
          state.isAuthenticated = true;
          state.user = action.payload.user || null;
        } else {
          state.isAuthenticated = false;
          state.user = null;
        }
      })
      .addCase(validateToken.rejected, (state, action) => {
        state.loading.validateToken = false;
        state.error.validateToken = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
      });

    // Load Token from Storage
    builder
      .addCase(loadTokenFromStorage.pending, (state) => {
        state.loading.validateToken = true;
        state.error.validateToken = null;
      })
      .addCase(loadTokenFromStorage.fulfilled, (state, action) => {
        state.loading.validateToken = false;
        state.token = action.payload.token;
        state.tokenValidation = action.payload;
        state.isAuthenticated = true;
        state.user = action.payload.user || null;
      })
      .addCase(loadTokenFromStorage.rejected, (state, action) => {
        state.loading.validateToken = false;
        state.error.validateToken = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });

    // Fetch Repositories
    builder
      .addCase(fetchRepositories.pending, (state) => {
        state.loading.repositories = true;
        state.error.repositories = null;
      })
      .addCase(fetchRepositories.fulfilled, (state, action) => {
        state.loading.repositories = false;
        if (action.payload.append) {
          state.repositories.push(...action.payload.repositories);
        } else {
          state.repositories = action.payload.repositories;
        }
        state.pagination.repositories.hasMore = action.payload.repositories.length === state.pagination.repositories.per_page;
      })
      .addCase(fetchRepositories.rejected, (state, action) => {
        state.loading.repositories = false;
        state.error.repositories = action.payload as string;
      });

    // Search Repositories
    builder
      .addCase(searchRepositories.pending, (state) => {
        state.loading.search = true;
        state.error.search = null;
      })
      .addCase(searchRepositories.fulfilled, (state, action) => {
        state.loading.search = false;
        if (action.payload.append) {
          state.searchResults = {
            items: [...(state.searchResults?.items || []), ...action.payload.items],
            total_count: action.payload.total_count,
          };
        } else {
          state.searchResults = {
            items: action.payload.items,
            total_count: action.payload.total_count,
          };
        }
        state.pagination.search.hasMore = action.payload.items.length === state.pagination.search.per_page;
      })
      .addCase(searchRepositories.rejected, (state, action) => {
        state.loading.search = false;
        state.error.search = action.payload as string;
      });

    // Fetch Repository Commits
    builder
      .addCase(fetchRepositoryCommits.pending, (state) => {
        state.loading.commits = true;
        state.error.commits = null;
      })
      .addCase(fetchRepositoryCommits.fulfilled, (state, action) => {
        state.loading.commits = false;
        if (action.payload.append) {
          state.repositoryCommits.push(...action.payload.commits);
        } else {
          state.repositoryCommits = action.payload.commits;
        }
        state.pagination.commits.hasMore = action.payload.commits.length === state.pagination.commits.per_page;
      })
      .addCase(fetchRepositoryCommits.rejected, (state, action) => {
        state.loading.commits = false;
        state.error.commits = action.payload as string;
      });

    // Fetch Repository Details
    builder
      .addCase(fetchRepositoryDetails.fulfilled, (state, action) => {
        state.selectedRepository = action.payload;
      });
  },
});

export const {
  setToken,
  clearToken,
  setSelectedRepository,
  clearRepositories,
  clearSearchResults,
  clearCommits,
  clearErrors,
} = githubSlice.actions;

export default githubSlice.reducer;
