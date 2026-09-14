const MIN_CANVAS_ZOOM = 0.1;
const MAX_CANVAS_ZOOM = 4;
const CANVAS_FIT_MARGIN = 64;

function applyCanvasTransform() {
  slideCanvasEl.style.transform =
    "translate(" + canvasPanX + "px, " + canvasPanY + "px) scale(" + canvasZoom + ")";
}

function computeFitZoom() {
  const rect = canvasAreaEl.getBoundingClientRect();
  const scaleX = (rect.width - CANVAS_FIT_MARGIN) / 960;
  const scaleY = (rect.height - CANVAS_FIT_MARGIN) / 540;
  return Math.min(scaleX, scaleY, 1);
}

function resetCanvasView() {
  const rect = canvasAreaEl.getBoundingClientRect();
  canvasZoom = computeFitZoom();
  canvasPanX = (rect.width - 960 * canvasZoom) / 2;
  canvasPanY = (rect.height - 540 * canvasZoom) / 2;
  applyCanvasTransform();
}

function zoomBy(factor) {
  const rect = canvasAreaEl.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const slideLocalX = (centerX - canvasPanX) / canvasZoom;
  const slideLocalY = (centerY - canvasPanY) / canvasZoom;

  const newZoom = Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, canvasZoom * factor));
  canvasPanX = centerX - slideLocalX * newZoom;
  canvasPanY = centerY - slideLocalY * newZoom;
  canvasZoom = newZoom;
  applyCanvasTransform();
}

function zoomIn() {
  zoomBy(1.2);
}

function zoomOut() {
  zoomBy(1 / 1.2);
}

function zoomToActualSize() {
  const rect = canvasAreaEl.getBoundingClientRect();
  canvasZoom = 1;
  canvasPanX = (rect.width - 960) / 2;
  canvasPanY = (rect.height - 540) / 2;
  applyCanvasTransform();
}

canvasAreaEl.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();

    const rect = canvasAreaEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const slideLocalX = (mouseX - canvasPanX) / canvasZoom;
    const slideLocalY = (mouseY - canvasPanY) / canvasZoom;

    const zoomFactor = Math.exp(-e.deltaY * 0.001);
    const newZoom = Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, canvasZoom * zoomFactor));

    canvasPanX = mouseX - slideLocalX * newZoom;
    canvasPanY = mouseY - slideLocalY * newZoom;
    canvasZoom = newZoom;

    applyCanvasTransform();
  },
  { passive: false }
);

canvasAreaEl.addEventListener(
  "mousedown",
  (e) => {
    if (e.button !== 1) return;
    e.preventDefault();
    e.stopPropagation();

    isPanningCanvas = true;
    panStartMouseX = e.clientX;
    panStartMouseY = e.clientY;
    panStartPanX = canvasPanX;
    panStartPanY = canvasPanY;
    canvasAreaEl.classList.add("panning");
  },
  true
);

document.addEventListener("mousemove", (e) => {
  if (!isPanningCanvas) return;
  canvasPanX = panStartPanX + (e.clientX - panStartMouseX);
  canvasPanY = panStartPanY + (e.clientY - panStartMouseY);
  applyCanvasTransform();
});

document.addEventListener("mouseup", (e) => {
  if (e.button !== 1) return;
  isPanningCanvas = false;
  canvasAreaEl.classList.remove("panning");
});

window.addEventListener("resize", () => {
  if (!editorScreenEl.classList.contains("hidden")) {
    resetCanvasView();
  }
});
