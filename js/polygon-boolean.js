const POLY_EPS_AREA = 0.5;
const POLY_FRAGMENT_MAX_SHAPES = 8;

function polyPointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function polyCleanContourPoints(points, eps) {
  const cleaned = [];
  for (const p of points) {
    const last = cleaned[cleaned.length - 1];
    if (!last || polyPointDistance(last, p) > eps) cleaned.push(p);
  }
  if (cleaned.length > 1 && polyPointDistance(cleaned[0], cleaned[cleaned.length - 1]) <= eps) {
    cleaned.pop();
  }
  return cleaned;
}

function polyBoundingBoxOfPoints(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  });
  return { minX, minY, maxX, maxY };
}

function polygonSignedArea(points) {
  let sum = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

function pointInPolygonContour(pt, points) {
  let inside = false;
  const n = points.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersects = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolyEvenOdd(pt, contours) {
  let inside = false;
  contours.forEach((contour) => {
    if (pointInPolygonContour(pt, contour.points)) inside = !inside;
  });
  return inside;
}

// Boolean ops are computed on a fine raster grid rather than via exact vector
// polygon clipping. Vector clipping (Greiner-Hormann style boundary tracing)
// was tried first but proved too fragile against the T-junction / collinear-edge
// degeneracies that come up constantly with rectangle-heavy, snap-to-guide input
// (two shapes sharing an exact edge or corner) -- exactly the case this app's own
// snapping feature encourages. Rasterizing sidesteps that whole class of bugs:
// `pointInPolyEvenOdd` is simple and robust, and grid-based contour tracing has
// no exotic topology cases to get wrong. The tradeoff is a grid-resolution-limited
// (not perfectly smooth) outline for non-axis-aligned edges, cleaned up below by
// collapsing collinear runs.
const POLY_RASTER_TARGET_CELLS = 700;

function polyIsFilled(op, cx, cy, contoursA, contoursB) {
  const inA = pointInPolyEvenOdd({ x: cx, y: cy }, contoursA);
  const inB = pointInPolyEvenOdd({ x: cx, y: cy }, contoursB);
  if (op === "union") return inA || inB;
  if (op === "intersect") return inA && inB;
  return inA && !inB; // subtract
}

function simplifyCollinearPoints(points, eps) {
  const n = points.length;
  if (n < 3) return points;
  const result = [];
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    const cross = (cur.x - prev.x) * (next.y - prev.y) - (cur.y - prev.y) * (next.x - prev.x);
    if (Math.abs(cross) > eps) result.push(cur);
  }
  return result.length >= 3 ? result : points;
}

function perpendicularDistance(pt, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return polyPointDistance(pt, a);
  return Math.abs((pt.x - a.x) * dy - (pt.y - a.y) * dx) / len;
}

function douglasPeucker(points, epsilon) {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, index + 1), epsilon);
    const right = douglasPeucker(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [start, end];
}

function simplifyClosedPolygon(points, epsilon) {
  const n = points.length;
  if (n < 5) return points;

  let bestDist = -1;
  let bestIdx = 1;
  for (let i = 1; i < n; i++) {
    const d = polyPointDistance(points[0], points[i]);
    if (d > bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }

  const chain1 = points.slice(0, bestIdx + 1);
  const chain2 = points.slice(bestIdx).concat(points.slice(0, 1));
  const simp1 = douglasPeucker(chain1, epsilon);
  const simp2 = douglasPeucker(chain2, epsilon);
  const merged = simp1.slice(0, -1).concat(simp2.slice(0, -1));
  return merged.length >= 3 ? merged : points;
}

function traceRasterContours(grid, rows, cols, minX, minY, cellSize, simplifyFactor) {
  const effectiveSimplifyFactor = simplifyFactor === undefined ? 0.75 : simplifyFactor;
  function cellFilled(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    return grid[r][c];
  }

  const edgesByStart = new Map();
  function keyOf(x, y) {
    return x.toFixed(4) + "," + y.toFixed(4);
  }
  function addEdge(sx, sy, ex, ey) {
    const k = keyOf(sx, sy);
    if (!edgesByStart.has(k)) edgesByStart.set(k, []);
    edgesByStart.get(k).push({ sx, sy, ex, ey, used: false });
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c]) continue;
      const x0 = minX + c * cellSize;
      const x1 = minX + (c + 1) * cellSize;
      const y0 = minY + r * cellSize;
      const y1 = minY + (r + 1) * cellSize;

      if (!cellFilled(r - 1, c)) addEdge(x0, y0, x1, y0);
      if (!cellFilled(r, c + 1)) addEdge(x1, y0, x1, y1);
      if (!cellFilled(r + 1, c)) addEdge(x1, y1, x0, y1);
      if (!cellFilled(r, c - 1)) addEdge(x0, y1, x0, y0);
    }
  }

  const contours = [];
  const guard = rows * cols * 4 + 16;

  edgesByStart.forEach((list) => {
    list.forEach((startEdge) => {
      if (startEdge.used) return;
      const points = [];
      let current = startEdge;
      const loopStartKey = keyOf(current.sx, current.sy);
      let steps = 0;

      while (true) {
        current.used = true;
        points.push({ x: current.sx, y: current.sy });
        const nextKey = keyOf(current.ex, current.ey);
        if (nextKey === loopStartKey) break;
        const candidates = edgesByStart.get(nextKey);
        const next = candidates && candidates.find((e) => !e.used);
        if (!next) break;
        current = next;
        steps++;
        if (steps > guard) break;
      }

      if (points.length >= 3) {
        const collinearSimplified = simplifyCollinearPoints(points, 1e-6);
        contours.push({ points: simplifyClosedPolygon(collinearSimplified, cellSize * effectiveSimplifyFactor) });
      }
    });
  });

  return contours;
}

