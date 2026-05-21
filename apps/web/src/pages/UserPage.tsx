import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Modal,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconMail, IconPlus, IconShieldCheck } from '@tabler/icons-react';
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
  const selectedTenantId = tenantId ?? tenantsQuery.data?.[0]?.id;
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
  const users = usersQuery.data ?? [];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{t('users')}</Title>
          <Text c="dimmed" maw={640}>
            租户内成员、角色和访问入口，后续将承接 API Key 与审计日志。
          </Text>
        </Stack>
        <Button color="dark" leftSection={<IconPlus size={16} />} onClick={open} disabled={!selectedTenantId}>
          {t('create')}
        </Button>
      </Group>

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md" align="flex-end">
          <Select
            label={t('tenants')}
            placeholder="选择租户"
            data={tenantOptions}
            value={tenantId ?? (selectedTenantId ? String(selectedTenantId) : null)}
            onChange={setTenantId}
            maw={420}
          />
          <Badge color="gray" variant="light" radius="sm">
            {users.length} users
          </Badge>
        </Group>

        <Stack gap={0} className="subtle-list">
          {users.map((user) => (
            <Group key={user.id} className="list-row" p="md" justify="space-between" wrap="nowrap">
              <Group wrap="nowrap">
                <Avatar radius="sm" color="dark">
                  {user.displayName.slice(0, 1).toUpperCase()}
                </Avatar>
                <Box>
                  <Group gap="xs">
                    <Text fw={650}>{user.displayName}</Text>
                    <Badge color={user.status === 'ACTIVE' ? 'teal' : 'gray'} variant="light" radius="sm">
                      {user.status}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    @{user.username}
                  </Text>
                </Box>
              </Group>

              <Group gap="xl" wrap="nowrap">
                <Group gap={6} visibleFrom="sm">
                  <IconMail size={15} color="#9aa4b2" />
                  <Text size="sm" c="dimmed">
                    {user.email || '未设置邮箱'}
                  </Text>
                </Group>
                <Group gap={6} visibleFrom="md">
                  <IconShieldCheck size={15} color="#9aa4b2" />
                  <Text size="sm" c="dimmed">
                    {user.roles?.join(', ') || 'VIEWER'}
                  </Text>
                </Group>
              </Group>
            </Group>
          ))}
          {users.length === 0 && (
            <Box p="xl" ta="center">
              <Text c="dimmed">暂无用户。</Text>
            </Box>
          )}
        </Stack>
      </Card>

      <Modal opened={opened} onClose={close} title="新建用户" centered>
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
          <Stack>
            <TextInput label={t('username')} required {...form.getInputProps('username')} />
            <PasswordInput label={t('password')} required {...form.getInputProps('password')} />
            <TextInput label={t('name')} required {...form.getInputProps('displayName')} />
            <TextInput label={t('email')} {...form.getInputProps('email')} />
            <TextInput label={t('phone')} {...form.getInputProps('phone')} />
            <Button color="dark" type="submit" loading={createMutation.isPending}>
              {t('save')}
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
