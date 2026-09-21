/** @type {import('next').NextConfig} */
const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true'
  && Boolean(process.env.NEXT_PUBLIC_SITE_URL);

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  async headers() {
    const common = [
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
