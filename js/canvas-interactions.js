function applySnap(element) {
  snapGuideX = null;
  snapGuideY = null;

  const left = element.x;
  const right = element.x + element.width;
  const centerX = element.x + element.width / 2;

  for (const guide of SNAP_GUIDES_X) {
    if (Math.abs(left - guide) <= SNAP_THRESHOLD) {
      element.x = guide;
      snapGuideX = guide;
      break;
    }
    if (Math.abs(centerX - guide) <= SNAP_THRESHOLD) {
      element.x = guide - element.width / 2;
      snapGuideX = guide;
      break;
    }
    if (Math.abs(right - guide) <= SNAP_THRESHOLD) {
      element.x = guide - element.width;
      snapGuideX = guide;
      break;
    }
  }

  const top = element.y;
  const bottom = element.y + element.height;
  const centerY = element.y + element.height / 2;

  for (const guide of SNAP_GUIDES_Y) {
    if (Math.abs(top - guide) <= SNAP_THRESHOLD) {
      element.y = guide;
      snapGuideY = guide;
      break;
    }
    if (Math.abs(centerY - guide) <= SNAP_THRESHOLD) {
      element.y = guide - element.height / 2;
      snapGuideY = guide;
      break;
    }
    if (Math.abs(bottom - guide) <= SNAP_THRESHOLD) {
      element.y = guide - element.height;
      snapGuideY = guide;
      break;
    }
  }
}

function applyResizeSnap(element, handleDef) {
  snapGuideX = null;
  snapGuideY = null;

  if (handleDef.right) {
    const right = element.x + element.width;
    for (const guide of SNAP_GUIDES_X) {
      if (Math.abs(right - guide) <= SNAP_THRESHOLD) {
        element.width = Math.max(20, guide - element.x);
        snapGuideX = guide;
        break;
      }
    }
  } else if (handleDef.left) {
    const left = element.x;
    for (const guide of SNAP_GUIDES_X) {
      if (Math.abs(left - guide) <= SNAP_THRESHOLD) {
        const right = element.x + element.width;
        element.x = guide;
        element.width = Math.max(20, right - guide);
        snapGuideX = guide;
        break;
      }
    }
  }

  if (handleDef.bottom) {
    const bottom = element.y + element.height;
    for (const guide of SNAP_GUIDES_Y) {
      if (Math.abs(bottom - guide) <= SNAP_THRESHOLD) {
        element.height = Math.max(20, guide - element.y);
        snapGuideY = guide;
        break;
      }
    }
  } else if (handleDef.top) {
    const top = element.y;
    for (const guide of SNAP_GUIDES_Y) {
      if (Math.abs(top - guide) <= SNAP_THRESHOLD) {
        const bottom = element.y + element.height;
        element.y = guide;
        element.height = Math.max(20, bottom - guide);
        snapGuideY = guide;
        break;
      }
    }
  }
}

function startDrag(e) {
  isDragging = true;
  const slideRect = slideCanvasEl.getBoundingClientRect();
  dragStartMouseX = (e.clientX - slideRect.left) / canvasZoom;
  dragStartMouseY = (e.clientY - slideRect.top) / canvasZoom;
  const elements = slides[currentSlideIndex].elements;
  dragStartPositions = selectedElementIndices.map((index) => ({
    index,
    x: elements[index].x,
    y: elements[index].y,
  }));
}

function startResize(e, element, handleDef) {
  isResizing = true;
  resizeHandleType = handleDef;
  resizeStartMouseX = e.clientX;
  resizeStartMouseY = e.clientY;
  resizeStartX = element.x;
  resizeStartY = element.y;
  resizeStartWidth = element.width;
  resizeStartHeight = element.height;
  resizeStartFontSize = normalizeFontSize(element.fontSize);
  resizeStartRotation = element.rotation || 0;
}

function startRotate(e, element) {
  isRotating = true;
  rotateCenterX = element.x + element.width / 2;
  rotateCenterY = element.y + element.height / 2;
}

