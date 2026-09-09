interface Env {
  DB: D1Database;
}

interface PostRow {
  id: number;
  title: string;
  content: string;
  author: string;
  created_at: string;
  comment_count?: number;
}

interface CommentRow {
  id: number;
  post_id: number;
  content: string;
  author: string;
  created_at: string;
}

type JsonBody = Record<string, unknown>;

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders,
  });
}

function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)
    `),
  ]);
}

async function listPosts(db: D1Database): Promise<PostRow[]> {
  const { results } = await db
    .prepare(
      `
      SELECT
        p.id,
        p.title,
        p.content,
        p.author,
        p.created_at,
        COALESCE(c.cnt, 0) AS comment_count
      FROM posts p
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS cnt
        FROM comments
        GROUP BY post_id
      ) c ON c.post_id = p.id
      ORDER BY p.id DESC
    `
    )
    .all<PostRow>();

  return results ?? [];
}

async function getPostDetail(
  db: D1Database,
  id: number
): Promise<{ post: PostRow; comments: CommentRow[] } | null> {
  const post = await db
    .prepare(
      `
      SELECT id, title, content, author, created_at
      FROM posts
      WHERE id = ?
    `
    )
    .bind(id)
    .first<PostRow>();

  if (!post) return null;

  const { results } = await db
    .prepare(
      `
      SELECT id, post_id, content, author, created_at
      FROM comments
      WHERE post_id = ?
      ORDER BY id ASC
    `
    )
    .bind(id)
    .all<CommentRow>();

  return {
    post,
    comments: results ?? [],
  };
}

async function createPost(
  db: D1Database,
  input: { title: string; content: string; author: string }
): Promise<PostRow> {
  const result = await db
    .prepare(
      `
      INSERT INTO posts (title, content, author)
      VALUES (?, ?, ?)
      RETURNING id, title, content, author, created_at
    `
    )
    .bind(input.title, input.content, input.author)
    .first<PostRow>();

  if (!result) {
    throw new Error("게시글 저장에 실패했습니다.");
  }

  return result;
}

async function createComment(
  db: D1Database,
  input: { postId: number; content: string; author: string }
): Promise<CommentRow> {
  const post = await db
    .prepare(`SELECT id FROM posts WHERE id = ?`)
    .bind(input.postId)
    .first<{ id: number }>();

  if (!post) {
    throw new Error("NOT_FOUND");
  }

  const result = await db
    .prepare(
      `
      INSERT INTO comments (post_id, content, author)
      VALUES (?, ?, ?)
      RETURNING id, post_id, content, author, created_at
    `
    )
    .bind(input.postId, input.content, input.author)
    .first<CommentRow>();

  if (!result) {
    throw new Error("댓글 저장에 실패했습니다.");
  }

  return result;
}

async function parseBody(request: Request): Promise<JsonBody> {
  try {
    const data = await request.json();
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return data as JsonBody;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * GET  /api/posts        → 목록
 * GET  /api/posts?id=1   → 상세 + 댓글
 * POST /api/posts        → 글 작성 { title, content, author }
 * POST /api/posts        → 댓글 작성 { post_id, content, author }
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = context.env.DB;
    if (!db) return error("D1 바인딩(DB)이 없습니다.", 500);

    await ensureSchema(db);

    const url = new URL(context.request.url);
    const id = asPositiveInt(url.searchParams.get("id"));

    if (id) {
      const detail = await getPostDetail(db, id);
      if (!detail) return error("게시글을 찾을 수 없습니다.", 404);
      return json(detail);
    }

    const posts = await listPosts(db);
    return json({ posts });
  } catch (err) {
    console.error(err);
    return error("게시글을 불러오지 못했습니다.", 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const db = context.env.DB;
    if (!db) return error("D1 바인딩(DB)이 없습니다.", 500);

    await ensureSchema(db);

    const body = await parseBody(context.request);
    const content = asString(body.content);
    const author = asString(body.author);
    const postId = asPositiveInt(body.post_id);

    if (!content) return error("내용을 입력해 주세요.");
    if (!author) return error("작성자를 입력해 주세요.");
    if (content.length > 5000) return error("내용이 너무 깁니다.");
    if (author.length > 40) return error("작성자 이름이 너무 깁니다.");

    // 댓글 작성: post_id가 있으면 댓글
    if (postId) {
      try {
        const comment = await createComment(db, {
          postId,
          content,
          author,
        });
        return json({ comment }, 201);
      } catch (err) {
        if (err instanceof Error && err.message === "NOT_FOUND") {
          return error("게시글을 찾을 수 없습니다.", 404);
        }
        throw err;
      }
    }

    // 게시글 작성
    const title = asString(body.title);
    if (!title) return error("제목을 입력해 주세요.");
    if (title.length > 120) return error("제목이 너무 깁니다.");

    const post = await createPost(db, { title, content, author });
    return json({ post }, 201);
  } catch (err) {
    console.error(err);
    return error("요청을 처리하지 못했습니다.", 500);
  }
};
