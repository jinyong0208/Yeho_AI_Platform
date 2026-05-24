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
  IconAdjustmentsHorizontal,
  IconApi,
  IconApps,
  IconBook2,
  IconBrain,
  IconChartBar,
  IconChartHistogram,
  IconCoins,
  IconGauge,
  IconKey,
  IconLogout,
  IconReceiptTax,
  IconRobot,
  IconSettingsAutomation,
  IconShieldCheck,
  IconTerminal2,
  IconUserCog,
  IconUsers,
  IconWallet,
} from '@tabler/icons-react';
import { useAuthStore } from '../store/useAuthStore';
import { isRoleAllowed, resolvePrimaryRole, USER_ROLES, type UserRole } from '../utils/roles';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const TenantPage = lazy(() => import('../pages/TenantPage'));
const UserPage = lazy(() => import('../pages/UserPage'));
const ProviderPage = lazy(() => import('../pages/ProviderPage'));
const ModelPage = lazy(() => import('../pages/ModelPage'));
const ApiKeyPage = lazy(() => import('../pages/ApiKeyPage'));
const BusinessSystemPage = lazy(() => import('../pages/BusinessSystemPage'));
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
const RateLimitPage = lazy(() => import('../pages/RateLimitPage'));
const PlaceholderPage = lazy(() => import('../pages/PlaceholderPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));

type NavItem = {
  groupKey: string;
  to: string;
  labelKey: string;
  roles: UserRole[];
  icon: ComponentType<{ size?: number; stroke?: number }>;
  muted?: boolean;
};

const allRoles = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.DEVELOPER,
  USER_ROLES.FINANCE,
  USER_ROLES.VIEWER,
];

const navItems: NavItem[] = [
  {
    groupKey: 'navGroups.runtime',
    to: '/',
    labelKey: 'nav.dashboard',
    roles: allRoles,
    icon: IconGauge,
  },
  {
    groupKey: 'navGroups.platform',
    to: '/tenants',
    labelKey: 'nav.tenants',
    roles: [USER_ROLES.SUPER_ADMIN],
    icon: IconActivity,
  },
  {
    groupKey: 'navGroups.platform',
    to: '/audit-logs',
    labelKey: 'nav.globalAudit',
    roles: [USER_ROLES.SUPER_ADMIN],
    icon: IconShieldCheck,
  },
  {
    groupKey: 'navGroups.gateway',
    to: '/providers',
    labelKey: 'nav.providerHealth',
    roles: [USER_ROLES.SUPER_ADMIN],
    icon: IconApi,
  },
  {
    groupKey: 'navGroups.gateway',
    to: '/models',
    labelKey: 'nav.providerManagement',
    roles: [USER_ROLES.SUPER_ADMIN],
    icon: IconBrain,
  },
  {
    groupKey: 'navGroups.gateway',
    to: '/rate-limits',
    labelKey: 'nav.rateLimits',
    roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.TENANT_ADMIN],
    icon: IconAdjustmentsHorizontal,
  },
  {
    groupKey: 'navGroups.gateway',
    to: '/api-keys',
    labelKey: 'nav.apiKeyScope',
    roles: [USER_ROLES.SUPER_ADMIN],
    icon: IconKey,
  },
  {
    groupKey: 'navGroups.analytics',
    to: '/provider-costs',
    labelKey: 'nav.providerAnalytics',
    roles: [USER_ROLES.SUPER_ADMIN],
    icon: IconChartBar,
  },
  {
    groupKey: 'navGroups.analytics',
    to: '/profit',
    labelKey: 'nav.billingAnalytics',
    roles: [USER_ROLES.SUPER_ADMIN],
    icon: IconReceiptTax,
  },
  {
    groupKey: 'navGroups.tenant',
    to: '/users',
    labelKey: 'nav.users',
    roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.TENANT_ADMIN],
    icon: IconUsers,
  },
  {
    groupKey: 'navGroups.tenant',
    to: '/business-systems',
    labelKey: 'nav.businessSystems',
    roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.TENANT_ADMIN],
    icon: IconApps,
  },
  {
    groupKey: 'navGroups.tenant',
    to: '/api-keys',
    labelKey: 'nav.apiKeys',
    roles: [USER_ROLES.TENANT_ADMIN, USER_ROLES.DEVELOPER],
    icon: IconKey,
  },
  {
    groupKey: 'navGroups.tenant',
    to: '/wallet',
    labelKey: 'nav.wallet',
    roles: [USER_ROLES.TENANT_ADMIN, USER_ROLES.FINANCE],
    icon: IconWallet,
  },
  {
    groupKey: 'navGroups.tenant',
    to: '/wallet/transactions',
    labelKey: 'nav.walletLogs',
    roles: [USER_ROLES.TENANT_ADMIN, USER_ROLES.FINANCE],
    icon: IconCoins,
  },
  {
    groupKey: 'navGroups.tenant',
    to: '/invoices',
    labelKey: 'nav.invoices',
    roles: [USER_ROLES.TENANT_ADMIN, USER_ROLES.FINANCE],
    icon: IconReceiptTax,
  },
  {
    groupKey: 'navGroups.observability',
    to: '/usage-logs',
    labelKey: 'nav.usage',
    roles: [USER_ROLES.TENANT_ADMIN, USER_ROLES.DEVELOPER, USER_ROLES.FINANCE, USER_ROLES.VIEWER],
    icon: IconActivity,
  },
  {
    groupKey: 'navGroups.observability',
    to: '/token-stats',
    labelKey: 'nav.tokenStats',
    roles: [USER_ROLES.TENANT_ADMIN, USER_ROLES.FINANCE, USER_ROLES.VIEWER],
    icon: IconChartHistogram,
  },
  {
    groupKey: 'navGroups.runtime',
    to: '/prompt-templates',
    labelKey: 'nav.promptTemplates',
    roles: [USER_ROLES.TENANT_ADMIN],
    icon: IconChartHistogram,
  },
  {
    groupKey: 'navGroups.runtime',
    to: '/agent-configs',
    labelKey: 'nav.agentConfigs',
    roles: [USER_ROLES.TENANT_ADMIN],
    icon: IconRobot,
  },
  {
    groupKey: 'navGroups.runtime',
    to: '/agent-execute-logs',
    labelKey: 'nav.agentLogs',
    roles: [USER_ROLES.TENANT_ADMIN],
    icon: IconActivity,
  },
  {
    groupKey: 'navGroups.developer',
    to: '/playground',
    labelKey: 'nav.playground',
    roles: [USER_ROLES.DEVELOPER],
    icon: IconTerminal2,
  },
  {
    groupKey: 'navGroups.developer',
    to: '/api-docs',
    labelKey: 'nav.apiDocs',
    roles: [USER_ROLES.DEVELOPER],
    icon: IconBook2,
  },
  {
    groupKey: 'navGroups.preview',
    to: '/workflow',
    labelKey: 'nav.workflowPreview',
    roles: [USER_ROLES.SUPER_ADMIN],
    icon: IconSettingsAutomation,
    muted: true,
  },
];

