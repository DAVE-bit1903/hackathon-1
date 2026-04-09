(() => {
  'use strict';

  const el = {
    input: document.getElementById('searchInput'),
    btn: document.getElementById('searchBtn'),
    answer: document.getElementById('answerBody'),
    sources: document.getElementById('sourcesList'),
    loading: document.getElementById('loadingSection'),
    hero: document.getElementById('hero'),
    results: document.getElementById('resultsSection'),
    error: document.getElementById('errorSection'),
    errorMsg: document.getElementById('errorMsg'),
    resultQuery: document.getElementById('resultQueryText'),
    sourcesCount: document.getElementById('sourcesCount'),
    historyList: document.getElementById('historyList'),
    docsBtn: document.getElementById('docsBtn'),
    docsDropdown: document.getElementById('docsDropdown'),
    btnQuick: document.getElementById('btn-quick'),
    btnDeep: document.getElementById('btn-deep'),
    modeHint: document.getElementById('modeHint')
  };

  let searchHistory = JSON.parse(localStorage.getItem('logicra_history')) || [];

  function renderHistory() {
    if (!el.historyList) return;
    el.historyList.innerHTML = '';
    searchHistory.forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'history-item';
      btn.innerHTML = `<svg class="history-item-icon" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v6l4 2M14 8A6 6 0 112 8a6 6 0 0112 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span class="history-item-text">${q.replace(/</g, "&lt;")}</span>`;
      btn.onclick = () => {
        el.input.value = q;
        runSearch(q);
      };
      el.historyList.appendChild(btn);
    });
  }

  function addToHistory(query) {
    if (!query) return;
    searchHistory = searchHistory.filter(q => q.toLowerCase() !== query.toLowerCase());
    searchHistory.unshift(query);
    if (searchHistory.length > 20) searchHistory.pop();
    localStorage.setItem('logicra_history', JSON.stringify(searchHistory));
    renderHistory();
  }

  el.btn.onclick = () => {
    const query = el.input.value.trim();
    if (!query) return;
    runSearch(query);
  };

  // --- Docs Dropdown Logic ---
  if (el.docsBtn && el.docsDropdown) {
    el.docsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      el.docsDropdown.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!el.docsDropdown.contains(e.target) && e.target !== el.docsBtn) {
        el.docsDropdown.classList.remove('open');
      }
    });
  }

  // --- Search Mode Toggle ---
  let currentMode = 'quick'; // 'quick' or 'deep'
  if (el.btnQuick && el.btnDeep && el.modeHint) {
    el.btnQuick.addEventListener('click', () => {
      currentMode = 'quick';
      el.btnQuick.classList.add('active');
      el.btnDeep.classList.remove('active');
      el.modeHint.textContent = 'Quick Answer mode';
    });
    el.btnDeep.addEventListener('click', () => {
      currentMode = 'deep';
      el.btnDeep.classList.add('active');
      el.btnQuick.classList.remove('active');
      el.modeHint.textContent = 'Deep Research mode';
    });
  }

  el.input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      el.btn.click();
    }
  });

  async function runSearch(query) {
    el.hero.classList.add('hidden');
    el.loading.classList.remove('hidden');
    el.results.classList.add('hidden');
    el.error.classList.add('hidden');

    try {
      // Use relative /api/search on Vercel, localhost:3000/search locally
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const API_URL = isLocal ? "http://localhost:3000/search" : "/api/search";
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query, mode: currentMode })
      });

      if (!res.ok) throw new Error();

      const data = await res.json();

      const formatted = {
        answer: data.answer || "No answer found.",
        sources: (data.results || []).map((r, i) => ({
          title: r.title || `Source ${i + 1}`,
          link: r.url || "#"
        }))
      };

      showResults(formatted, query);

    } catch (err) {
      console.error(err);
      showError("⚠️ Backend not running or API error");
    }
  }

  function showResults(data, query) {
    el.loading.classList.add('hidden');
    el.results.classList.remove('hidden');

    el.resultQuery.textContent = query;
    if (typeof marked !== 'undefined') {
      el.answer.innerHTML = marked.parse(data.answer);
    } else {
      el.answer.innerHTML = data.answer.replace(/\n/g, "<br>");
    }

    el.sources.innerHTML = '';
    data.sources.forEach((src, i) => {
      const a = document.createElement('a');
      a.href = src.link;
      a.target = "_blank";
      a.innerText = `${i + 1}. ${src.title}`;
      a.style.display = "block";
      a.style.marginBottom = "6px";
      el.sources.appendChild(a);
    });

    el.sourcesCount.textContent = data.sources.length;
    addToHistory(query);
  }

  function showError(msg) {
    el.loading.classList.add('hidden');
    el.error.classList.remove('hidden');
    el.errorMsg.textContent = msg;
  }

  document.getElementById("newSearchBtn").onclick = () => {
    el.results.classList.add("hidden");
    el.hero.classList.remove("hidden");
  };

  document.getElementById("followupBtn").onclick = () => {
    const q = document.getElementById("followupInput").value.trim();
    if (q) runSearch(q);
  };

  renderHistory();

})();