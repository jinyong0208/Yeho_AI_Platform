import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconLogin2, IconSparkles } from '@tabler/icons-react';
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
    <Box className="login-canvas">
      <Container size={460} py={96}>
        <Stack gap="lg">
          <Stack gap="sm" align="center">
            <ThemeIcon size={42} radius="sm" color="dark">
              <IconSparkles size={22} />
            </ThemeIcon>
            <Stack gap={2} align="center">
              <Title order={1}>{t('appName')}</Title>
              <Text c="dimmed" size="sm">
                AI Gateway Console
              </Text>
            </Stack>
            <Group gap={6}>
              <Badge variant="light" color="gray" radius="sm">
                OpenAI-compatible
              </Badge>
              <Badge variant="light" color="teal" radius="sm">
                Multi-tenant
              </Badge>
            </Group>
          </Stack>

          <Card className="surface-card" p="lg">
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
                <Button color="dark" type="submit" leftSection={<IconLogin2 size={16} />}>
                  {t('login')}
                </Button>
              </Stack>
            </form>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
