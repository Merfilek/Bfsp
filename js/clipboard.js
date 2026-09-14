function cloneElementData(element) {
  return JSON.parse(JSON.stringify(element));
}

function cloneSlideData(slide) {
  return JSON.parse(JSON.stringify(slide));
}

function copySelectedElements() {
  if (selectedElementIndices.length === 0) return;
  const elements = slides[currentSlideIndex].elements;
  internalClipboard = selectedElementIndices.map((index) => cloneElementData(elements[index]));
  lastCopyKind = "element";
}

function cutSelectedElements() {
  if (selectedElementIndices.length === 0) return;
  copySelectedElements();
  const elements = slides[currentSlideIndex].elements;
  const sortedDesc = [...selectedElementIndices].sort((a, b) => b - a);
  sortedDesc.forEach((index) => elements.splice(index, 1));
  clearSelection();
  renderSlideCanvas();
}

function pasteClipboardElements(targetX, targetY) {
  if (!internalClipboard || internalClipboard.length === 0) return;
  const slide = slides[currentSlideIndex];
  const clones = internalClipboard.map((element) => {
    const clone = cloneElementData(element);
    clone.id = generateElementId();
    return clone;
  });

  if (typeof targetX === "number" && typeof targetY === "number") {
    const minX = Math.min(...clones.map((c) => c.x));
    const minY = Math.min(...clones.map((c) => c.y));
    const maxX = Math.max(...clones.map((c) => c.x + c.width));
    const maxY = Math.max(...clones.map((c) => c.y + c.height));
    const dx = targetX - (minX + maxX) / 2;
    const dy = targetY - (minY + maxY) / 2;
    clones.forEach((c) => {
      c.x += dx;
      c.y += dy;
    });
  }

  const startIndex = slide.elements.length;
  clones.forEach((clone) => slide.elements.push(clone));
  selectedElementIndices = clones.map((_, i) => startIndex + i);
  mainSelectedIndex = selectedElementIndices[selectedElementIndices.length - 1];
  renderAll();
}

function copyCurrentSlide() {
  const slide = slides[currentSlideIndex];
  if (!slide) return;
  slideClipboardData = cloneSlideData(slide);
  lastCopyKind = "slide";
}

function pasteClipboardSlide() {
  if (!slideClipboardData) return;
  const newSlide = cloneSlideData(slideClipboardData);
  const insertIndex = currentSlideIndex + 1;
  slides.splice(insertIndex, 0, newSlide);
  currentSlideIndex = insertIndex;
  clearSelection();
  renderAll();
}

function duplicateSelectedElements() {
  if (selectedElementIndices.length === 0) return;
  copySelectedElements();
  pasteClipboardElements();
  selectedElementIndices.forEach((index) => {
    const element = slides[currentSlideIndex].elements[index];
    element.x += 20;
    element.y += 20;
  });
  renderSlideCanvas();
}

function duplicateCurrentSlide() {
  copyCurrentSlide();
  pasteClipboardSlide();
}

function reorderSelectedElement(action) {
  const targetIndex = contextMenuTargetIndex !== null ? contextMenuTargetIndex : getPrimarySelectedIndex();
  if (targetIndex === null) return;
  const slide = slides[currentSlideIndex];
  const index = targetIndex;
  const [element] = slide.elements.splice(index, 1);

  if (action === "front") {
    slide.elements.push(element);
    selectOnly(slide.elements.length - 1);
  } else if (action === "back") {
    slide.elements.unshift(element);
    selectOnly(0);
  } else if (action === "forward") {
    const newIndex = Math.min(index + 1, slide.elements.length);
    slide.elements.splice(newIndex, 0, element);
    selectOnly(newIndex);
  } else if (action === "backward") {
    const newIndex = Math.max(index - 1, 0);
    slide.elements.splice(newIndex, 0, element);
    selectOnly(newIndex);
  }

  renderAll();
}
