# Submission Notes

## What I'd test next with more time

- Concurrent request handling — the in-memory store is a plain array with
  no locking. Two simultaneous writes (e.g. two `PUT`s on the same task)
  could race, though Node's single-threaded event loop makes this less
  likely to surface in practice than in a multi-threaded server.
- `PATCH /tasks/:id/assign` edge cases beyond what's covered: very long
  assignee strings, assignee values with only whitespace mixed with real
  characters (`"  Priya  "` — currently not trimmed before storage).
- `getPaginated` with `limit=0` or negative `page`/`limit` values — not
  currently validated at the route level, so `page=-1` or `limit=0` would
  hit `parseInt` fallbacks in `routes/tasks.js` but the service function
  itself has no guard.
- Load/perf behavior once the in-memory array holds a large number of
  tasks (e.g. `getByStatus` and `getPaginated` are O(n) scans, fine at this
  scale but would need pagination-aware indexing in a real system).

## What surprised me

- The `completeTask` priority reset (`priority: 'medium'` hardcoded on
  every completion) reads like a copy-paste leftover from a "create task
  defaults" object rather than intentional business logic — there's no
  comment or test anywhere suggesting completing a task should also
  downgrade its priority.
- `update()` had no field whitelist at all, which meant a `PUT` request
  could silently overwrite a task's own `id`. That's the kind of bug that's
  easy to miss by reading the code casually (the merge looks reasonable)
  but is obvious the moment you write a test for it.
- The README and ASSIGNMENT.md disagree on the exact status enum values
  (`pending/in-progress/completed` vs `todo/in_progress/done`) — the code
  itself uses the latter, so I treated ASSIGNMENT.md/code as the source of
  truth and assumed the README is just stale documentation.

## Questions I'd ask before shipping to production

- Is the in-memory store intentional for this stage, or is a real
  database (Postgres/Mongo) coming next? That affects whether it's worth
  investing more in concurrency safety now.
- Should `PATCH /tasks/:id/assign` validate that `assignee` refers to a
  real user (e.g. against a users table/service), or is a free-text name
  acceptable long-term?
- Is reassigning an already-assigned task intended to be silent (as
  implemented here), or should it be logged/audited, given it could
  represent an important workflow event (e.g. reassigning someone else's
  task)?
- What's the expected behavior for `getByStatus` and `update` once fixed —
  should those two remaining bugs from `BUGS.md` be prioritized before
  this ships, given `update`'s ability to overwrite `id` looks like a
  data-integrity risk?
