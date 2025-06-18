import React, {useEffect} from 'react';
import {useAppDispatch, useAppSelector} from '@/lib/store';
import {useWorkerStatus} from '@/lib/hooks/useWorkerStatus';
import {loadFeeds, loadPosts, loadWorkerStatus} from '@/lib/store/slices/watcherSlice';
import {Button} from '@/lib/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/lib/components/ui/card';
import {Badge} from '@/lib/components/ui/badge';
import {Activity, ExternalLink, Eye, FileText, Github, RefreshCw, Users} from 'lucide-react';

import {Link} from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function Dashboard() {
  const dispatch = useAppDispatch();

  // Get data from watcher slice
  const {feeds, posts, workerStatus, loading} = useAppSelector((state) => state.watcher);
  const {isAuthenticated: isGitHubConnected} = useAppSelector((state) => state.github);

  // Listen for worker status updates
  useWorkerStatus();

  // Load data on component mount
  useEffect(() => {
    dispatch(loadFeeds());
    dispatch(loadPosts({limit: 10}));
    dispatch(loadWorkerStatus());
  }, [dispatch]);

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const activeFeeds = feeds.filter(feed => feed.isActive);
  const backupEnabledFeeds = feeds.filter(feed => feed.backupEnabled);
  const recentPosts = posts?.slice(0, 5) ?? [];

  console.log({loading});
  const activeScanningFeeds = Object.values(loading.scanning).filter(Boolean).length;
  const activeBackupFeeds = Object.values(loading.backing).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your feed watching activity and settings
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Worker Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Badge variant={workerStatus?.isRunning ? "default" : "secondary"}>
                {workerStatus?.isRunning ? "Running" : "Stopped"}
              </Badge>
              {activeScanningFeeds > 0 && (
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin"/>
                  {activeScanningFeeds} scanning
                </Badge>
              )}
              {activeBackupFeeds > 0 && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin"/>
                  {activeBackupFeeds} backing up
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {workerStatus?.activeFeeds || 0} active feeds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feeds</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feeds.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeFeeds.length} active, {backupEnabledFeeds.length} with backup
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GitHub Backup</CardTitle>
            <Github className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={isGitHubConnected ? "default" : "secondary"}>
                {isGitHubConnected ? "Connected" : "Not Connected"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {backupEnabledFeeds.length} feeds with backup enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posts.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatLastSync(workerStatus?.lastScanTime ?? '')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="default" asChild>
              <Link to="/watcher">
                <Eye className="mr-2 h-4 w-4"/>
                Manage Feeds
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                dispatch(loadWorkerStatus());
                dispatch(loadPosts({limit: 10}));
              }}
              disabled={loading.workerStatus || loading.posts}
            >
              {loading.workerStatus || loading.posts ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin"/>
              ) : (
                <RefreshCw className="mr-2 h-4 w-4"/>
              )}
              Refresh Status
            </Button>
            <Button variant="outline" asChild>
              <a href="#/analytics">
                View Analytics
              </a>
            </Button>
            {activeFeeds.length > 0 && (
              <Button variant="outline" asChild>
                <a href="#/watcher">
                  <FileText className="mr-2 h-4 w-4"/>
                  View All Posts
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Posts</CardTitle>
          <CardDescription>
            Latest posts from your watched feeds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading.posts ? (
              <p className="text-sm text-muted-foreground">Loading posts...</p>
            ) : recentPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No posts found. Posts will appear here once feeds start being scanned.
              </p>
            ) : (
              <div className="space-y-4">
                {recentPosts.map((post) => {
                  const isBacking = loading.backing[post.feedId] || false;

                  return (
                    <div key={post.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{post.feedName}</Badge>
                          <Badge className={'capitalize'} variant={post.feedType === 'group' ? 'default' : 'secondary'}>
                            {post.feedType}
                          </Badge>
                          {isBacking ? (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              <RefreshCw className="mr-1 h-3 w-3 animate-spin"/>
                              Backing up...
                            </Badge>
                          ) : post.backedUp ? (
                            <Badge variant="default">
                              <Github className="mr-1 h-3 w-3"/>
                              Backed up
                            </Badge>
                          ) : null}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {dayjs(post.content.created_time).fromNow()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {post.content.from?.name || 'Anonymous Member'}
                        </p>
                        {post.content.message && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {post.content.message.length > 100
                              ? `${post.content.message.substring(0, 100)}...`
                              : post.content.message
                            }
                          </p>
                        )}
                      </div>
                      <div className={'flex flex-row justify-between items-end'}>
                        {post.content.reactions?.summary?.total_count && (
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>{post.content.reactions.summary.total_count} reactions</span>
                          </div>
                        )}
                        <div className={'flex flex-row gap-2'}>
                          <a href={`https://www.facebook.com/${post.content.id}`} target={'_blank'}>
                            <Button variant={'link'}>
                              Original Post
                            </Button>
                          </a>
                          <Link to={`/posts/${post.feedId}/${post.content.id}`}>
                            <Button variant={'outline'}>
                              <ExternalLink className="mr-2 h-3 w-3"/>
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
