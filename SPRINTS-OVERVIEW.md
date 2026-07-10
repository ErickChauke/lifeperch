# LifePerch - sprints overview

## How sprints work
- Each sprint is a vertical slice: schema → server actions → UI → deployed and usable.
- Never start the next layer if the current one has errors.
- Each sprint lives on its own branch (sprint-0, sprint-1, etc.).
- Merge to main via PR only when the sprint is fully working and tested on phone.
- Design the UI for a sprint before building it. Design one sprint ahead.

## Progress tracker

_Sprints 0-10 are all done and merged to main. Since sprint-6, work has continued as small feature-branch PRs off main rather than numbered sprint branches._

| Sprint | Branch | Focus | Status |
|--------|--------|-------|--------|
| 0 | sprint-0 | Foundation: auth, layout shell, Vercel deploy | done |
| 1 | sprint-1 | Timetable: week view, recurring + one-off events | done |
| 2 | sprint-2 | Notes + daily journal | done |
| 3 | sprint-3 | Money dashboard: income, expenses, savings goals | done |
| 4 | sprint-4 | Vault (PIN protected) + literature reviews | done |
| 5 | sprint-5 | Habits, health, jobs pipeline, future timeline | done |
| 6 | sprint-6 | Pinned viewport layout | done |
| 7 | sprint-7 | Todo | done |
| 8 | sprint-8 | Daily todo email digest | done |
| 9 | sprint-9 | Notes rich-text editor | done |
| 10 | sprint-10 | Vault collection cards (folders) | done |

## Sprint status key
- `not started` - branch not created yet
- `in progress` - branch created, work underway
- `in review` - PR open, testing on phone
- `done` - merged to main, live on Vercel

## What done means for each sprint

**Sprint 0:** sign in with Google works on laptop and phone, empty sidebar visible, app live on Vercel, no TypeScript errors.

**Sprint 1:** real uni and work schedule visible in week view, events are add/edit/delete from UI, seed script populates timetable from a single file.

**Sprint 2:** notes are created, edited, deleted, and filtered by tag. daily journal entries save with mood score. past entries browsable by date.

**Sprint 3:** income and expenses log in ZAR, savings goals show progress toward target, Recharts dashboard shows spending by category and monthly summary.

**Sprint 4:** vault requires PIN before showing documents, documents upload to Cloudinary, literature entries support PDF or link with personal notes.

**Sprint 5:** habits check in daily (boolean or countable), meals log by type, job applications track full pipeline from applied to outcome, timeline shows life milestones.

**Sprint 6:** the window never scrolls on any route, the sidebar is fixed on desktop and an off-canvas drawer on mobile, each page pins its header and scrolls its own body.

**Sprint 7:** todos live in collections, support dateless, dated, and recurring tasks with priority and cross-module links, and surface a today view.

**Sprint 8:** a scheduled cron emails the day's todos to users who opted in to the daily digest.

**Sprint 9:** notes and journal entries support a rich-text editor alongside markdown.

**Sprint 10:** the vault holds PIN-gated collection cards (folders) with an optional per-card password and a reset flow.

## Maintenance reminders
- Timetable changed: edit scripts/update-timetable.ts and run it.
- New savings goal: edit scripts/update-goals.ts and run it.
- Toggle a module: set enabled true or false in config/modules.config.ts and push.
- Schema change: edit prisma/schema.prisma, run npx prisma migrate dev --name describe-change, commit both files.
- Add a module: follow docs/05-adding-a-module.md step by step.

## Design workflow
- Design the sidebar shell and dashboard layout before Sprint 0.
- Design each module's screens before the sprint that builds it.
- Lock in colour palette, sidebar style, and card style upfront - all sprints inherit them.
