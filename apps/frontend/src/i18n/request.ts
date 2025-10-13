import {getRequestConfig} from 'next-intl/server';

// Minimal i18n request config: default to English without requiring middleware
export default getRequestConfig(async () => {
  return {
    locale: 'en',
    messages: (await import('@/messages/en.json')).default
  };
});
