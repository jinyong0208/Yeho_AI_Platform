import {
  Autocomplete,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Divider,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconCircleCheck, IconGitBranch, IconPlayerPlay, IconPlus, IconSettingsAutomation } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gatewayApi } from '../api/gateway';
import { orchestrationApi, type WorkflowDefinition } from '../api/orchestration';
import { tenantApi } from '../api/tenants';
import { useAuthStore } from '../store/useAuthStore';
import { resolvePrimaryRole, USER_ROLES } from '../utils/roles';

type TenantLite = {
  id: string;
  tenantCode: string;
  tenantName: string;
};

const defaultWorkflowSchema = JSON.stringify(
  {
    version: '1',
    input: {
      query: 'string',
      userId: 'string',
    },
    steps: [
      { type: 'intent', name: 'intent' },
      { type: 'retrieve', name: 'retrieve' },
      { type: 'agent', name: 'agent' },
    ],
    output: {
      answer: 'string',
      citations: 'array',
    },
  },
  null,
  2,
);

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

const prettyJson = (value?: string) => {
  if (!value) {
    return defaultWorkflowSchema;
  }
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

const parseSteps = (schemaJson?: string) => {
  try {
    const schema = JSON.parse(schemaJson || '{}') as { steps?: Array<{ type?: string; name?: string }> };
    return Array.isArray(schema.steps) ? schema.steps : [];
  } catch {
    return [];
  }
};

export default function WorkflowPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const canSelectTenant = primaryRole === USER_ROLES.SUPER_ADMIN;
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [editing, setEditing] = useState<WorkflowDefinition | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const tenantsQuery = useQuery({ queryKey: ['tenants', 'workflows'], queryFn: tenantApi.list, enabled: canSelectTenant });
  const tenants = canSelectTenant
    ? ((tenantsQuery.data ?? []) as TenantLite[])
    : user?.tenantId
      ? [{ id: user.tenantId, tenantName: t('workflowPage.currentTenant'), tenantCode: user.tenantId }]
      : [];
  const tenantOptions = tenants.map((tenant) => ({
    value: String(tenant.id),
    label: `${tenant.tenantName} / ${tenant.tenantCode}`,
  }));
  const hasTenantScope = canSelectTenant || Boolean(tenantId);

  useEffect(() => {
    if (!tenantId && tenants.length > 0) {
      setTenantId(tenants[0].id);
    }
  }, [tenantId, tenants]);

  const workflowsQuery = useQuery({
    queryKey: ['workflows', tenantId],
    queryFn: () => orchestrationApi.workflows(tenantId ?? undefined),
    enabled: hasTenantScope,
  });
  const workflows = workflowsQuery.data ?? [];
  const selectedWorkflow = workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? workflows[0] ?? null;

  useEffect(() => {
    if (!selectedWorkflowId && workflows.length > 0) {
      setSelectedWorkflowId(workflows[0].id);
    }
    if (selectedWorkflowId && workflows.length > 0 && !workflows.some((workflow) => workflow.id === selectedWorkflowId)) {
      setSelectedWorkflowId(workflows[0].id);
    }
  }, [selectedWorkflowId, workflows]);

  const models = useQuery({ queryKey: ['models', 'workflows'], queryFn: gatewayApi.models });
  const agents = useQuery({
    queryKey: ['agent-configs', 'workflows', tenantId],
    queryFn: () => orchestrationApi.agentConfigs(tenantId ?? undefined),
    enabled: hasTenantScope,
  });
  const versions = useQuery({
    queryKey: ['workflow-versions', selectedWorkflow?.id],
    queryFn: () => orchestrationApi.workflowVersions(selectedWorkflow?.id as string),
    enabled: Boolean(selectedWorkflow?.id),
  });

  const modelOptions = (models.data ?? []).map((model) => model.modelCode);
  const agentOptions = (agents.data ?? []).map((agent) => ({
    value: agent.agentCode,
    label: `${agent.agentName || agent.agentCode} / ${agent.agentCode}`,
  }));
  const steps = useMemo(() => parseSteps(selectedWorkflow?.schemaJson), [selectedWorkflow?.schemaJson]);

  const form = useForm({
    initialValues: {
      tenantId: '',
      workflowCode: '',
      workflowName: '',
      description: '',
      systemCode: '',
      dataDomain: '',
      agentCode: '',
      defaultModel: '',
      schemaJson: defaultWorkflowSchema,
      status: 'DRAFT',
    },
    validate: {
      tenantId: (value) => (value ? null : t('workflowPage.required')),
      workflowCode: (value) => (value.trim() ? null : t('workflowPage.required')),
      workflowName: (value) => (value.trim() ? null : t('workflowPage.required')),
      schemaJson: (value) => {
        try {
          JSON.parse(value);
          return null;
        } catch {
          return t('workflowPage.invalidJson');
        }
      },
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: typeof form.values) =>
      editing ? orchestrationApi.updateWorkflow(editing.id, values) : orchestrationApi.createWorkflow(values),
    onSuccess: (workflow) => {
      notifications.show({ color: 'teal', title: t('workflowPage.savedTitle'), message: t('workflowPage.savedMessage') });
      setSelectedWorkflowId(workflow.id);
      close();
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: t('workflowPage.saveFailedTitle'),
        message: getApiErrorMessage(error, t('workflowPage.saveFailedMessage')),
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: orchestrationApi.publishWorkflow,
    onSuccess: () => {
      notifications.show({ color: 'green', title: t('workflowPage.publishedTitle'), message: t('workflowPage.publishedMessage') });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-versions'] });
    },
  });

  const disableMutation = useMutation({
    mutationFn: orchestrationApi.disableWorkflow,
    onSuccess: () => {
      notifications.show({ color: 'gray', title: t('workflowPage.disabledTitle'), message: t('workflowPage.disabledMessage') });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const openEditor = (workflow?: WorkflowDefinition) => {
    setEditing(workflow ?? null);
    form.setValues({
      tenantId: String(workflow?.tenantId ?? tenantId ?? ''),
      workflowCode: workflow?.workflowCode ?? '',
      workflowName: workflow?.workflowName ?? '',
      description: workflow?.description ?? '',
      systemCode: workflow?.systemCode ?? '',
      dataDomain: workflow?.dataDomain ?? '',
      agentCode: workflow?.agentCode ?? '',
      defaultModel: workflow?.defaultModel ?? '',
      schemaJson: prettyJson(workflow?.schemaJson),
      status: workflow?.status ?? 'DRAFT',
    });
    open();
  };

  const runtimeConfigUrl = selectedWorkflow
    ? `/api/v1/workflow-runtime/configs/${selectedWorkflow.workflowCode}`
    : '/api/v1/workflow-runtime/configs/{workflow_code}';

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Group gap="xs">
            <Title order={2}>{t('workflowPage.title')}</Title>
            <Badge color="yellow" variant="light" radius="sm">
              {t('workflowPage.previewBadge')}
            </Badge>
          </Group>
          <Text c="dimmed" maw={840}>
            {t('workflowPage.description')}
          </Text>
        </Stack>
        <Group>
          <Select
            placeholder={t('workflowPage.tenant')}
            data={tenantOptions}
            value={tenantId}
            onChange={setTenantId}
            clearable
            disabled={!canSelectTenant}
          />
          <Button color="dark" leftSection={<IconPlus size={16} />} disabled={!tenantId} onClick={() => openEditor()}>
            {t('workflowPage.create')}
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
        {['config', 'businessExecution', 'audit'].map((key) => (
          <Card key={key} className="surface-card" p="md" withBorder>
            <Group align="flex-start" gap="sm">
              <ThemeIcon color="blue" variant="light" radius="sm" size={38}>
                {key === 'config' ? <IconSettingsAutomation size={19} /> : key === 'businessExecution' ? <IconGitBranch size={19} /> : <IconCircleCheck size={19} />}
              </ThemeIcon>
              <Stack gap={2}>
                <Text fw={700}>{t(`workflowPage.overview.${key}.title`)}</Text>
                <Text size="sm" c="dimmed">
                  {t(`workflowPage.overview.${key}.body`)}
                </Text>
              </Stack>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
        <Card className="surface-card" p="lg" withBorder>
          <Group justify="space-between" mb="md">
            <Text fw={700}>{t('workflowPage.listTitle')}</Text>
            <Badge color="gray" variant="light" radius="sm">
              {t('workflowPage.count', { count: workflows.length })}
            </Badge>
          </Group>
          <Stack gap="sm">
            {workflows.map((workflow) => (
              <Card
                key={workflow.id}
                withBorder
                radius="sm"
                p="md"
                style={{
                  borderColor: selectedWorkflow?.id === workflow.id ? '#228be6' : undefined,
                  backgroundColor: selectedWorkflow?.id === workflow.id ? '#f8fbff' : '#fff',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedWorkflowId(workflow.id)}
              >
                <Group justify="space-between" align="flex-start">
                  <Stack gap={4}>
                    <Group gap="xs">
                      <Text fw={700}>{workflow.workflowName}</Text>
                      <Badge color={workflow.status === 'PUBLISHED' ? 'green' : workflow.status === 'DRAFT' ? 'yellow' : 'gray'} variant="light">
                        {t(`workflowPage.status.${workflow.status}`, { defaultValue: workflow.status })}
                      </Badge>
                    </Group>
                    <Group gap="xs">
                      <Code>{workflow.workflowCode}</Code>
                      {workflow.currentVersionNo && <Badge variant="light">v{workflow.currentVersionNo}</Badge>}
                    </Group>
                    <Text size="sm" c="dimmed" lineClamp={1}>
                      {workflow.description || t('workflowPage.noDescription')}
                    </Text>
                  </Stack>
                  <Group gap="xs">
                    <Button size="xs" variant="light" onClick={(event) => { event.stopPropagation(); openEditor(workflow); }}>
                      {t('workflowPage.edit')}
                    </Button>
                    <Button size="xs" color="green" variant="light" loading={publishMutation.isPending} onClick={(event) => { event.stopPropagation(); publishMutation.mutate(workflow.id); }}>
                      {t('workflowPage.publish')}
                    </Button>
                    <Button size="xs" color="red" variant="subtle" disabled={workflow.status === 'DISABLED'} onClick={(event) => { event.stopPropagation(); disableMutation.mutate(workflow.id); }}>
                      {t('workflowPage.disable')}
                    </Button>
                  </Group>
                </Group>
              </Card>
            ))}
            {workflows.length === 0 && (
              <Box p="xl" ta="center">
                <ThemeIcon color="gray" variant="light" radius="sm" size={42} mx="auto" mb="sm">
                  <IconSettingsAutomation size={21} />
                </ThemeIcon>
                <Text c="dimmed">{t('workflowPage.empty')}</Text>
              </Box>
            )}
          </Stack>
        </Card>

        <Card className="surface-card" p="lg" withBorder>
          {selectedWorkflow ? (
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Text fw={700}>{selectedWorkflow.workflowName}</Text>
                  <Group gap="xs">
                    <Code>{selectedWorkflow.workflowCode}</Code>
                    <Badge color="blue" variant="light" radius="sm">
                      {runtimeConfigUrl}
                    </Badge>
                  </Group>
                </Stack>
                <ThemeIcon color="yellow" variant="light" radius="sm" size={38}>
                  <IconPlayerPlay size={19} />
                </ThemeIcon>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                <InfoBlock label={t('workflowPage.systemCode')} value={selectedWorkflow.systemCode || '-'} />
                <InfoBlock label={t('workflowPage.dataDomain')} value={selectedWorkflow.dataDomain || '-'} />
                <InfoBlock label={t('workflowPage.agentCode')} value={selectedWorkflow.agentCode || '-'} />
                <InfoBlock label={t('workflowPage.defaultModel')} value={selectedWorkflow.defaultModel || '-'} />
              </SimpleGrid>

              <Divider />

              <Stack gap="xs">
                <Text size="sm" fw={650}>
                  {t('workflowPage.previewSteps')}
                </Text>
                <Group gap="xs">
                  {steps.length > 0 ? (
                    steps.map((step, index) => (
                      <Badge key={`${step.type}-${index}`} color="gray" variant="light" radius="sm">
                        {index + 1}. {step.name || step.type || t('workflowPage.unnamedStep')}
                      </Badge>
                    ))
                  ) : (
                    <Text size="sm" c="dimmed">
                      {t('workflowPage.noSteps')}
                    </Text>
                  )}
                </Group>
              </Stack>

              <Stack gap="xs">
                <Text size="sm" fw={650}>
                  {t('workflowPage.schema')}
                </Text>
                <Code block>{prettyJson(selectedWorkflow.schemaJson)}</Code>
              </Stack>

              <Stack gap="xs">
                <Text size="sm" fw={650}>
                  {t('workflowPage.versions')}
                </Text>
                <Table.ScrollContainer minWidth={520}>
                  <Table verticalSpacing="xs">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('workflowPage.version')}</Table.Th>
                        <Table.Th>{t('status')}</Table.Th>
                        <Table.Th>{t('workflowPage.publishedAt')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {(versions.data ?? []).map((version) => (
                        <Table.Tr key={version.id}>
                          <Table.Td>v{version.versionNo}</Table.Td>
                          <Table.Td>{version.status}</Table.Td>
                          <Table.Td>{version.publishedAt || '-'}</Table.Td>
                        </Table.Tr>
                      ))}
                      {(versions.data ?? []).length === 0 && (
                        <Table.Tr>
                          <Table.Td colSpan={3}>
                            <Text c="dimmed" ta="center" py="sm">
                              {t('workflowPage.noVersions')}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Stack>
            </Stack>
          ) : (
            <Box p="xl" ta="center">
              <Text c="dimmed">{t('workflowPage.selectWorkflow')}</Text>
            </Box>
          )}
        </Card>
      </SimpleGrid>

      <Modal opened={opened} onClose={close} title={editing ? t('workflowPage.editTitle') : t('workflowPage.createTitle')} size="xl">
        <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
          <Stack>
            <Select label={t('workflowPage.tenant')} data={tenantOptions} disabled={!canSelectTenant} required {...form.getInputProps('tenantId')} />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label={t('workflowPage.workflowCode')} required {...form.getInputProps('workflowCode')} />
              <TextInput label={t('workflowPage.workflowName')} required {...form.getInputProps('workflowName')} />
              <TextInput label={t('workflowPage.systemCode')} placeholder="edms" {...form.getInputProps('systemCode')} />
              <TextInput label={t('workflowPage.dataDomain')} placeholder="document_text" {...form.getInputProps('dataDomain')} />
              <Autocomplete
                label={t('workflowPage.agentCode')}
                description={t('workflowPage.agentHint')}
                data={agentOptions}
                {...form.getInputProps('agentCode')}
              />
              <Autocomplete label={t('workflowPage.defaultModel')} data={modelOptions} {...form.getInputProps('defaultModel')} />
            </SimpleGrid>
            <TextInput label={t('workflowPage.descriptionLabel')} {...form.getInputProps('description')} />
            <Select
              label={t('status')}
              data={[
                { value: 'DRAFT', label: t('workflowPage.status.DRAFT') },
                { value: 'PUBLISHED', label: t('workflowPage.status.PUBLISHED') },
                { value: 'DISABLED', label: t('workflowPage.status.DISABLED') },
              ]}
              {...form.getInputProps('status')}
            />
            <Textarea label={t('workflowPage.schema')} minRows={14} autosize required {...form.getInputProps('schemaJson')} />
            <Text size="xs" c="dimmed">
              {t('workflowPage.boundaryNote')}
            </Text>
            <Group justify="flex-end">
              <Button color="dark" type="submit" loading={saveMutation.isPending}>
                {t('save')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <Card withBorder radius="sm" p="sm" style={{ backgroundColor: '#fbfcfe' }}>
      <Text size="xs" c="dimmed" fw={700}>
        {label}
      </Text>
      <Text size="sm" fw={650} mt={4}>
        {value}
      </Text>
    </Card>
  );
}
