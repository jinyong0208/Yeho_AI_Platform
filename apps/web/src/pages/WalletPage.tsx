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
import { IconAlertTriangle, IconBolt, IconCircleCheck, IconCoins, IconCreditCard, IconPlus, IconX } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { billingApi } from '../api/billing';
import { tenantApi } from '../api/tenants';

type TenantLite = {
  id: string;
  tenantCode: string;
  tenantName: string;
};

const formatCredits = (value?: number) => `${(value ?? 0).toLocaleString()} Credits`;
const readAlertCredits = (alert: any) => Number(alert.balance_credits ?? alert.balanceCredits ?? 0);
const readAlertTenant = (alert: any) => alert.tenant_name ?? alert.tenantName ?? alert.tenant_code ?? alert.tenantCode ?? '-';

export default function WalletPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const queryClient = useQueryClient();
  const tenantsQuery = useQuery({ queryKey: ['tenants'], queryFn: tenantApi.list });
  const tenants = (tenantsQuery.data ?? []) as TenantLite[];
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
      notifications.show({ color: 'teal', title: '已创建', message: '充值订单已生成，可在列表中确认。' });
      queryClient.invalidateQueries({ queryKey: ['recharge-orders', selectedTenantId] });
      form.reset();
      close();
    },
  });
  const confirmMutation = useMutation({
    mutationFn: billingApi.confirmRechargeOrder,
    onSuccess: () => {
      notifications.show({ color: 'teal', title: '已确认', message: 'Credits 已入账。' });
      queryClient.invalidateQueries({ queryKey: ['wallet', selectedTenantId] });
      queryClient.invalidateQueries({ queryKey: ['recharge-orders', selectedTenantId] });
      queryClient.invalidateQueries({ queryKey: ['wallet-logs', selectedTenantId] });
      queryClient.invalidateQueries({ queryKey: ['wallet-low-balance', selectedTenantId] });
    },
  });
  const closeOrderMutation = useMutation({
    mutationFn: billingApi.closeRechargeOrder,
    onSuccess: () => {
      notifications.show({ color: 'teal', title: '已关闭', message: '充值订单已关闭，钱包余额未变化。' });
      queryClient.invalidateQueries({ queryKey: ['recharge-orders', selectedTenantId] });
    },
  });
  const wallet = walletQuery.data;
  const orders = ordersQuery.data ?? [];
  const lowBalanceAlerts = lowBalanceQuery.data ?? [];

  const openConfirmRecharge = (orderId: string) => {
    modals.openConfirmModal({
      title: '确认充值入账',
      centered: true,
      children: <Text size="sm">确认后 Credits 会写入钱包并生成钱包流水。</Text>,
      labels: { confirm: '确认入账', cancel: '取消' },
      confirmProps: { color: 'teal' },
      onConfirm: () => confirmMutation.mutate(orderId),
    });
  };

  const openCloseOrder = (orderId: string) => {
    modals.openConfirmModal({
      title: '关闭充值订单',
      centered: true,
      children: <Text size="sm">关闭后订单不会入账，仅保留操作记录。</Text>,
      labels: { confirm: '关闭订单', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: () => closeOrderMutation.mutate(orderId),
    });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>钱包余额</Title>
          <Text c="dimmed" maw={700}>
            用 Credits 统一承载租户余额、冻结额度和累计消耗，方便后续对接充值与发票。
          </Text>
        </Stack>
        <Button color="dark" leftSection={<IconPlus size={16} />} onClick={open} disabled={!selectedTenantId}>
          创建充值订单
        </Button>
      </Group>

      <Card className="surface-card" p="lg">
        <Select
          label="租户"
          maw={360}
          value={selectedTenantId}
          onChange={setSelectedTenantId}
          data={tenants.map((tenant) => ({
            value: tenant.id,
            label: `${tenant.tenantName} · ${tenant.tenantCode}`,
          }))}
        />
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <MetricCard icon={<IconCoins size={20} />} label="可用余额" value={formatCredits(wallet?.balanceCredits)} color="teal" />
        <MetricCard icon={<IconBolt size={20} />} label="冻结额度" value={formatCredits(wallet?.frozenCredits)} color="yellow" />
        <MetricCard icon={<IconCreditCard size={20} />} label="累计充值" value={formatCredits(wallet?.totalRechargeCredits)} color="blue" />
        <MetricCard icon={<IconCircleCheck size={20} />} label="累计消耗" value={formatCredits(wallet?.totalUsedCredits)} color="red" />
      </SimpleGrid>

      {lowBalanceAlerts.length > 0 && (
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />} radius="md">
          {lowBalanceAlerts.map((alert) => `${readAlertTenant(alert)} 余额 ${formatCredits(readAlertCredits(alert))}`).join('；')}
        </Alert>
      )}

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={650}>
            Recharge Orders
          </Text>
          <Badge color="gray" variant="light" radius="sm">
            {orders.length} recent
          </Badge>
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
                  确认入账
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
                  关闭
                </Button>
              </Group>
            </Group>
          ))}
          {orders.length === 0 && (
            <Box p="xl" ta="center">
              <Text c="dimmed">暂无充值订单。</Text>
            </Box>
          )}
        </Stack>
      </Card>

      <Modal opened={opened} onClose={close} title="创建充值订单" centered>
        <form onSubmit={form.onSubmit((values) => createOrderMutation.mutate(values))}>
          <Stack>
            <NumberInput label="金额 CNY" min={1} required {...form.getInputProps('amountCny')} />
            <NumberInput label="Credits" min={1} required {...form.getInputProps('credits')} />
            <TextInput label="支付渠道" required {...form.getInputProps('payChannel')} />
            <TextInput label="备注" {...form.getInputProps('remark')} />
            <Button color="dark" type="submit" loading={createOrderMutation.isPending}>
              创建
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
