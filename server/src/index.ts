import { Context, Hono } from "hono";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../db/schema";
import {
  createCard,
  createDeck,
  DB,
  getCards,
  getDeck,
  updateDeck,
} from "./repository";
import { noThrow, parseContent, verifyJWT } from "./util";
import { getCookie, setCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { bearerAuth } from "hono/bearer-auth";
import * as v from "valibot";

type AppContext = {
  Variables: Variables;
  Bindings: CloudflareBindings & {
    SETSUBI: {
      refresh: (refreshToken: string) => Promise<
        | {
            success: false;
            error: string;
          }
        | {
            success: true;
            data: string;
          }
      >;
    };
  };
};
type Variables = {
  db: DB;
  userId?: string;
};

const app = new Hono<AppContext>();
const auth = new Hono<AppContext>().basePath("/auth");
const deck = new Hono<AppContext>().basePath("/decks");
const card = new Hono<AppContext>().basePath("/cards");

// MIDDLEWARE ====================================================================

app.use(async (c, next) => {
  const corsMiddlewareHandler = cors({
    origin: c.env.CLIENT_BASE_URL,
    allowMethods: ["GET", "POST", "PATCH", "PUT", "OPTIONS"],
    credentials: true,
  });
  return corsMiddlewareHandler(c, next);
});
app.use(async (c, next) => {
  const client = createClient({
    url: c.env.DATABASE_URL!,
    authToken: c.env.DATABASE_AUTH_TOKEN!,
  });
  const db = drizzle({ client, schema });
  c.set("db", db);
  await next();
});

type AccessTokenClaims = {
  id: string;
};

const authMiddleware = bearerAuth<AppContext>({
  verifyToken: async (token, c) => {
    const res = await verifyJWT<AccessTokenClaims>(
      c.env.AUTH_PUBLIC_KEY,
      token,
    );
    if (res.isErr()) {
      return false;
    }
    c.set("userId", res.value.id);
    return true;
  },
});

// ROUTES ====================================================================

auth.get("/oauth/google/redirect", async (c) => {
  return await googleRedirectHandler(c);
});
auth.get("/oauth/google/callback", async (c) => {
  return await googleCallbackHandler(c);
});
auth.patch("/refresh", async (c) => {
  return await refreshHandler(c);
});

deck.use(authMiddleware);
deck.post("/", async (c) => {
  const res = await createDeckHandler(c);
  if (res.isErr()) {
    return c.json({ error: res.error.message, success: false }, 500);
  }
  return res.value;
});
deck.get("/:deckId", async (c) => {
  const res = await getDeckHandler(c);
  if (res.isErr()) {
    return c.json({ error: res.error.message, success: false }, 500);
  }
  return res.value;
});
deck.patch("/:deckId", async (c) => {
  const res = await updateDeckHandler(c);
  if (res.isErr()) {
    return c.json({ error: res.error.message, success: false }, 500);
  }
  return res.value;
});

card.use(authMiddleware);
card.post("/", async (c) => {
  const res = await createCardHandler(c);
  if (res.isErr()) {
    return c.json({ error: res.error.message, success: false }, 500);
  }
  return res.value;
});
card.get("/", async (c) => {
  const res = await getCardsHandler(c);
  if (res.isErr()) {
    return c.json({ error: res.error.message, success: false }, 500);
  }
  return res.value;
});

app.route("/api/v1", auth);
app.route("/api/v1", deck);
app.route("/api/v1", card);

// HANDLERS ====================================================================

const googleRedirectHandler = async (c: Context<AppContext>) => {
  return c.redirect(
    `${c.env.AUTH_API_BASE_URL}/auth/oauth/google/redirect?callback_url=${c.env.BASE_URL}/auth/oauth/google/callback`,
  );
};
const googleCallbackHandler = async (c: Context<AppContext>) => {
  const accessToken = c.req.query("access_token") || "";
  const refreshToken = c.req.query("refresh_token") || "";

  if (!accessToken || !refreshToken) {
    return c.redirect(`${c.env.CLIENT_BASE_URL}?error=2001`);
  }

  setCookie(c, "shupa_at", accessToken, {
    httpOnly: false,
    maxAge: 60 * 7, // 7 minutes
    path: "/",
    sameSite: "lax",
    secure: c.env.ENV.toLowerCase() != "dev",
  });
  setCookie(c, "shupa_rt", refreshToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
    sameSite: "lax",
    secure: c.env.ENV.toLowerCase() != "dev",
  });

  return c.redirect(`${c.env.CLIENT_BASE_URL}`);
};

