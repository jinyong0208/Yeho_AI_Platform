import {
  AppShell,
  ActionIcon,
  Badge,
  Tooltip,
  Burger,
  Group,
  NavLink,
  ScrollArea,
  Text,
  Box,
  Stack,
  Divider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconActivity,
  IconBrandOpenai,
  IconChartBar,
  IconCoins,
  IconDashboard,
  IconKey,
  IconLogout,
  IconReceipt2,
  IconRouteAltLeft,
  IconServerCog,
  IconShieldCheck,
  IconUsers,
  IconBuilding,
} from '@tabler/icons-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';

const navItems = [
  { group: 'Workspace', to: '/', labelKey: 'dashboard', icon: IconDashboard },
  { group: 'Workspace', to: '/tenants', labelKey: 'tenants', icon: IconBuilding },
  { group: 'Workspace', to: '/users', labelKey: 'users', icon: IconUsers },
  { group: 'Gateway', to: '/providers', labelKey: 'providers', icon: IconServerCog },
  { group: 'Gateway', to: '/models', labelKey: 'models', icon: IconBrandOpenai },
  { group: 'Gateway', to: '/api-keys', labelKey: 'apiKeys', icon: IconKey },
  { group: 'Billing', to: '/wallet', labelKey: 'wallet', icon: IconCoins },
  { group: 'Billing', to: '/wallet/transactions', labelKey: 'walletTransactions', icon: IconReceipt2 },
  { group: 'Observability', to: '/usage-logs', labelKey: 'usageLogs', icon: IconActivity },
  { group: 'Observability', to: '/token-stats', labelKey: 'tokenStats', icon: IconChartBar },
  { group: 'Observability', to: '/audit-logs', labelKey: 'auditLogs', icon: IconShieldCheck },
  { group: 'Orchestration', to: '/workflow', labelKey: 'workflow', icon: IconRouteAltLeft },
];

export default function MainLayout() {
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
