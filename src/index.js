// AI Weekend - Canlı Şarkı Puanlama
// Tek bir Durable Object ("main") tüm oturumun paylaşımlı, tutarlı durumunu tutar.
// Worker yalnızca /api/* isteklerini karşılar; HTML sayfaları statik asset olarak sunulur.

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export class RatingRoom {
  constructor(ctx) {
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS votes (voter TEXT PRIMARY KEY, stars INTEGER NOT NULL)");
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS board (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, avg REAL NOT NULL, cnt INTEGER NOT NULL, ts INTEGER NOT NULL)"
    );
  }

  getMeta(k) {
    const r = this.sql.exec("SELECT v FROM meta WHERE k = ?", k).toArray();
    return r.length ? r[0].v : null;
  }

  setMeta(k, v) {
    this.sql.exec(
      "INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
      k,
      v
    );
  }

  state() {
    const active = this.getMeta("active") || "";
    const session = Number(this.getMeta("session") || "0");
    const agg = this.sql
      .exec("SELECT COUNT(*) AS c, COALESCE(AVG(stars), 0) AS a FROM votes")
      .toArray()[0];
    const board = this.sql
      .exec("SELECT id, name, avg, cnt, ts FROM board ORDER BY avg DESC, cnt DESC, ts ASC")
      .toArray();
    return { active, session, count: agg.c, avg: agg.a, board };
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/state") return json(this.state());

    if (request.method !== "POST") return json({ error: "bulunamadı" }, 404);
    const body = await readJson(request);

    if (path === "/api/start") {
      const name = String(body.name || "").trim().slice(0, 80);
      if (!name) return json({ error: "İsim gerekli" }, 400);
      this.sql.exec("DELETE FROM votes");
      const session = Number(this.getMeta("session") || "0") + 1;
      this.setMeta("session", String(session));
      this.setMeta("active", name);
      return json(this.state());
    }

    if (path === "/api/vote") {
      const active = this.getMeta("active") || "";
      if (!active) return json({ error: "Şu an puanlanan biri yok" }, 409);
      const stars = Math.round(Number(body.stars));
      if (!(stars >= 1 && stars <= 5)) return json({ error: "Puan 1-5 arası olmalı" }, 400);
      const voter = String(body.voter || "").slice(0, 64) || crypto.randomUUID();
      this.sql.exec(
        "INSERT INTO votes (voter, stars) VALUES (?, ?) ON CONFLICT(voter) DO UPDATE SET stars = excluded.stars",
        voter,
        stars
      );
      return json(this.state());
    }

    if (path === "/api/finish") {
      const active = this.getMeta("active") || "";
      if (!active) return json(this.state());
      const agg = this.sql
        .exec("SELECT COUNT(*) AS c, COALESCE(AVG(stars), 0) AS a FROM votes")
        .toArray()[0];
      if (agg.c > 0) {
        this.sql.exec(
          "INSERT INTO board (name, avg, cnt, ts) VALUES (?, ?, ?, ?)",
          active,
          agg.a,
          agg.c,
          Date.now()
        );
      }
      this.sql.exec("DELETE FROM votes");
      this.setMeta("active", "");
      return json({ ...this.state(), finished: { name: active, avg: agg.a, cnt: agg.c } });
    }

    if (path === "/api/cancel") {
      this.sql.exec("DELETE FROM votes");
      this.setMeta("active", "");
      return json(this.state());
    }

    if (path === "/api/board/delete") {
      const id = Number(body.id);
      if (id) this.sql.exec("DELETE FROM board WHERE id = ?", id);
      return json(this.state());
    }

    if (path === "/api/reset") {
      this.sql.exec("DELETE FROM votes");
      this.sql.exec("DELETE FROM board");
      this.setMeta("active", "");
      return json(this.state());
    }

    return json({ error: "bulunamadı" }, 404);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      const id = env.RATING_ROOM.idFromName("main");
      return env.RATING_ROOM.get(id).fetch(request);
    }
    // /api dışındaki her şey statik asset olarak sunulur.
    return env.ASSETS.fetch(request);
  },
};
