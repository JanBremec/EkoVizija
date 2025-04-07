// static/script.js
document.addEventListener('DOMContentLoaded', () => {
    // Toggle sidebar visibility
    document.querySelectorAll('.toggle-button').forEach(button => {
        button.addEventListener('click', () => {
            const sidebarContent = button.closest('.left-sidebar, .right-sidebar').querySelector('.sidebar-content');
            sidebarContent.classList.toggle('collapsed'); // Toggles the 'collapsed' class
        });
    });

    const panel = document.getElementById('panel');
        const arrow = document.getElementById('arrow');
        let isOpen = false;

        arrow.addEventListener('click', () => {
            isOpen = !isOpen;
            panel.style.bottom = isOpen ? '0' : '-200px';
            arrow.textContent = isOpen ? '▼' : '▲';
        });
});



