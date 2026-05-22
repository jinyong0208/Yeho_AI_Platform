import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/DashboardPage';
import LoginPage from '../pages/LoginPage';
import TenantPage from '../pages/TenantPage';
import UserPage from '../pages/UserPage';
import ProviderPage from '../pages/ProviderPage';
import ModelPage from '../pages/ModelPage';
import ApiKeyPage from '../pages/ApiKeyPage';
import WalletPage from '../pages/WalletPage';
import WalletTransactionPage from '../pages/WalletTransactionPage';
import UsageLogPage from '../pages/UsageLogPage';
import TokenStatsPage from '../pages/TokenStatsPage';
import AuditLogPage from '../pages/AuditLogPage';
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
      { path: 'providers', element: <ProviderPage /> },
      { path: 'models', element: <ModelPage /> },
      { path: 'api-keys', element: <ApiKeyPage /> },
      { path: 'wallet', element: <WalletPage /> },
      { path: 'wallet/transactions', element: <WalletTransactionPage /> },
      { path: 'usage-logs', element: <UsageLogPage /> },
      { path: 'token-stats', element: <TokenStatsPage /> },
      { path: 'audit-logs', element: <AuditLogPage /> },
      { path: 'workflow', element: <PlaceholderPage kind="workflow" /> },
    ],
  },
]);
