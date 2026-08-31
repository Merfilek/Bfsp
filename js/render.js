const CONTOUR_CORNER_ANGLE_DEG = 35;

function computeTurnAngleDeg(prev, curr, next) {
  const v1x = curr.x - prev.x;
  const v1y = curr.y - prev.y;
  const v2x = next.x - curr.x;
  const v2y = next.y - curr.y;
  const len1 = Math.hypot(v1x, v1y);
  const len2 = Math.hypot(v2x, v2y);
  if (len1 < 1e-9 || len2 < 1e-9) return 0;
  const dot = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (len1 * len2)));
  return Math.acos(dot) * (180 / Math.PI);
}

function classifyContourCorners(points) {
  const n = points.length;
  if (n < 3) return points.map(() => true);
  return points.map((p, i) => {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    return computeTurnAngleDeg(prev, p, next) > CONTOUR_CORNER_ANGLE_DEG;
  });
}

function formatContourPoint(p) {
  return p.x.toFixed(2) + " " + p.y.toFixed(2);
}

// The raw traced polygon follows raster grid-cell boundaries, so a real curve (a
// letter's round stroke, a circle) arrives as a staircase of many tiny ~90deg steps --
// every one of those IS a genuine sharp corner by turn angle, so classifyContourCorners
// would (correctly) call the whole staircase "corners" and smooth none of it. This
// removes the staircase noise first via the existing Douglas-Peucker closed-polygon
// simplifier (polygon-boolean.js) so only the real shape of the curve is left for corner
// classification to judge. Epsilon scales with this contour's OWN bounding box (not the
// whole element) so a tiny dot/period nested inside a much bigger text box isn't
// simplified away just because the box around it is large.
const CONTOUR_SMOOTH_SIMPLIFY_FACTOR = 0.025;

function simplifyContourForSmoothing(points) {
  if (points.length < 5) return points;
  const box = polyBoundingBoxOfPoints(points);
  const size = Math.max(box.maxX - box.minX, box.maxY - box.minY);
  const epsilon = size * CONTOUR_SMOOTH_SIMPLIFY_FACTOR;
  if (epsilon <= 0) return points;
  return simplifyClosedPolygon(points, epsilon);
}

// Douglas-Peucker simplification (see simplifyContourForSmoothing above) keeps points
// exactly where the curve deviates from a straight chord and drops ones that don't --
// so the surviving points end up very unevenly spaced (a long chord along a gentle
// stretch, tiny segments near a tighter bend). A uniformly-parameterized Catmull-Rom
// fit (the simple "(next-prev)/6" tangent) assumes roughly equal spacing between
// points, and overshoots/undershoots badly when that's violated -- exactly what
// produced the flat dents and spiky overshoot kinks the user spotted (e.g. on "o" and
// "W"). Centripetal Catmull-Rom (Barry & Goldman) parameterizes by the square root of
// chord length between points instead of by point count, which stays well-behaved
// (no cusps/loops/overshoot) regardless of how unevenly the points are spaced.
function catmullRomToBezierControlPoints(p0, p1, p2, p3) {
  function tDelta(a, b) {
    return Math.max(Math.pow(Math.hypot(b.x - a.x, b.y - a.y), 0.5), 1e-6);
  }
  const t0 = 0;
  const t1 = t0 + tDelta(p0, p1);
  const t2 = t1 + tDelta(p1, p2);
  const t3 = t2 + tDelta(p2, p3);

  const m1x = (t2 - t1) * ((p1.x - p0.x) / (t1 - t0) - (p2.x - p0.x) / (t2 - t0) + (p2.x - p1.x) / (t2 - t1));
  const m1y = (t2 - t1) * ((p1.y - p0.y) / (t1 - t0) - (p2.y - p0.y) / (t2 - t0) + (p2.y - p1.y) / (t2 - t1));
  const m2x = (t2 - t1) * ((p2.x - p1.x) / (t2 - t1) - (p3.x - p1.x) / (t3 - t1) + (p3.x - p2.x) / (t3 - t2));
  const m2y = (t2 - t1) * ((p2.y - p1.y) / (t2 - t1) - (p3.y - p1.y) / (t3 - t1) + (p3.y - p2.y) / (t3 - t2));

  return {
    c1: { x: p1.x + m1x / 3, y: p1.y + m1y / 3 },
    c2: { x: p2.x - m2x / 3, y: p2.y - m2y / 3 },
  };
}

