import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import path from "node:path";
import Database from "better-sqlite3";
import { cleanupSeededReviews } from "./p0-cleanup";

test("P0 migration removes seeded reviews without deleting referenced users", () => {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE users (id text PRIMARY KEY);
    CREATE TABLE projects (
      id integer PRIMARY KEY,
      submitted_by_id text,
      claimed_by_id text
    );
    CREATE TABLE reviews (id integer PRIMARY KEY, user_id text NOT NULL);
    CREATE TABLE stars (project_id integer NOT NULL, user_id text NOT NULL);
    CREATE TABLE comments (id integer PRIMARY KEY, user_id text NOT NULL);
    CREATE TABLE claims (id integer PRIMARY KEY, user_id text NOT NULL);
    CREATE TABLE project_maintainers (id integer PRIMARY KEY, added_by_id text);
  `);

  const seedUsers = [
    "user_seed_review_only",
    "user_seed_star",
    "user_seed_comment",
    "user_seed_submit",
    "user_seed_claimant",
    "user_seed_claim",
    "user_seed_maintainer",
  ];
  const insertUser = sqlite.prepare("INSERT INTO users (id) VALUES (?)");
  for (const id of [...seedUsers, "user_real", "userXseedYorganic"]) insertUser.run(id);

  const insertReview = sqlite.prepare("INSERT INTO reviews (user_id) VALUES (?)");
  for (const id of seedUsers) insertReview.run(id);
  insertReview.run("user_real");
  insertReview.run("userXseedYorganic");

  sqlite.prepare(
    "INSERT INTO projects (id, submitted_by_id, claimed_by_id) VALUES (1, ?, ?)",
  ).run("user_seed_submit", "user_seed_claimant");
  sqlite.prepare("INSERT INTO stars VALUES (1, ?)").run("user_seed_star");
  sqlite.prepare("INSERT INTO comments (user_id) VALUES (?)").run("user_seed_comment");
  sqlite.prepare("INSERT INTO claims (user_id) VALUES (?)").run("user_seed_claim");
  sqlite.prepare("INSERT INTO project_maintainers (added_by_id) VALUES (?)").run(
    "user_seed_maintainer",
  );

  const migration = fs
    .readFileSync(path.join(process.cwd(), "drizzle/0007_p0-trust-cleanup.sql"), "utf8")
    .replaceAll("--> statement-breakpoint", "");
  sqlite.exec(migration);

  const reviews = sqlite.prepare("SELECT user_id FROM reviews ORDER BY user_id").all();
  assert.deepEqual(reviews, [
    { user_id: "userXseedYorganic" },
    { user_id: "user_real" },
  ]);

  const users = sqlite.prepare("SELECT id FROM users ORDER BY id").all();
  assert.deepEqual(
    users,
    [
      "userXseedYorganic",
      "user_real",
      "user_seed_claim",
      "user_seed_claimant",
      "user_seed_comment",
      "user_seed_maintainer",
      "user_seed_star",
      "user_seed_submit",
    ].map((id) => ({ id })),
  );

  insertUser.run("user_seed_unjournaled");
  insertReview.run("user_seed_unjournaled");
  assert.deepEqual(cleanupSeededReviews(sqlite), { reviews: 1, users: 1 });
  assert.deepEqual(cleanupSeededReviews(sqlite), { reviews: 0, users: 0 });

  sqlite.close();
});