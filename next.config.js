/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@modelcontextprotocol/sdk']
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        '@modelcontextprotocol/sdk': 'commonjs @modelcontextprotocol/sdk'
      });
    }
    return config;
  }
};

module.exports = nextConfig;