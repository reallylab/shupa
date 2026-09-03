import { LibSQLDatabase, LibSQLTransaction } from "drizzle-orm/libsql";
import { noThrow } from "./util";
import * as schema from "../db/schema";
import {
  eq,
  ExtractTablesWithRelations,
  sql,
  type SQLWrapper,
} from "drizzle-orm";
import { CardBack, CardFront, DeckData } from "../db/schema/types";
import { SQLiteTransaction } from "drizzle-orm/sqlite-core";
import { ResultSet } from "@libsql/client";

export type DB = LibSQLDatabase<typeof schema>;
export type Transaction = SQLiteTransaction<
  "async",
  ResultSet,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export type CreateDeckParams = {
  ownedBy: string;
  name: string;
  description?: string;
};
export const createDeck = noThrow(async (db: DB, params: CreateDeckParams) => {
  await db.insert(schema.deck).values({
    ownedBy: params.ownedBy,
    data: {
      name: params.name,
      description: params.description,
    },
  });
});

export type GetDeckParams = {
  id?: string;
  ownedBy?: string;
};
export const getDeck = noThrow(
  async (db: DB | Transaction, params: GetDeckParams) => {
    if (!params.id && !params.ownedBy) {
      throw new Error("missing required params: id | ownedBy");
    }
    return await db.query.deck.findFirst({
      where: (deck, { eq, and }) => {
        const qs: SQLWrapper[] = [];
        if (params.id) qs.push(eq(deck.id, params.id));
        if (params.ownedBy) qs.push(eq(deck.ownedBy, params.ownedBy));
        return and(...qs);
      },
    });
  },
);

export type UpdateDeckParams = {
  id: string;
  data?: DeckData;
};
export const updateDeck = noThrow(
  async (db: DB | Transaction, params: UpdateDeckParams) => {
    await db
      .update(schema.deck)
      .set({
        data: sql`COALESCE(${params.data}, ${schema.deck.data})`,
      })
      .where(eq(schema.deck.id, params.id));
  },
);

export type CreateCardParams = {
  ownedBy: string;
  deckId: string;
  front: CardFront;
  back: CardBack;
};
export const createCard = noThrow(async (db: DB, params: CreateCardParams) => {
  await db.insert(schema.card).values({
    ownedBy: params.ownedBy,
    deckId: params.deckId,
    data: {
      back: params.back,
      front: params.front,
      history: [],
    },
  });
});

export type GetCardsParams = {
  lastId?: string;
  limit?: number;
};
export const getCards = noThrow(async (db: DB, params: GetCardsParams) => {
  const limit = params.limit || 50;
  return await db.query.card.findMany({
    where: (card, { lt, and }) => {
      const qs: SQLWrapper[] = [];
      if (params.lastId) qs.push(lt(card.id, params.lastId));
      return and(...qs);
    },
    limit,
    orderBy: (card, { desc }) => desc(card.id),
  });
});
