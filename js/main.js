document.addEventListener(
  "mousedown",
  (e) => {
    document.querySelectorAll(".dropdown.open").forEach((dropdown) => {
      const container = dropdown.closest(".menu-item, .dropdown-anchor") || dropdown;
      if (!container.contains(e.target)) {
        dropdown.classList.remove("open");
      }
    });

    if (!contextMenuEl.classList.contains("hidden") && !contextMenuEl.contains(e.target)) {
      hideContextMenu();
    }
  },
  true
);

window.addEventListener("beforeunload", () => {
  if (editingElementIndex !== null) {
    commitEditingText();
  }
  saveCurrentPresentation();
});

renderRecentList();
