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
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconBrain, IconPlus, IconTrash } from '@tabler/icons-react';
import { gatewayApi } from '../api/gateway';

export default function ModelPage() {
  const [opened, { open, close }] = useDisclosure(false);
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
  const providerOptions = (providersQuery.data ?? []).map((provider) => ({
    value: provider.id,
    label: `${provider.providerCode} · ${provider.providerName}`,
  }));
  const models = modelsQuery.data ?? [];

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
                  </Group>
                  <Text size="xs" c="dimmed">
                    {model.modelCode} · {model.providerCode}
                  </Text>
                </Box>
              </Group>
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
    </Stack>
  );
}
