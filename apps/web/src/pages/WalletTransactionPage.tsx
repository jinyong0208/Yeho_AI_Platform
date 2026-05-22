import { Badge, Box, Button, Card, Group, Select, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery } from '@tanstack/react-query';
import { IconArrowDownRight, IconArrowUpRight, IconDownload, IconReceipt2 } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { billingApi } from '../api/billing';
import { tenantApi } from '../api/tenants';
import { downloadWorkbookFromRows } from '../utils/xlsx';

type TenantLite = {
  id: string;
  tenantCode: string;
  tenantName: string;
};

const formatCredits = (value?: number) => `${(value ?? 0).toLocaleString()} Credits`;

export default function WalletTransactionPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const tenantsQuery = useQuery({ queryKey: ['tenants'], queryFn: tenantApi.list });
  const tenants = (tenantsQuery.data ?? []) as TenantLite[];
  const logsQuery = useQuery({
    queryKey: ['wallet-logs', selectedTenantId],
    queryFn: () => billingApi.walletLogs(selectedTenantId as string, 80),
    enabled: Boolean(selectedTenantId),
  });
  const logs = logsQuery.data ?? [];
  const exportLogsMutation = useMutation({
    mutationFn: () => billingApi.walletLogs(selectedTenantId as string, 500),
    onSuccess: (rows) => {
      downloadWorkbookFromRows(
        rows.map((log) => ({
          id: log.id,
          tenantId: log.tenantId,
          bizType: log.bizType,
          bizId: log.bizId ?? '',
          direction: log.direction,
          amountCredits: log.amountCredits,
          balanceAfter: log.balanceAfter,
          remark: log.remark ?? '',
          createdAt: log.createdAt,
        })),
        `wallet-ledger-${selectedTenantId}.xlsx`,
        'Wallet Ledger',
      );
      notifications.show({ color: 'teal', title: '已导出', message: '钱包流水对账文件已生成。' });
    },
  });

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [selectedTenantId, tenants]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>钱包流水</Title>
          <Text c="dimmed" maw={680}>
            记录充值、冻结、扣费和释放动作，为账务核对保留清晰轨迹。
          </Text>
        </Stack>
        <Button
          variant="light"
          color="gray"
          leftSection={<IconDownload size={16} />}
          disabled={!selectedTenantId}
          loading={exportLogsMutation.isPending}
          onClick={() => exportLogsMutation.mutate()}
        >
          导出流水
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

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={650}>
            Wallet Ledger
          </Text>
          <Badge color="gray" variant="light" radius="sm">
            {logs.length} rows
          </Badge>
        </Group>
        <Stack gap={0} className="subtle-list">
          {logs.map((log) => {
            const incoming = log.direction === 'IN';
            return (
              <Group key={log.id} className="list-row" p="md" justify="space-between" wrap="nowrap">
                <Group wrap="nowrap">
                  <ThemeIcon color={incoming ? 'teal' : 'red'} variant="light" radius="sm" size={38}>
                    {incoming ? <IconArrowDownRight size={20} /> : <IconArrowUpRight size={20} />}
                  </ThemeIcon>
                  <Box>
                    <Group gap="xs">
                      <Text fw={650}>{log.bizType}</Text>
                      <Badge color={incoming ? 'teal' : 'gray'} variant="light" radius="sm">
                        {log.direction}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {log.remark || log.bizId || '无备注'} · {log.createdAt}
                    </Text>
                  </Box>
                </Group>
                <Stack gap={2} align="flex-end">
                  <Text fw={700}>{formatCredits(log.amountCredits)}</Text>
                  <Text size="xs" c="dimmed">
                    after {formatCredits(log.balanceAfter)}
                  </Text>
                </Stack>
              </Group>
            );
          })}
          {logs.length === 0 && (
            <Box p="xl" ta="center">
              <ThemeIcon color="gray" variant="light" radius="sm" size={40} mb="sm" mx="auto">
                <IconReceipt2 size={20} />
              </ThemeIcon>
              <Text c="dimmed">暂无钱包流水。</Text>
            </Box>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
