import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { useWorkerStatus } from '@/lib/hooks/useWorkerStatus';
import RepositorySelect from '@/lib/components/RepositorySelect';
import { fbService } from '@/lib/services/fb.service';
import {
  loadFeeds,
  createFeed,
  updateFeed,
  deleteFeed,
  toggleFeedActive,
  toggleFeedBackup,
  triggerFeedScan,
  loadWorkerStatus,
  updatePostsCounts,
  clearErrors,
  type Feed,
} from '@/lib/store/slices/watcherSlice';
import { Button } from '@/lib/components/ui/button';
import { Input } from '@/lib/components/ui/input';
import { Label } from '@/lib/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/lib/components/ui/card';
import { Badge } from '@/lib/components/ui/badge';
import { Switch } from '@/lib/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/lib/components/ui/select';
import { Alert, AlertDescription } from '@/lib/components/ui/alert';
import {
  Eye,
  Plus,
  Trash2,
  Settings,
  Github,
  Users,
  User,
  Clock,
  Database,
  AlertCircle,
  CheckCircle,
  Loader2,
  XCircle,
  RefreshCw,
  FileText
} from 'lucide-react';

// Feed interface is now imported from watcherSlice

export default function Watcher() {
  const dispatch = useAppDispatch();
  const { isAuthenticated: isGitHubConnected } = useAppSelector((state) => state.github);
  const { feeds, loading, error, workerStatus } = useAppSelector((state) => state.watcher);

  // Listen for worker status updates
  useWorkerStatus();

  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeed, setNewFeed] = useState({
    name: '',
    type: 'profile' as 'profile' | 'group',
    idOrUrl: '', // Changed from url to idOrUrl
    unitId: '',
    backupRepo: '',
    backupInterval: 60
  });

  // URL validation state
  const [urlValidation, setUrlValidation] = useState({
    isValidating: false,
    isValid: false,
    error: '',
    unitId: ''
  });

  // Debounce timer for URL validation
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Feeds are loaded globally in AppRoot

  // Load worker status, update posts counts, and clear errors when component unmounts
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Load worker status first
        await dispatch(loadWorkerStatus()).unwrap();

        // Update posts counts
        await dispatch(updatePostsCounts()).unwrap();

        // Small delay to ensure storage operations complete
        setTimeout(() => {
          // Reload feeds after updating posts counts to get the updated counts
          dispatch(loadFeeds());
        }, 100);
      } catch (error) {
        console.error('Failed to initialize watcher data:', error);
        // Still try to load feeds even if other operations fail
        dispatch(loadFeeds());
      }
    };

    initializeData();

    return () => {
      dispatch(clearErrors());
    };
  }, [dispatch]);

  // Refresh posts counts manually
  const handleRefreshPostsCounts = async () => {
    try {
      await dispatch(updatePostsCounts()).unwrap();
      // Small delay to ensure storage operations complete
      setTimeout(() => {
        dispatch(loadFeeds());
      }, 100);
    } catch (error) {
      console.error('Failed to refresh posts counts:', error);
    }
  };

  // Helper function to check if input is numeric (Facebook ID)
  const isNumericId = (input: string): boolean => {
    return /^\d+$/.test(input.trim());
  };

  // Helper function to check if URL is a Facebook domain
  const isFacebookUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('facebook.com') || urlObj.hostname.includes('fb.com');
    } catch {
      return false;
    }
  };

  // Helper function to validate input and extract unit ID with debouncing
  const validateAndExtractUnitId = (input: string, type: 'profile' | 'group') => {
    // Clear existing timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    if (!input.trim()) {
      setUrlValidation({
        isValidating: false,
        isValid: false,
        error: '',
        unitId: ''
      });
      return;
    }

    // If input is numeric, it's already an ID - no validation needed
    if (isNumericId(input)) {
      setUrlValidation({
        isValidating: false,
        isValid: true,
        error: '',
        unitId: input.trim()
      });
      setNewFeed(prev => ({ ...prev, unitId: input.trim() }));
      return;
    }

    // If input is not a Facebook URL, show error
    if (!isFacebookUrl(input)) {
      setUrlValidation({
        isValidating: false,
        isValid: false,
        error: 'Please enter a valid Facebook URL or numeric ID',
        unitId: ''
      });
      return;
    }

    // Set validating state immediately for URL
    setUrlValidation({
      isValidating: true,
      isValid: false,
      error: '',
      unitId: ''
    });

    // Debounce the actual API call for URL
    validationTimeoutRef.current = setTimeout(async () => {
      try {
        const unitId = await fbService.getUnitId(input, type);

        if (unitId) {
          setUrlValidation({
            isValidating: false,
            isValid: true,
            error: '',
            unitId: unitId
          });
          // Replace URL with extracted ID
          setNewFeed(prev => ({
            ...prev,
            idOrUrl: unitId, // Replace input with extracted ID
            unitId: unitId
          }));
        } else {
          setUrlValidation({
            isValidating: false,
            isValid: false,
            error: `Failed to extract ${type} ID from URL. Please check the URL and try again.`,
            unitId: ''
          });
        }
      } catch (error: any) {
        setUrlValidation({
          isValidating: false,
          isValid: false,
          error: error.message || `Failed to validate ${type} URL. Please check the URL and try again.`,
          unitId: ''
        });
      }
    }, 1000); // 1 second debounce
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  const handleAddFeed = async () => {
    // Only allow creation if input is numeric (Facebook ID)
    if (!newFeed.name || !newFeed.idOrUrl || !isNumericId(newFeed.idOrUrl)) return;

    const feedData = {
      name: newFeed.name,
      type: newFeed.type,
      url: `https://facebook.com/${newFeed.type === 'group' ? 'groups/' : ''}${newFeed.idOrUrl}`, // Reconstruct URL from ID
      unitId: newFeed.idOrUrl, // Use the numeric ID
      isActive: false,
      backupEnabled: Boolean(newFeed.backupRepo && isGitHubConnected), // Enable backup if repo is selected and GitHub is connected
      backupRepo: newFeed.backupRepo,
      backupInterval: newFeed.backupInterval,
    };

    const result = await dispatch(createFeed(feedData));

    if (result.meta.requestStatus === 'fulfilled') {
      // Reset form on success
      setNewFeed({
        name: '',
        type: 'profile',
        idOrUrl: '',
        unitId: '',
        backupRepo: '',
        backupInterval: 60
      });
      setUrlValidation({
        isValidating: false,
        isValid: false,
        error: '',
        unitId: ''
      });
      setShowAddFeed(false);
    }
  };

  const handleDeleteFeed = (feedId: string) => {
    dispatch(deleteFeed(feedId));
  };

  const handleToggleFeed = (feedId: string) => {
    dispatch(toggleFeedActive(feedId));
  };

  const handleToggleBackup = (feedId: string) => {
    dispatch(toggleFeedBackup(feedId));
  };

  const handleUpdateFeed = (feedId: string, updates: Partial<Feed>) => {
    dispatch(updateFeed({ id: feedId, updates }));
  };

  const handleManualScan = async (feedId: string) => {
    try {
      await dispatch(triggerFeedScan(feedId)).unwrap();
      // Update posts counts after manual scan
      setTimeout(async () => {
        await dispatch(updatePostsCounts()).unwrap();
        dispatch(loadFeeds());
      }, 1000); // Wait a bit for scan to complete and posts to be stored
    } catch (error) {
      console.error('Manual scan failed:', error);
      // Error feedback could be added here
    }
  };

  const formatLastBackup = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderAddFeedForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add New Feed
        </CardTitle>
        <CardDescription>
          Add a Facebook profile or group to monitor and backup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="feed-name">Feed Name</Label>
            <Input
              id="feed-name"
              placeholder="e.g., John Doe Profile"
              value={newFeed.name}
              onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feed-type">Type</Label>
            <Select
              value={newFeed.type}
              onValueChange={(value: 'profile' | 'group') => {
                setNewFeed({ ...newFeed, type: value });

                // Re-validate input if it exists and is a Facebook URL (not numeric ID)
                if (newFeed.idOrUrl && !isNumericId(newFeed.idOrUrl) && isFacebookUrl(newFeed.idOrUrl)) {
                  validateAndExtractUnitId(newFeed.idOrUrl, value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profile">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </div>
                </SelectItem>
                <SelectItem value="group">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Group
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="feed-id-url">Facebook ID or URL</Label>
          <div className="relative">
            <Input
              id="feed-id-url"
              placeholder="123456789 or https://facebook.com/username"
              value={newFeed.idOrUrl}
              onChange={(e) => {
                const input = e.target.value;
                setNewFeed({ ...newFeed, idOrUrl: input });

                // Trigger validation based on input type
                if (input) {
                  if (isNumericId(input)) {
                    // If numeric, it's already valid - no API call needed
                    setUrlValidation({
                      isValidating: false,
                      isValid: true,
                      error: '',
                      unitId: input.trim()
                    });
                    setNewFeed(prev => ({ ...prev, unitId: input.trim() }));
                  } else if (isFacebookUrl(input)) {
                    // If URL, validate and extract ID
                    validateAndExtractUnitId(input, newFeed.type);
                  } else {
                    // Invalid input
                    setUrlValidation({
                      isValidating: false,
                      isValid: false,
                      error: 'Please enter a valid Facebook URL or numeric ID',
                      unitId: ''
                    });
                    setNewFeed(prev => ({ ...prev, unitId: '' }));
                  }
                } else {
                  // Empty input
                  setUrlValidation({
                    isValidating: false,
                    isValid: false,
                    error: '',
                    unitId: ''
                  });
                  setNewFeed(prev => ({ ...prev, unitId: '' }));
                }
              }}
              className={`${
                newFeed.idOrUrl && !urlValidation.isValidating
                  ? isNumericId(newFeed.idOrUrl) || urlValidation.isValid
                    ? 'border-green-500 focus:border-green-500'
                    : urlValidation.error
                    ? 'border-red-500 focus:border-red-500'
                    : ''
                  : ''
              }`}
            />
            {urlValidation.isValidating && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {!urlValidation.isValidating && (isNumericId(newFeed.idOrUrl) || urlValidation.isValid) && (
              <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
            {!urlValidation.isValidating && urlValidation.error && (
              <XCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
            )}
          </div>

          {urlValidation.error && (
            <p className="text-sm text-red-500">{urlValidation.error}</p>
          )}

          {isNumericId(newFeed.idOrUrl) && (
            <p className="text-sm text-green-600">
              ✓ Valid {newFeed.type} ID: {newFeed.idOrUrl}
            </p>
          )}

          {!isNumericId(newFeed.idOrUrl) && urlValidation.isValid && urlValidation.unitId && (
            <p className="text-sm text-green-600">
              ✓ URL validated - ID extracted and replaced in input: {urlValidation.unitId}
            </p>
          )}

          {!newFeed.idOrUrl && (
            <p className="text-sm text-muted-foreground">
              Enter a Facebook {newFeed.type} ID (numeric) or URL to automatically extract the ID
            </p>
          )}

          {urlValidation.isValidating && (
            <p className="text-sm text-blue-600">
              🔍 Validating {newFeed.type} URL and extracting ID...
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="backup-repo">Backup Repository (Optional)</Label>
            <RepositorySelect
              value={newFeed.backupRepo}
              onChange={(value) => setNewFeed({ ...newFeed, backupRepo: value })}
              disabled={!isGitHubConnected}
              placeholder="Search your repositories..."
            />
            {!isGitHubConnected ? (
              <p className="text-xs text-muted-foreground">
                Connect GitHub in Settings to enable backup
              </p>
            ) : newFeed.backupRepo ? (
              <p className="text-xs text-green-600">
                ✓ Auto-scanning will be enabled when feed is created
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Select a repository to enable automatic post scanning and backup
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="backup-interval">Scan Interval (minutes)</Label>
            <Input
              id="backup-interval"
              type="number"
              min="5"
              max="1440"
              value={newFeed.backupInterval}
              onChange={(e) => setNewFeed({ ...newFeed, backupInterval: parseInt(e.target.value) || 60 })}
            />
            <p className="text-xs text-muted-foreground">
              How often to scan for new posts (new posts are uploaded to GitHub immediately)
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleAddFeed}
            disabled={
              !newFeed.name ||
              !newFeed.idOrUrl ||
              !isNumericId(newFeed.idOrUrl) || // Only allow if input is numeric
              urlValidation.isValidating ||
              loading.create
            }
          >
            {loading.create ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Feed
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => {
            setShowAddFeed(false);
            setNewFeed({
              name: '',
              type: 'profile',
              idOrUrl: '',
              unitId: '',
              backupRepo: '',
              backupInterval: 60
            });
            setUrlValidation({
              isValidating: false,
              isValid: false,
              error: '',
              unitId: ''
            });
          }}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderFeedCard = (feed: Feed) => {
    const isScanning = loading.scanning[feed.id] || false;
    const isBacking = loading.backing[feed.id] || false;
    const scanError = error.scanning[feed.id];
    const backupError = error.backing[feed.id];

    return (
      <Card key={feed.id} className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {feed.type === 'profile' ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                {feed.name}
                <Badge variant={feed.isActive ? "default" : "secondary"}>
                  {feed.isActive ? "Active" : "Inactive"}
                </Badge>
                {isScanning && (
                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Scanning
                  </Badge>
                )}
                {isBacking && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Backing up
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{feed.url}</p>
              {feed.unitId && (
                <p className="text-xs text-muted-foreground">ID: {feed.unitId}</p>
              )}
              {scanError && (
                <p className="text-xs text-red-500">Scan error: {scanError}</p>
              )}
              {backupError && (
                <p className="text-xs text-red-500">Backup error: {backupError}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={feed.isActive}
                onCheckedChange={() => handleToggleFeed(feed.id)}
                disabled={loading.update || isScanning}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteFeed(feed.id)}
                disabled={loading.delete || isScanning || isBacking}
              >
                {loading.delete ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Posts Monitored</p>
            <p className="font-medium">{feed.postsCount || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Scan</p>
            <p className="font-medium">{formatLastBackup(feed.lastScan)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Backup</p>
            <p className="font-medium">{formatLastBackup(feed.lastBackup)}</p>
          </div>
        </div>

        {/* View Posts Button */}
        <div className="flex justify-center pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.hash = `#/posts/${feed.id}`}
            className="w-full"
          >
            <FileText className="mr-2 h-4 w-4" />
            View Posts ({feed.postsCount || 0})
          </Button>
        </div>

        {/* Scan Interval - Always visible */}
        <div className="border-t pt-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`interval-${feed.id}`}>Scan Interval (minutes)</Label>
            <Input
              id={`interval-${feed.id}`}
              type="number"
              min="5"
              max="1440"
              value={feed.backupInterval}
              onChange={(e) => handleUpdateFeed(feed.id, { backupInterval: parseInt(e.target.value) || 60 })}
            />
            <p className="text-xs text-muted-foreground">
              How often to scan for new posts (independent of auto-backup)
            </p>
          </div>
        </div>

        {/* Backup Settings */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Auto-Backup to GitHub
                {feed.backupEnabled && (
                  <Badge variant="default" className="text-xs">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Scanning
                  </Badge>
                )}
              </Label>
              <p className="text-sm text-muted-foreground">
                {feed.backupEnabled
                  ? `Auto-backup enabled • New posts saved as MDX files`
                  : 'Enable to automatically save new posts as MDX files in GitHub repository'
                }
                {feed.isActive && workerStatus?.nextScanTimes[feed.id] && (
                  <span className="block text-xs mt-1">
                    Next scan: {new Date(workerStatus.nextScanTimes[feed.id]).toLocaleString()}
                  </span>
                )}
              </p>
            </div>
            <Switch
              checked={feed.backupEnabled}
              onCheckedChange={() => handleToggleBackup(feed.id)}
              disabled={!isGitHubConnected || loading.update}
            />
          </div>

          {/* Repository Selection - Show when backup is enabled or when trying to enable */}
          {(feed.backupEnabled || (!feed.backupEnabled && !feed.backupRepo)) && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor={`repo-${feed.id}`}>Repository</Label>
                <RepositorySelect
                  value={feed.backupRepo}
                  onChange={(value) => handleUpdateFeed(feed.id, { backupRepo: value })}
                  disabled={!isGitHubConnected}
                  placeholder="Search repositories..."
                />
                {!feed.backupRepo && feed.backupEnabled && (
                  <p className="text-xs text-orange-600">
                    ⚠️ Select a repository to complete auto-backup setup
                  </p>
                )}
              </div>

              {/* Manual Scan Button */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-sm font-medium">Manual Scan</p>
                  <p className="text-xs text-muted-foreground">
                    {isScanning ? 'Scanning for new posts...' : 'Trigger an immediate scan for new posts'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleManualScan(feed.id)}
                  disabled={!feed.isActive || loading.update || isScanning || isBacking}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Scan Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {!isGitHubConnected ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Connect GitHub in Settings to enable automatic post scanning and backup.
              </AlertDescription>
            </Alert>
          ) : feed.backupEnabled && !feed.backupRepo ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Select a repository above to complete auto-backup setup.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feed Watcher</h1>
          <p className="text-muted-foreground">
            Monitor Facebook profiles and groups, backup posts to GitHub
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => dispatch(loadFeeds())} disabled={loading.feeds} variant="outline">
            {loading.feeds ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Feeds
          </Button>
          <Button onClick={handleRefreshPostsCounts} disabled={loading.feeds} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Update Counts
          </Button>
          <Button onClick={() => setShowAddFeed(true)} disabled={showAddFeed}>
            <Plus className="mr-2 h-4 w-4" />
            Add Feed
          </Button>
        </div>
      </div>

      {/* Error Messages */}
      {error.feeds && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error.feeds}</AlertDescription>
        </Alert>
      )}

      {error.create && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>Failed to create feed: {error.create}</AlertDescription>
        </Alert>
      )}

      {error.update && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>Failed to update feed: {error.update}</AlertDescription>
        </Alert>
      )}

      {error.delete && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>Failed to delete feed: {error.delete}</AlertDescription>
        </Alert>
      )}

      {/* GitHub Connection Status */}
      {!isGitHubConnected && (
        <Alert>
          <Github className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">GitHub not connected.</span> Connect your GitHub account in Settings to enable automatic post scanning and backup.
          </AlertDescription>
        </Alert>
      )}

      {/* Add Feed Form */}
      {showAddFeed && renderAddFeedForm()}

      {/* Feeds List */}
      <div className="space-y-4">
        {loading.feeds ? (
          <Card>
            <CardContent className="text-center py-12">
              <Loader2 className="h-16 w-16 mx-auto text-muted-foreground mb-4 animate-spin" />
              <h3 className="text-lg font-medium mb-2">Loading feeds...</h3>
              <p className="text-muted-foreground">
                Please wait while we load your configured feeds
              </p>
            </CardContent>
          </Card>
        ) : feeds.length > 0 ? (
          feeds.map(renderFeedCard)
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Eye className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No feeds configured</h3>
              <p className="text-muted-foreground mb-4">
                Add your first Facebook profile or group to start monitoring
              </p>
              <Button onClick={() => setShowAddFeed(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Feed
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
