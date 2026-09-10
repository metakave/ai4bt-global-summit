import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import { handleRegistration } from './api/register.js';
import { handleCircleJoin } from './api/circle.js';

function registerApiPlugin() {
  return {
    name: 'register-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url.split('?')[0];

        // Clean URL support for development server
        if (['/agenda', '/speakers', '/offers', '/register', '/payment'].includes(url)) {
          const queryString = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
          req.url = `${url}.html${queryString}`;
        }

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

        // 1b. POST Confirm Payment (Step 2)
        if (url === '/api/confirm-payment' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              data.step = 2;
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

        // 2. POST Summit Circle Join
        if ((url === '/api/circle' || url === '/api/join-circle' || url === '/api/summit-circle') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const result = await handleCircleJoin(data);
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

        // 3. Download XLSX file
        if ((url === '/api/download-registrations' || url === '/api/registrations.xlsx' || (url === '/api/register' && req.method === 'GET' && !req.url.includes('export=')))) {
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

        // 3b. Download registered_first_step.csv
        if (url === '/api/registered_first_step.csv' || url === '/api/download-first-step' || (url === '/api/register' && req.url.includes('export=first_step'))) {
          const csvPath = resolve(process.cwd(), 'data/registered_first_step.csv');
          if (fs.existsSync(csvPath)) {
            const stat = fs.statSync(csvPath);
            res.writeHead(200, {
              'Content-Type': 'text/csv',
              'Content-Length': stat.size,
              'Content-Disposition': 'attachment; filename="registered_first_step.csv"'
            });
            fs.createReadStream(csvPath).pipe(res);
            return;
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'registered_first_step.csv not found yet.' }));
            return;
          }
        }

        // 3c. Download registeted_second_step.csv
        if (url === '/api/registeted_second_step.csv' || url === '/api/download-second-step' || (url === '/api/register' && req.url.includes('export=second_step'))) {
          const csvPath = resolve(process.cwd(), 'data/registeted_second_step.csv');
          if (fs.existsSync(csvPath)) {
            const stat = fs.statSync(csvPath);
            res.writeHead(200, {
              'Content-Type': 'text/csv',
              'Content-Length': stat.size,
              'Content-Disposition': 'attachment; filename="registeted_second_step.csv"'
            });
            fs.createReadStream(csvPath).pipe(res);
            return;
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'registeted_second_step.csv not found yet.' }));
            return;
          }
        }

        // 4. Download Summit Circle CSV
        if (url === '/api/circle' || url === '/api/download-circle' || url === '/api/summit_circle.csv') {
          const csvPath = resolve(process.cwd(), 'data/summit_circle.csv');
          if (fs.existsSync(csvPath)) {
            const stat = fs.statSync(csvPath);
            res.writeHead(200, {
              'Content-Type': 'text/csv',
              'Content-Length': stat.size,
              'Content-Disposition': 'attachment; filename="ai4bt_summit_circle.csv"'
            });
            fs.createReadStream(csvPath).pipe(res);
            return;
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'No summit circle members file found yet.' }));
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
        offers: resolve(__dirname, 'offers.html'),
        register: resolve(__dirname, 'register.html'),
        payment: resolve(__dirname, 'payment.html')
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
