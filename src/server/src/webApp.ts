import express from 'express';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

export function createWebAppRouter(distDir: string, runtimeConfigScript: string) {
  const router = express.Router();
  let html: Promise<string> | undefined;
  const staticFiles = express.static(distDir, { index: false, redirect: false });

  router.use((req, res, next) => {
    let pathname: string;
    try {
      pathname = decodeURIComponent(req.path);
    } catch {
      res.sendStatus(400);
      return;
    }
    if (/\.html?$/i.test(pathname)) return next();
    staticFiles(req, res, next);
  });

  router.get(/^\/requests\/?$/, (req, res) => {
    res.redirect(308, `/request${req.url.slice(req.path.length)}`);
  });

  router.get(/^\/(?:player\/?|host\/?|admin\/?|request\/?)?$/, async (_req, res, next) => {
    try {
      html ??= readFile(path.join(distDir, 'index.html'), 'utf8').then(source => {
        const clean = source.replace(/<script>window\.__ENV__=.*?<\/script>/g, '');
        return clean.includes('</head>')
          ? clean.replace('</head>', `${runtimeConfigScript}</head>`)
          : `${runtimeConfigScript}${clean}`;
      });
      res.type('html').send(await html);
    } catch (error) {
      html = undefined;
      next(error);
    }
  });

  router.use((_req, res) => {
    res.status(404).type('text').send('404 - Page not found');
  });
  return router;
}
