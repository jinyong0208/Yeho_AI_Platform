import { AreaChart } from '@mantine/charts';
import { Badge, Box, Card, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import {
  IconActivity,
  IconAlertTriangle,
  IconChartBar,
  IconCoins,
  IconGauge,
  IconHeartbeat,
  IconPlayerPlay,
  IconServerCog,
  IconSparkles,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { analyticsApi, type CostMetric } from '../api/analytics';
import { gatewayApi } from '../api/gateway';
import { usageApi, type UsageLog } from '../api/usage';
import { useAuthStore } from '../store/useAuthStore';
import { resolvePrimaryRole, USER_ROLES } from '../utils/roles';

type CompactRow = {
  label: string;
  metric: string;
  sub?: string;
};

const averageLatency = (logs: UsageLog[]) => {
  if (logs.length === 0) {
    return 0;
  }
  return logs.reduce((sum, log) => sum + (log.latencyMs ?? 0), 0) / logs.length;
};

const toCompactRows = (metrics: CostMetric[] | undefined, requestLabel: string, tokenLabel: string): CompactRow[] =>
  (metrics ?? []).slice(0, 5).map((metric) => ({
    label: metric.dimensionName || metric.dimension,
    metric: metric.credits.toLocaleString(),
    sub: `${metric.requests.toLocaleString()} ${requestLabel} / ${metric.totalTokens.toLocaleString()} ${tokenLabel}`,
  }));

const groupLogsByModel = (logs: UsageLog[], requestLabel: string, tokenLabel: string, unknownLabel: string): CompactRow[] => {
  const grouped = logs.reduce<Record<string, { requests: number; tokens: number; credits: number }>>((acc, log) => {
    const key = log.modelCode || unknownLabel;
    acc[key] ??= { requests: 0, tokens: 0, credits: 0 };
    acc[key].requests += 1;
    acc[key].tokens += log.totalTokens ?? 0;
    acc[key].credits += log.chargeCredits ?? 0;
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([, left], [, right]) => right.credits - left.credits)
    .slice(0, 5)
    .map(([label, value]) => ({
      label,
      metric: value.credits.toLocaleString(),
      sub: `${value.requests.toLocaleString()} ${requestLabel} / ${value.tokens.toLocaleString()} ${tokenLabel}`,
    }));
};

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const scopedTenantId = primaryRole === USER_ROLES.SUPER_ADMIN ? undefined : user?.tenantId;
  const canReadPlatformAnalytics = primaryRole === USER_ROLES.SUPER_ADMIN;
  const numberFormatter = new Intl.NumberFormat(i18n.language);
  const decimalFormatter = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const usageSummaryQuery = useQuery({
    queryKey: ['usage-summary', scopedTenantId ?? 'platform'],
    queryFn: () => usageApi.summary(scopedTenantId ? { tenantId: scopedTenantId } : {}),
    enabled: canReadPlatformAnalytics || Boolean(scopedTenantId),
  });
  const logsQuery = useQuery({
    queryKey: ['usage-logs', 'dashboard', scopedTenantId ?? 'platform'],
    queryFn: () => usageApi.logs({ tenantId: scopedTenantId, limit: 8 }),
    enabled: canReadPlatformAnalytics || Boolean(scopedTenantId),
  });
  const providersQuery = useQuery({
    queryKey: ['providers', 'dashboard-health'],
    queryFn: gatewayApi.providers,
    enabled: canReadPlatformAnalytics,
  });
  const analyticsQuery = useQuery({
    queryKey: ['cost-summary', 'dashboard', 7],
    queryFn: () => analyticsApi.costSummary(7),
    enabled: canReadPlatformAnalytics,
  });

  const summary = usageSummaryQuery.data;
  const logs = logsQuery.data ?? [];
  const totalRequests = summary?.requestCount ?? 0;
  const failureCount = summary?.failureCount ?? 0;
  const successCount = summary?.successCount ?? 0;
  const errorRate = totalRequests > 0 ? failureCount / totalRequests : 0;
  const gatewayHealthy = errorRate < 0.05;
  const avgLatency = averageLatency(logs);
  const qps = totalRequests / 60;
  const providers = providersQuery.data ?? [];
  const healthyProviders = providers.filter((provider) => provider.healthStatus === 'HEALTHY').length;
  const providerHealthText = canReadPlatformAnalytics
    ? `${numberFormatter.format(healthyProviders)} / ${numberFormatter.format(providers.length)}`
    : t('dashboardPage.managedProviderHealth');
  const burnTrend =
    analyticsQuery.data?.daily?.slice(-7).map((row) => ({
      day: row.dimensionName || row.dimension,
      credits: row.credits,
    })) ?? [{ day: t('dashboardPage.chart.total'), credits: summary?.chargeCredits ?? 0 }];
  const requestAbbr = t('common.requestAbbr');
  const tokenAbbr = t('common.tokenAbbr');
  const topModels = canReadPlatformAnalytics
    ? toCompactRows(analyticsQuery.data?.models, requestAbbr, tokenAbbr)
    : groupLogsByModel(logs, requestAbbr, tokenAbbr, t('common.unknownModel'));
  const topTenants = toCompactRows(analyticsQuery.data?.tenants, requestAbbr, tokenAbbr);

  const formatNumber = (value?: number) => numberFormatter.format(value ?? 0);
  const formatCredits = (value?: number) => `${formatNumber(value)} ${t('common.credits')}`;
  const formatPercent = (value: number) => `${decimalFormatter.format(value * 100)}%`;
  const formatLatency = (value: number) => `${numberFormatter.format(Math.round(value))} ms`;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Group gap="xs">
            <ThemeIcon size={28} radius="sm" color="dark">
              <IconSparkles size={16} />
            </ThemeIcon>
            <Badge color="gray" variant="light" radius="sm">
              {t('dashboardPage.badge')}
            </Badge>
          </Group>
          <Title order={2}>{t('dashboardPage.title')}</Title>
          <Text c="dimmed" maw={760}>
            {t('dashboardPage.description')}
          </Text>
        </Stack>
        <Badge variant="outline" color={gatewayHealthy ? 'teal' : 'red'} radius="sm">
          {gatewayHealthy ? t('dashboardPage.gatewayOnline') : t('dashboardPage.gatewayAttention')}
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <MetricCard
          icon={gatewayHealthy ? <IconHeartbeat size={20} /> : <IconAlertTriangle size={20} />}
          label={t('dashboardPage.metrics.gatewayHealth')}
          value={gatewayHealthy ? t('dashboardPage.gatewayOnline') : t('dashboardPage.gatewayAttention')}
          hint={t('dashboardPage.hints.health')}
          color={gatewayHealthy ? 'teal' : 'red'}
        />
        <MetricCard
          icon={<IconServerCog size={20} />}
          label={t('dashboardPage.metrics.providerHealth')}
          value={providerHealthText}
          hint={t('dashboardPage.hints.providerHealth')}
          color="cyan"
        />
        <MetricCard
          icon={<IconGauge size={20} />}
          label={t('dashboardPage.metrics.qps')}
          value={decimalFormatter.format(qps)}
          hint={t('dashboardPage.hints.qps')}
          color="blue"
        />
        <MetricCard
          icon={<IconActivity size={20} />}
          label={t('dashboardPage.metrics.errorRate')}
          value={formatPercent(errorRate)}
          hint={t('dashboardPage.hints.errorRate')}
          color={errorRate > 0.05 ? 'red' : 'teal'}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <MetricCard
          icon={<IconPlayerPlay size={20} />}
          label={t('dashboardPage.metrics.successFailure')}
          value={`${formatNumber(successCount)} / ${formatNumber(failureCount)}`}
          hint={t('dashboardPage.hints.successFailure')}
          color="indigo"
        />
        <MetricCard
          icon={<IconChartBar size={20} />}
          label={t('dashboardPage.metrics.avgLatency')}
          value={formatLatency(avgLatency)}
          hint={t('dashboardPage.hints.latency')}
          color="violet"
        />
        <MetricCard
          icon={<IconCoins size={20} />}
          label={t('dashboardPage.metrics.creditsBurn')}
          value={formatCredits(summary?.chargeCredits)}
          hint={t('dashboardPage.hints.credits')}
          color="yellow"
        />
        <MetricCard
          icon={<IconActivity size={20} />}
          label={t('common.requests')}
          value={formatNumber(totalRequests)}
          hint={t('common.tokens')}
          color="gray"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Card className="surface-card wide-panel" p="lg">
          <Group justify="space-between" mb="md">
            <Stack gap={2}>
              <Title order={3}>{t('dashboardPage.hints.burnTrend')}</Title>
              <Text size="sm" c="dimmed">
                {t('dashboardPage.metrics.creditsBurn')}
              </Text>
            </Stack>
            <Badge color="gray" variant="light" radius="sm">
              {t('dashboardPage.last7Days')}
            </Badge>
          </Group>
          <AreaChart
            h={300}
            data={burnTrend}
            dataKey="day"
            series={[{ name: t('common.credits'), color: 'teal.6' }]}
            curveType="monotone"
            withGradient
            withDots
            gridAxis="xy"
          />
        </Card>

        <Card className="surface-card" p="lg">
          <CompactList
            title={t('dashboardPage.metrics.topModels')}
            emptyText={t('dashboardPage.empty.models')}
            rows={topModels}
          />
        </Card>
      </SimpleGrid>

      {canReadPlatformAnalytics && (
        <Card className="surface-card" p="lg">
          <CompactList
            title={t('dashboardPage.metrics.topTenants')}
            emptyText={t('dashboardPage.empty.tenants')}
            rows={topTenants}
          />
        </Card>
      )}

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <ThemeIcon variant="light" color="gray" radius="sm">
              <IconActivity size={18} />
            </ThemeIcon>
            <Title order={3}>{t('dashboardPage.metrics.recentCalls')}</Title>
          </Group>
          <Badge color="gray" variant="light" radius="sm">
            {t('common.liveLogs')}
          </Badge>
        </Group>
        <Stack gap={0} className="subtle-list">
          {logs.map((log) => (
            <Group key={log.id} className="list-row" p="md" justify="space-between" wrap="nowrap">
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
                </Group>
                <Text size="xs" c="dimmed">
                  {log.requestId} · {log.createdAt}
                </Text>
              </Box>
              <Group gap="lg" visibleFrom="sm">
                <CompactStat icon={<IconChartBar size={15} />} label={t('common.tokens')} value={formatNumber(log.totalTokens)} />
                <CompactStat icon={<IconCoins size={15} />} label={t('common.credits')} value={formatNumber(log.chargeCredits)} />
              </Group>
            </Group>
          ))}
          {logs.length === 0 && (
            <Box p="lg" ta="center">
              <Text c="dimmed">{t('dashboardPage.empty.calls')}</Text>
            </Box>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  color: string;
}) {
  return (
    <Card className="soft-card" p="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text size="sm" c="dimmed">
            {label}
          </Text>
          <Text fw={750} size="xl">
            {value}
          </Text>
          <Text size="xs" c="dimmed">
            {hint}
          </Text>
        </Stack>
        <ThemeIcon color={color} variant="light" radius="sm">
          {icon}
        </ThemeIcon>
      </Group>
    </Card>
  );
}

function CompactList({ title, rows, emptyText }: { title: string; rows: CompactRow[]; emptyText: string }) {
  return (
    <Stack gap="sm">
      <Title order={3}>{title}</Title>
      <Stack gap={0} className="subtle-list">
        {rows.map((row) => (
          <Group key={row.label} className="list-row" p="sm" justify="space-between" wrap="nowrap">
            <Box>
              <Text fw={650} size="sm">
                {row.label}
              </Text>
              {row.sub && (
                <Text size="xs" c="dimmed">
                  {row.sub}
                </Text>
              )}
            </Box>
            <Badge color="teal" variant="light" radius="sm">
              {row.metric}
            </Badge>
          </Group>
        ))}
        {rows.length === 0 && (
          <Box p="lg" ta="center">
            <Text c="dimmed">{emptyText}</Text>
          </Box>
        )}
      </Stack>
    </Stack>
  );
}

function CompactStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Group gap={6} wrap="nowrap">
      <ThemeIcon color="gray" variant="light" radius="sm" size={24}>
        {icon}
      </ThemeIcon>
      <Stack gap={0}>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text size="sm" fw={700}>
          {value}
        </Text>
      </Stack>
    </Group>
  );
}
