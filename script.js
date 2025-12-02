// ======================================
// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
// ======================================

const API_URL = "https://space-biology-knowledge-engine-n1jh.onrender.com";

let currentSkip = 0;
const LIMIT = 40; 
let currentSearchTerm = "";
let currentClusterId = null;

// ======================================
// 2. ASOCIACIONES Y SUGERENCIAS
// ======================================

async function fetchSuggestions(term) {
    if (term.length < 3) return []; 
    try {
        const res = await fetch(`${API_URL}/associations?term=${term}&limit=5`);
        if (!res.ok) return [];
        const data = await res.json();
        const suggestions = new Set();
        data.rules.forEach(rule => {
            rule.consequents.forEach(word => suggestions.add(word));
        });
        return Array.from(suggestions).slice(0, 5);
    } catch (error) {
        console.error("Error associations:", error);
        return [];
    }
}

function setupAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.parentElement.classList.contains("autocomplete-wrapper")) return;

    const wrapper = document.createElement("div");
    wrapper.classList.add("autocomplete-wrapper");
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const suggestionsBox = document.createElement("div");
    suggestionsBox.classList.add("suggestions-box");
    wrapper.appendChild(suggestionsBox);

    let timeoutId;
    input.addEventListener("input", () => {
        const term = input.value.trim();
        clearTimeout(timeoutId);
        if (term.length < 3) {
            suggestionsBox.style.display = "none";
            return;
        }
        timeoutId = setTimeout(async () => {
            const suggestions = await fetchSuggestions(term);
            if (suggestions.length > 0) {
                renderSuggestions(suggestions, suggestionsBox, input);
            } else {
                suggestionsBox.style.display = "none";
            }
        }, 300);
    });

    document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target)) {
            suggestionsBox.style.display = "none";
        }
    });
}

function renderSuggestions(list, box, input) {
    box.innerHTML = "";
    box.style.display = "block";
    list.forEach(word => {
        const item = document.createElement("div");
        item.classList.add("suggestion-item");
        item.innerHTML = `Relacionado: <strong>${word}</strong>`;
        item.addEventListener("click", () => {
            input.value = word; 
            box.style.display = "none";
            searchArticles(word); 
        });
        box.appendChild(item);
    });
}

// ======================================
// 3. BÚSQUEDA Y RENDERIZADO
// ======================================

async function searchArticles(searchTerm = "", clusterId = null) {
    currentSkip = 0;
    currentSearchTerm = searchTerm;
    currentClusterId = clusterId;

    localStorage.setItem("search_term", searchTerm);
    localStorage.setItem("selected_cluster", clusterId || "");

    if (window.location.pathname.includes("search_page.html")) {
        await fetchAndRender(true); 
    } else {
        window.location.href = "search_page.html";
    }
}

async function fetchAndRender(resetList = false) {
    const url = new URL(`${API_URL}/articles`);
    
    if (currentSearchTerm) url.searchParams.append("search", currentSearchTerm);
    if (currentClusterId) url.searchParams.append("cluster_id", currentClusterId);
    
    url.searchParams.append("limit", LIMIT);
    url.searchParams.append("skip", currentSkip);

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Error API");
        const data = await res.json();

        const countSpan = document.getElementById("result-count");
        if (countSpan) {
            countSpan.textContent = `(${data.total_results})`;
            localStorage.setItem("search_total", data.total_results);
        }

        renderSearchResults(data.articles, resetList);

        const loadMoreBtn = document.getElementById("loadMoreBtn");
        if (loadMoreBtn) {
            if (data.articles.length < LIMIT) {
                loadMoreBtn.style.display = "none";
            } else {
                loadMoreBtn.style.display = "inline-block";
            }
        }
    } catch (error) {
        console.error("Error cargando artículos:", error);
    }
}

