import { Badge, Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconRouteAltLeft } from '@tabler/icons-react';
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
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>{t(kind)}</Title>
        <Text c="dimmed">{t('phaseNotice')}</Text>
      </Stack>
      <Card className="surface-card" p="lg">
        <Group justify="space-between" align="flex-start">
          <Group align="flex-start">
            <ThemeIcon color="gray" variant="light" radius="sm" size={40}>
              <IconRouteAltLeft size={20} />
            </ThemeIcon>
            <Stack gap={4}>
              <Group gap="xs">
                <Text fw={650}>{t(kind)}</Text>
                <Badge variant="light" color="gray" radius="sm">
                  Reserved
                </Badge>
              </Group>
              <Text c="dimmed" size="sm" maw={620}>
                已预留为后续阶段入口。Phase 1 只建立导航、依赖和页面骨架，不实现复杂业务流。
              </Text>
            </Stack>
          </Group>
        </Group>
      </Card>
    </Stack>
  );
}
