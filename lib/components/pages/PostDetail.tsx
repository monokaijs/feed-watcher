import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useAppDispatch, useAppSelector} from '@/lib/store';
import {loadFeeds, loadPosts} from '@/lib/store/slices/watcherSlice';
import {Button} from '@/lib/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/lib/components/ui/card';
import {Badge} from '@/lib/components/ui/badge';
import {Skeleton} from '@/lib/components/ui/skeleton';
import {Alert, AlertDescription} from '@/lib/components/ui/alert';
import MarkdownRenderer from '@/lib/components/MarkdownRenderer';

import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Copy,
  ExternalLink,
  FileText,
  Github,
  Heart,
  Image,
  Link as LinkIcon,
  User
} from 'lucide-react';
import type {StoredPost} from '@/lib/types/post';

export default function PostDetail() {
  const {feedId, postId} = useParams<{ feedId: string; postId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const {feeds, posts, loading} = useAppSelector((state) => state.watcher);
  const [currentPost, setCurrentPost] = useState<StoredPost | null>(null);
  const [currentFeed, setCurrentFeed] = useState<any>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    if (feedId && postId) {
      dispatch(loadFeeds());
      dispatch(loadPosts({feedId}));
    }
  }, [dispatch, feedId, postId]);

  useEffect(() => {
    if (feedId && feeds.length > 0) {
      const feed = feeds.find(f => f.id === feedId);
      setCurrentFeed(feed);
    }
  }, [feedId, feeds]);

  useEffect(() => {
    if (feedId && postId && posts.length > 0) {
      const post = posts.find(p => p.feedId === feedId && p.content.id === postId);
      setCurrentPost(post || null);
    }
  }, [feedId, postId, posts]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const generateMDXPreview = (post: StoredPost): string => {
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
  };

  if (!feedId || !postId) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>Invalid feed ID or post ID provided.</AlertDescription>
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

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64"/>
            <Skeleton className="h-4 w-48"/>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full"/>
              <Skeleton className="h-4 w-full"/>
              <Skeleton className="h-4 w-3/4"/>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentPost || !currentFeed) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>
            Post not found. It may have been deleted or the feed may not exist.
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/posts/${feedId}`)} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4"/>
            Back to Feed Posts
          </Button>
          <Button onClick={() => navigate('/watcher')} variant="outline">
            Back to Feeds
          </Button>
        </div>
      </div>
    );
  }

  const mdxContent = generateMDXPreview(currentPost);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate(`/posts/${feedId}`)} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4"/>
            Back to Posts
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6"/>
              Post Details
            </h1>
            <p className="text-muted-foreground">
              From {currentFeed.name} • {currentPost.content.from?.name || 'Anonymous Member'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {currentPost.backedUp && currentPost.backupPath && (
            <Badge variant="default">
              <Github className="mr-1 h-3 w-3"/>
              Backed up to GitHub
            </Badge>
          )}
        </div>
      </div>

      {/* Post Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5"/>
            {currentPost.content.from?.name || 'Anonymous Member'}
          </CardTitle>
          <CardDescription className="space-y-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3"/>
                {formatDate(currentPost.content.created_time)}
              </span>
              {currentPost.content.reactions?.summary?.total_count && (
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3"/>
                  {currentPost.content.reactions.summary.total_count} reactions
                </span>
              )}
            </div>
            <div className="text-xs">
              Post ID: <a className={'underline'} href={'https://www.facebook.com/' + currentPost.content.id} target={'_blank'}>
                {currentPost.content.id}
              </a> •
              Author ID: {currentPost.content.from?.id || 'unknown'}
            </div>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {currentPost.content.message && (
            <div>
              <h3 className="font-medium mb-2">Content</h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <MarkdownRenderer
                  content={currentPost.content.message}
                  className="prose prose-sm max-w-none"
                />
              </div>
            </div>
          )}

          {(currentPost.content.attachments?.data?.length ?? 0) > 0 && (
            <div>
              <h3 className="font-medium mb-2">Attachments</h3>
              <div className="space-y-3">
                {currentPost.content.attachments?.data.map((attachment, index) => (
                  <Card key={index} className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-background rounded">
                          {attachment.type === 'photo' ? (
                            <Image className="h-4 w-4"/>
                          ) : (
                            <LinkIcon className="h-4 w-4"/>
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-sm">
                            Attachment {index + 1} • {attachment.type}
                          </p>
                          {attachment.title && (
                            <p className="text-sm">{attachment.title}</p>
                          )}
                          {attachment.description && (
                            <p className="text-xs text-muted-foreground">
                              {attachment.description}
                            </p>
                          )}
                          <div className={'flex flex-row gap-2 mt-4'}>
                            {attachment.url && (
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3"/>
                                View Original
                              </a>
                            )}
                            {attachment.media?.image?.src && (
                              <a
                                href={attachment.media.image.src}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <Image className="h-3 w-3"/>
                                View Image
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MDX Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>MDX Content Preview</CardTitle>
              <CardDescription>
                This is how the post would appear when backed up to GitHub
              </CardDescription>
            </div>
            <Button
              onClick={() => copyToClipboard(mdxContent, 'MDX')}
              variant="outline"
              size="sm"
            >
              {copiedText === 'MDX' ? (
                <CheckCircle className="mr-2 h-3 w-3"/>
              ) : (
                <Copy className="mr-2 h-3 w-3"/>
              )}
              {copiedText === 'MDX' ? 'Copied!' : 'Copy MDX'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {mdxContent}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Backup Information */}
      {currentPost.backedUp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5"/>
              Backup Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Backup Path</p>
                <p className="font-mono text-xs bg-muted/50 p-2 rounded">
                  {currentPost.backupPath}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Commit SHA</p>
                <p className="font-mono text-xs bg-muted/50 p-2 rounded">
                  {currentPost.backupCommitSha}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Backed Up At</p>
                <p className="font-medium">
                  {formatDate(currentPost.updatedAt)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Repository</p>
                <p className="font-medium">
                  {currentFeed.backupRepo}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
