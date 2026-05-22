import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconGauge, IconKey, IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { gatewayApi, type TenantApiKeyCreated } from '../api/gateway';
import { tenantApi } from '../api/tenants';

type TenantLite = {
  id: string;
  tenantName: string;
  tenantCode: string;
};

const scopeOptions = [
  { value: 'chat:completion', label: 'chat:completion' },
  { value: 'billing:read', label: 'billing:read' },
  { value: 'usage:read', label: 'usage:read' },
  { value: 'provider:test', label: 'provider:test' },
  { value: 'admin:*', label: 'admin:*' },
];

export default function ApiKeyPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<TenantApiKeyCreated | null>(null);
  const [selectedApiKey, setSelectedApiKey] = useState<any>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [limitOpened, { open: openLimit, close: closeLimit }] = useDisclosure(false);
  const queryClient = useQueryClient();
  const tenantsQuery = useQuery({ queryKey: ['tenants'], queryFn: tenantApi.list });
  const tenants = (tenantsQuery.data ?? []) as TenantLite[];
  const apiKeysQuery = useQuery({
    queryKey: ['api-keys', selectedTenantId],
    queryFn: () => gatewayApi.apiKeys(selectedTenantId as string),
    enabled: Boolean(selectedTenantId),
  });
  const form = useForm({ initialValues: { name: '', scopes: ['chat:completion'] as string[] } });
  const limitForm = useForm({
    initialValues: {
      rpmLimit: null as number | null,
      tpmLimit: null as number | null,
      dailyCreditsLimit: null as number | null,
      maxConcurrent: null as number | null,
    },
  });

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [selectedTenantId, tenants]);

  const createMutation = useMutation({
    mutationFn: (values: { name: string; scopes: string[] }) => gatewayApi.createApiKey(selectedTenantId as string, values),
    onSuccess: (apiKey) => {
      setCreatedKey(apiKey);
      notifications.show({ color: 'teal', title: '已创建', message: '完整 Key 只展示一次。' });
      queryClient.invalidateQueries({ queryKey: ['api-keys', selectedTenantId] });
      form.reset();
    },
  });
  const revokeMutation = useMutation({
    mutationFn: (id: string) => gatewayApi.revokeApiKey(selectedTenantId as string, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys', selectedTenantId] }),
  });
  const updateLimitMutation = useMutation({
    mutationFn: (values: typeof limitForm.values) =>
      gatewayApi.updateApiKeyRateLimit(selectedTenantId as string, selectedApiKey.id, { ...values, status: 'ACTIVE' }),
    onSuccess: () => {
      notifications.show({ color: 'teal', title: '限流已保存', message: 'API Key 限流配置已更新。' });
      closeLimit();
      setSelectedApiKey(null);
    },
  });
  const apiKeys = apiKeysQuery.data ?? [];

  const openLimitModal = async (apiKey: any) => {
    setSelectedApiKey(apiKey);
    const limit = selectedTenantId ? await gatewayApi.apiKeyRateLimit(selectedTenantId, apiKey.id) : null;
    limitForm.setValues({
      rpmLimit: limit?.rpmLimit ?? null,
      tpmLimit: limit?.tpmLimit ?? null,
      dailyCreditsLimit: limit?.dailyCreditsLimit ?? null,
      maxConcurrent: limit?.maxConcurrent ?? null,
    });
    openLimit();
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>API Key 管理</Title>
          <Text c="dimmed" maw={680}>
            为租户签发网关调用 Key。数据库只保存 hash，完整 Key 只在创建时展示一次。
          </Text>
        </Stack>
        <Button color="dark" leftSection={<IconPlus size={16} />} onClick={open} disabled={!selectedTenantId}>
          新建 Key
        </Button>
      </Group>

      <Card className="surface-card" p="lg">
        <Select
          label="租户"
          maw={360}
          value={selectedTenantId}
          onChange={setSelectedTenantId}
          data={tenants.map((tenant) => ({
            value: tenant.id,
            label: `${tenant.tenantName} · ${tenant.tenantCode}`,
          }))}
        />
      </Card>

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={650}>
            Tenant API Keys
          </Text>
          <Badge color="gray" variant="light" radius="sm">
            {apiKeys.length} total
          </Badge>
        </Group>
        <Stack gap={0} className="subtle-list">
          {apiKeys.map((apiKey) => (
            <Group key={apiKey.id} className="list-row" p="md" justify="space-between" wrap="nowrap">
              <Group wrap="nowrap">
                <ThemeIcon color="yellow" variant="light" radius="sm" size={38}>
                  <IconKey size={20} />
                </ThemeIcon>
                <Box>
                  <Group gap="xs">
                    <Text fw={650}>{apiKey.name}</Text>
                    <Badge color={apiKey.status === 'ACTIVE' ? 'teal' : 'gray'} variant="light" radius="sm">
                      {apiKey.status}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {apiKey.apiKeyPrefix} · last used {apiKey.lastUsedAt || 'never'}
                  </Text>
                  <Group gap={4} mt={4}>
                    {(apiKey.scopes ?? []).map((scope: string) => (
                      <Badge key={scope} color="gray" variant="light" radius="sm">
                        {scope}
                      </Badge>
                    ))}
                  </Group>
                </Box>
              </Group>
              <Group gap="xs" wrap="nowrap">
                <Tooltip label="限流配置">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    aria-label="Configure API key rate limit"
                    onClick={() => openLimitModal(apiKey)}
                  >
                    <IconGauge size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="吊销">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label="Revoke API key"
                    loading={revokeMutation.isPending}
                    onClick={() => revokeMutation.mutate(apiKey.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          ))}
        </Stack>
      </Card>

      <Modal
        opened={opened}
        onClose={() => {
          close();
          setCreatedKey(null);
        }}
        title="新建 API Key"
        centered
      >
        <Stack>
          <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
            <Stack>
              <TextInput label="名称" required {...form.getInputProps('name')} />
              <MultiSelect label="Scopes" data={scopeOptions} required {...form.getInputProps('scopes')} />
              <Button color="dark" type="submit" loading={createMutation.isPending}>
                创建
              </Button>
            </Stack>
          </form>
          {createdKey && (
            <Card p="sm" radius="sm" withBorder>
              <Text size="xs" c="dimmed" mb={6}>
                完整 Key
              </Text>
              <Code block>{createdKey.apiKey}</Code>
            </Card>
          )}
        </Stack>
      </Modal>

      <Modal
        opened={limitOpened}
        onClose={() => {
          closeLimit();
          setSelectedApiKey(null);
        }}
        title={`API Key 限流${selectedApiKey ? ` · ${selectedApiKey.name}` : ''}`}
        centered
      >
        <form onSubmit={limitForm.onSubmit((values) => updateLimitMutation.mutate(values))}>
          <Stack>
            <NumberInput label="RPM 每分钟请求数" min={0} {...limitForm.getInputProps('rpmLimit')} />
            <NumberInput label="TPM 每分钟 Token" min={0} {...limitForm.getInputProps('tpmLimit')} />
            <NumberInput label="Daily Credits 每日额度" min={0} {...limitForm.getInputProps('dailyCreditsLimit')} />
            <NumberInput label="Max Concurrent 最大并发" min={0} {...limitForm.getInputProps('maxConcurrent')} />
            <Button color="dark" type="submit" loading={updateLimitMutation.isPending} disabled={!selectedApiKey}>
              保存限流
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
