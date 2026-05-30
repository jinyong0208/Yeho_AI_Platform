import { Badge, Card, Code, Divider, Group, List, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import {
  IconApi,
  IconBook2,
  IconChecklist,
  IconGitBranch,
  IconKey,
  IconRoute,
  IconShieldCheck,
  IconSparkles,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

const sections = [
  { key: 'boundary', icon: IconShieldCheck },
  { key: 'urls', icon: IconRoute },
  { key: 'context', icon: IconApi },
  { key: 'scopes', icon: IconKey },
  { key: 'runtime', icon: IconSparkles },
  { key: 'workflow', icon: IconGitBranch },
  { key: 'logs', icon: IconBook2 },
] as const;

const integrationSteps = ['registerSystem', 'issueKey', 'sendContext'] as const;
const systemExamples = ['edms', 'eqms', 'robot', 'customerService', 'iot', 'screen'] as const;
const codeBlocks = ['envConfig', 'runtimeCurl', 'workflowRuntimeCurl', 'chatHeaders'] as const;

export default function DeveloperDocsPage() {
  const { t } = useTranslation();

  return (
    <Stack gap="xl">
      <Card className="surface-card" p="xl" style={{ backgroundColor: '#fbfcfe', borderColor: '#e7edf5' }}>
        <Stack gap="md">
          <Group gap="xs">
            <ThemeIcon color="dark" variant="filled" radius="sm" size={38}>
              <IconBook2 size={20} />
            </ThemeIcon>
            <Stack gap={2}>
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
          </Group>
          <Divider />
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
            {['gateway', 'platform', 'dataBoundary'].map((key) => (
              <Card key={key} withBorder radius="sm" p="md" style={{ backgroundColor: '#fff' }}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  {t(`developerDocsPage.overview.${key}.label`)}
                </Text>
                <Text mt={6} fw={700}>
                  {t(`developerDocsPage.overview.${key}.value`)}
                </Text>
                <Text size="sm" c="dimmed">
                  {t(`developerDocsPage.overview.${key}.hint`)}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      </Card>

      <Card className="surface-card" p="lg" withBorder>
        <Stack gap="sm">
          <Group gap="sm">
            <ThemeIcon color="blue" variant="light" radius="sm" size={34}>
              <IconChecklist size={18} />
            </ThemeIcon>
            <Stack gap={2}>
              <Text fw={700}>{t('developerDocsPage.integrationFlow.title')}</Text>
              <Text size="sm" c="dimmed">
                {t('developerDocsPage.integrationFlow.description')}
              </Text>
            </Stack>
          </Group>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
            {integrationSteps.map((key, index) => (
              <Card key={key} withBorder radius="sm" p="md">
                <Badge variant="light" color="gray" radius="sm">
                  {t('developerDocsPage.integrationFlow.step', { index: index + 1 })}
                </Badge>
                <Text mt="sm" fw={700}>
                  {t(`developerDocsPage.integrationFlow.${key}.title`)}
                </Text>
                <Text mt={4} size="sm" c="dimmed">
                  {t(`developerDocsPage.integrationFlow.${key}.body`)}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      </Card>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.key} className="surface-card" p="lg" withBorder>
              <Stack gap="sm">
                <Group align="flex-start" gap="sm">
                  <ThemeIcon color="gray" variant="light" radius="sm" size={36}>
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

      <Card className="surface-card" p="lg" withBorder>
        <Stack gap="md">
          <Stack gap={2}>
            <Text fw={700}>{t('developerDocsPage.systemExamples.title')}</Text>
            <Text size="sm" c="dimmed">
              {t('developerDocsPage.systemExamples.description')}
            </Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="sm">
            {systemExamples.map((key) => (
              <Card key={key} withBorder radius="sm" p="md">
                <Stack gap={6}>
                  <Group justify="space-between" align="flex-start">
                    <Text fw={700}>{t(`developerDocsPage.systemExamples.${key}.name`)}</Text>
                    <Code>{t(`developerDocsPage.systemExamples.${key}.code`)}</Code>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {t(`developerDocsPage.systemExamples.${key}.description`)}
                  </Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      </Card>

      <Card className="surface-card" p="lg" withBorder>
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
