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
import { IconLogin2, IconRefresh, IconSparkles } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import type { CaptchaResponse } from '../api/types';
import { useAuthStore } from '../store/useAuthStore';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [captcha, setCaptcha] = useState<CaptchaResponse | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm({
    initialValues: {
      tenantCode: '',
      username: '',
      password: '',
      captchaAnswer: '',
    },
    validate: {
      tenantCode: (value) => (value.trim() ? null : t('loginPage.tenantRequired')),
      username: (value) => (value.trim() ? null : t('loginPage.usernameRequired')),
      password: (value) => (value ? null : t('loginPage.passwordRequired')),
      captchaAnswer: (value) => (value.trim() ? null : t('loginPage.captchaRequired')),
    },
  });
  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      setCaptcha(await authApi.captcha());
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCaptcha();
  }, [loadCaptcha]);

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
                {t('appTagline')}
              </Text>
            </Stack>
            <Group gap={6}>
              <Badge variant="light" color="gray" radius="sm">
                {t('loginPage.openAiCompatible')}
              </Badge>
              <Badge variant="light" color="teal" radius="sm">
                {t('loginPage.multiTenant')}
              </Badge>
            </Group>
          </Stack>

          <Card className="surface-card" p="lg">
            <form
              onSubmit={form.onSubmit(async (values) => {
                setSubmitting(true);
                try {
                  const result = await authApi.login({
                    ...values,
                    captchaId: captcha?.captchaId ?? '',
                  });
                  login(result.accessToken, {
                    tenantId: result.tenantId,
                    tenantCode: result.tenantCode,
                    tenantName: result.tenantName,
                    userId: result.userId,
                    username: result.username,
                    roles: result.roles,
                  }, result.expiresInSeconds);
                  navigate('/');
                } catch {
                  notifications.show({
                    color: 'red',
                    title: t('loginPage.loginFailedTitle'),
                    message: t('loginPage.loginFailedMessage'),
                  });
                  form.setFieldValue('captchaAnswer', '');
                  void loadCaptcha();
                } finally {
                  setSubmitting(false);
                }
              })}
            >
              <Stack>
                <TextInput label={t('tenantCode')} {...form.getInputProps('tenantCode')} />
                <TextInput label={t('username')} {...form.getInputProps('username')} />
                <PasswordInput label={t('password')} {...form.getInputProps('password')} />
                <Group align="flex-start" wrap="nowrap">
                  <TextInput
                    label={t('loginPage.captcha')}
                    placeholder={captcha?.challenge ?? t('loginPage.captchaLoading')}
                    style={{ flex: 1 }}
                    {...form.getInputProps('captchaAnswer')}
                  />
                  <Button
                    mt={25}
                    variant="light"
                    color="gray"
                    leftSection={<IconRefresh size={16} />}
                    loading={captchaLoading}
                    onClick={() => {
                      form.setFieldValue('captchaAnswer', '');
                      void loadCaptcha();
                    }}
                  >
                    {captcha?.challenge ?? t('loginPage.refreshCaptcha')}
                  </Button>
                </Group>
                <Button color="dark" type="submit" leftSection={<IconLogin2 size={16} />} loading={submitting}>
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
