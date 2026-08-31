const fileMenuBtn = document.getElementById("fileMenuBtn");
const fileDropdown = document.getElementById("fileDropdown");
const saveToFileBtn = document.getElementById("saveToFileBtn");
const openFromFileBtn = document.getElementById("openFromFileBtn");
const fileInputEl = document.getElementById("fileInput");

fileMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  fileDropdown.classList.toggle("open");
});

function exportPresentationToFile() {
  commitEditingText();
  renderSlideCanvas();

  const data = {
    name: currentPresentationName,
    slides: slides,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const safeName = (currentPresentationName || "presentation").replace(/[^a-z0-9\-_ ]/gi, "_");
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName + ".bfsp";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importPresentationFromFile(file) {
  const reader = new FileReader();

  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch (e) {
      alert("Couldn't open this file — it doesn't look like a valid .bfsp file.");
      return;
    }

    if (!data || !Array.isArray(data.slides)) {
      alert("Couldn't open this file — it doesn't look like a valid .bfsp file.");
      return;
    }

    commitEditingText();
    saveCurrentPresentation();

    currentPresentationId = "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    currentPresentationName = data.name || "Imported presentation";
    slides = data.slides;
    ensureElementIds(slides);
    currentSlideIndex = 0;
    clearSelection();
    editingElementIndex = null;

    presentationTitleEl.value = currentPresentationName;
    showEditor();
    renderAll();
    saveCurrentPresentation();
  };

  reader.readAsText(file);
}

saveToFileBtn.addEventListener("click", () => {
  fileDropdown.classList.remove("open");
  exportPresentationToFile();
});

openFromFileBtn.addEventListener("click", () => {
  fileDropdown.classList.remove("open");
  fileInputEl.click();
});

fileInputEl.addEventListener("change", () => {
  const file = fileInputEl.files[0];
  if (file) {
    importPresentationFromFile(file);
  }
  fileInputEl.value = "";
});
