import { Badge, Box, Button, Card, Group, Select, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery } from '@tanstack/react-query';
import { IconArrowDownRight, IconArrowUpRight, IconDownload, IconReceipt2 } from '@tabler/icons-react';
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

export default function WalletTransactionPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const canSelectTenant = primaryRole === USER_ROLES.SUPER_ADMIN;
  const numberFormatter = new Intl.NumberFormat(i18n.language);
  const formatCredits = (value?: number) => `${numberFormatter.format(value ?? 0)} ${t('common.credits')}`;
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const tenantsQuery = useQuery({ queryKey: ['tenants', 'wallet-logs'], queryFn: tenantApi.list, enabled: canSelectTenant });
  const tenants = canSelectTenant
    ? ((tenantsQuery.data ?? []) as TenantLite[])
    : user?.tenantId
      ? [{ id: user.tenantId, tenantName: t('walletPage.currentTenant'), tenantCode: user.tenantId }]
      : [];
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
        t('walletLogPage.ledger'),
      );
      notifications.show({ color: 'teal', title: t('walletPage.exportedTitle'), message: t('walletPage.ledgerExportedMessage') });
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
          <Title order={2}>{t('walletLogPage.title')}</Title>
          <Text c="dimmed" maw={680}>
            {t('walletLogPage.description')}
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
          {t('walletLogPage.exportLedger')}
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

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={650}>
            {t('walletLogPage.ledger')}
          </Text>
          <Badge color="gray" variant="light" radius="sm">
            {t('walletLogPage.rowCount', { count: logs.length })}
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
                        {t(`common.statusLabels.${log.direction}`, { defaultValue: log.direction })}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {log.remark || log.bizId || t('walletLogPage.noRemark')} · {log.createdAt}
                    </Text>
                  </Box>
                </Group>
                <Stack gap={2} align="flex-end">
                  <Text fw={700}>{formatCredits(log.amountCredits)}</Text>
                  <Text size="xs" c="dimmed">
                    {t('walletLogPage.balanceAfter')} {formatCredits(log.balanceAfter)}
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
              <Text c="dimmed">{t('walletLogPage.empty')}</Text>
            </Box>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
