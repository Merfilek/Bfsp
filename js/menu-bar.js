const editMenuBtn = document.getElementById("editMenuBtn");
const editDropdown = document.getElementById("editDropdown");
const menuUndoBtn = document.getElementById("menuUndoBtn");
const menuRedoBtn = document.getElementById("menuRedoBtn");
const menuCutBtn = document.getElementById("menuCutBtn");
const menuCopyBtn = document.getElementById("menuCopyBtn");
const menuPasteBtn = document.getElementById("menuPasteBtn");
const menuDuplicateBtn = document.getElementById("menuDuplicateBtn");
const menuSelectAllBtn = document.getElementById("menuSelectAllBtn");
const menuDeleteBtn = document.getElementById("menuDeleteBtn");

const viewMenuBtn = document.getElementById("viewMenuBtn");
const viewDropdown = document.getElementById("viewDropdown");
const menuZoomInBtn = document.getElementById("menuZoomInBtn");
const menuZoomOutBtn = document.getElementById("menuZoomOutBtn");
const menuZoomActualBtn = document.getElementById("menuZoomActualBtn");
const menuResetViewBtn = document.getElementById("menuResetViewBtn");
const menuPresentBtn = document.getElementById("menuPresentBtn");

const formatMenuBtn = document.getElementById("formatMenuBtn");
const formatDropdown = document.getElementById("formatDropdown");
const menuAlignMenuBtn = document.getElementById("menuAlignMenuBtn");
const menuAlignSubmenu = document.getElementById("menuAlignSubmenu");
const menuAlignLeftBtn = document.getElementById("menuAlignLeftBtn");
const menuAlignCenterHBtn = document.getElementById("menuAlignCenterHBtn");
const menuAlignRightBtn = document.getElementById("menuAlignRightBtn");
const menuAlignTopBtn = document.getElementById("menuAlignTopBtn");
const menuAlignCenterVBtn = document.getElementById("menuAlignCenterVBtn");
const menuAlignBottomBtn = document.getElementById("menuAlignBottomBtn");
const menuDistributeHBtn = document.getElementById("menuDistributeHBtn");
const menuDistributeVBtn = document.getElementById("menuDistributeVBtn");
const menuBringToFrontBtn = document.getElementById("menuBringToFrontBtn");
const menuBringForwardBtn = document.getElementById("menuBringForwardBtn");
const menuSendBackwardBtn = document.getElementById("menuSendBackwardBtn");
const menuSendToBackBtn = document.getElementById("menuSendToBackBtn");
const menuGroupBtn = document.getElementById("menuGroupBtn");
const menuUngroupBtn = document.getElementById("menuUngroupBtn");
const menuBlendingOptionsBtn = document.getElementById("menuBlendingOptionsBtn");
const menuObjectAnimationBtn = document.getElementById("menuObjectAnimationBtn");

const toolsMenuBtn = document.getElementById("toolsMenuBtn");
const toolsDropdown = document.getElementById("toolsDropdown");
const menuMergeShapesMenuBtn = document.getElementById("menuMergeShapesMenuBtn");
const menuMergeShapesSubmenu = document.getElementById("menuMergeShapesSubmenu");
const menuMergeUnionBtn = document.getElementById("menuMergeUnionBtn");
const menuMergeCombineBtn = document.getElementById("menuMergeCombineBtn");
const menuMergeFragmentBtn = document.getElementById("menuMergeFragmentBtn");
const menuMergeIntersectBtn = document.getElementById("menuMergeIntersectBtn");
const menuMergeSubtractBtn = document.getElementById("menuMergeSubtractBtn");

