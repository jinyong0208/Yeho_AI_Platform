import { Badge, Button, Card, Group, Modal, NumberInput, Select, Stack, Table, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { gatewayApi } from '../api/gateway';
import { orchestrationApi, type AgentConfig } from '../api/orchestration';
import { tenantApi } from '../api/tenants';

export function AgentConfigPage() {
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AgentConfig | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const tenants = useQuery({ queryKey: ['tenants'], queryFn: tenantApi.list });
  const models = useQuery({ queryKey: ['models'], queryFn: gatewayApi.models });
  const configs = useQuery({
    queryKey: ['agent-configs', tenantId],
    queryFn: () => orchestrationApi.agentConfigs(tenantId ? Number(tenantId) : undefined),
  });

  const form = useForm({
    initialValues: {
      tenantId: '',
      agentCode: '',
      agentName: '',
      description: '',
      systemPrompt: '',
      defaultModel: '',
      temperature: 0.7,
      maxTokens: 2048,
      status: 'ACTIVE',
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: typeof form.values) => {
      const payload = { ...values, tenantId: Number(values.tenantId) };
      return editing ? orchestrationApi.updateAgentConfig(editing.id, payload) : orchestrationApi.createAgentConfig(payload);
    },
    onSuccess: () => {
      notifications.show({ color: 'green', title: '已保存', message: 'Agent 配置已更新。' });
      close();
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['agent-configs'] });
    },
  });

  const disableMutation = useMutation({
    mutationFn: orchestrationApi.disableAgentConfig,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-configs'] }),
  });

  const openEditor = (config?: AgentConfig) => {
    setEditing(config ?? null);
    form.setValues({
      tenantId: String(config?.tenantId ?? tenantId ?? ''),
      agentCode: config?.agentCode ?? '',
      agentName: config?.agentName ?? '',
      description: config?.description ?? '',
      systemPrompt: config?.systemPrompt ?? '',
      defaultModel: config?.defaultModel ?? '',
      temperature: config?.temperature ?? 0.7,
      maxTokens: config?.maxTokens ?? 2048,
      status: config?.status ?? 'ACTIVE',
    });
    open();
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={4}>
          <Title order={2}>Agent Config</Title>
          <Text c="dimmed">维护 Agent 基础配置，不启用多 Agent 自治或复杂 Workflow Runtime。</Text>
        </Stack>
        <Group>
          <Select
            placeholder="Tenant"
            data={(tenants.data ?? []).map((tenant) => ({ value: String(tenant.id), label: tenant.tenantName }))}
            value={tenantId}
            onChange={setTenantId}
            clearable
          />
          <Button leftSection={<IconPlus size={16} />} onClick={() => openEditor()}>
            新建 Agent
          </Button>
        </Group>
      </Group>

      <Card p="lg">
        <Table.ScrollContainer minWidth={900}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Model</Table.Th>
                <Table.Th>Temperature</Table.Th>
                <Table.Th>Max Tokens</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(configs.data ?? []).map((config) => (
                <Table.Tr key={config.id}>
                  <Table.Td>
                    <Text fw={700}>{config.agentCode}</Text>
                  </Table.Td>
                  <Table.Td>{config.agentName}</Table.Td>
                  <Table.Td>{config.defaultModel}</Table.Td>
                  <Table.Td>{config.temperature}</Table.Td>
                  <Table.Td>{config.maxTokens}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={config.status === 'ACTIVE' ? 'green' : 'gray'}>
                      {config.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group justify="flex-end">
                      <Button size="xs" variant="light" onClick={() => openEditor(config)}>
                        编辑
                      </Button>
                      <Button size="xs" color="red" variant="subtle" onClick={() => disableMutation.mutate(config.id)}>
                        禁用
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Modal opened={opened} onClose={close} title={editing ? '编辑 Agent' : '新建 Agent'} size="lg">
        <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
          <Stack>
            <Select
              label="Tenant"
              data={(tenants.data ?? []).map((tenant) => ({ value: String(tenant.id), label: tenant.tenantName }))}
              {...form.getInputProps('tenantId')}
            />
            <TextInput label="Code" {...form.getInputProps('agentCode')} />
            <TextInput label="Name" {...form.getInputProps('agentName')} />
            <TextInput label="Description" {...form.getInputProps('description')} />
            <Select
              label="Default Model"
              data={(models.data ?? []).map((model) => ({ value: model.modelCode, label: model.displayName }))}
              {...form.getInputProps('defaultModel')}
            />
            <NumberInput label="Temperature" min={0} max={2} step={0.1} {...form.getInputProps('temperature')} />
            <NumberInput label="Max Tokens" min={1} max={128000} {...form.getInputProps('maxTokens')} />
            <Select label="Status" data={['ACTIVE', 'DISABLED']} {...form.getInputProps('status')} />
            <Textarea label="System Prompt" minRows={6} autosize {...form.getInputProps('systemPrompt')} />
            <Group justify="flex-end">
              <Button type="submit" loading={saveMutation.isPending}>
                保存
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}

export default AgentConfigPage;
