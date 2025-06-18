import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  email: string;
  public_repos: number;
  total_private_repos: number;
  owned_private_repos: number;
  private_gists: number;
  disk_usage: number;
  collaborators: number;
  two_factor_authentication: boolean;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
  clone_url: string;
  ssh_url: string;
  language: string | null;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  size: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  html_url: string;
}

export interface GitHubPermissions {
  admin: boolean;
  maintain: boolean;
  push: boolean;
  triage: boolean;
  pull: boolean;
}

export interface TokenValidationResult {
  valid: boolean;
  user?: GitHubUser;
  scopes?: string[];
  permissions?: {
    canReadRepos: boolean;
    canWriteRepos: boolean;
  };
  error?: string;
}

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: 'file';
  content: string;
  encoding: 'base64';
}

export interface CreateFileRequest {
  owner: string;
  repo: string;
  path: string;
  message: string;
  content: string | ArrayBuffer | Uint8Array;
  branch?: string;
  committer?: {
    name: string;
    email: string;
  };
  author?: {
    name: string;
    email: string;
  };
}

export interface CreateFileResponse {
  content: GitHubFileContent;
  commit: {
    sha: string;
    node_id: string;
    url: string;
    html_url: string;
    author: {
      date: string;
      name: string;
      email: string;
    };
    committer: {
      date: string;
      name: string;
      email: string;
    };
    message: string;
    tree: {
      url: string;
      sha: string;
    };
    parents: Array<{
      url: string;
      html_url: string;
      sha: string;
    }>;
    verification: {
      verified: boolean;
      reason: string;
      signature: string | null;
      payload: string | null;
    };
  };
}