document.addEventListener("mousemove", (e) => {
  if (isMarqueeSelecting) {
    const slideRect = slideCanvasEl.getBoundingClientRect();
    marqueeCurrentX = (e.clientX - slideRect.left) / canvasZoom;
    marqueeCurrentY = (e.clientY - slideRect.top) / canvasZoom;
    renderSlideCanvas();
    return;
  }

  if (isPlacingShape && placingElementIndex !== null) {
    const slideRect = slideCanvasEl.getBoundingClientRect();
    const currentX = (e.clientX - slideRect.left) / canvasZoom;
    const currentY = (e.clientY - slideRect.top) / canvasZoom;

    const element = slides[currentSlideIndex].elements[placingElementIndex];
    element.x = Math.min(placementStartX, currentX);
    element.y = Math.min(placementStartY, currentY);
    element.width = Math.abs(currentX - placementStartX);
    element.height = Math.abs(currentY - placementStartY);

    renderSlideCanvas();
    return;
  }

  if (isRotating && getPrimarySelectedIndex() !== null) {
    const slideRect = slideCanvasEl.getBoundingClientRect();
    const mouseX = (e.clientX - slideRect.left) / canvasZoom;
    const mouseY = (e.clientY - slideRect.top) / canvasZoom;

    let rotationDeg = (Math.atan2(mouseY - rotateCenterY, mouseX - rotateCenterX) * 180) / Math.PI + 90;
    if (e.shiftKey) {
      rotationDeg = Math.round(rotationDeg / 15) * 15;
    }
    rotationDeg = ((rotationDeg % 360) + 360) % 360;

    const element = slides[currentSlideIndex].elements[getPrimarySelectedIndex()];
    element.rotation = rotationDeg;
    renderSlideCanvas();
    return;
  }

  if (isResizing && getPrimarySelectedIndex() !== null) {
    const element = slides[currentSlideIndex].elements[getPrimarySelectedIndex()];
    const handleDef = resizeHandleType;
    const rawDx = (e.clientX - resizeStartMouseX) / canvasZoom;
    const rawDy = (e.clientY - resizeStartMouseY) / canvasZoom;

    const rotationRad = (-resizeStartRotation * Math.PI) / 180;
    const cosR = Math.cos(rotationRad);
    const sinR = Math.sin(rotationRad);
    const dx = rawDx * cosR - rawDy * sinR;
    const dy = rawDx * sinR + rawDy * cosR;

    const drivesWidth = handleDef.left || handleDef.right;
    const drivesHeight = handleDef.top || handleDef.bottom;

    if (e.shiftKey) {
      let newWidth = resizeStartWidth;
      let newHeight = resizeStartHeight;
      let newX = resizeStartX;
      let newY = resizeStartY;

      if (handleDef.right) newWidth = Math.max(20, resizeStartWidth + dx);
      if (handleDef.left) {
        newWidth = Math.max(20, resizeStartWidth - dx);
        newX = resizeStartX + resizeStartWidth - newWidth;
      }
      if (handleDef.bottom) newHeight = Math.max(20, resizeStartHeight + dy);
      if (handleDef.top) {
        newHeight = Math.max(20, resizeStartHeight - dy);
        newY = resizeStartY + resizeStartHeight - newHeight;
      }

      element.width = newWidth;
      element.height = newHeight;
      element.x = newX;
      element.y = newY;
    } else {
      const scaleX = drivesWidth ? (resizeStartWidth + (handleDef.left ? -dx : dx)) / resizeStartWidth : null;
      const scaleY = drivesHeight ? (resizeStartHeight + (handleDef.top ? -dy : dy)) / resizeStartHeight : null;

      let scale;
      if (drivesWidth && drivesHeight) {
        scale = Math.max(scaleX, scaleY);
      } else if (drivesWidth) {
        scale = scaleX;
      } else {
        scale = scaleY;
      }

      const minScale = Math.max(20 / resizeStartWidth, 20 / resizeStartHeight);
      scale = Math.max(scale, 0.1, minScale);

      const newWidth = resizeStartWidth * scale;
      const newHeight = resizeStartHeight * scale;

      element.width = newWidth;
      element.height = newHeight;

      element.x = handleDef.left
        ? resizeStartX + resizeStartWidth - newWidth
        : drivesWidth
        ? resizeStartX
        : resizeStartX - (newWidth - resizeStartWidth) / 2;

      element.y = handleDef.top
        ? resizeStartY + resizeStartHeight - newHeight
        : drivesHeight
        ? resizeStartY
        : resizeStartY - (newHeight - resizeStartHeight) / 2;

      if (element.type === "text") {
        element.fontSize = resizeStartFontSize * scale;
      }
    }

    if ((e.ctrlKey || e.metaKey) && resizeStartRotation === 0) {
      applyResizeSnap(element, handleDef);
    } else {
      snapGuideX = null;
      snapGuideY = null;
    }

    renderSlideCanvas();
    return;
  }

  if (!isDragging || dragStartPositions.length === 0) return;

  const slideRect = slideCanvasEl.getBoundingClientRect();
  const elements = slides[currentSlideIndex].elements;
  const mouseX = (e.clientX - slideRect.left) / canvasZoom;
  const mouseY = (e.clientY - slideRect.top) / canvasZoom;
  const dx = mouseX - dragStartMouseX;
  const dy = mouseY - dragStartMouseY;

  dragStartPositions.forEach((snapshot) => {
    const element = elements[snapshot.index];
    element.x = snapshot.x + dx;
    element.y = snapshot.y + dy;
  });

  if (dragStartPositions.length === 1 && (e.ctrlKey || e.metaKey)) {
    applySnap(elements[dragStartPositions[0].index]);
  } else {
    snapGuideX = null;
    snapGuideY = null;
  }

  renderSlideCanvas();
});

