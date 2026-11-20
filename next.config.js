/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/movies/:id",
        destination: "/content/movie/:id",
        permanent: false,
      },
      {
        source: "/tv/:id",
        destination: "/content/tv/:id",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
