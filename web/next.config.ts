import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Configuración de imágenes para Azure App Service
  images: {
    unoptimized: true, // Azure App Service no soporta optimización de imágenes
  },
};

export default nextConfig;
