import { Alert, Badge, Button, Card, Group, NumberInput, Select, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconAdjustmentsHorizontal, IconCoins, IconGauge, IconShieldCheck, IconUsers } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gatewayApi, type RateLimitPayload } from '../api/gateway';
import { tenantApi } from '../api/tenants';
import { useAuthStore } from '../store/useAuthStore';
import { resolvePrimaryRole, USER_ROLES } from '../utils/roles';

type LimitFormValues = {
  rpmLimit: number | null;
  tpmLimit: number | null;
  dailyCreditsLimit: number | null;
  maxConcurrent: number | null;
  status: string;
};

const emptyValues: LimitFormValues = {
  rpmLimit: null,
  tpmLimit: null,
  dailyCreditsLimit: null,
  maxConcurrent: null,
  status: 'ACTIVE',
};

export default function RateLimitPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const canSelectTenant = primaryRole === USER_ROLES.SUPER_ADMIN;
  const queryClient = useQueryClient();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const tenantsQuery = useQuery({ queryKey: ['tenants', 'rate-limits'], queryFn: tenantApi.list, enabled: canSelectTenant });
  const tenants = canSelectTenant
    ? (tenantsQuery.data ?? [])
    : user?.tenantId
      ? [{ id: user.tenantId, tenantName: t('walletPage.currentTenant'), tenantCode: user.tenantId }]
      : [];
  const form = useForm<LimitFormValues>({ initialValues: emptyValues });

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [selectedTenantId, tenants]);

  const limitQuery = useQuery({
    queryKey: ['tenant-rate-limit', selectedTenantId],
    queryFn: () => gatewayApi.tenantRateLimit(selectedTenantId as string),
    enabled: Boolean(selectedTenantId),
  });

  useEffect(() => {
    if (!selectedTenantId) {
      form.setValues(emptyValues);
      return;
    }
    const limit = limitQuery.data;
    form.setValues({
      rpmLimit: limit?.rpmLimit ?? null,
      tpmLimit: limit?.tpmLimit ?? null,
      dailyCreditsLimit: limit?.dailyCreditsLimit ?? null,
      maxConcurrent: limit?.maxConcurrent ?? null,
      status: limit?.status ?? 'ACTIVE',
    });
  }, [limitQuery.data, selectedTenantId]);

  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
  const limits = useMemo(
    () => [
      {
        icon: <IconGauge size={18} />,
        label: t('rateLimitPage.fields.rpmLimit'),
        value: form.values.rpmLimit ?? t('rateLimitPage.unlimited'),
      },
      {
        icon: <IconAdjustmentsHorizontal size={18} />,
        label: t('rateLimitPage.fields.tpmLimit'),
        value: form.values.tpmLimit ?? t('rateLimitPage.unlimited'),
      },
      {
        icon: <IconCoins size={18} />,
        label: t('rateLimitPage.fields.dailyCreditsLimit'),
        value: form.values.dailyCreditsLimit ?? t('rateLimitPage.unlimited'),
      },
      {
        icon: <IconUsers size={18} />,
        label: t('rateLimitPage.fields.maxConcurrent'),
        value: form.values.maxConcurrent ?? t('rateLimitPage.unlimited'),
      },
    ],
    [form.values, t],
  );

  const updateMutation = useMutation({
    mutationFn: (values: LimitFormValues) => {
      const payload: RateLimitPayload = {
        rpmLimit: values.rpmLimit,
        tpmLimit: values.tpmLimit,
        dailyCreditsLimit: values.dailyCreditsLimit,
        maxConcurrent: values.maxConcurrent,
        status: values.status,
      };
      return gatewayApi.updateTenantRateLimit(selectedTenantId as string, payload);
    },
    onSuccess: () => {
      notifications.show({
        color: 'teal',
        title: t('rateLimitPage.savedTitle'),
        message: t('rateLimitPage.savedMessage'),
      });
      queryClient.invalidateQueries({ queryKey: ['tenant-rate-limit', selectedTenantId] });
    },
  });

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Group gap="sm">
            <ThemeIcon variant="light" radius="md" size="lg" color="blue">
              <IconShieldCheck size={20} />
            </ThemeIcon>
            <Title order={2}>{t('rateLimitPage.title')}</Title>
          </Group>
          <Text c="dimmed" size="sm" maw={760}>
            {t('rateLimitPage.description')}
          </Text>
        </Stack>
        <Badge color={form.values.status === 'ACTIVE' ? 'teal' : 'gray'} variant="light" radius="sm">
          {t(`common.statusLabels.${form.values.status}`, { defaultValue: form.values.status })}
        </Badge>
      </Group>

      <Card className="surface-card" p="lg">
        <Select
          label={t('rateLimitPage.tenant')}
          maw={420}
          value={selectedTenantId}
          onChange={setSelectedTenantId}
          disabled={!canSelectTenant}
          data={tenants.map((tenant) => ({
            value: tenant.id,
            label: `${tenant.tenantName} · ${tenant.tenantCode}`,
          }))}
        />
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {limits.map((limit) => (
          <Card key={limit.label} className="soft-card" p="md">
            <Group justify="space-between" align="flex-start">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  {limit.label}
                </Text>
                <Text fw={750} size="xl">
                  {limit.value}
                </Text>
              </Stack>
              <ThemeIcon color="blue" variant="light" radius="sm">
                {limit.icon}
              </ThemeIcon>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {limitQuery.isError && <Alert color="red">{(limitQuery.error as Error).message}</Alert>}

      <Card className="surface-card" p="lg">
        <form onSubmit={form.onSubmit((values) => updateMutation.mutate(values))}>
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Stack gap={2}>
                <Text fw={700}>{t('rateLimitPage.tenantPolicy')}</Text>
                <Text size="sm" c="dimmed">
                  {selectedTenant
                    ? t('rateLimitPage.tenantPolicyFor', {
                        tenant: `${selectedTenant.tenantName} · ${selectedTenant.tenantCode}`,
                      })
                    : t('rateLimitPage.selectTenantFirst')}
                </Text>
              </Stack>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <NumberInput label={t('rateLimitPage.fields.rpmLimit')} min={0} {...form.getInputProps('rpmLimit')} />
              <NumberInput label={t('rateLimitPage.fields.tpmLimit')} min={0} {...form.getInputProps('tpmLimit')} />
              <NumberInput
                label={t('rateLimitPage.fields.dailyCreditsLimit')}
                min={0}
                {...form.getInputProps('dailyCreditsLimit')}
              />
              <NumberInput label={t('rateLimitPage.fields.maxConcurrent')} min={0} {...form.getInputProps('maxConcurrent')} />
              <Select
                label={t('status')}
                data={[
                  { value: 'ACTIVE', label: t('rateLimitPage.status.active') },
                  { value: 'DISABLED', label: t('rateLimitPage.status.disabled') },
                ]}
                {...form.getInputProps('status')}
              />
            </SimpleGrid>
            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                {t('rateLimitPage.apiKeyHint')}
              </Text>
              <Button color="dark" type="submit" loading={updateMutation.isPending} disabled={!selectedTenantId}>
                {t('rateLimitPage.savePolicy')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
