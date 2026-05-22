import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconHistory, IconPlus, IconRocket, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { orchestrationApi, type PromptTemplate, type PromptVersion } from '../api/orchestration';
import { tenantApi } from '../api/tenants';

export function PromptTemplatePage() {
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [versionOpened, versionModal] = useDisclosure(false);

  const tenants = useQuery({ queryKey: ['tenants'], queryFn: tenantApi.list });
  const templates = useQuery({
    queryKey: ['prompt-templates', tenantId],
    queryFn: () => orchestrationApi.promptTemplates(tenantId ? Number(tenantId) : undefined),
  });

  const form = useForm({
    initialValues: {
      tenantId: '',
      templateCode: '',
      templateName: '',
      description: '',
      content: '',
      status: 'DRAFT',
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: typeof form.values) => {
      const payload = { ...values, tenantId: Number(values.tenantId) };
      return editing
        ? orchestrationApi.updatePromptTemplate(editing.id, payload)
        : orchestrationApi.createPromptTemplate(payload);
    },
    onSuccess: () => {
      notifications.show({ color: 'green', title: '已保存', message: 'Prompt 模板已更新。' });
      close();
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: orchestrationApi.publishPromptTemplate,
    onSuccess: () => {
      notifications.show({ color: 'green', title: '已发布', message: '已生成新的 Prompt 版本。' });
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
    },
  });

  const disableMutation = useMutation({
    mutationFn: orchestrationApi.disablePromptTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prompt-templates'] }),
  });

  const openEditor = (template?: PromptTemplate) => {
    setEditing(template ?? null);
    form.setValues({
      tenantId: String(template?.tenantId ?? tenantId ?? ''),
      templateCode: template?.templateCode ?? '',
      templateName: template?.templateName ?? '',
      description: template?.description ?? '',
      content: template?.content ?? '',
      status: template?.status ?? 'DRAFT',
    });
    open();
  };

  const openVersions = async (template: PromptTemplate) => {
    setVersions(await orchestrationApi.promptVersions(template.id));
    versionModal.open();
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={4}>
          <Title order={2}>Prompt Templates</Title>
          <Text c="dimmed">管理草稿、发布版本和启用状态，不保存客户知识数据。</Text>
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
            新建模板
          </Button>
        </Group>
      </Group>

      <Card p="lg">
        <Table.ScrollContainer minWidth={860}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Updated</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(templates.data ?? []).map((template) => (
                <Table.Tr key={template.id}>
                  <Table.Td>
                    <Text fw={700}>{template.templateCode}</Text>
                  </Table.Td>
                  <Table.Td>{template.templateName}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={template.status === 'PUBLISHED' ? 'green' : 'gray'}>
                      {template.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{template.updatedAt}</Table.Td>
                  <Table.Td>
                    <Group justify="flex-end" gap={4}>
                      <Tooltip label="版本">
                        <ActionIcon variant="subtle" onClick={() => openVersions(template)}>
                          <IconHistory size={17} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="发布">
                        <ActionIcon variant="subtle" onClick={() => publishMutation.mutate(template.id)}>
                          <IconRocket size={17} />
                        </ActionIcon>
                      </Tooltip>
                      <Button size="xs" variant="light" onClick={() => openEditor(template)}>
                        编辑
                      </Button>
                      <Tooltip label="禁用">
                        <ActionIcon color="red" variant="subtle" onClick={() => disableMutation.mutate(template.id)}>
                          <IconTrash size={17} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Modal opened={opened} onClose={close} title={editing ? '编辑模板' : '新建模板'} size="lg">
        <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
          <Stack>
            <Select
              label="Tenant"
              data={(tenants.data ?? []).map((tenant) => ({ value: String(tenant.id), label: tenant.tenantName }))}
              {...form.getInputProps('tenantId')}
            />
            <TextInput label="Code" {...form.getInputProps('templateCode')} />
            <TextInput label="Name" {...form.getInputProps('templateName')} />
            <TextInput label="Description" {...form.getInputProps('description')} />
            <Select label="Status" data={['DRAFT', 'PUBLISHED', 'DISABLED']} {...form.getInputProps('status')} />
            <Textarea label="Content" minRows={8} autosize {...form.getInputProps('content')} />
            <Group justify="flex-end">
              <Button type="submit" loading={saveMutation.isPending}>
                保存
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={versionOpened} onClose={versionModal.close} title="版本记录" size="lg">
        <Stack>
          {versions.map((version) => (
            <Card key={version.id} p="md" withBorder>
              <Group justify="space-between">
                <Text fw={700}>v{version.versionNo}</Text>
                <Badge variant="light">{version.status}</Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {version.publishedAt}
              </Text>
              <Text mt="sm" lineClamp={4}>
                {version.content}
              </Text>
            </Card>
          ))}
        </Stack>
      </Modal>
    </Stack>
  );
}

export default PromptTemplatePage;
