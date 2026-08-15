const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('create', () => {
  test('creates a task with required title', () => {
    const task = taskService.create({ title: 'Write report' });
    expect(task.title).toBe('Write report');
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });

  test('applies default values', () => {
    const task = taskService.create({ title: 'Write report' });
    expect(task.description).toBe('');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
  });

  test('accepts explicit values instead of defaults', () => {
    const task = taskService.create({
      title: 'Ship feature',
      description: 'Do the thing',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-01-01T00:00:00.000Z',
    });
    expect(task.description).toBe('Do the thing');
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2026-01-01T00:00:00.000Z');
  });

  test('assigns unique ids to different tasks', () => {
    const t1 = taskService.create({ title: 'A' });
    const t2 = taskService.create({ title: 'B' });
    expect(t1.id).not.toBe(t2.id);
  });
});

describe('findById', () => {
  test('finds an existing task by id', () => {
    const created = taskService.create({ title: 'Findable' });
    const found = taskService.findById(created.id);
    expect(found).toEqual(created);
  });

  test('returns undefined for a non-existent id', () => {
    expect(taskService.findById('does-not-exist')).toBeUndefined();
  });
});

describe('getAll', () => {
  test('returns an empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  test('returns all created tasks', () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });
    expect(taskService.getAll()).toHaveLength(2);
  });

  test('returns a copy, not a reference to the internal store', () => {
    taskService.create({ title: 'A' });
    const result = taskService.getAll();
    result.push({ title: 'Injected' });
    expect(taskService.getAll()).toHaveLength(1);
  });
});

describe('getByStatus', () => {
  test('returns only tasks matching the exact status', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'done' });
    const result = taskService.getByStatus('todo');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A');
  });

  test('does not return tasks whose status merely contains the query as a substring', () => {
    // 'do' is a substring of both 'todo' and 'done' - exact match only
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'done' });
    const result = taskService.getByStatus('do');
    expect(result).toHaveLength(0);
  });

  test('returns an empty array when no tasks match', () => {
    taskService.create({ title: 'A', status: 'todo' });
    expect(taskService.getByStatus('done')).toEqual([]);
  });
});

describe('getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 25; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  test('page 1 returns the first `limit` tasks, starting from the first created task', () => {
    const result = taskService.getPaginated(1, 10);
    expect(result).toHaveLength(10);
    expect(result[0].title).toBe('Task 1');
    expect(result[9].title).toBe('Task 10');
  });

  test('page 2 returns the next `limit` tasks', () => {
    const result = taskService.getPaginated(2, 10);
    expect(result).toHaveLength(10);
    expect(result[0].title).toBe('Task 11');
    expect(result[9].title).toBe('Task 20');
  });

  test('last partial page returns remaining tasks', () => {
    const result = taskService.getPaginated(3, 10);
    expect(result).toHaveLength(5);
    expect(result[0].title).toBe('Task 21');
  });

  test('page beyond available data returns an empty array', () => {
    const result = taskService.getPaginated(10, 10);
    expect(result).toEqual([]);
  });
});

describe('update', () => {
  test('updates provided fields and leaves others unchanged', () => {
    const created = taskService.create({ title: 'Original', priority: 'low' });
    const updated = taskService.update(created.id, { title: 'Updated' });
    expect(updated.title).toBe('Updated');
    expect(updated.priority).toBe('low');
  });

  test('returns null when updating a non-existent id', () => {
    expect(taskService.update('nope', { title: 'X' })).toBeNull();
  });

  test('does not change the id or createdAt of the task', () => {
    const created = taskService.create({ title: 'Original' });
    const updated = taskService.update(created.id, { id: 'hacked-id', createdAt: 'fake-date' });
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
  });
});

describe('remove', () => {
  test('removes an existing task and returns true', () => {
    const created = taskService.create({ title: 'To delete' });
    const result = taskService.remove(created.id);
    expect(result).toBe(true);
    expect(taskService.findById(created.id)).toBeUndefined();
  });

  test('returns false when removing a non-existent id', () => {
    expect(taskService.remove('nope')).toBe(false);
  });
});

describe('completeTask', () => {
  test('sets status to done and sets completedAt', () => {
    const created = taskService.create({ title: 'Finish me' });
    const completed = taskService.completeTask(created.id);
    expect(completed.status).toBe('done');
    expect(completed.completedAt).not.toBeNull();
  });

  test('preserves the task priority instead of resetting it', () => {
    const created = taskService.create({ title: 'Finish me', priority: 'high' });
    const completed = taskService.completeTask(created.id);
    expect(completed.priority).toBe('high');
  });

  test('returns null for a non-existent id', () => {
    expect(taskService.completeTask('nope')).toBeNull();
  });
});


describe('assignTask', () => {
  test('sets the assignee on an existing task', () => {
    const created = taskService.create({ title: 'Assign me' });
    const updated = taskService.assignTask(created.id, 'Priya');
    expect(updated.assignee).toBe('Priya');
  });

  test('returns null for a non-existent id', () => {
    expect(taskService.assignTask('nope', 'Priya')).toBeNull();
  });

  test('allows reassigning a task that already has an assignee', () => {
    const created = taskService.create({ title: 'Reassign me' });
    taskService.assignTask(created.id, 'Priya');
    const reassigned = taskService.assignTask(created.id, 'Amit');
    expect(reassigned.assignee).toBe('Amit');
  });

  test('new tasks default to an unassigned (null) assignee', () => {
    const created = taskService.create({ title: 'Unassigned' });
    expect(created.assignee).toBeNull();
  });
});


describe('getStats', () => {
  test('returns zero counts and zero overdue when there are no tasks', () => {
    expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('counts tasks by status', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'todo' });
    taskService.create({ title: 'C', status: 'in_progress' });
    taskService.create({ title: 'D', status: 'done' });
    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  test('counts a task with a past due date and non-done status as overdue', () => {
    taskService.create({ title: 'Late', status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
    expect(taskService.getStats().overdue).toBe(1);
  });

  test('does not count a done task with a past due date as overdue', () => {
    taskService.create({ title: 'Late but done', status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });
    expect(taskService.getStats().overdue).toBe(0);
  });

  test('does not count a task with a future due date as overdue', () => {
    taskService.create({ title: 'Future', status: 'todo', dueDate: '2999-01-01T00:00:00.000Z' });
    expect(taskService.getStats().overdue).toBe(0);
  });
});