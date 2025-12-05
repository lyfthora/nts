//control de ventanas
document.getElementById("minimizeBtn").addEventListener("click", () => {
  window.api.minimizeWindow();
});
document.getElementById("closeBtn").addEventListener("click", () => {
  window.api.destroyWindow();
});

// ========== SIDEBAR NAVIGATION ==========

// Handle collapsible sections
document.querySelectorAll(".nav-collapse-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const sectionId = btn.dataset.section + "Section";
    const section = document.getElementById(sectionId);

    btn.classList.toggle("collapsed");
    section.classList.toggle("collapsed");
  });
});

// Handle navigation item clicks
document.querySelectorAll(".nav-item[data-view]").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();

    // Remove active class from all items
    document.querySelectorAll(".nav-item").forEach((navItem) => {
      navItem.classList.remove("active");
    });

    // Add active class to clicked item
    item.classList.add("active");

    // Update content title
    const view = item.dataset.view;
    updateContentTitle(view);

    // TODO: Filter notes based on view (will be implemented in future phase)
    console.log("Selected view:", view);
  });
});

function updateContentTitle(view) {
  const titleElement = document.getElementById("contentTitle");
  const titleMap = {
    "all-notes": "All Notes",
    "pinned": "Pinned Notes",
    "notebook-study": "study",
    "notebook-py": "study / py",
    "trash": "Trash",
    "status-active": "Active Notes",
    "status-onhold": "On Hold Notes",
    "status-completed": "Completed Notes",
    "status-dropped": "Dropped Notes",
    "tag-work": "#work",
    "tag-personal": "#personal"
  };

  titleElement.textContent = titleMap[view] || "Dashboard";
}

// ========== NOTE EDITOR ==========

let currentNote = null;
let allNotes = [];

// Add Note Button - creates note WITHOUT opening floating window
document.getElementById("addNoteBtn").addEventListener("click", async () => {
  const newNote = await window.api.createNoteDashboard();
  if (newNote) {
    await loadAllNotes();
    // Auto-select the new note
    loadNoteInEditor(newNote);
  }
});

// Delete Note Button
document.getElementById("deleteNoteBtn").addEventListener("click", async () => {
  if (!currentNote) return;

  if (confirm(`Delete "${currentNote.name}"?`)) {
    await window.api.deleteNote(currentNote.id);
    currentNote = null;
    clearEditor();
    loadAllNotes();
  }
});

// Note Title Input
document.getElementById("noteTitleInput").addEventListener("input", (e) => {
  if (!currentNote) return;
  currentNote.name = e.target.value;
  saveCurrentNote();
});

// Note Content Editor
document.getElementById("noteContentEditor").addEventListener("input", (e) => {
  if (!currentNote) return;
  currentNote.content = e.target.value;
  saveCurrentNote();
});

// ========== METADATA FUNCTIONALITY ==========

// Status Dropdown
const statusDropdown = document.getElementById("statusDropdown");
const statusBtn = document.getElementById("statusBtn");
const statusMenu = document.getElementById("statusMenu");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

// Toggle status dropdown
statusBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  statusDropdown.classList.toggle("active");
});

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!statusDropdown.contains(e.target)) {
    statusDropdown.classList.remove("active");
  }
});

// Handle status selection
document.querySelectorAll(".status-option").forEach((option) => {
  option.addEventListener("click", () => {
    if (!currentNote) return;

    const status = option.dataset.status;
    currentNote.status = status;

    // Update UI
    updateStatusDisplay(status);

    // Close dropdown
    statusDropdown.classList.remove("active");

    // Save note
    saveCurrentNote();
  });
});

function updateStatusDisplay(status) {
  const statusMap = {
    "active": { text: "Active", class: "status-active" },
    "onhold": { text: "On Hold", class: "status-onhold" },
    "completed": { text: "Completed", class: "status-completed" },
    "dropped": { text: "Dropped", class: "status-dropped" }
  };

  const statusInfo = statusMap[status];
  if (statusInfo) {
    statusText.textContent = statusInfo.text;
    statusDot.className = `status-dot ${statusInfo.class}`;
    statusDot.style.display = "inline-block";
  } else {
    statusText.textContent = "Status";
    statusDot.style.display = "none";
  }
}

// Tags Functionality
const tagsContainer = document.getElementById("tagsContainer");
const tagInput = document.getElementById("tagInput");

// Handle tag input - Enter or comma to add tag
tagInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    const tagName = tagInput.value.trim().replace(/,$/g, ""); // Remove trailing comma
    if (tagName) {
      addTag(tagName);
      tagInput.value = "";
    }
  }
});

