/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.savoyhouse.com',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: 'libandco.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'hubbardtonforge.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
