let slides = [];

let currentSlideIndex = 0;
let selectedElementIndices = [];
let editingElementIndex = null;
let pendingInsertType = null;
let pendingImageData = null;
let internalClipboard = null;
let slideClipboardData = null;
let lastCopyKind = null;

let canvasZoom = 1;
let canvasPanX = 0;
let canvasPanY = 0;
let isPanningCanvas = false;
let panStartMouseX = 0;
let panStartMouseY = 0;
let panStartPanX = 0;
let panStartPanY = 0;
let contextMenuTargetIndex = null;
let contextMenuClickX = 0;
let contextMenuClickY = 0;

let isDragging = false;
let dragStartMouseX = 0;
let dragStartMouseY = 0;
let dragStartPositions = [];

let isPlacingShape = false;
let placingElementIndex = null;
let placementStartX = 0;
let placementStartY = 0;
const MIN_SHAPE_DRAG_SIZE = 5;
const DEFAULT_SHAPE_SIZE = 200;
const DEFAULT_LINE_THICKNESS = 6;

const SNAP_THRESHOLD = 8;
const SNAP_GUIDES_X = [0, 480, 960];
const SNAP_GUIDES_Y = [0, 270, 540];

let snapGuideX = null;
let snapGuideY = null;

let isResizing = false;
let resizeHandleType = null;
let resizeStartMouseX = 0;
let resizeStartMouseY = 0;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;
let resizeStartFontSize = 0;
let resizeStartRotation = 0;

let isRotating = false;
let rotateCenterX = 0;
let rotateCenterY = 0;

const HANDLE_TYPES = [
  { type: "nw", cursor: "nwse-resize", left: true, top: true },
  { type: "n", cursor: "ns-resize", top: true },
  { type: "ne", cursor: "nesw-resize", right: true, top: true },
  { type: "e", cursor: "ew-resize", right: true },
  { type: "se", cursor: "nwse-resize", right: true, bottom: true },
  { type: "s", cursor: "ns-resize", bottom: true },
  { type: "sw", cursor: "nesw-resize", left: true, bottom: true },
  { type: "w", cursor: "ew-resize", left: true },
];

const TEXT_ALIGN_TO_JUSTIFY = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

const TEXT_VALIGN_TO_ALIGN_ITEMS = {
  top: "flex-start",
  middle: "center",
  bottom: "flex-end",
};

const MAX_INSERTED_IMAGE_DIMENSION = 400;

let presentIndex = 0;

function normalizeFontSize(value) {
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 32 : parsed;
}

function generateElementId() {
  return "e_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function ensureElementIds(slidesArr) {
  slidesArr.forEach((slide) => {
    slide.elements.forEach((el) => {
      if (!el.id) el.id = generateElementId();
    });
  });
}

let mainSelectedIndex = null;

function selectOnly(index) {
  selectedElementIndices = index === null || index === undefined ? [] : [index];
  mainSelectedIndex = selectedElementIndices.length > 0 ? index : null;
}

function clearSelection() {
  selectedElementIndices = [];
  mainSelectedIndex = null;
}

function isElementSelected(index) {
  return selectedElementIndices.includes(index);
}

function toggleElementSelection(index) {
  if (isElementSelected(index)) {
    selectedElementIndices = selectedElementIndices.filter((i) => i !== index);
    if (mainSelectedIndex === index) {
      mainSelectedIndex = selectedElementIndices.length > 0 ? selectedElementIndices[selectedElementIndices.length - 1] : null;
    }
  } else {
    selectedElementIndices = selectedElementIndices.concat([index]);
    mainSelectedIndex = index;
  }
}

function getPrimarySelectedIndex() {
  return selectedElementIndices.length === 1 ? selectedElementIndices[0] : null;
}

function selectAllElements() {
  const slide = slides[currentSlideIndex];
  if (!slide || slide.elements.length === 0) return;
  selectedElementIndices = slide.elements.map((_, i) => i);
  mainSelectedIndex = selectedElementIndices[selectedElementIndices.length - 1];
  renderSlideCanvas();
}

let isMarqueeSelecting = false;
let marqueeStartX = 0;
let marqueeStartY = 0;
let marqueeCurrentX = 0;
let marqueeCurrentY = 0;
let marqueeAdditive = false;

// DOM references shared across multiple files.
// File-specific DOM references live in the file that uses them.

const slideListEl = document.getElementById("slideList");
const slideCanvasEl = document.getElementById("slideCanvas");
const canvasAreaEl = document.getElementById("canvasArea");
const addSlideBtn = document.getElementById("addSlideBtn");
const presentBtn = document.querySelector(".present-btn");
const presentOverlay = document.getElementById("presentOverlay");
const presentViewportEl = document.getElementById("presentViewport");
const presentSlideEl = document.getElementById("presentSlide");

const homeScreenEl = document.getElementById("homeScreen");
const editorScreenEl = document.getElementById("editorScreen");
const homeBtn = document.getElementById("homeBtn");
const newPresentationBtn = document.getElementById("newPresentationBtn");
const recentGridEl = document.getElementById("recentGrid");
const presentationTitleEl = document.getElementById("presentationTitle");

const formatToolbarEl = document.getElementById("formatToolbar");
const fontFamilySelect = document.getElementById("fontFamilySelect");
const boldBtn = document.getElementById("boldBtn");
const italicBtn = document.getElementById("italicBtn");
const underlineBtn = document.getElementById("underlineBtn");
const textColorInput = document.getElementById("textColorInput");
const alignLeftBtn = document.getElementById("alignLeftBtn");
const alignCenterBtn = document.getElementById("alignCenterBtn");
const alignRightBtn = document.getElementById("alignRightBtn");
const valignTopBtn = document.getElementById("valignTopBtn");
const valignMiddleBtn = document.getElementById("valignMiddleBtn");
const valignBottomBtn = document.getElementById("valignBottomBtn");

const contextMenuEl = document.getElementById("contextMenu");
const ctxResetView = document.getElementById("ctxResetView");
const ctxBringToFront = document.getElementById("ctxBringToFront");
const ctxBringForward = document.getElementById("ctxBringForward");
const ctxSendBackward = document.getElementById("ctxSendBackward");
const ctxSendToBack = document.getElementById("ctxSendToBack");
const ctxGroup = document.getElementById("ctxGroup");
const ctxUngroup = document.getElementById("ctxUngroup");
const mergeShapesMenuBtn = document.getElementById("mergeShapesMenuBtn");
const mergeShapesSubmenu = document.getElementById("mergeShapesSubmenu");
const mergeUnionBtn = document.getElementById("mergeUnionBtn");
const mergeCombineBtn = document.getElementById("mergeCombineBtn");
const mergeFragmentBtn = document.getElementById("mergeFragmentBtn");
const mergeIntersectBtn = document.getElementById("mergeIntersectBtn");
const mergeSubtractBtn = document.getElementById("mergeSubtractBtn");
const ctxCenter = document.getElementById("ctxCenter");
const ctxBlendingOptions = document.getElementById("ctxBlendingOptions");
const ctxObjectAnimation = document.getElementById("ctxObjectAnimation");
const ctxCut = document.getElementById("ctxCut");
const ctxCopy = document.getElementById("ctxCopy");
const ctxPaste = document.getElementById("ctxPaste");
const ctxDelete = document.getElementById("ctxDelete");
