import { AreaChart } from '@mantine/charts';
import { Badge, Card, Group, Select, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconChartBar, IconCoins, IconCpu, IconTrendingUp } from '@tabler/icons-react';
import type { ReactNode } from 'react';
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

export default function TokenStatsPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const canSelectTenant = primaryRole === USER_ROLES.SUPER_ADMIN;
  const numberFormatter = new Intl.NumberFormat(i18n.language);
  const formatNumber = (value?: number) => numberFormatter.format(value ?? 0);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [modelCode, setModelCode] = useState<string | null>(null);
  const tenantsQuery = useQuery({ queryKey: ['tenants', 'token-stats'], queryFn: tenantApi.list, enabled: canSelectTenant });
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

  const summaryQuery = useQuery({
    queryKey: ['usage-summary', tenantId, modelCode],
    queryFn: () => usageApi.summary({ tenantId, modelCode }),
    enabled: canSelectTenant || Boolean(tenantId),
  });
  const logsQuery = useQuery({
    queryKey: ['usage-logs', 'token-stats-models', tenantId],
    queryFn: () => usageApi.logs({ tenantId, limit: 120 }),
    enabled: canSelectTenant || Boolean(tenantId),
  });
  const summary = summaryQuery.data;
  const modelOptions = useMemo(() => {
    const models = new Set((logsQuery.data ?? []).map((log) => log.modelCode).filter(Boolean) as string[]);
    if (modelCode) {
      models.add(modelCode);
    }
    return Array.from(models).sort().map((model) => ({ value: model, label: model }));
  }, [logsQuery.data, modelCode]);
  const chartData = [
    { metric: t('dashboardPage.chart.input'), tokens: summary?.inputTokens ?? 0 },
    { metric: t('dashboardPage.chart.output'), tokens: summary?.outputTokens ?? 0 },
    { metric: t('dashboardPage.chart.total'), tokens: summary?.totalTokens ?? 0 },
  ];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{t('tokenStatsPage.title')}</Title>
          <Text c="dimmed" maw={700}>
            {t('tokenStatsPage.description')}
          </Text>
        </Stack>
        <Badge color="gray" variant="light" radius="sm">
          {t('tokenStatsPage.summary')}
        </Badge>
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
            value={modelCode}
            onChange={setModelCode}
            data={modelOptions}
          />
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <MetricCard icon={<IconCpu size={20} />} label={t('common.requests')} value={formatNumber(summary?.requestCount)} color="blue" />
        <MetricCard icon={<IconChartBar size={20} />} label={t('usageLogPage.totalTokens')} value={formatNumber(summary?.totalTokens)} color="teal" />
        <MetricCard icon={<IconCoins size={20} />} label={t('tokenStatsPage.chargeCredits')} value={formatNumber(summary?.chargeCredits)} color="yellow" />
        <MetricCard icon={<IconTrendingUp size={20} />} label={t('tokenStatsPage.profit')} value={formatNumber(Number(summary?.profit ?? 0))} color="green" />
      </SimpleGrid>

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={650}>
            {t('tokenStatsPage.tokenMix')}
          </Text>
          <Badge color={summary?.failureCount ? 'red' : 'teal'} variant="light" radius="sm">
            {t('tokenStatsPage.successFailed', {
              success: formatNumber(summary?.successCount),
              failed: formatNumber(summary?.failureCount),
            })}
          </Badge>
        </Group>
        <AreaChart
          h={280}
          data={chartData}
          dataKey="metric"
          series={[{ name: t('common.tokens'), color: 'teal.6' }]}
          curveType="monotone"
          withGradient
          withDots
          gridAxis="xy"
        />
      </Card>
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