// Walks the closed contour once; sharp vertices (real corners, e.g. a rectangle's
// corners or where two merged shapes' straight edges meet) stay straight lines, while
// runs of gently-turning points (raster-traced curves, like a letter's round strokes)
// get fit with centripetal-Catmull-Rom-derived cubic Beziers so they render as smooth
// curves instead of the many tiny straight facets the raw traced polygon would show.
function buildSmoothedContourPathD(rawPoints) {
  const points = simplifyContourForSmoothing(rawPoints);
  const n = points.length;
  if (n < 3) {
    return "M " + points.map(formatContourPoint).join(" L ") + " Z";
  }

  const isCorner = classifyContourCorners(points);
  let d = "M " + formatContourPoint(points[0]);

  for (let i = 0; i < n; i++) {
    const curr = points[i];
    const nextIdx = (i + 1) % n;
    const next = points[nextIdx];

    if (isCorner[i] || isCorner[nextIdx]) {
      d += " L " + formatContourPoint(next);
    } else {
      const prev = points[(i - 1 + n) % n];
      const afterNext = points[(nextIdx + 1) % n];
      const { c1, c2 } = catmullRomToBezierControlPoints(prev, curr, next, afterNext);
      d += " C " + formatContourPoint(c1) + " " + formatContourPoint(c2) + " " + formatContourPoint(next);
    }
  }

  return d + " Z";
}

function contoursToClipPathValue(contours, width, height) {
  const d = contours
    .map((contour) => buildSmoothedContourPathD(contour.points.map((p) => ({ x: p.x * width, y: p.y * height }))))
    .join(" ");
  return 'path(evenodd, "' + d + '")';
}

const GRADIENT_METHOD_COLOR_SPACES = {
  classic: "srgb",
  linear: "srgb-linear",
  smooth: "oklab",
  perceptual: "oklch",
};

function buildGradientOverlayLayer(gradientOverlay, stopColor1, stopColor2) {
  const scale = gradientOverlay.scale != null ? gradientOverlay.scale : 100;
  const offsetX = gradientOverlay.offsetX || 0;
  const offsetY = gradientOverlay.offsetY || 0;
  const isStripes = gradientOverlay.method === "stripes";

  if (isStripes) {
    const backgroundImage =
      "repeating-linear-gradient(" +
      gradientOverlay.angle +
      "deg, " +
      stopColor1 +
      " 0%, " +
      stopColor1 +
      " 12.5%, " +
      stopColor2 +
      " 12.5%, " +
      stopColor2 +
      " 25%)";

    return {
      backgroundImage: backgroundImage,
      backgroundSize: scale + "% " + scale + "%",
      backgroundPosition: 50 + offsetX + "% " + (50 + offsetY) + "%",
      backgroundRepeat: "repeat",
    };
  }

  // Scale compresses/expands where the ramp's two stops sit instead of shrinking the
  // painted box, so colors keep filling the whole element (clamping solid past each stop)
  // instead of leaving a smaller rectangle with empty space around it.
  const angleRad = (gradientOverlay.angle * Math.PI) / 180;
  const axisOffset = offsetX * Math.sin(angleRad) - offsetY * Math.cos(angleRad);
  const half = scale / 2;
  const stop1 = (50 - half + axisOffset).toFixed(2);
  const stop2 = (50 + half + axisOffset).toFixed(2);

  const space = GRADIENT_METHOD_COLOR_SPACES[gradientOverlay.method] || "srgb";
  const backgroundImage =
    "linear-gradient(" +
    gradientOverlay.angle +
    "deg in " +
    space +
    ", " +
    stopColor1 +
    " " +
    stop1 +
    "%, " +
    stopColor2 +
    " " +
    stop2 +
    "%)";

  return {
    backgroundImage: backgroundImage,
    backgroundSize: "100% 100%",
    backgroundPosition: "0% 0%",
    backgroundRepeat: "no-repeat",
  };
}

