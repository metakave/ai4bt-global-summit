import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import { handleRegistration } from './api/register.js';

function registerApiPlugin() {
  return {
    name: 'register-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url.split('?')[0];

        // 1. POST registration
        if (url === '/api/register' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const result = await handleRegistration(data);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 2. Download XLSX file
        if ((url === '/api/download-registrations' || url === '/api/registrations.xlsx' || (url === '/api/register' && req.method === 'GET'))) {
          const xlsxPath = resolve(process.cwd(), 'data/registrations.xlsx');
          if (fs.existsSync(xlsxPath)) {
            const stat = fs.statSync(xlsxPath);
            res.writeHead(200, {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'Content-Length': stat.size,
              'Content-Disposition': 'attachment; filename="ai4bt_global_summit_registrations.xlsx"'
            });
            fs.createReadStream(xlsxPath).pipe(res);
            return;
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'No registrations spreadsheet found yet.' }));
            return;
          }
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [registerApiPlugin()],
  server: {
    port: 5173,
    open: false,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        speakers: resolve(__dirname, 'speakers.html'),
        agenda: resolve(__dirname, 'agenda.html'),
        register: resolve(__dirname, 'register.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three-vendor';
          }
        }
      }
    }
  }
});
