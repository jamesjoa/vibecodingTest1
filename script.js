const SAMPLE_NEWS = [
  {
    id: 1,
    title: "머스타드씨드, 전문가 인플루언서 프로그램 확대 운영",
    summary: "의사·변호사·기업 대표를 위한 60일 숏폼 성장 프로그램을 본격화합니다.",
    content:
      "머스타드씨드 주식회사는 전문가 전용 인플루언서 프로그램을 확대합니다. 교육, 기획, 방문 촬영, 편집을 묶어 2개월 동안 30개 숏폼 업로드를 목표로 운영합니다.\n\n이 기사는 홈페이지 샘플 콘텐츠입니다. 실제 언론보도 링크로 교체될 예정입니다.",
    source: "언론보도",
    published_at: "2026-08-20",
  },
  {
    id: 2,
    title: "개원 2개월, 대기 환자 70명 — 숏폼이 바꾼 로컬 브랜딩",
    summary: "치과 전문가 프로그램 참여자의 조회수 73만 사례를 소개합니다.",
    content:
      "전문가 프로그램에 참여한 치과 원장은 유튜브·인스타·틱톡 동시 운영 후 대기 환자가 크게 늘었습니다. 최다 조회수 73만을 기록한 숏폼이 신규 환자 유입의 기점이 됐습니다.\n\n이 기사는 제안서 레퍼런스를 바탕으로 한 샘플입니다.",
    source: "언론보도",
    published_at: "2026-06-12",
  },
  {
    id: 3,
    title: "틱톡 MCN 국내 1위 노하우, 기업 교육으로 확장",
    summary: "숏폼 제작과 인플루언서 육성 경험을 기업 교육 프로그램으로 엽니다.",
    content:
      "머스타드씨드는 틱톡 MCN 운영 경험과 500명 규모 인플루언서 네트워크를 바탕으로 기업 교육과 캠페인 매칭을 강화합니다.\n\n이 기사는 샘플입니다.",
    source: "안내",
    published_at: "2026-04-17",
  },
];

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function qsa(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

function formatDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10).replaceAll("-", ".");
}

function showToast(message) {
  const el = qs("#toast");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  el.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    el.hidden = true;
    el.classList.add("hidden");
  }, 2800);
}

function setupNav() {
  const toggle = qs("#nav-toggle");
  const nav = qs("#nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  });
}

function newsRow(item) {
  return `<a class="news-row" href="/news?id=${item.id}">
    <span class="news-date">${formatDate(item.published_at)}</span>
    <strong>${item.title}</strong>
    <span class="news-label">${item.source || "뉴스"}</span>
  </a>`;
}

async function fetchNews(id) {
  const url = id ? `/api/news?id=${encodeURIComponent(id)}` : "/api/news";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fail");
    const data = await res.json();
    if (id) return data.item || SAMPLE_NEWS.find((n) => String(n.id) === String(id));
    if (Array.isArray(data.items) && data.items.length) return data.items;
    return SAMPLE_NEWS;
  } catch {
    if (id) return SAMPLE_NEWS.find((n) => String(n.id) === String(id)) || SAMPLE_NEWS[0];
    return SAMPLE_NEWS;
  }
}

async function renderHomeNews() {
  const root = qs("#home-news");
  if (!root) return;
  const items = await fetchNews();
  root.innerHTML = items.slice(0, 3).map(newsRow).join("");
}

async function renderNewsPage() {
  const root = qs("#news-root");
  if (!root) return;
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    const items = await fetchNews();
    root.innerHTML = `<div class="news-list">${items.map(newsRow).join("")}</div>`;
    return;
  }
  const item = await fetchNews(id);
  if (!item) {
    root.innerHTML = "<p>소식을 찾을 수 없습니다.</p>";
    return;
  }
  const body = String(item.content || "")
    .split("\n")
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
  root.innerHTML = `
    <p><a class="ghost-btn" href="/news" style="border-color:var(--ink)">← 목록</a></p>
    <article class="article">
      <p class="news-label">${item.source || "뉴스"} · ${formatDate(item.published_at)}</p>
      <h1>${item.title}</h1>
      ${body}
    </article>`;
}

function setupPortfolio() {
  const grid = qs("#work-grid");
  if (!grid) return;
  const modal = qs("#work-modal");
  const title = qs("#modal-title");
  const desc = qs("#modal-desc");
  const close = qs("#modal-close");

  qsa(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      qsa(".filter-btn").forEach((b) => b.classList.remove("is-on"));
      btn.classList.add("is-on");
      const filter = btn.dataset.filter;
      qsa(".work-card", grid).forEach((card) => {
        const show = filter === "all" || card.dataset.cat === filter;
        card.classList.toggle("hidden", !show);
      });
    });
  });

  grid.addEventListener("click", (event) => {
    const card = event.target.closest(".work-card");
    if (!card || !modal) return;
    title.textContent = card.dataset.title;
    desc.textContent = card.dataset.desc;
    modal.hidden = false;
    modal.classList.remove("hidden");
  });

  function hideModal() {
    if (!modal) return;
    modal.hidden = true;
    modal.classList.add("hidden");
  }

  close?.addEventListener("click", hideModal);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) hideModal();
  });
}

function setupContact() {
  const form = qs("#contact-form");
  if (!form) return;
  const hidden = qs("#category");
  qsa(".choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      qsa(".choice").forEach((b) => b.classList.remove("is-on"));
      btn.classList.add("is-on");
      hidden.value = btn.dataset.value;
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      category: hidden.value,
      name: qs("#name").value.trim(),
      phone: qs("#phone").value.trim(),
      email: qs("#email").value.trim(),
      message: qs("#message").value.trim(),
    };
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("fail");
      form.reset();
      hidden.value = "프로그램 신청";
      qsa(".choice").forEach((b, i) => b.classList.toggle("is-on", i === 0));
      showToast("문의가 접수되었습니다.");
    } catch {
      showToast("접수를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupNav();
  renderHomeNews();
  renderNewsPage();
  setupPortfolio();
  setupContact();
});
