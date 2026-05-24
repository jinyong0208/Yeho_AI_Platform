import { Badge, Box, Card, Group, Select, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconActivity, IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tenantApi } from '../api/tenants';
import { usageApi } from '../api/usage';
import { useAuthStore } from '../store/useAuthStore';
import { resolvePrimaryRole, USER_ROLES } from '../utils/roles';

type TenantLite = {
  id: string;
  tenantCode: string;
  tenantName: string;
};

export default function UsageLogPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const canSelectTenant = primaryRole === USER_ROLES.SUPER_ADMIN;
  const numberFormatter = new Intl.NumberFormat(i18n.language);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [modelCode, setModelCode] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const tenantsQuery = useQuery({ queryKey: ['tenants', 'usage-logs'], queryFn: tenantApi.list, enabled: canSelectTenant });
  const tenants = canSelectTenant
    ? ((tenantsQuery.data ?? []) as TenantLite[])
    : user?.tenantId
      ? [{ id: user.tenantId, tenantName: t('walletPage.currentTenant'), tenantCode: user.tenantId }]
      : [];

  useEffect(() => {
    if (!tenantId && tenants.length > 0) {
      setTenantId(tenants[0].id);
    }
  }, [tenantId, tenants]);

  const logsQuery = useQuery({
    queryKey: ['usage-logs', tenantId, modelCode, success],
    queryFn: () =>
      usageApi.logs({
        tenantId,
        modelCode,
        success: success === null ? null : success === 'true',
        limit: 80,
      }),
    enabled: canSelectTenant || Boolean(tenantId),
  });
  const logs = logsQuery.data ?? [];
  const modelOptions = useMemo(() => {
    const models = new Set(logs.map((log) => log.modelCode).filter(Boolean) as string[]);
    if (modelCode) {
      models.add(modelCode);
    }
    return Array.from(models).sort().map((model) => ({ value: model, label: model }));
  }, [logs, modelCode]);
  const formatNumber = (value?: number) => numberFormatter.format(value ?? 0);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{t('usageLogPage.title')}</Title>
          <Text c="dimmed" maw={700}>
            {t('usageLogPage.description')}
          </Text>
        </Stack>
      </Group>

      <Card className="surface-card" p="lg">
        <Group align="end">
          <Select
            label={t('walletPage.tenant')}
            clearable
            maw={300}
            value={tenantId}
            onChange={setTenantId}
            disabled={!canSelectTenant}
            data={tenants.map((tenant) => ({
              value: tenant.id,
              label: `${tenant.tenantName} · ${tenant.tenantCode}`,
            }))}
          />
          <Select
            label={t('usageLogPage.model')}
            clearable
            searchable
            maw={260}
            value={modelCode || null}
            onChange={(value) => setModelCode(value || '')}
            data={modelOptions}
          />
          <Select
            label={t('usageLogPage.result')}
            clearable
            maw={180}
            value={success}
            onChange={setSuccess}
            data={[
              { value: 'true', label: t('common.success') },
              { value: 'false', label: t('common.failed') },
            ]}
          />
        </Group>
      </Card>

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={650}>
            {t('usageLogPage.gatewayCalls')}
          </Text>
          <Badge color="gray" variant="light" radius="sm">
            {t('usageLogPage.rowCount', { count: logs.length })}
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
                    <Text fw={650}>{log.modelCode || t('common.unknownModel')}</Text>
                    <Badge color={log.success ? 'teal' : 'red'} variant="light" radius="sm">
                      {log.success ? t('common.success') : t('common.failed')}
                    </Badge>
                    {log.providerCode && (
                      <Badge color="gray" variant="light" radius="sm">
                        {log.providerCode}
                      </Badge>
                    )}
                    {log.systemCode && (
                      <Badge color="blue" variant="light" radius="sm">
                        {t('usageLogPage.systemCode')} {log.systemCode}
                      </Badge>
                    )}
                    {log.dataDomain && (
                      <Badge color="violet" variant="light" radius="sm">
                        {t('usageLogPage.dataDomain')} {log.dataDomain}
                      </Badge>
                    )}
                    {log.agentCode && (
                      <Badge color="grape" variant="light" radius="sm">
                        Agent {log.agentCode}
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
                <LogMetric label={t('usageLogPage.totalTokens')} value={formatNumber(log.totalTokens)} />
                <LogMetric label={t('common.credits')} value={formatNumber(log.chargeCredits)} />
                <LogMetric label={t('usageLogPage.latency')} value={`${formatNumber(log.latencyMs)} ms`} />
              </Group>
            </Group>
          ))}
          {logs.length === 0 && (
            <Box p="xl" ta="center">
              <ThemeIcon color="gray" variant="light" radius="sm" size={40} mb="sm" mx="auto">
                <IconActivity size={20} />
              </ThemeIcon>
              <Text c="dimmed">{t('usageLogPage.empty')}</Text>
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
