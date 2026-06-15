# Sprint 1 - timetable

## Status: COMPLETE
Merged to `main` via PR #4 (2026-06-05). Verified on production: sign-in, sidebar active state,
dashboard greeting, and timetable add/edit/delete all work; renders on phone. DB writes confirmed
through the UI.

## Goal
A fully working timetable showing your real uni and work schedule. Recurring weekly events and one-off events. Add, edit, delete from the UI.

## Branch
`sprint-1`

## Done when
- [x] A general week view shows your real events (any type, recurring or one-off).
- [x] You can add, edit, and delete events from the UI.
- [x] An optional seed script can bulk-load a whole week from a single file.
- [x] Deployed and working on phone.

## Layer 1 - schema
Add to `prisma/schema.prisma`:
```prisma
model TimetableEvent {
  id          String   @id @default(cuid())
  userId      String
  title       String
  type        String
  color       String   @default("#378ADD")
  dayOfWeek   Int?
  startTime   String
  endTime     String
  isRecurring Boolean  @default(true)
  specificDate DateTime?
  location    String?
  notes       String?
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
}
```
Run: `npx prisma migrate dev --name add-timetable`
Commit: `"add timetable schema"`

## Layer 2 - server actions
Create `src/actions/timetable.ts` with:
- `getEvents()` - fetch all events for the current user
- `createEvent(data)` - create a new event, validate with Zod
- `updateEvent(id, data)` - update an existing event
- `deleteEvent(id)` - delete an event

Create `scripts/update-timetable.ts` - a standalone script that clears all existing events for the user and re-inserts from a hardcoded array. Edit this file each semester.
Commit: `"add timetable server actions and seed script"`

## Layer 3 - UI
- `src/app/(app)/timetable/page.tsx` - timetable page (server component, fetches events)
- `src/components/modules/timetable/week-view.tsx` - 7-column week grid, events rendered as colored cards
- `src/components/modules/timetable/event-card.tsx` - individual event card (title, time, location)
- `src/components/modules/timetable/event-modal.tsx` - shadcn Dialog for add/edit form
- Add "Timetable" link to the sidebar
Commit: `"add timetable UI components"`

## Layer 4 - deploy
- Run `npx tsx scripts/update-timetable.ts` to seed your real schedule.
- Push, deploy, confirm on phone.
- Merge to main.
