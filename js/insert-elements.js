addSlideBtn.addEventListener("click", () => {
  commitEditingText();
  const newSlide = {
    id: slides.length + 1,
    elements: [],
    backgroundColor: "#ffffff",
    transition: { type: "none", direction: "left", duration: 500, easing: "linear" },
  };
  slides.push(newSlide);
  currentSlideIndex = slides.length - 1;
  clearSelection();
  renderAll();
});

const insertMenuBtn = document.getElementById("insertMenuBtn");
const insertDropdown = document.getElementById("insertDropdown");
const insertTextBoxBtn = document.getElementById("insertTextBoxBtn");

insertMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  insertDropdown.classList.toggle("open");
  shapesSubmenu.classList.remove("open");
});

insertTextBoxBtn.addEventListener("click", () => {
  insertDropdown.classList.remove("open");
  pendingInsertType = "text";
  slideCanvasEl.classList.add("placing");
});

function addTextBoxAt(clickX, clickY) {
  const slide = slides[currentSlideIndex];
  const width = 240;
  const height = 80;

  const newElement = {
    id: generateElementId(),
    type: "text",
    text: "Text",
    x: clickX - width / 2,
    y: clickY - height / 2,
    width,
    height,
    fontSize: 32,
    fontWeight: "400",
    fontFamily: "system-ui, sans-serif",
    fontStyle: "normal",
    textDecoration: "none",
    textAlign: "left",
    verticalAlign: "middle",
    color: "#111111",
    rotation: 0,
  };

  slide.elements.push(newElement);
  const newIndex = slide.elements.length - 1;
  selectOnly(newIndex);
  editingElementIndex = newIndex;
  renderAll();
}

const shapesMenuBtn = document.getElementById("shapesMenuBtn");
const shapesSubmenu = document.getElementById("shapesSubmenu");

shapesMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const willOpen = !shapesSubmenu.classList.contains("open");
  shapesSubmenu.classList.toggle("open");

  if (willOpen) {
    const rect = shapesMenuBtn.getBoundingClientRect();
    shapesSubmenu.style.left = rect.right + "px";
    shapesSubmenu.style.top = rect.top + "px";
  }
});

function wireShapeInsertBtn(btnId, pendingType) {
  document.getElementById(btnId).addEventListener("click", () => {
    shapesSubmenu.classList.remove("open");
    insertDropdown.classList.remove("open");
    pendingInsertType = pendingType;
    slideCanvasEl.classList.add("placing");
  });
}

wireShapeInsertBtn("insertRectangleBtn", "shape-rectangle");
wireShapeInsertBtn("insertCircleBtn", "shape-ellipse");
wireShapeInsertBtn("insertTriangleBtn", "shape-triangle");
wireShapeInsertBtn("insertHexagonBtn", "shape-hexagon");
wireShapeInsertBtn("insertLineBtn", "shape-line");

const insertImageBtn = document.getElementById("insertImageBtn");
const imageFileInputEl = document.getElementById("imageFileInput");

insertImageBtn.addEventListener("click", () => {
  insertDropdown.classList.remove("open");
  imageFileInputEl.click();
});

imageFileInputEl.addEventListener("change", () => {
  const file = imageFileInputEl.files[0];
  if (file) {
    loadImageFile(file, (imageData) => {
      pendingImageData = imageData;
      pendingInsertType = "image";
      slideCanvasEl.classList.add("placing");
    });
  }
  imageFileInputEl.value = "";
});

function loadImageFile(file, callback) {
  const reader = new FileReader();
  reader.onload = () => {
    const src = reader.result;
    const img = new Image();
    img.onload = () => {
      callback({ src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
    };
    img.src = src;
  };
  reader.readAsDataURL(file);
}

function addImageAt(clickX, clickY, imageData) {
  const slide = slides[currentSlideIndex];

  let width = imageData.naturalWidth;
  let height = imageData.naturalHeight;
  const maxDim = MAX_INSERTED_IMAGE_DIMENSION;
  if (width > maxDim || height > maxDim) {
    const scale = Math.min(maxDim / width, maxDim / height);
    width *= scale;
    height *= scale;
  }

  const newElement = {
    id: generateElementId(),
    type: "image",
    src: imageData.src,
    x: clickX - width / 2,
    y: clickY - height / 2,
    width,
    height,
    rotation: 0,
  };

  slide.elements.push(newElement);
  selectOnly(slide.elements.length - 1);
  renderAll();
}

let allowNativePaste = false;

document.addEventListener("paste", (e) => {
  if (editorScreenEl.classList.contains("hidden")) return;
  if (!allowNativePaste) return;
  allowNativePaste = false;

  const items = e.clipboardData && e.clipboardData.items;
  let handledImage = false;

  if (items) {
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          commitEditingText();
          renderSlideCanvas();

          loadImageFile(file, (imageData) => {
            addImageAt(480, 270, imageData);
          });
        }
        handledImage = true;
        break;
      }
    }
  }

  if (!handledImage && editingElementIndex === null) {
    if (lastCopyKind === "element" && internalClipboard) {
      e.preventDefault();
      pasteClipboardElements();
    } else if (lastCopyKind === "slide" && slideClipboardData) {
      e.preventDefault();
      pasteClipboardSlide();
    }
  }
});
