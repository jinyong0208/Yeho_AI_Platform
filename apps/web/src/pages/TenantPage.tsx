import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Modal,
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
import { IconBuildingCommunity, IconMail, IconPhone, IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { tenantApi } from '../api/tenants';

export default function TenantPage() {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const queryClient = useQueryClient();
  const form = useForm({
    initialValues: {
      tenantCode: '',
      tenantName: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
    },
  });
  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantApi.list,
  });
  const createMutation = useMutation({
    mutationFn: tenantApi.create,
    onSuccess: () => {
      notifications.show({ color: 'teal', title: '已创建', message: '租户已创建。' });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      close();
      form.reset();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: tenantApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });
  const tenants = tenantsQuery.data ?? [];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{t('tenants')}</Title>
          <Text c="dimmed" maw={640}>
            管理企业工作区边界，后续模型、钱包和 API Key 都会绑定到租户。
          </Text>
        </Stack>
        <Button color="dark" leftSection={<IconPlus size={16} />} onClick={open}>
          {t('create')}
        </Button>
      </Group>

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Stack gap={2}>
            <Text size="sm" fw={650}>
              Workspace tenants
            </Text>
            <Text size="xs" c="dimmed">
              轻量列表视图，避免传统后台重表格。
            </Text>
          </Stack>
          <Badge color="gray" variant="light" radius="sm">
            {tenants.length} total
          </Badge>
        </Group>

        <Stack gap={0} className="subtle-list">
          {tenants.map((tenant) => (
            <Group key={tenant.id} className="list-row" p="md" justify="space-between" wrap="nowrap">
              <Group wrap="nowrap" maw="60%">
                <ThemeIcon color="teal" variant="light" radius="sm" size={38}>
                  <IconBuildingCommunity size={20} />
                </ThemeIcon>
                <Box>
                  <Group gap="xs">
                    <Text fw={650}>{tenant.tenantName}</Text>
                    <Badge color={tenant.status === 'ACTIVE' ? 'teal' : 'gray'} variant="light" radius="sm">
                      {tenant.status}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {tenant.tenantCode}
                  </Text>
                </Box>
              </Group>

              <Group gap="xl" wrap="nowrap">
                <Group gap={6} visibleFrom="sm">
                  <IconMail size={15} color="#9aa4b2" />
                  <Text size="sm" c="dimmed">
                    {tenant.contactEmail || '未设置邮箱'}
                  </Text>
                </Group>
                <Group gap={6} visibleFrom="md">
                  <IconPhone size={15} color="#9aa4b2" />
                  <Text size="sm" c="dimmed">
                    {tenant.contactPhone || '未设置电话'}
                  </Text>
                </Group>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label="Delete tenant"
                  loading={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(tenant.id)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Group>
          ))}
          {tenants.length === 0 && (
            <Box p="xl" ta="center">
              <Text c="dimmed">暂无租户。</Text>
            </Box>
          )}
        </Stack>
      </Card>

      <Modal opened={opened} onClose={close} title="新建租户" centered>
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
          <Stack>
            <TextInput label={t('code')} required {...form.getInputProps('tenantCode')} />
            <TextInput label={t('name')} required {...form.getInputProps('tenantName')} />
            <TextInput label={t('contact')} {...form.getInputProps('contactName')} />
            <TextInput label={t('phone')} {...form.getInputProps('contactPhone')} />
            <TextInput label={t('email')} {...form.getInputProps('contactEmail')} />
            <Button color="dark" type="submit" loading={createMutation.isPending}>
              {t('save')}
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
