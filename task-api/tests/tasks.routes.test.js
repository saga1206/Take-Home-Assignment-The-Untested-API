const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('GET /', () => {
  test('returns a welcome message with API info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
    expect(res.body.endpoints).toBeDefined();
  });
});

describe('POST /tasks', () => {
  test('creates a task and returns 201 with the task body', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Write tests', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Write tests');
    expect(res.body.priority).toBe('high');
    expect(res.body.id).toBeDefined();
  });

  test('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({ priority: 'high' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 for an invalid status value', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Bad status', status: 'not-a-status' });
    expect(res.status).toBe(400);
  });
});

describe('GET /tasks', () => {
  test('returns an empty array when there are no tasks', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all created tasks', async () => {
    await request(app).post('/tasks').send({ title: 'A' });
    await request(app).post('/tasks').send({ title: 'B' });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('GET /tasks?status=', () => {
  test('filters tasks by exact status', async () => {
    await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'B', status: 'done' });

    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('A');
  });

  test('returns an empty array for a status with no matching tasks', async () => {
    await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
    const res = await request(app).get('/tasks?status=done');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /tasks?page=&limit=', () => {
  beforeEach(async () => {
    for (let i = 1; i <= 15; i++) {
      await request(app).post('/tasks').send({ title: `Task ${i}` });
    }
  });

  test('page 1 returns the first `limit` tasks', async () => {
    const res = await request(app).get('/tasks?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
    expect(res.body[0].title).toBe('Task 1');
  });

  test('page 2 returns the remaining tasks', async () => {
    const res = await request(app).get('/tasks?page=2&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
    expect(res.body[0].title).toBe('Task 11');
  });
});

describe('PUT /tasks/:id', () => {
  test('updates an existing task and returns 200', async () => {
    const created = (await request(app).post('/tasks').send({ title: 'Original' })).body;
    const res = await request(app).put(`/tasks/${created.id}`).send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  test('returns 404 for a non-existent task', async () => {
    const res = await request(app).put('/tasks/does-not-exist').send({ title: 'X' });
    expect(res.status).toBe(404);
  });

  test('returns 400 for an invalid priority value', async () => {
    const created = (await request(app).post('/tasks').send({ title: 'Original' })).body;
    const res = await request(app)
      .put(`/tasks/${created.id}`)
      .send({ priority: 'not-a-priority' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  test('deletes an existing task and returns 204', async () => {
    const created = (await request(app).post('/tasks').send({ title: 'To delete' })).body;
    const res = await request(app).delete(`/tasks/${created.id}`);
    expect(res.status).toBe(204);

    const getRes = await request(app).get('/tasks');
    expect(getRes.body).toHaveLength(0);
  });

  test('returns 404 for a non-existent task', async () => {
    const res = await request(app).delete('/tasks/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test('marks a task complete and returns 200', async () => {
    const created = (await request(app).post('/tasks').send({ title: 'Finish me' })).body;
    const res = await request(app).patch(`/tasks/${created.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  test('returns 404 for a non-existent task', async () => {
    const res = await request(app).patch('/tasks/does-not-exist/complete');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/assign', () => {
  test('assigns a task and returns 200 with the updated task', async () => {
    const created = (await request(app).post('/tasks').send({ title: 'Assign me' })).body;
    const res = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: 'Priya' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Priya');
  });

  test('returns 404 for a non-existent task', async () => {
    const res = await request(app)
      .patch('/tasks/does-not-exist/assign')
      .send({ assignee: 'Priya' });
    expect(res.status).toBe(404);
  });

  test('returns 400 when assignee is missing', async () => {
    const created = (await request(app).post('/tasks').send({ title: 'A' })).body;
    const res = await request(app).patch(`/tasks/${created.id}/assign`).send({});
    expect(res.status).toBe(400);
  });

  test('returns 400 when assignee is an empty string', async () => {
    const created = (await request(app).post('/tasks').send({ title: 'A' })).body;
    const res = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: '   ' });
    expect(res.status).toBe(400);
  });

  test('allows reassigning to a different assignee', async () => {
    const created = (await request(app).post('/tasks').send({ title: 'A' })).body;
    await request(app).patch(`/tasks/${created.id}/assign`).send({ assignee: 'Priya' });
    const res = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: 'Amit' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Amit');
  });
});


describe('GET /tasks/stats', () => {
  test('returns zero counts when there are no tasks', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('returns correct counts by status', async () => {
    await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'B', status: 'done' });
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(1);
    expect(res.body.done).toBe(1);
  });
});