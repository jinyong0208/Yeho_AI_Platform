import { Badge, Card, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';

interface PlaceholderPageProps {
  kind:
    | 'providers'
    | 'models'
    | 'apiKeys'
    | 'wallet'
    | 'walletTransactions'
    | 'usageLogs'
    | 'tokenStats'
    | 'workflow';
}

export default function PlaceholderPage({ kind }: PlaceholderPageProps) {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <Stack gap={2}>
        <Title order={2}>{t(kind)}</Title>
        <Text c="dimmed">{t('phaseNotice')}</Text>
      </Stack>
      <Card p="lg">
        <Stack gap="sm">
          <Badge variant="light" color="gray">
            Reserved
          </Badge>
          <Text>
            {t(kind)} 已预留为后续阶段入口。Phase 1 只建立导航、依赖和页面骨架，不实现复杂业务流。
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
}
