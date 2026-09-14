const CONTEXT_MENU_SELECTION_BTNS = [ctxCut, ctxCopy, ctxDelete];
const CONTEXT_MENU_SINGLE_ONLY_BTNS = [
  ctxBringToFront,
  ctxBringForward,
  ctxSendBackward,
  ctxSendToBack,
  ctxCenter,
  ctxBlendingOptions,
  ctxObjectAnimation,
];

function showContextMenu(x, y, hasElementTarget) {
  const isSingleTarget = hasElementTarget && selectedElementIndices.length === 1;
  const primaryElement = isSingleTarget ? slides[currentSlideIndex].elements[getPrimarySelectedIndex()] : null;

  CONTEXT_MENU_SELECTION_BTNS.forEach((btn) => {
    btn.disabled = !hasElementTarget;
  });
  CONTEXT_MENU_SINGLE_ONLY_BTNS.forEach((btn) => {
    btn.disabled = !isSingleTarget;
  });
  ctxGroup.disabled = !(hasElementTarget && selectedElementIndices.length >= 2);
  ctxUngroup.disabled = !(primaryElement && primaryElement.type === "group");

  const hasMultiSelection = hasElementTarget && selectedElementIndices.length >= 2;
  const hasDistributeSelection = hasElementTarget && selectedElementIndices.length >= 3;
  objAlignMenuBtn.disabled = !hasMultiSelection;
  objAlignLeftBtn.disabled = !hasMultiSelection;
  objAlignCenterHBtn.disabled = !hasMultiSelection;
  objAlignRightBtn.disabled = !hasMultiSelection;
  objAlignTopBtn.disabled = !hasMultiSelection;
  objAlignCenterVBtn.disabled = !hasMultiSelection;
  objAlignBottomBtn.disabled = !hasMultiSelection;
  objDistributeHBtn.disabled = !hasDistributeSelection;
  objDistributeVBtn.disabled = !hasDistributeSelection;

  const selectedElements = selectedElementIndices.map((i) => slides[currentSlideIndex].elements[i]).filter(Boolean);
  const allShapeOrText = selectedElements.length >= 2 && selectedElements.every((el) => el.type === "shape" || el.type === "text");
  const imageCount = selectedElements.filter((el) => el.type === "image").length;
  const isImageMaskCase =
    selectedElements.length === 2 && imageCount === 1 && selectedElements.some((el) => el.type === "shape" || el.type === "text");

  mergeShapesMenuBtn.disabled = !(hasElementTarget && (allShapeOrText || isImageMaskCase));
  mergeUnionBtn.disabled = !allShapeOrText;
  mergeCombineBtn.disabled = !allShapeOrText;
  mergeFragmentBtn.disabled = !allShapeOrText;
  mergeIntersectBtn.disabled = !(allShapeOrText || isImageMaskCase);
  mergeSubtractBtn.disabled = !(allShapeOrText || isImageMaskCase);

  ctxPaste.disabled = !internalClipboard;

  contextMenuEl.classList.remove("hidden");

  const menuRect = contextMenuEl.getBoundingClientRect();
  const maxLeft = window.innerWidth - menuRect.width - 8;
  const maxTop = window.innerHeight - menuRect.height - 8;

  contextMenuEl.style.left = Math.min(x, Math.max(8, maxLeft)) + "px";
  contextMenuEl.style.top = Math.min(y, Math.max(8, maxTop)) + "px";
}

function hideContextMenu() {
  contextMenuEl.classList.add("hidden");
  contextMenuTargetIndex = null;
  mergeShapesSubmenu.classList.remove("open");
  objAlignSubmenu.classList.remove("open");
}

canvasAreaEl.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  commitEditingText();

  const slideRect = slideCanvasEl.getBoundingClientRect();
  contextMenuClickX = (e.clientX - slideRect.left) / canvasZoom;
  contextMenuClickY = (e.clientY - slideRect.top) / canvasZoom;

  const targetEl = e.target.closest(".element");
  if (targetEl) {
    const index = Array.prototype.indexOf.call(slideCanvasEl.children, targetEl);
    if (!isElementSelected(index)) {
      selectOnly(index);
      renderSlideCanvas();
    }
    contextMenuTargetIndex = index;
    showContextMenu(e.clientX, e.clientY, true);
  } else {
    contextMenuTargetIndex = null;
    showContextMenu(e.clientX, e.clientY, false);
  }
});

ctxResetView.addEventListener("click", () => {
  resetCanvasView();
  hideContextMenu();
});

ctxBringToFront.addEventListener("click", () => {
  reorderSelectedElement("front");
  hideContextMenu();
});

ctxBringForward.addEventListener("click", () => {
  reorderSelectedElement("forward");
  hideContextMenu();
});

ctxSendBackward.addEventListener("click", () => {
  reorderSelectedElement("backward");
  hideContextMenu();
});

ctxSendToBack.addEventListener("click", () => {
  reorderSelectedElement("back");
  hideContextMenu();
});

ctxGroup.addEventListener("click", () => {
  groupSelectedElements();
  hideContextMenu();
});

ctxUngroup.addEventListener("click", () => {
  ungroupSelectedElement();
  hideContextMenu();
});

mergeShapesMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (mergeShapesMenuBtn.disabled) return;
  const willOpen = !mergeShapesSubmenu.classList.contains("open");
  mergeShapesSubmenu.classList.toggle("open");

  if (willOpen) {
    const rect = mergeShapesMenuBtn.getBoundingClientRect();
    mergeShapesSubmenu.style.left = rect.right + "px";
    mergeShapesSubmenu.style.top = rect.top + "px";
  }
});

function runMergeShapes(op) {
  mergeSelectedShapes(op);
  hideContextMenu();
}

mergeUnionBtn.addEventListener("click", () => runMergeShapes("union"));
mergeCombineBtn.addEventListener("click", () => runMergeShapes("combine"));
mergeFragmentBtn.addEventListener("click", () => runMergeShapes("fragment"));
mergeIntersectBtn.addEventListener("click", () => runMergeShapes("intersect"));
mergeSubtractBtn.addEventListener("click", () => runMergeShapes("subtract"));

ctxCenter.addEventListener("click", () => {
  if (contextMenuTargetIndex !== null) {
    const element = slides[currentSlideIndex].elements[contextMenuTargetIndex];
    element.x = (960 - element.width) / 2;
    element.y = (540 - element.height) / 2;
    renderSlideCanvas();
  }
  hideContextMenu();
});

ctxBlendingOptions.addEventListener("click", () => {
  const targetIndex = contextMenuTargetIndex;
  hideContextMenu();
  openBlendingOptions(targetIndex);
});

ctxObjectAnimation.addEventListener("click", () => {
  const targetIndex = contextMenuTargetIndex;
  hideContextMenu();
  openElementAnimationOptions(targetIndex);
});

ctxCut.addEventListener("click", () => {
  cutSelectedElements();
  hideContextMenu();
});

ctxCopy.addEventListener("click", () => {
  copySelectedElements();
  hideContextMenu();
});

ctxPaste.addEventListener("click", () => {
  pasteClipboardElements(contextMenuClickX, contextMenuClickY);
  hideContextMenu();
});

ctxDelete.addEventListener("click", () => {
  if (selectedElementIndices.length > 0) {
    const elements = slides[currentSlideIndex].elements;
    [...selectedElementIndices].sort((a, b) => b - a).forEach((index) => elements.splice(index, 1));
    clearSelection();
    renderSlideCanvas();
  }
  hideContextMenu();
});