function applyGradientOverlayLayer(styleTarget, gradientOverlay, stopColor1, stopColor2) {
  const layer = buildGradientOverlayLayer(gradientOverlay, stopColor1, stopColor2);
  styleTarget.backgroundImage = layer.backgroundImage;
  styleTarget.backgroundSize = layer.backgroundSize;
  styleTarget.backgroundPosition = layer.backgroundPosition;
  styleTarget.backgroundRepeat = layer.backgroundRepeat;
}

function renderImageContent(el, element) {
  el.style.overflow = "hidden";

  if (element.clipMaskContours) {
    el.style.clipPath = contoursToClipPathValue(element.clipMaskContours, element.width, element.height);
  }

  const img = document.createElement("img");
  img.src = element.src;
  img.draggable = false;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.display = "block";
  img.style.pointerEvents = "none";

  el.appendChild(img);

  const colorOverlay = element.effects && element.effects.colorOverlay;
  if (colorOverlay && colorOverlay.enabled) {
    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = colorOverlay.color;
    overlay.style.opacity = colorOverlay.opacity;
    overlay.style.pointerEvents = "none";
    overlay.style.webkitMaskImage = "url(" + element.src + ")";
    overlay.style.maskImage = "url(" + element.src + ")";
    overlay.style.webkitMaskSize = "cover";
    overlay.style.maskSize = "cover";
    overlay.style.webkitMaskPosition = "center";
    overlay.style.maskPosition = "center";
    overlay.style.webkitMaskRepeat = "no-repeat";
    overlay.style.maskRepeat = "no-repeat";
    el.appendChild(overlay);
  }

  const gradientOverlay = element.effects && element.effects.gradientOverlay;
  if (gradientOverlay && gradientOverlay.enabled) {
    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    applyGradientOverlayLayer(overlay.style, gradientOverlay, gradientOverlay.color1, gradientOverlay.color2);
    overlay.style.opacity = gradientOverlay.opacity;
    overlay.style.pointerEvents = "none";
    overlay.style.webkitMaskImage = "url(" + element.src + ")";
    overlay.style.maskImage = "url(" + element.src + ")";
    overlay.style.webkitMaskSize = "cover";
    overlay.style.maskSize = "cover";
    overlay.style.webkitMaskPosition = "center";
    overlay.style.maskPosition = "center";
    overlay.style.webkitMaskRepeat = "no-repeat";
    overlay.style.maskRepeat = "no-repeat";
    el.appendChild(overlay);
  }
}

const SHAPE_CLIP_PATHS = {
  triangle: "polygon(50% 0%, 0% 100%, 100% 100%)",
  hexagon: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
};

function hexToRgbComponents(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function hexToRgba(hex, alpha) {
  const c = hexToRgbComponents(hex);
  return "rgba(" + c.r + ", " + c.g + ", " + c.b + ", " + alpha + ")";
}

function blendHexColors(baseHex, overlayHex, t) {
  const base = hexToRgbComponents(baseHex);
  const overlay = hexToRgbComponents(overlayHex);
  const r = Math.round(base.r * (1 - t) + overlay.r * t);
  const g = Math.round(base.g * (1 - t) + overlay.g * t);
  const b = Math.round(base.b * (1 - t) + overlay.b * t);
  return "rgb(" + r + ", " + g + ", " + b + ")";
}

const STROKE_SAMPLE_COUNT = 16;

function buildElementFilter(element) {
  const effects = element.effects;
  if (!effects) return "";
  const parts = [];

  const threeD = effects.threeD;
  if (threeD && threeD.enabled) {
    const angleRad = (threeD.angle * Math.PI) / 180;
    const dirX = Math.cos(angleRad);
    const dirY = Math.sin(angleRad);
    const color = hexToRgba(threeD.color, 1);
    const steps = Math.max(1, Math.min(60, Math.ceil(threeD.depth)));
    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * threeD.depth;
      const x = (dirX * t).toFixed(2);
      const y = (dirY * t).toFixed(2);
      parts.push("drop-shadow(" + x + "px " + y + "px 0px " + color + ")");
    }
  }

  const dropShadow = effects.dropShadow;
  if (dropShadow && dropShadow.enabled) {
    const color = hexToRgba(dropShadow.color, dropShadow.opacity);
    parts.push("drop-shadow(" + dropShadow.offsetX + "px " + dropShadow.offsetY + "px " + dropShadow.blur + "px " + color + ")");
  }

  const outerGlow = effects.outerGlow;
  if (outerGlow && outerGlow.enabled) {
    parts.push("drop-shadow(0px 0px " + (outerGlow.size / 2) + "px " + hexToRgba(outerGlow.color, outerGlow.opacity) + ")");
    parts.push("drop-shadow(0px 0px " + outerGlow.size + "px " + hexToRgba(outerGlow.color, outerGlow.opacity * 0.6) + ")");
  }

  const stroke = effects.stroke;
  if (stroke && stroke.enabled) {
    const color = hexToRgba(stroke.color, 1);
    for (let i = 0; i < STROKE_SAMPLE_COUNT; i++) {
      const angle = (i / STROKE_SAMPLE_COUNT) * Math.PI * 2;
      const x = (Math.cos(angle) * stroke.width).toFixed(2);
      const y = (Math.sin(angle) * stroke.width).toFixed(2);
      parts.push("drop-shadow(" + x + "px " + y + "px 0px " + color + ")");
    }
  }

  return parts.join(" ");
}

