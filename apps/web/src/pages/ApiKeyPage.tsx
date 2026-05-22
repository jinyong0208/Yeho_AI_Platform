import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Group,
  Modal,
  Select,
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
import { IconKey, IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { gatewayApi, type TenantApiKeyCreated } from '../api/gateway';
import { tenantApi } from '../api/tenants';

type TenantLite = {
  id: string;
  tenantName: string;
  tenantCode: string;
};

export default function ApiKeyPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<TenantApiKeyCreated | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const queryClient = useQueryClient();
  const tenantsQuery = useQuery({ queryKey: ['tenants'], queryFn: tenantApi.list });
  const tenants = (tenantsQuery.data ?? []) as TenantLite[];
  const apiKeysQuery = useQuery({
    queryKey: ['api-keys', selectedTenantId],
    queryFn: () => gatewayApi.apiKeys(selectedTenantId as string),
    enabled: Boolean(selectedTenantId),
  });
  const form = useForm({ initialValues: { name: '' } });

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [selectedTenantId, tenants]);

  const createMutation = useMutation({
    mutationFn: (values: { name: string }) => gatewayApi.createApiKey(selectedTenantId as string, values),
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
  const apiKeys = apiKeysQuery.data ?? [];

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
                </Box>
              </Group>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label="Revoke API key"
                loading={revokeMutation.isPending}
                onClick={() => revokeMutation.mutate(apiKey.id)}
              >
                <IconTrash size={16} />
              </ActionIcon>
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
    </Stack>
  );
}
