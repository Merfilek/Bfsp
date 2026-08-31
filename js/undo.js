let undoHistory = [];
let undoIndex = -1;
let isRestoringHistory = false;
let undoSnapshotTimeout = null;

const UNDO_DEBOUNCE_MS = 500;
const UNDO_STACK_LIMIT = 40;

function snapshotState() {
  return {
    slides: JSON.parse(JSON.stringify(slides)),
    currentSlideIndex: currentSlideIndex,
  };
}

function commitUndoSnapshot() {
  if (isRestoringHistory) return;

  const snap = snapshotState();
  if (undoIndex >= 0 && JSON.stringify(undoHistory[undoIndex].slides) === JSON.stringify(snap.slides)) {
    return;
  }

  undoHistory = undoHistory.slice(0, undoIndex + 1);
  undoHistory.push(snap);
  if (undoHistory.length > UNDO_STACK_LIMIT) {
    undoHistory.shift();
  }
  undoIndex = undoHistory.length - 1;
}

function scheduleUndoSnapshot() {
  clearTimeout(undoSnapshotTimeout);
  undoSnapshotTimeout = setTimeout(commitUndoSnapshot, UNDO_DEBOUNCE_MS);
}

function restoreUndoSnapshot(snap) {
  isRestoringHistory = true;
  slides = JSON.parse(JSON.stringify(snap.slides));
  currentSlideIndex = Math.min(snap.currentSlideIndex, slides.length - 1);
  clearSelection();
  editingElementIndex = null;
  renderAll();
  isRestoringHistory = false;
}

function undo() {
  clearTimeout(undoSnapshotTimeout);
  if (undoIndex <= 0) return;
  undoIndex--;
  restoreUndoSnapshot(undoHistory[undoIndex]);
}

function redo() {
  clearTimeout(undoSnapshotTimeout);
  if (undoIndex >= undoHistory.length - 1) return;
  undoIndex++;
  restoreUndoSnapshot(undoHistory[undoIndex]);
}

function resetUndoHistory() {
  undoHistory = [snapshotState()];
  undoIndex = 0;
}