class GithubService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });
  }

  /**
   * Set the GitHub token for authentication
   */
  setToken(token: string): void {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `token ${token}`;
  }

  /**
   * Clear the GitHub token
   */
  clearToken(): void {
    this.token = null;
    delete this.client.defaults.headers.common['Authorization'];
  }

  /**
   * Validate GitHub token and check permissions
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      // Temporarily set token for validation
      const tempClient = axios.create({
        baseURL: 'https://api.github.com',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${token}`,
        },
      });

      // Get user info and token scopes
      const [userResponse, scopesResponse] = await Promise.all([
        tempClient.get<GitHubUser>('/user'),
        tempClient.get('/user', {
          transformResponse: [(data, headers) => ({ data, headers })]
        })
      ]);

      const user = userResponse.data;
      const scopes = scopesResponse.data.headers['x-oauth-scopes']?.split(', ') || [];

      // Check permissions
      const canReadRepos = scopes.includes('repo') || scopes.includes('public_repo');
      const canWriteRepos = scopes.includes('repo');

      return {
        valid: true,
        user,
        scopes,
        permissions: {
          canReadRepos,
          canWriteRepos,
        },
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data?.message || error.message || 'Invalid token',
      };
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<GitHubUser> {
    if (!this.token) {
      throw new Error('No GitHub token set. Please authenticate first.');
    }

    const response = await this.client.get<GitHubUser>('/user');
    return response.data;
  }

  /**
   * List all repositories for the authenticated user
   */
  async listRepositories(options: {
    type?: 'all' | 'owner' | 'public' | 'private' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubRepo[]> {
    if (!this.token) {
      throw new Error('No GitHub token set');
    }

    const params = {
      type: options.type || 'all',
      sort: options.sort || 'updated',
      direction: options.direction || 'desc',
      per_page: options.per_page || 30,
      page: options.page || 1,
    };

    const response = await this.client.get<GitHubRepo[]>('/user/repos', { params });
    return response.data;
  }

  /**
   * Search repositories
   */
  async searchRepositories(query: string, options: {
    sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<{ items: GitHubRepo[]; total_count: number }> {
    if (!this.token) {
      throw new Error('No GitHub token set');
    }

    const params = {
      q: query,
      sort: options.sort || 'updated',
      order: options.order || 'desc',
      per_page: options.per_page || 30,
      page: options.page || 1,
    };

    const response = await this.client.get('/search/repositories', { params });
    return response.data;
  }

  /**
   * Get repository details
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepo> {
    if (!this.token) {
      throw new Error('No GitHub token set');
    }

    const response = await this.client.get<GitHubRepo>(`/repos/${owner}/${repo}`);
    return response.data;
  }

  /**
   * Get repository commits
   */
  async getRepositoryCommits(owner: string, repo: string, options: {
    sha?: string;
    path?: string;
    author?: string;
    since?: string;
    until?: string;
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubCommit[]> {
    if (!this.token) {
      throw new Error('No GitHub token set');
    }

    const params = {
      sha: options.sha,
      path: options.path,
      author: options.author,
      since: options.since,
      until: options.until,
      per_page: options.per_page || 30,
      page: options.page || 1,
    };

    // Remove undefined values
    Object.keys(params).forEach(key =>
      params[key as keyof typeof params] === undefined && delete params[key as keyof typeof params]
    );

    const response = await this.client.get<GitHubCommit[]>(`/repos/${owner}/${repo}/commits`, { params });
    return response.data;
  }

  /**
   * Get repository permissions for the authenticated user
   */
  async getRepositoryPermissions(owner: string, repo: string): Promise<GitHubPermissions> {
    if (!this.token) {
      throw new Error('No GitHub token set');
    }

    try {
      const response = await this.client.get(`/repos/${owner}/${repo}`);
      return response.data.permissions || {
        admin: false,
        maintain: false,
        push: false,
        triage: false,
        pull: false,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Repository not found or no access');
      }
      throw error;
    }
  }

  /**
   * Check if token has sufficient permissions for a repository
   */
  async checkRepositoryAccess(owner: string, repo: string): Promise<{
    canRead: boolean;
    canWrite: boolean;
    permissions: GitHubPermissions;
  }> {
    try {
      const permissions = await this.getRepositoryPermissions(owner, repo);
      return {
        canRead: permissions.pull,
        canWrite: permissions.push || permissions.admin || permissions.maintain,
        permissions,
      };
    } catch (error) {
      return {
        canRead: false,
        canWrite: false,
        permissions: {
          admin: false,
          maintain: false,
          push: false,
          triage: false,
          pull: false,
        },
      };
    }
  }

  /**
   * Get rate limit information
   */
  async getRateLimit(): Promise<{
    limit: number;
    remaining: number;
    reset: number;
    used: number;
  }> {
    if (!this.token) {
      throw new Error('No GitHub token set');
    }

    const response = await this.client.get('/rate_limit');
    return response.data.rate;
  }

  /**
   * Helper method to convert content to base64
   */
  private contentToBase64(content: string | ArrayBuffer | Uint8Array): string {
    if (typeof content === 'string') {
      // For text content, encode as UTF-8 then base64
      return btoa(unescape(encodeURIComponent(content)));
    } else if (content instanceof ArrayBuffer) {
      // Convert ArrayBuffer to Uint8Array then to base64
      const uint8Array = new Uint8Array(content);
      return this.uint8ArrayToBase64(uint8Array);
    } else if (content instanceof Uint8Array) {
      // Convert Uint8Array directly to base64
      return this.uint8ArrayToBase64(content);
    } else {
      throw new Error('Unsupported content type. Must be string, ArrayBuffer, or Uint8Array.');
    }
  }

  /**
   * Helper method to convert Uint8Array to base64
   */
  private uint8ArrayToBase64(uint8Array: Uint8Array): string {
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }

  /**
   * Create a file in a GitHub repository
   * Supports both text files (string content) and binary files (ArrayBuffer/Uint8Array)
   */
  async createFile(request: CreateFileRequest): Promise<CreateFileResponse> {
    if (!this.token) {
      throw new Error('No GitHub token set');
    }

    // Validate required fields
    if (!request.owner || !request.repo || !request.path || !request.message) {
      throw new Error('Missing required fields: owner, repo, path, and message are required');
    }

    // Convert content to base64
    const base64Content = this.contentToBase64(request.content);

    // Prepare the request body
    const requestBody: any = {
      message: request.message,
      content: base64Content,
    };

    // Add optional fields
    if (request.branch) {
      requestBody.branch = request.branch;
    }
    if (request.committer) {
      requestBody.committer = request.committer;
    }
    if (request.author) {
      requestBody.author = request.author;
    }

    try {
      const response = await this.client.put<CreateFileResponse>(
        `/repos/${request.owner}/${request.repo}/contents/${request.path}`,
        requestBody
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 422) {
        throw new Error(`File already exists at path: ${request.path}`);
      } else if (error.response?.status === 404) {
        throw new Error('Repository not found or no write access');
      } else if (error.response?.status === 403) {
        throw new Error('Insufficient permissions to create files in this repository');
      }
      throw new Error(error.response?.data?.message || error.message || 'Failed to create file');
    }
  }

  /**
   * Create a text file (convenience method for text content)
   */
  async createTextFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    options?: {
      branch?: string;
      committer?: { name: string; email: string };
      author?: { name: string; email: string };
    }
  ): Promise<CreateFileResponse> {
    return this.createFile({
      owner,
      repo,
      path,
      content,
      message,
      ...options,
    });
  }

  /**
   * Create a binary file (convenience method for blob content)
   */
  async createBinaryFile(
    owner: string,
    repo: string,
    path: string,
    content: ArrayBuffer | Uint8Array,
    message: string,
    options?: {
      branch?: string;
      committer?: { name: string; email: string };
      author?: { name: string; email: string };
    }
  ): Promise<CreateFileResponse> {
    return this.createFile({
      owner,
      repo,
      path,
      content,
      message,
      ...options,
    });
  }

  /**
   * Create an MDX file (convenience method for MDX content)
   * Automatically adds .mdx extension if not present
   */
  async createMDXFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    options?: {
      branch?: string;
      committer?: { name: string; email: string };
      author?: { name: string; email: string };
    }
  ): Promise<CreateFileResponse> {
    // Ensure the path has .mdx extension
    const mdxPath = path.endsWith('.mdx') ? path : `${path}.mdx`;

    return this.createTextFile(owner, repo, mdxPath, content, message, options);
  }

  /**
   * Check if a file exists in the repository
   */
  async fileExists(owner: string, repo: string, path: string, branch?: string): Promise<boolean> {
    if (!this.token) {
      throw new Error('No GitHub token set');
    }

    try {
      const params = branch ? { ref: branch } : {};
      await this.client.get(`/repos/${owner}/${repo}/contents/${path}`, { params });
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      // Re-throw other errors (like permission issues)
      throw error;
    }
  }

  /**
   * Get file content from repository
   */
  async getFileContent(owner: string, repo: string, path: string, branch?: string): Promise<GitHubFileContent> {
    if (!this.token) {
      throw new Error('No GitHub token set');
    }

    try {
      const params = branch ? { ref: branch } : {};
      const response = await this.client.get<GitHubFileContent>(`/repos/${owner}/${repo}/contents/${path}`, { params });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`File not found: ${path}`);
      }
      throw new Error(error.response?.data?.message || error.message || 'Failed to get file content');
    }
  }
}

export default new GithubService();