function buildInnerEffectsBoxShadow(element) {
  const effects = element.effects;
  if (!effects) return "";
  const parts = [];

  const innerShadow = effects.innerShadow;
  if (innerShadow && innerShadow.enabled) {
    const color = hexToRgba(innerShadow.color, innerShadow.opacity);
    parts.push("inset " + innerShadow.offsetX + "px " + innerShadow.offsetY + "px " + innerShadow.blur + "px " + color);
  }

  const innerGlow = effects.innerGlow;
  if (innerGlow && innerGlow.enabled) {
    parts.push("inset 0px 0px " + innerGlow.size / 2 + "px " + hexToRgba(innerGlow.color, innerGlow.opacity));
    parts.push("inset 0px 0px " + innerGlow.size + "px " + hexToRgba(innerGlow.color, innerGlow.opacity * 0.6));
  }

  return parts.join(", ");
}

function renderShapeContent(el, element) {
  el.style.backgroundColor = element.fillColor;

  if (element.compoundContours) {
    el.style.clipPath = contoursToClipPathValue(element.compoundContours, element.width, element.height);
  } else if (element.morphOutlinePoints) {
    const points = element.morphOutlinePoints
      .map((p) => (p.x * 100).toFixed(2) + "% " + (p.y * 100).toFixed(2) + "%")
      .join(", ");
    el.style.clipPath = "polygon(" + points + ")";
  } else if (element.shapeType === "ellipse") {
    el.style.borderRadius = "50%";
  } else if (element.shapeType === "rectangle") {
    el.style.borderRadius = (element.borderRadius || 0) + "px";
  } else if (SHAPE_CLIP_PATHS[element.shapeType]) {
    el.style.clipPath = SHAPE_CLIP_PATHS[element.shapeType];
  }

  const colorOverlay = element.effects && element.effects.colorOverlay;
  if (colorOverlay && colorOverlay.enabled) {
    el.style.backgroundColor = blendHexColors(element.fillColor, colorOverlay.color, colorOverlay.opacity);
  }

  const gradientOverlay = element.effects && element.effects.gradientOverlay;
  if (gradientOverlay && gradientOverlay.enabled) {
    applyGradientOverlayLayer(
      el.style,
      gradientOverlay,
      hexToRgba(gradientOverlay.color1, gradientOverlay.opacity),
      hexToRgba(gradientOverlay.color2, gradientOverlay.opacity)
    );
  }
}

