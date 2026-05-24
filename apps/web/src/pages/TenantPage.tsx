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
      notifications.show({ color: 'teal', title: t('tenantPage.createdTitle'), message: t('tenantPage.createdMessage') });
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
      notifications.show({ color: 'teal', title: t('rateLimitPage.savedTitle'), message: t('rateLimitPage.savedMessage') });
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
            {t('tenantPage.description')}
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
              {t('tenantPage.listTitle')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('tenantPage.listDescription')}
            </Text>
          </Stack>
          <Badge color="gray" variant="light" radius="sm">
            {t('tenantPage.total', { count: tenants.length })}
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
                      {t(`common.statusLabels.${tenant.status}`, { defaultValue: tenant.status })}
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
                    {tenant.contactEmail || t('tenantPage.emailUnset')}
                  </Text>
                </Group>
                <Group gap={6} visibleFrom="md">
                  <IconPhone size={15} color="#9aa4b2" />
                  <Text size="sm" c="dimmed">
                    {tenant.contactPhone || t('tenantPage.phoneUnset')}
                  </Text>
                </Group>
                <Tooltip label={t('tenantPage.rateLimit')}>
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    aria-label={t('tenantPage.configureLimitAria')}
                    onClick={() => openLimitModal(tenant)}
                  >
                    <IconGauge size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={t('tenantPage.delete')}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={t('tenantPage.deleteAria')}
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
              <Text c="dimmed">{t('tenantPage.empty')}</Text>
            </Box>
          )}
        </Stack>
      </Card>

      <Modal opened={opened} onClose={close} title={t('tenantPage.newTenant')} centered>
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
        title={t('tenantPage.rateLimitTitle', { suffix: selectedTenant ? ` · ${selectedTenant.tenantName}` : '' })}
        centered
      >
        <form onSubmit={limitForm.onSubmit((values) => updateLimitMutation.mutate(values))}>
          <Stack>
            <NumberInput label={t('rateLimitPage.fields.rpmLimit')} min={0} {...limitForm.getInputProps('rpmLimit')} />
            <NumberInput label={t('rateLimitPage.fields.tpmLimit')} min={0} {...limitForm.getInputProps('tpmLimit')} />
            <NumberInput label={t('rateLimitPage.fields.dailyCreditsLimit')} min={0} {...limitForm.getInputProps('dailyCreditsLimit')} />
            <NumberInput label={t('rateLimitPage.fields.maxConcurrent')} min={0} {...limitForm.getInputProps('maxConcurrent')} />
            <Button color="dark" type="submit" loading={updateLimitMutation.isPending} disabled={!selectedTenant}>
              {t('tenantPage.saveRateLimit')}
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
