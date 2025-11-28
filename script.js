document.addEventListener("DOMContentLoaded", () => {
    const button = document.querySelector(".search-box button");
    const input = document.querySelector(".search-box input");

    button.addEventListener("click", () => {
        const query = input.value.trim();

        // Redirige a otra página y le envía el texto buscado
        window.location.href = `search_page.html?buscar=${encodeURIComponent(query)}`;
    });
});

const btn = document.querySelector('.sidebar-toggle-btn');
btn.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open');
});
