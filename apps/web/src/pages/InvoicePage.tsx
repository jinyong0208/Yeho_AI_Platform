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
import { useTranslation } from 'react-i18next';
import { invoiceApi, type InvoiceApplication } from '../api/invoice';
import { tenantApi } from '../api/tenants';
import { useAuthStore } from '../store/useAuthStore';
import { resolvePrimaryRole, USER_ROLES } from '../utils/roles';

type TenantLite = {
  id: string;
  tenantCode: string;
  tenantName: string;
};

export default function InvoicePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const canSelectTenant = primaryRole === USER_ROLES.SUPER_ADMIN;
  const canProcessInvoice = primaryRole === USER_ROLES.SUPER_ADMIN || primaryRole === USER_ROLES.FINANCE;
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

  const tenantsQuery = useQuery({ queryKey: ['tenants'], queryFn: tenantApi.list, enabled: canSelectTenant });
  const invoicesQuery = useQuery({
    queryKey: ['invoice-applications', tenantId, status],
    queryFn: () => invoiceApi.list({ tenantId, status, limit: 100 }),
  });

  const tenants = canSelectTenant
    ? ((tenantsQuery.data ?? []) as TenantLite[])
    : user?.tenantId
      ? [{ id: user.tenantId, tenantName: '当前租户', tenantCode: user.tenantId }]
      : [];
  const invoices = invoicesQuery.data ?? [];
  const statusOptions = ['APPLIED', 'PROCESSING', 'ISSUED', 'REJECTED'].map((value) => ({
    value,
    label: t(`invoicePage.statusLabels.${value}`),
  }));

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
      notifications.show({ color: 'teal', message: t('invoicePage.createdMessage') });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'process' | 'issue' | 'reject' }) => {
      if (action === 'process') {
        return invoiceApi.process(id, t('invoicePage.processRemark'));
      }
      if (action === 'issue') {
        return invoiceApi.issue(id, t('invoicePage.processRemark'));
      }
      return invoiceApi.reject(id, t('invoicePage.processRemark'));
    },
    onSuccess: () => {
      invalidate();
      notifications.show({ color: 'teal', message: t('invoicePage.statusUpdatedMessage') });
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
            <Title order={2}>{t('invoicePage.title')}</Title>
          </Group>
          <Text c="dimmed" maw={760}>
            {t('invoicePage.description')}
          </Text>
        </Stack>
        <Badge color="gray" variant="light" radius="sm">
          {t('invoicePage.badge')}
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Card className="surface-card" p="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={650}>{t('invoicePage.newApplication')}</Text>
              <ThemeIcon color="blue" variant="light" radius="sm">
                <IconFileInvoice size={18} />
              </ThemeIcon>
            </Group>
            <Select
              label={t('invoicePage.tenant')}
              value={form.tenantId || null}
              onChange={(value) => setForm((current) => ({ ...current, tenantId: value || '' }))}
              data={tenants.map((tenant) => ({
                value: tenant.id,
                label: `${tenant.tenantName} · ${tenant.tenantCode}`,
              }))}
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label={t('invoicePage.invoiceTitle')}
                value={form.invoiceTitle}
                onChange={(event) => setForm((current) => ({ ...current, invoiceTitle: event.currentTarget.value }))}
              />
              <TextInput
                label={t('invoicePage.taxNo')}
                value={form.taxNo}
                onChange={(event) => setForm((current) => ({ ...current, taxNo: event.currentTarget.value }))}
              />
              <NumberInput
                label={t('invoicePage.amountCny')}
                min={0.01}
                decimalScale={2}
                value={form.amountCny}
                onChange={(value) =>
                  setForm((current) => ({ ...current, amountCny: typeof value === 'number' ? value : 0 }))
                }
              />
              <Select
                label={t('invoicePage.type')}
                value={form.invoiceType}
                onChange={(value) => setForm((current) => ({ ...current, invoiceType: value || 'SPECIAL_VAT' }))}
                data={[
                  { value: 'SPECIAL_VAT', label: t('invoicePage.typeLabels.SPECIAL_VAT') },
                  { value: 'NORMAL_VAT', label: t('invoicePage.typeLabels.NORMAL_VAT') },
                ]}
              />
            </SimpleGrid>
            <TextInput
              label={t('invoicePage.email')}
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.currentTarget.value }))}
            />
            <Textarea
              label={t('invoicePage.remark')}
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
                {t('invoicePage.createApplication')}
              </Button>
            </Group>
          </Stack>
        </Card>

        <Card className="surface-card" p="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={650}>{t('invoicePage.filters')}</Text>
              <ThemeIcon color="gray" variant="light" radius="sm">
                <IconSearch size={18} />
              </ThemeIcon>
            </Group>
            <Select
              label={t('invoicePage.tenant')}
              clearable
              value={tenantId}
              onChange={setTenantId}
              disabled={!canSelectTenant}
              data={tenants.map((tenant) => ({
                value: tenant.id,
                label: `${tenant.tenantName} · ${tenant.tenantCode}`,
              }))}
            />
            <Select label={t('invoicePage.status')} clearable value={status} onChange={setStatus} data={statusOptions} />
            <SimpleGrid cols={2} spacing="sm">
              <Metric label={t('invoicePage.applications')} value={String(invoices.length)} />
              <Metric label={t('invoicePage.issued')} value={String(invoices.filter((invoice) => invoice.status === 'ISSUED').length)} />
            </SimpleGrid>
          </Stack>
        </Card>
      </SimpleGrid>

      <Card className="surface-card" p="lg">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={650}>
            {t('invoicePage.queue')}
          </Text>
          <Badge color="gray" variant="light" radius="sm">
            {t('invoicePage.rowCount', { count: invoices.length })}
          </Badge>
        </Group>
        <Stack gap={0} className="subtle-list">
          {invoices.map((invoice) => (
            <InvoiceRow
              key={invoice.id}
              invoice={invoice}
              loading={statusMutation.isPending}
              canProcess={canProcessInvoice}
              t={t}
              onAction={(action) => statusMutation.mutate({ id: invoice.id, action })}
            />
          ))}
          {invoices.length === 0 && (
            <Box p="xl" ta="center">
              <ThemeIcon color="gray" variant="light" radius="sm" size={40} mb="sm" mx="auto">
                <IconReceiptTax size={20} />
              </ThemeIcon>
              <Text c="dimmed">{t('invoicePage.empty')}</Text>
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
  canProcess,
  onAction,
  t,
}: {
  invoice: InvoiceApplication;
  loading: boolean;
  canProcess: boolean;
  onAction: (action: 'process' | 'issue' | 'reject') => void;
  t: (key: string, options?: Record<string, unknown>) => string;
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
              {t(`invoicePage.statusLabels.${invoice.status}`, { defaultValue: invoice.status })}
            </Badge>
            <Badge color="gray" variant="light" radius="sm">
              {t(`invoicePage.typeLabels.${invoice.invoiceType}`, { defaultValue: invoice.invoiceType })}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            ¥{invoice.amountCny} · {invoice.email || t('invoicePage.noEmail')} · {dayjs(invoice.appliedAt).format('YYYY-MM-DD HH:mm')}
          </Text>
          {invoice.remark && (
            <Text size="xs" c="dimmed" mt={4} lineClamp={1}>
              {invoice.remark}
            </Text>
          )}
        </Box>
      </Group>

      {canProcess && (
      <Group gap="xs" wrap="nowrap">
        <Tooltip label={t('invoicePage.actions.process')}>
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
        <Tooltip label={t('invoicePage.actions.issue')}>
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
        <Tooltip label={t('invoicePage.actions.reject')}>
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
      )}
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
