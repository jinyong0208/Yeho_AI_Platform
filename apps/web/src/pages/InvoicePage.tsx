import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconCircleCheck,
  IconFileInvoice,
  IconProgressCheck,
  IconReceiptTax,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { invoiceApi, type InvoiceApplication } from '../api/invoice';
import { tenantApi } from '../api/tenants';

type TenantLite = {
  id: string;
  tenantCode: string;
  tenantName: string;
};

const STATUS_OPTIONS = [
  { value: 'APPLIED', label: 'APPLIED' },
  { value: 'PROCESSING', label: 'PROCESSING' },
  { value: 'ISSUED', label: 'ISSUED' },
  { value: 'REJECTED', label: 'REJECTED' },
];

export default function InvoicePage() {
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    tenantId: '',
    invoiceTitle: '默认租户科技有限公司',
    taxNo: '',
    amountCny: 1000,
    invoiceType: 'SPECIAL_VAT',
    email: 'finance@example.com',
    remark: '',
  });

  const tenantsQuery = useQuery({ queryKey: ['tenants'], queryFn: tenantApi.list });
  const invoicesQuery = useQuery({
    queryKey: ['invoice-applications', tenantId, status],
    queryFn: () => invoiceApi.list({ tenantId, status, limit: 100 }),
  });

  const tenants = (tenantsQuery.data ?? []) as TenantLite[];
  const invoices = invoicesQuery.data ?? [];

  useEffect(() => {
    if (!form.tenantId && tenants.length > 0) {
      setForm((current) => ({ ...current, tenantId: tenants[0].id }));
    }
  }, [form.tenantId, tenants]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['invoice-applications'] });

  const createMutation = useMutation({
    mutationFn: invoiceApi.create,
    onSuccess: () => {
      invalidate();
      notifications.show({ color: 'teal', message: '发票申请已创建' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'process' | 'issue' | 'reject' }) => {
      if (action === 'process') {
        return invoiceApi.process(id, 'Console status update');
      }
      if (action === 'issue') {
        return invoiceApi.issue(id, 'Console status update');
      }
      return invoiceApi.reject(id, 'Console status update');
    },
    onSuccess: () => {
      invalidate();
      notifications.show({ color: 'teal', message: '发票状态已更新' });
    },
  });

  const submit = () => {
    createMutation.mutate({
      tenantId: form.tenantId,
      invoiceTitle: form.invoiceTitle,
      taxNo: form.taxNo,
      amountCny: String(form.amountCny),
      invoiceType: form.invoiceType,
      email: form.email,
      remark: form.remark,
    });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Group gap="xs">
            <ThemeIcon color="dark" variant="light" radius="sm" size={34}>
              <IconReceiptTax size={19} />
            </ThemeIcon>
            <Title order={2}>发票申请</Title>
          </Group>
          <Text c="dimmed" maw={760}>
            记录租户发票申请和处理状态，当前阶段只做申请流转，不对接正式税控系统。
          </Text>
        </Stack>
        <Badge color="gray" variant="light" radius="sm">
          Invoice Record
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Card className="surface-card" p="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={650}>New Application</Text>
              <ThemeIcon color="blue" variant="light" radius="sm">
                <IconFileInvoice size={18} />
              </ThemeIcon>
            </Group>
            <Select
              label="租户"
              value={form.tenantId || null}
              onChange={(value) => setForm((current) => ({ ...current, tenantId: value || '' }))}
              data={tenants.map((tenant) => ({
                value: tenant.id,
                label: `${tenant.tenantName} · ${tenant.tenantCode}`,
              }))}
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label="发票抬头"
                value={form.invoiceTitle}
                onChange={(event) => setForm((current) => ({ ...current, invoiceTitle: event.currentTarget.value }))}
              />
              <TextInput
                label="税号"
                value={form.taxNo}
                onChange={(event) => setForm((current) => ({ ...current, taxNo: event.currentTarget.value }))}
              />
              <NumberInput
                label="金额 CNY"
                min={0.01}
                decimalScale={2}
                value={form.amountCny}
                onChange={(value) =>
                  setForm((current) => ({ ...current, amountCny: typeof value === 'number' ? value : 0 }))
                }
              />
              <Select
                label="类型"
                value={form.invoiceType}
                onChange={(value) => setForm((current) => ({ ...current, invoiceType: value || 'SPECIAL_VAT' }))}
                data={[
                  { value: 'SPECIAL_VAT', label: 'SPECIAL_VAT' },
                  { value: 'NORMAL_VAT', label: 'NORMAL_VAT' },
                ]}
              />
            </SimpleGrid>
            <TextInput
              label="接收邮箱"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.currentTarget.value }))}
            />
            <Textarea
              label="备注"
              minRows={3}
              value={form.remark}
              onChange={(event) => setForm((current) => ({ ...current, remark: event.currentTarget.value }))}
            />
            <Group justify="flex-end">
              <Button
                leftSection={<IconFileInvoice size={17} />}
                loading={createMutation.isPending}
                disabled={!form.tenantId || !form.invoiceTitle || form.amountCny <= 0}
                onClick={submit}
              >
                创建申请
              </Button>
            </Group>
          </Stack>
        </Card>

        <Card className="surface-card" p="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={650}>Filters</Text>
              <ThemeIcon color="gray" variant="light" radius="sm">
                <IconSearch size={18} />
              </ThemeIcon>
            </Group>
            <Select
              label="租户"
              clearable
              value={tenantId}
              onChange={setTenantId}
              data={tenants.map((tenant) => ({
                value: tenant.id,
                label: `${tenant.tenantName} · ${tenant.tenantCode}`,
              }))}
            />
            <Select label="状态" clearable value={status} onChange={setStatus} data={STATUS_OPTIONS} />
            <SimpleGrid cols={2} spacing="sm">
              <Metric label="Applications" value={String(invoices.length)} />
              <Metric label="Issued" value={String(invoices.filter((invoice) => invoice.status === 'ISSUED').length)} />
            </SimpleGrid>
          </Stack>
        </Card>
      </SimpleGrid>

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={650}>
            Invoice Queue
          </Text>
          <Badge color="gray" variant="light" radius="sm">
            {invoices.length} rows
          </Badge>
        </Group>
        <Stack gap={0} className="subtle-list">
          {invoices.map((invoice) => (
            <InvoiceRow
              key={invoice.id}
              invoice={invoice}
              loading={statusMutation.isPending}
              onAction={(action) => statusMutation.mutate({ id: invoice.id, action })}
            />
          ))}
          {invoices.length === 0 && (
            <Box p="xl" ta="center">
              <ThemeIcon color="gray" variant="light" radius="sm" size={40} mb="sm" mx="auto">
                <IconReceiptTax size={20} />
              </ThemeIcon>
              <Text c="dimmed">暂无发票申请。</Text>
            </Box>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

function InvoiceRow({
  invoice,
  loading,
  onAction,
}: {
  invoice: InvoiceApplication;
  loading: boolean;
  onAction: (action: 'process' | 'issue' | 'reject') => void;
}) {
  return (
    <Group className="list-row" p="md" justify="space-between" wrap="nowrap">
      <Group wrap="nowrap" maw="58%">
        <ThemeIcon color={statusColor(invoice.status)} variant="light" radius="sm" size={38}>
          <IconReceiptTax size={20} />
        </ThemeIcon>
        <Box>
          <Group gap="xs">
            <Text fw={650}>{invoice.invoiceTitle}</Text>
            <Badge color={statusColor(invoice.status)} variant="light" radius="sm">
              {invoice.status}
            </Badge>
            <Badge color="gray" variant="light" radius="sm">
              {invoice.invoiceType}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            ¥{invoice.amountCny} · {invoice.email || 'no email'} · {dayjs(invoice.appliedAt).format('YYYY-MM-DD HH:mm')}
          </Text>
          {invoice.remark && (
            <Text size="xs" c="dimmed" mt={4} lineClamp={1}>
              {invoice.remark}
            </Text>
          )}
        </Box>
      </Group>

      <Group gap="xs" wrap="nowrap">
        <Tooltip label="处理">
          <ActionIcon
            variant="subtle"
            color="blue"
            loading={loading}
            disabled={invoice.status !== 'APPLIED'}
            onClick={() => onAction('process')}
          >
            <IconProgressCheck size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="开具">
          <ActionIcon
            variant="subtle"
            color="teal"
            loading={loading}
            disabled={invoice.status === 'ISSUED' || invoice.status === 'REJECTED'}
            onClick={() => onAction('issue')}
          >
            <IconCircleCheck size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="驳回">
          <ActionIcon
            variant="subtle"
            color="red"
            loading={loading}
            disabled={invoice.status === 'ISSUED' || invoice.status === 'REJECTED'}
            onClick={() => onAction('reject')}
          >
            <IconX size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box className="metric-card" p="md">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={700}>
        {value}
      </Text>
    </Box>
  );
}

function statusColor(status: string) {
  if (status === 'ISSUED') {
    return 'teal';
  }
  if (status === 'PROCESSING') {
    return 'blue';
  }
  if (status === 'REJECTED') {
    return 'red';
  }
  return 'gray';
}
