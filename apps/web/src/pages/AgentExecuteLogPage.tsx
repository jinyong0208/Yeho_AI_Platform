import { Badge, Box, Button, Card, Code, Divider, Group, Select, SimpleGrid, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import {
  IconActivity,
  IconBolt,
  IconClock,
  IconCoins,
  IconCpu,
  IconDatabase,
  IconRoute,
  IconSettings,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AgentExecuteLog, orchestrationApi } from '../api/orchestration';
import { tenantApi } from '../api/tenants';
import { useAuthStore } from '../store/useAuthStore';
import { resolvePrimaryRole, USER_ROLES } from '../utils/roles';

type TenantLite = {
  id: string;
  tenantCode: string;
  tenantName: string;
};

type AgentTraceGroup = {
  key: string;
  requestId: string;
  traceId?: string;
  entries: AgentExecuteLog[];
  latestAt: string;
};

const shortenId = (value?: string | null) => {
  if (!value) {
    return '-';
  }
  return value.length > 28 ? `${value.slice(0, 18)}...${value.slice(-8)}` : value;
};

const formatLatency = (value?: number | null) => {
  const latency = Number(value ?? 0);
  if (latency >= 1000) {
    return `${(latency / 1000).toFixed(latency >= 10000 ? 1 : 2)} s`;
  }
  return `${latency} ms`;
};

const isConfigRead = (log: AgentExecuteLog) =>
  log.success && Number(log.totalTokens ?? 0) === 0 && Number(log.chargeCredits ?? 0) === 0;

const buildTraceGroups = (logs: AgentExecuteLog[]) => {
  const groups = new Map<string, AgentTraceGroup>();

  logs.forEach((log) => {
    const key = log.traceId || log.requestId || log.id;
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        key,
        requestId: log.requestId,
        traceId: log.traceId,
        entries: [log],
        latestAt: log.createdAt,
      });
      return;
    }

    current.entries.push(log);
    if (new Date(log.createdAt).getTime() > new Date(current.latestAt).getTime()) {
      current.latestAt = log.createdAt;
    }
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      entries: group.entries.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()),
    }))
    .sort((left, right) => new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime());
};

function StatPill({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="surface-card" p="md">
      <Group justify="space-between" align="center" wrap="nowrap">
        <Stack gap={2}>
          <Text size="xs" c="dimmed" fw={600}>
            {label}
          </Text>
          <Text size="xl" fw={800}>
            {value}
          </Text>
        </Stack>
        <ThemeIcon variant="light" color="gray" size={34} radius="md">
          {icon}
        </ThemeIcon>
      </Group>
    </Card>
  );
}

function TraceField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Text size="xs" c="dimmed" fw={600} mb={4}>
        {label}
      </Text>
      <Text size="sm" fw={650} style={{ wordBreak: 'break-word' }}>
        {value}
      </Text>
    </Box>
  );
}

