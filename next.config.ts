import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Review del sitio en dev vía Tailscale: sin esto el HMR (webpack-hmr) tira
  // errores de WebSocket en la consola del navegador al entrar por la IP
  allowedDevOrigins: ["100.92.10.40"],
  experimental: {
    // Las imágenes se comprimen en el cliente (lib/image-client.ts) antes de
    // subirse; este límite es la red de seguridad. Vercel corta a 4.5 MB por
    // request, así que no tiene sentido subirlo más.
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Las fuentes del rol de juegos se leen del filesystem en runtime; sin esto
  // el file-tracing de Vercel puede no incluirlas en el bundle de la función.
  outputFileTracingIncludes: {
    "/api/rol/[liga]/[torneoId]/[jornada]": ["./src/assets/fonts/**"],
    "/api/rol-og/[liga]/[torneoId]/[jornada]/imagen.jpg": ["./src/assets/fonts/**"],
    "/api/tabla/[liga]/[torneoId]": ["./src/assets/fonts/**"],
    "/api/goleo/[liga]/[torneoId]": ["./src/assets/fonts/**"],
    "/api/tabla-og/[liga]/[torneoId]/imagen.jpg": ["./src/assets/fonts/**"],
    "/api/goleo-og/[liga]/[torneoId]/imagen.jpg": ["./src/assets/fonts/**"],
    "/api/og/[liga]/imagen.jpg": ["./src/assets/fonts/**"],
  },
  images: {
    // Logos y fondos servidos desde Supabase Storage
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