function booleanOpSimple(contoursA, contoursB, op) {
  if (op === "combine") {
    return contoursA.concat(contoursB);
  }

  const cleanA = contoursA.map((c) => ({ points: polyCleanContourPoints(c.points, 1e-6) })).filter((c) => c.points.length >= 3);
  const cleanB = contoursB.map((c) => ({ points: polyCleanContourPoints(c.points, 1e-6) })).filter((c) => c.points.length >= 3);

  if (cleanA.length === 0 && cleanB.length === 0) return [];
  if (cleanA.length === 0) return op === "union" ? cleanB : [];
  if (cleanB.length === 0) return op === "subtract" || op === "union" ? cleanA : [];

  const allPoints = [];
  cleanA.forEach((c) => allPoints.push(...c.points));
  cleanB.forEach((c) => allPoints.push(...c.points));
  const box = polyBoundingBoxOfPoints(allPoints);

  const pad = Math.max(2, (Math.max(box.maxX - box.minX, box.maxY - box.minY) || 1) * 0.02);
  const minX = box.minX - pad;
  const minY = box.minY - pad;
  const width = box.maxX - box.minX + pad * 2;
  const height = box.maxY - box.minY + pad * 2;

  if (width <= 0 || height <= 0) return [];

  const cellSize = Math.max(width, height) / POLY_RASTER_TARGET_CELLS;
  const cols = Math.max(1, Math.ceil(width / cellSize));
  const rows = Math.max(1, Math.ceil(height / cellSize));

  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = new Array(cols);
    const cy = minY + (r + 0.5) * cellSize;
    for (let c = 0; c < cols; c++) {
      const cx = minX + (c + 0.5) * cellSize;
      row[c] = polyIsFilled(op, cx, cy, cleanA, cleanB);
    }
    grid.push(row);
  }

  const traced = traceRasterContours(grid, rows, cols, minX, minY, cellSize);
  const minArea = Math.max(POLY_EPS_AREA, cellSize * cellSize * 2);
  const minDimension = cellSize * 2;

  return traced.filter((c) => {
    if (Math.abs(polygonSignedArea(c.points)) < minArea) return false;
    // Also reject hairline slivers along an exactly-aligned boundary between two
    // adjacent input shapes: these can have "enough" area (long but very thin)
    // without being large in either dimension, unlike a real intended shape.
    const cbox = polyBoundingBoxOfPoints(c.points);
    return cbox.maxX - cbox.minX >= minDimension && cbox.maxY - cbox.minY >= minDimension;
  });
}

function polyContourContainsPoint(contours, index, pt) {
  return pointInPolygonContour(pt, contours[index].points);
}

function groupContoursIntoShapes(contours) {
  if (contours.length === 0) return [];

  const depths = contours.map((c, i) => {
    const samplePt = c.points[0];
    let depth = 0;
    contours.forEach((other, j) => {
      if (i === j) return;
      if (polyContourContainsPoint(contours, j, samplePt)) depth++;
    });
    return depth;
  });

  const shapes = [];
  contours.forEach((c, i) => {
    if (depths[i] % 2 !== 0) return;
    const shapeContours = [c];
    contours.forEach((hole, j) => {
      if (j === i) return;
      if (depths[j] === depths[i] + 1 && polyContourContainsPoint(contours, i, hole.points[0])) {
        shapeContours.push(hole);
      }
    });
    shapes.push(shapeContours);
  });

  return shapes;
}

function wrapCanvasTextLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [""];

  const lines = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; i++) {
    const candidate = currentLine + " " + words[i];
    if (ctx.measureText(candidate).width <= maxWidth || currentLine.length === 0) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
}

// Renders the text the same way `renderTextContent` (js/render.js) lays it out --
// wrapped within the box, aligned per textAlign/verticalAlign -- onto an offscreen
// canvas, then traces its alpha silhouette using the exact same grid+contour
// machinery `booleanOpSimple` already uses for shapes (just fed from text-alpha
// instead of point-in-polygon). This is the only Canvas-2D-dependent part of the
// whole merge feature, so it can't be numerically verified outside a real browser
// the way the rest of this file was.
// Text has much finer features than shapes -- thin strokes, serifs, small counters
// and dots -- so it gets its own, much higher cell budget than the shared shape/image
// grid (POLY_RASTER_TARGET_CELLS). Note this is computed from the element's real
// slide-space size, not from the (separately supersampled, for antialiasing quality
// only) rendering canvas -- an earlier version tied the grid to the canvas's own
// inflated pixel dimensions, which made the "supersample" have zero actual effect on
// trace fidelity since the fixed cell budget just divided across a bigger canvas.
const POLY_TEXT_RASTER_TARGET_CELLS = 2000;

function textToLocalContours(element) {
  const renderScale = 4;
  const canvasW = Math.max(1, Math.round(element.width * renderScale));
  const canvasH = Math.max(1, Math.round(element.height * renderScale));

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");

  const fontWeight = parseInt(element.fontWeight, 10) >= 600 ? "bold" : "normal";
  const fontStyle = element.fontStyle === "italic" ? "italic" : "normal";
  const fontSize = normalizeFontSize(element.fontSize) * renderScale;
  ctx.font = [fontStyle, fontWeight, fontSize + "px", element.fontFamily || "system-ui, sans-serif"].join(" ");
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "middle";
  const textAlign = element.textAlign || "left";
  ctx.textAlign = textAlign === "center" ? "center" : textAlign === "right" ? "right" : "left";

  const lines = wrapCanvasTextLines(ctx, element.text || "", canvasW);
  const lineHeight = fontSize * 1.2;
  const blockHeight = lines.length * lineHeight;
  const verticalAlign = element.verticalAlign || "middle";
  const blockTop =
    verticalAlign === "top" ? lineHeight / 2 : verticalAlign === "bottom" ? canvasH - blockHeight + lineHeight / 2 : (canvasH - blockHeight) / 2 + lineHeight / 2;
  const textX = textAlign === "center" ? canvasW / 2 : textAlign === "right" ? canvasW : 0;

  lines.forEach((line, i) => {
    ctx.fillText(line, textX, blockTop + i * lineHeight);
  });

  const imgData = ctx.getImageData(0, 0, canvasW, canvasH).data;

  const cellSize = Math.max(element.width, element.height) / POLY_TEXT_RASTER_TARGET_CELLS;
  const cols = Math.max(1, Math.ceil(element.width / cellSize));
  const rows = Math.max(1, Math.ceil(element.height / cellSize));

  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = new Array(cols);
    const py = Math.min(canvasH - 1, Math.round((((r + 0.5) * cellSize) / element.height) * canvasH));
    for (let c = 0; c < cols; c++) {
      const px = Math.min(canvasW - 1, Math.round((((c + 0.5) * cellSize) / element.width) * canvasW));
      row[c] = imgData[(py * canvasW + px) * 4 + 3] > 128;
    }
    grid.push(row);
  }

  // Finer simplification tolerance and smaller minimum-feature floors than shapes get
  // (0.75/2x defaults) -- text's small details (a dot on an "i", thin serifs) would
  // otherwise get smoothed away or filtered out as "slivers".
  const traced = traceRasterContours(grid, rows, cols, 0, 0, cellSize, 0.3);
  const minArea = Math.max(0.05, cellSize * cellSize * 2);
  const minDimension = cellSize * 1.5;
  const filtered = traced.filter((c) => {
    if (Math.abs(polygonSignedArea(c.points)) < minArea) return false;
    const cbox = polyBoundingBoxOfPoints(c.points);
    return cbox.maxX - cbox.minX >= minDimension && cbox.maxY - cbox.minY >= minDimension;
  });

  return filtered.map((c) => ({
    points: c.points.map((p) => ({ x: p.x / element.width, y: p.y / element.height })),
  }));
}

function getElementColor(el) {
  return el.type === "text" ? el.color : el.fillColor;
}

function elementToAbsoluteContours(el) {
  if (el.type === "text") {
    return shapeToAbsoluteContours(Object.assign({}, el, { compoundContours: textToLocalContours(el) }));
  }
  return shapeToAbsoluteContours(el);
}

