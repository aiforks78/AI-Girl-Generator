/** @type {import('next-sitemap').IConfig} */
const SITE_URL = (() => {
  // Prefer explicitly configured site domain
  if (process.env.SITEMAP_SITE_URL) return process.env.SITEMAP_SITE_URL.replace(/\/$/, '');
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  // Vercel environment variables (without protocol)
  const vercelUrl = process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`;
  // Local/build fallback to avoid validation errors
  return 'http://localhost:3000';
})();

const config = {
  siteUrl: SITE_URL,
  generateRobotsTxt: true,
  generateIndexSitemap: false, // Generate single sitemap.xml instead of sitemap index
  sitemapSize: 7000,
  exclude: [
    '/api/*',
    '/checkout/*',
    '/test-env',
    '/403',
    '/500',
    '/502',
    '/not-found',
    '/content',      // Auth-required
    '/credits',      // Auth-required
    '/team',         // 404 - page doesn't exist
    '/developers',   // Error 1102 - Worker resource limits
    '/explore',      // Error 1102 - Worker resource limits
  ],
  transform: async (config, path) => {
    const priority = (() => {
      if (path === '/') return 1.0;
      if (['/text-to-image', '/image-to-image', '/image-to-video', '/gallery'].includes(path)) return 0.9;
      if (['/pricing'].includes(path)) return 0.8;
      if (['/account', '/contact'].includes(path)) return 0.7;
      if (['/privacy', '/terms', '/cookies', '/refund'].includes(path)) return 0.5;
      return 0.7;
    })();

    const changefreq = (() => {
      if (path === '/') return 'daily';
      if (['/text-to-image', '/image-to-image', '/image-to-video', '/gallery'].includes(path)) return 'daily';
      if (['/pricing', '/account'].includes(path)) return 'weekly';
      if (['/privacy', '/terms', '/cookies', '/refund'].includes(path)) return 'monthly';
      return 'weekly';
    })();

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
    };
  },
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/api/*'] },
    ],
  },
};

export default config;
