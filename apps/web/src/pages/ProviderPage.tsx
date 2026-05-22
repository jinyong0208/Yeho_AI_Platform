import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconPlus, IconServerCog, IconTrash } from '@tabler/icons-react';
import { gatewayApi } from '../api/gateway';

export default function ProviderPage() {
  const [opened, { open, close }] = useDisclosure(false);
  const queryClient = useQueryClient();
  const form = useForm({
    initialValues: {
      providerCode: '',
      providerName: '',
      baseUrl: '',
      apiKey: '',
    },
  });
  const providersQuery = useQuery({ queryKey: ['providers'], queryFn: gatewayApi.providers });
  const createMutation = useMutation({
    mutationFn: gatewayApi.createProvider,
    onSuccess: () => {
      notifications.show({ color: 'teal', title: '已保存', message: '供应商配置已创建。' });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      form.reset();
      close();
    },
  });
  const disableMutation = useMutation({
    mutationFn: gatewayApi.disableProvider,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });
  const providers = providersQuery.data ?? [];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>模型供应商</Title>
          <Text c="dimmed" maw={680}>
            统一维护 DeepSeek、Qwen、OpenAI、Claude、本地模型等供应商接入信息。
          </Text>
        </Stack>
        <Button color="dark" leftSection={<IconPlus size={16} />} onClick={open}>
          新建供应商
        </Button>
      </Group>

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={650}>
            Provider Registry
          </Text>
          <Badge color="gray" variant="light" radius="sm">
            {providers.length} total
          </Badge>
        </Group>

        <Stack gap={0} className="subtle-list">
          {providers.map((provider) => (
            <Group key={provider.id} className="list-row" p="md" justify="space-between" wrap="nowrap">
              <Group wrap="nowrap" maw="64%">
                <ThemeIcon color="cyan" variant="light" radius="sm" size={38}>
                  <IconServerCog size={20} />
                </ThemeIcon>
                <Box>
                  <Group gap="xs">
                    <Text fw={650}>{provider.providerName}</Text>
                    <Badge color={provider.status === 'ACTIVE' ? 'teal' : 'gray'} variant="light" radius="sm">
                      {provider.status}
                    </Badge>
                    {provider.hasApiKey && (
                      <Badge color="blue" variant="light" radius="sm">
                        Key stored
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    {provider.providerCode} · {provider.baseUrl}
                  </Text>
                </Box>
              </Group>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label="Disable provider"
                loading={disableMutation.isPending}
                onClick={() => disableMutation.mutate(provider.id)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}
          {providers.length === 0 && (
            <Box p="xl" ta="center">
              <Text c="dimmed">暂无供应商。</Text>
            </Box>
          )}
        </Stack>
      </Card>

      <Modal opened={opened} onClose={close} title="新建供应商" centered>
        <form onSubmit={form.onSubmit((values) => createMutation.mutate({ ...values, status: 'ACTIVE' }))}>
          <Stack>
            <TextInput label="Provider Code" placeholder="DEEPSEEK" required {...form.getInputProps('providerCode')} />
            <TextInput label="名称" placeholder="DeepSeek" required {...form.getInputProps('providerName')} />
            <TextInput label="Base URL" placeholder="https://api.deepseek.com" required {...form.getInputProps('baseUrl')} />
            <PasswordInput label="Provider API Key" {...form.getInputProps('apiKey')} />
            <Button color="dark" type="submit" loading={createMutation.isPending}>
              保存
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
