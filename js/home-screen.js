function showEditor() {
  homeScreenEl.classList.add("hidden");
  editorScreenEl.classList.remove("hidden");
  resetCanvasView();
  resetUndoHistory();
}

function showHome() {
  editorScreenEl.classList.add("hidden");
  homeScreenEl.classList.remove("hidden");
}

function createNewPresentation() {
  currentPresentationId = "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  currentPresentationName = "Untitled presentation";
  slides = [
    {
      id: 1,
      elements: [],
      backgroundColor: "#ffffff",
      transition: { type: "none", direction: "left", duration: 500, easing: "linear" },
    },
  ];
  currentSlideIndex = 0;
  clearSelection();
  editingElementIndex = null;

  presentationTitleEl.value = currentPresentationName;
  showEditor();
  renderAll();
  saveCurrentPresentation();
}

function openPresentation(id) {
  const presentation = presentations.find((p) => p.id === id);
  if (!presentation) return;

  currentPresentationId = presentation.id;
  currentPresentationName = presentation.name;
  slides = presentation.slides;
  ensureElementIds(slides);
  currentSlideIndex = 0;
  clearSelection();
  editingElementIndex = null;

  presentationTitleEl.value = currentPresentationName;
  showEditor();
  renderAll();
}

function goHome() {
  commitEditingText();
  saveCurrentPresentation();
  showHome();
  renderRecentList();
}

function renderRecentList() {
  recentGridEl.innerHTML = "";

  const sorted = [...presentations].sort((a, b) => b.updatedAt - a.updatedAt);

  sorted.forEach((presentation) => {
    const card = document.createElement("div");
    card.className = "presentation-card";

    const thumb = document.createElement("div");
    thumb.className = "presentation-card-thumb";

    const name = document.createElement("div");
    name.className = "presentation-card-name";
    name.textContent = presentation.name || "Untitled presentation";

    const date = document.createElement("div");
    date.className = "presentation-card-date";
    date.textContent = formatDate(presentation.updatedAt);

    card.appendChild(thumb);
    card.appendChild(name);
    card.appendChild(date);

    card.addEventListener("click", () => openPresentation(presentation.id));

    recentGridEl.appendChild(card);

    const previewSlide = presentation.slides[0];
    if (previewSlide) {
      thumb.appendChild(buildMiniSlidePreview(previewSlide, thumb.clientWidth, 3));
    }

    const slideCount = presentation.slides.length;
    const badge = document.createElement("div");
    badge.className = "slide-count-badge";
    badge.textContent = slideCount + (slideCount === 1 ? " slide" : " slides");
    thumb.appendChild(badge);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "presentation-card-delete";
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm('Delete "' + (presentation.name || "Untitled presentation") + '"?')) {
        presentations = presentations.filter((p) => p.id !== presentation.id);
        persistPresentationsToStorage();
        renderRecentList();
      }
    });
    thumb.appendChild(deleteBtn);
  });
}

newPresentationBtn.addEventListener("click", () => {
  createNewPresentation();
});

const homeImportBtn = document.getElementById("homeImportBtn");

homeImportBtn.addEventListener("click", () => {
  fileInputEl.click();
});

homeBtn.addEventListener("click", () => {
  goHome();
});

presentationTitleEl.addEventListener("input", () => {
  currentPresentationName = presentationTitleEl.value;
  scheduleSave();
});
