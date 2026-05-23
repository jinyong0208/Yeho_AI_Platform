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
    | 'workflow'
    | 'rateLimits'
    | 'playground'
    | 'apiDocs';
}

export default function PlaceholderPage({ kind }: PlaceholderPageProps) {
  const { t } = useTranslation();
  const baseKey = `placeholder.${kind}`;

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>{t(`${baseKey}.title`)}</Title>
        <Text c="dimmed">{t(`${baseKey}.description`)}</Text>
      </Stack>
      <Card className="surface-card" p="lg">
        <Group justify="space-between" align="flex-start">
          <Group align="flex-start">
            <ThemeIcon color="gray" variant="light" radius="sm" size={40}>
              <IconRouteAltLeft size={20} />
            </ThemeIcon>
            <Stack gap={4}>
              <Group gap="xs">
                <Text fw={650}>{t(`${baseKey}.title`)}</Text>
                <Badge variant="light" color={kind === 'workflow' ? 'yellow' : 'gray'} radius="sm">
                  {t(`${baseKey}.badge`)}
                </Badge>
              </Group>
              <Text c="dimmed" size="sm" maw={720}>
                {t(`${baseKey}.body`)}
              </Text>
            </Stack>
          </Group>
        </Group>
      </Card>
    </Stack>
  );
}
