# LifeTrack — sprints overview

## How sprints work
- Each sprint is a vertical slice: schema → server actions → UI → deployed and usable.
- Never start the next layer if the current one has errors.
- Each sprint lives on its own branch (sprint-0, sprint-1, etc.).
- Merge to main via PR only when the sprint is fully working and tested on phone.
- Design the UI for a sprint before building it. Design one sprint ahead.

## Progress tracker

| Sprint | Branch | Focus | Status |
|--------|--------|-------|--------|
| 0 | sprint-0 | Foundation: auth, layout shell, Vercel deploy | not started |
| 1 | sprint-1 | Timetable: week view, recurring + one-off events | not started |
| 2 | sprint-2 | Notes + daily journal | not started |
| 3 | sprint-3 | Money dashboard: income, expenses, savings goals | not started |
| 4 | sprint-4 | Vault (PIN protected) + literature reviews | not started |
| 5 | sprint-5 | Habits, health, jobs pipeline, future timeline | not started |

## Sprint status key
- `not started` — branch not created yet
- `in progress` — branch created, work underway
- `in review` — PR open, testing on phone
- `done` — merged to main, live on Vercel

## What done means for each sprint

**Sprint 0:** sign in with Google works on laptop and phone, empty sidebar visible, app live on Vercel, no TypeScript errors.

**Sprint 1:** real uni and work schedule visible in week view, events are add/edit/delete from UI, seed script populates timetable from a single file.

**Sprint 2:** notes are created, edited, deleted, and filtered by tag. daily journal entries save with mood score. past entries browsable by date.

**Sprint 3:** income and expenses log in ZAR, savings goals show progress toward target, Recharts dashboard shows spending by category and monthly summary.

**Sprint 4:** vault requires PIN before showing documents, documents upload to Cloudinary, literature entries support PDF or link with personal notes.

**Sprint 5:** habits check in daily (boolean or countable), meals log by type, job applications track full pipeline from applied to outcome, timeline shows life milestones.

## Maintenance reminders
- Timetable changed: edit scripts/update-timetable.ts and run it.
- New savings goal: edit scripts/update-goals.ts and run it.
- Toggle a module: set enabled true or false in config/modules.config.ts and push.
- Schema change: edit prisma/schema.prisma, run npx prisma migrate dev --name describe-change, commit both files.
- Add a module: follow docs/05-adding-a-module.md step by step.

## Design workflow
- Design the sidebar shell and dashboard layout before Sprint 0.
- Design each module's screens before the sprint that builds it.
- Lock in colour palette, sidebar style, and card style upfront — all sprints inherit them.