export function AgentExecuteLogPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const canSelectTenant = primaryRole === USER_ROLES.SUPER_ADMIN;
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState('');
  const [traceId, setTraceId] = useState('');
  const [workflowCode, setWorkflowCode] = useState('');

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
    queryKey: ['agent-execute-logs', tenantId, requestId, traceId, workflowCode],
    queryFn: () =>
      orchestrationApi.agentExecuteLogs({
        tenantId: tenantId ?? undefined,
        requestId: requestId || undefined,
        traceId: traceId || undefined,
        workflowCode: workflowCode || undefined,
      }),
    enabled: hasTenantScope,
  });
  const rows = logs.data ?? [];
  const traceGroups = buildTraceGroups(rows);
  const modelCallCount = rows.filter((log) => !isConfigRead(log)).length;
  const configReadCount = rows.length - modelCallCount;
  const totalTokens = rows.reduce((sum, log) => sum + Number(log.totalTokens ?? 0), 0);
  const totalCredits = rows.reduce((sum, log) => sum + Number(log.chargeCredits ?? 0), 0);

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
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="md">
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
          <TextInput label={t('agentLogPage.workflow')} value={workflowCode} onChange={(event) => setWorkflowCode(event.currentTarget.value)} />
          <Button color="dark" onClick={() => logs.refetch()} disabled={!hasTenantScope} style={{ alignSelf: 'end' }}>
            {t('agentLogPage.query')}
          </Button>
        </SimpleGrid>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <StatPill label={t('agentLogPage.totalTraces')} value={traceGroups.length.toLocaleString()} icon={<IconActivity size={18} />} />
        <StatPill label={t('agentLogPage.modelCalls')} value={modelCallCount.toLocaleString()} icon={<IconBolt size={18} />} />
        <StatPill label={t('agentLogPage.configReads')} value={configReadCount.toLocaleString()} icon={<IconSettings size={18} />} />
        <StatPill label={t('agentLogPage.totalSpend')} value={`${totalTokens.toLocaleString()} / ${totalCredits.toLocaleString()}`} icon={<IconCoins size={18} />} />
      </SimpleGrid>

      <Stack gap="sm">
        {traceGroups.map((group) => {
          const primaryLog = group.entries.find((entry) => !isConfigRead(entry)) ?? group.entries[0];
          const hasModelCall = group.entries.some((entry) => !isConfigRead(entry));
          const groupSuccess = group.entries.every((entry) => entry.success);
          const groupTokens = group.entries.reduce((sum, entry) => sum + Number(entry.totalTokens ?? 0), 0);
          const groupCredits = group.entries.reduce((sum, entry) => sum + Number(entry.chargeCredits ?? 0), 0);
          const callTypeColor = hasModelCall ? 'blue' : 'gray';
          const callTypeIcon = hasModelCall ? <IconBolt size={18} /> : <IconSettings size={18} />;

          return (
            <Card key={group.key} className="surface-card" p="lg">
              <Group justify="space-between" align="flex-start" gap="md">
                <Group gap="sm" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
                  <ThemeIcon variant="light" color={callTypeColor} size={38} radius="md">
                    {callTypeIcon}
                  </ThemeIcon>
                  <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs">
                      <Code c="dark" style={{ maxWidth: '100%', overflowWrap: 'anywhere' }}>
                        {shortenId(group.requestId)}
                      </Code>
                      <Badge color={callTypeColor} variant="light">
                        {hasModelCall ? t('agentLogPage.modelCall') : t('agentLogPage.configRead')}
                      </Badge>
                      <Badge color="gray" variant="light">
                        {group.entries.length} {t('agentLogPage.records')}
                      </Badge>
                      <Badge color={groupSuccess ? 'green' : 'red'} variant="light">
                        {groupSuccess ? t('common.success') : t('common.failed')}
                      </Badge>
                    </Group>
                    <Group gap={6}>
                      <IconRoute size={14} color="#8b95a1" />
                      <Text size="xs" c="dimmed">
                        {t('agentLogPage.traceId')}
                      </Text>
                      <Code c="gray" style={{ overflowWrap: 'anywhere' }}>
                        {shortenId(group.traceId)}
                      </Code>
                    </Group>
                  </Stack>
                </Group>
                <Text size="xs" c="dimmed" ta="right">
                  {dayjs(group.latestAt).format('YYYY-MM-DD HH:mm:ss')}
                </Text>
              </Group>

              <Divider my="md" />

              <SimpleGrid cols={{ base: 2, sm: 3, lg: 7 }} spacing="md">
                <TraceField label={t('agentLogPage.systemCode')} value={primaryLog.systemCode ?? '-'} />
                <TraceField label={t('agentLogPage.dataDomain')} value={primaryLog.dataDomain ?? '-'} />
                <TraceField label={t('agentLogPage.workflow')} value={primaryLog.workflowCode ?? '-'} />
                <TraceField label={t('agentLogPage.agent')} value={primaryLog.agentCode ?? '-'} />
                <TraceField label={t('agentLogPage.model')} value={primaryLog.model ?? '-'} />
                <TraceField
                  label={t('agentLogPage.latency')}
                  value={
                    <Group gap={6} wrap="nowrap">
                      <IconClock size={14} color="#8b95a1" />
                      {formatLatency(primaryLog.latencyMs)}
                    </Group>
                  }
                />
                <TraceField
                  label={t('agentLogPage.consumption')}
                  value={
                    <Group gap={6} wrap="nowrap">
                      <IconCpu size={14} color="#8b95a1" />
                      {groupTokens.toLocaleString()} / {groupCredits.toLocaleString()}
                    </Group>
                  }
                />
              </SimpleGrid>

              <Divider my="md" />

              <Stack gap="xs">
                <Text size="xs" c="dimmed" fw={700}>
                  {t('agentLogPage.stages')}
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                  {group.entries.map((entry, index) => {
                    const entryConfigRead = isConfigRead(entry);
                    return (
                      <Box
                        key={entry.id}
                        p="xs"
                        style={{
                          border: '1px solid #edf0f3',
                          borderRadius: 8,
                          background: entryConfigRead ? '#fbfcfe' : '#f8fbff',
                        }}
                      >
                        <Group justify="space-between" gap="xs" wrap="nowrap">
                          <Badge color={entryConfigRead ? 'gray' : 'blue'} variant="light">
                            {index + 1}. {entryConfigRead ? t('agentLogPage.configRead') : t('agentLogPage.modelCall')}
                          </Badge>
                          <Text size="xs" c="dimmed">
                            {formatLatency(entry.latencyMs)}
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed" mt={6}>
                          {t('agentLogPage.consumption')}：{Number(entry.totalTokens ?? 0).toLocaleString()} /{' '}
                          {Number(entry.chargeCredits ?? 0).toLocaleString()}
                        </Text>
                      </Box>
                    );
                  })}
                </SimpleGrid>
              </Stack>
            </Card>
          );
        })}

        {rows.length === 0 && (
          <Card className="surface-card" p="xl">
            <Stack align="center" gap="sm">
              <ThemeIcon variant="light" color="gray" size={42} radius="md">
                <IconDatabase size={20} />
              </ThemeIcon>
              <Text c="dimmed" ta="center">
                {t('agentLogPage.empty')}
              </Text>
            </Stack>
          </Card>
        )}
      </Stack>
    </Stack>
  );
}

export default AgentExecuteLogPage;
