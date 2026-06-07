# Sprint 3 — money dashboard

## Goal
Full income and expense tracking with savings goals and a visual dashboard in ZAR.

## Branch
`sprint-3`

## Done when
- You can log income and expenses with categories.
- Savings goals show progress bars toward a ZAR target.
- A Recharts dashboard shows spending by category and savings progress.
- Deployed and working on phone.

## Layer 1 — schema
Add Transaction and SavingsGoal models. Run migration.
Commit: `"add money schema"`

## Layer 2 — server actions
- `src/actions/money.ts` — createTransaction, updateTransaction, deleteTransaction, getTransactions
- `src/actions/goals.ts` — createGoal, updateGoal, deleteGoal, getGoals
- `scripts/update-goals.ts` — seed or update savings goals from a script
Commit: `"add money server actions"`

## Layer 3 — UI
- Dashboard page with Recharts: spending by category (pie), monthly income vs expense (bar), savings goals (progress bars)
- Transaction log: list with date, category, amount, description
- Add/edit transaction modal
- Add/edit goal modal
- Add to sidebar
Commit: `"add money dashboard UI"`

## Layer 4 — deploy
Push, deploy, log first real transaction and goal, merge to main.

## Note
Design expanded this sprint from 3 to 5 screens: dashboard, transaction log, savings goals, shopping
list, wishlist (see `design/sprint-3-screens.md`). Built schema -> actions -> UI on `sprint-3`; PR open
to main. Production verification pending.
