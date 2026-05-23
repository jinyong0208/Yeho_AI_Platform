import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconAlertTriangle,
  IconBolt,
  IconCircleCheck,
  IconCoins,
  IconCreditCard,
  IconDownload,
  IconPlus,
  IconX,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { billingApi } from '../api/billing';
import { tenantApi } from '../api/tenants';
import { useAuthStore } from '../store/useAuthStore';
import { resolvePrimaryRole, USER_ROLES } from '../utils/roles';
import { downloadWorkbookFromRows } from '../utils/xlsx';

type TenantLite = {
  id: string;
  tenantCode: string;
  tenantName: string;
};

const readAlertCredits = (alert: any) => Number(alert.balance_credits ?? alert.balanceCredits ?? 0);
const readAlertTenant = (alert: any) => alert.tenant_name ?? alert.tenantName ?? alert.tenant_code ?? alert.tenantCode ?? '-';

export default function WalletPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const canSelectTenant = primaryRole === USER_ROLES.SUPER_ADMIN;
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const queryClient = useQueryClient();
  const numberFormatter = new Intl.NumberFormat(i18n.language);
  const formatCredits = (value?: number) => `${numberFormatter.format(value ?? 0)} ${t('common.credits')}`;
  const tenantsQuery = useQuery({ queryKey: ['tenants', 'wallet'], queryFn: tenantApi.list, enabled: canSelectTenant });
  const tenants = canSelectTenant
    ? ((tenantsQuery.data ?? []) as TenantLite[])
    : user?.tenantId
      ? [{ id: user.tenantId, tenantName: t('walletPage.currentTenant'), tenantCode: user.tenantId }]
      : [];
  const walletQuery = useQuery({
    queryKey: ['wallet', selectedTenantId],
    queryFn: () => billingApi.wallet(selectedTenantId as string),
    enabled: Boolean(selectedTenantId),
  });
  const ordersQuery = useQuery({
    queryKey: ['recharge-orders', selectedTenantId],
    queryFn: () => billingApi.rechargeOrders(selectedTenantId, 8),
    enabled: Boolean(selectedTenantId),
  });
  const lowBalanceQuery = useQuery({
    queryKey: ['wallet-low-balance', selectedTenantId],
    queryFn: () => billingApi.lowBalanceAlerts(selectedTenantId, 10000, 5),
    enabled: Boolean(selectedTenantId),
  });
  const form = useForm({
    initialValues: {
      amountCny: 100,
      credits: 100000,
      payChannel: 'MANUAL',
      remark: '',
    },
  });

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [selectedTenantId, tenants]);

  const createOrderMutation = useMutation({
    mutationFn: (values: typeof form.values) =>
      billingApi.createRechargeOrder({
        tenantId: selectedTenantId as string,
        ...values,
      }),
    onSuccess: () => {
      notifications.show({ color: 'teal', title: t('walletPage.orderCreatedTitle'), message: t('walletPage.orderCreatedMessage') });
      queryClient.invalidateQueries({ queryKey: ['recharge-orders', selectedTenantId] });
      form.reset();
      close();
    },
  });
  const confirmMutation = useMutation({
    mutationFn: billingApi.confirmRechargeOrder,
    onSuccess: () => {
      notifications.show({ color: 'teal', title: t('walletPage.orderConfirmedTitle'), message: t('walletPage.orderConfirmedMessage') });
      queryClient.invalidateQueries({ queryKey: ['wallet', selectedTenantId] });
      queryClient.invalidateQueries({ queryKey: ['recharge-orders', selectedTenantId] });
      queryClient.invalidateQueries({ queryKey: ['wallet-logs', selectedTenantId] });
      queryClient.invalidateQueries({ queryKey: ['wallet-low-balance', selectedTenantId] });
    },
  });
  const closeOrderMutation = useMutation({
    mutationFn: billingApi.closeRechargeOrder,
    onSuccess: () => {
      notifications.show({ color: 'teal', title: t('walletPage.orderClosedTitle'), message: t('walletPage.orderClosedMessage') });
      queryClient.invalidateQueries({ queryKey: ['recharge-orders', selectedTenantId] });
    },
  });
  const exportOrdersMutation = useMutation({
    mutationFn: () => billingApi.rechargeOrders(selectedTenantId, 200),
    onSuccess: (rows) => {
      downloadWorkbookFromRows(
        rows.map((order) => ({
          orderNo: order.orderNo,
          tenantId: order.tenantId,
          amountCny: order.amountCny,
          credits: order.credits,
          status: order.status,
          payChannel: order.payChannel,
          paidAt: order.paidAt ?? '',
          remark: order.remark ?? '',
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        })),
        `recharge-orders-${selectedTenantId ?? 'all'}.xlsx`,
        'Recharge Orders',
      );
      notifications.show({ color: 'teal', title: t('walletPage.exportedTitle'), message: t('walletPage.ordersExportedMessage') });
    },
  });
  const wallet = walletQuery.data;
  const orders = ordersQuery.data ?? [];
  const lowBalanceAlerts = lowBalanceQuery.data ?? [];

  const openConfirmRecharge = (orderId: string) => {
    modals.openConfirmModal({
      title: t('walletPage.confirmRechargeTitle'),
      centered: true,
      children: <Text size="sm">{t('walletPage.confirmRechargeBody')}</Text>,
      labels: { confirm: t('walletPage.confirmRecharge'), cancel: t('apiKeyPage.cancel') },
      confirmProps: { color: 'teal' },
      onConfirm: () => confirmMutation.mutate(orderId),
    });
  };

  const openCloseOrder = (orderId: string) => {
    modals.openConfirmModal({
      title: t('walletPage.closeOrderTitle'),
      centered: true,
      children: <Text size="sm">{t('walletPage.closeOrderBody')}</Text>,
      labels: { confirm: t('walletPage.closeOrder'), cancel: t('apiKeyPage.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () => closeOrderMutation.mutate(orderId),
    });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{t('walletPage.title')}</Title>
          <Text c="dimmed" maw={700}>
            {t('walletPage.description')}
          </Text>
        </Stack>
        <Button color="dark" leftSection={<IconPlus size={16} />} onClick={open} disabled={!selectedTenantId}>
          {t('walletPage.createRechargeOrder')}
        </Button>
      </Group>

      <Card className="surface-card" p="lg">
        <Select
          label={t('walletPage.tenant')}
          maw={360}
          value={selectedTenantId}
          onChange={setSelectedTenantId}
          disabled={!canSelectTenant}
          data={tenants.map((tenant) => ({
            value: tenant.id,
            label: `${tenant.tenantName} · ${tenant.tenantCode}`,
          }))}
        />
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <MetricCard icon={<IconCoins size={20} />} label={t('walletPage.balanceCredits')} value={formatCredits(wallet?.balanceCredits)} color="teal" />
        <MetricCard icon={<IconBolt size={20} />} label={t('walletPage.frozenCredits')} value={formatCredits(wallet?.frozenCredits)} color="yellow" />
        <MetricCard icon={<IconCreditCard size={20} />} label={t('walletPage.totalRechargeCredits')} value={formatCredits(wallet?.totalRechargeCredits)} color="blue" />
        <MetricCard icon={<IconCircleCheck size={20} />} label={t('walletPage.totalUsedCredits')} value={formatCredits(wallet?.totalUsedCredits)} color="red" />
      </SimpleGrid>

      {lowBalanceAlerts.length > 0 && (
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />} radius="md">
          {lowBalanceAlerts.map((alert) => `${readAlertTenant(alert)} 余额 ${formatCredits(readAlertCredits(alert))}`).join('；')}
        </Alert>
      )}

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={650}>
            {t('walletPage.rechargeOrders')}
          </Text>
          <Group gap="xs">
            <Badge color="gray" variant="light" radius="sm">
              {t('walletPage.recentCount', { count: orders.length })}
            </Badge>
            <Button
              size="xs"
              variant="light"
              color="gray"
              leftSection={<IconDownload size={14} />}
              loading={exportOrdersMutation.isPending}
              disabled={!selectedTenantId}
              onClick={() => exportOrdersMutation.mutate()}
            >
              {t('walletPage.export')}
            </Button>
          </Group>
        </Group>
        <Stack gap={0} className="subtle-list">
          {orders.map((order) => (
            <Group key={order.id} className="list-row" p="md" justify="space-between" wrap="nowrap">
              <Box>
                <Group gap="xs">
                  <Text fw={650}>{order.orderNo}</Text>
                  <Badge color={order.status === 'PAID' ? 'teal' : 'gray'} variant="light" radius="sm">
                    {order.status}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  {order.amountCny} CNY · {formatCredits(order.credits)} · {order.payChannel}
                </Text>
              </Box>
              <Group gap="xs" wrap="nowrap">
                <Button
                  variant="light"
                  color="dark"
                  size="xs"
                  leftSection={<IconCircleCheck size={14} />}
                  disabled={order.status !== 'CREATED'}
                  loading={confirmMutation.isPending}
                  onClick={() => openConfirmRecharge(order.id)}
                >
                  {t('walletPage.confirmRecharge')}
                </Button>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  leftSection={<IconX size={14} />}
                  disabled={order.status !== 'CREATED'}
                  loading={closeOrderMutation.isPending}
                  onClick={() => openCloseOrder(order.id)}
                >
                  {t('walletPage.close')}
                </Button>
              </Group>
            </Group>
          ))}
          {orders.length === 0 && (
            <Box p="xl" ta="center">
              <Text c="dimmed">{t('walletPage.emptyOrders')}</Text>
            </Box>
          )}
        </Stack>
      </Card>

      <Modal opened={opened} onClose={close} title={t('walletPage.createRechargeOrder')} centered>
        <form onSubmit={form.onSubmit((values) => createOrderMutation.mutate(values))}>
          <Stack>
            <NumberInput label={t('walletPage.amountCny')} min={1} required {...form.getInputProps('amountCny')} />
            <NumberInput label={t('common.credits')} min={1} required {...form.getInputProps('credits')} />
            <TextInput label={t('walletPage.payChannel')} required {...form.getInputProps('payChannel')} />
            <TextInput label={t('walletPage.remark')} {...form.getInputProps('remark')} />
            <Button color="dark" type="submit" loading={createOrderMutation.isPending}>
              {t('create')}
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="surface-card" p="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={650}>
            {label}
          </Text>
          <Text fw={750} size="xl">
            {value}
          </Text>
        </Stack>
        <ThemeIcon color={color} variant="light" radius="sm" size={38}>
          {icon}
        </ThemeIcon>
      </Group>
    </Card>
  );
}
