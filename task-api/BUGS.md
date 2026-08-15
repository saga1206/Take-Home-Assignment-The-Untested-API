# Bug Report

Found via unit tests (`tests/taskService.test.js`) and integration tests
(`tests/tasks.routes.test.js`). All four are reproducible — see the referenced
test names for exact repro steps.

---

## 1. `getPaginated` uses the wrong offset formula (off-by-one page)

**File:** `src/services/taskService.js`

**Expected:** `GET /tasks?page=1&limit=10` should return the first 10 tasks
(items 1–10). `page=2` should return items 11–20, etc. — standard 1-indexed
pagination.

**Actual:** `page=1&limit=10` returns items 11–20. The last page returns
nothing even though 5 tasks remain unlisted.

**Why:** `getPaginated` computes `offset = page * limit`. For `page=1,
limit=10` that gives `offset=10`, skipping the entire first page. The formula
needs to be 0-indexed internally: `offset = (page - 1) * limit`.

**How discovered:** `getPaginated` unit tests (3 failures) and the
`GET /tasks?page=&limit=` integration tests (2 failures).

**Fix:**
```js
const getPaginated = (page, limit) => {
  const offset = (page - 1) * limit;
  return tasks.slice(offset, offset + limit);
};
```

---

## 2. `getByStatus` does substring matching instead of exact matching

**File:** `src/services/taskService.js`

**Expected:** `GET /tasks?status=todo` should return only tasks with
`status === 'todo'`.

**Actual:** `t.status.includes(status)` does substring matching, so a query
like `status=do` matches both `todo` and `done`. Even legitimate values can
cross-match unexpectedly since `todo` is a substring check, not equality.

**How discovered:** `getByStatus` unit test asserting exact match with a
substring query returned 2 results instead of 0.

**Fix:**
```js
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

---

## 3. `update` has no field whitelist — clients can overwrite `id` and `createdAt`

**File:** `src/services/taskService.js`, used by `PUT /tasks/:id`

**Expected:** `PUT /tasks/:id` should only allow updating mutable fields
(`title`, `description`, `status`, `priority`, `dueDate`, `completedAt`).
`id` and `createdAt` should be immutable once a task is created.

**Actual:** `update()` does `{ ...tasks[index], ...fields }` with no
filtering, so sending `{ "id": "hacked-id" }` in a `PUT` body silently
changes the task's id. This breaks any future lookup on the original id and
could let a client collide with another task's id.

**How discovered:** Unit test sending `id` and `createdAt` in the update
payload and asserting they remain unchanged.

**Fix:** Whitelist allowed fields before merging:
```js
const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const { title, description, status, priority, dueDate, completedAt } = fields;
  const patch = Object.fromEntries(
    Object.entries({ title, description, status, priority, dueDate, completedAt })
      .filter(([, v]) => v !== undefined)
  );

  const updated = { ...tasks[index], ...patch };
  tasks[index] = updated;
  return updated;
};
```

---

## 4. `completeTask` resets `priority` to `'medium'` instead of preserving it

**File:** `src/services/taskService.js`

**Expected:** Marking a task complete should only change `status` and
`completedAt`. Priority is unrelated to completion and should be left as-is.

**Actual:** `completeTask` unconditionally sets `priority: 'medium'`,
silently downgrading a `high`-priority task on completion. This looks like a
copy-paste leftover from a default-value object rather than intentional
behavior.

**How discovered:** Unit test completing a `high`-priority task and
asserting priority is unchanged; got `medium` instead.

**Fix:**
```js
const completeTask = (id) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };

  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;
  return updated;
};
```