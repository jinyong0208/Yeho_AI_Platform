import { Badge, Button, Card, Group, Modal, NumberInput, Select, Stack, Table, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gatewayApi } from '../api/gateway';
import { orchestrationApi, type AgentConfig } from '../api/orchestration';
import { tenantApi } from '../api/tenants';
import { useAuthStore } from '../store/useAuthStore';
import { resolvePrimaryRole, USER_ROLES } from '../utils/roles';

type TenantLite = {
  id: string;
  tenantCode: string;
  tenantName: string;
};

export function AgentConfigPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const canSelectTenant = primaryRole === USER_ROLES.SUPER_ADMIN;
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AgentConfig | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const tenantsQuery = useQuery({ queryKey: ['tenants', 'agent-configs'], queryFn: tenantApi.list, enabled: canSelectTenant });
  const tenants = canSelectTenant
    ? ((tenantsQuery.data ?? []) as TenantLite[])
    : user?.tenantId
      ? [{ id: user.tenantId, tenantName: t('walletPage.currentTenant'), tenantCode: user.tenantId }]
      : [];
  const tenantOptions = tenants.map((tenant) => ({ value: String(tenant.id), label: `${tenant.tenantName} / ${tenant.tenantCode}` }));
  const hasTenantScope = canSelectTenant || Boolean(tenantId);

  useEffect(() => {
    if (!tenantId && tenants.length > 0) {
      setTenantId(tenants[0].id);
    }
  }, [tenantId, tenants]);

  const models = useQuery({ queryKey: ['models', 'agent-configs'], queryFn: gatewayApi.models });
  const configs = useQuery({
    queryKey: ['agent-configs', tenantId],
    queryFn: () => orchestrationApi.agentConfigs(tenantId ?? undefined),
    enabled: hasTenantScope,
  });

  const form = useForm({
    initialValues: {
      tenantId: '',
      systemCode: '',
      dataDomain: '',
      allowedDataDomains: '',
      agentCode: '',
      agentName: '',
      description: '',
      systemPrompt: '',
      defaultModel: '',
      temperature: 0.7,
      maxTokens: 2048,
      status: 'ACTIVE',
    },
    validate: {
      tenantId: (value) => (value ? null : t('agentConfigPage.required')),
      agentCode: (value) => (value.trim() ? null : t('agentConfigPage.required')),
      agentName: (value) => (value.trim() ? null : t('agentConfigPage.required')),
      defaultModel: (value) => (value ? null : t('agentConfigPage.required')),
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: typeof form.values) => {
      const payload = { ...values, tenantId: values.tenantId };
      return editing ? orchestrationApi.updateAgentConfig(editing.id, payload) : orchestrationApi.createAgentConfig(payload);
    },
    onSuccess: () => {
      notifications.show({
        color: 'green',
        title: t('agentConfigPage.savedTitle'),
        message: t('agentConfigPage.savedMessage'),
      });
      close();
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['agent-configs'] });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: t('agentConfigPage.saveFailedTitle'),
        message: error instanceof Error ? error.message : t('agentConfigPage.saveFailedMessage'),
      });
    },
  });

  const disableMutation = useMutation({
    mutationFn: orchestrationApi.disableAgentConfig,
    onSuccess: () => {
      notifications.show({
        color: 'gray',
        title: t('agentConfigPage.disabledTitle'),
        message: t('agentConfigPage.disabledMessage'),
      });
      queryClient.invalidateQueries({ queryKey: ['agent-configs'] });
    },
  });

  const modelOptions = (models.data ?? []).map((model) => ({
    value: model.modelCode,
    label: `${model.displayName || model.modelCode} / ${model.modelCode}`,
  }));
  const statusOptions = [
    { value: 'ACTIVE', label: t('agentConfigPage.status.ACTIVE') },
    { value: 'DISABLED', label: t('agentConfigPage.status.DISABLED') },
  ];
  const formatStatus = (status: string) => t(`agentConfigPage.status.${status}`, { defaultValue: status });

  const openEditor = (config?: AgentConfig) => {
    setEditing(config ?? null);
    form.setValues({
      tenantId: String(config?.tenantId ?? tenantId ?? ''),
      systemCode: config?.systemCode ?? '',
      dataDomain: config?.dataDomain ?? '',
      allowedDataDomains: config?.allowedDataDomains ?? '',
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
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{t('agentConfigPage.title')}</Title>
          <Text c="dimmed" maw={720}>
            {t('agentConfigPage.description')}
          </Text>
        </Stack>
        <Group>
          <Select
            placeholder={t('agentConfigPage.tenant')}
            data={tenantOptions}
            value={tenantId}
            onChange={setTenantId}
            clearable
            disabled={!canSelectTenant}
          />
          <Button color="dark" leftSection={<IconPlus size={16} />} disabled={!tenantId} onClick={() => openEditor()}>
            {t('agentConfigPage.createAgent')}
          </Button>
        </Group>
      </Group>

      <Card className="surface-card" p="lg">
        <Table.ScrollContainer minWidth={900}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('agentConfigPage.systemCode')}</Table.Th>
                <Table.Th>{t('agentConfigPage.dataDomain')}</Table.Th>
                <Table.Th>{t('code')}</Table.Th>
                <Table.Th>{t('name')}</Table.Th>
                <Table.Th>{t('agentConfigPage.defaultModel')}</Table.Th>
                <Table.Th>{t('agentConfigPage.temperature')}</Table.Th>
                <Table.Th>{t('agentConfigPage.maxTokens')}</Table.Th>
                <Table.Th>{t('status')}</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(configs.data ?? []).map((config) => (
                <Table.Tr key={config.id}>
                  <Table.Td>{config.systemCode || '-'}</Table.Td>
                  <Table.Td>{config.dataDomain || '-'}</Table.Td>
                  <Table.Td>
                    <Text fw={700}>{config.agentCode}</Text>
                  </Table.Td>
                  <Table.Td>{config.agentName}</Table.Td>
                  <Table.Td>{config.defaultModel}</Table.Td>
                  <Table.Td>{config.temperature}</Table.Td>
                  <Table.Td>{config.maxTokens}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={config.status === 'ACTIVE' ? 'green' : 'gray'}>
                      {formatStatus(config.status)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group justify="flex-end">
                      <Button size="xs" variant="light" onClick={() => openEditor(config)}>
                        {t('agentConfigPage.edit')}
                      </Button>
                      <Button size="xs" color="red" variant="subtle" onClick={() => disableMutation.mutate(config.id)}>
                        {t('agentConfigPage.disable')}
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {(configs.data ?? []).length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Text c="dimmed" ta="center" py="xl">
                      {t('agentConfigPage.empty')}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Modal opened={opened} onClose={close} title={editing ? t('agentConfigPage.editAgent') : t('agentConfigPage.newAgent')} size="lg">
        <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
          <Stack>
            <Select
              label={t('agentConfigPage.tenant')}
              data={tenantOptions}
              disabled={!canSelectTenant}
              required
              {...form.getInputProps('tenantId')}
            />
            <TextInput
              label={t('agentConfigPage.systemCode')}
              placeholder={t('agentConfigPage.systemCodePlaceholder')}
              {...form.getInputProps('systemCode')}
            />
            <TextInput
              label={t('agentConfigPage.dataDomain')}
              placeholder={t('agentConfigPage.dataDomainPlaceholder')}
              {...form.getInputProps('dataDomain')}
            />
            <TextInput
              label={t('agentConfigPage.allowedDataDomains')}
              description={t('agentConfigPage.allowedDataDomainsHint')}
              placeholder={t('agentConfigPage.allowedDataDomainsPlaceholder')}
              {...form.getInputProps('allowedDataDomains')}
            />
            <TextInput label={t('code')} required {...form.getInputProps('agentCode')} />
            <TextInput label={t('name')} required {...form.getInputProps('agentName')} />
            <TextInput label={t('agentConfigPage.descriptionLabel')} {...form.getInputProps('description')} />
            <Select
              label={t('agentConfigPage.defaultModel')}
              data={modelOptions}
              searchable
              required
              {...form.getInputProps('defaultModel')}
            />
            <NumberInput label={t('agentConfigPage.temperature')} min={0} max={2} step={0.1} {...form.getInputProps('temperature')} />
            <NumberInput label={t('agentConfigPage.maxTokens')} min={1} max={128000} {...form.getInputProps('maxTokens')} />
            <Select label={t('status')} data={statusOptions} {...form.getInputProps('status')} />
            <Textarea label={t('agentConfigPage.systemPrompt')} minRows={6} autosize {...form.getInputProps('systemPrompt')} />
            <Text size="xs" c="dimmed">
              {t('agentConfigPage.boundaryNote')}
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

export default AgentConfigPage;