document.addEventListener("mouseup", () => {
  if (isMarqueeSelecting) {
    isMarqueeSelecting = false;

    const dragDistance = Math.hypot(marqueeCurrentX - marqueeStartX, marqueeCurrentY - marqueeStartY);
    if (dragDistance < MIN_SHAPE_DRAG_SIZE) {
      if (!marqueeAdditive) clearSelection();
      renderSlideCanvas();
      return;
    }

    const rectLeft = Math.min(marqueeStartX, marqueeCurrentX);
    const rectRight = Math.max(marqueeStartX, marqueeCurrentX);
    const rectTop = Math.min(marqueeStartY, marqueeCurrentY);
    const rectBottom = Math.max(marqueeStartY, marqueeCurrentY);

    const enclosed = [];
    slides[currentSlideIndex].elements.forEach((element, index) => {
      const withinX = element.x >= rectLeft && element.x + element.width <= rectRight;
      const withinY = element.y >= rectTop && element.y + element.height <= rectBottom;
      if (withinX && withinY) enclosed.push(index);
    });

    if (marqueeAdditive) {
      const merged = new Set(selectedElementIndices.concat(enclosed));
      selectedElementIndices = Array.from(merged);
    } else {
      selectedElementIndices = enclosed;
    }

    mainSelectedIndex = selectedElementIndices.length > 0 ? Math.max(...selectedElementIndices) : null;

    renderSlideCanvas();
    return;
  }

  if (isPlacingShape && placingElementIndex !== null) {
    const element = slides[currentSlideIndex].elements[placingElementIndex];

    if (element.width < MIN_SHAPE_DRAG_SIZE && element.height < MIN_SHAPE_DRAG_SIZE) {
      const defaultHeight = element.shapeType === "line" ? DEFAULT_LINE_THICKNESS : DEFAULT_SHAPE_SIZE;
      element.x = placementStartX - DEFAULT_SHAPE_SIZE / 2;
      element.y = placementStartY - defaultHeight / 2;
      element.width = DEFAULT_SHAPE_SIZE;
      element.height = defaultHeight;
    }

    isPlacingShape = false;
    placingElementIndex = null;
    pendingInsertType = null;
    slideCanvasEl.classList.remove("placing");
    renderSlideCanvas();
    return;
  }

  const hadGuide = snapGuideX !== null || snapGuideY !== null;

  isDragging = false;
  isResizing = false;
  isRotating = false;
  resizeHandleType = null;
  snapGuideX = null;
  snapGuideY = null;

  if (hadGuide) {
    renderSlideCanvas();
  }
});

const SHAPE_INSERT_TYPES = {
  "shape-rectangle": "rectangle",
  "shape-ellipse": "ellipse",
  "shape-triangle": "triangle",
  "shape-hexagon": "hexagon",
  "shape-line": "line",
};

function startShapePlacement(clickX, clickY, shapeType) {
  const slide = slides[currentSlideIndex];

  const newElement = {
    id: generateElementId(),
    type: "shape",
    shapeType,
    x: clickX,
    y: clickY,
    width: 1,
    height: 1,
    fillColor: "#4f46e5",
    rotation: 0,
  };
  if (shapeType === "rectangle") {
    newElement.borderRadius = 0;
  }

  slide.elements.push(newElement);
  placingElementIndex = slide.elements.length - 1;
  selectOnly(placingElementIndex);
  isPlacingShape = true;
  placementStartX = clickX;
  placementStartY = clickY;
  renderSlideCanvas();
}

slideCanvasEl.addEventListener(
  "mousedown",
  (e) => {
    if (!pendingInsertType) return;
    e.preventDefault();
    e.stopPropagation();

    const slideRect = slideCanvasEl.getBoundingClientRect();
    const clickX = (e.clientX - slideRect.left) / canvasZoom;
    const clickY = (e.clientY - slideRect.top) / canvasZoom;

    if (pendingInsertType === "text") {
      addTextBoxAt(clickX, clickY);
      pendingInsertType = null;
      slideCanvasEl.classList.remove("placing");
    } else if (pendingInsertType === "image" && pendingImageData) {
      addImageAt(clickX, clickY, pendingImageData);
      pendingInsertType = null;
      pendingImageData = null;
      slideCanvasEl.classList.remove("placing");
    } else if (SHAPE_INSERT_TYPES[pendingInsertType]) {
      startShapePlacement(clickX, clickY, SHAPE_INSERT_TYPES[pendingInsertType]);
    }
  },
  true
);

slideCanvasEl.addEventListener("mousedown", (e) => {
  if (e.target === slideCanvasEl) {
    commitEditingText();

    const slideRect = slideCanvasEl.getBoundingClientRect();
    marqueeStartX = (e.clientX - slideRect.left) / canvasZoom;
    marqueeStartY = (e.clientY - slideRect.top) / canvasZoom;
    marqueeCurrentX = marqueeStartX;
    marqueeCurrentY = marqueeStartY;
    marqueeAdditive = e.shiftKey;
    isMarqueeSelecting = true;
  }
});
