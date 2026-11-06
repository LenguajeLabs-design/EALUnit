import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createApp } from './app';

if (existsSync('.env')) process.loadEnvFile('.env');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  throw new Error(
    'This personal prototype binds to loopback only. Add authentication before enabling shared access.',
  );
}
const app = createApp();
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
const server = app.listen(port, host, () =>
  console.log(`EAL Unit is ready at http://${host === '::1' ? '[::1]' : host}:${port}`),
);
server.on('error', (error) => {
  console.error('EAL Unit could not start:', error.message);
  process.exitCode = 1;
});
