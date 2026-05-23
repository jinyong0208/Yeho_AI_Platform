import { BarChart } from '@mantine/charts';
import { Badge, Card, Group, SegmentedControl, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analyticsApi } from '../api/analytics';

export function ProviderCostDashboardPage() {
  const { t, i18n } = useTranslation();
  const [days, setDays] = useState('7');
  const numberFormatter = new Intl.NumberFormat(i18n.language);
  const moneyFormatter = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 4 });
  const formatNumber = (value?: number) => numberFormatter.format(value ?? 0);
  const formatMoney = (value?: number) => moneyFormatter.format(value ?? 0);
  const query = useQuery({
    queryKey: ['provider-costs', days],
    queryFn: () => analyticsApi.providerCosts(Number(days)),
  });
  const rows = query.data ?? [];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{t('providerAnalyticsPage.title')}</Title>
          <Text c="dimmed" maw={720}>
            {t('providerAnalyticsPage.description')}
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

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Card className="surface-card" p="lg">
          <Stack>
            <Text fw={700}>{t('providerAnalyticsPage.creditsByProvider')}</Text>
            <BarChart
              h={320}
              data={rows}
              dataKey="dimensionName"
              series={[{ name: 'credits', color: 'blue.6' }]}
            />
          </Stack>
        </Card>
        <Card className="surface-card" p="lg">
          <Stack>
            <Text fw={700}>{t('providerAnalyticsPage.profitByProvider')}</Text>
            <BarChart
              h={320}
              data={rows}
              dataKey="dimensionName"
              series={[{ name: 'profit', color: 'green.6' }]}
            />
          </Stack>
        </Card>
      </SimpleGrid>

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={650}>
            {t('providerAnalyticsPage.providerBreakdown')}
          </Text>
          <Badge color="gray" variant="light" radius="sm">
            {t('analyticsPage.rowCount', { count: rows.length })}
          </Badge>
        </Group>
        <Table.ScrollContainer minWidth={820}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('providerAnalyticsPage.provider')}</Table.Th>
                <Table.Th>{t('analyticsPage.requests')}</Table.Th>
                <Table.Th>{t('analyticsPage.success')}</Table.Th>
                <Table.Th>{t('analyticsPage.inputTokens')}</Table.Th>
                <Table.Th>{t('analyticsPage.outputTokens')}</Table.Th>
                <Table.Th>{t('analyticsPage.credits')}</Table.Th>
                <Table.Th>{t('analyticsPage.cost')}</Table.Th>
                <Table.Th>{t('analyticsPage.profit')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => (
                <Table.Tr key={row.dimension}>
                  <Table.Td>
                    <Text fw={700}>{row.dimensionName}</Text>
                  </Table.Td>
                  <Table.Td>{formatNumber(row.requests)}</Table.Td>
                  <Table.Td>{formatNumber(row.successRequests)}</Table.Td>
                  <Table.Td>{formatNumber(row.inputTokens)}</Table.Td>
                  <Table.Td>{formatNumber(row.outputTokens)}</Table.Td>
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
                  <Table.Td colSpan={8}>
                    <Text c="dimmed" ta="center" py="xl">
                      {t('providerAnalyticsPage.empty')}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}

export default ProviderCostDashboardPage;
