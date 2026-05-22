import {
  Badge,
  Box,
  Button,
  Card,
  Code,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import {
  IconBolt,
  IconBrain,
  IconCircleCheck,
  IconPlayerPlay,
  IconRouteAltLeft,
  IconSparkles,
} from '@tabler/icons-react';
import { useState } from 'react';
import { agentApi, type AgentRunResponse, type AgentStepResponse } from '../api/agent';

const DEFAULT_CONTEXT = JSON.stringify(
  {
    source: 'console',
    scenario: 'agent-debug',
  },
  null,
  2,
);

export default function AgentDebugPage() {
  const [input, setInput] = useState('帮我检查一下 deepseek-chat 模型路由和钱包扣费状态');
  const [contextText, setContextText] = useState(DEFAULT_CONTEXT);
  const [contextError, setContextError] = useState('');
  const [result, setResult] = useState<AgentRunResponse | null>(null);

  const mutation = useMutation({
    mutationFn: agentApi.runDemo,
    onSuccess: (response) => {
      setResult(response);
    },
  });

  const runAgent = () => {
    setContextError('');
    let context: Record<string, unknown> | undefined;
    if (contextText.trim()) {
      try {
        const parsed = JSON.parse(contextText) as unknown;
        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
          setContextError('Context must be a JSON object.');
          return;
        }
        context = parsed as Record<string, unknown>;
      } catch {
        setContextError('Context JSON is invalid.');
        return;
      }
    }
    mutation.mutate({ input, context });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Group gap="xs">
            <ThemeIcon color="dark" variant="light" radius="sm" size={34}>
              <IconBrain size={19} />
            </ThemeIcon>
            <Title order={2}>Agent 调试</Title>
          </Group>
          <Text c="dimmed" maw={760}>
            通过 Java 主平台调用 Python LangGraph Demo Agent，查看意图识别、执行步骤和返回内容。
          </Text>
        </Stack>
        <Badge color="gray" variant="light" radius="sm">
          demo-agent
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Card className="surface-card" p="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={650}>Run Input</Text>
              <ThemeIcon color="blue" variant="light" radius="sm">
                <IconRouteAltLeft size={18} />
              </ThemeIcon>
            </Group>
            <Textarea
              label="输入"
              minRows={7}
              autosize
              maxRows={12}
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
            />
            <Textarea
              label="Context JSON"
              minRows={7}
              autosize
              maxRows={12}
              value={contextText}
              error={contextError}
              onChange={(event) => setContextText(event.currentTarget.value)}
            />
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                {input.length}/4000
              </Text>
              <Button
                leftSection={<IconPlayerPlay size={17} />}
                loading={mutation.isPending}
                disabled={!input.trim()}
                onClick={runAgent}
              >
                Run
              </Button>
            </Group>
          </Stack>
        </Card>

        <Card className="surface-card" p="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={650}>Result</Text>
              {result && (
                <Badge color="teal" variant="light" radius="sm">
                  {result.latencyMs}ms
                </Badge>
              )}
            </Group>

            {result ? (
              <Stack gap="md">
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                  <ResultMetric label="Intent" value={result.intent || '-'} />
                  <ResultMetric label="Agent" value={result.agentCode || '-'} />
                  <ResultMetric label="Request ID" value={result.requestId || '-'} />
                </SimpleGrid>
                <Box className="soft-panel" p="md">
                  <Group gap="xs" mb="xs">
                    <IconSparkles size={17} />
                    <Text size="sm" fw={650}>
                      Answer
                    </Text>
                  </Group>
                  <Text size="sm" lh={1.65}>
                    {result.answer}
                  </Text>
                </Box>
                <Stack gap="xs">
                  <Text size="sm" fw={650}>
                    Steps
                  </Text>
                  {(result.steps ?? []).map((step, index) => (
                    <AgentStep key={`${step.name}-${index}`} step={step} index={index} />
                  ))}
                </Stack>
                {result.metadata && (
                  <Stack gap="xs">
                    <Text size="sm" fw={650}>
                      Metadata
                    </Text>
                    <Code block>{JSON.stringify(result.metadata, null, 2)}</Code>
                  </Stack>
                )}
              </Stack>
            ) : (
              <Box className="soft-panel" p="xl" ta="center">
                <ThemeIcon color="gray" variant="light" radius="sm" size={42} mx="auto" mb="sm">
                  <IconBolt size={21} />
                </ThemeIcon>
                <Text c="dimmed">等待执行结果。</Text>
              </Box>
            )}

            {mutation.isError && (
              <Text size="sm" c="red">
                Agent run failed.
              </Text>
            )}
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <Box className="metric-card" p="md">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={700} lineClamp={1}>
        {value}
      </Text>
    </Box>
  );
}

function AgentStep({ step, index }: { step: AgentStepResponse; index: number }) {
  return (
    <Group className="list-row" p="md" justify="space-between" wrap="nowrap">
      <Group wrap="nowrap">
        <ThemeIcon color="teal" variant="light" radius="sm" size={34}>
          <IconCircleCheck size={18} />
        </ThemeIcon>
        <Box>
          <Group gap="xs">
            <Text fw={650}>{step.name}</Text>
            <Badge color="gray" variant="light" radius="sm">
              #{index + 1}
            </Badge>
            <Badge color="teal" variant="light" radius="sm">
              {step.status}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed" mt={3}>
            {step.detail}
          </Text>
        </Box>
      </Group>
    </Group>
  );
}