function renderTextContent(el, element, isEditing) {
  el.textContent = element.text;
  el.style.fontSize = normalizeFontSize(element.fontSize) + "px";
  el.style.fontWeight = element.fontWeight;
  el.style.fontFamily = element.fontFamily || "system-ui, sans-serif";
  el.style.fontStyle = element.fontStyle || "normal";
  el.style.textDecoration = element.textDecoration || "none";
  el.style.textAlign = element.textAlign || "left";
  el.style.color = element.color;
  const colorOverlay = element.effects && element.effects.colorOverlay;
  if (colorOverlay && colorOverlay.enabled) {
    el.style.color = blendHexColors(element.color, colorOverlay.color, colorOverlay.opacity);
  }
  el.style.display = "flex";
  el.style.alignItems = TEXT_VALIGN_TO_ALIGN_ITEMS[element.verticalAlign || "middle"];
  el.style.justifyContent = TEXT_ALIGN_TO_JUSTIFY[element.textAlign || "left"];
  el.style.whiteSpace = "pre-wrap";
  el.style.overflow = "hidden";

  const gradientOverlay = element.effects && element.effects.gradientOverlay;
  if (gradientOverlay && gradientOverlay.enabled && !isEditing) {
    const overlay = document.createElement("div");
    overlay.textContent = element.text;
    overlay.style.position = "absolute";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.display = "flex";
    overlay.style.alignItems = el.style.alignItems;
    overlay.style.justifyContent = el.style.justifyContent;
    overlay.style.textAlign = el.style.textAlign;
    overlay.style.fontSize = el.style.fontSize;
    overlay.style.fontWeight = el.style.fontWeight;
    overlay.style.fontFamily = el.style.fontFamily;
    overlay.style.fontStyle = el.style.fontStyle;
    overlay.style.textDecoration = el.style.textDecoration;
    overlay.style.whiteSpace = "pre-wrap";
    overlay.style.overflow = "hidden";
    overlay.style.pointerEvents = "none";
    applyGradientOverlayLayer(overlay.style, gradientOverlay, gradientOverlay.color1, gradientOverlay.color2);
    overlay.style.webkitBackgroundClip = "text";
    overlay.style.backgroundClip = "text";
    overlay.style.color = "transparent";
    overlay.style.opacity = gradientOverlay.opacity;
    el.appendChild(overlay);
  }
}

function renderGroupContent(el, element) {
  (element.children || []).forEach((child) => {
    const childEl = document.createElement("div");
    childEl.style.position = "absolute";
    childEl.style.left = child.xFraction * 100 + "%";
    childEl.style.top = child.yFraction * 100 + "%";
    childEl.style.width = child.widthFraction * 100 + "%";
    childEl.style.height = child.heightFraction * 100 + "%";
    childEl.style.transform = "rotate(" + (child.rotation || 0) + "deg)";
    childEl.style.filter = buildElementFilter(child);

    if (child.type === "text") {
      renderTextContent(childEl, child);
    } else if (child.type === "image") {
      renderImageContent(childEl, child);
    } else if (child.type === "shape") {
      renderShapeContent(childEl, child);
    } else if (child.type === "group") {
      renderGroupContent(childEl, child);
    }

    el.appendChild(childEl);
  });
}

function buildMiniSlidePreview(slide, containerWidthPx, blurPx) {
  const scale = containerWidthPx / 960;

  const preview = document.createElement("div");
  preview.className = "mini-slide-preview";
  preview.style.width = "960px";
  preview.style.height = "540px";
  preview.style.backgroundColor = slide.backgroundColor || "#ffffff";
  preview.style.transform = "scale(" + scale + ")";
  if (blurPx) {
    preview.style.filter = "blur(" + blurPx + "px)";
  }

  slide.elements.forEach((element) => {
    preview.appendChild(renderPresentElement(element));
  });

  return preview;
}

