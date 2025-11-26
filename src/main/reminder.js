// Sistema de Recordatorios Simple
const activeReminders = new Map();

function setReminder(ipcMain, getAllNotes, noteWindows, { noteId, date, time, repeat }) {
  console.log("Setting reminder:", { noteId, date, time, repeat });

  // Cancelar recordatorio anterior si existe
  if (activeReminders.has(noteId)) {
    clearTimeout(activeReminders.get(noteId));
    activeReminders.delete(noteId);
  }

  const now = new Date();
  const reminderDateTime = new Date(`${date}T${time}`);
  const delay = reminderDateTime - now;

  console.log(`Reminder will trigger in ${Math.floor(delay / 1000)} seconds`);

  // Si la hora ya pasó, no hacer nada
  if (delay < 0) {
    console.log("Reminder time has already passed!");
    return;
  }

  // Configurar timeout para la hora exacta
  const timeoutId = setTimeout(() => {
    console.log(`funciona`);
    showReminderNotification(getAllNotes, noteWindows, noteId);

    // Si se repite, configurar para mañana
    if (repeat) {
      const tomorrow = new Date(reminderDateTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const newDate = tomorrow.toISOString().split("T")[0];

      // Reconfigurar para mañana (esperar 1 segundo)
      setTimeout(() => {
        setReminder(ipcMain, getAllNotes, noteWindows, { noteId, date: newDate, time, repeat });
      }, 1000);
    } else {
      activeReminders.delete(noteId);
    }
  }, delay);

  activeReminders.set(noteId, timeoutId);
}

function showReminderNotification(getAllNotes, noteWindows, noteId) {
  const notes = getAllNotes();
  const note = notes.find((n) => n.id === noteId);

  if (!note) return;

  const { Notification } = require("electron");

  const notification = new Notification({
    title: "Reminder",
    body: note.content || "You have a reminder!",
    silent: false,
  });

  notification.show();
  console.log(`note: ${noteId}`);

  notification.on("click", () => {
    const noteWin = noteWindows.find((win) => !win.isDestroyed());
    if (noteWin) {
      noteWin.show();
      noteWin.focus();
    }
  });
}

module.exports = { setReminder };
