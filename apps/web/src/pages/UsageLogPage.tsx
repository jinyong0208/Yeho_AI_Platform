import { Badge, Box, Card, Group, Select, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconActivity, IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { gatewayApi } from '../api/gateway';
import { tenantApi } from '../api/tenants';
import { usageApi } from '../api/usage';

type TenantLite = {
  id: string;
  tenantCode: string;
  tenantName: string;
};

export default function UsageLogPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [modelCode, setModelCode] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const tenantsQuery = useQuery({ queryKey: ['tenants'], queryFn: tenantApi.list });
  const modelsQuery = useQuery({ queryKey: ['models'], queryFn: gatewayApi.models });
  const logsQuery = useQuery({
    queryKey: ['usage-logs', tenantId, modelCode, success],
    queryFn: () =>
      usageApi.logs({
        tenantId,
        modelCode,
        success: success === null ? null : success === 'true',
        limit: 80,
      }),
  });
  const tenants = (tenantsQuery.data ?? []) as TenantLite[];
  const logs = logsQuery.data ?? [];
  const models = modelsQuery.data ?? [];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>调用日志</Title>
          <Text c="dimmed" maw={700}>
            追踪每次网关请求的 request_id、模型、Token、扣费和错误信息，默认不展示 Prompt 原文。
          </Text>
        </Stack>
      </Group>

      <Card className="surface-card" p="lg">
        <Group align="end">
          <Select
            label="租户"
            clearable
            maw={300}
            value={tenantId}
            onChange={setTenantId}
            data={tenants.map((tenant) => ({
              value: tenant.id,
              label: `${tenant.tenantName} · ${tenant.tenantCode}`,
            }))}
          />
          <Select
            label="模型"
            clearable
            searchable
            maw={260}
            value={modelCode || null}
            onChange={(value) => setModelCode(value || '')}
            data={models.map((model) => ({ value: model.modelCode, label: model.modelCode }))}
          />
          <Select
            label="结果"
            clearable
            maw={180}
            value={success}
            onChange={setSuccess}
            data={[
              { value: 'true', label: 'Success' },
              { value: 'false', label: 'Failed' },
            ]}
          />
        </Group>
      </Card>

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={650}>
            Gateway Calls
          </Text>
          <Badge color="gray" variant="light" radius="sm">
            {logs.length} rows
          </Badge>
        </Group>
        <Stack gap={0} className="subtle-list">
          {logs.map((log) => (
            <Group key={log.id} className="list-row" p="md" justify="space-between" wrap="nowrap">
              <Group wrap="nowrap" maw="58%">
                <ThemeIcon color={log.success ? 'teal' : 'red'} variant="light" radius="sm" size={38}>
                  {log.success ? <IconCircleCheck size={20} /> : <IconAlertTriangle size={20} />}
                </ThemeIcon>
                <Box>
                  <Group gap="xs">
                    <Text fw={650}>{log.modelCode || 'unknown model'}</Text>
                    <Badge color={log.success ? 'teal' : 'red'} variant="light" radius="sm">
                      {log.success ? 'SUCCESS' : 'FAILED'}
                    </Badge>
                    {log.providerCode && (
                      <Badge color="gray" variant="light" radius="sm">
                        {log.providerCode}
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    {log.requestId} · {log.createdAt}
                  </Text>
                  {!log.success && log.errorMessage && (
                    <Text size="xs" c="red" mt={4} lineClamp={1}>
                      {log.errorCode}: {log.errorMessage}
                    </Text>
                  )}
                </Box>
              </Group>
              <Group gap="xl" wrap="nowrap" visibleFrom="sm">
                <LogMetric label="Total Tokens" value={String(log.totalTokens ?? 0)} />
                <LogMetric label="Credits" value={String(log.chargeCredits ?? 0)} />
                <LogMetric label="Latency" value={`${log.latencyMs ?? 0}ms`} />
              </Group>
            </Group>
          ))}
          {logs.length === 0 && (
            <Box p="xl" ta="center">
              <ThemeIcon color="gray" variant="light" radius="sm" size={40} mb="sm" mx="auto">
                <IconActivity size={20} />
              </ThemeIcon>
              <Text c="dimmed">暂无调用日志。</Text>
            </Box>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

function LogMetric({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={2} align="flex-end" miw={86}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={700}>
        {value}
      </Text>
    </Stack>
  );
}
