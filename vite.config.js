import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function slideUploadPlugin() {
  return {
    name: 'slide-upload-plugin',
    configureServer(server) {
      server.middlewares.use('/api/upload-slide', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const dataUrl = parsed.dataUrl || parsed.image || '';
            const cleanBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(cleanBase64, 'base64');

            // 1. Catbox.moe üzerinden doğrudan genel JPEG bağlantısı oluştur
            const fd = new FormData();
            fd.append('reqtype', 'fileupload');
            fd.append('fileToUpload', new Blob([buffer], { type: 'image/jpeg' }), `slide_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.jpg`);

            const catboxRes = await fetch('https://catbox.moe/user/api.php', {
              method: 'POST',
              body: fd
            });

            if (catboxRes.ok) {
              const fileUrl = (await catboxRes.text()).trim();
              if (fileUrl && fileUrl.startsWith('http')) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, url: fileUrl }));
                return;
              }
            }

            // 2. Yedek: Uguu.se
            const uguuFd = new FormData();
            uguuFd.append('files[]', new Blob([buffer], { type: 'image/jpeg' }), `slide_${Date.now()}.jpg`);
            const uguuRes = await fetch('https://uguu.se/upload', {
              method: 'POST',
              body: uguuFd
            });

            if (uguuRes.ok) {
              const json = await uguuRes.json();
              const fileUrl = json?.files?.[0]?.url;
              if (fileUrl) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, url: fileUrl }));
                return;
              }
            }

            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'Görsel genel sunuculara yüklenemedi.' }));
          } catch (err) {
            console.error('Slide upload error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message || 'Internal error' }));
          }
        });
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    tailwindcss(),
    react(),
    slideUploadPlugin(),
  ],
})
