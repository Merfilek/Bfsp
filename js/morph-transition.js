const MORPH_EASING_FUNCTIONS = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  bounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  spring: (t) => 1 - Math.cos(t * Math.PI * 4.5) * Math.exp(-t * 6),
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngle(a, b, t) {
  const diff = (((b - a + 180) % 360) + 360) % 360 - 180;
  return a + diff * t;
}

function matchElementsForMorph(fromSlide, toSlide) {
  const matched = [];
  const removed = [];
  const toById = {};
  toSlide.elements.forEach((el) => {
    if (el.id) toById[el.id] = el;
  });

  const matchedToIds = {};
  fromSlide.elements.forEach((fromEl) => {
    const toEl = fromEl.id ? toById[fromEl.id] : null;
    if (toEl) {
      matched.push({ fromEl, toEl });
      matchedToIds[toEl.id] = true;
    } else {
      removed.push(fromEl);
    }
  });

  const added = toSlide.elements.filter((toEl) => !matchedToIds[toEl.id]);

  return { matched, removed, added };
}

function buildMorphFrameElements(matchSets, t) {
  const frameElements = [];

  matchSets.matched.forEach(({ fromEl, toEl }) => {
    const frameEl = Object.assign({}, toEl);
    frameEl.x = lerp(fromEl.x, toEl.x, t);
    frameEl.y = lerp(fromEl.y, toEl.y, t);
    frameEl.width = lerp(fromEl.width, toEl.width, t);
    frameEl.height = lerp(fromEl.height, toEl.height, t);
    frameEl.rotation = lerpAngle(fromEl.rotation || 0, toEl.rotation || 0, t);
    frameEl.opacity = 1;

    if (fromEl.type === "shape" && toEl.type === "shape" && fromEl.fillColor && toEl.fillColor) {
      frameEl.fillColor = blendHexColors(fromEl.fillColor, toEl.fillColor, t);
    }
    if (fromEl.type === "text" && toEl.type === "text" && fromEl.color && toEl.color) {
      frameEl.color = blendHexColors(fromEl.color, toEl.color, t);
    }

    if (fromEl.type === "shape" && toEl.type === "shape") {
      if (fromEl.shapeType === toEl.shapeType) {
        if (fromEl.shapeType === "rectangle") {
          frameEl.borderRadius = lerp(fromEl.borderRadius || 0, toEl.borderRadius || 0, t);
        }
      } else if (fromEl.shapeType === "compound" || toEl.shapeType === "compound") {
        // Compound (merged) shapes have per-instance arbitrary outlines, not a shared
        // lookup-table entry -- skip outline interpolation, position/size/color still tween.
      } else {
        const fromPoints = SHAPE_MORPH_POINTS[fromEl.shapeType] || SHAPE_MORPH_POINTS.rectangle;
        const toPoints = SHAPE_MORPH_POINTS[toEl.shapeType] || SHAPE_MORPH_POINTS.rectangle;
        frameEl.morphOutlinePoints = fromPoints.map((p, i) => ({
          x: lerp(p.x, toPoints[i].x, t),
          y: lerp(p.y, toPoints[i].y, t),
        }));
      }
    }

    frameElements.push(frameEl);
  });

  matchSets.removed.forEach((fromEl) => {
    const frameEl = Object.assign({}, fromEl);
    frameEl.opacity = 1 - t;
    frameElements.push(frameEl);
  });

  matchSets.added.forEach((toEl) => {
    const frameEl = Object.assign({}, toEl);
    frameEl.opacity = t;
    frameElements.push(frameEl);
  });

  return frameElements;
}

function renderMorphFrame(t, fromSlide, toSlide, matchSets) {
  presentSlideEl.innerHTML = "";
  presentSlideEl.style.backgroundColor = blendHexColors(
    fromSlide.backgroundColor || "#ffffff",
    toSlide.backgroundColor || "#ffffff",
    t
  );

  buildMorphFrameElements(matchSets, t).forEach((frameEl) => {
    presentSlideEl.appendChild(renderPresentElement(frameEl));
  });
}

function runMorphTransition(fromSlide, toSlide, durationMs, easingName, onComplete) {
  const easingFn = MORPH_EASING_FUNCTIONS[easingName] || MORPH_EASING_FUNCTIONS.linear;
  const matchSets = matchElementsForMorph(fromSlide, toSlide);
  let startTime = null;

  function frame(now) {
    if (startTime === null) startTime = now;
    const rawT = Math.min(1, (now - startTime) / durationMs);
    const t = easingFn(rawT);

    renderMorphFrame(t, fromSlide, toSlide, matchSets);

    if (rawT < 1) {
      morphAnimationFrameId = requestAnimationFrame(frame);
    } else {
      onComplete();
      renderPresentSlide();
    }
  }

  morphAnimationFrameId = requestAnimationFrame(frame);
}
