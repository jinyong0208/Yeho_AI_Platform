import {
  Anchor,
  Button,
  Card,
  Container,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconLogin2 } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/useAuthStore';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const form = useForm({
    initialValues: {
      tenantCode: 'default',
      username: 'admin',
      password: 'Admin@123456',
    },
  });

  return (
    <Container size={420} py={96}>
      <Stack gap="lg">
        <Stack gap={4} align="center">
          <Title order={1}>{t('appName')}</Title>
          <Text c="dimmed" size="sm">
            AI Gateway Console
          </Text>
        </Stack>
        <Card shadow="xs" p="lg">
          <form
            onSubmit={form.onSubmit(async (values) => {
              try {
                const result = await authApi.login(values);
                login(result.accessToken, {
                  tenantId: result.tenantId,
                  userId: result.userId,
                  username: result.username,
                  roles: result.roles,
                });
                navigate('/');
              } catch {
                notifications.show({
                  color: 'red',
                  title: '登录失败',
                  message: '请检查租户、用户名或密码。',
                });
              }
            })}
          >
            <Stack>
              <TextInput label={t('tenantCode')} {...form.getInputProps('tenantCode')} />
              <TextInput label={t('username')} {...form.getInputProps('username')} />
              <PasswordInput label={t('password')} {...form.getInputProps('password')} />
              <Button type="submit" leftSection={<IconLogin2 size={16} />}>
                {t('login')}
              </Button>
            </Stack>
          </form>
        </Card>
        <Group justify="center">
          <Anchor size="sm" href="https://yeho.local" target="_blank">
            Phase 1
          </Anchor>
        </Group>
      </Stack>
    </Container>
  );
}
