import {
  Badge,
  Box,
  Card,
  Divider,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { LineChart } from '@mantine/charts';
import {
  IconActivity,
  IconArrowUpRight,
  IconBuilding,
  IconKey,
  IconRoute,
  IconSparkles,
  IconUsers,
  IconWallet,
} from '@tabler/icons-react';

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
  { label: '租户', value: '1', hint: '默认工作区已初始化', icon: IconBuilding, color: 'teal' },
  { label: '用户', value: '1', hint: 'SUPER_ADMIN 可登录', icon: IconUsers, color: 'blue' },
  { label: 'API Key', value: 'Phase 2', hint: '网关接入预留', icon: IconKey, color: 'violet' },
  { label: 'Credits', value: 'Phase 3', hint: '钱包计费预留', icon: IconWallet, color: 'yellow' },
];

const routeCards = [
  { name: 'Model Router', status: 'Reserved', progress: 24 },
  { name: 'OpenAI-compatible API', status: 'Next', progress: 18 },
  { name: 'Usage Metering', status: 'Planned', progress: 10 },
];

export default function DashboardPage() {
  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Group gap="xs">
            <ThemeIcon size={28} radius="sm" color="dark">
              <IconSparkles size={16} />
            </ThemeIcon>
            <Badge color="gray" variant="light" radius="sm">
              Phase 1
            </Badge>
          </Group>
          <Title order={2}>AI Platform Console</Title>
          <Text c="dimmed" maw={680}>
            面向 AI Gateway、模型路由和企业工作区的轻量控制台骨架。
          </Text>
        </Stack>
        <Badge variant="outline" color="teal" radius="sm">
          Core services ready
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {summaryCards.map((item) => (
          <Card key={item.label} className="soft-card" p="md">
            <Group justify="space-between" align="flex-start">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  {item.label}
                </Text>
                <Text fw={750} size="xl">
                  {item.value}
                </Text>
                <Text size="xs" c="dimmed">
                  {item.hint}
                </Text>
              </Stack>
              <ThemeIcon color={item.color} variant="light" radius="sm">
                <item.icon size={18} />
              </ThemeIcon>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Card className="surface-card wide-panel" p="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Stack gap={2}>
                <Title order={3}>Token 趋势预览</Title>
                <Text size="sm" c="dimmed">
                  先展示控制台形态，真实统计将在网关与计费阶段接入。
                </Text>
              </Stack>
              <Badge variant="light" color="gray" radius="sm">
                Mock
              </Badge>
            </Group>
            <LineChart
              h={300}
              data={usageData}
              dataKey="date"
              series={[
                { name: 'tokens', color: 'dark.6' },
                { name: 'credits', color: 'teal.6' },
              ]}
              curveType="linear"
              gridAxis="y"
            />
          </Stack>
        </Card>

        <Card className="surface-card" p="lg">
          <Stack gap="md">
            <Group gap="xs">
              <ThemeIcon variant="light" color="indigo" radius="sm">
                <IconRoute size={18} />
              </ThemeIcon>
              <Title order={3}>Gateway Roadmap</Title>
            </Group>
            <Stack gap="sm">
              {routeCards.map((item) => (
                <Box key={item.name}>
                  <Group justify="space-between" mb={6}>
                    <Text size="sm" fw={600}>
                      {item.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {item.status}
                    </Text>
                  </Group>
                  <Progress value={item.progress} color="dark" size="xs" radius="xl" />
                </Box>
              ))}
            </Stack>
            <Divider color="#eef1f4" />
            <Group gap="xs" c="dimmed">
              <IconActivity size={16} />
              <Text size="sm">Phase 2 后接入供应商、模型和调用日志。</Text>
              <IconArrowUpRight size={14} />
            </Group>
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
