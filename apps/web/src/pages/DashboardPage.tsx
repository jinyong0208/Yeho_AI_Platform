import { AreaChart } from '@mantine/charts';
import { Badge, Box, Card, Divider, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import {
  IconActivity,
  IconBrandOpenai,
  IconBuilding,
  IconChartBar,
  IconCoins,
  IconKey,
  IconServerCog,
  IconSparkles,
  IconUsers,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { billingApi } from '../api/billing';
import { gatewayApi } from '../api/gateway';
import { tenantApi } from '../api/tenants';
import { usageApi } from '../api/usage';
import { userApi } from '../api/users';

const formatNumber = (value?: number) => (value ?? 0).toLocaleString();
const formatCredits = (value?: number) => `${formatNumber(value)} Credits`;

export default function DashboardPage() {
  const tenantsQuery = useQuery({ queryKey: ['tenants'], queryFn: tenantApi.list });
  const providersQuery = useQuery({ queryKey: ['providers'], queryFn: gatewayApi.providers });
  const modelsQuery = useQuery({ queryKey: ['models'], queryFn: gatewayApi.models });
  const usageSummaryQuery = useQuery({ queryKey: ['usage-summary'], queryFn: () => usageApi.summary() });
  const logsQuery = useQuery({ queryKey: ['usage-logs', 'dashboard'], queryFn: () => usageApi.logs({ limit: 5 }) });
  const tenantId = tenantsQuery.data?.[0]?.id;
  const usersQuery = useQuery({
    queryKey: ['tenant-users', tenantId, 'dashboard'],
    queryFn: () => userApi.list(tenantId!),
    enabled: Boolean(tenantId),
  });
  const walletQuery = useQuery({
    queryKey: ['wallet', tenantId, 'dashboard'],
    queryFn: () => billingApi.wallet(tenantId!),
    enabled: Boolean(tenantId),
  });

  const summary = usageSummaryQuery.data;
  const tokenData = [
    { metric: 'Input', tokens: summary?.inputTokens ?? 0 },
    { metric: 'Output', tokens: summary?.outputTokens ?? 0 },
    { metric: 'Total', tokens: summary?.totalTokens ?? 0 },
  ];
  const logs = logsQuery.data ?? [];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Group gap="xs">
            <ThemeIcon size={28} radius="sm" color="dark">
              <IconSparkles size={16} />
            </ThemeIcon>
            <Badge color="gray" variant="light" radius="sm">
              Phase 4
            </Badge>
          </Group>
          <Title order={2}>AI Gateway Console</Title>
          <Text c="dimmed" maw={700}>
            统一查看租户、模型网关、Credits 钱包和调用观测数据，第一阶段闭环已经从骨架进入可操作状态。
          </Text>
        </Stack>
        <Badge variant="outline" color="teal" radius="sm">
          Gateway online
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <MetricCard
          icon={<IconBuilding size={20} />}
          label="租户"
          value={formatNumber(tenantsQuery.data?.length)}
          hint="Workspace boundary"
          color="teal"
        />
        <MetricCard
          icon={<IconUsers size={20} />}
          label="用户"
          value={formatNumber(usersQuery.data?.length)}
          hint="Default tenant members"
          color="blue"
        />
        <MetricCard
          icon={<IconServerCog size={20} />}
          label="供应商"
          value={formatNumber(providersQuery.data?.length)}
          hint="Provider registry"
          color="cyan"
        />
        <MetricCard
          icon={<IconBrandOpenai size={20} />}
          label="模型"
          value={formatNumber(modelsQuery.data?.length)}
          hint="Router model codes"
          color="indigo"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Card className="surface-card wide-panel" p="lg">
          <Group justify="space-between" mb="md">
            <Stack gap={2}>
              <Title order={3}>Token Mix</Title>
              <Text size="sm" c="dimmed">
                当前网关累计输入、输出和总 Token。
              </Text>
            </Stack>
            <Badge color="gray" variant="light" radius="sm">
              {formatNumber(summary?.requestCount)} requests
            </Badge>
          </Group>
          <AreaChart
            h={300}
            data={tokenData}
            dataKey="metric"
            series={[{ name: 'tokens', color: 'teal.6' }]}
            curveType="monotone"
            withGradient
            withDots
            gridAxis="xy"
          />
        </Card>

        <Card className="surface-card" p="lg">
          <Stack gap="md">
            <Group gap="xs">
              <ThemeIcon variant="light" color="yellow" radius="sm">
                <IconCoins size={18} />
              </ThemeIcon>
              <Title order={3}>Billing</Title>
            </Group>
            <Stack gap="sm">
              <CompactMetric label="可用余额" value={formatCredits(walletQuery.data?.balanceCredits)} />
              <CompactMetric label="累计消耗" value={formatCredits(walletQuery.data?.totalUsedCredits)} />
              <CompactMetric label="本期扣费" value={formatCredits(summary?.chargeCredits)} />
              <CompactMetric label="成功 / 失败" value={`${formatNumber(summary?.successCount)} / ${formatNumber(summary?.failureCount)}`} />
            </Stack>
            <Divider color="#eef1f4" />
            <Group gap="xs" c="dimmed">
              <IconKey size={16} />
              <Text size="sm">Demo Key 已接入网关调用链。</Text>
            </Group>
          </Stack>
        </Card>
      </SimpleGrid>

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <ThemeIcon variant="light" color="gray" radius="sm">
              <IconActivity size={18} />
            </ThemeIcon>
            <Title order={3}>Recent Gateway Calls</Title>
          </Group>
          <Badge color="gray" variant="light" radius="sm">
            live logs
          </Badge>
        </Group>
        <Stack gap={0} className="subtle-list">
          {logs.map((log) => (
            <Group key={log.id} className="list-row" p="md" justify="space-between" wrap="nowrap">
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
              </Box>
              <Group gap="lg" visibleFrom="sm">
                <CompactStat icon={<IconChartBar size={15} />} label="tokens" value={formatNumber(log.totalTokens)} />
                <CompactStat icon={<IconCoins size={15} />} label="credits" value={formatNumber(log.chargeCredits)} />
              </Group>
            </Group>
          ))}
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

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={700}>
        {value}
      </Text>
    </Group>
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
