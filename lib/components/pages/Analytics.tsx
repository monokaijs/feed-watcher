import { useAppSelector } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/lib/components/ui/card';
import { Badge } from '@/lib/components/ui/badge';
import { Button } from '@/lib/components/ui/button';
import { BarChart3, TrendingUp, Calendar, Download, Eye, Github } from 'lucide-react';

export default function Analytics() {
  const { 
    feedWatcherEnabled, 
    watchedFeeds, 
    lastSyncTime, 
    backupSettings 
  } = useAppSelector((state) => state.app);

  // Mock data for demonstration
  const mockAnalytics = {
    totalPosts: 0,
    postsThisWeek: 0,
    postsThisMonth: 0,
    averagePostsPerDay: 0,
    mostActiveHour: 'N/A',
    totalBackups: 0,
    lastBackupSize: 'N/A',
    storageUsed: '0 MB',
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Insights and statistics about your feed watching activity
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts Captured</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAnalytics.totalPosts}</div>
            <p className="text-xs text-muted-foreground">
              +0 from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAnalytics.postsThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              Posts captured this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GitHub Backups</CardTitle>
            <Github className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAnalytics.totalBackups}</div>
            <p className="text-xs text-muted-foreground">
              Total backups created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAnalytics.storageUsed}</div>
            <p className="text-xs text-muted-foreground">
              Data stored locally
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
          <CardDescription>
            Overview of your feed watching activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Watched Feeds</span>
                <Badge variant="outline">{watchedFeeds.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Watcher Status</span>
                <Badge variant={feedWatcherEnabled ? "default" : "secondary"}>
                  {feedWatcherEnabled ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Auto Backup</span>
                <Badge variant={backupSettings.autoBackup ? "default" : "secondary"}>
                  {backupSettings.autoBackup ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Last Sync</span>
                <span className="text-sm text-muted-foreground">
                  {formatLastSync(lastSyncTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Backup Interval</span>
                <span className="text-sm text-muted-foreground">
                  {backupSettings.backupInterval} minutes
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">GitHub Repo</span>
                <span className="text-sm text-muted-foreground">
                  {backupSettings.githubRepo || 'Not configured'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time-based Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Time-based Analytics
          </CardTitle>
          <CardDescription>
            When your feeds are most active
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{mockAnalytics.postsThisMonth}</div>
                <div className="text-sm text-muted-foreground">This Month</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{mockAnalytics.averagePostsPerDay}</div>
                <div className="text-sm text-muted-foreground">Avg/Day</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{mockAnalytics.mostActiveHour}</div>
                <div className="text-sm text-muted-foreground">Most Active Hour</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{mockAnalytics.lastBackupSize}</div>
                <div className="text-sm text-muted-foreground">Last Backup Size</div>
              </div>
            </div>
            
            {!feedWatcherEnabled && watchedFeeds.length === 0 && (
              <div className="text-center py-8">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  No data available
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Start watching feeds to see analytics data here.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>
            Download your analytics and captured data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Analytics (CSV)
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Posts (JSON)
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Settings
            </Button>
            <Button variant="outline">
              <Github className="mr-2 h-4 w-4" />
              Sync to GitHub
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
