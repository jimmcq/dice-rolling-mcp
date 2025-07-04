/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@modelcontextprotocol/sdk'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        '@modelcontextprotocol/sdk': 'commonjs @modelcontextprotocol/sdk'
      });
    }
    return config;
  }
};

export default nextConfig;