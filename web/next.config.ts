import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Configuración para Azure App Service
  output: 'standalone',
  
  // Asegurar que los assets estáticos se sirvan correctamente
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || '',
  
  // Configuración de imágenes
  images: {
    unoptimized: true, // Azure App Service no soporta optimización de imágenes
  },
};

export default nextConfig;