function refreshMenuBarState() {
  const slide = slides[currentSlideIndex];
  const selectedElements = selectedElementIndices.map((i) => slide.elements[i]).filter(Boolean);
  const hasSelection = selectedElements.length > 0;
  const hasMultiSelection = selectedElements.length >= 2;
  const hasDistributeSelection = selectedElements.length >= 3;
  const isSingleTarget = selectedElements.length === 1;
  const primaryElement = isSingleTarget ? selectedElements[0] : null;

  menuUndoBtn.disabled = undoIndex <= 0;
  menuRedoBtn.disabled = undoIndex >= undoHistory.length - 1;
  menuCutBtn.disabled = !hasSelection;
  menuCopyBtn.disabled = !hasSelection;
  menuPasteBtn.disabled = !internalClipboard;
  menuDuplicateBtn.disabled = !hasSelection;
  menuSelectAllBtn.disabled = !slide || slide.elements.length === 0;
  menuDeleteBtn.disabled = !hasSelection;

  menuBringToFrontBtn.disabled = !isSingleTarget;
  menuBringForwardBtn.disabled = !isSingleTarget;
  menuSendBackwardBtn.disabled = !isSingleTarget;
  menuSendToBackBtn.disabled = !isSingleTarget;
  menuGroupBtn.disabled = !hasMultiSelection;
  menuUngroupBtn.disabled = !(primaryElement && primaryElement.type === "group");
  menuBlendingOptionsBtn.disabled = !isSingleTarget;
  menuObjectAnimationBtn.disabled = !isSingleTarget;

  menuAlignMenuBtn.disabled = !hasMultiSelection;
  menuAlignLeftBtn.disabled = !hasMultiSelection;
  menuAlignCenterHBtn.disabled = !hasMultiSelection;
  menuAlignRightBtn.disabled = !hasMultiSelection;
  menuAlignTopBtn.disabled = !hasMultiSelection;
  menuAlignCenterVBtn.disabled = !hasMultiSelection;
  menuAlignBottomBtn.disabled = !hasMultiSelection;
  menuDistributeHBtn.disabled = !hasDistributeSelection;
  menuDistributeVBtn.disabled = !hasDistributeSelection;

  const allShapeOrText = hasMultiSelection && selectedElements.every((el) => el.type === "shape" || el.type === "text");
  const imageCount = selectedElements.filter((el) => el.type === "image").length;
  const isImageMaskCase =
    selectedElements.length === 2 && imageCount === 1 && selectedElements.some((el) => el.type === "shape" || el.type === "text");

  menuMergeShapesMenuBtn.disabled = !(allShapeOrText || isImageMaskCase);
  menuMergeUnionBtn.disabled = !allShapeOrText;
  menuMergeCombineBtn.disabled = !allShapeOrText;
  menuMergeFragmentBtn.disabled = !allShapeOrText;
  menuMergeIntersectBtn.disabled = !(allShapeOrText || isImageMaskCase);
  menuMergeSubtractBtn.disabled = !(allShapeOrText || isImageMaskCase);
}

editMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!editDropdown.classList.contains("open")) refreshMenuBarState();
  editDropdown.classList.toggle("open");
});

viewMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  viewDropdown.classList.toggle("open");
});

formatMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!formatDropdown.classList.contains("open")) refreshMenuBarState();
  formatDropdown.classList.toggle("open");
  menuAlignSubmenu.classList.remove("open");
});

toolsMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!toolsDropdown.classList.contains("open")) refreshMenuBarState();
  toolsDropdown.classList.toggle("open");
  menuMergeShapesSubmenu.classList.remove("open");
});

menuAlignMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (menuAlignMenuBtn.disabled) return;
  const willOpen = !menuAlignSubmenu.classList.contains("open");
  menuAlignSubmenu.classList.toggle("open");

  if (willOpen) {
    const rect = menuAlignMenuBtn.getBoundingClientRect();
    menuAlignSubmenu.style.left = rect.right + "px";
    menuAlignSubmenu.style.top = rect.top + "px";
  }
});

menuMergeShapesMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (menuMergeShapesMenuBtn.disabled) return;
  const willOpen = !menuMergeShapesSubmenu.classList.contains("open");
  menuMergeShapesSubmenu.classList.toggle("open");

  if (willOpen) {
    const rect = menuMergeShapesMenuBtn.getBoundingClientRect();
    menuMergeShapesSubmenu.style.left = rect.right + "px";
    menuMergeShapesSubmenu.style.top = rect.top + "px";
  }
});

function closeAllMenuBarDropdowns() {
  editDropdown.classList.remove("open");
  viewDropdown.classList.remove("open");
  formatDropdown.classList.remove("open");
  toolsDropdown.classList.remove("open");
  menuAlignSubmenu.classList.remove("open");
  menuMergeShapesSubmenu.classList.remove("open");
}

