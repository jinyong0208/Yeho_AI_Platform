import {
  Button,
  Card,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  PasswordInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconPlus } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tenantApi } from '../api/tenants';
import { userApi } from '../api/users';

export default function UserPage() {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const tenantsQuery = useQuery({ queryKey: ['tenants'], queryFn: tenantApi.list });
  const selectedTenantId = tenantId ? Number(tenantId) : tenantsQuery.data?.[0]?.id;
  const usersQuery = useQuery({
    queryKey: ['tenant-users', selectedTenantId],
    queryFn: () => userApi.list(selectedTenantId!),
    enabled: Boolean(selectedTenantId),
  });
  const tenantOptions = useMemo(
    () =>
      (tenantsQuery.data ?? []).map((tenant) => ({
        value: String(tenant.id),
        label: `${tenant.tenantName} (${tenant.tenantCode})`,
      })),
    [tenantsQuery.data],
  );
  const form = useForm({
    initialValues: {
      username: '',
      password: '',
      displayName: '',
      email: '',
      phone: '',
    },
  });
  const createMutation = useMutation({
    mutationFn: (values: typeof form.values) =>
      userApi.create(selectedTenantId!, { ...values, roleCodes: ['VIEWER'] }),
    onSuccess: () => {
      notifications.show({ color: 'teal', title: '已创建', message: '用户已创建。' });
      queryClient.invalidateQueries({ queryKey: ['tenant-users', selectedTenantId] });
      form.reset();
      close();
    },
  });

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap={2}>
          <Title order={2}>{t('users')}</Title>
          <Text c="dimmed">按租户隔离的用户基础维护。</Text>
        </Stack>
        <Button leftSection={<IconPlus size={16} />} onClick={open} disabled={!selectedTenantId}>
          {t('create')}
        </Button>
      </Group>

      <Select
        label={t('tenants')}
        placeholder="选择租户"
        data={tenantOptions}
        value={tenantId ?? (selectedTenantId ? String(selectedTenantId) : null)}
        onChange={setTenantId}
        maw={420}
      />

      <Card p={0}>
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('username')}</Table.Th>
              <Table.Th>{t('name')}</Table.Th>
              <Table.Th>{t('email')}</Table.Th>
              <Table.Th>{t('phone')}</Table.Th>
              <Table.Th>{t('status')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(usersQuery.data ?? []).map((user) => (
              <Table.Tr key={user.id}>
                <Table.Td>{user.username}</Table.Td>
                <Table.Td>{user.displayName}</Table.Td>
                <Table.Td>{user.email || '-'}</Table.Td>
                <Table.Td>{user.phone || '-'}</Table.Td>
                <Table.Td>{user.status}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal opened={opened} onClose={close} title="新建用户">
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
          <Stack>
            <TextInput label={t('username')} required {...form.getInputProps('username')} />
            <PasswordInput label={t('password')} required {...form.getInputProps('password')} />
            <TextInput label={t('name')} required {...form.getInputProps('displayName')} />
            <TextInput label={t('email')} {...form.getInputProps('email')} />
            <TextInput label={t('phone')} {...form.getInputProps('phone')} />
            <Button type="submit" loading={createMutation.isPending}>
              {t('save')}
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
