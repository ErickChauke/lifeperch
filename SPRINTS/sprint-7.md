# Sprint 7 - todo

## Goal
A scheduled todo module: capture tasks with an optional date, an optional time block, a recurring weekly slot, priority and tags. View them as a list grouped by day and as a month calendar. Surface today and overdue on the dashboard, link a todo to any other module, and show time-blocked todos in the timetable grid. This realises the long-planned "Reminder" cross-link from `docs/03-data-models.md`.

## Branch
`sprint-7`

## Done when
- A todo can have no date (flexible backlog), a date, or a date plus a start/end time block.
- A todo can recur weekly on a chosen day.
- A todo has a priority (low / normal / high) and free-form tags.
- The list groups todos into Today / Tomorrow / This week / Later / No date.
- A month calendar shows dots on days with a due todo and selects a day to filter the list. Future days are selectable.
- Ticking a todo marks it done; a recurring todo done today reappears as pending the next day.
- The dashboard shows today and overdue todos with a quick-add field.
- A todo can link to another module and a chip jumps there.
- Time-blocked todos appear in the timetable weekly grid, visually distinct from events.
- Works on phone (two panes collapse to one column). Deployed.

## Layer 1 - schema
Add a `Todo` model and `todos Todo[]` on `User`:
- `id`, `userId`, `title`, `notes String?`
- `priority String @default("normal")`, `status String @default("pending")`
- `tags String[] @default([])`
- `isRecurring Boolean @default(false)`, `dayOfWeek Int?` (0=Mon..6=Sun)
- `specificDate DateTime? @db.Date` (one-off date; use the UTC-midnight day helpers, never a raw Date)
- `startTime String?`, `endTime String?` ("HH:MM" like TimetableEvent)
- `linkedModule String?`, `linkedId String?`, `linkedLabel String?`
- `completedAt DateTime?`, `createdAt`, `updatedAt`
- `user` relation with `onDelete: Cascade`

Completion stays simple: one `status` / `completedAt` per todo, no per-occurrence log. A recurring todo counts as done today only when `status == "done"` and `completedAt` falls on today; it is derived at read time and reverts to pending the next day. A `TodoLog` mirroring `HabitLog` is the upgrade path if per-day history is ever needed.

Run: `npx prisma migrate dev --name add-todo`
Commit: `"add todo schema"`

## Layer 2 - lib and server actions
`src/lib/todo.ts` (model on `src/lib/timetable.ts` and `src/lib/habits.ts`; reuse `dayToDate` / `dateToDay` from `@/lib/money` and `timeToMinutes` / `weekdayIndex` / `WEEKDAYS` from `@/lib/timetable`):
- Const enums: `PRIORITIES` (low / normal / high, each with label and palette token) plus `priorityRank`; `STATUSES`; `LINKABLE_MODULES` (`{ value, label, hrefBase }` for jobs, notes, literature, money, health, timeline, timetable) plus `linkHref(linkedModule, linkedId)`.
- `todoSchema` (Zod) with refinements: recurring requires `dayOfWeek`; `endTime` requires `startTime`; if both times set then end is after start; if `startTime` set there must be a day anchor (recurring day or a specific date). Export `type TodoInput = z.infer<typeof todoSchema>`.
- Pure helpers: `isOverdue`, `dueDay`, `bucketOf` (today / tomorrow / week / later / none), `groupByBucket`, `todoComparator` (overdue first, then timed ascending, then priority, done sinks), `isDoneToday`.

`src/actions/todo.ts` (model on `src/actions/timetable.ts`): `"use server"`, `requireUserId()`, `todoSchema.parse()` before writes, `updateMany` / `deleteMany` scoped to `{ id, userId }`, a `toRecord()` mapper (clears `specificDate` when recurring, clears `dayOfWeek` when not, empty strings to null, tags trimmed):
- `getTodos()` - all todos, ordered by `specificDate`, then `startTime`, then `createdAt`.
- `getTodayTodos()` - returns `{ today, overdue }` for the dashboard.
- `createTodo`, `updateTodo`, `toggleTodo` (flips status and sets / clears `completedAt`), `deleteTodo`.
- Every write, toggle and delete revalidates `/todo`, `/dashboard`, and `/timetable`.

