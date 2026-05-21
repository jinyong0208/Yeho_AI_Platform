import {
  AppShell,
  Burger,
  Group,
  NavLink,
  ScrollArea,
  Text,
  Button,
  Box,
  Stack,
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
  IconUsers,
  IconBuilding,
} from '@tabler/icons-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';

const navItems = [
  { to: '/', labelKey: 'dashboard', icon: IconDashboard },
  { to: '/tenants', labelKey: 'tenants', icon: IconBuilding },
  { to: '/users', labelKey: 'users', icon: IconUsers },
  { to: '/providers', labelKey: 'providers', icon: IconServerCog },
  { to: '/models', labelKey: 'models', icon: IconBrandOpenai },
  { to: '/api-keys', labelKey: 'apiKeys', icon: IconKey },
  { to: '/wallet', labelKey: 'wallet', icon: IconCoins },
  { to: '/wallet/transactions', labelKey: 'walletTransactions', icon: IconReceipt2 },
  { to: '/usage-logs', labelKey: 'usageLogs', icon: IconActivity },
  { to: '/token-stats', labelKey: 'tokenStats', icon: IconChartBar },
  { to: '/workflow', labelKey: 'workflow', icon: IconRouteAltLeft },
];

export default function MainLayout() {
  const [opened, { toggle }] = useDisclosure();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Box>
              <Text fw={700}>{t('appName')}</Text>
              <Text size="xs" c="dimmed">
                AI Gateway Console
              </Text>
            </Box>
          </Group>
          <Group gap="sm">
            <Text size="sm" c="dimmed">
              {user?.username}
            </Text>
            <Button
              variant="subtle"
              leftSection={<IconLogout size={16} />}
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              {t('logout')}
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap={4}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                label={t(item.labelKey)}
                active={location.pathname === item.to}
                leftSection={<item.icon size={18} />}
                onClick={() => navigate(item.to)}
              />
            ))}
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
