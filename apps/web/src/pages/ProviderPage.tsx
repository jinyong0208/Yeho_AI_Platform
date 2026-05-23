import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Group,
  Loader,
  Modal,
  PasswordInput,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconActivityHeartbeat,
  IconAlertTriangle,
  IconBolt,
  IconCircleCheck,
  IconKey,
  IconRefresh,
  IconServerCog,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rootApiClient } from '../api/client';
import { gatewayApi } from '../api/gateway';

type ProviderHealth = {
  provider_id?: number;
  providerId?: number;
  provider_code?: string;
  providerCode?: string;
  provider_name?: string;
  providerName?: string;
  base_url?: string;
  baseUrl?: string;
  status?: string;
  health_status?: string;
  healthStatus?: string;
  consecutive_failures?: number;
  consecutiveFailures?: number;
  circuit_open_until?: string | null;
  circuitOpenUntil?: string | null;
  last_checked_at?: string | null;
  lastCheckedAt?: string | null;
  last_test_request_id?: string | null;
  lastTestRequestId?: string | null;
  last_test_success?: boolean | null;
  lastTestSuccess?: boolean | null;
  last_test_latency_ms?: number | null;
  lastTestLatencyMs?: number | null;
  last_test_error_code?: string | null;
  lastTestErrorCode?: string | null;
  last_test_error_message?: string | null;
  lastTestErrorMessage?: string | null;
  last_tested_at?: string | null;
  lastTestedAt?: string | null;
};

type ProviderTestLog = {
  request_id?: string;
  requestId?: string;
  success?: boolean;
  latency_ms?: number;
  latencyMs?: number;
  error_code?: string | null;
  errorCode?: string | null;
  error_message?: string | null;
  errorMessage?: string | null;
  tested_at?: string;
  testedAt?: string;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await rootApiClient.request<T>({
    url: path,
    method: init?.method ?? 'GET',
  });
  return response.data;
}

function providerId(provider: ProviderHealth) {
  return provider.provider_id ?? provider.providerId ?? 0;
}

function providerCode(provider: ProviderHealth) {
  return provider.provider_code ?? provider.providerCode ?? '-';
}

function providerName(provider: ProviderHealth) {
  return provider.provider_name ?? provider.providerName ?? providerCode(provider);
}

function healthStatus(provider: ProviderHealth) {
  return provider.health_status ?? provider.healthStatus ?? 'UNKNOWN';
}

function lastLatency(provider: ProviderHealth) {
  return provider.last_test_latency_ms ?? provider.lastTestLatencyMs;
}

function lastError(provider: ProviderHealth) {
  return provider.last_test_error_message ?? provider.lastTestErrorMessage;
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString(locale);
}

function statusColor(status: string) {
  if (status === 'HEALTHY') {
    return 'teal';
  }
  if (status === 'UNHEALTHY') {
    return 'red';
  }
  if (status === 'DEGRADED') {
    return 'yellow';
  }
  return 'gray';
}

