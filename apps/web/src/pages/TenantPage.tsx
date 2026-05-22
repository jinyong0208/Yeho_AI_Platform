import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconBuildingCommunity, IconGauge, IconMail, IconPhone, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gatewayApi } from '../api/gateway';
import { tenantApi } from '../api/tenants';

export default function TenantPage() {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const [limitOpened, { open: openLimit, close: closeLimit }] = useDisclosure(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
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
  const limitForm = useForm({
    initialValues: {
      rpmLimit: null as number | null,
      tpmLimit: null as number | null,
      dailyCreditsLimit: null as number | null,
      maxConcurrent: null as number | null,
    },
  });
  const updateLimitMutation = useMutation({
    mutationFn: (values: typeof limitForm.values) =>
      gatewayApi.updateTenantRateLimit(selectedTenant.id, { ...values, status: 'ACTIVE' }),
    onSuccess: () => {
      notifications.show({ color: 'teal', title: '限流已保存', message: '租户限流配置已更新。' });
      closeLimit();
      setSelectedTenant(null);
    },
  });
  const tenants = tenantsQuery.data ?? [];

  const openLimitModal = async (tenant: any) => {
    setSelectedTenant(tenant);
    const limit = await gatewayApi.tenantRateLimit(tenant.id);
    limitForm.setValues({
      rpmLimit: limit?.rpmLimit ?? null,
      tpmLimit: limit?.tpmLimit ?? null,
      dailyCreditsLimit: limit?.dailyCreditsLimit ?? null,
      maxConcurrent: limit?.maxConcurrent ?? null,
    });
    openLimit();
  };

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
                <Tooltip label="租户限流">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    aria-label="Configure tenant rate limit"
                    onClick={() => openLimitModal(tenant)}
                  >
                    <IconGauge size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="删除">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label="Delete tenant"
                    loading={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(tenant.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
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

      <Modal
        opened={limitOpened}
        onClose={() => {
          closeLimit();
          setSelectedTenant(null);
        }}
        title={`租户限流${selectedTenant ? ` · ${selectedTenant.tenantName}` : ''}`}
        centered
      >
        <form onSubmit={limitForm.onSubmit((values) => updateLimitMutation.mutate(values))}>
          <Stack>
            <NumberInput label="RPM 每分钟请求数" min={0} {...limitForm.getInputProps('rpmLimit')} />
            <NumberInput label="TPM 每分钟 Token" min={0} {...limitForm.getInputProps('tpmLimit')} />
            <NumberInput label="Daily Credits 每日额度" min={0} {...limitForm.getInputProps('dailyCreditsLimit')} />
            <NumberInput label="Max Concurrent 最大并发" min={0} {...limitForm.getInputProps('maxConcurrent')} />
            <Button color="dark" type="submit" loading={updateLimitMutation.isPending} disabled={!selectedTenant}>
              保存限流
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
