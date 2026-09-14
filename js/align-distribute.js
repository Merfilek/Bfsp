const objAlignMenuBtn = document.getElementById("objAlignMenuBtn");
const objAlignSubmenu = document.getElementById("objAlignSubmenu");
const objAlignLeftBtn = document.getElementById("objAlignLeftBtn");
const objAlignCenterHBtn = document.getElementById("objAlignCenterHBtn");
const objAlignRightBtn = document.getElementById("objAlignRightBtn");
const objAlignTopBtn = document.getElementById("objAlignTopBtn");
const objAlignCenterVBtn = document.getElementById("objAlignCenterVBtn");
const objAlignBottomBtn = document.getElementById("objAlignBottomBtn");
const objDistributeHBtn = document.getElementById("objDistributeHBtn");
const objDistributeVBtn = document.getElementById("objDistributeVBtn");

function getSelectedElements() {
  const slide = slides[currentSlideIndex];
  return selectedElementIndices.map((index) => slide.elements[index]).filter(Boolean);
}

function alignSelectedElements(mode) {
  const elements = getSelectedElements();
  if (elements.length < 2) return;

  const box = computeBoundingBox(elements);

  elements.forEach((element) => {
    if (mode === "left") element.x = box.x;
    else if (mode === "right") element.x = box.x + box.width - element.width;
    else if (mode === "centerH") element.x = box.x + box.width / 2 - element.width / 2;
    else if (mode === "top") element.y = box.y;
    else if (mode === "bottom") element.y = box.y + box.height - element.height;
    else if (mode === "centerV") element.y = box.y + box.height / 2 - element.height / 2;
  });

  renderSlideCanvas();
}

function distributeSelectedElements(axis) {
  const elements = getSelectedElements();
  if (elements.length < 3) return;

  if (axis === "horizontal") {
    const sorted = [...elements].sort((a, b) => a.x - b.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalWidth = sorted.reduce((sum, el) => sum + el.width, 0);
    const gap = (last.x + last.width - first.x - totalWidth) / (sorted.length - 1);

    let cursor = first.x + first.width;
    for (let i = 1; i < sorted.length - 1; i++) {
      cursor += gap;
      sorted[i].x = cursor;
      cursor += sorted[i].width;
    }
  } else {
    const sorted = [...elements].sort((a, b) => a.y - b.y);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalHeight = sorted.reduce((sum, el) => sum + el.height, 0);
    const gap = (last.y + last.height - first.y - totalHeight) / (sorted.length - 1);

    let cursor = first.y + first.height;
    for (let i = 1; i < sorted.length - 1; i++) {
      cursor += gap;
      sorted[i].y = cursor;
      cursor += sorted[i].height;
    }
  }

  renderSlideCanvas();
}

objAlignLeftBtn.addEventListener("click", () => {
  alignSelectedElements("left");
  hideContextMenu();
});
objAlignCenterHBtn.addEventListener("click", () => {
  alignSelectedElements("centerH");
  hideContextMenu();
});
objAlignRightBtn.addEventListener("click", () => {
  alignSelectedElements("right");
  hideContextMenu();
});
objAlignTopBtn.addEventListener("click", () => {
  alignSelectedElements("top");
  hideContextMenu();
});
objAlignCenterVBtn.addEventListener("click", () => {
  alignSelectedElements("centerV");
  hideContextMenu();
});
objAlignBottomBtn.addEventListener("click", () => {
  alignSelectedElements("bottom");
  hideContextMenu();
});
objDistributeHBtn.addEventListener("click", () => {
  distributeSelectedElements("horizontal");
  hideContextMenu();
});
objDistributeVBtn.addEventListener("click", () => {
  distributeSelectedElements("vertical");
  hideContextMenu();
});

objAlignMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (objAlignMenuBtn.disabled) return;
  const willOpen = !objAlignSubmenu.classList.contains("open");
  objAlignSubmenu.classList.toggle("open");

  if (willOpen) {
    const rect = objAlignMenuBtn.getBoundingClientRect();
    objAlignSubmenu.style.left = rect.right + "px";
    objAlignSubmenu.style.top = rect.top + "px";
  }
});
