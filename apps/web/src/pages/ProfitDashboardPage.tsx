import { Badge, Card, Group, Grid, SegmentedControl, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { AreaChart, BarChart } from '@mantine/charts';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { analyticsApi, type CostMetric } from '../api/analytics';

const formatNumber = (value: number) => new Intl.NumberFormat('zh-CN').format(value ?? 0);
const formatMoney = (value: number) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 4 }).format(value ?? 0);

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card p="lg">
      <Stack gap={6}>
        <Text size="xs" c="dimmed" tt="uppercase">
          {label}
        </Text>
        <Text fw={700} size="xl" c={tone}>
          {value}
        </Text>
      </Stack>
    </Card>
  );
}

function MetricTable({ rows }: { rows: CostMetric[] }) {
  return (
    <Table.ScrollContainer minWidth={760}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>维度</Table.Th>
            <Table.Th>请求</Table.Th>
            <Table.Th>Tokens</Table.Th>
            <Table.Th>Credits</Table.Th>
            <Table.Th>成本</Table.Th>
            <Table.Th>利润</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => (
            <Table.Tr key={row.dimension}>
              <Table.Td>
                <Text fw={600}>{row.dimensionName}</Text>
              </Table.Td>
              <Table.Td>{formatNumber(row.requests)}</Table.Td>
              <Table.Td>{formatNumber(row.totalTokens)}</Table.Td>
              <Table.Td>{formatNumber(row.credits)}</Table.Td>
              <Table.Td>{formatMoney(row.cost)}</Table.Td>
              <Table.Td>
                <Badge color={row.profit >= 0 ? 'green' : 'red'} variant="light">
                  {formatMoney(row.profit)}
                </Badge>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

export function ProfitDashboardPage() {
  const [days, setDays] = useState('7');
  const query = useQuery({
    queryKey: ['cost-summary', days],
    queryFn: () => analyticsApi.costSummary(Number(days)),
  });

  const summary = query.data;
  const daily = summary?.daily.map((item) => ({
    date: item.dimensionName,
    credits: item.credits,
    cost: Number(item.cost),
    profit: Number(item.profit),
  })) ?? [];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>Profit Dashboard</Title>
          <Text c="dimmed">按 Usage Log 汇总收入、成本、利润、Token 与 Credits。</Text>
        </Stack>
        <SegmentedControl
          value={days}
          onChange={setDays}
          data={[
            { value: '7', label: '7D' },
            { value: '30', label: '30D' },
            { value: '90', label: '90D' },
          ]}
        />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
        <MetricCard label="Requests" value={formatNumber(summary?.requests ?? 0)} />
        <MetricCard label="Tokens" value={formatNumber(summary?.totalTokens ?? 0)} />
        <MetricCard label="Credits" value={formatNumber(summary?.credits ?? 0)} />
        <MetricCard label="Cost" value={formatMoney(summary?.cost ?? 0)} />
        <MetricCard label="Profit" value={formatMoney(summary?.profit ?? 0)} tone={(summary?.profit ?? 0) >= 0 ? 'green' : 'red'} />
      </SimpleGrid>

      <Grid>
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Card p="lg">
            <Stack>
              <Text fw={700}>Daily Profit</Text>
              <AreaChart
                h={300}
                data={daily}
                dataKey="date"
                series={[
                  { name: 'credits', color: 'blue.6' },
                  { name: 'cost', color: 'orange.6' },
                  { name: 'profit', color: 'green.6' },
                ]}
                curveType="linear"
              />
            </Stack>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Card p="lg">
            <Stack>
              <Text fw={700}>Provider Credits</Text>
              <BarChart
                h={300}
                data={summary?.providers ?? []}
                dataKey="dimensionName"
                series={[{ name: 'credits', color: 'blue.6' }]}
              />
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      <Card p="lg">
        <Stack>
          <Text fw={700}>Top Models</Text>
          <MetricTable rows={summary?.models ?? []} />
        </Stack>
      </Card>
    </Stack>
  );
}

export default ProfitDashboardPage;
