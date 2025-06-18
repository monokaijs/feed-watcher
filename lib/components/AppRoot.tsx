import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { RouterProvider } from 'react-router-dom';
import { store, persistor, initializeStore, useAppDispatch } from '@/lib/store';
import { loadTokenFromStorage } from '@/lib/store/slices/githubSlice';
import { loadFeeds } from '@/lib/store/slices/watcherSlice';
import { router } from '@/lib/router/index.tsx';
import { Skeleton } from '@/lib/components/ui/skeleton';
import { Card, CardContent } from '@/lib/components/ui/card';

// Loading component for PersistGate
const LoadingComponent = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <Card className="w-full max-w-md">
      <CardContent className="p-6 space-y-4">
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-32 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  </div>
);

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center space-y-4">
              <h2 className="text-lg font-semibold text-destructive">
                Something went wrong
              </h2>
              <p className="text-sm text-muted-foreground">
                The application encountered an error. Please refresh the page to try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
              >
                Refresh Page
              </button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppInitializer: React.FC = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(loadTokenFromStorage());
    dispatch(loadFeeds());
  }, [dispatch]);

  return <RouterProvider router={router} />;
};

const AppWithProviders: React.FC = () => {
  useEffect(() => {
    initializeStore().then((success) => {
    });
  }, []);

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<LoadingComponent />} persistor={persistor}>
          <AppInitializer />
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
};

export default AppWithProviders;
