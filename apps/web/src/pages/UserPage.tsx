import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Modal,
  MultiSelect,
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
import type { TenantUser } from '../api/types';

const assignableRoles = ['TENANT_ADMIN', 'DEVELOPER', 'FINANCE', 'VIEWER'];

export default function UserPage() {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const [resetOpened, { open: openReset, close: closeReset }] = useDisclosure(false);
  const [resetTarget, setResetTarget] = useState<TenantUser | null>(null);
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
  const roleOptions = useMemo(
    () => assignableRoles.map((role) => ({ value: role, label: t(`roles.${role}`) })),
    [t],
  );
  const form = useForm({
    initialValues: {
      username: '',
      password: '',
      displayName: '',
      email: '',
      phone: '',
      roleCodes: ['TENANT_ADMIN'],
    },
    validate: {
      roleCodes: (value) => (value.length > 0 ? null : t('userPage.roleRequired')),
    },
  });
  const resetPasswordForm = useForm({
    initialValues: {
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      newPassword: (value) => (value.length >= 8 ? null : t('userPage.passwordMinLength')),
      confirmPassword: (value, values) => (value === values.newPassword ? null : t('userPage.passwordMismatch')),
    },
  });
  const createMutation = useMutation({
    mutationFn: (values: typeof form.values) => userApi.create(selectedTenantId!, values),
    onSuccess: () => {
      notifications.show({
        color: 'teal',
        title: t('userPage.createdTitle'),
        message: t('userPage.createdMessage'),
      });
      queryClient.invalidateQueries({ queryKey: ['tenant-users', selectedTenantId] });
      form.reset();
      close();
    },
  });
  const resetPasswordMutation = useMutation({
    mutationFn: (values: typeof resetPasswordForm.values) =>
      userApi.resetPassword(selectedTenantId!, resetTarget!.id, { newPassword: values.newPassword }),
    onSuccess: () => {
      notifications.show({
        color: 'teal',
        title: t('userPage.passwordResetTitle'),
        message: t('userPage.passwordResetMessage'),
      });
      resetPasswordForm.reset();
      setResetTarget(null);
      closeReset();
    },
  });
  const users = usersQuery.data ?? [];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{t('users')}</Title>
          <Text c="dimmed" maw={640}>
            {t('userPage.description')}
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
            placeholder={t('userPage.selectTenant')}
            data={tenantOptions}
            value={tenantId ?? (selectedTenantId ? String(selectedTenantId) : null)}
            onChange={setTenantId}
            maw={420}
          />
          <Badge color="gray" variant="light" radius="sm">
            {t('userPage.userCount', { count: users.length })}
          </Badge>
        </Group>

        {!selectedTenantId ? (
          <Box p="xl" ta="center">
            <Text c="dimmed">{t('userPage.createFirstTenant')}</Text>
          </Box>
        ) : (
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
                      {t(`common.statusLabels.${user.status}`, { defaultValue: user.status })}
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
                    {user.email || t('userPage.emailUnset')}
                  </Text>
                </Group>
                <Group gap={6} visibleFrom="md">
                  <IconShieldCheck size={15} color="#9aa4b2" />
                  <Text size="sm" c="dimmed">
                    {user.roles?.map((role) => t(`roles.${role}`, { defaultValue: role })).join(', ') || t('roles.VIEWER')}
                  </Text>
                </Group>
                <Button
                  size="xs"
                  variant="light"
                  color="gray"
                  onClick={() => {
                    setResetTarget(user);
                    resetPasswordForm.reset();
                    openReset();
                  }}
                >
                  {t('userPage.resetPassword')}
                </Button>
              </Group>
            </Group>
          ))}
          {users.length === 0 && (
            <Box p="xl" ta="center">
              <Text c="dimmed">{t('userPage.empty')}</Text>
            </Box>
          )}
          </Stack>
        )}
      </Card>

      <Modal
        opened={opened}
        onClose={() => {
          close();
          form.reset();
        }}
        title={t('userPage.newUser')}
        centered
      >
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
          <Stack>
            <TextInput label={t('username')} required {...form.getInputProps('username')} />
            <PasswordInput label={t('password')} required {...form.getInputProps('password')} />
            <TextInput label={t('name')} required {...form.getInputProps('displayName')} />
            <TextInput label={t('email')} {...form.getInputProps('email')} />
            <TextInput label={t('phone')} {...form.getInputProps('phone')} />
            <MultiSelect
              label={t('userPage.role')}
              required
              data={roleOptions}
              {...form.getInputProps('roleCodes')}
            />
            <Button color="dark" type="submit" loading={createMutation.isPending}>
              {t('save')}
            </Button>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={resetOpened}
        onClose={() => {
          closeReset();
          resetPasswordForm.reset();
          setResetTarget(null);
        }}
        title={t('userPage.resetPasswordTitle', { username: resetTarget?.username ?? '' })}
        centered
      >
        <form onSubmit={resetPasswordForm.onSubmit((values) => resetPasswordMutation.mutate(values))}>
          <Stack>
            <PasswordInput label={t('profilePage.newPassword')} required {...resetPasswordForm.getInputProps('newPassword')} />
            <PasswordInput label={t('profilePage.confirmPassword')} required {...resetPasswordForm.getInputProps('confirmPassword')} />
            <Button color="dark" type="submit" loading={resetPasswordMutation.isPending}>
              {t('save')}
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