function absolutePointToLocalNormalized(pt, referenceEl) {
  const cx = referenceEl.x + referenceEl.width / 2;
  const cy = referenceEl.y + referenceEl.height / 2;
  const unrotated = rotatePointAround(pt.x, pt.y, cx, cy, -(referenceEl.rotation || 0));
  return {
    x: (unrotated.x - referenceEl.x) / referenceEl.width,
    y: (unrotated.y - referenceEl.y) / referenceEl.height,
  };
}

function contoursRelativeToElement(absContours, referenceEl) {
  return absContours.map((c) => ({
    points: c.points.map((p) => absolutePointToLocalNormalized(p, referenceEl)),
  }));
}

function shapeToAbsoluteContours(element) {
  const localContours = element.compoundContours
    ? element.compoundContours
    : [{ points: element.morphOutlinePoints || SHAPE_MORPH_POINTS[element.shapeType] || SHAPE_MORPH_POINTS.rectangle }];

  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const rotation = element.rotation || 0;

  return localContours.map((contour) => ({
    points: contour.points.map((p) => {
      const lx = element.x + p.x * element.width;
      const ly = element.y + p.y * element.height;
      return rotatePointAround(lx, ly, cx, cy, rotation);
    }),
  }));
}

function absoluteContoursToElement(contours, fillColor) {
  const allPoints = [];
  contours.forEach((c) => allPoints.push(...c.points));
  const box = polyBoundingBoxOfPoints(allPoints);
  const width = box.maxX - box.minX || 1;
  const height = box.maxY - box.minY || 1;

  const compoundContours = contours.map((c) => ({
    points: c.points.map((p) => ({
      x: (p.x - box.minX) / width,
      y: (p.y - box.minY) / height,
    })),
  }));

  return {
    id: generateElementId(),
    type: "shape",
    shapeType: "compound",
    x: box.minX,
    y: box.minY,
    width,
    height,
    rotation: 0,
    fillColor,
    compoundContours,
  };
}

function fragmentShapes(shapeElements) {
  let regions = [{ contours: elementToAbsoluteContours(shapeElements[0]), sources: [0] }];

  for (let i = 1; i < shapeElements.length; i++) {
    const siContours = elementToAbsoluteContours(shapeElements[i]);
    let covered = null;
    const next = [];

    regions.forEach((region) => {
      const inter = booleanOpSimple(region.contours, siContours, "intersect");
      if (inter.length > 0) {
        next.push({ contours: inter, sources: region.sources.concat([i]) });
        const rem = booleanOpSimple(region.contours, siContours, "subtract");
        if (rem.length > 0) next.push({ contours: rem, sources: region.sources });
        covered = covered ? booleanOpSimple(covered, inter, "union") : inter;
      } else {
        next.push(region);
      }
    });

    const siRemainder = covered ? booleanOpSimple(siContours, covered, "subtract") : siContours;
    if (siRemainder.length > 0) next.push({ contours: siRemainder, sources: [i] });

    regions = next;
  }

  const results = [];
  regions.forEach((region) => {
    const grouped = groupContoursIntoShapes(region.contours);
    const topmostSourceIndex = Math.max(...region.sources);
    const fillColor = getElementColor(shapeElements[topmostSourceIndex]);
    grouped.forEach((contours) => {
      results.push(absoluteContoursToElement(contours, fillColor));
    });
  });

  return results;
}

