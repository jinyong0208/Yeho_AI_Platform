import { Button, Card, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/useAuthStore';

export default function ProfilePage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const form = useForm({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      currentPassword: (value) => (value ? null : t('profilePage.currentPasswordRequired')),
      newPassword: (value) => (value.length >= 8 ? null : t('profilePage.passwordMinLength')),
      confirmPassword: (value, values) => (value === values.newPassword ? null : t('profilePage.passwordMismatch')),
    },
  });
  const changePasswordMutation = useMutation({
    mutationFn: (values: typeof form.values) =>
      authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      notifications.show({
        color: 'teal',
        title: t('profilePage.passwordChangedTitle'),
        message: t('profilePage.passwordChangedMessage'),
      });
      form.reset();
    },
  });

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>{t('profilePage.title')}</Title>
        <Text c="dimmed">{t('profilePage.description', { username: user?.username ?? '-' })}</Text>
      </Stack>

      <Card className="surface-card" p="lg" maw={520}>
        <form onSubmit={form.onSubmit((values) => changePasswordMutation.mutate(values))}>
          <Stack>
            <PasswordInput label={t('profilePage.currentPassword')} required {...form.getInputProps('currentPassword')} />
            <PasswordInput label={t('profilePage.newPassword')} required {...form.getInputProps('newPassword')} />
            <PasswordInput label={t('profilePage.confirmPassword')} required {...form.getInputProps('confirmPassword')} />
            <Button color="dark" type="submit" loading={changePasswordMutation.isPending}>
              {t('profilePage.changePassword')}
            </Button>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
