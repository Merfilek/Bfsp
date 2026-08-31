let currentPresentationId = null;
let currentPresentationName = "Untitled presentation";
let saveTimeout = null;

function loadPresentationsFromStorage() {
  try {
    const raw = localStorage.getItem("bfsp_presentations");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

let presentations = loadPresentationsFromStorage();

function persistPresentationsToStorage() {
  localStorage.setItem("bfsp_presentations", JSON.stringify(presentations));
}

function saveCurrentPresentation() {
  if (!currentPresentationId) return;

  const data = {
    id: currentPresentationId,
    name: currentPresentationName,
    slides: slides,
    updatedAt: Date.now(),
  };

  const existing = presentations.find((p) => p.id === currentPresentationId);
  if (existing) {
    Object.assign(existing, data);
  } else {
    presentations.push(data);
  }

  persistPresentationsToStorage();
}

function scheduleSave() {
  if (!currentPresentationId) return;
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveCurrentPresentation, 400);
}

function formatDate(timestamp) {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return day + "/" + month + "/" + year + " " + hours + ":" + minutes;
}
