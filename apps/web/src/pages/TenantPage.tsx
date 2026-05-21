import {
  ActionIcon,
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconPlus, IconTrash } from '@tabler/icons-react';
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

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Stack gap={2}>
          <Title order={2}>{t('tenants')}</Title>
          <Text c="dimmed">多租户基础数据维护。</Text>
        </Stack>
        <Button leftSection={<IconPlus size={16} />} onClick={open}>
          {t('create')}
        </Button>
      </Group>

      <Card p={0}>
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('code')}</Table.Th>
              <Table.Th>{t('name')}</Table.Th>
              <Table.Th>{t('status')}</Table.Th>
              <Table.Th>{t('contact')}</Table.Th>
              <Table.Th>{t('email')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(tenantsQuery.data ?? []).map((tenant) => (
              <Table.Tr key={tenant.id}>
                <Table.Td>{tenant.tenantCode}</Table.Td>
                <Table.Td>{tenant.tenantName}</Table.Td>
                <Table.Td>{tenant.status}</Table.Td>
                <Table.Td>{tenant.contactName || '-'}</Table.Td>
                <Table.Td>{tenant.contactEmail || '-'}</Table.Td>
                <Table.Td>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label="Delete tenant"
                    onClick={() => deleteMutation.mutate(tenant.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal opened={opened} onClose={close} title="新建租户">
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
          <Stack>
            <TextInput label={t('code')} required {...form.getInputProps('tenantCode')} />
            <TextInput label={t('name')} required {...form.getInputProps('tenantName')} />
            <TextInput label={t('contact')} {...form.getInputProps('contactName')} />
            <TextInput label={t('phone')} {...form.getInputProps('contactPhone')} />
            <TextInput label={t('email')} {...form.getInputProps('contactEmail')} />
            <Button type="submit" loading={createMutation.isPending}>
              {t('save')}
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
