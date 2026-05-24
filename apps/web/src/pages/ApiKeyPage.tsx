import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconChartHistogram,
  IconCircleCheck,
  IconCircleOff,
  IconGauge,
  IconKey,
  IconPlus,
  IconShieldCheck,
  IconTrash,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gatewayApi, type ApiKeyUsageSummary, type TenantApiKeyCreated, type TenantApiKeyResponse } from '../api/gateway';
import { tenantApi } from '../api/tenants';
import { useAuthStore } from '../store/useAuthStore';
import { resolvePrimaryRole, USER_ROLES } from '../utils/roles';

type TenantLite = {
  id: string;
  tenantName: string;
  tenantCode: string;
};

const scopeOptions = [
  { value: 'chat:completion', label: 'chat:completion' },
  { value: 'embedding:create', label: 'embedding:create' },
  { value: 'models:read', label: 'models:read' },
  { value: 'billing:read', label: 'billing:read' },
  { value: 'usage:read', label: 'usage:read' },
  { value: 'provider:test', label: 'provider:test' },
  { value: 'admin:*', label: 'admin:*' },
];

const splitCsv = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const joinCodes = (values?: string[]) => (values && values.length > 0 ? values.join(', ') : '');

export default function ApiKeyPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const canSelectTenant = primaryRole === USER_ROLES.SUPER_ADMIN;
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<TenantApiKeyCreated | null>(null);
  const [selectedApiKey, setSelectedApiKey] = useState<TenantApiKeyResponse | null>(null);
  const [usageSummary, setUsageSummary] = useState<ApiKeyUsageSummary | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [limitOpened, { open: openLimit, close: closeLimit }] = useDisclosure(false);
  const [usageOpened, { open: openUsage, close: closeUsage }] = useDisclosure(false);
  const [scopeOpened, { open: openScope, close: closeScope }] = useDisclosure(false);
  const queryClient = useQueryClient();
  const tenantsQuery = useQuery({ queryKey: ['tenants', 'api-keys'], queryFn: tenantApi.list, enabled: canSelectTenant });
  const tenants = canSelectTenant
    ? ((tenantsQuery.data ?? []) as TenantLite[])
    : user?.tenantId
      ? [{ id: user.tenantId, tenantName: t('apiKeyPage.currentTenant'), tenantCode: user.tenantId }]
      : [];
  const apiKeysQuery = useQuery({
    queryKey: ['api-keys', selectedTenantId],
    queryFn: () => gatewayApi.apiKeys(selectedTenantId as string),
    enabled: Boolean(selectedTenantId),
  });
  const form = useForm({
    initialValues: {
      name: '',
      scopes: ['chat:completion'] as string[],
      allowedSystemCodes: '',
      allowedDataDomains: '',
    },
  });
  const limitForm = useForm({
    initialValues: {
      rpmLimit: null as number | null,
      tpmLimit: null as number | null,
      dailyCreditsLimit: null as number | null,
      maxConcurrent: null as number | null,
    },
  });
  const scopeForm = useForm({
    initialValues: {
      scopes: [] as string[],
      allowedSystemCodes: '',
      allowedDataDomains: '',
    },
  });

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [selectedTenantId, tenants]);

  const createMutation = useMutation({
    mutationFn: (values: typeof form.values) =>
      gatewayApi.createApiKey(selectedTenantId as string, {
        name: values.name,
        scopes: values.scopes,
        allowedSystemCodes: splitCsv(values.allowedSystemCodes),
        allowedDataDomains: splitCsv(values.allowedDataDomains),
      }),
    onSuccess: (apiKey) => {
      setCreatedKey(apiKey);
      notifications.show({ color: 'teal', title: t('apiKeyPage.createdTitle'), message: t('apiKeyPage.createdMessage') });
      queryClient.invalidateQueries({ queryKey: ['api-keys', selectedTenantId] });
      form.reset();
    },
  });
  const revokeMutation = useMutation({
    mutationFn: (id: string) => gatewayApi.revokeApiKey(selectedTenantId as string, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys', selectedTenantId] }),
  });
  const disableMutation = useMutation({
    mutationFn: gatewayApi.disableApiKey,
    onSuccess: () => {
      notifications.show({ color: 'teal', title: t('apiKeyPage.disabledTitle'), message: t('apiKeyPage.disabledMessage') });
      queryClient.invalidateQueries({ queryKey: ['api-keys', selectedTenantId] });
    },
  });
  const enableMutation = useMutation({
    mutationFn: gatewayApi.enableApiKey,
    onSuccess: () => {
      notifications.show({ color: 'teal', title: t('apiKeyPage.enabledTitle'), message: t('apiKeyPage.enabledMessage') });
      queryClient.invalidateQueries({ queryKey: ['api-keys', selectedTenantId] });
    },
  });
  const usageMutation = useMutation({
    mutationFn: (id: string) => gatewayApi.apiKeyUsageSummary(id, 30),
    onSuccess: (summary) => {
      setUsageSummary(summary);
      openUsage();
    },
  });
  const updateLimitMutation = useMutation({
    mutationFn: (values: typeof limitForm.values) =>
      gatewayApi.updateApiKeyRateLimit(selectedTenantId as string, selectedApiKey?.id as string, { ...values, status: 'ACTIVE' }),
    onSuccess: () => {
      notifications.show({ color: 'teal', title: t('apiKeyPage.limitSavedTitle'), message: t('apiKeyPage.limitSavedMessage') });
      closeLimit();
      setSelectedApiKey(null);
    },
  });
  const updateScopeMutation = useMutation({
    mutationFn: (values: typeof scopeForm.values) =>
      gatewayApi.updateApiKeyScopes(selectedTenantId as string, selectedApiKey?.id as string, {
        scopes: values.scopes,
        allowedSystemCodes: splitCsv(values.allowedSystemCodes),
        allowedDataDomains: splitCsv(values.allowedDataDomains),
      }),
    onSuccess: () => {
      notifications.show({ color: 'teal', title: t('apiKeyPage.scopeSavedTitle'), message: t('apiKeyPage.scopeSavedMessage') });
      queryClient.invalidateQueries({ queryKey: ['api-keys', selectedTenantId] });
      closeScope();
      setSelectedApiKey(null);
      scopeForm.reset();
    },
  });
  const apiKeys = apiKeysQuery.data ?? [];

  const openLimitModal = async (apiKey: TenantApiKeyResponse) => {
    setSelectedApiKey(apiKey);
    const limit = selectedTenantId ? await gatewayApi.apiKeyRateLimit(selectedTenantId, apiKey.id) : null;
    limitForm.setValues({
      rpmLimit: limit?.rpmLimit ?? null,
      tpmLimit: limit?.tpmLimit ?? null,
      dailyCreditsLimit: limit?.dailyCreditsLimit ?? null,
      maxConcurrent: limit?.maxConcurrent ?? null,
    });
    openLimit();
  };

  const openScopeModal = (apiKey: TenantApiKeyResponse) => {
    setSelectedApiKey(apiKey);
    scopeForm.setValues({
      scopes: apiKey.scopes ?? [],
      allowedSystemCodes: joinCodes(apiKey.allowedSystemCodes),
      allowedDataDomains: joinCodes(apiKey.allowedDataDomains),
    });
    openScope();
  };

  const openDisableConfirm = (apiKey: TenantApiKeyResponse) => {
    modals.openConfirmModal({
      title: t('apiKeyPage.disableConfirmTitle'),
      centered: true,
      children: <Text size="sm">{t('apiKeyPage.disableConfirmBody')}</Text>,
      labels: { confirm: t('apiKeyPage.disable'), cancel: t('apiKeyPage.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () => disableMutation.mutate(apiKey.id),
    });
  };

  const openEnableConfirm = (apiKey: TenantApiKeyResponse) => {
    modals.openConfirmModal({
      title: t('apiKeyPage.enableConfirmTitle'),
      centered: true,
      children: <Text size="sm">{t('apiKeyPage.enableConfirmBody')}</Text>,
      labels: { confirm: t('apiKeyPage.enable'), cancel: t('apiKeyPage.cancel') },
      confirmProps: { color: 'teal' },
      onConfirm: () => enableMutation.mutate(apiKey.id),
    });
  };

  const openRevokeConfirm = (apiKey: TenantApiKeyResponse) => {
    modals.openConfirmModal({
      title: t('apiKeyPage.revokeConfirmTitle'),
      centered: true,
      children: <Text size="sm">{t('apiKeyPage.revokeConfirmBody')}</Text>,
      labels: { confirm: t('apiKeyPage.revoke'), cancel: t('apiKeyPage.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () => revokeMutation.mutate(apiKey.id),
    });
  };

  const readSummaryNumber = (key: string) => Number(usageSummary?.summary?.[key] ?? 0);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{canSelectTenant ? t('apiKeyPage.scopeTitle') : t('apiKeyPage.title')}</Title>
          <Text c="dimmed" maw={680}>
            {t('apiKeyPage.description')}
          </Text>
        </Stack>
        <Button color="dark" leftSection={<IconPlus size={16} />} onClick={open} disabled={!selectedTenantId}>
          {t('apiKeyPage.createKey')}
        </Button>
      </Group>

      <Card className="surface-card" p="lg">
        <Select
          label={t('apiKeyPage.tenant')}
          maw={360}
          value={selectedTenantId}
          onChange={setSelectedTenantId}
          disabled={!canSelectTenant}
          data={tenants.map((tenant) => ({
            value: tenant.id,
            label: `${tenant.tenantName} · ${tenant.tenantCode}`,
          }))}
        />
      </Card>

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={650}>
            {t('apiKeyPage.listTitle')}
          </Text>
          <Badge color="gray" variant="light" radius="sm">
            {t('apiKeyPage.total', { count: apiKeys.length })}
          </Badge>
        </Group>
        <Stack gap={0} className="subtle-list">
          {apiKeys.map((apiKey) => (
            <Group key={apiKey.id} className="list-row" p="md" justify="space-between" wrap="nowrap">
              <Group wrap="nowrap">
                <ThemeIcon color="yellow" variant="light" radius="sm" size={38}>
                  <IconKey size={20} />
                </ThemeIcon>
                <Box>
                  <Group gap="xs">
                    <Text fw={650}>{apiKey.name}</Text>
                    <Badge color={apiKey.status === 'ACTIVE' ? 'teal' : 'gray'} variant="light" radius="sm">
                      {t(`common.statusLabels.${apiKey.status}`, { defaultValue: apiKey.status })}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {apiKey.apiKeyPrefix} · {t('apiKeyPage.lastUsed')} {apiKey.lastUsedAt || t('apiKeyPage.never')}
                  </Text>
                  <Group gap={4} mt={4}>
                    {(apiKey.scopes ?? []).map((scope: string) => (
                      <Badge key={scope} color="gray" variant="light" radius="sm">
                        {scope}
                      </Badge>
                    ))}
                    {(apiKey.allowedSystemCodes ?? []).map((systemCode: string) => (
                      <Badge key={`system-${systemCode}`} color="blue" variant="light" radius="sm">
                        {t('apiKeyPage.systemCodeBadge', { code: systemCode })}
                      </Badge>
                    ))}
                    {(apiKey.allowedDataDomains ?? []).map((dataDomain: string) => (
                      <Badge key={`domain-${dataDomain}`} color="violet" variant="light" radius="sm">
                        {t('apiKeyPage.dataDomainBadge', { code: dataDomain })}
                      </Badge>
                    ))}
                  </Group>
                </Box>
              </Group>
              <Group gap="xs" wrap="nowrap">
                <Tooltip label={t('apiKeyPage.usageSummary')}>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label={t('apiKeyPage.usageSummaryAria')}
                    loading={usageMutation.isPending && selectedApiKey?.id === apiKey.id}
                    onClick={() => {
                      setSelectedApiKey(apiKey);
                      usageMutation.mutate(apiKey.id);
                    }}
                  >
                    <IconChartHistogram size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={t('apiKeyPage.rateLimit')}>
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    aria-label={t('apiKeyPage.rateLimitAria')}
                    onClick={() => openLimitModal(apiKey)}
                  >
                    <IconGauge size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={t('apiKeyPage.editScopes')}>
                  <ActionIcon
                    variant="subtle"
                    color="teal"
                    aria-label={t('apiKeyPage.editScopesAria')}
                    onClick={() => openScopeModal(apiKey)}
                  >
                    <IconShieldCheck size={16} />
                  </ActionIcon>
                </Tooltip>
                {apiKey.status === 'ACTIVE' ? (
                  <Tooltip label={t('apiKeyPage.disable')}>
                    <ActionIcon
                      variant="subtle"
                      color="orange"
                      aria-label={t('apiKeyPage.disableAria')}
                      loading={disableMutation.isPending}
                      onClick={() => openDisableConfirm(apiKey)}
                    >
                      <IconCircleOff size={16} />
                    </ActionIcon>
                  </Tooltip>
                ) : (
                  <Tooltip label={t('apiKeyPage.enable')}>
                    <ActionIcon
                      variant="subtle"
                      color="teal"
                      aria-label={t('apiKeyPage.enableAria')}
                      loading={enableMutation.isPending}
                      onClick={() => openEnableConfirm(apiKey)}
                    >
                      <IconCircleCheck size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
                <Tooltip label={t('apiKeyPage.revoke')}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={t('apiKeyPage.revokeAria')}
                    loading={revokeMutation.isPending}
                    onClick={() => openRevokeConfirm(apiKey)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          ))}
        </Stack>
      </Card>

      <Modal
        opened={opened}
        onClose={() => {
          close();
          setCreatedKey(null);
        }}
        title={t('apiKeyPage.createTitle')}
        centered
      >
        <Stack>
          <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
            <Stack>
              <TextInput label={t('name')} required {...form.getInputProps('name')} />
              <MultiSelect label={t('apiKeyPage.scopes')} data={scopeOptions} required {...form.getInputProps('scopes')} />
              <TextInput
                label={t('apiKeyPage.allowedSystemCodes')}
                description={t('apiKeyPage.allowedSystemCodesHint')}
                placeholder={t('apiKeyPage.allowedSystemCodesPlaceholder')}
                {...form.getInputProps('allowedSystemCodes')}
              />
              <TextInput
                label={t('apiKeyPage.allowedDataDomains')}
                description={t('apiKeyPage.allowedDataDomainsHint')}
                placeholder={t('apiKeyPage.allowedDataDomainsPlaceholder')}
                {...form.getInputProps('allowedDataDomains')}
              />
              <Button color="dark" type="submit" loading={createMutation.isPending}>
                {t('create')}
              </Button>
            </Stack>
          </form>
          {createdKey && (
            <Card p="sm" radius="sm" withBorder>
              <Text size="xs" c="dimmed" mb={6}>
                {t('apiKeyPage.fullKey')}
              </Text>
              <Code block>{createdKey.apiKey}</Code>
            </Card>
          )}
        </Stack>
      </Modal>

      <Modal
        opened={limitOpened}
        onClose={() => {
          closeLimit();
          setSelectedApiKey(null);
        }}
        title={`${t('apiKeyPage.limitTitle')}${selectedApiKey ? ` · ${selectedApiKey.name}` : ''}`}
        centered
      >
        <form onSubmit={limitForm.onSubmit((values) => updateLimitMutation.mutate(values))}>
          <Stack>
            <NumberInput label={t('rateLimitPage.fields.rpmLimit')} min={0} {...limitForm.getInputProps('rpmLimit')} />
            <NumberInput label={t('rateLimitPage.fields.tpmLimit')} min={0} {...limitForm.getInputProps('tpmLimit')} />
            <NumberInput label={t('rateLimitPage.fields.dailyCreditsLimit')} min={0} {...limitForm.getInputProps('dailyCreditsLimit')} />
            <NumberInput label={t('rateLimitPage.fields.maxConcurrent')} min={0} {...limitForm.getInputProps('maxConcurrent')} />
            <Button color="dark" type="submit" loading={updateLimitMutation.isPending} disabled={!selectedApiKey}>
              {t('apiKeyPage.saveRateLimit')}
            </Button>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={scopeOpened}
        onClose={() => {
          closeScope();
          setSelectedApiKey(null);
          scopeForm.reset();
        }}
        title={`${t('apiKeyPage.scopeTitle')}${selectedApiKey ? ` - ${selectedApiKey.name}` : ''}`}
        centered
      >
        <form onSubmit={scopeForm.onSubmit((values) => updateScopeMutation.mutate(values))}>
          <Stack>
            <MultiSelect
              label={t('apiKeyPage.scopes')}
              data={scopeOptions}
              required
              {...scopeForm.getInputProps('scopes')}
            />
            <TextInput
              label={t('apiKeyPage.allowedSystemCodes')}
              description={t('apiKeyPage.allowedSystemCodesHint')}
              placeholder={t('apiKeyPage.allowedSystemCodesPlaceholder')}
              {...scopeForm.getInputProps('allowedSystemCodes')}
            />
            <TextInput
              label={t('apiKeyPage.allowedDataDomains')}
              description={t('apiKeyPage.allowedDataDomainsHint')}
              placeholder={t('apiKeyPage.allowedDataDomainsPlaceholder')}
              {...scopeForm.getInputProps('allowedDataDomains')}
            />
            <Button color="dark" type="submit" loading={updateScopeMutation.isPending} disabled={!selectedApiKey}>
              {t('apiKeyPage.saveScopes')}
            </Button>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={usageOpened}
        onClose={() => {
          closeUsage();
          setUsageSummary(null);
          setSelectedApiKey(null);
        }}
        title={`${t('apiKeyPage.usageTitle')}${usageSummary?.apiKey?.name ? ` · ${usageSummary.apiKey.name}` : ''}`}
        centered
        size="lg"
      >
        <Stack>
          {usageMutation.isError && (
            <Alert color="red">{(usageMutation.error as Error).message}</Alert>
          )}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Card p="sm" radius="sm" withBorder>
              <Text size="xs" c="dimmed">{t('common.requests')}</Text>
              <Text fw={750}>{readSummaryNumber('request_count').toLocaleString()}</Text>
            </Card>
            <Card p="sm" radius="sm" withBorder>
              <Text size="xs" c="dimmed">{t('common.tokens')}</Text>
              <Text fw={750}>{readSummaryNumber('total_tokens').toLocaleString()}</Text>
            </Card>
            <Card p="sm" radius="sm" withBorder>
              <Text size="xs" c="dimmed">{t('common.credits')}</Text>
              <Text fw={750}>{readSummaryNumber('charge_credits').toLocaleString()}</Text>
            </Card>
            <Card p="sm" radius="sm" withBorder>
              <Text size="xs" c="dimmed">{t('apiKeyPage.failures')}</Text>
              <Text fw={750}>{readSummaryNumber('failure_count').toLocaleString()}</Text>
            </Card>
          </SimpleGrid>
          <Stack gap={0} className="subtle-list">
            {(usageSummary?.daily ?? []).map((row) => (
              <Group key={String(row.day)} className="list-row" p="sm" justify="space-between">
                <Text size="sm" fw={650}>{String(row.day)}</Text>
                <Group gap="xs">
                  <Badge color="gray" variant="light">{t('common.requestAbbr')} {String(row.request_count ?? 0)}</Badge>
                  <Badge color="gray" variant="light">{t('common.tokenAbbr')} {String(row.total_tokens ?? 0)}</Badge>
                  <Badge color="gray" variant="light">{t('common.credits')} {String(row.charge_credits ?? 0)}</Badge>
                </Group>
              </Group>
            ))}
            {(usageSummary?.daily ?? []).length === 0 && (
              <Box p="lg" ta="center">
                <Text c="dimmed">{t('apiKeyPage.emptyUsage')}</Text>
              </Box>
            )}
          </Stack>
        </Stack>
      </Modal>
    </Stack>
  );
}
