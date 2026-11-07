import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request, type Server } from 'node:http';
import { createApp } from '../server/app';
import { exampleBlueprint, exampleContext } from '../shared/example';
import { approveUnit, createUnit, lessonOutline } from '../shared/planning';
import type { Context } from '../shared/model';
import { fixtureSource } from './pdf-fixtures';

let server: Server;
let base: string;
let calls = 0;
let lastContext: Context | undefined;
before(async () => {
  const app = createApp({
    enabled: true,
    generators: {
      blueprint: async (context) => {
        calls++;
        lastContext = context;
        if (context.title === 'Provider failure') throw new Error('provider-private-secret');
        return exampleBlueprint();
      },
      lesson: async (unit, stepIds) => {
        calls++;
        return lessonOutline(
          unit,
          unit.blueprint.steps.filter((step) => stepIds.includes(step.id)),
        );
      },
    },
  });
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test_server_failed');
  base = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
});
const post = (path: string, data: unknown, headers = {}) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });

test('config exposes availability without credentials and planning responses are not cached', async () => {
  const response = await fetch(base + '/api/config');
  assert.deepEqual(await response.json(), { generationEnabled: true });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-powered-by'), null);
});
test('invalid input is rejected before calling the generation provider', async () => {
  const beforeCalls = calls;
  const response = await post('/api/blueprint', { ...exampleContext, curriculum: 'too short' });
  assert.equal(response.status, 400);
  assert.equal(calls, beforeCalls);
});
test('cross-site requests are rejected before generation', async () => {
  const beforeCalls = calls;
  const response = await post('/api/blueprint', exampleContext, {
    Origin: 'https://another-site.example',
  });
  assert.equal(response.status, 403);
  assert.equal(calls, beforeCalls);
});
test('requests using a non-local Host header are rejected', async () => {
  // Native fetch normalizes Host to the URL, so use HTTP to exercise the actual header.
  const status = await new Promise<number | undefined>((resolve, reject) => {
    const req = request(
      base + '/api/blueprint',
      { method: 'POST', headers: { host: 'rebound.example', 'content-type': 'application/json' } },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    req.on('error', reject);
    req.end(JSON.stringify(exampleContext));
  });
  assert.equal(status, 403);
});
test('valid curriculum produces a structured blueprint', async () => {
  const response = await post('/api/blueprint', exampleContext);
  assert.equal(response.status, 200);
  const blueprint = await response.json();
  assert.equal(blueprint.steps.length, 5);
});
test('reviewed PDF pages reach generation without a retyped curriculum brief', async () => {
  const source = fixtureSource();
  const response = await post('/api/blueprint', {
    ...exampleContext,
    curriculum: '',
    curriculumSources: [source],
  });
  assert.equal(response.status, 200);
  assert.equal(lastContext?.curriculum, '');
  assert.deepEqual(lastContext?.curriculumSources, [source]);
});
test('invalid source pages are rejected before generation', async () => {
  const source = fixtureSource();
  source.pages[0].page = source.pageCount + 1;
  const beforeCalls = calls;
  const response = await post('/api/blueprint', { ...exampleContext, curriculumSources: [source] });
  assert.equal(response.status, 400);
  assert.equal(calls, beforeCalls);
});
test('lesson generation requires approval and valid learning-step references', async () => {
  const draft = createUnit(exampleContext, exampleBlueprint(), 'example');
  assert.equal((await post('/api/lesson', { unit: draft, stepIds: ['step-1'] })).status, 409);
  const approved = approveUnit(draft);
  assert.equal((await post('/api/lesson', { unit: approved, stepIds: ['missing'] })).status, 409);
  const response = await post('/api/lesson', { unit: approved, stepIds: ['step-1', 'step-2'] });
  assert.equal(response.status, 200);
  assert.ok(
    (await response.json()).languagePurpose.includes(approved.blueprint.steps[0].languageFocus),
  );
});
test('provider failures return a useful error without provider details', async () => {
  const response = await post('/api/blueprint', { ...exampleContext, title: 'Provider failure' });
  assert.equal(response.status, 502);
  const body = await response.text();
  assert.ok(body.includes('input has been kept'));
  assert.ok(!body.includes('provider-private-secret'));
});
test('malformed JSON gets a readable error rather than a stack trace', async () => {
  const response = await fetch(base + '/api/blueprint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{no',
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'The planning request could not be read.' });
});