const refreshHandler = async (c: Context<AppContext>) => {
  const refreshToken = getCookie(c, "shupa_rt");
  if (!refreshToken) {
    return c.json({ success: false, error: "1001" }, 403);
  }

  const res = await c.env.SETSUBI.refresh(refreshToken);
  if (!res.success) {
    console.log(res.error);
    return c.json({ success: false, error: "1002" }, 403);
  }
  setCookie(c, "shupa_at", res.data, {
    httpOnly: false,
    maxAge: 60 * 7, // 7 days
    path: "/",
    sameSite: "lax",
    secure: c.env.ENV.toLowerCase() != "dev",
  });

  return c.json({});
};

const createDeckSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
  description: v.optional(
    v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(500)),
  ),
});
const createDeckHandler = noThrow(async (c: Context<AppContext>) => {
  const jsonRes = parseContent(createDeckSchema, await c.req.json());
  if (jsonRes.isErr()) {
    return c.json({ error: jsonRes.error.message, success: false }, 400);
  }
  const json = jsonRes.value;

  const db = c.get("db");
  const userId = c.get("userId")!;

  const createRes = await createDeck(db, {
    name: json.name,
    description: json.description,
    ownedBy: userId,
  });
  if (createRes.isErr()) {
    return c.json({ error: createRes.error.message, success: false }, 500);
  }

  return c.json({ success: true }, 201);
});

const getDeckHandler = noThrow(async (c: Context<AppContext>) => {
  const deckId = c.req.param("deckId");
  const db = c.get("db");

  const getRes = await getDeck(db, {
    id: deckId,
  });
  if (getRes.isErr()) {
    return c.json({ error: getRes.error.message, success: false }, 500);
  }

  return c.json({ success: true, data: getRes.value });
});

const updateDeckSchema = v.object({
  name: v.optional(
    v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
  ),
  description: v.optional(
    v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(500)),
  ),
});
const updateDeckHandler = noThrow(async (c: Context<AppContext>) => {
  const deckId = c.req.param("deckId");
  if (!deckId) return c.json({ error: "invalid deck", success: false }, 400);

  const jsonRes = parseContent(updateDeckSchema, await c.req.json());
  if (jsonRes.isErr()) {
    return c.json({ error: jsonRes.error.message, success: false }, 400);
  }
  const json = jsonRes.value;

  const db = c.get("db");
  await db.transaction(async (tx) => {
    const resGet = await getDeck(tx, {
      id: deckId,
    });

    if (resGet.isErr() || !resGet.value) {
      return tx.rollback();
    }

    if (json.name) {
      resGet.value.data.name = json.name;
    }
    if (json.description) {
      resGet.value.data.description = json.description;
    }

    const resUpdate = await updateDeck(tx, {
      id: deckId,
      data: resGet.value.data,
    });
    if (resUpdate.isErr()) {
      return tx.rollback();
    }
  });
});

const createCardSchema = v.object({
  front: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
  back: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
  deck_id: v.pipe(v.string(), v.uuid()),
});
const createCardHandler = noThrow(async (c: Context<AppContext>) => {
  const jsonRes = parseContent(createCardSchema, await c.req.json());
  if (jsonRes.isErr()) {
    return c.json({ error: jsonRes.error.message, success: false }, 400);
  }
  const json = jsonRes.value;

  const db = c.get("db");
  const userId = c.get("userId")!;

  const createRes = await createCard(db, {
    back: { content: json.back },
    front: { content: json.front },
    deckId: json.deck_id,
    ownedBy: userId,
  });
  if (createRes.isErr()) {
    return c.json({ error: createRes.error.message, success: false }, 500);
  }

  return c.json({ success: true }, 201);
});

const getCardsHandler = noThrow(async (c: Context<AppContext>) => {
  const lastId = c.req.query("last_id");
  const db = c.get("db");

  const getRes = await getCards(db, {
    lastId,
  });
  if (getRes.isErr()) {
    return c.json({ error: getRes.error.message, success: false }, 500);
  }

  return c.json({ success: true, data: getRes.value });
});

export default app;
