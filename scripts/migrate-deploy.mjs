import { spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

// Runs prisma migrate deploy for the build, retrying while the database is only
// briefly unreachable. Neon suspends an idle compute and can refuse the first
// connection, which would otherwise fail a deploy that has nothing to do with
// the schema. A real migration error is reported straight away, never retried.
const BACKOFF_MS = [3000, 8000, 15000];
const TRANSIENT =
  /P1001|P1002|P1017|Can't reach database server|Timed out|Server has closed the connection/i;

for (let attempt = 0; ; attempt++) {
  const run = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    encoding: "utf8",
    shell: true,
  });
  process.stdout.write(run.stdout ?? "");
  process.stderr.write(run.stderr ?? "");
  if (run.status === 0) process.exit(0);

  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  const spent = attempt >= BACKOFF_MS.length;
  if (spent || !TRANSIENT.test(output)) {
    console.error(
      spent
        ? `Migration failed after ${BACKOFF_MS.length + 1} attempts.`
        : "Migration failed with a non-connection error.",
    );
    process.exit(run.status ?? 1);
  }

  const wait = BACKOFF_MS[attempt];
  console.warn(`Database unreachable, retrying in ${wait / 1000}s.`);
  await sleep(wait);
}
