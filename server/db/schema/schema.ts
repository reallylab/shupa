import {
  blob,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";
import { CardData, DeckData, SessionData } from "./types";
import { sql, type SQL } from "drizzle-orm";

export const deck = sqliteTable(
  "decks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    data: text({ mode: "json" })
      .$type<DeckData>()
      .notNull()
      .default({ name: "new deck" }),
    ownedBy: text("owned_by").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$onUpdateFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("idx_decks_owned_by").on(table.ownedBy)],
);

export const card = sqliteTable(
  "cards",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    data: text({ mode: "json" }).$type<CardData>().notNull(),
    front: text("front")
      .generatedAlwaysAs(
        (): SQL => sql`json_extract(${card.data}, '$.front.content')`,
        { mode: "stored" },
      )
      .notNull(),
    deckId: text("deck_id").notNull(),
    ownedBy: text("owned_by").notNull(),
    nextDue: integer("next_due", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$onUpdateFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("idx_cards_deck_id_next_due").on(table.deckId, table.nextDue),
    index("idx_cards_owned_by_next_due").on(table.ownedBy, table.nextDue),
    index("idx_cards_front").on(table.front),
  ],
);

export const session = sqliteTable(
  "sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    data: text({ mode: "json" }).$type<SessionData>().notNull(),
    ownedBy: text("owned_by").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$onUpdateFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("idx_sessions_owned_by").on(table.ownedBy)],
);
