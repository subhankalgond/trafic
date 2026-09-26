import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const PAGES = ['/', '/live-traffic', '/simulation', '/routes', '/incidents', '/about', '/privacy', '/terms'];

/**
 * Injects canonical/og:url tags and an absolute-URL sitemap.xml only when a
 * custom domain is configured via VITE_SITE_URL. With no domain configured the
 * HTML stays exactly as authored (no broken placeholders).
 */
function siteMeta(siteUrl: string): Plugin {
  return {
    name: 'smartflow-site-meta',
    transformIndexHtml(html) {
      if (!siteUrl) return html;
      const base = `${siteUrl}/`;
      const head = `    <link rel="canonical" href="${base}" />\n    <meta property="og:url" content="${base}" />`;
      return html
        .replace('    <link rel="icon"', `${head}\n    <link rel="icon"`)
        .replace('content="/og-image.svg"', `content="${siteUrl}/og-image.svg"`);
    },
    generateBundle() {
      if (!siteUrl) return;
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.map(
          (p) => `  <url><loc>${siteUrl}${p}</loc></url>`
        ).join('\n')}\n</urlset>\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');

  return {
    plugins: [react(), siteMeta(siteUrl)],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