const routeRoles: Record<string, UserRole[]> = {
  '/': allRoles,
  '/tenants': [USER_ROLES.SUPER_ADMIN],
  '/users': [USER_ROLES.SUPER_ADMIN, USER_ROLES.TENANT_ADMIN],
  '/business-systems': [USER_ROLES.SUPER_ADMIN, USER_ROLES.TENANT_ADMIN],
  '/providers': [USER_ROLES.SUPER_ADMIN],
  '/models': [USER_ROLES.SUPER_ADMIN],
  '/api-keys': [USER_ROLES.SUPER_ADMIN, USER_ROLES.TENANT_ADMIN, USER_ROLES.DEVELOPER],
  '/wallet': [USER_ROLES.TENANT_ADMIN, USER_ROLES.FINANCE],
  '/wallet/transactions': [USER_ROLES.TENANT_ADMIN, USER_ROLES.FINANCE],
  '/invoices': [USER_ROLES.TENANT_ADMIN, USER_ROLES.FINANCE],
  '/usage-logs': [USER_ROLES.TENANT_ADMIN, USER_ROLES.DEVELOPER, USER_ROLES.FINANCE, USER_ROLES.VIEWER],
  '/token-stats': [USER_ROLES.SUPER_ADMIN, USER_ROLES.TENANT_ADMIN, USER_ROLES.FINANCE, USER_ROLES.VIEWER],
  '/profit': [USER_ROLES.SUPER_ADMIN],
  '/provider-costs': [USER_ROLES.SUPER_ADMIN],
  '/audit-logs': [USER_ROLES.SUPER_ADMIN],
  '/prompt-templates': [USER_ROLES.TENANT_ADMIN],
  '/agent-configs': [USER_ROLES.TENANT_ADMIN],
  '/agent-execute-logs': [USER_ROLES.TENANT_ADMIN],
  '/agent-debug': [USER_ROLES.TENANT_ADMIN],
  '/workflow': [USER_ROLES.SUPER_ADMIN],
  '/rate-limits': [USER_ROLES.SUPER_ADMIN, USER_ROLES.TENANT_ADMIN],
  '/playground': [USER_ROLES.DEVELOPER],
  '/api-docs': [USER_ROLES.DEVELOPER],
  '/profile': allRoles,
};