function addTag(tagName) {
  if (!currentNote) return;

  // Initialize tags array if needed
  if (!currentNote.tags) {
    currentNote.tags = [];
  }

  // Don't add duplicates
  if (currentNote.tags.includes(tagName)) {
    return;
  }

  // Add tag to note
  currentNote.tags.push(tagName);

  // Update UI
  renderTags();

  // Save note
  saveCurrentNote();
}

function removeTag(tagName) {
  if (!currentNote || !currentNote.tags) return;

  currentNote.tags = currentNote.tags.filter(t => t !== tagName);
  renderTags();
  saveCurrentNote();
}

function renderTags() {
  if (!currentNote) return;

  tagsContainer.innerHTML = "";

  if (currentNote.tags && currentNote.tags.length > 0) {
    currentNote.tags.forEach(tag => {
      const tagBadge = document.createElement("div");
      tagBadge.className = "tag-badge";

      const tagText = document.createElement("span");
      tagText.textContent = tag;

      const removeBtn = document.createElement("button");
      removeBtn.className = "tag-remove";
      removeBtn.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      removeBtn.addEventListener("click", () => removeTag(tag));

      tagBadge.appendChild(tagText);
      tagBadge.appendChild(removeBtn);
      tagsContainer.appendChild(tagBadge);
    });
  }
}



// Save current note with debounce
let saveTimeout;
function saveCurrentNote() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    if (currentNote) {
      window.api.updateNote(currentNote);
      // Update the note in the list
      updateNoteInList(currentNote);
    }
  }, 500);
}

function updateNoteInList(note) {
  const noteItem = document.querySelector(`[data-note-id="${note.id}"]`);
  if (noteItem) {
    const titleEl = noteItem.querySelector(".note-list-item-title");
    const previewEl = noteItem.querySelector(".note-list-item-preview");

    titleEl.textContent = note.name || "Untitled";
    previewEl.textContent = note.content || "Empty note";
    previewEl.className = note.content
      ? "note-list-item-preview"
      : "note-list-item-preview note-list-item-empty";
  }
}

function clearEditor() {
  document.getElementById("noteTitleInput").value = "";
  document.getElementById("noteContentEditor").value = "";
  document.getElementById("editorPlaceholder").classList.remove("hidden");

  // Clear status
  updateStatusDisplay(null);

  // Clear tags
  tagsContainer.innerHTML = "";

  // Remove active class from all note items
  document.querySelectorAll(".note-list-item").forEach((item) => {
    item.classList.remove("active");
  });
}

function loadNoteInEditor(note) {
  currentNote = note;
  document.getElementById("noteTitleInput").value = note.name || "";
  document.getElementById("noteContentEditor").value = note.content || "";
  document.getElementById("editorPlaceholder").classList.add("hidden");

  // Load status
  updateStatusDisplay(note.status);

  // Load tags
  renderTags();

  // Set active class
  document.querySelectorAll(".note-list-item").forEach((item) => {
    if (item.dataset.noteId == note.id) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}


// Load all notes into the list panel
async function loadAllNotes() {
  const notes = await window.api.getAllNotes();
  allNotes = notes;

  const listBody = document.getElementById("notesListPanel");
  listBody.innerHTML = "";

  // Update sidebar count
  document.getElementById("allNotesCount").textContent = notes.length;

  if (notes.length === 0) {
    listBody.innerHTML = '<div class="no-items-message">No notes yet. Click + to create one.</div>';
    return;
  }

  // Sort notes by ID (most recent first)
  const sortedNotes = notes.sort((a, b) => b.id - a.id);

  sortedNotes.forEach((note) => {
    const noteItem = document.createElement("div");
    noteItem.className = "note-list-item";
    noteItem.style.borderLeftColor = note.color || "#667eea";
    noteItem.dataset.noteId = note.id;
    noteItem.draggable = true; // Make draggable

    const title = document.createElement("div");
    title.className = "note-list-item-title";
    title.textContent = note.name || "Untitled";

    const preview = document.createElement("div");
    preview.className = note.content
      ? "note-list-item-preview"
      : "note-list-item-preview note-list-item-empty";
    preview.textContent = note.content || "Empty note";

    noteItem.appendChild(title);
    noteItem.appendChild(preview);

    // Click to edit in dashboard
    noteItem.addEventListener("click", () => {
      loadNoteInEditor(note);
    });

    // Drag to open as floating window
    noteItem.addEventListener("dragstart", (e) => {
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("text/plain", note.id);
      noteItem.style.opacity = "0.5";
    });

    noteItem.addEventListener("dragend", (e) => {
      noteItem.style.opacity = "1";
      // Open floating window at drop position
      const x = e.screenX;
      const y = e.screenY;
      window.api.openNoteWindow(note.id, x, y);
    });

    listBody.appendChild(noteItem);
  });
}

//cargar dashboard al abrir la ventana
async function loadDashboard() {
  await loadAllNotes();
}

loadDashboard();
