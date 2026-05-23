import { AreaChart, BarChart } from '@mantine/charts';
import { Badge, Card, Group, Grid, SegmentedControl, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analyticsApi, type CostMetric } from '../api/analytics';

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="surface-card" p="lg">
      <Stack gap={6}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={650}>
          {label}
        </Text>
        <Text fw={750} size="xl" c={tone}>
          {value}
        </Text>
      </Stack>
    </Card>
  );
}

function MetricTable({
  rows,
  formatNumber,
  formatMoney,
  empty,
  t,
}: {
  rows: CostMetric[];
  formatNumber: (value?: number) => string;
  formatMoney: (value?: number) => string;
  empty: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <Table.ScrollContainer minWidth={760}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('analyticsPage.dimension')}</Table.Th>
            <Table.Th>{t('analyticsPage.requests')}</Table.Th>
            <Table.Th>{t('analyticsPage.tokens')}</Table.Th>
            <Table.Th>{t('analyticsPage.credits')}</Table.Th>
            <Table.Th>{t('analyticsPage.cost')}</Table.Th>
            <Table.Th>{t('analyticsPage.profit')}</Table.Th>
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
          {rows.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text c="dimmed" ta="center" py="xl">
                  {empty}
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

export function ProfitDashboardPage() {
  const { t, i18n } = useTranslation();
  const [days, setDays] = useState('7');
  const numberFormatter = new Intl.NumberFormat(i18n.language);
  const moneyFormatter = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 4 });
  const formatNumber = (value?: number) => numberFormatter.format(value ?? 0);
  const formatMoney = (value?: number) => moneyFormatter.format(value ?? 0);
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
          <Title order={2}>{t('billingAnalyticsPage.title')}</Title>
          <Text c="dimmed" maw={720}>
            {t('billingAnalyticsPage.description')}
          </Text>
        </Stack>
        <SegmentedControl
          value={days}
          onChange={setDays}
          data={[
            { value: '7', label: t('analyticsPage.days7') },
            { value: '30', label: t('analyticsPage.days30') },
            { value: '90', label: t('analyticsPage.days90') },
          ]}
        />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
        <MetricCard label={t('analyticsPage.requests')} value={formatNumber(summary?.requests)} />
        <MetricCard label={t('analyticsPage.tokens')} value={formatNumber(summary?.totalTokens)} />
        <MetricCard label={t('analyticsPage.credits')} value={formatNumber(summary?.credits)} />
        <MetricCard label={t('analyticsPage.cost')} value={formatMoney(summary?.cost)} />
        <MetricCard label={t('analyticsPage.profit')} value={formatMoney(summary?.profit)} tone={(summary?.profit ?? 0) >= 0 ? 'green' : 'red'} />
      </SimpleGrid>

      <Grid>
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Card className="surface-card" p="lg">
            <Stack>
              <Text fw={700}>{t('billingAnalyticsPage.dailyProfit')}</Text>
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
          <Card className="surface-card" p="lg">
            <Stack>
              <Text fw={700}>{t('billingAnalyticsPage.providerCredits')}</Text>
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

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Text fw={700}>{t('billingAnalyticsPage.topModels')}</Text>
          <Badge color="gray" variant="light" radius="sm">
            {t('analyticsPage.rowCount', { count: summary?.models.length ?? 0 })}
          </Badge>
        </Group>
        <MetricTable
          rows={summary?.models ?? []}
          formatNumber={formatNumber}
          formatMoney={formatMoney}
          empty={t('billingAnalyticsPage.emptyModels')}
          t={t}
        />
      </Card>
    </Stack>
  );
}

export default ProfitDashboardPage;
