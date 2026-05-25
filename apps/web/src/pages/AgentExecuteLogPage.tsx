import { Badge, Button, Card, Group, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { orchestrationApi } from '../api/orchestration';
import { tenantApi } from '../api/tenants';
import { useAuthStore } from '../store/useAuthStore';
import { resolvePrimaryRole, USER_ROLES } from '../utils/roles';

type TenantLite = {
  id: string;
  tenantCode: string;
  tenantName: string;
};

export function AgentExecuteLogPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const canSelectTenant = primaryRole === USER_ROLES.SUPER_ADMIN;
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState('');
  const [traceId, setTraceId] = useState('');

  const tenantsQuery = useQuery({ queryKey: ['tenants', 'agent-logs'], queryFn: tenantApi.list, enabled: canSelectTenant });
  const tenants = canSelectTenant
    ? ((tenantsQuery.data ?? []) as TenantLite[])
    : user?.tenantId
      ? [{ id: user.tenantId, tenantName: t('walletPage.currentTenant'), tenantCode: user.tenantId }]
      : [];
  const hasTenantScope = canSelectTenant || Boolean(tenantId);

  useEffect(() => {
    if (!tenantId && tenants.length > 0) {
      setTenantId(tenants[0].id);
    }
  }, [tenantId, tenants]);

  const logs = useQuery({
    queryKey: ['agent-execute-logs', tenantId, requestId, traceId],
    queryFn: () =>
      orchestrationApi.agentExecuteLogs({
        tenantId: tenantId ?? undefined,
        requestId: requestId || undefined,
        traceId: traceId || undefined,
      }),
    enabled: hasTenantScope,
  });
  const rows = logs.data ?? [];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{t('agentLogPage.title')}</Title>
          <Text c="dimmed" maw={720}>
            {t('agentLogPage.description')}
          </Text>
        </Stack>
      </Group>

      <Card className="surface-card" p="lg">
        <Group align="flex-end">
          <Select
            label={t('agentLogPage.tenant')}
            data={tenants.map((tenant) => ({ value: String(tenant.id), label: `${tenant.tenantName} / ${tenant.tenantCode}` }))}
            value={tenantId}
            onChange={setTenantId}
            clearable
            disabled={!canSelectTenant}
          />
          <TextInput label={t('agentLogPage.requestId')} value={requestId} onChange={(event) => setRequestId(event.currentTarget.value)} />
          <TextInput label={t('agentLogPage.traceId')} value={traceId} onChange={(event) => setTraceId(event.currentTarget.value)} />
          <Button color="dark" onClick={() => logs.refetch()} disabled={!hasTenantScope}>
            {t('agentLogPage.query')}
          </Button>
        </Group>
      </Card>

      <Card className="surface-card" p="lg">
        <Table.ScrollContainer minWidth={980}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('agentLogPage.requestId')}</Table.Th>
                <Table.Th>{t('agentLogPage.traceId')}</Table.Th>
                <Table.Th>{t('agentLogPage.systemCode')}</Table.Th>
                <Table.Th>{t('agentLogPage.dataDomain')}</Table.Th>
                <Table.Th>{t('agentLogPage.agent')}</Table.Th>
                <Table.Th>{t('agentLogPage.model')}</Table.Th>
                <Table.Th>{t('agentLogPage.latency')}</Table.Th>
                <Table.Th>{t('agentLogPage.tokens')}</Table.Th>
                <Table.Th>{t('agentLogPage.credits')}</Table.Th>
                <Table.Th>{t('agentLogPage.status')}</Table.Th>
                <Table.Th>{t('agentLogPage.created')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((log) => (
                <Table.Tr key={log.id}>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {log.requestId}
                    </Text>
                  </Table.Td>
                  <Table.Td>{log.traceId ?? '-'}</Table.Td>
                  <Table.Td>{log.systemCode ?? '-'}</Table.Td>
                  <Table.Td>{log.dataDomain ?? '-'}</Table.Td>
                  <Table.Td>{log.agentCode ?? '-'}</Table.Td>
                  <Table.Td>{log.model ?? '-'}</Table.Td>
                  <Table.Td>{log.latencyMs ?? 0} ms</Table.Td>
                  <Table.Td>{log.totalTokens}</Table.Td>
                  <Table.Td>{log.chargeCredits}</Table.Td>
                  <Table.Td>
                    <Badge color={log.success ? 'green' : 'red'} variant="light">
                      {log.success ? t('common.success') : log.errorCode ?? t('common.failed')}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{log.createdAt}</Table.Td>
                </Table.Tr>
              ))}
              {rows.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={11}>
                    <Text c="dimmed" ta="center" py="xl">
                      {t('agentLogPage.empty')}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}

export default AgentExecuteLogPage;
