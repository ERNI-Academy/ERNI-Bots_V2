/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración de imágenes para Azure App Service
  images: {
    unoptimized: true, // Azure App Service no soporta optimización de imágenes
  },
};

module.exports = nextConfig;
