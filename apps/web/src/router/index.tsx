import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Burger,
  Divider,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import {
  IconActivity,
  IconApi,
  IconBrain,
  IconChartBar,
  IconChartHistogram,
  IconCoins,
  IconFileInvoice,
  IconGauge,
  IconKey,
  IconLogout,
  IconReceiptTax,
  IconRobot,
  IconTemplate,
  IconSettingsAutomation,
  IconShieldCheck,
  IconUsers,
  IconWallet,
} from '@tabler/icons-react';
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
const ProfitDashboardPage = lazy(() => import('../pages/ProfitDashboardPage'));
const ProviderCostDashboardPage = lazy(() => import('../pages/ProviderCostDashboardPage'));
const AuditLogPage = lazy(() => import('../pages/AuditLogPage'));
const AgentDebugPage = lazy(() => import('../pages/AgentDebugPage'));
const PromptTemplatePage = lazy(() => import('../pages/PromptTemplatePage'));
const AgentConfigPage = lazy(() => import('../pages/AgentConfigPage'));
const AgentExecuteLogPage = lazy(() => import('../pages/AgentExecuteLogPage'));
const PlaceholderPage = lazy(() => import('../pages/PlaceholderPage'));

type NavItem = {
  group: string;
  to: string;
  labelKey: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
};

const navItems: NavItem[] = [
  { group: 'Workspace', to: '/', labelKey: 'dashboard', icon: IconGauge },
  { group: 'Workspace', to: '/tenants', labelKey: 'tenants', icon: IconActivity },
  { group: 'Workspace', to: '/users', labelKey: 'users', icon: IconUsers },
  { group: 'Gateway', to: '/providers', labelKey: 'providers', icon: IconApi },
  { group: 'Gateway', to: '/models', labelKey: 'models', icon: IconBrain },
  { group: 'Gateway', to: '/api-keys', labelKey: 'apiKeys', icon: IconKey },
  { group: 'Billing', to: '/wallet', labelKey: 'wallet', icon: IconWallet },
  { group: 'Billing', to: '/wallet/transactions', labelKey: 'walletTransactions', icon: IconCoins },
  { group: 'Billing', to: '/invoices', labelKey: 'invoices', icon: IconFileInvoice },
  { group: 'Observability', to: '/usage-logs', labelKey: 'usageLogs', icon: IconActivity },
  { group: 'Observability', to: '/token-stats', labelKey: 'tokenStats', icon: IconChartHistogram },
  { group: 'Observability', to: '/profit', labelKey: 'profitDashboard', icon: IconReceiptTax },
  { group: 'Observability', to: '/provider-costs', labelKey: 'providerCostDashboard', icon: IconChartBar },
  { group: 'Observability', to: '/audit-logs', labelKey: 'auditLogs', icon: IconShieldCheck },
  { group: 'Orchestration', to: '/prompt-templates', labelKey: 'promptTemplates', icon: IconTemplate },
  { group: 'Orchestration', to: '/agent-configs', labelKey: 'agentConfigs', icon: IconRobot },
  { group: 'Orchestration', to: '/agent-execute-logs', labelKey: 'agentExecuteLogs', icon: IconActivity },
  { group: 'Orchestration', to: '/agent-debug', labelKey: 'agentDebug', icon: IconRobot },
  { group: 'Orchestration', to: '/workflow', labelKey: 'workflow', icon: IconSettingsAutomation },
];

function ConsoleLayout() {
  const [opened, { toggle }] = useDisclosure();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const groups = Array.from(new Set(navItems.map((item) => item.group)));

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 272, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="xl"
      className="console-shell"
    >
      <AppShell.Header className="console-header">
        <Group h="100%" px="xl" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Box className="brand-mark">Y</Box>
            <Box>
              <Text fw={700} size="sm">
                {t('appName')}
              </Text>
              <Text size="xs" c="dimmed" lh={1.1}>
                AI Gateway Console
              </Text>
            </Box>
          </Group>
          <Group gap="xs">
            <Badge variant="light" color="gray" radius="sm">
              Security
            </Badge>
            <Text size="sm" c="dimmed">
              {user?.username}
            </Text>
            <Tooltip label={t('logout')}>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={t('logout')}
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                <IconLogout size={17} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" className="console-sidebar">
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap={2}>
            {groups.map((group, index) => (
              <Box key={group}>
                {index > 0 && <Divider my={8} color="#eef1f4" />}
                <Text className="nav-section-label">{group}</Text>
                {navItems
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <NavLink
                      key={item.to}
                      label={t(item.labelKey)}
                      active={location.pathname === item.to}
                      leftSection={<item.icon size={17} stroke={1.8} />}
                      onClick={() => navigate(item.to)}
                      classNames={{ root: 'app-nav-link' }}
                    />
                  ))}
              </Box>
            ))}
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main className="console-main">
        <Box className="page-frame">
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  return accessToken ? children : <Navigate to="/login" replace />;
}

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<div className="route-skeleton" />}>{node}</Suspense>;
}


export const router = createBrowserRouter([
  { path: '/login', element: withSuspense(<LoginPage />) },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <ConsoleLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: withSuspense(<DashboardPage />) },
      { path: 'tenants', element: withSuspense(<TenantPage />) },
      { path: 'users', element: withSuspense(<UserPage />) },
      { path: 'providers', element: withSuspense(<ProviderPage />) },
      { path: 'models', element: withSuspense(<ModelPage />) },
      { path: 'api-keys', element: withSuspense(<ApiKeyPage />) },
      { path: 'wallet', element: withSuspense(<WalletPage />) },
      { path: 'wallet/transactions', element: withSuspense(<WalletTransactionPage />) },
      { path: 'invoices', element: withSuspense(<InvoicePage />) },
      { path: 'usage-logs', element: withSuspense(<UsageLogPage />) },
      { path: 'token-stats', element: withSuspense(<TokenStatsPage />) },
      { path: 'profit', element: withSuspense(<ProfitDashboardPage />) },
      { path: 'provider-costs', element: withSuspense(<ProviderCostDashboardPage />) },
      { path: 'audit-logs', element: withSuspense(<AuditLogPage />) },
      { path: 'prompt-templates', element: withSuspense(<PromptTemplatePage />) },
      { path: 'agent-configs', element: withSuspense(<AgentConfigPage />) },
      { path: 'agent-execute-logs', element: withSuspense(<AgentExecuteLogPage />) },
      { path: 'agent-debug', element: withSuspense(<AgentDebugPage />) },
      { path: 'workflow', element: withSuspense(<PlaceholderPage kind="workflow" />) },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
