import { state, setCurrentView } from '../data/State.js';

export const Sidebar = {
     init(onViewChange) {
        this.onViewChangeCallback = onViewChange;
        this.setupNavigation();
        this.setupCollapseButtons();
    },

    setupNavigation() {
        document.querySelectorAll(".nav-item[data-view]").forEach((item) => {
            item.addEventListener("click", (e) => {

                e.preventDefault();


                // UI Update
                document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
                item.classList.add("active");

                // State Update
                const view = item.dataset.view;
                setCurrentView(view);

                // Callback to main controller
                if (this.onViewChangeCallback) this.onViewChangeCallback(view);
            });
        });
    },

    setupCollapseButtons() {
        document.querySelectorAll(".nav-collapse-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const sectionId = btn.dataset.section + "Section";
                const section = document.getElementById(sectionId);

                if(section) {
                    btn.classList.toggle("collapsed");
                    section.classList.toggle("collapsed");
                }
            });
        });
    },

    updateCounts(notes) {
        // All Notes Count
        const allCount = document.getElementById("allNotesCount");
        if(allCount) allCount.textContent = notes.length;

        // Status Counts
        const counts = { active: 0, onhold: 0, completed: 0, dropped: 0 };
        notes.forEach(note => {
            if (note.status && counts.hasOwnProperty(note.status)) {
                counts[note.status]++;
            }
        });

        this.setCount("count-active", counts.active);
        this.setCount("count-onhold", counts.onhold);
        this.setCount("count-completed", counts.completed);
        this.setCount("count-dropped", counts.dropped);
    },

    setCount(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    },

    // Método para activar visualmente un item del menú (útil para tags)
    setActiveItem(selector) {
        document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
        const item = document.querySelector(selector);
        if (item) item.classList.add("active");
    },

    updateTags(notes) {
        const tagsSection = document.getElementById("tagsSection");
        if (!tagsSection) return;

        // 1. Contar tags
        const tagMap = {};
        notes.forEach(note => {
            if (note.tags && Array.isArray(note.tags)) {
                note.tags.forEach(tag => {
                    tagMap[tag] = (tagMap[tag] || 0) + 1;
                });
            }
        });

        // 2. Limpiar y ordenar
        tagsSection.innerHTML = "";
        const sortedTags = Object.keys(tagMap).sort();

        // 3. Crear elementos
        sortedTags.forEach(tagName => {
            const tagItem = document.createElement("a");
            tagItem.href = "#";
            tagItem.className = "nav-item nav-nested";
            tagItem.dataset.view = `tag-${tagName}`; // Usamos el mismo sistema de vistas

            const hashSpan = document.createElement("span");
            hashSpan.className = "tag-hash";
            hashSpan.textContent = "#";

            const nameSpan = document.createElement("span");
            nameSpan.textContent = tagName;

            const countSpan = document.createElement("span");
            countSpan.className = "nav-count";
            countSpan.textContent = tagMap[tagName];

            tagItem.appendChild(hashSpan);
            tagItem.appendChild(nameSpan);
            tagItem.appendChild(countSpan);

            // Click handler (Reutilizamos la lógica de navegación)
            tagItem.addEventListener("click", (e) => {
                e.preventDefault();
                // Simulamos click en un nav-item normal para que Sidebar.js lo maneje
                // O mejor, llamamos manualmente al cambio de vista si es necesario,
                // pero como le pusimos data-view, podemos simplemente añadirle el listener de navegación.

                // Hack rápido: Añadirle el listener de navegación manualmente aquí mismo
                // para no tener que re-ejecutar setupNavigation
                document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
                tagItem.classList.add("active");

                // Importante: Necesitamos acceder a setCurrentView y al callback onViewChange
                // Como están en el scope del init, lo mejor es despachar un evento o llamar a una función global.
                // Pero para mantenerlo simple, vamos a asumir que dashboard.js maneja el cambio de vista
                // si el elemento tiene la clase correcta y se inicializó.

                // MEJOR OPCIÓN: Disparar un evento custom que dashboard.js escuche,
                // O simplemente llamar a la función de cambio de vista si la guardamos.
            });

            tagsSection.appendChild(tagItem);
        });

        // Re-aplicar listeners de navegación a los nuevos elementos
        // Esto es un poco sucio, pero efectivo.
        this.setupNavigation(this.onViewChangeCallback);
    }
};
