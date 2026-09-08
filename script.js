(() => {
  const STORAGE_KEY = "haru-todos-v1";

  const form = document.getElementById("todo-form");
  const input = document.getElementById("todo-input");
  const list = document.getElementById("todo-list");
  const countEl = document.getElementById("todo-count");
  const emptyState = document.getElementById("empty-state");
  const clearBtn = document.getElementById("clear-completed");
  const filterButtons = document.querySelectorAll(".filter-btn");

  /** @type {{ id: string, text: string, completed: boolean, createdAt: number }[]} */
  let todos = loadTodos();
  let filter = "all";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    todos.unshift({
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: Date.now(),
    });

    input.value = "";
    persist();
    render();
    input.focus();
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filter = button.dataset.filter || "all";
      filterButtons.forEach((btn) => {
        const active = btn === button;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", String(active));
      });
      render();
    });
  });

  clearBtn.addEventListener("click", () => {
    const remaining = todos.filter((todo) => !todo.completed);
    if (remaining.length === todos.length) return;

    const completedItems = list.querySelectorAll(".todo-item.is-done");
    if (!completedItems.length) {
      todos = remaining;
      persist();
      render();
      return;
    }

    completedItems.forEach((item) => item.classList.add("is-leaving"));

    window.setTimeout(() => {
      todos = remaining;
      persist();
      render();
    }, 260);
  });

  list.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const item = target.closest(".todo-item");
    if (!item) return;

    const id = item.dataset.id;
    if (!id) return;

    if (target.closest(".check-btn")) {
      todos = todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      );
      persist();
      render();
      return;
    }

    if (target.closest(".delete-btn")) {
      item.classList.add("is-leaving");
      window.setTimeout(() => {
        todos = todos.filter((todo) => todo.id !== id);
        persist();
        render();
      }, 260);
    }
  });

  function getVisibleTodos() {
    if (filter === "active") return todos.filter((todo) => !todo.completed);
    if (filter === "completed") return todos.filter((todo) => todo.completed);
    return todos;
  }

  function render() {
    const visible = getVisibleTodos();
    const activeCount = todos.filter((todo) => !todo.completed).length;
    const completedCount = todos.length - activeCount;

    list.innerHTML = visible.map(todoMarkup).join("");
    countEl.textContent = `${activeCount}개 남음`;

    emptyState.hidden = visible.length > 0;
    clearBtn.hidden = completedCount === 0;
  }

  function todoMarkup(todo) {
    const safeText = escapeHtml(todo.text);
    return `
      <li class="todo-item${todo.completed ? " is-done" : ""}" data-id="${todo.id}">
        <button type="button" class="check-btn" aria-label="${
          todo.completed ? "완료 취소" : "완료 표시"
        }" aria-pressed="${todo.completed}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M5 12.5l4.5 4.5L19 7"
              fill="none"
              stroke="currentColor"
              stroke-width="2.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <p class="todo-text">${safeText}</p>
        <button type="button" class="delete-btn" aria-label="삭제">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 7h12M10 7V5h4v2m-5 3v8m4-8v8M8 7l1 12h6l1-12"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </li>
    `;
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function loadTodos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  render();
})();
