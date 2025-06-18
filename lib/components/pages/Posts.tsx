import React, {useEffect, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {useAppDispatch, useAppSelector} from '@/lib/store';
import {useWorkerStatus} from '@/lib/hooks/useWorkerStatus';
import {loadFeeds, loadPosts, loadPostsForDate} from '@/lib/store/slices/watcherSlice';
import {Button} from '@/lib/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/lib/components/ui/card';
import {Badge} from '@/lib/components/ui/badge';
import {Skeleton} from '@/lib/components/ui/skeleton';
import {Alert, AlertDescription} from '@/lib/components/ui/alert';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/lib/components/ui/tabs';
import {Calendar as CalendarPicker} from '@/lib/components/ui/calendar';

import {ArrowLeft, Calendar, ExternalLink, FileText, Github, Heart, Loader2, RefreshCw, User} from 'lucide-react';
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc';

// Configure dayjs with UTC plugin
dayjs.extend(utc);

export default function Posts() {
  const {feedId} = useParams<{ feedId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const {feeds, posts, loading, error} = useAppSelector((state) => state.watcher);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [currentFeed, setCurrentFeed] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  useWorkerStatus();

  useEffect(() => {
    if (feedId) {
      dispatch(loadFeeds());
      dispatch(loadPosts({feedId}));
    }
  }, [dispatch, feedId]);

  useEffect(() => {
    if (feedId && feeds.length > 0) {
      const feed = feeds.find(f => f.id === feedId);
      setCurrentFeed(feed);
    }
  }, [feedId, feeds]);

  useEffect(() => {
    if (feedId && posts.length > 0) {
      const filtered = posts.filter(post => post.feedId === feedId);
      setFeedPosts(filtered);
    }
  }, [feedId, posts]);

  const handleRefresh = () => {
    if (feedId) {
      dispatch(loadPosts({feedId}));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getPostsForDate = (date: Date) => {
    // Convert both dates to UTC and compare using dayjs for consistent timezone handling
    const targetDate = dayjs(date).utc().startOf('day');
    return feedPosts.filter(post => {
      const postDate = dayjs(post.content.created_time).utc().startOf('day');
      return postDate.isSame(targetDate, 'day');
    });
  };

  const getDatesWithPosts = () => {
    const dates = new Set<string>();
    feedPosts.forEach(post => {
      // Use dayjs with UTC to ensure consistent date formatting across timezones
      const dateString = dayjs(post.content.created_time).utc().format('YYYY-MM-DD');
      dates.add(dateString);
    });
    return dates;
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const loadDataForDate = async (date: Date) => {
    if (!feedId) return;

    if (!selectedDate || selectedDate.getTime() !== date.getTime()) {
      setSelectedDate(date);
    }

    // Use dayjs with UTC for consistent date formatting
    const dateString = dayjs(date).utc().format('YYYY-MM-DD');
    await dispatch(loadPostsForDate({feedId, date: dateString})).unwrap();
  };

  const datesWithPosts = getDatesWithPosts();
  const selectedDatePosts = selectedDate ? getPostsForDate(selectedDate) : [];

  const renderPostCard = (post: any) => (
    <Card key={post.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4"/>
              {post.content.from?.name || 'Anonymous Member'}
              {post.backedUp && (
                <Badge variant="default">
                  <Github className="mr-1 h-3 w-3"/>
                  Backed up
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3"/>
                {formatDate(post.content.created_time)}
              </span>
              {post.content.reactions?.summary?.total_count && (
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3"/>
                  {post.content.reactions.summary.total_count} reactions
                </span>
              )}
            </CardDescription>
          </div>
          <Link to={`/posts/${feedId}/${post.content.id}`}>
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-3 w-3"/>
              View Details
            </Button>
          </Link>
        </div>
      </CardHeader>

      {post.content.message && (
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {truncateText(post.content.message)}
          </p>

          {post.content.attachments?.data?.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                📎 {post.content.attachments.data.length} attachment(s)
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );

  if (!feedId) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>Invalid feed ID provided.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading.feeds || loading.posts) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10"/>
          <div className="space-y-2">
            <Skeleton className="h-6 w-48"/>
            <Skeleton className="h-4 w-32"/>
          </div>
        </div>

        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32"/>
                  <Skeleton className="h-4 w-24"/>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full"/>
                  <Skeleton className="h-4 w-3/4"/>
                  <Skeleton className="h-4 w-1/2"/>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!currentFeed) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>Feed not found. It may have been deleted.</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/watcher')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4"/>
          Back to Feeds
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate('/watcher')} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4"/>
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8"/>
              {currentFeed.name} Posts
            </h1>
            <div className="text-muted-foreground">
              {feedPosts.length} posts • {currentFeed.type} •
              {currentFeed.isActive ? (
                <Badge variant="default" className="ml-2">Active</Badge>
              ) : (
                <Badge variant="secondary" className="ml-2">Inactive</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={loading.posts} variant="outline">
            {loading.posts ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
            ) : (
              <RefreshCw className="mr-2 h-4 w-4"/>
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Feed Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Posts</p>
              <p className="font-medium">{feedPosts.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Backed Up</p>
              <p className="font-medium">{feedPosts.filter(p => p.backedUp).length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Scan</p>
              <p className="font-medium">
                {currentFeed.lastScan ? formatDate(currentFeed.lastScan) : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Repository</p>
              <p className="font-medium">
                {currentFeed.backupRepo || 'Not configured'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Posts View */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4"/>
            Calendar
          </TabsTrigger>
          <TabsTrigger value="posts" className="flex items-center gap-2">
            <FileText className="h-4 w-4"/>
            Posts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4 mt-6">
          {feedPosts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4"/>
                <h3 className="text-lg font-medium mb-2">No posts found</h3>
                <p className="text-muted-foreground mb-4">
                  {currentFeed.isActive
                    ? "Posts will appear here once the feed is scanned"
                    : "Activate this feed to start collecting posts"
                  }
                </p>
                <Button onClick={() => navigate('/watcher')} variant="outline">
                  Manage Feed
                </Button>
              </CardContent>
            </Card>
          ) : (
            feedPosts.map(renderPostCard)
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4 mt-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <Card className={'flex-1 self-start'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5"/>
                  Select Date
                </CardTitle>
                <CardDescription>
                  Click on any date to load posts. Dates with posts are highlighted.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CalendarPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  modifiers={{
                    hasPosts: (date) => {
                      // Use dayjs with UTC for consistent date comparison
                      const dateString = dayjs(date).utc().format('YYYY-MM-DD');
                      return datesWithPosts.has(dateString);
                    }
                  }}
                  modifiersClassNames={{
                    hasPosts: "rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-semibold"
                  }}
                  className="p-0"
                  classNames={{
                    root: 'w-full',
                  }}
                />
              </CardContent>
            </Card>

            {/* Selected Date Posts */}
            <Card className={'flex-1 lg:flex-3'}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5"/>
                      {selectedDate ? formatDateForDisplay(selectedDate) : 'Select a Date'}
                    </CardTitle>
                    <CardDescription>
                      {selectedDate
                        ? `${selectedDatePosts.length} post${selectedDatePosts.length !== 1 ? 's' : ''} found`
                        : 'Choose a date from the calendar to view posts'
                      }
                    </CardDescription>
                  </div>
                  {selectedDate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadDataForDate(selectedDate)}
                      disabled={loading.postsForDate}
                    >
                      {loading.postsForDate ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin"/>
                          Loading...
                        </>
                      ) : (
                        'Load data'
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Error state for loading posts for date */}
                {error.postsForDate && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>
                      Failed to load posts: {error.postsForDate}
                    </AlertDescription>
                  </Alert>
                )}

                {!selectedDate ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3"/>
                    <p className="text-muted-foreground">
                      Select a date from the calendar to view posts
                    </p>
                  </div>
                ) : selectedDatePosts.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3"/>
                    <h3 className="font-medium mb-2">No posts found</h3>
                    <p className="text-muted-foreground mb-4">
                      No posts were found for {formatDateForDisplay(selectedDate)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadDataForDate(selectedDate)}
                      disabled={loading.postsForDate}
                    >
                      {loading.postsForDate ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin"/>
                          Loading...
                        </>
                      ) : (
                        'Load data for this date'
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDatePosts.map(renderPostCard)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
