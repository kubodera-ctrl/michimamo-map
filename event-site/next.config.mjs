/** @type {import('next').NextConfig} */
const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true';

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  },
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
    return [{ source: '/:path*', headers: common }];
  }
};

export default nextConfig;
