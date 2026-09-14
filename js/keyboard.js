document.addEventListener("keydown", (e) => {
  if (presentOverlay.classList.contains("active")) {
    const key = e.key.toLowerCase();
    const nextKeys = ["arrowright", "arrowdown", " ", "d", "s"];
    const prevKeys = ["arrowleft", "arrowup", "a", "w"];

    if (nextKeys.includes(key)) {
      e.preventDefault();
      nextPresentSlide();
    } else if (prevKeys.includes(key)) {
      e.preventDefault();
      prevPresentSlide();
    } else if (e.key === "Escape") {
      exitPresent();
    }
    return;
  }

  if (!blendingModalEl.classList.contains("hidden")) {
    if (e.key === "Escape") {
      closeBlendingOptions();
    }
    return;
  }

  if (e.key === "Escape" && !contextMenuEl.classList.contains("hidden")) {
    hideContextMenu();
    return;
  }

  if (e.key === "Escape" && (pendingInsertType || isPlacingShape)) {
    if (isPlacingShape && placingElementIndex !== null) {
      slides[currentSlideIndex].elements.splice(placingElementIndex, 1);
      clearSelection();
      isPlacingShape = false;
      placingElementIndex = null;
      renderSlideCanvas();
    }
    pendingInsertType = null;
    pendingImageData = null;
    slideCanvasEl.classList.remove("placing");
    return;
  }

  if (editingElementIndex !== null) return;

  const activeTag = document.activeElement ? document.activeElement.tagName : "";
  const isFormFieldFocused = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";
  if (isFormFieldFocused) return;

  const isCtrlOrCmd = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();

  if (isCtrlOrCmd && e.shiftKey && key === "z") {
    e.preventDefault();
    redo();
    return;
  }

  if (isCtrlOrCmd && key === "z") {
    e.preventDefault();
    undo();
    return;
  }

  if (isCtrlOrCmd && key === "y") {
    e.preventDefault();
    redo();
    return;
  }

  if (isCtrlOrCmd && key === "v") {
    allowNativePaste = true;
    setTimeout(() => {
      allowNativePaste = false;
    }, 500);
    return;
  }

  if (isCtrlOrCmd && key === "c") {
    e.preventDefault();
    if (selectedElementIndices.length > 0) {
      copySelectedElements();
    } else {
      copyCurrentSlide();
    }
    return;
  }

  if (isCtrlOrCmd && key === "x" && selectedElementIndices.length > 0) {
    e.preventDefault();
    cutSelectedElements();
    return;
  }

  if (isCtrlOrCmd && key === "d") {
    e.preventDefault();
    if (selectedElementIndices.length > 0) {
      duplicateSelectedElements();
    } else {
      duplicateCurrentSlide();
    }
    return;
  }

  if (isCtrlOrCmd && e.shiftKey && key === "g") {
    e.preventDefault();
    ungroupSelectedElement();
    return;
  }

  if (isCtrlOrCmd && key === "g") {
    e.preventDefault();
    if (selectedElementIndices.length >= 2) {
      groupSelectedElements();
    }
    return;
  }

  if (e.key === "Delete" || e.key === "Backspace") {
    if (selectedElementIndices.length > 0) {
      e.preventDefault();
      const elements = slides[currentSlideIndex].elements;
      [...selectedElementIndices].sort((a, b) => b - a).forEach((index) => elements.splice(index, 1));
      clearSelection();
      renderSlideCanvas();
    } else if (slides.length > 1) {
      e.preventDefault();
      slides.splice(currentSlideIndex, 1);
      currentSlideIndex = Math.min(currentSlideIndex, slides.length - 1);
      renderAll();
    }
  }
});
