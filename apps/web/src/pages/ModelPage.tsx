import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
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
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconBrain, IconCurrencyDollar, IconHistory, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gatewayApi, type ModelResponse } from '../api/gateway';

export default function ModelPage() {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const [priceOpened, { open: openPrice, close: closePrice }] = useDisclosure(false);
  const [selectedModel, setSelectedModel] = useState<ModelResponse | null>(null);
  const queryClient = useQueryClient();
  const providersQuery = useQuery({ queryKey: ['providers'], queryFn: gatewayApi.providers });
  const modelsQuery = useQuery({ queryKey: ['models'], queryFn: gatewayApi.models });
  const form = useForm({
    initialValues: {
      providerId: '',
      modelCode: '',
      displayName: '',
      inputPrice: 0,
      outputPrice: 0,
      inputCreditRate: 1,
      outputCreditRate: 2,
      billingMultiplier: 1,
      supportStream: false,
      supportToolCall: false,
    },
  });
  const priceForm = useForm({
    initialValues: {
      inputPrice: 0,
      outputPrice: 0,
      inputCreditRate: 1,
      outputCreditRate: 2,
      billingMultiplier: 1,
      remark: '',
    },
  });
  const priceVersionsQuery = useQuery({
    queryKey: ['model-price-versions', selectedModel?.id],
    queryFn: () => gatewayApi.modelPriceVersions(selectedModel?.id as string),
    enabled: Boolean(selectedModel),
  });
  const createMutation = useMutation({
    mutationFn: gatewayApi.createModel,
    onSuccess: () => {
      notifications.show({ color: 'teal', title: t('modelPage.savedTitle'), message: t('modelPage.savedMessage') });
      queryClient.invalidateQueries({ queryKey: ['models'] });
      form.reset();
      close();
    },
  });
  const disableMutation = useMutation({
    mutationFn: gatewayApi.disableModel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['models'] }),
  });
  const createPriceVersionMutation = useMutation({
    mutationFn: (values: typeof priceForm.values) =>
      gatewayApi.createModelPriceVersion(selectedModel?.id as string, values),
    onSuccess: () => {
      notifications.show({ color: 'teal', title: t('modelPage.priceCreatedTitle'), message: t('modelPage.priceCreatedMessage') });
      queryClient.invalidateQueries({ queryKey: ['models'] });
      queryClient.invalidateQueries({ queryKey: ['model-price-versions', selectedModel?.id] });
      priceForm.setFieldValue('remark', '');
    },
  });
  const providerOptions = (providersQuery.data ?? []).map((provider) => ({
    value: provider.id,
    label: `${provider.providerCode} · ${provider.providerName}`,
  }));
  const models = modelsQuery.data ?? [];

  const openPriceModal = (model: ModelResponse) => {
    setSelectedModel(model);
    priceForm.setValues({
      inputPrice: model.inputPrice ?? 0,
      outputPrice: model.outputPrice ?? 0,
      inputCreditRate: model.inputCreditRate ?? 1,
      outputCreditRate: model.outputCreditRate ?? 2,
      billingMultiplier: model.billingMultiplier ?? 1,
      remark: '',
    });
    openPrice();
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{t('modelPage.title')}</Title>
          <Text c="dimmed" maw={700}>
            {t('modelPage.description')}
          </Text>
        </Stack>
        <Button color="dark" leftSection={<IconPlus size={16} />} onClick={open}>
          {t('modelPage.createModel')}
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {models.map((model) => (
          <Card key={model.id} className="surface-card" p="lg">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Group wrap="nowrap">
                <ThemeIcon color="indigo" variant="light" radius="sm" size={40}>
                  <IconBrain size={21} />
                </ThemeIcon>
                <Box>
              <Group gap="xs">
                <Text fw={650}>{model.displayName}</Text>
                <Badge color={model.status === 'ACTIVE' ? 'teal' : 'gray'} variant="light" radius="sm">
                  {t(`common.statusLabels.${model.status}`, { defaultValue: model.status })}
                </Badge>
                {model.currentPriceVersionId && (
                  <Badge color="blue" variant="light" radius="sm">
                    {t('modelPage.priceVersionBadge', { id: model.currentPriceVersionId })}
                  </Badge>
                )}
              </Group>
                  <Text size="xs" c="dimmed">
                    {model.modelCode} · {model.providerCode}
                  </Text>
                </Box>
              </Group>
              <Group gap="xs">
                <Tooltip label={t('modelPage.priceVersion')}>
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    aria-label={t('modelPage.priceVersionAria')}
                    onClick={() => openPriceModal(model)}
                  >
                    <IconHistory size={16} />
                  </ActionIcon>
                </Tooltip>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label={t('modelPage.disableAria')}
                  loading={disableMutation.isPending}
                  onClick={() => disableMutation.mutate(model.id)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Group>
            <Group mt="md" gap="xs">
              <Badge color="gray" variant="light" radius="sm">
                {t('modelPage.inputRate', { value: model.inputCreditRate })}
              </Badge>
              <Badge color="gray" variant="light" radius="sm">
                {t('modelPage.outputRate', { value: model.outputCreditRate })}
              </Badge>
              <Badge color={model.supportStream ? 'blue' : 'gray'} variant="light" radius="sm">
                {t('modelPage.streamStatus', { status: model.supportStream ? t('modelPage.on') : t('modelPage.off') })}
              </Badge>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      <Modal opened={opened} onClose={close} title={t('modelPage.createConfig')} centered size="lg">
        <form onSubmit={form.onSubmit((values) => createMutation.mutate({ ...values, status: 'ACTIVE' }))}>
          <Stack>
            <Select label={t('modelPage.provider')} data={providerOptions} required {...form.getInputProps('providerId')} />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label={t('modelPage.modelCode')} placeholder="deepseek-chat" required {...form.getInputProps('modelCode')} />
              <TextInput label={t('modelPage.displayName')} placeholder="DeepSeek Chat" required {...form.getInputProps('displayName')} />
              <NumberInput label={t('modelPage.inputPrice')} min={0} {...form.getInputProps('inputPrice')} />
              <NumberInput label={t('modelPage.outputPrice')} min={0} {...form.getInputProps('outputPrice')} />
              <NumberInput label={t('modelPage.inputCreditRate')} min={0} {...form.getInputProps('inputCreditRate')} />
              <NumberInput label={t('modelPage.outputCreditRate')} min={0} {...form.getInputProps('outputCreditRate')} />
              <NumberInput label={t('modelPage.billingMultiplier')} min={0} {...form.getInputProps('billingMultiplier')} />
            </SimpleGrid>
            <Group>
              <Checkbox label={t('modelPage.supportStream')} {...form.getInputProps('supportStream', { type: 'checkbox' })} />
              <Checkbox label={t('modelPage.supportToolCall')} {...form.getInputProps('supportToolCall', { type: 'checkbox' })} />
            </Group>
            <Button color="dark" type="submit" loading={createMutation.isPending}>
              保存
            </Button>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={priceOpened}
        onClose={() => {
          closePrice();
          setSelectedModel(null);
        }}
        title={`${t('modelPage.priceVersion')}${selectedModel ? ` · ${selectedModel.modelCode}` : ''}`}
        centered
        size="lg"
      >
        <Stack>
          <Card p="sm" radius="sm" withBorder>
            <Group gap="xs" mb="sm">
              <ThemeIcon color="blue" variant="light" radius="sm" size={32}>
                <IconCurrencyDollar size={17} />
              </ThemeIcon>
              <Box>
                <Text fw={650}>{t('modelPage.newPriceVersion')}</Text>
                <Text size="xs" c="dimmed">{t('modelPage.priceVersionDescription')}</Text>
              </Box>
            </Group>
            <form onSubmit={priceForm.onSubmit((values) => createPriceVersionMutation.mutate(values))}>
              <Stack>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <NumberInput label={t('modelPage.inputPrice')} min={0} {...priceForm.getInputProps('inputPrice')} />
                  <NumberInput label={t('modelPage.outputPrice')} min={0} {...priceForm.getInputProps('outputPrice')} />
                  <NumberInput label={t('modelPage.inputCreditRate')} min={0} {...priceForm.getInputProps('inputCreditRate')} />
                  <NumberInput label={t('modelPage.outputCreditRate')} min={0} {...priceForm.getInputProps('outputCreditRate')} />
                  <NumberInput label={t('modelPage.billingMultiplier')} min={0} {...priceForm.getInputProps('billingMultiplier')} />
                  <TextInput label={t('walletPage.remark')} {...priceForm.getInputProps('remark')} />
                </SimpleGrid>
                <Button color="dark" type="submit" loading={createPriceVersionMutation.isPending} disabled={!selectedModel}>
                  {t('modelPage.createPriceVersion')}
                </Button>
              </Stack>
            </form>
          </Card>

          <Stack gap={0} className="subtle-list">
            {(priceVersionsQuery.data ?? []).map((version) => (
              <Group key={version.id} className="list-row" p="md" justify="space-between" align="flex-start">
                <Box>
                  <Group gap="xs">
                    <Text fw={650}>{t('modelPage.versionNo', { version: version.versionNo })}</Text>
                    {String(selectedModel?.currentPriceVersionId ?? '') === String(version.id) && (
                      <Badge color="teal" variant="light" radius="sm">{t('modelPage.current')}</Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    {version.remark || t('modelPage.noRemark')} · {version.createdAt || '-'}
                  </Text>
                </Box>
                <Group gap="xs">
                  <Badge color="gray" variant="light">{t('modelPage.inputRate', { value: version.inputCreditRate })}</Badge>
                  <Badge color="gray" variant="light">{t('modelPage.outputRate', { value: version.outputCreditRate })}</Badge>
                  <Badge color="gray" variant="light">x {version.billingMultiplier}</Badge>
                </Group>
              </Group>
            ))}
            {(priceVersionsQuery.data ?? []).length === 0 && (
              <Box p="lg" ta="center">
                <Text c="dimmed">{t('modelPage.emptyPriceVersions')}</Text>
              </Box>
            )}
          </Stack>
        </Stack>
      </Modal>
    </Stack>
  );
}
