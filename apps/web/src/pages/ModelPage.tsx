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
import { gatewayApi, type ModelResponse } from '../api/gateway';

export default function ModelPage() {
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
      notifications.show({ color: 'teal', title: '已保存', message: '模型配置已创建。' });
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
      notifications.show({ color: 'teal', title: '价格版本已创建', message: '后续 Usage Log 会记录新的价格版本。' });
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
          <Title order={2}>模型配置</Title>
          <Text c="dimmed" maw={700}>
            通过 model_code 路由供应商，统一维护价格、Credits 计费倍率和能力开关。
          </Text>
        </Stack>
        <Button color="dark" leftSection={<IconPlus size={16} />} onClick={open}>
          新建模型
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
                  {model.status}
                </Badge>
                {model.currentPriceVersionId && (
                  <Badge color="blue" variant="light" radius="sm">
                    price #{model.currentPriceVersionId}
                  </Badge>
                )}
              </Group>
                  <Text size="xs" c="dimmed">
                    {model.modelCode} · {model.providerCode}
                  </Text>
                </Box>
              </Group>
              <Group gap="xs">
                <Tooltip label="价格版本">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    aria-label="View model price versions"
                    onClick={() => openPriceModal(model)}
                  >
                    <IconHistory size={16} />
                  </ActionIcon>
                </Tooltip>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label="Disable model"
                  loading={disableMutation.isPending}
                  onClick={() => disableMutation.mutate(model.id)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Group>
            <Group mt="md" gap="xs">
              <Badge color="gray" variant="light" radius="sm">
                input {model.inputCreditRate}/tok
              </Badge>
              <Badge color="gray" variant="light" radius="sm">
                output {model.outputCreditRate}/tok
              </Badge>
              <Badge color={model.supportStream ? 'blue' : 'gray'} variant="light" radius="sm">
                stream {model.supportStream ? 'on' : 'off'}
              </Badge>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      <Modal opened={opened} onClose={close} title="新建模型配置" centered size="lg">
        <form onSubmit={form.onSubmit((values) => createMutation.mutate({ ...values, status: 'ACTIVE' }))}>
          <Stack>
            <Select label="供应商" data={providerOptions} required {...form.getInputProps('providerId')} />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label="Model Code" placeholder="deepseek-chat" required {...form.getInputProps('modelCode')} />
              <TextInput label="显示名称" placeholder="DeepSeek Chat" required {...form.getInputProps('displayName')} />
              <NumberInput label="Input Price" min={0} {...form.getInputProps('inputPrice')} />
              <NumberInput label="Output Price" min={0} {...form.getInputProps('outputPrice')} />
              <NumberInput label="Input Credits / Token" min={0} {...form.getInputProps('inputCreditRate')} />
              <NumberInput label="Output Credits / Token" min={0} {...form.getInputProps('outputCreditRate')} />
              <NumberInput label="Billing Multiplier" min={0} {...form.getInputProps('billingMultiplier')} />
            </SimpleGrid>
            <Group>
              <Checkbox label="支持 Stream" {...form.getInputProps('supportStream', { type: 'checkbox' })} />
              <Checkbox label="支持 Tool Call" {...form.getInputProps('supportToolCall', { type: 'checkbox' })} />
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
        title={`价格版本${selectedModel ? ` · ${selectedModel.modelCode}` : ''}`}
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
                <Text fw={650}>新增价格版本</Text>
                <Text size="xs" c="dimmed">创建后会成为当前版本，历史 Usage Log 仍保留旧版本。</Text>
              </Box>
            </Group>
            <form onSubmit={priceForm.onSubmit((values) => createPriceVersionMutation.mutate(values))}>
              <Stack>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <NumberInput label="Input Price" min={0} {...priceForm.getInputProps('inputPrice')} />
                  <NumberInput label="Output Price" min={0} {...priceForm.getInputProps('outputPrice')} />
                  <NumberInput label="Input Credits / Token" min={0} {...priceForm.getInputProps('inputCreditRate')} />
                  <NumberInput label="Output Credits / Token" min={0} {...priceForm.getInputProps('outputCreditRate')} />
                  <NumberInput label="Billing Multiplier" min={0} {...priceForm.getInputProps('billingMultiplier')} />
                  <TextInput label="备注" {...priceForm.getInputProps('remark')} />
                </SimpleGrid>
                <Button color="dark" type="submit" loading={createPriceVersionMutation.isPending} disabled={!selectedModel}>
                  创建价格版本
                </Button>
              </Stack>
            </form>
          </Card>

          <Stack gap={0} className="subtle-list">
            {(priceVersionsQuery.data ?? []).map((version) => (
              <Group key={version.id} className="list-row" p="md" justify="space-between" align="flex-start">
                <Box>
                  <Group gap="xs">
                    <Text fw={650}>Version {version.versionNo}</Text>
                    {String(selectedModel?.currentPriceVersionId ?? '') === String(version.id) && (
                      <Badge color="teal" variant="light" radius="sm">current</Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    {version.remark || '无备注'} · {version.createdAt || '-'}
                  </Text>
                </Box>
                <Group gap="xs">
                  <Badge color="gray" variant="light">in {version.inputCreditRate}/tok</Badge>
                  <Badge color="gray" variant="light">out {version.outputCreditRate}/tok</Badge>
                  <Badge color="gray" variant="light">x {version.billingMultiplier}</Badge>
                </Group>
              </Group>
            ))}
            {(priceVersionsQuery.data ?? []).length === 0 && (
              <Box p="lg" ta="center">
                <Text c="dimmed">暂无价格版本。</Text>
              </Box>
            )}
          </Stack>
        </Stack>
      </Modal>
    </Stack>
  );
}
