interface Env {
  DB: D1Database;
}

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function ensureSchema(db: D1Database): Promise<void> {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const db = context.env.DB;
    if (!db) return error("D1 바인딩(DB)이 없습니다.", 500);
    await ensureSchema(db);

    let body: Record<string, unknown> = {};
    try {
      const data = await context.request.json();
      if (data && typeof data === "object" && !Array.isArray(data)) {
        body = data as Record<string, unknown>;
      }
    } catch {
      body = {};
    }

    const category = asString(body.category);
    const name = asString(body.name);
    const phone = asString(body.phone);
    const email = asString(body.email);
    const message = asString(body.message);

    if (!category) return error("문의 유형을 선택해 주세요.");
    if (!name) return error("이름을 입력해 주세요.");
    if (!phone) return error("연락처를 입력해 주세요.");
    if (!email) return error("이메일을 입력해 주세요.");
    if (!message) return error("문의 내용을 입력해 주세요.");
    if (name.length > 40) return error("이름이 너무 깁니다.");
    if (phone.length > 40) return error("연락처가 너무 깁니다.");
    if (email.length > 120) return error("이메일이 너무 깁니다.");
    if (message.length > 5000) return error("내용이 너무 깁니다.");

    const item = await db
      .prepare(
        `
        INSERT INTO inquiries (category, name, phone, email, message)
        VALUES (?, ?, ?, ?, ?)
        RETURNING id, category, name, created_at
      `
      )
      .bind(category, name, phone, email, message)
      .first();

    return json({ item }, 201);
  } catch (err) {
    console.error(err);
    return error("문의를 저장하지 못했습니다.", 500);
  }
};
