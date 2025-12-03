//control de ventanas
document.getElementById("minimizeBtn").addEventListener("click", () => {
  window.api.minimizeWindow();
});

document.getElementById("closeBtn").addEventListener("click", () => {
  window.api.destroyWindow();
});

//cargar recordatorios al abrir la ventana
async function loadReminders() {
  const body = document.getElementById("remindersListBody");
  const reminders = await window.api.getAllReminders();

  body.innerHTML = "";

  if (reminders.length === 0) {
    body.innerHTML = '<div class="no-reminders-message">You have no active reminders</div>';
  } else {
    reminders.forEach((reminder) => {
      const reminderItem = document.createElement("div");
      reminderItem.className = "reminder-item";
      reminderItem.style.borderLeftColor = reminder.color || "#ffffff";

      // Header con título y badge de repeat
      const header = document.createElement("div");
      header.className = "reminder-item-header";

      const title = document.createElement("div");
      title.className = "reminder-item-title";
      title.textContent = reminder.noteName || `Note ${reminder.noteId}`;

      header.appendChild(title);

      // Badge si es repetitivo
      if (reminder.repeat) {
        const badge = document.createElement("div");
        badge.className = "reminder-item-badge";
        badge.style.backgroundColor = reminder.color || "#4cd964";
        badge.textContent = "Repeat daily";
        header.appendChild(badge);
      }

      // Información de fecha y hora
      const info = document.createElement("div");
      info.className = "reminder-item-info";

      const dateSpan = document.createElement("span");
      dateSpan.className = "reminder-item-date";
      dateSpan.innerHTML = `<img src="../icons/calendar.png" alt="Calendar" class="reminder-icon"> ${formatDate(reminder.date)}`;

      const timeSpan = document.createElement("span");
      timeSpan.className = "reminder-item-time";
      timeSpan.innerHTML = `<img src="../icons/clock.png" alt="Clock" class="reminder-icon"> ${reminder.time}`;

      info.appendChild(dateSpan);
      info.appendChild(timeSpan);

      // Botón de cancelar
      const actions = document.createElement("div");
      actions.className = "reminder-item-actions";

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "cancel-reminder-btn";
      cancelBtn.textContent = "Cancel Reminder";
      cancelBtn.addEventListener("click", async () => {
        await window.api.cancelReminder(reminder.noteId);
        // Recargar la lista
        loadReminders();
      });

      actions.appendChild(cancelBtn);

      // Ensamblar el item
      reminderItem.appendChild(header);
      reminderItem.appendChild(info);
      reminderItem.appendChild(actions);

      body.appendChild(reminderItem);
    });
  }
}

// Formatear fecha para mostrar de forma legible
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

loadReminders();