function renderSearchResults(articles, shouldClearGrid) {
    const grid = document.querySelector(".articles-grid");
    if (!grid) return;

    if (shouldClearGrid) grid.innerHTML = "";

    if (articles.length === 0 && shouldClearGrid) {
        grid.innerHTML = `<p style="text-align:center; width:100%; color:#555;">No se encontraron resultados.</p>`;
        return;
    }

    articles.forEach(article => {
        const card = document.createElement("button");
        card.classList.add("article-card");
        
        card.addEventListener("click", () => {
            localStorage.setItem("selected_article", JSON.stringify(article));
            window.location.href = "article.html";
        });

        let keywordsText = article.cluster_name || "Sin categoría";

        let clusterId = String(article.final_cluster).split('.')[0];
        if (!clusterId || clusterId === "-1" || clusterId === "nan" || clusterId === "null") {
            clusterId = "default";
        }

        const imagePath = `assets/clusters/${clusterId}.jpg`;
        const fallbackImage = `assets/logo_barquito.png`;

        card.innerHTML = `
            <img 
                src="${imagePath}" 
                alt="${article.cluster_name}" 
                class="card-image"
                onerror="this.onerror=null; this.src='${fallbackImage}';"
            >
            <div class="card-info">
                <h2 class="article-name">${article.title || "Sin Título"}</h2>
                <p class="keywords" style="color: rgba(255, 255, 255, 1);">${keywordsText}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ======================================
// 4. INICIALIZACIÓN DE PÁGINAS
// ======================================

async function loadClusters() {
    try {
        const res = await fetch(`${API_URL}/clusters`);
        const data = await res.json();
        const tagContainer = document.getElementById("tags-container");
        if (!tagContainer) return;

        tagContainer.innerHTML = "";
        data.clusters.forEach(cluster => {
            const tag = document.createElement("span");
            tag.classList.add("tag");
            tag.textContent = `${cluster.name} (${cluster.article_count})`;
            tag.addEventListener("click", () => searchArticles("", cluster.id));
            tagContainer.appendChild(tag);
        });
    } catch (error) { console.error("Error clusters", error); }
}

function setupMainSearch() {
    setupAutocomplete("main-search");
    const searchInput = document.getElementById("main-search");
    const searchBtn = document.querySelector(".search-btn");
    if (!searchInput) return;

    const runSearch = () => searchArticles(searchInput.value.trim());
    searchBtn.addEventListener("click", runSearch);
    searchInput.addEventListener("keypress", (e) => { if (e.key === "Enter") runSearch(); });
}

function initializeSearchPage() {
    setupAutocomplete("searchInput");
    const storedTerm = localStorage.getItem("search_term") || "";
    const storedTotal = localStorage.getItem("search_total");

    const input = document.getElementById("searchInput");
    if (input) {
        input.value = storedTerm;
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") searchArticles(input.value.trim());
        });
    }

    const countSpan = document.getElementById("result-count");
    if (countSpan && storedTotal) countSpan.textContent = `(${storedTotal})`;

    currentSearchTerm = storedTerm;
    currentClusterId = localStorage.getItem("selected_cluster") || null;
    currentSkip = 0;

    setupLoadMore();
    fetchAndRender(true); 
    loadAutoRandomFilters(); 
}

function setupLoadMore() {
    const btn = document.getElementById("loadMoreBtn");
    if (!btn) return;
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener("click", async () => {
        currentSkip += LIMIT; 
        await fetchAndRender(false); 
    });
}

function initializeArticlePage() {
    const articleData = localStorage.getItem("selected_article");
    if (!articleData) {
        console.error("No hay artículo seleccionado");
        return;
    }

    let article;
    try {
        article = JSON.parse(articleData);
    } catch (e) {
        console.error("Error parseando artículo:", e);
        return;
    }

    if (article.title) document.title = `${article.title} | BARKEDLOGY`;

    const titleElem = document.getElementById("art-title");
    const linkElem = document.getElementById("art-link");
    const clusterElem = document.getElementById("art-cluster");
    const abstractElem = document.getElementById("art-abstract");

    if (titleElem) titleElem.textContent = article.title || "Sin Título";
    
    if (linkElem) {
        linkElem.href = article.link || "#";
        linkElem.textContent = article.link ? "Ir a la fuente original" : "Enlace no disponible";
    }
    
    if (clusterElem) clusterElem.textContent = `Categoría: ${article.cluster_name || "General"}`;
    
    if (abstractElem) {
        const textContent = article.abstract || article.clean_abstract || "No hay resumen disponible para este artículo.";
        
        abstractElem.innerHTML = ""; 
        
        const p = document.createElement("p");
        p.innerText = textContent; 
        abstractElem.appendChild(p);
    }

    const toggleBtn = document.getElementById("toggleSidebar");
    const sidebar = document.getElementById("mainSidebar");
    
    if (toggleBtn) {
        const newToggle = toggleBtn.cloneNode(true);
        toggleBtn.parentNode.replaceChild(newToggle, toggleBtn);
        
        newToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            document.body.classList.toggle("sidebar-open");
        });

        document.addEventListener("click", (e) => {
            const isClickInsideSidebar = sidebar && sidebar.contains(e.target);
            const isClickOnButton = newToggle.contains(e.target);
            if (!isClickInsideSidebar && !isClickOnButton && document.body.classList.contains("sidebar-open")) {
                document.body.classList.remove("sidebar-open");
            }
        });
    }

    setupAutocomplete("sidebarSearchInput");
    const sideInput = document.getElementById("sidebarSearchInput");
    const sideBtn = document.getElementById("sidebarSearchBtn");

    if (sideBtn && sideInput) {
        const runSideSearch = () => {
            const term = sideInput.value.trim();
            if(term) searchArticles(term); 
        };
        sideBtn.addEventListener("click", runSideSearch);
        sideInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") runSideSearch();
        });
    }
}

async function loadAutoRandomFilters() {
    const container = document.getElementById("sidebar-keywords-container");
    if (!container) return;
    try {
        const res = await fetch(`${API_URL}/clusters`);
        if (!res.ok) throw new Error("Error clusters");
        const data = await res.json();
        const validClusters = data.clusters.filter(c => 
            c.name && c.name !== "Sin categoría" && c.name !== "-1" && 
            c.name.toLowerCase() !== "nan" && c.article_count > 0 
        );
        validClusters.sort(() => 0.5 - Math.random());
        const selected = validClusters.slice(0, 6);
        container.innerHTML = "";
        selected.forEach(cluster => {
            const btn = document.createElement("button");
            btn.classList.add("keyword-tag");
            btn.textContent = cluster.name; 
            btn.addEventListener("click", () => searchArticles("", cluster.id));
            container.appendChild(btn);
        });
    } catch (error) { console.error(error); }
}

// ======================================
// 5. ROUTER
// ======================================

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    if (path.includes("index.html") || path.endsWith("/")) {
        loadClusters();
        setupMainSearch();
    } else if (path.includes("search_page.html")) {
        initializeSearchPage();
    } else if (path.includes("article.html")) {
        initializeArticlePage();
    }
});