function renderElement(element, index) {
  const isEditing = index === editingElementIndex;

  const el = document.createElement("div");
  el.className =
    "element" +
    (isElementSelected(index) ? " selected" : "") +
    (isEditing ? " editing" : "");
  el.style.position = "absolute";
  el.style.left = element.x + "px";
  el.style.top = element.y + "px";
  el.style.width = element.width + "px";
  el.style.height = element.height + "px";
  el.style.transform = "rotate(" + (element.rotation || 0) + "deg)";
  el.style.filter = buildElementFilter(element);
  el.style.boxShadow = buildInnerEffectsBoxShadow(element);

  if (element.type === "text") {
    renderTextContent(el, element, isEditing);

    if (isEditing) {
      el.contentEditable = "true";

      el.addEventListener("blur", () => {
        if (editingElementIndex !== index) return;
        element.text = el.textContent;
        editingElementIndex = null;
        renderSlideCanvas();
      });

      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const selection = window.getSelection();
          if (!selection.rangeCount) return;
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const newlineNode = document.createTextNode("\n");
          range.insertNode(newlineNode);
          range.setStartAfter(newlineNode);
          range.setEndAfter(newlineNode);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      });
    } else {
      el.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        selectOnly(index);
        editingElementIndex = index;
        renderSlideCanvas();
      });
    }
  } else if (element.type === "image") {
    renderImageContent(el, element);
  } else if (element.type === "shape") {
    renderShapeContent(el, element);
  } else if (element.type === "group") {
    renderGroupContent(el, element);
  }

  el.addEventListener("mousedown", (e) => {
    if (isEditing) return;
    e.stopPropagation();

    if (e.shiftKey) {
      toggleElementSelection(index);
      renderSlideCanvas();
      if (!isElementSelected(index)) return;
    } else if (!isElementSelected(index)) {
      selectOnly(index);
      renderSlideCanvas();
    }

    startDrag(e);
  });

  return el;
}

function buildSelectionOverlay(element, includeHandles, isMain) {
  const overlay = document.createElement("div");
  overlay.className = "selection-overlay" + (isMain ? " main" : "");
  overlay.style.left = element.x + "px";
  overlay.style.top = element.y + "px";
  overlay.style.width = element.width + "px";
  overlay.style.height = element.height + "px";
  overlay.style.transform = "rotate(" + (element.rotation || 0) + "deg)";

  if (includeHandles === false) return overlay;

  HANDLE_TYPES.forEach((handleDef) => {
    const handle = document.createElement("div");
    handle.className = "resize-handle";
    handle.style.cursor = handleDef.cursor;
    handle.style.left = (handleDef.left ? 0 : handleDef.right ? 100 : 50) + "%";
    handle.style.top = (handleDef.top ? 0 : handleDef.bottom ? 100 : 50) + "%";

    handle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      startResize(e, element, handleDef);
    });

    overlay.appendChild(handle);
  });

  const stem = document.createElement("div");
  stem.className = "rotate-stem";
  overlay.appendChild(stem);

  const rotateHandle = document.createElement("div");
  rotateHandle.className = "rotate-handle";
  rotateHandle.title = "Drag to rotate";
  rotateHandle.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    startRotate(e, element);
  });
  overlay.appendChild(rotateHandle);

  return overlay;
}

function renderPresentElement(element) {
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.left = element.x + "px";
  el.style.top = element.y + "px";
  el.style.width = element.width + "px";
  el.style.height = element.height + "px";
  el.style.transform = "rotate(" + (element.rotation || 0) + "deg)";
  el.style.filter = buildElementFilter(element);
  el.style.boxShadow = buildInnerEffectsBoxShadow(element);
  el.style.opacity = element.opacity != null ? element.opacity : 1;

  if (element.type === "text") {
    renderTextContent(el, element);
  } else if (element.type === "image") {
    renderImageContent(el, element);
  } else if (element.type === "shape") {
    renderShapeContent(el, element);
  } else if (element.type === "group") {
    renderGroupContent(el, element);
  }

  return el;
}

function renderPresentSlide() {
  presentSlideEl.innerHTML = "";
  const slide = slides[presentIndex];
  presentSlideEl.style.backgroundColor = slide.backgroundColor || "#ffffff";
  slide.elements.forEach((element) => {
    presentSlideEl.appendChild(renderPresentElement(element));
  });
  initSlideAnimations(slide);
}

let draggedSlideIndex = null;

