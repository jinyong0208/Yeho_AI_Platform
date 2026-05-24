import { Badge, Box, Card, Group, Select, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconSearch,
  IconShieldCheck,
  IconUserShield,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { auditApi } from '../api/audit';
import { tenantApi } from '../api/tenants';

type TenantLite = {
  id: string;
  tenantCode: string;
  tenantName: string;
};

export default function AuditLogPage() {
  const { t } = useTranslation();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [action, setAction] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const tenantsQuery = useQuery({ queryKey: ['tenants'], queryFn: tenantApi.list });
  const logsQuery = useQuery({
    queryKey: ['audit-logs', tenantId, username, action, success],
    queryFn: () =>
      auditApi.logs({
        tenantId,
        username,
        action,
        success: success === null ? null : success === 'true',
        limit: 100,
      }),
  });
  const tenants = (tenantsQuery.data ?? []) as TenantLite[];
  const logs = logsQuery.data ?? [];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{t('auditPage.title')}</Title>
          <Text c="dimmed" maw={760}>
            {t('auditPage.description')}
          </Text>
        </Stack>
        <ThemeIcon color="dark" variant="light" radius="sm" size={42}>
          <IconUserShield size={22} />
        </ThemeIcon>
      </Group>

      <Card className="surface-card" p="lg">
        <Group align="end">
          <Select
            label={t('auditPage.tenant')}
            clearable
            maw={300}
            value={tenantId}
            onChange={setTenantId}
            data={tenants.map((tenant) => ({
              value: tenant.id,
              label: `${tenant.tenantName} · ${tenant.tenantCode}`,
            }))}
          />
          <TextInput
            label={t('auditPage.user')}
            maw={220}
            leftSection={<IconSearch size={15} />}
            value={username}
            onChange={(event) => setUsername(event.currentTarget.value)}
            placeholder="admin"
          />
          <Select
            label={t('auditPage.action')}
            clearable
            maw={180}
            value={action}
            onChange={setAction}
            data={['READ', 'CREATE', 'UPDATE', 'DELETE'].map((item) => ({
              value: item,
              label: t(`auditPage.actionLabels.${item}`),
            }))}
          />
          <Select
            label={t('auditPage.result')}
            clearable
            maw={180}
            value={success}
            onChange={setSuccess}
            data={[
              { value: 'true', label: t('auditPage.success') },
              { value: 'false', label: t('auditPage.failed') },
            ]}
          />
        </Group>
      </Card>

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={650}>
            {t('auditPage.access')}
          </Text>
          <Badge color="gray" variant="light" radius="sm">
            {t('auditPage.rowCount', { count: logs.length })}
          </Badge>
        </Group>
        <Stack gap={0} className="subtle-list">
          {logs.map((log) => (
            <Group key={log.id} className="list-row" p="md" justify="space-between" wrap="nowrap">
              <Group wrap="nowrap" maw="62%">
                <ThemeIcon color={log.success ? 'teal' : 'red'} variant="light" radius="sm" size={38}>
                  {log.success ? <IconCircleCheck size={20} /> : <IconAlertTriangle size={20} />}
                </ThemeIcon>
                <Box>
                  <Group gap="xs">
                    <Text fw={650}>{log.path || t('auditPage.unknownPath')}</Text>
                    <Badge color={actionColor(log.action)} variant="light" radius="sm">
                      {log.action ? t(`auditPage.actionLabels.${log.action}`, { defaultValue: log.action }) : log.method || t('auditPage.unknownAction')}
                    </Badge>
                    <Badge color={log.success ? 'teal' : 'red'} variant="light" radius="sm">
                      {log.statusCode ?? 0}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {log.username || t('auditPage.anonymous')} · {log.requestId || t('auditPage.noRequestId')} · {log.createdAt}
                  </Text>
                  {log.queryString && (
                    <Text size="xs" c="dimmed" mt={4} lineClamp={1}>
                      ?{log.queryString}
                    </Text>
                  )}
                </Box>
              </Group>
              <Group gap="xl" wrap="nowrap" visibleFrom="sm">
                <AuditMetric label={t('auditPage.resource')} value={log.resourceType || '-'} />
                <AuditMetric label={t('auditPage.ip')} value={log.ip || '-'} />
                <AuditMetric label={t('auditPage.latency')} value={`${log.latencyMs ?? 0}ms`} />
              </Group>
            </Group>
          ))}
          {logs.length === 0 && (
            <Box p="xl" ta="center">
              <ThemeIcon color="gray" variant="light" radius="sm" size={40} mb="sm" mx="auto">
                <IconShieldCheck size={20} />
              </ThemeIcon>
              <Text c="dimmed">{t('auditPage.empty')}</Text>
            </Box>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

function AuditMetric({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={2} align="flex-end" miw={96}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={700} lineClamp={1}>
        {value}
      </Text>
    </Stack>
  );
}

function actionColor(action?: string) {
  if (action === 'CREATE') {
    return 'blue';
  }
  if (action === 'UPDATE') {
    return 'yellow';
  }
  if (action === 'DELETE') {
    return 'red';
  }
  return 'gray';
}