export default function ProviderPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [keyOpened, { open: openKey, close: closeKey }] = useDisclosure(false);
  const [keyProvider, setKeyProvider] = useState<ProviderHealth | null>(null);
  const keyForm = useForm({ initialValues: { apiKey: '' } });
  const healthQuery = useQuery({
    queryKey: ['provider-health'],
    queryFn: () => requestJson<ProviderHealth[]>('/api/providers/health'),
  });

  const providers = healthQuery.data ?? [];
  const selectedProvider = providers[0];
  const logsQuery = useQuery({
    queryKey: ['provider-test-logs', selectedProvider ? providerId(selectedProvider) : 0],
    queryFn: () => requestJson<ProviderTestLog[]>(`/api/providers/${providerId(selectedProvider)}/test-logs`),
    enabled: Boolean(selectedProvider),
  });

  const testMutation = useMutation({
    mutationFn: (id: number) => requestJson(`/api/providers/${id}/test`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-health'] });
      queryClient.invalidateQueries({ queryKey: ['provider-test-logs'] });
    },
  });
  const rotateKeyMutation = useMutation({
    mutationFn: (values: typeof keyForm.values) =>
      gatewayApi.updateProviderApiKey(String(providerId(keyProvider as ProviderHealth)), values),
    onSuccess: () => {
      notifications.show({ color: 'teal', title: t('providerPage.keySavedTitle'), message: t('providerPage.keySavedMessage') });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['provider-health'] });
      keyForm.reset();
      setKeyProvider(null);
      closeKey();
    },
  });

  const healthyCount = providers.filter((provider) => healthStatus(provider) === 'HEALTHY').length;
  const unhealthyCount = providers.filter((provider) => healthStatus(provider) === 'UNHEALTHY').length;

  const openKeyModal = (provider: ProviderHealth) => {
    setKeyProvider(provider);
    keyForm.reset();
    openKey();
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Group gap="sm">
            <ThemeIcon variant="light" radius="md" size="lg" color="indigo">
              <IconServerCog size={20} />
            </ThemeIcon>
            <Title order={2}>{t('providerPage.title')}</Title>
          </Group>
          <Text c="dimmed" size="sm">
            {t('providerPage.description')}
          </Text>
        </Stack>
        <Tooltip label={t('providerPage.refreshTooltip')}>
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={() => healthQuery.refetch()}
            loading={healthQuery.isFetching}
          >
            {t('providerPage.refresh')}
          </Button>
        </Tooltip>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card withBorder radius="md" padding="lg">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('providerPage.providers')}
            </Text>
            <IconActivityHeartbeat size={18} />
          </Group>
          <Text fw={700} size="xl">
            {providers.length}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('providerPage.healthy')}
            </Text>
            <IconCircleCheck size={18} />
          </Group>
          <Text fw={700} size="xl" c="teal">
            {healthyCount}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('providerPage.needAttention')}
            </Text>
            <IconAlertTriangle size={18} />
          </Group>
          <Text fw={700} size="xl" c={unhealthyCount > 0 ? 'red' : 'dimmed'}>
            {unhealthyCount}
          </Text>
        </Card>
      </SimpleGrid>

      {testMutation.isError && (
        <Alert color="red" icon={<IconAlertTriangle size={16} />}>
          {(testMutation.error as Error).message}
        </Alert>
      )}

      {healthQuery.isLoading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : (
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          {providers.map((provider) => {
            const id = providerId(provider);
            const currentHealth = healthStatus(provider);
            return (
              <Card key={id} withBorder radius="md" padding="lg">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={2}>
                      <Group gap="xs">
                        <Text fw={700}>{providerName(provider)}</Text>
                        <Badge variant="light">{providerCode(provider)}</Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {provider.base_url ?? provider.baseUrl ?? '-'}
                      </Text>
                    </Stack>
                    <Badge color={statusColor(currentHealth)}>{currentHealth}</Badge>
                  </Group>

                  <Group gap="xs">
                    <Badge variant="outline">{t('status')} {provider.status ?? '-'}</Badge>
                    <Badge variant="outline">
                      {t('providerPage.failures')} {provider.consecutive_failures ?? provider.consecutiveFailures ?? 0}
                    </Badge>
                    <Badge variant="outline">{t('providerPage.latency')} {lastLatency(provider) ?? '-'} ms</Badge>
                  </Group>

                  {lastError(provider) && (
                    <Code block>
                      {lastError(provider)}
                    </Code>
                  )}

                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      {t('providerPage.lastChecked')} {formatDate(provider.last_checked_at ?? provider.lastCheckedAt, i18n.language)}
                    </Text>
                    <Group gap="xs">
                      <Button
                        variant="light"
                        leftSection={<IconKey size={16} />}
                        onClick={() => openKeyModal(provider)}
                      >
                        {t('providerPage.rotateKey')}
                      </Button>
                      <Button
                        leftSection={<IconBolt size={16} />}
                        onClick={() => testMutation.mutate(id)}
                        loading={testMutation.isPending}
                      >
                        {t('providerPage.test')}
                      </Button>
                    </Group>
                  </Group>
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" mb="sm">
          <Text fw={700}>{t('providerPage.recentTestLogs')}</Text>
          <Badge variant="light">{selectedProvider ? providerCode(selectedProvider) : '-'}</Badge>
        </Group>
        <Table.ScrollContainer minWidth={720}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('providerPage.time')}</Table.Th>
                <Table.Th>{t('providerPage.result')}</Table.Th>
                <Table.Th>{t('providerPage.latency')}</Table.Th>
                <Table.Th>{t('providerPage.requestId')}</Table.Th>
                <Table.Th>{t('providerPage.error')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(logsQuery.data ?? []).map((log) => {
                const success = Boolean(log.success);
                return (
                  <Table.Tr key={log.request_id ?? log.requestId}>
                    <Table.Td>{formatDate(log.tested_at ?? log.testedAt, i18n.language)}</Table.Td>
                    <Table.Td>
                      <Badge color={success ? 'teal' : 'red'}>{success ? t('common.success') : t('common.failed')}</Badge>
                    </Table.Td>
                    <Table.Td>{log.latency_ms ?? log.latencyMs ?? '-'} ms</Table.Td>
                    <Table.Td>
                      <Code>{log.request_id ?? log.requestId ?? '-'}</Code>
                    </Table.Td>
                    <Table.Td>{log.error_message ?? log.errorMessage ?? log.error_code ?? log.errorCode ?? '-'}</Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Modal
        opened={keyOpened}
        onClose={() => {
          closeKey();
          setKeyProvider(null);
          keyForm.reset();
        }}
        title={`${t('providerPage.rotateKey')}${keyProvider ? ` · ${providerCode(keyProvider)}` : ''}`}
        centered
      >
        <form onSubmit={keyForm.onSubmit((values) => rotateKeyMutation.mutate(values))}>
          <Stack>
            <Text size="sm" c="dimmed">
              {t('providerPage.keySecurityNote')}
            </Text>
            <PasswordInput
              label={t('providerPage.providerApiKey')}
              required
              autoComplete="off"
              {...keyForm.getInputProps('apiKey')}
            />
            <Button color="dark" type="submit" loading={rotateKeyMutation.isPending} disabled={!keyProvider}>
              {t('providerPage.saveEncryptedKey')}
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
