/** @type {import('next').NextConfig} */
const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true'
  && Boolean(process.env.NEXT_PUBLIC_SITE_URL);

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.google-analytics.com https://www.google-analytics.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'"
    ].join('; ');

    const common = [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=()' }
    ];
    if (!allowIndexing) {
      common.push({ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' });
    }
    const privateAdmin = [
      ...common,
      { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }
    ];
    return [
      { source: '/admin/:path*', headers: privateAdmin },
      { source: '/api/admin/:path*', headers: privateAdmin },
      { source: '/:path*', headers: common }
    ];
  }
};

export default nextConfig;
