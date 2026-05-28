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
  IconBuildingBank,
  IconCircleCheck,
  IconClipboardText,
  IconCoins,
  IconCreditCard,
  IconDownload,
  IconInfoCircle,
  IconPlus,
  IconReceipt,
  IconRefresh,
  IconShieldCheck,
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

const CREDITS_PER_CNY = 1000;
const readAlertCredits = (alert: any) => Number(alert.balance_credits ?? alert.balanceCredits ?? 0);
const readAlertTenant = (alert: any) => alert.tenant_name ?? alert.tenantName ?? alert.tenant_code ?? alert.tenantCode ?? '-';

export default function WalletPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const canSelectTenant = primaryRole === USER_ROLES.SUPER_ADMIN;
  const canCreateRechargeOrder =
    primaryRole === USER_ROLES.SUPER_ADMIN || primaryRole === USER_ROLES.TENANT_ADMIN || primaryRole === USER_ROLES.FINANCE;
  const canManageRechargeOrder = primaryRole === USER_ROLES.SUPER_ADMIN || primaryRole === USER_ROLES.FINANCE;
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
    enabled: Boolean(selectedTenantId) && canCreateRechargeOrder,
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
      payChannel: 'BANK_TRANSFER',
      payerName: '',
      payerAccount: '',
      paymentProofNo: '',
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
          payerName: order.payerName ?? '',
          payerAccount: order.payerAccount ?? '',
          paymentProofNo: order.paymentProofNo ?? '',
          paidAt: order.paidAt ?? '',
          remark: order.remark ?? '',
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        })),
        `recharge-orders-${selectedTenantId ?? 'all'}.xlsx`,
        t('walletPage.rechargeOrders'),
      );
      notifications.show({ color: 'teal', title: t('walletPage.exportedTitle'), message: t('walletPage.ordersExportedMessage') });
    },
  });
  const wallet = walletQuery.data;
  const orders = ordersQuery.data ?? [];
  const lowBalanceAlerts = lowBalanceQuery.data ?? [];
  const previewCredits = formatCredits(form.values.credits);

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
        {canCreateRechargeOrder && (
          <Button color="dark" leftSection={<IconPlus size={16} />} onClick={open} disabled={!selectedTenantId}>
            {t('walletPage.createRechargeOrder')}
          </Button>
        )}
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

      <Card className="surface-card" p="lg">
        <Group justify="space-between" align="flex-start" mb="md">
          <Stack gap={4}>
            <Text fw={750}>{t('walletPage.guideTitle')}</Text>
            <Text size="sm" c="dimmed" maw={760}>
              {t('walletPage.guideDescription')}
            </Text>
          </Stack>
          <Badge color="teal" variant="light" radius="sm">
            {t('walletPage.exchangeRateValue')}
          </Badge>
        </Group>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          <GuideCard
            icon={<IconInfoCircle size={20} />}
            color="blue"
            title={t('walletPage.exchangeRateTitle')}
            body={t('walletPage.exchangeRateHint')}
          />
          <GuideCard
            icon={<IconShieldCheck size={20} />}
            color="yellow"
            title={t('walletPage.freezeTitle')}
            body={t('walletPage.freezeBody')}
          />
          <GuideCard
            icon={<IconRefresh size={20} />}
            color="teal"
            title={t('walletPage.settlementTitle')}
            body={t('walletPage.settlementBody')}
          />
        </SimpleGrid>
      </Card>

      {lowBalanceAlerts.length > 0 && (
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />} radius="md">
          {lowBalanceAlerts
            .map((alert) =>
              t('walletPage.lowBalanceAlert', {
                tenant: readAlertTenant(alert),
                balance: formatCredits(readAlertCredits(alert)),
              }),
            )
            .join('；')}
        </Alert>
      )}

      {canCreateRechargeOrder && (
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
                    {t(`common.statusLabels.${order.status}`, { defaultValue: order.status })}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  {order.amountCny} CNY · {formatCredits(order.credits)} · {order.payChannel}
                </Text>
                <Text size="xs" c="dimmed">
                  {t('walletPage.paymentMeta', {
                    payer: order.payerName || t('walletPage.unfilled'),
                    proof: order.paymentProofNo || t('walletPage.unfilled'),
                  })}
                </Text>
              </Box>
              {canManageRechargeOrder ? (
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
              ) : (
                <Badge color={order.status === 'CREATED' ? 'yellow' : 'teal'} variant="light" radius="sm">
                  {order.status === 'CREATED' ? t('walletPage.waitingFinance') : t(`common.statusLabels.${order.status}`, { defaultValue: order.status })}
                </Badge>
              )}
            </Group>
          ))}
          {orders.length === 0 && (
            <Box p="xl" ta="center">
              <Text c="dimmed">{t('walletPage.emptyOrders')}</Text>
            </Box>
          )}
        </Stack>
      </Card>
      )}

      {canCreateRechargeOrder && (
      <Modal opened={opened} onClose={close} title={t('walletPage.createRechargeOrder')} centered>
        <form onSubmit={form.onSubmit((values) => createOrderMutation.mutate(values))}>
          <Stack>
            <Alert color="blue" variant="light" icon={<IconReceipt size={16} />}>
              {t('walletPage.rechargeHelp')}
            </Alert>
            <Box
              p="md"
              style={(theme) => ({
                border: `1px solid ${theme.colors.gray[2]}`,
                borderRadius: theme.radius.md,
                background: theme.colors.gray[0],
              })}
            >
              <Group align="flex-start" wrap="nowrap">
                <ThemeIcon color="blue" variant="light" radius="sm">
                  <IconBuildingBank size={18} />
                </ThemeIcon>
                <Stack gap={4}>
                  <Text fw={700} size="sm">
                    {t('walletPage.offlinePaymentTitle')}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {t('walletPage.offlinePaymentBody')}
                  </Text>
                </Stack>
              </Group>
            </Box>
            <NumberInput
              label={t('walletPage.amountCny')}
              description={t('walletPage.amountCnyDescription')}
              min={1}
              required
              value={form.values.amountCny}
              onChange={(value) => {
                const amount = Number(value) || 0;
                form.setFieldValue('amountCny', amount);
                form.setFieldValue('credits', Math.max(1, Math.round(amount * CREDITS_PER_CNY)));
              }}
            />
            <NumberInput
              label={t('common.credits')}
              description={t('walletPage.creditsDescription')}
              min={1}
              required
              {...form.getInputProps('credits')}
            />
            <Text size="sm" c="dimmed">
              {t('walletPage.estimatedArrival', { credits: previewCredits })}
            </Text>
            <TextInput label={t('walletPage.payChannel')} required {...form.getInputProps('payChannel')} />
            <TextInput label={t('walletPage.payerName')} {...form.getInputProps('payerName')} />
            <TextInput label={t('walletPage.payerAccount')} {...form.getInputProps('payerAccount')} />
            <TextInput
              label={t('walletPage.paymentProofNo')}
              description={t('walletPage.paymentProofNoDescription')}
              leftSection={<IconClipboardText size={16} />}
              {...form.getInputProps('paymentProofNo')}
            />
            <TextInput label={t('walletPage.remark')} {...form.getInputProps('remark')} />
            <Button color="dark" type="submit" loading={createOrderMutation.isPending}>
              {t('create')}
            </Button>
          </Stack>
        </form>
      </Modal>
      )}
    </Stack>
  );
}

function GuideCard({
  icon,
  color,
  title,
  body,
}: {
  icon: ReactNode;
  color: string;
  title: string;
  body: string;
}) {
  return (
    <Box
      p="md"
      style={(theme) => ({
        border: `1px solid ${theme.colors.gray[2]}`,
        borderRadius: theme.radius.md,
      })}
    >
      <Group align="flex-start" wrap="nowrap">
        <ThemeIcon color={color} variant="light" radius="sm" size={36}>
          {icon}
        </ThemeIcon>
        <Stack gap={4}>
          <Text size="sm" fw={700}>
            {title}
          </Text>
          <Text size="sm" c="dimmed">
            {body}
          </Text>
        </Stack>
      </Group>
    </Box>
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
