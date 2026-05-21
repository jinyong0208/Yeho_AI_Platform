import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/DashboardPage';
import LoginPage from '../pages/LoginPage';
import TenantPage from '../pages/TenantPage';
import UserPage from '../pages/UserPage';
import PlaceholderPage from '../pages/PlaceholderPage';
import { useAuthStore } from '../store/useAuthStore';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.accessToken);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'tenants', element: <TenantPage /> },
      { path: 'users', element: <UserPage /> },
      { path: 'providers', element: <PlaceholderPage kind="providers" /> },
      { path: 'models', element: <PlaceholderPage kind="models" /> },
      { path: 'api-keys', element: <PlaceholderPage kind="apiKeys" /> },
      { path: 'wallet', element: <PlaceholderPage kind="wallet" /> },
      { path: 'wallet/transactions', element: <PlaceholderPage kind="walletTransactions" /> },
      { path: 'usage-logs', element: <PlaceholderPage kind="usageLogs" /> },
      { path: 'token-stats', element: <PlaceholderPage kind="tokenStats" /> },
      { path: 'workflow', element: <PlaceholderPage kind="workflow" /> },
    ],
  },
]);
