import { AreaChart } from '@mantine/charts';
import { Badge, Card, Group, Select, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconChartBar, IconCoins, IconCpu, IconTrendingUp } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { gatewayApi } from '../api/gateway';
import { tenantApi } from '../api/tenants';
import { usageApi } from '../api/usage';

type TenantLite = {
  id: string;
  tenantCode: string;
  tenantName: string;
};

const formatNumber = (value?: number) => (value ?? 0).toLocaleString();

export default function TokenStatsPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [modelCode, setModelCode] = useState<string | null>(null);
  const tenantsQuery = useQuery({ queryKey: ['tenants'], queryFn: tenantApi.list });
  const modelsQuery = useQuery({ queryKey: ['models'], queryFn: gatewayApi.models });
  const summaryQuery = useQuery({
    queryKey: ['usage-summary', tenantId, modelCode],
    queryFn: () => usageApi.summary({ tenantId, modelCode }),
  });
  const tenants = (tenantsQuery.data ?? []) as TenantLite[];
  const models = modelsQuery.data ?? [];
  const summary = summaryQuery.data;
  const chartData = [
    { metric: 'Input', tokens: summary?.inputTokens ?? 0 },
    { metric: 'Output', tokens: summary?.outputTokens ?? 0 },
    { metric: 'Total', tokens: summary?.totalTokens ?? 0 },
  ];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>Token 统计</Title>
          <Text c="dimmed" maw={700}>
            聚合请求量、Token、Credits、成本与利润，为后续租户看板和模型成本分析打基础。
          </Text>
        </Stack>
        <Badge color="gray" variant="light" radius="sm">
          Summary
        </Badge>
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
            value={modelCode}
            onChange={setModelCode}
            data={models.map((model) => ({ value: model.modelCode, label: model.modelCode }))}
          />
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <MetricCard icon={<IconCpu size={20} />} label="请求数" value={formatNumber(summary?.requestCount)} color="blue" />
        <MetricCard icon={<IconChartBar size={20} />} label="Total Tokens" value={formatNumber(summary?.totalTokens)} color="teal" />
        <MetricCard icon={<IconCoins size={20} />} label="Charge Credits" value={formatNumber(summary?.chargeCredits)} color="yellow" />
        <MetricCard icon={<IconTrendingUp size={20} />} label="Profit" value={formatNumber(Number(summary?.profit ?? 0))} color="green" />
      </SimpleGrid>

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={650}>
            Token Mix
          </Text>
          <Badge color={summary?.failureCount ? 'red' : 'teal'} variant="light" radius="sm">
            {formatNumber(summary?.successCount)} success / {formatNumber(summary?.failureCount)} failed
          </Badge>
        </Group>
        <AreaChart
          h={280}
          data={chartData}
          dataKey="metric"
          series={[{ name: 'tokens', color: 'teal.6' }]}
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
