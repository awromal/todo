const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

let server;
let baseUrl;

describe('TaskFlow MERN Backend Tests', () => {
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('GET /health returns healthy status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.status, 'healthy');
    assert.ok(json.database);
  });

  test('GET /tasks returns initial list of tasks', async () => {
    const res = await fetch(`${baseUrl}/tasks`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));
  });

  test('POST /tasks creates a task with validation', async () => {
    // Missing title should fail
    const badRes = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'No title' }),
    });
    assert.strictEqual(badRes.status, 400);

    // Valid task creation
    const goodRes = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Automated Test Task',
        description: 'Testing task creation via node:test',
        priority: 'high',
        status: 'todo',
      }),
    });
    assert.strictEqual(goodRes.status, 201);
    const json = await goodRes.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.title, 'Automated Test Task');
    assert.strictEqual(json.data.priority, 'high');

    // Verify GET /tasks/:id
    const id = json.data._id;
    const getRes = await fetch(`${baseUrl}/tasks/${id}`);
    assert.strictEqual(getRes.status, 200);
    const getJson = await getRes.json();
    assert.strictEqual(getJson.data._id, id);

    // Verify PUT /tasks/:id
    const putRes = await fetch(`${baseUrl}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    assert.strictEqual(putRes.status, 200);
    const putJson = await putRes.json();
    assert.strictEqual(putJson.data.status, 'completed');

    // Verify DELETE /tasks/:id
    const delRes = await fetch(`${baseUrl}/tasks/${id}`, {
      method: 'DELETE',
    });
    assert.strictEqual(delRes.status, 200);

    // Verify 404 after deletion
    const notFoundRes = await fetch(`${baseUrl}/tasks/${id}`);
    assert.strictEqual(notFoundRes.status, 404);
  });

  test('GET /tasks/stats/summary returns metric counters', async () => {
    const res = await fetch(`${baseUrl}/tasks/stats/summary`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(typeof json.data.total === 'number');
    assert.ok(json.data.breakdown);
  });
});
