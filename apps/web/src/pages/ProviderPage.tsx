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
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconKey, IconPlugConnected, IconPlus, IconServerCog, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { gatewayApi } from '../api/gateway';

export default function ProviderPage() {
  const [opened, { open, close }] = useDisclosure(false);
  const [keyOpened, { open: openKey, close: closeKey }] = useDisclosure(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const queryClient = useQueryClient();
  const form = useForm({
    initialValues: {
      providerCode: '',
      providerName: '',
      baseUrl: '',
      apiKey: '',
    },
  });
  const keyForm = useForm({
    initialValues: {
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
  const updateKeyMutation = useMutation({
    mutationFn: ({ id, apiKey }: { id: string; apiKey: string }) => gatewayApi.updateProviderApiKey(id, { apiKey }),
    onSuccess: () => {
      notifications.show({ color: 'teal', title: '密钥已更新', message: 'Provider API Key 已加密保存。' });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      keyForm.reset();
      closeKey();
      setSelectedProvider(null);
    },
  });
  const testMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => gatewayApi.testProvider(id),
    onSuccess: (result: any) => {
      notifications.show({
        color: result.success ? 'teal' : 'red',
        title: result.success ? '连接正常' : '连接失败',
        message: `${result.providerCode}${result.modelCode ? ` / ${result.modelCode}` : ''}: ${result.message}`,
      });
    },
  });
  const disableMutation = useMutation({
    mutationFn: gatewayApi.disableProvider,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });
  const providers = providersQuery.data ?? [];

  const handleOpenKeyModal = (provider: any) => {
    setSelectedProvider(provider);
    keyForm.reset();
    openKey();
  };

  const handleCloseKeyModal = () => {
    keyForm.reset();
    setSelectedProvider(null);
    closeKey();
  };

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
                    <Badge
                      color={
                        provider.healthStatus === 'HEALTHY'
                          ? 'teal'
                          : provider.healthStatus === 'CIRCUIT_OPEN'
                            ? 'red'
                            : provider.healthStatus === 'DEGRADED'
                              ? 'yellow'
                              : 'gray'
                      }
                      variant="light"
                      radius="sm"
                    >
                      {provider.healthStatus || 'UNKNOWN'}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {provider.providerCode} · {provider.baseUrl}
                  </Text>
                  <Text size="xs" c="dimmed">
                    retry {provider.retryCount ?? 0} · failures {provider.consecutiveFailures ?? 0}
                    {provider.circuitOpenUntil ? ` · open until ${provider.circuitOpenUntil}` : ''}
                  </Text>
                </Box>
              </Group>
              <Group gap="xs" wrap="nowrap">
                <Tooltip label="测试连接">
                  <ActionIcon
                    variant="subtle"
                    color="teal"
                    aria-label="Test provider connection"
                    loading={testMutation.isPending && testMutation.variables?.id === provider.id}
                    onClick={() => testMutation.mutate({ id: provider.id })}
                  >
                    <IconPlugConnected size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="更新密钥">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    aria-label="Update provider API key"
                    onClick={() => handleOpenKeyModal(provider)}
                  >
                    <IconKey size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="禁用">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label="Disable provider"
                    loading={disableMutation.isPending && disableMutation.variables === provider.id}
                    onClick={() => disableMutation.mutate(provider.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
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

      <Modal
        opened={keyOpened}
        onClose={handleCloseKeyModal}
        title={`更新密钥${selectedProvider ? ` · ${selectedProvider.providerName}` : ''}`}
        centered
      >
        <form
          onSubmit={keyForm.onSubmit((values) => {
            if (!selectedProvider) {
              return;
            }
            updateKeyMutation.mutate({ id: selectedProvider.id, apiKey: values.apiKey });
          })}
        >
          <Stack>
            <Text size="sm" c="dimmed">
              完整密钥只会在提交时进入后端加密保存，控制台不会回显已保存的明文。
            </Text>
            <PasswordInput label="Provider API Key" required {...keyForm.getInputProps('apiKey')} />
            <Button color="dark" type="submit" loading={updateKeyMutation.isPending} disabled={!selectedProvider}>
              保存密钥
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
