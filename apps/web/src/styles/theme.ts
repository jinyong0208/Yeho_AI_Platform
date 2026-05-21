import { createTheme, rem } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'teal',
  defaultRadius: 'sm',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontWeight: '700',
    sizes: {
      h1: { fontSize: rem(28), lineHeight: '1.25' },
      h2: { fontSize: rem(22), lineHeight: '1.3' },
      h3: { fontSize: rem(18), lineHeight: '1.35' },
    },
  },
  components: {
    Card: {
      defaultProps: {
        radius: 'sm',
        withBorder: true,
      },
    },
    Button: {
      defaultProps: {
        radius: 'sm',
      },
    },
  },
});
