import {createHashRouter, Navigate} from 'react-router-dom';
import DashboardLayout from '@/lib/components/layouts/dashboard-layout.tsx';
import Dashboard from '@/lib/components/pages/Dashboard.tsx';
import Settings from '@/lib/components/pages/Settings.tsx';
import Analytics from '@/lib/components/pages/Analytics.tsx';
import Watcher from '@/lib/components/pages/Watcher.tsx';
import Posts from '@/lib/components/pages/Posts.tsx';
import PostDetail from '@/lib/components/pages/PostDetail.tsx';

export const router = createHashRouter([
  {
    path: '/',
    element: <DashboardLayout/>,
    children: [
      {
        path: '',
        index: true,
        element: <Dashboard/>,
      },
      {
        path: 'analytics',
        element: <Analytics/>,
      },
      {
        path: 'watcher',
        element: <Watcher/>,
      },
      {
        path: 'posts/:feedId',
        element: <Posts/>,
      },
      {
        path: 'posts/:feedId/:postId',
        element: <PostDetail/>,
      },
      {
        path: 'settings',
        element: <Settings/>,
      },
      {
        path: '*',
        element: <Navigate to={'/dashboard'} replace/>,
      },
    ],
  },
]);
