import { Badge, Card, Group, SegmentedControl, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { analyticsApi } from '../api/analytics';

const formatNumber = (value: number) => new Intl.NumberFormat('zh-CN').format(value ?? 0);
const formatMoney = (value: number) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 4 }).format(value ?? 0);

export function ProviderCostDashboardPage() {
  const [days, setDays] = useState('7');
  const query = useQuery({
    queryKey: ['provider-costs', days],
    queryFn: () => analyticsApi.providerCosts(Number(days)),
  });
  const rows = query.data ?? [];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>Provider Cost Dashboard</Title>
          <Text c="dimmed">轻量查看各 Provider 的成本、收入、利润和 Token 消耗。</Text>
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

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Card p="lg">
          <Stack>
            <Text fw={700}>Credits by Provider</Text>
            <BarChart
              h={320}
              data={rows}
              dataKey="dimensionName"
              series={[{ name: 'credits', color: 'blue.6' }]}
            />
          </Stack>
        </Card>
        <Card p="lg">
          <Stack>
            <Text fw={700}>Profit by Provider</Text>
            <BarChart
              h={320}
              data={rows}
              dataKey="dimensionName"
              series={[{ name: 'profit', color: 'green.6' }]}
            />
          </Stack>
        </Card>
      </SimpleGrid>

      <Card p="lg">
        <Table.ScrollContainer minWidth={820}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Provider</Table.Th>
                <Table.Th>请求</Table.Th>
                <Table.Th>成功</Table.Th>
                <Table.Th>Input Tokens</Table.Th>
                <Table.Th>Output Tokens</Table.Th>
                <Table.Th>Credits</Table.Th>
                <Table.Th>成本</Table.Th>
                <Table.Th>利润</Table.Th>
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
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}

export default ProviderCostDashboardPage;
