import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export type Locale = "fr" | "de" | "en";
export type SetScore = [number, number];

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull().default("#3B82F6"),
    locale: text("locale").$type<Locale>().notNull().default("fr"),
    playtomicLevel: numeric("playtomic_level", { precision: 4, scale: 2 }),
    playtomicUrl: text("playtomic_url"),
    elo: integer("elo").notNull().default(1200),
    gamesPlayed: integer("games_played").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    streak: integer("streak").notNull().default(0), // >0 victoires d'affilée, <0 défaites
    bestStreak: integer("best_streak").notNull().default(0),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playedAt: timestamp("played_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    a1: uuid("a1").notNull().references(() => users.id),
    a2: uuid("a2").notNull().references(() => users.id),
    b1: uuid("b1").notNull().references(() => users.id),
    b2: uuid("b2").notNull().references(() => users.id),
    sets: jsonb("sets").$type<SetScore[]>().notNull(),
    winner: text("winner").$type<"A" | "B">().notNull(),
    eloDeltaA: integer("elo_delta_a").notNull(),
    eloDeltaB: integer("elo_delta_b").notNull(),
    sessionId: uuid("session_id"),
    challengeId: uuid("challenge_id"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("matches_played_idx").on(t.playedAt)],
);

export const ratingHistory = pgTable(
  "rating_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    matchId: uuid("match_id").notNull().references(() => matches.id),
    eloBefore: integer("elo_before").notNull(),
    eloAfter: integer("elo_after").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rating_user_idx").on(t.userId, t.createdAt)],
);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  durationMin: integer("duration_min").notNull().default(90),
  courts: integer("courts").notNull().default(1),
  location: text("location").notNull().default(""),
  playtomicUrl: text("playtomic_url"),
  note: text("note"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionPlayers = pgTable(
  "session_players",
  {
    sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.userId] })],
);

export type ChallengeStatus = "pending" | "accepted" | "declined" | "played";

export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  from1: uuid("from1").notNull().references(() => users.id),
  from2: uuid("from2").references(() => users.id),
  to1: uuid("to1").notNull().references(() => users.id),
  to2: uuid("to2").references(() => users.id),
  message: text("message"),
  reply: text("reply"),
  status: text("status").$type<ChallengeStatus>().notNull().default("pending"),
  proposedAt: timestamp("proposed_at", { withTimezone: true }),
  matchId: uuid("match_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userBadges = pgTable(
  "user_badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    badge: text("badge").notNull(),
    matchId: uuid("match_id"),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_badge_idx").on(t.userId, t.badge)],
);

export type EventType =
  | "match_played"
  | "new_leader"
  | "streak"
  | "badge_earned"
  | "new_player"
  | "session_created"
  | "challenge_sent"
  | "challenge_accepted"
  | "challenge_declined"
  | "americano_finished"
  | "month_king";

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").$type<EventType>().notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_created_idx").on(t.createdAt)],
);

export const tournaments = pgTable("tournaments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  mode: text("mode").$type<"americano" | "mexicano">().notNull().default("americano"),
  pointsPerMatch: integer("points_per_match").notNull().default(16),
  courts: integer("courts").notNull().default(2),
  status: text("status").$type<"draft" | "running" | "finished">().notNull().default("draft"),
  currentRound: integer("current_round").notNull().default(0),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tournamentPlayers = pgTable(
  "tournament_players",
  {
    tournamentId: uuid("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.tournamentId, t.userId] })],
);

export const tournamentMatches = pgTable(
  "tournament_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    court: integer("court").notNull(),
    a1: uuid("a1").notNull().references(() => users.id),
    a2: uuid("a2").notNull().references(() => users.id),
    b1: uuid("b1").notNull().references(() => users.id),
    b2: uuid("b2").notNull().references(() => users.id),
    scoreA: integer("score_a"),
    scoreB: integer("score_b"),
  },
  (t) => [index("tm_tournament_idx").on(t.tournamentId, t.round)],
);

export const usersRelations = relations(users, ({ many }) => ({
  badges: many(userBadges),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, { fields: [userBadges.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type TournamentMatch = typeof tournamentMatches.$inferSelect;