Commit: `"add todo lib and server actions"`

## Layer 3 - todo page (list and calendar)
`src/components/modules/todo/`:
- `todo-board.tsx` - two-pane layout like `journal-board.tsx`: calendar on the left (`lg:w-[300px]`), grouped list in the main area; owns `selected` day and `creating` / `editing` modal state; computes today and the set of due days; renders one `TodoModal`; collapses to one column on mobile.
- `todo-calendar.tsx` - fork of `journal/calendar.tsx` with the future-day disable removed (todos schedule forward), Monday-first, dots on days with a due todo.
- `todo-list.tsx` - day-bucket sections via `groupByBucket` and `todoComparator`.
- `todo-row.tsx` - completion checkbox (`toggleTodo` in `useTransition`, optimistic strike-through, toast on failure), title, priority pip, tags, optional time badge, optional linked-module chip (`next/link` to `linkHref`, click stops propagation); row body click opens edit.
- `todo-modal.tsx` - fork the form skeleton of `timetable/event-modal.tsx` (recurring-vs-date toggle, `type="time"` inputs, delete button, React Hook Form + zodResolver + useTransition + sonner). Add a priority `Segmented` (reuse `@/components/modules/money/segmented`), a "time block" toggle revealing start/end, a tags input, and the link picker (a `Select` of `LINKABLE_MODULES` plus a free-text `linkedLabel`).

`src/app/(app)/todo/page.tsx` - server component, `getTodos()`, wrap in `PageShell` / `PageHeader`, render `TodoBoard`.

Register the module:
- `config/modules.config.ts`: add `{ id: "todo", label: "To-Do", href: "/todo", icon: "todo", group: "Daily", enabled: true }`.
- `src/components/layout/nav-links.tsx`: import `ListTodo` from lucide-react and add `todo: ListTodo` to the `ICONS` map.

Commit: `"add todo page with list and calendar"`

## Layer 4 - dashboard integration
In `src/app/(app)/dashboard/page.tsx` call `getTodayTodos()`.
- `src/components/modules/dashboard/todays-todos.tsx` - an Overdue list and a Today list above the quick-start grid, each row a slim line with a completion checkbox using `toggleTodo`.
- `src/components/modules/dashboard/quick-add-todo.tsx` - a title input plus button that calls `createTodo` with `specificDate` set to today and the defaults (normal priority, not recurring).
- Make the "Nothing scheduled, nothing overdue" copy conditional: show the lists when todos exist, fall back to the existing copy when empty. Keep the greeting and quick-start grid intact.

Commit: `"surface today and overdue todos on dashboard"`

## Layer 5 - timetable integration
Extend `src/components/modules/timetable/week-view.tsx` with optional `todos` and `onTodoClick` props. Render time-blocked todos as a distinct overlay (a `TodoBlockCard`, dashed or priority-tinted, done muted), reusing the existing `timeToMinutes` / `GRID_START_HOUR` / `HOUR_PX` positioning and the column-selection helper. In `src/app/(app)/timetable/page.tsx` fetch `getTodos()` alongside `getEvents()`, filter to time-blocked todos for the current week, and pass both through `TimetableBoard` to `WeekView`. Timetable todos are read-only for now: a block links to `/todo` so the timetable board stays decoupled from todo actions.

Commit: `"show time-blocked todos in timetable grid"`

## Layer 6 - docs and deploy
Add a `Todo` entry to `docs/03-data-models.md`, noting it realises the planned Reminder cross-link. Seed one todo of each type (dateless, dated, timed, recurring, linked). Push, deploy, confirm on phone, open a PR from `sprint-7` to `main`, merge when green.
Commit: `"document todo model"`