function mergeImageMask(op) {
  const slide = slides[currentSlideIndex];
  const indices = [...selectedElementIndices].sort((a, b) => a - b);
  const imageIndex = indices.find((i) => slide.elements[i].type === "image");
  const otherIndex = indices.find((i) => i !== imageIndex);
  const imageEl = slide.elements[imageIndex];
  const otherEl = slide.elements[otherIndex];
  const insertIndex = indices[0];

  function replaceWithSingle(newElement) {
    [...indices].sort((a, b) => b - a).forEach((i) => slide.elements.splice(i, 1));
    slide.elements.splice(insertIndex, 0, newElement);
    selectOnly(insertIndex);
    renderAll();
  }

  function replaceWithMany(resultElements) {
    if (resultElements.length === 0) {
      alert("This merge produced no result — the selected shapes don't overlap the way this operation needs.");
      return;
    }
    [...indices].sort((a, b) => b - a).forEach((i) => slide.elements.splice(i, 1));
    slide.elements.splice(insertIndex, 0, ...resultElements);
    selectedElementIndices = resultElements.map((_, i) => insertIndex + i);
    mainSelectedIndex = selectedElementIndices[selectedElementIndices.length - 1];
    renderAll();
  }

  if (op === "intersect") {
    const newImage = cloneElementData(imageEl);
    newImage.clipMaskContours = contoursRelativeToElement(elementToAbsoluteContours(otherEl), imageEl);
    replaceWithSingle(newImage);
    return;
  }

  const imageIsBase = mainSelectedIndex === imageIndex || !indices.includes(mainSelectedIndex);
  if (imageIsBase) {
    const otherLocal = contoursRelativeToElement(elementToAbsoluteContours(otherEl), imageEl);
    const fullBox = {
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    };
    const newImage = cloneElementData(imageEl);
    newImage.clipMaskContours = [fullBox].concat(otherLocal);
    replaceWithSingle(newImage);
  } else {
    const imageAsRect = {
      type: "shape",
      shapeType: "rectangle",
      x: imageEl.x,
      y: imageEl.y,
      width: imageEl.width,
      height: imageEl.height,
      rotation: imageEl.rotation || 0,
    };
    const baseContours = booleanOpSimple(elementToAbsoluteContours(otherEl), shapeToAbsoluteContours(imageAsRect), "subtract");
    const grouped = groupContoursIntoShapes(baseContours);
    replaceWithMany(grouped.map((contours) => absoluteContoursToElement(contours, getElementColor(otherEl))));
  }
}

function mergeSelectedShapes(op) {
  if (selectedElementIndices.length < 2) return;

  const slide = slides[currentSlideIndex];
  const sortedIndices = [...selectedElementIndices].sort((a, b) => a - b);
  const shapeElements = sortedIndices.map((i) => slide.elements[i]);

  const imageCount = shapeElements.filter((el) => el.type === "image").length;
  if (imageCount === 1 && shapeElements.length === 2 && (op === "intersect" || op === "subtract")) {
    const otherEl = shapeElements.find((el) => el.type !== "image");
    if (otherEl && (otherEl.type === "shape" || otherEl.type === "text")) {
      mergeImageMask(op);
      return;
    }
  }

  if (!shapeElements.every((el) => el.type === "shape" || el.type === "text")) return;

  const baseElement =
    mainSelectedIndex !== null && selectedElementIndices.includes(mainSelectedIndex)
      ? slide.elements[mainSelectedIndex]
      : shapeElements[0];

  let resultElements = [];

  if (op === "fragment") {
    if (shapeElements.length > POLY_FRAGMENT_MAX_SHAPES) {
      alert("Fragment supports up to " + POLY_FRAGMENT_MAX_SHAPES + " selected shapes at a time.");
      return;
    }
    resultElements = fragmentShapes(shapeElements);
  } else if (op === "combine") {
    shapeElements.forEach((el, i) => {
      let exclusive = elementToAbsoluteContours(el);
      shapeElements.forEach((otherEl, j) => {
        if (i === j) return;
        exclusive = booleanOpSimple(exclusive, elementToAbsoluteContours(otherEl), "subtract");
      });
      const grouped = groupContoursIntoShapes(exclusive);
      grouped.forEach((contours) => {
        resultElements.push(absoluteContoursToElement(contours, getElementColor(el)));
      });
    });
  } else if (op === "subtract") {
    const others = shapeElements.filter((el) => el !== baseElement);
    let baseContours = elementToAbsoluteContours(baseElement);
    others.forEach((el) => {
      baseContours = booleanOpSimple(baseContours, elementToAbsoluteContours(el), "subtract");
    });
    const grouped = groupContoursIntoShapes(baseContours);
    resultElements = grouped.map((contours) => absoluteContoursToElement(contours, getElementColor(baseElement)));
  } else {
    let acc = elementToAbsoluteContours(shapeElements[0]);
    for (let i = 1; i < shapeElements.length; i++) {
      acc = booleanOpSimple(acc, elementToAbsoluteContours(shapeElements[i]), op);
    }
    const grouped = groupContoursIntoShapes(acc);
    resultElements = grouped.map((contours) => absoluteContoursToElement(contours, getElementColor(baseElement)));
  }

  if (resultElements.length === 0) {
    alert("This merge produced no result — the selected shapes don't overlap the way this operation needs.");
    return;
  }

  [...sortedIndices].sort((a, b) => b - a).forEach((i) => slide.elements.splice(i, 1));
  const insertIndex = Math.min(...sortedIndices);
  slide.elements.splice(insertIndex, 0, ...resultElements);
  selectedElementIndices = resultElements.map((_, i) => insertIndex + i);
  mainSelectedIndex = selectedElementIndices[selectedElementIndices.length - 1];
  renderAll();
}
