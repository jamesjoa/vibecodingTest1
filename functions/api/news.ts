interface Env {
  DB: D1Database;
}

interface NewsRow {
  id: number;
  title: string;
  summary: string;
  content: string;
  source: string;
  published_at: string;
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

function asPositiveInt(value: unknown): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

async function ensureSchema(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT '뉴스',
        published_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC)
    `),
  ]);

  const row = await db
    .prepare(`SELECT COUNT(*) AS cnt FROM news`)
    .first<{ cnt: number }>();
  if ((row?.cnt ?? 0) > 0) return;

  await db.batch([
    db.prepare(
      `INSERT INTO news (title, summary, content, source, published_at) VALUES (?, ?, ?, ?, ?)`
    ).bind(
      "머스타드씨드, 전문가 인플루언서 프로그램 확대 운영",
      "의사·변호사·기업 대표를 위한 60일 숏폼 성장 프로그램을 본격화합니다.",
      "머스타드씨드 주식회사는 전문가 전용 인플루언서 프로그램을 확대합니다. 교육, 기획, 방문 촬영, 편집을 묶어 2개월 동안 30개 숏폼 업로드를 목표로 운영합니다.\n\n이 기사는 홈페이지 샘플 콘텐츠입니다. 실제 언론보도 링크로 교체될 예정입니다.",
      "언론보도",
      "2026-08-20"
    ),
    db.prepare(
      `INSERT INTO news (title, summary, content, source, published_at) VALUES (?, ?, ?, ?, ?)`
    ).bind(
      "개원 2개월, 대기 환자 70명 — 숏폼이 바꾼 로컬 브랜딩",
      "치과 전문가 프로그램 참여자의 조회수 73만 사례를 소개합니다.",
      "전문가 프로그램에 참여한 치과 원장은 유튜브·인스타·틱톡 동시 운영 후 대기 환자가 크게 늘었습니다. 최다 조회수 73만을 기록한 숏폼이 신규 환자 유입의 기점이 됐습니다.\n\n이 기사는 제안서 레퍼런스를 바탕으로 한 샘플입니다.",
      "언론보도",
      "2026-06-12"
    ),
    db.prepare(
      `INSERT INTO news (title, summary, content, source, published_at) VALUES (?, ?, ?, ?, ?)`
    ).bind(
      "틱톡 MCN 국내 1위 노하우, 기업 교육으로 확장",
      "숏폼 제작과 인플루언서 육성 경험을 기업 교육 프로그램으로 엽니다.",
      "머스타드씨드는 틱톡 MCN 운영 경험과 500명 규모 인플루언서 네트워크를 바탕으로 기업 교육과 캠페인 매칭을 강화합니다.\n\n이 기사는 샘플입니다.",
      "안내",
      "2026-04-17"
    ),
  ]);
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = context.env.DB;
    if (!db) return error("D1 바인딩(DB)이 없습니다.", 500);
    await ensureSchema(db);

    const id = asPositiveInt(new URL(context.request.url).searchParams.get("id"));
    if (id) {
      const item = await db
        .prepare(
          `SELECT id, title, summary, content, source, published_at FROM news WHERE id = ?`
        )
        .bind(id)
        .first<NewsRow>();
      if (!item) return error("소식을 찾을 수 없습니다.", 404);
      return json({ item });
    }

    const { results } = await db
      .prepare(
        `SELECT id, title, summary, content, source, published_at FROM news ORDER BY published_at DESC, id DESC`
      )
      .all<NewsRow>();
    return json({ items: results ?? [] });
  } catch (err) {
    console.error(err);
    return error("뉴스를 불러오지 못했습니다.", 500);
  }
};
