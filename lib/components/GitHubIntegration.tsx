import React, {useState} from 'react';
import {useAppDispatch, useAppSelector} from '@/lib/store';
import {clearToken, setToken, validateToken} from '@/lib/store/slices/githubSlice';
import {Button} from '@/lib/components/ui/button';
import {Input} from '@/lib/components/ui/input';
import {Label} from '@/lib/components/ui/label';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/lib/components/ui/card';
import {Badge} from '@/lib/components/ui/badge';
import {Alert, AlertDescription} from '@/lib/components/ui/alert';
import {AlertCircle, CheckCircle, ExternalLink, Github, Loader2, Trash2, XCircle} from 'lucide-react';

interface GitHubIntegrationProps {
  onTokenValidated?: (token: string, user: any) => void;
  onTokenCleared?: () => void;
}

export default function GitHubIntegration({onTokenValidated, onTokenCleared}: GitHubIntegrationProps) {
  const dispatch = useAppDispatch();
  const {
    token,
    isAuthenticated,
    user,
    tokenValidation,
    loading,
    error,
  } = useAppSelector((state) => state.github);

  const [tokenInput, setTokenInput] = useState(token || '');
  const [isValidating, setIsValidating] = useState(false);

  // Token loading is now handled globally in AppRoot

  const handleValidateToken = async (tokenToValidate?: string) => {
    const targetToken = tokenToValidate || tokenInput.trim();

    if (!targetToken) {
      return;
    }

    setIsValidating(true);

    try {
      // Set token first
      if (!tokenToValidate) {
        dispatch(setToken(targetToken));
      }

      // Validate token
      const result = await dispatch(validateToken(targetToken));

      if (result.meta.requestStatus === 'fulfilled' && (result.payload as any)?.valid) {
        const validationResult = result.payload as any;
        onTokenValidated?.(targetToken, validationResult.user);
      }
    } catch (error) {
      console.error('Token validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleClearToken = () => {
    dispatch(clearToken());
    setTokenInput('');
    onTokenCleared?.();
  };

  const handleTokenInputChange = (value: string) => {
    setTokenInput(value);
    // Clear any previous validation errors when user starts typing
    if (error.validateToken) {
      // Could dispatch a clear error action here if needed
    }
  };

  const renderTokenSetup = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="github-token">GitHub Personal Access Token</Label>
        <div className="flex gap-2">
          <Input
            id="github-token"
            type="password"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={tokenInput}
            onChange={(e) => handleTokenInputChange(e.target.value)}
            disabled={isValidating || loading.validateToken}
            className="flex-1"
          />
          <Button
            onClick={() => handleValidateToken()}
            disabled={!tokenInput.trim() || isValidating || loading.validateToken}
          >
            {(isValidating || loading.validateToken) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                Validating...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4"/>
                Validate
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Required permissions: <code>repo</code> (for private repos) or <code>public_repo</code> (for public repos)
        </p>
      </div>

      {error.validateToken && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4"/>
          <AlertDescription>{error.validateToken}</AlertDescription>
        </Alert>
      )}

      <div className="text-sm text-muted-foreground space-y-2">
        <p className="font-medium">How to create a Personal Access Token:</p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
          <li>Click "Generate new token (classic)"</li>
          <li>Select scopes: <code>repo</code> or <code>public_repo</code></li>
          <li>Copy the generated token and paste it above</li>
        </ol>
        <Button variant="link" size="sm" className="p-0 h-auto" asChild>
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3"/>
            Create Token on GitHub
          </a>
        </Button>
      </div>
    </div>
  );

  const renderConnectedState = () => {
    if (!isAuthenticated || !user || !tokenValidation) return null;

    return (
      <div className="space-y-4">
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-500"/>
          <AlertDescription className="text-green-700">
            Successfully connected to GitHub
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-4 p-4 border rounded-lg">
          <img
            src={user.avatar_url}
            alt={user.name || user.login}
            className="w-12 h-12 rounded-full"
          />
          <div className="flex-1">
            <p className="font-medium">{user.name || user.login}</p>
            <p className="text-sm text-muted-foreground">@{user.login}</p>
            {user.email && (
              <p className="text-sm text-muted-foreground">{user.email}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleClearToken}>
            <Trash2 className="mr-2 h-4 w-4"/>
            Disconnect
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="p-3 border rounded-lg">
            <p className="text-muted-foreground">Public Repos</p>
            <p className="font-medium text-lg">{user.public_repos}</p>
          </div>
          <div className="p-3 border rounded-lg">
            <p className="text-muted-foreground">Owned Private</p>
            <p className="font-medium text-lg">{user.owned_private_repos || 0}</p>
          </div>
          <div className="p-3 border rounded-lg">
            <p className="text-muted-foreground">Total Private</p>
            <p className="font-medium text-lg">{user.total_private_repos || 0}</p>
          </div>
        </div>

        {user.total_private_repos !== user.owned_private_repos && (
          <p className="text-xs text-muted-foreground">
            You have access to {user.total_private_repos} private repositories,
            of which you own {user.owned_private_repos}. The difference includes repositories
            where you're a collaborator.
          </p>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Token Permissions:</p>
          <div className="flex gap-2 flex-wrap">
            <Badge variant={tokenValidation.permissions?.canReadRepos ? "default" : "secondary"}>
              {tokenValidation.permissions?.canReadRepos ? (
                <CheckCircle className="mr-1 h-3 w-3"/>
              ) : (
                <XCircle className="mr-1 h-3 w-3"/>
              )}
              Read Repositories
            </Badge>
            <Badge variant={tokenValidation.permissions?.canWriteRepos ? "default" : "secondary"}>
              {tokenValidation.permissions?.canWriteRepos ? (
                <CheckCircle className="mr-1 h-3 w-3"/>
              ) : (
                <XCircle className="mr-1 h-3 w-3"/>
              )}
              Write Repositories
            </Badge>
          </div>

          {tokenValidation.scopes && tokenValidation.scopes.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">Available scopes:</p>
              <div className="flex gap-1 flex-wrap">
                {tokenValidation.scopes.map((scope) => (
                  <Badge key={scope} variant="outline" className="text-xs">
                    {scope}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {(!tokenValidation.permissions?.canReadRepos || !tokenValidation.permissions?.canWriteRepos) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4"/>
            <AlertDescription>
              Your token has limited permissions. For full functionality, ensure your token has 'repo' scope.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5"/>
          GitHub Integration
        </CardTitle>
        <CardDescription>
          Connect your GitHub account to enable repository access and backup functionality
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAuthenticated ? renderConnectedState() : renderTokenSetup()}
      </CardContent>
    </Card>
  );
}
