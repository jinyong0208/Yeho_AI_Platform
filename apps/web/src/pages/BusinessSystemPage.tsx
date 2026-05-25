import { Badge, Button, Card, Group, Modal, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tenantApi, type BusinessSystem } from '../api/tenants';
import { useAuthStore } from '../store/useAuthStore';
import { resolvePrimaryRole, USER_ROLES } from '../utils/roles';

type TenantLite = {
  id: string;
  tenantCode: string;
  tenantName: string;
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

export default function BusinessSystemPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const canSelectTenant = primaryRole === USER_ROLES.SUPER_ADMIN;
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BusinessSystem | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const tenantsQuery = useQuery({ queryKey: ['tenants', 'business-systems'], queryFn: tenantApi.list, enabled: canSelectTenant });
  const tenants = canSelectTenant
    ? ((tenantsQuery.data ?? []) as TenantLite[])
    : user?.tenantId
      ? [{ id: user.tenantId, tenantName: t('apiKeyPage.currentTenant'), tenantCode: user.tenantId }]
      : [];
  const tenantOptions = tenants.map((tenant) => ({
    value: String(tenant.id),
    label: `${tenant.tenantName} / ${tenant.tenantCode}`,
  }));

  useEffect(() => {
    if (!tenantId && tenants.length > 0) {
      setTenantId(tenants[0].id);
    }
  }, [tenantId, tenants]);

  const systemsQuery = useQuery({
    queryKey: ['business-systems', tenantId],
    queryFn: () => tenantApi.businessSystems(tenantId as string),
    enabled: Boolean(tenantId),
  });

  const form = useForm({
    initialValues: {
      systemCode: '',
      systemName: '',
      description: '',
      status: 'ACTIVE',
    },
    validate: {
      systemCode: (value) => (value.trim() ? null : t('businessSystemPage.required')),
      systemName: (value) => (value.trim() ? null : t('businessSystemPage.required')),
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: typeof form.values) =>
      editing
        ? tenantApi.updateBusinessSystem(tenantId as string, editing.id, values)
        : tenantApi.createBusinessSystem(tenantId as string, values),
    onSuccess: () => {
      notifications.show({
        color: 'teal',
        title: t('businessSystemPage.savedTitle'),
        message: t('businessSystemPage.savedMessage'),
      });
      close();
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['business-systems', tenantId] });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: t('businessSystemPage.saveFailedTitle'),
        message: getApiErrorMessage(error, t('businessSystemPage.saveFailedMessage')),
      });
    },
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => tenantApi.disableBusinessSystem(tenantId as string, id),
    onSuccess: () => {
      notifications.show({
        color: 'gray',
        title: t('businessSystemPage.disabledTitle'),
        message: t('businessSystemPage.disabledMessage'),
      });
      queryClient.invalidateQueries({ queryKey: ['business-systems', tenantId] });
    },
  });

  const openEditor = (system?: BusinessSystem) => {
    setEditing(system ?? null);
    form.setValues({
      systemCode: system?.systemCode ?? '',
      systemName: system?.systemName ?? '',
      description: system?.description ?? '',
      status: system?.status ?? 'ACTIVE',
    });
    open();
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{t('businessSystemPage.title')}</Title>
          <Text c="dimmed" maw={760}>
            {t('businessSystemPage.description')}
          </Text>
        </Stack>
        <Group>
          <Select
            placeholder={t('businessSystemPage.tenant')}
            data={tenantOptions}
            value={tenantId}
            onChange={setTenantId}
            clearable
            disabled={!canSelectTenant}
          />
          <Button color="dark" leftSection={<IconPlus size={16} />} disabled={!tenantId} onClick={() => openEditor()}>
            {t('businessSystemPage.create')}
          </Button>
        </Group>
      </Group>

      <Card className="surface-card" p="lg">
        <Table.ScrollContainer minWidth={760}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('businessSystemPage.systemCode')}</Table.Th>
                <Table.Th>{t('businessSystemPage.systemName')}</Table.Th>
                <Table.Th>{t('businessSystemPage.descriptionLabel')}</Table.Th>
                <Table.Th>{t('status')}</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(systemsQuery.data ?? []).map((system) => (
                <Table.Tr key={system.id}>
                  <Table.Td>
                    <Text fw={700}>{system.systemCode}</Text>
                  </Table.Td>
                  <Table.Td>{system.systemName}</Table.Td>
                  <Table.Td>{system.description || '-'}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={system.status === 'ACTIVE' ? 'green' : 'gray'}>
                      {t(`businessSystemPage.status.${system.status}`, { defaultValue: system.status })}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group justify="flex-end">
                      <Button size="xs" variant="light" onClick={() => openEditor(system)}>
                        {t('businessSystemPage.edit')}
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        variant="subtle"
                        disabled={system.status !== 'ACTIVE'}
                        onClick={() => disableMutation.mutate(system.id)}
                      >
                        {t('businessSystemPage.disable')}
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {(systemsQuery.data ?? []).length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed" ta="center" py="xl">
                      {t('businessSystemPage.empty')}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Modal opened={opened} onClose={close} title={editing ? t('businessSystemPage.editTitle') : t('businessSystemPage.createTitle')} centered>
        <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
          <Stack>
            <TextInput label={t('businessSystemPage.systemCode')} required {...form.getInputProps('systemCode')} />
            <TextInput label={t('businessSystemPage.systemName')} required {...form.getInputProps('systemName')} />
            <TextInput label={t('businessSystemPage.descriptionLabel')} {...form.getInputProps('description')} />
            <Select
              label={t('status')}
              data={[
                { value: 'ACTIVE', label: t('businessSystemPage.status.ACTIVE') },
                { value: 'DISABLED', label: t('businessSystemPage.status.DISABLED') },
              ]}
              {...form.getInputProps('status')}
            />
            <Text size="xs" c="dimmed">
              {t('businessSystemPage.boundaryNote')}
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
