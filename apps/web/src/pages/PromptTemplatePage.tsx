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
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { orchestrationApi, type PromptTemplate, type PromptVersion } from '../api/orchestration';
import { tenantApi } from '../api/tenants';
import { useAuthStore } from '../store/useAuthStore';
import { resolvePrimaryRole, USER_ROLES } from '../utils/roles';

type TenantLite = {
  id: string;
  tenantCode: string;
  tenantName: string;
};

export function PromptTemplatePage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const canSelectTenant = primaryRole === USER_ROLES.SUPER_ADMIN;
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [versionOpened, versionModal] = useDisclosure(false);

  const tenantsQuery = useQuery({ queryKey: ['tenants', 'prompt-templates'], queryFn: tenantApi.list, enabled: canSelectTenant });
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

  const templates = useQuery({
    queryKey: ['prompt-templates', tenantId],
    queryFn: () => orchestrationApi.promptTemplates(tenantId ?? undefined),
    enabled: hasTenantScope,
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
    validate: {
      tenantId: (value) => (value ? null : t('promptTemplatePage.required')),
      templateCode: (value) => (value.trim() ? null : t('promptTemplatePage.required')),
      templateName: (value) => (value.trim() ? null : t('promptTemplatePage.required')),
      content: (value) => (value.trim() ? null : t('promptTemplatePage.required')),
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: typeof form.values) => {
      const payload = { ...values, tenantId: values.tenantId };
      return editing
        ? orchestrationApi.updatePromptTemplate(editing.id, payload)
        : orchestrationApi.createPromptTemplate(payload);
    },
    onSuccess: () => {
      notifications.show({
        color: 'green',
        title: t('promptTemplatePage.savedTitle'),
        message: t('promptTemplatePage.savedMessage'),
      });
      close();
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: t('promptTemplatePage.saveFailedTitle'),
        message: error instanceof Error ? error.message : t('promptTemplatePage.saveFailedMessage'),
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: orchestrationApi.publishPromptTemplate,
    onSuccess: () => {
      notifications.show({
        color: 'green',
        title: t('promptTemplatePage.publishedTitle'),
        message: t('promptTemplatePage.publishedMessage'),
      });
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
    },
  });

  const disableMutation = useMutation({
    mutationFn: orchestrationApi.disablePromptTemplate,
    onSuccess: () => {
      notifications.show({
        color: 'gray',
        title: t('promptTemplatePage.disabledTitle'),
        message: t('promptTemplatePage.disabledMessage'),
      });
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
    },
  });

  const formatStatus = (status: string) => t(`promptTemplatePage.status.${status}`, { defaultValue: status });

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
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{t('promptTemplatePage.title')}</Title>
          <Text c="dimmed" maw={720}>
            {t('promptTemplatePage.description')}
          </Text>
        </Stack>
        <Group>
          <Select
            placeholder={t('promptTemplatePage.tenant')}
            data={tenantOptions}
            value={tenantId}
            onChange={setTenantId}
            clearable
            disabled={!canSelectTenant}
          />
          <Button color="dark" leftSection={<IconPlus size={16} />} disabled={!tenantId} onClick={() => openEditor()}>
            {t('promptTemplatePage.createTemplate')}
          </Button>
        </Group>
      </Group>

      <Card className="surface-card" p="lg">
        <Table.ScrollContainer minWidth={860}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('code')}</Table.Th>
                <Table.Th>{t('name')}</Table.Th>
                <Table.Th>{t('status')}</Table.Th>
                <Table.Th>{t('promptTemplatePage.updated')}</Table.Th>
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
                      {formatStatus(template.status)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{template.updatedAt}</Table.Td>
                  <Table.Td>
                    <Group justify="flex-end" gap={4}>
                      <Tooltip label={t('promptTemplatePage.versions')}>
                        <ActionIcon variant="subtle" onClick={() => openVersions(template)}>
                          <IconHistory size={17} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label={t('promptTemplatePage.publish')}>
                        <ActionIcon variant="subtle" onClick={() => publishMutation.mutate(template.id)}>
                          <IconRocket size={17} />
                        </ActionIcon>
                      </Tooltip>
                      <Button size="xs" variant="light" onClick={() => openEditor(template)}>
                        {t('promptTemplatePage.edit')}
                      </Button>
                      <Tooltip label={t('promptTemplatePage.disable')}>
                        <ActionIcon color="red" variant="subtle" onClick={() => disableMutation.mutate(template.id)}>
                          <IconTrash size={17} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {(templates.data ?? []).length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed" ta="center" py="xl">
                      {t('promptTemplatePage.empty')}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Modal
        opened={opened}
        onClose={close}
        title={editing ? t('promptTemplatePage.editTemplate') : t('promptTemplatePage.newTemplate')}
        size="lg"
      >
        <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
          <Stack>
            <Select
              label={t('promptTemplatePage.tenant')}
              data={tenantOptions}
              disabled={!canSelectTenant}
              required
              {...form.getInputProps('tenantId')}
            />
            <TextInput label={t('code')} required {...form.getInputProps('templateCode')} />
            <TextInput label={t('name')} required {...form.getInputProps('templateName')} />
            <TextInput label={t('promptTemplatePage.descriptionLabel')} {...form.getInputProps('description')} />
            <Select
              label={t('status')}
              data={[
                { value: 'DRAFT', label: formatStatus('DRAFT') },
                { value: 'PUBLISHED', label: formatStatus('PUBLISHED') },
                { value: 'DISABLED', label: formatStatus('DISABLED') },
              ]}
              {...form.getInputProps('status')}
            />
            <Textarea label={t('promptTemplatePage.content')} minRows={8} autosize required {...form.getInputProps('content')} />
            <Group justify="flex-end">
              <Button color="dark" type="submit" loading={saveMutation.isPending}>
                {t('save')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={versionOpened} onClose={versionModal.close} title={t('promptTemplatePage.versionHistory')} size="lg">
        <Stack>
          {versions.map((version) => (
            <Card key={version.id} p="md" withBorder>
              <Group justify="space-between">
                <Text fw={700}>v{version.versionNo}</Text>
                <Badge variant="light">{formatStatus(version.status)}</Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {version.publishedAt}
              </Text>
              <Text mt="sm" lineClamp={4}>
                {version.content}
              </Text>
            </Card>
          ))}
          {versions.length === 0 && <Text c="dimmed">{t('promptTemplatePage.noVersions')}</Text>}
        </Stack>
      </Modal>
    </Stack>
  );
}

export default PromptTemplatePage;
