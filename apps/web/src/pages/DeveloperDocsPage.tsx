import { Badge, Card, Code, Group, List, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconApi, IconBook2, IconKey, IconRoute, IconShieldCheck, IconSparkles } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

const sections = [
  { key: 'boundary', icon: IconShieldCheck, color: 'green' },
  { key: 'urls', icon: IconRoute, color: 'blue' },
  { key: 'context', icon: IconApi, color: 'cyan' },
  { key: 'scopes', icon: IconKey, color: 'yellow' },
  { key: 'runtime', icon: IconSparkles, color: 'violet' },
  { key: 'logs', icon: IconBook2, color: 'gray' },
] as const;

const codeBlocks = ['edmsConfig', 'runtimeCurl', 'chatHeaders'] as const;

export default function DeveloperDocsPage() {
  const { t } = useTranslation();

  return (
    <Stack gap="lg">
      <Stack gap={6}>
        <Group gap="xs">
          <Title order={2}>{t('developerDocsPage.title')}</Title>
          <Badge variant="light" color="blue" radius="sm">
            {t('developerDocsPage.badge')}
          </Badge>
        </Group>
        <Text c="dimmed" maw={920}>
          {t('developerDocsPage.description')}
        </Text>
      </Stack>

      <Card className="surface-card" p="lg">
        <Stack gap="sm">
          <Text fw={700}>{t('developerDocsPage.quickStart.title')}</Text>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
            {['systemCode', 'dataDomain', 'agentCode'].map((key) => (
              <Card key={key} withBorder radius="sm" p="md">
                <Text size="xs" c="dimmed">
                  {t(`developerDocsPage.quickStart.${key}.label`)}
                </Text>
                <Code mt={6} block>
                  {t(`developerDocsPage.quickStart.${key}.value`)}
                </Code>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      </Card>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.key} className="surface-card" p="lg">
              <Stack gap="sm">
                <Group align="flex-start" gap="sm">
                  <ThemeIcon color={section.color} variant="light" radius="sm" size={36}>
                    <Icon size={18} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text fw={700}>{t(`developerDocsPage.sections.${section.key}.title`)}</Text>
                    <Text size="sm" c="dimmed">
                      {t(`developerDocsPage.sections.${section.key}.description`)}
                    </Text>
                  </Stack>
                </Group>
                <List size="sm" spacing={6} c="dimmed">
                  {[
                    'item1',
                    'item2',
                    'item3',
                    'item4',
                  ].map((itemKey) => {
                    const value = t(`developerDocsPage.sections.${section.key}.${itemKey}`, {
                      defaultValue: '',
                    });
                    return value ? <List.Item key={itemKey}>{value}</List.Item> : null;
                  })}
                </List>
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>

      <Card className="surface-card" p="lg">
        <Stack gap="md">
          <Stack gap={2}>
            <Text fw={700}>{t('developerDocsPage.examples.title')}</Text>
            <Text size="sm" c="dimmed">
              {t('developerDocsPage.examples.description')}
            </Text>
          </Stack>
          {codeBlocks.map((key) => (
            <Stack key={key} gap={6}>
              <Text size="sm" fw={650}>
                {t(`developerDocsPage.examples.${key}.title`)}
              </Text>
              <Code block>{t(`developerDocsPage.examples.${key}.code`)}</Code>
            </Stack>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}
