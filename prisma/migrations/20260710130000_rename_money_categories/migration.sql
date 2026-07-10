-- Rename money category strings to match the expanded preset labels. Three stored
-- values changed: 'Rent' -> 'Rent / Mortgage', 'Eating out' -> 'Eating Out',
-- 'Investment' -> 'Investments'. Applied across every table that stores a money
-- category so existing rows keep matching the dropdowns, and so 'Investment' rows
-- stay in the dashboard investment split (INVESTMENT_CATEGORY is now 'Investments').

UPDATE "Transaction" SET "category" = 'Rent / Mortgage' WHERE "category" = 'Rent';
UPDATE "Transaction" SET "category" = 'Eating Out' WHERE "category" = 'Eating out';
UPDATE "Transaction" SET "category" = 'Investments' WHERE "category" = 'Investment';

UPDATE "BudgetItem" SET "category" = 'Rent / Mortgage' WHERE "category" = 'Rent';
UPDATE "BudgetItem" SET "category" = 'Eating Out' WHERE "category" = 'Eating out';
UPDATE "BudgetItem" SET "category" = 'Investments' WHERE "category" = 'Investment';

UPDATE "ShoppingList" SET "category" = 'Rent / Mortgage' WHERE "category" = 'Rent';
UPDATE "ShoppingList" SET "category" = 'Eating Out' WHERE "category" = 'Eating out';
UPDATE "ShoppingList" SET "category" = 'Investments' WHERE "category" = 'Investment';

UPDATE "WishlistCollection" SET "category" = 'Rent / Mortgage' WHERE "category" = 'Rent';
UPDATE "WishlistCollection" SET "category" = 'Eating Out' WHERE "category" = 'Eating out';
UPDATE "WishlistCollection" SET "category" = 'Investments' WHERE "category" = 'Investment';

UPDATE "FixedItem" SET "category" = 'Rent / Mortgage' WHERE "category" = 'Rent';
UPDATE "FixedItem" SET "category" = 'Eating Out' WHERE "category" = 'Eating out';
UPDATE "FixedItem" SET "category" = 'Investments' WHERE "category" = 'Investment';
