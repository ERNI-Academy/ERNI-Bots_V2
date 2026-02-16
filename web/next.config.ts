import type { NextConfig } from "next";

const nextConfig = {
  // 1. Generar solo HTML/CSS/JS (Carpeta 'out')
  output: 'export',
  
  // 2. Desactivar optimización de imágenes (necesario para modo export)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
