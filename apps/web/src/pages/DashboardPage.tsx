import { Badge, Card, Grid, Group, Stack, Text, Title } from '@mantine/core';
import { LineChart } from '@mantine/charts';

const usageData = [
  { date: '05-15', tokens: 1200, credits: 90 },
  { date: '05-16', tokens: 1800, credits: 136 },
  { date: '05-17', tokens: 1400, credits: 112 },
  { date: '05-18', tokens: 2300, credits: 180 },
  { date: '05-19', tokens: 2600, credits: 214 },
  { date: '05-20', tokens: 3100, credits: 246 },
  { date: '05-21', tokens: 3400, credits: 268 },
];

const summaryCards = [
  { label: '租户数', value: '1', tone: 'teal' },
  { label: '活跃用户', value: '1', tone: 'blue' },
  { label: '可用模型', value: 'Phase 2', tone: 'gray' },
  { label: '钱包计费', value: 'Phase 3', tone: 'gray' },
];

export default function DashboardPage() {
  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap={2}>
          <Title order={2}>Dashboard</Title>
          <Text c="dimmed">Phase 1 控制台骨架与平台基础状态。</Text>
        </Stack>
        <Badge color="teal" variant="light">
          Phase 1
        </Badge>
      </Group>

      <Grid>
        {summaryCards.map((item) => (
          <Grid.Col key={item.label} span={{ base: 12, sm: 6, lg: 3 }}>
            <Card p="md">
              <Text size="sm" c="dimmed">
                {item.label}
              </Text>
              <Text fw={700} size="xl" c={item.tone}>
                {item.value}
              </Text>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      <Card p="md">
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={3}>Token 统计预览</Title>
            <Badge variant="outline">Mock</Badge>
          </Group>
          <LineChart
            h={280}
            data={usageData}
            dataKey="date"
            series={[
              { name: 'tokens', color: 'teal.6' },
              { name: 'credits', color: 'indigo.6' },
            ]}
            curveType="linear"
          />
        </Stack>
      </Card>
    </Stack>
  );
}