menuUndoBtn.addEventListener("click", () => {
  undo();
  closeAllMenuBarDropdowns();
});
menuRedoBtn.addEventListener("click", () => {
  redo();
  closeAllMenuBarDropdowns();
});
menuCutBtn.addEventListener("click", () => {
  cutSelectedElements();
  closeAllMenuBarDropdowns();
});
menuCopyBtn.addEventListener("click", () => {
  copySelectedElements();
  closeAllMenuBarDropdowns();
});
menuPasteBtn.addEventListener("click", () => {
  pasteClipboardElements();
  closeAllMenuBarDropdowns();
});
menuDuplicateBtn.addEventListener("click", () => {
  duplicateSelectedElements();
  closeAllMenuBarDropdowns();
});
menuSelectAllBtn.addEventListener("click", () => {
  selectAllElements();
  closeAllMenuBarDropdowns();
});
menuDeleteBtn.addEventListener("click", () => {
  if (selectedElementIndices.length > 0) {
    const elements = slides[currentSlideIndex].elements;
    [...selectedElementIndices].sort((a, b) => b - a).forEach((index) => elements.splice(index, 1));
    clearSelection();
    renderSlideCanvas();
  }
  closeAllMenuBarDropdowns();
});

menuZoomInBtn.addEventListener("click", () => {
  zoomIn();
  closeAllMenuBarDropdowns();
});
menuZoomOutBtn.addEventListener("click", () => {
  zoomOut();
  closeAllMenuBarDropdowns();
});
menuZoomActualBtn.addEventListener("click", () => {
  zoomToActualSize();
  closeAllMenuBarDropdowns();
});
menuResetViewBtn.addEventListener("click", () => {
  resetCanvasView();
  closeAllMenuBarDropdowns();
});
menuPresentBtn.addEventListener("click", () => {
  closeAllMenuBarDropdowns();
  presentBtn.click();
});

menuAlignLeftBtn.addEventListener("click", () => {
  alignSelectedElements("left");
  closeAllMenuBarDropdowns();
});
menuAlignCenterHBtn.addEventListener("click", () => {
  alignSelectedElements("centerH");
  closeAllMenuBarDropdowns();
});
menuAlignRightBtn.addEventListener("click", () => {
  alignSelectedElements("right");
  closeAllMenuBarDropdowns();
});
menuAlignTopBtn.addEventListener("click", () => {
  alignSelectedElements("top");
  closeAllMenuBarDropdowns();
});
menuAlignCenterVBtn.addEventListener("click", () => {
  alignSelectedElements("centerV");
  closeAllMenuBarDropdowns();
});
menuAlignBottomBtn.addEventListener("click", () => {
  alignSelectedElements("bottom");
  closeAllMenuBarDropdowns();
});
menuDistributeHBtn.addEventListener("click", () => {
  distributeSelectedElements("horizontal");
  closeAllMenuBarDropdowns();
});
menuDistributeVBtn.addEventListener("click", () => {
  distributeSelectedElements("vertical");
  closeAllMenuBarDropdowns();
});

menuBringToFrontBtn.addEventListener("click", () => {
  reorderSelectedElement("front");
  closeAllMenuBarDropdowns();
});
menuBringForwardBtn.addEventListener("click", () => {
  reorderSelectedElement("forward");
  closeAllMenuBarDropdowns();
});
menuSendBackwardBtn.addEventListener("click", () => {
  reorderSelectedElement("backward");
  closeAllMenuBarDropdowns();
});
menuSendToBackBtn.addEventListener("click", () => {
  reorderSelectedElement("back");
  closeAllMenuBarDropdowns();
});
menuGroupBtn.addEventListener("click", () => {
  groupSelectedElements();
  closeAllMenuBarDropdowns();
});
menuUngroupBtn.addEventListener("click", () => {
  ungroupSelectedElement();
  closeAllMenuBarDropdowns();
});
menuBlendingOptionsBtn.addEventListener("click", () => {
  const targetIndex = getPrimarySelectedIndex();
  closeAllMenuBarDropdowns();
  openBlendingOptions(targetIndex);
});
menuObjectAnimationBtn.addEventListener("click", () => {
  const targetIndex = getPrimarySelectedIndex();
  closeAllMenuBarDropdowns();
  openElementAnimationOptions(targetIndex);
});

function runMenuMergeShapes(op) {
  mergeSelectedShapes(op);
  closeAllMenuBarDropdowns();
}

menuMergeUnionBtn.addEventListener("click", () => runMenuMergeShapes("union"));
menuMergeCombineBtn.addEventListener("click", () => runMenuMergeShapes("combine"));
menuMergeFragmentBtn.addEventListener("click", () => runMenuMergeShapes("fragment"));
menuMergeIntersectBtn.addEventListener("click", () => runMenuMergeShapes("intersect"));
menuMergeSubtractBtn.addEventListener("click", () => runMenuMergeShapes("subtract"));
