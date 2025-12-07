import { state, setCurrentNote } from '../data/State.js';

export const Editor = {
    init(onSave) {
        this.onSave = onSave;
        this.setupInputs();
        this.setupStatusDropdown();
        this.setupTags();
        this.setupDeleteButton();
    },

    setupInputs() {
        const titleInput = document.getElementById("noteTitleInput");
        const contentEditor = document.getElementById("noteContentEditor");

        titleInput.addEventListener("input", (e) => {
            if (!state.currentNote) return;
            state.currentNote.name = e.target.value;
            this.triggerSave();
        });

        contentEditor.addEventListener("input", (e) => {
            if (!state.currentNote) return;
            state.currentNote.content = e.target.value;
            this.triggerSave();
        });
    },

    setupStatusDropdown() {
        const statusBtn = document.getElementById("statusBtn");
        const statusDropdown = document.getElementById("statusDropdown");

        statusBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            statusDropdown.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (!statusDropdown.contains(e.target)) {
                statusDropdown.classList.remove("active");
            }
        });

        document.querySelectorAll(".status-option").forEach((option) => {
            option.addEventListener("click", () => {
                if (!state.currentNote) return;

                const status = option.dataset.status;
                state.currentNote.status = status;

                this.updateStatusUI(status);
                statusDropdown.classList.remove("active");
                this.triggerSave();
            });
        });
    },

    setupTags() {
        const tagInput = document.getElementById("tagInput");

        tagInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                const tagName = tagInput.value.trim().replace(/,$/g, "");
                if (tagName) {
                    this.addTag(tagName);
                    tagInput.value = "";
                }
            }
        });
    },

    setupDeleteButton() {
        const deleteBtn = document.getElementById("deleteNoteBtn");
        if (deleteBtn && this.onDelete) {
            deleteBtn.addEventListener("click", () => {
                if (state.currentNote) {
                    this.onDelete(state.currentNote);
                }
            });
        }
    },

    loadNote(note) {
        setCurrentNote(note);

        document.getElementById("noteTitleInput").value = note.name || "";
        document.getElementById("noteContentEditor").value = note.content || "";
        document.getElementById("editorPlaceholder").classList.add("hidden");

        this.updateStatusUI(note.status);
        this.renderTags();
    },

    clear() {
        setCurrentNote(null);
        document.getElementById("noteTitleInput").value = "";
        document.getElementById("noteContentEditor").value = "";
        document.getElementById("editorPlaceholder").classList.remove("hidden");

        this.updateStatusUI(null);
        document.getElementById("tagsContainer").innerHTML = "";
    },

    updateStatusUI(status) {
        const statusText = document.getElementById("statusText");
        const statusDot = document.getElementById("statusDot");
        const statusBtn = document.getElementById("statusBtn");

        const statusMap = {
            "active": { text: "Active", class: "status-active" },
            "onhold": { text: "On Hold", class: "status-onhold" },
            "completed": { text: "Completed", class: "status-completed" },
            "dropped": { text: "Dropped", class: "status-dropped" }
        };

        const info = statusMap[status];
        if (info) {
            statusText.textContent = info.text;
            statusDot.className = `status-dot ${info.class}`;
            statusDot.style.display = "inline-block";
            statusBtn.classList.add("selected");
        } else {
            statusText.textContent = "Status";
            statusDot.style.display = "none";
            statusBtn.classList.remove("selected");
        }
    },

    addTag(tagName) {
        if (!state.currentNote) return;
        if (!state.currentNote.tags) state.currentNote.tags = [];
        if (state.currentNote.tags.includes(tagName)) return;

        state.currentNote.tags.push(tagName);
        this.renderTags();
        this.triggerSave();
    },

    removeTag(tagName) {
        if (!state.currentNote || !state.currentNote.tags) return;
        state.currentNote.tags = state.currentNote.tags.filter(t => t !== tagName);
        this.renderTags();
        this.triggerSave();
    },

    renderTags() {
        const container = document.getElementById("tagsContainer");
        container.innerHTML = "";

        if (state.currentNote && state.currentNote.tags) {
            state.currentNote.tags.forEach(tag => {
                const badge = document.createElement("div");
                badge.className = "tag-badge";

                const text = document.createElement("span");
                text.textContent = tag;

                const removeBtn = document.createElement("button");
                removeBtn.className = "tag-remove";
                removeBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

                removeBtn.addEventListener("click", () => this.removeTag(tag));

                badge.appendChild(text);
                badge.appendChild(removeBtn);
                container.appendChild(badge);
            });
        }
    },

    // Debounce save
    saveTimeout: null,
    triggerSave() {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            if (this.onSave && state.currentNote) {
                this.onSave(state.currentNote);
            }
        }, 500);
    }
};