function ConsoleLayout() {
  const [opened, { toggle }] = useDisclosure();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const visibleItems = navItems.filter((item) => isRoleAllowed(primaryRole, item.roles));
  const groups = visibleItems.reduce<string[]>((acc, item) => {
    if (!acc.includes(item.groupKey)) {
      acc.push(item.groupKey);
    }
    return acc;
  }, []);

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
                {t('appTagline')}
              </Text>
            </Box>
          </Group>
          <Group gap="xs">
            <Badge variant="light" color="gray" radius="sm">
              {t(`roles.${primaryRole}`)}
            </Badge>
            <Text size="sm" c="dimmed">
              {user?.username}
            </Text>
            <Tooltip label={t('nav.profile')}>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={t('nav.profile')}
                onClick={() => navigate('/profile')}
              >
                <IconUserCog size={17} />
              </ActionIcon>
            </Tooltip>
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
            {groups.map((groupKey, index) => (
              <Box key={groupKey}>
                {index > 0 && <Divider my={8} color="#eef1f4" />}
                <Text className="nav-section-label">{t(groupKey)}</Text>
                {visibleItems
                  .filter((item) => item.groupKey === groupKey)
                  .map((item) => {
                    const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
                    return (
                      <NavLink
                        key={`${item.to}-${item.labelKey}`}
                        label={t(item.labelKey)}
                        active={active}
                        leftSection={<item.icon size={17} stroke={1.8} />}
                        onClick={() => navigate(item.to)}
                        classNames={{ root: item.muted ? 'app-nav-link app-nav-link-muted' : 'app-nav-link' }}
                      />
                    );
                  })}
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

function AuthorizedRoute({ path, children }: { path: string; children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const allowedRoles = routeRoles[path] ?? allRoles;

  if (!isRoleAllowed(primaryRole, allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<div className="route-skeleton" />}>{node}</Suspense>;
}

function secured(path: string, node: ReactNode) {
  return <AuthorizedRoute path={path}>{withSuspense(node)}</AuthorizedRoute>;
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
      { index: true, element: secured('/', <DashboardPage />) },
      { path: 'tenants', element: secured('/tenants', <TenantPage />) },
      { path: 'users', element: secured('/users', <UserPage />) },
      { path: 'business-systems', element: secured('/business-systems', <BusinessSystemPage />) },
      { path: 'providers', element: secured('/providers', <ProviderPage />) },
      { path: 'models', element: secured('/models', <ModelPage />) },
      { path: 'api-keys', element: secured('/api-keys', <ApiKeyPage />) },
      { path: 'wallet', element: secured('/wallet', <WalletPage />) },
      { path: 'wallet/transactions', element: secured('/wallet/transactions', <WalletTransactionPage />) },
      { path: 'invoices', element: secured('/invoices', <InvoicePage />) },
      { path: 'usage-logs', element: secured('/usage-logs', <UsageLogPage />) },
      { path: 'token-stats', element: secured('/token-stats', <TokenStatsPage />) },
      { path: 'profit', element: secured('/profit', <ProfitDashboardPage />) },
      { path: 'provider-costs', element: secured('/provider-costs', <ProviderCostDashboardPage />) },
      { path: 'audit-logs', element: secured('/audit-logs', <AuditLogPage />) },
      { path: 'prompt-templates', element: secured('/prompt-templates', <PromptTemplatePage />) },
      { path: 'agent-configs', element: secured('/agent-configs', <AgentConfigPage />) },
      { path: 'agent-execute-logs', element: secured('/agent-execute-logs', <AgentExecuteLogPage />) },
      { path: 'agent-debug', element: secured('/agent-debug', <AgentDebugPage />) },
      { path: 'workflow', element: secured('/workflow', <PlaceholderPage kind="workflow" />) },
      { path: 'rate-limits', element: secured('/rate-limits', <RateLimitPage />) },
      { path: 'playground', element: secured('/playground', <PlaceholderPage kind="playground" />) },
      { path: 'api-docs', element: secured('/api-docs', <PlaceholderPage kind="apiDocs" />) },
      { path: 'profile', element: secured('/profile', <ProfilePage />) },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
