import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import MainLayout from '../layouts/MainLayout';
import { useAuthStore } from '../store/useAuthStore';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const TenantPage = lazy(() => import('../pages/TenantPage'));
const UserPage = lazy(() => import('../pages/UserPage'));
const ProviderPage = lazy(() => import('../pages/ProviderPage'));
const ModelPage = lazy(() => import('../pages/ModelPage'));
const ApiKeyPage = lazy(() => import('../pages/ApiKeyPage'));
const WalletPage = lazy(() => import('../pages/WalletPage'));
const WalletTransactionPage = lazy(() => import('../pages/WalletTransactionPage'));
const InvoicePage = lazy(() => import('../pages/InvoicePage'));
const UsageLogPage = lazy(() => import('../pages/UsageLogPage'));
const TokenStatsPage = lazy(() => import('../pages/TokenStatsPage'));
const AuditLogPage = lazy(() => import('../pages/AuditLogPage'));
const AgentDebugPage = lazy(() => import('../pages/AgentDebugPage'));
const PlaceholderPage = lazy(() => import('../pages/PlaceholderPage'));

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.accessToken);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function routePage(element: ReactNode) {
  return <Suspense fallback={<div className="route-skeleton" />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: routePage(<LoginPage />),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: routePage(<DashboardPage />) },
      { path: 'tenants', element: routePage(<TenantPage />) },
      { path: 'users', element: routePage(<UserPage />) },
      { path: 'providers', element: routePage(<ProviderPage />) },
      { path: 'models', element: routePage(<ModelPage />) },
      { path: 'api-keys', element: routePage(<ApiKeyPage />) },
      { path: 'wallet', element: routePage(<WalletPage />) },
      { path: 'wallet/transactions', element: routePage(<WalletTransactionPage />) },
      { path: 'invoices', element: routePage(<InvoicePage />) },
      { path: 'usage-logs', element: routePage(<UsageLogPage />) },
      { path: 'token-stats', element: routePage(<TokenStatsPage />) },
      { path: 'audit-logs', element: routePage(<AuditLogPage />) },
      { path: 'agent-debug', element: routePage(<AgentDebugPage />) },
      { path: 'workflow', element: routePage(<PlaceholderPage kind="workflow" />) },
    ],
  },
]);
