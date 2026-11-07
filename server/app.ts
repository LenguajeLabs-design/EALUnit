import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { contextSchema, unitSchema } from '../shared/model';
import { currentApproval } from '../shared/planning';
import { validateLibrary } from '../shared/storage';
import { generateBlueprint, generateLesson } from './generation';

export type Generators = { blueprint: typeof generateBlueprint; lesson: typeof generateLesson };

export function createApp(options: { enabled?: boolean; generators?: Generators } = {}) {
  const app = express();
  const generators = options.generators ?? { blueprint: generateBlueprint, lesson: generateLesson };
  const enabled = options.enabled ?? Boolean(process.env.OPENAI_API_KEY);
  app.disable('x-powered-by');
  app.use('/api', (_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    next();
  });
  app.use('/api', (req, res, next) => {
    let hostname = '';
    try {
      hostname = new URL(`http://${req.get('host')}`).hostname;
    } catch {
      /* An invalid Host header is rejected below. */
    }
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(hostname)) {
      res.status(403).json({ error: 'Use the local EAL Unit address for planning requests.' });
      return;
    }
    next();
  });
  app.get('/api/config', (_req, res) => res.json({ generationEnabled: enabled }));
  app.use('/api', (req, res, next) => {
    const origin = req.get('origin');
    if (
      req.get('sec-fetch-site') === 'cross-site' ||
      (origin && origin !== `http://${req.get('host')}`)
    ) {
      res
        .status(403)
        .json({ error: 'Open EAL Unit from its own local address to create a draft.' });
      return;
    }
    if (!req.is('application/json')) {
      res.status(415).json({ error: 'Send planning requests as JSON.' });
      return;
    }
    next();
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: 10 * 60 * 1000,
      limit: 15,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        error:
          'The planning limit has been reached. Try again in a few minutes; your current work is safe.',
      },
    }),
  );
  app.use('/api', express.json({ limit: '512kb' }));
  app.post('/api/blueprint', async (req, res) => {
    const parsed = contextSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Check the unit title, workshop overview, and session length.' });
      return;
    }
    if (!enabled) {
      res.status(503).json({
        error:
          'AI drafting is not configured. You can still use an editable outline or explore the example.',
      });
      return;
    }
    try {
      res.json(await generators.blueprint(parsed.data));
    } catch {
      res.status(502).json({
        error:
          'A complete blueprint could not be created. Your input has been kept. Try again or start with an editable outline.',
      });
    }
  });
  const lessonRequest = z.object({ unit: unitSchema, stepIds: z.array(z.string()).min(1).max(12) });
  app.post('/api/lesson', async (req, res) => {
    const parsed = lessonRequest.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Choose an approved unit and valid learning steps.' });
      return;
    }
    const { unit, stepIds } = parsed.data;
    try {
      validateLibrary({ schemaVersion: 1, exportedAt: new Date().toISOString(), units: [unit] });
    } catch {
      res
        .status(400)
        .json({ error: 'This unit has invalid revision or lesson links. Review the blueprint.' });
      return;
    }
    const approval = currentApproval(unit);
    if (
      !approval ||
      stepIds.some((id) => !approval.blueprint.steps.some((step) => step.id === id))
    ) {
      res
        .status(409)
        .json({ error: 'Approve the current blueprint and choose its learning steps first.' });
      return;
    }
    if (!enabled) {
      res
        .status(503)
        .json({ error: 'AI drafting is not configured. Use an editable lesson outline instead.' });
      return;
    }
    try {
      res.json(await generators.lesson(unit, stepIds));
    } catch {
      res.status(502).json({
        error:
          'A complete lesson could not be created. Your approved unit is safe. Try again or use an editable lesson outline.',
      });
    }
  });
  app.use('/api', (_req, res) =>
    res.status(404).json({ error: 'This planning endpoint does not exist.' }),
  );
  app.use(
    (
      error: { type?: string },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(error.type === 'entity.too.large' ? 413 : 400).json({
        error:
          error.type === 'entity.too.large'
            ? 'This planning request is too large. Shorten the source material.'
            : 'The planning request could not be read.',
      });
    },
  );
  return app;
}
