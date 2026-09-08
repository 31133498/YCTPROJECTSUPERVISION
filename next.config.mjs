/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep the Admin SDK (and its gRPC deps) out of the bundler — it runs only
    // in Node route handlers / server actions.
    serverComponentsExternalPackages: ["firebase-admin"],
  },
};

export default nextConfig;
