/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Only use rewrites in development (production calls API directly)
    async rewrites() {
        // In production, we don't need rewrites as we call the API directly
        if (process.env.NEXT_PUBLIC_API_URL) {
            return [];
        }
        // In development, proxy API calls to local backend
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:8000/api/:path*',
            },
        ];
    },
};

module.exports = nextConfig;
