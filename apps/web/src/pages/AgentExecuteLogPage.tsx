import { Badge, Button, Card, Group, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { orchestrationApi } from '../api/orchestration';
import { tenantApi } from '../api/tenants';

export function AgentExecuteLogPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState('');
  const [traceId, setTraceId] = useState('');

  const tenants = useQuery({ queryKey: ['tenants'], queryFn: tenantApi.list });
  const logs = useQuery({
    queryKey: ['agent-execute-logs', tenantId, requestId, traceId],
    queryFn: () =>
      orchestrationApi.agentExecuteLogs({
        tenantId: tenantId ? Number(tenantId) : undefined,
        requestId: requestId || undefined,
        traceId: traceId || undefined,
      }),
  });

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>Agent Execute Logs</Title>
          <Text c="dimmed">按 request_id / trace_id 查询 Agent 执行轨迹，不记录敏感 Prompt 原文。</Text>
        </Stack>
      </Group>

      <Card p="lg">
        <Group align="flex-end">
          <Select
            label="Tenant"
            data={(tenants.data ?? []).map((tenant) => ({ value: String(tenant.id), label: tenant.tenantName }))}
            value={tenantId}
            onChange={setTenantId}
            clearable
          />
          <TextInput label="Request ID" value={requestId} onChange={(event) => setRequestId(event.currentTarget.value)} />
          <TextInput label="Trace ID" value={traceId} onChange={(event) => setTraceId(event.currentTarget.value)} />
          <Button onClick={() => logs.refetch()}>查询</Button>
        </Group>
      </Card>

      <Card p="lg">
        <Table.ScrollContainer minWidth={980}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Request ID</Table.Th>
                <Table.Th>Trace ID</Table.Th>
                <Table.Th>Agent</Table.Th>
                <Table.Th>Model</Table.Th>
                <Table.Th>Latency</Table.Th>
                <Table.Th>Tokens</Table.Th>
                <Table.Th>Credits</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Created</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(logs.data ?? []).map((log) => (
                <Table.Tr key={log.id}>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {log.requestId}
                    </Text>
                  </Table.Td>
                  <Table.Td>{log.traceId ?? '-'}</Table.Td>
                  <Table.Td>{log.agentCode ?? '-'}</Table.Td>
                  <Table.Td>{log.model ?? '-'}</Table.Td>
                  <Table.Td>{log.latencyMs ?? 0} ms</Table.Td>
                  <Table.Td>{log.totalTokens}</Table.Td>
                  <Table.Td>{log.chargeCredits}</Table.Td>
                  <Table.Td>
                    <Badge color={log.success ? 'green' : 'red'} variant="light">
                      {log.success ? 'SUCCESS' : log.errorCode ?? 'FAILED'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{log.createdAt}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}

export default AgentExecuteLogPage;