function renderThumbnails() {
  slideListEl.innerHTML = "";

  slides.forEach((slide, index) => {
    const thumb = document.createElement("div");
    thumb.className = "thumbnail" + (index === currentSlideIndex ? " selected" : "");
    thumb.draggable = true;

    thumb.addEventListener("click", () => {
      commitEditingText();
      currentSlideIndex = index;
      clearSelection();
      renderAll();
    });

    thumb.addEventListener("dragstart", (e) => {
      draggedSlideIndex = index;
      thumb.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    thumb.addEventListener("dragend", () => {
      thumb.classList.remove("dragging");
      draggedSlideIndex = null;
    });

    thumb.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (draggedSlideIndex === null || draggedSlideIndex === index) return;
      thumb.classList.add("drag-over");
    });

    thumb.addEventListener("dragleave", () => {
      thumb.classList.remove("drag-over");
    });

    thumb.addEventListener("drop", (e) => {
      e.preventDefault();
      thumb.classList.remove("drag-over");
      if (draggedSlideIndex === null || draggedSlideIndex === index) return;

      commitEditingText();
      const [movedSlide] = slides.splice(draggedSlideIndex, 1);
      slides.splice(index, 0, movedSlide);

      if (currentSlideIndex === draggedSlideIndex) {
        currentSlideIndex = index;
      } else if (draggedSlideIndex < currentSlideIndex && index >= currentSlideIndex) {
        currentSlideIndex--;
      } else if (draggedSlideIndex > currentSlideIndex && index <= currentSlideIndex) {
        currentSlideIndex++;
      }

      draggedSlideIndex = null;
      renderAll();
    });

    slideListEl.appendChild(thumb);

    thumb.appendChild(buildMiniSlidePreview(slide, thumb.clientWidth, 0));

    const number = document.createElement("span");
    number.className = "thumbnail-number";
    number.textContent = index + 1;
    thumb.appendChild(number);
  });
}

function refreshCurrentThumbnailPreview() {
  const thumb = slideListEl.children[currentSlideIndex];
  if (!thumb) return;

  const oldPreview = thumb.querySelector(".mini-slide-preview");
  const newPreview = buildMiniSlidePreview(slides[currentSlideIndex], thumb.clientWidth, 0);

  if (oldPreview) {
    thumb.replaceChild(newPreview, oldPreview);
  } else {
    thumb.insertBefore(newPreview, thumb.firstChild);
  }
}

function renderSlideCanvas() {
  slideCanvasEl.innerHTML = "";
  const slide = slides[currentSlideIndex];
  slideCanvasEl.style.backgroundColor = slide.backgroundColor || "#ffffff";

  slide.elements.forEach((element, index) => {
    slideCanvasEl.appendChild(renderElement(element, index));
  });

  if (!isPlacingShape && selectedElementIndices.length === 1 && slide.elements[selectedElementIndices[0]]) {
    const soloIndex = selectedElementIndices[0];
    const isEditingSelected = editingElementIndex === soloIndex;
    slideCanvasEl.appendChild(
      buildSelectionOverlay(slide.elements[soloIndex], !isEditingSelected, soloIndex === mainSelectedIndex)
    );
  } else if (!isPlacingShape && selectedElementIndices.length > 1) {
    selectedElementIndices.forEach((index) => {
      if (slide.elements[index]) {
        slideCanvasEl.appendChild(buildSelectionOverlay(slide.elements[index], false, index === mainSelectedIndex));
      }
    });
  }

  if (editingElementIndex !== null) {
    const el = slideCanvasEl.children[editingElementIndex];
    if (el) {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  if (snapGuideX !== null) {
    const guide = document.createElement("div");
    guide.className = "snap-guide snap-guide-vertical";
    guide.style.left = snapGuideX + "px";
    slideCanvasEl.appendChild(guide);
  }

  if (snapGuideY !== null) {
    const guide = document.createElement("div");
    guide.className = "snap-guide snap-guide-horizontal";
    guide.style.top = snapGuideY + "px";
    slideCanvasEl.appendChild(guide);
  }

  if (isMarqueeSelecting) {
    const marquee = document.createElement("div");
    marquee.className = "marquee-select";
    marquee.style.left = Math.min(marqueeStartX, marqueeCurrentX) + "px";
    marquee.style.top = Math.min(marqueeStartY, marqueeCurrentY) + "px";
    marquee.style.width = Math.abs(marqueeCurrentX - marqueeStartX) + "px";
    marquee.style.height = Math.abs(marqueeCurrentY - marqueeStartY) + "px";
    slideCanvasEl.appendChild(marquee);
  }

  refreshCurrentThumbnailPreview();
  renderPropertiesToolbar();
  scheduleSave();
  scheduleUndoSnapshot();
}

function renderAll() {
  renderThumbnails();
  renderSlideCanvas();
}
