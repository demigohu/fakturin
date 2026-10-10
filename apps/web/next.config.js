/** @type {import('next').NextConfig} */
const nextConfig = {
  // The screens used Indonesian slugs before; keep old links working.
  async redirects() {
    return [
      { source: "/penjual", destination: "/borrow", permanent: false },
      { source: "/pasar", destination: "/lend", permanent: false },
      { source: "/cek", destination: "/check", permanent: false },
      { source: "/pembeli", destination: "/check", permanent: false },
      { source: "/mitra", destination: "/lend", permanent: false },
    ];
  },
};

export default nextConfig;
