import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://unwindanddoodle.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/account/',
        '/checkout/',
        '/pay/',
        '/invite/',
        '/unsubscribe/',
        '/sentry-example-page/',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
