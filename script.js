(() => {
  const API = "/api/posts";

  const views = {
    list: document.getElementById("view-list"),
    write: document.getElementById("view-write"),
    detail: document.getElementById("view-detail"),
  };

  const postList = document.getElementById("post-list");
  const postCount = document.getElementById("post-count");
  const listEmpty = document.getElementById("list-empty");
  const writeForm = document.getElementById("write-form");
  const commentForm = document.getElementById("comment-form");
  const commentList = document.getElementById("comment-list");
  const commentsEmpty = document.getElementById("comments-empty");
  const commentCount = document.getElementById("comment-count");
  const commentPostId = document.getElementById("comment-post-id");
  const toast = document.getElementById("toast");

  let toastTimer = 0;

  document.getElementById("btn-write").addEventListener("click", () => {
    showView("write");
  });

  document.querySelectorAll("[data-nav='list']").forEach((btn) => {
    btn.addEventListener("click", () => {
      showView("list");
      loadPosts();
    });
  });

  writeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = document.getElementById("write-title").value.trim();
    const author = document.getElementById("write-author").value.trim();
    const content = document.getElementById("write-content").value.trim();

    try {
      const data = await request(API, {
        method: "POST",
        body: JSON.stringify({ title, author, content }),
      });
      writeForm.reset();
      showToast("글을 등록했습니다.");
      await openDetail(data.post.id);
    } catch (err) {
      showToast(err.message || "등록에 실패했습니다.");
    }
  });

  commentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const postId = Number(commentPostId.value);
    const author = document.getElementById("comment-author").value.trim();
    const content = document.getElementById("comment-content").value.trim();

    try {
      await request(API, {
        method: "POST",
        body: JSON.stringify({ post_id: postId, author, content }),
      });
      document.getElementById("comment-content").value = "";
      showToast("댓글을 등록했습니다.");
      await openDetail(postId, false);
    } catch (err) {
      showToast(err.message || "댓글 등록에 실패했습니다.");
    }
  });

  function showView(name) {
    Object.entries(views).forEach(([key, el]) => {
      const active = key === name;
      el.hidden = !active;
      el.classList.toggle("is-active", active);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadPosts() {
    try {
      const data = await request(API);
      const posts = data.posts || [];
      postCount.textContent = `${posts.length}개의 글`;
      listEmpty.hidden = posts.length > 0;
      postList.innerHTML = posts.map(postItemMarkup).join("");
      postList.querySelectorAll("[data-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          openDetail(Number(btn.dataset.id));
        });
      });
    } catch (err) {
      showToast(err.message || "목록을 불러오지 못했습니다.");
      postList.innerHTML = "";
      listEmpty.hidden = false;
      postCount.textContent = "0개의 글";
    }
  }

  async function openDetail(id, switchView = true) {
    try {
      const data = await request(`${API}?id=${id}`);
      const { post, comments } = data;

      document.getElementById("detail-title").textContent = post.title;
      document.getElementById("detail-author").textContent = post.author;
      document.getElementById("detail-date").textContent = formatDate(
        post.created_at
      );
      document.getElementById("detail-content").textContent = post.content;
      commentPostId.value = String(post.id);
      commentCount.textContent = String(comments.length);
      commentsEmpty.hidden = comments.length > 0;
      commentList.innerHTML = comments.map(commentMarkup).join("");

      if (switchView) showView("detail");
    } catch (err) {
      showToast(err.message || "글을 불러오지 못했습니다.");
      showView("list");
    }
  }

  function postItemMarkup(post) {
    const preview =
      post.content.length > 90
        ? `${escapeHtml(post.content.slice(0, 90))}…`
        : escapeHtml(post.content);

    return `
      <li>
        <button type="button" class="post-item" data-id="${post.id}">
          <h2 class="post-item-title">${escapeHtml(post.title)}</h2>
          <p class="post-item-meta">
            <span>${escapeHtml(post.author)}</span>
            <span>${formatDate(post.created_at)}</span>
            <span>댓글 ${post.comment_count ?? 0}</span>
          </p>
          <p class="post-item-meta">${preview}</p>
        </button>
      </li>
    `;
  }

  function commentMarkup(comment) {
    return `
      <li class="comment-item">
        <div class="comment-meta">
          <strong>${escapeHtml(comment.author)}</strong>
          <span>${formatDate(comment.created_at)}</span>
        </div>
        <p class="comment-body">${escapeHtml(comment.content)}</p>
      </li>
    `;
  }

  async function request(url, options = {}) {
    let response;
    try {
      response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });
    } catch {
      throw new Error(
        "API에 연결하지 못했습니다. npm run dev 로 실행한 뒤 http://localhost:8788 에서 열어주세요."
      );
    }

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.error || `요청 실패 (${response.status})`);
    }

    return data;
  }

  function formatDate(value) {
    if (!value) return "";
    const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => {
        toast.hidden = true;
      }, 250);
    }, 2200);
  }

  loadPosts();
})();
