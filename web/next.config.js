/** @type {import('next').NextConfig} */
const nextConfig = {
  // Necesario para que request.nextUrl use X-Forwarded-Host en route handlers (Azure App Service)
  experimental: {
    trustHost: true,
  },
  // Configuración de imágenes para Azure App Service
  images: {
    unoptimized: true, // Azure App Service no soporta optimización de imágenes
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",        value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",     value: "geolocation=(), microphone=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
