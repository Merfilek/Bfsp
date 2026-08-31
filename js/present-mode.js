const presentCubeStageEl = document.getElementById("presentCubeStage");
const presentLayerCurrentEl = document.getElementById("presentLayerCurrent");
const presentLayerIncomingEl = document.getElementById("presentLayerIncoming");
const presentSlideIncomingEl = document.getElementById("presentSlideIncoming");

const TRANSITION_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

let isPresentTransitioning = false;
let presentTransitionTimeoutId = null;
let morphAnimationFrameId = null;

// Per-element entrance/exit animations (Present mode only -- the editing canvas
// always shows elements fully visible). Elements with trigger "onClick" wait in one of
// these two queues -- entrance steps always drain before exit steps -- consumed one at
// a time by nextPresentSlide(); elements with trigger "auto" play on a plain setTimeout
// keyed off their own delay as soon as the slide appears, independent of the queues.
const ANIMATION_FLY_DISTANCE = 80;
let presentEntranceQueue = [];
let presentExitQueue = [];
let presentAutoAnimationTimeouts = [];

function elementHasAnimation(element) {
  return !!(element.animation && element.animation.type && element.animation.type !== "none");
}

function elementHasExitAnimation(element) {
  return !!(element.exitAnimation && element.exitAnimation.type && element.exitAnimation.type !== "none");
}

// Shared by both entrance ("pre" state) and exit (its one and only hidden state) --
// entrance and exit types map to the same directional offset (flyInLeft/flyOutLeft both
// mean "off to screen-left"), just approached from opposite ends of the transition.
// Fly types translate BEFORE the rotate so "left"/"right"/etc. always mean screen
// directions regardless of the element's own rotation; zoom scales AFTER the rotate so
// it zooms in place around the same center the rotation already pivots on.
function buildDirectionalTransform(rotation, type) {
  const rotateStr = "rotate(" + (rotation || 0) + "deg)";
  if (type === "zoomIn" || type === "zoomOut") return rotateStr + " scale(0.5)";
  if (type === "flyInLeft" || type === "flyOutLeft") return "translateX(-" + ANIMATION_FLY_DISTANCE + "px) " + rotateStr;
  if (type === "flyInRight" || type === "flyOutRight") return "translateX(" + ANIMATION_FLY_DISTANCE + "px) " + rotateStr;
  if (type === "flyInTop" || type === "flyOutTop") return "translateY(-" + ANIMATION_FLY_DISTANCE + "px) " + rotateStr;
  if (type === "flyInBottom" || type === "flyOutBottom") return "translateY(" + ANIMATION_FLY_DISTANCE + "px) " + rotateStr;
  return rotateStr;
}

// "pre" is the hidden starting state; "final" is the same plain-rotate transform
// renderPresentElement already applies.
function buildAnimationTransform(element, phase) {
  if (phase === "final") return "rotate(" + (element.rotation || 0) + "deg)";
  return buildDirectionalTransform(element.rotation, element.animation.type);
}

function buildExitAnimationTransform(element) {
  return buildDirectionalTransform(element.rotation, element.exitAnimation.type);
}

function applyAnimationPreState(el, element) {
  if (!elementHasAnimation(element)) return;
  el.style.transition = "none";
  el.style.opacity = "0";
  el.style.transform = buildAnimationTransform(element, "pre");
}

function playAnimationEntrance(el, element) {
  const duration = element.animation.duration || ANIMATION_DEFAULTS.duration;
  void el.offsetWidth;
  el.style.transition = "opacity " + duration + "ms ease-out, transform " + duration + "ms ease-out";
  el.style.opacity = element.opacity != null ? element.opacity : 1;
  el.style.transform = buildAnimationTransform(element, "final");
}

// Plays the element from its normal visible state to hidden; the element is left
// hidden afterwards (not removed) since the whole slide gets torn down on navigation.
function playAnimationExit(el, element) {
  const duration = element.exitAnimation.duration || EXIT_ANIMATION_DEFAULTS.duration;
  void el.offsetWidth;
  el.style.transition = "opacity " + duration + "ms ease-out, transform " + duration + "ms ease-out";
  el.style.opacity = "0";
  el.style.transform = buildExitAnimationTransform(element);
}

// Called once the real (non-preview) elements for the current slide are in the DOM --
// hides every entrance-animated element and either schedules its auto-play timeout or
// queues it for a click, in slide.elements order; separately schedules/queues every
// exit-animated element the same way.
function initSlideAnimations(slide) {
  presentEntranceQueue = [];
  presentExitQueue = [];
  presentAutoAnimationTimeouts.forEach((id) => clearTimeout(id));
  presentAutoAnimationTimeouts = [];

  const childEls = presentSlideEl.children;
  slide.elements.forEach((element, i) => {
    const el = childEls[i];
    if (!el) return;

    if (elementHasAnimation(element)) {
      applyAnimationPreState(el, element);
      void el.offsetWidth;
      if (element.animation.trigger === "auto") {
        const delay = element.animation.delay || 0;
        presentAutoAnimationTimeouts.push(setTimeout(() => playAnimationEntrance(el, element), delay));
      } else {
        presentEntranceQueue.push({ el, element });
      }
    }

    if (elementHasExitAnimation(element)) {
      if (element.exitAnimation.trigger === "auto") {
        const delay = element.exitAnimation.delay || 0;
        presentAutoAnimationTimeouts.push(setTimeout(() => playAnimationExit(el, element), delay));
      } else {
        presentExitQueue.push({ el, element });
      }
    }
  });
}

// Consumes one queued on-click step (all entrance steps before any exit steps);
// returns false once both queues are empty so the caller knows to fall through to
// advancing to the next slide instead.
function playNextOnClickAnimation() {
  if (presentEntranceQueue.length > 0) {
    const step = presentEntranceQueue.shift();
    playAnimationEntrance(step.el, step.element);
    return true;
  }
  if (presentExitQueue.length > 0) {
    const step = presentExitQueue.shift();
    playAnimationExit(step.el, step.element);
    return true;
  }
  return false;
}

function updatePresentScale() {
  const scale = presentViewportEl.clientWidth / 960;
  presentSlideEl.style.transform = "scale(" + scale + ")";
  presentSlideIncomingEl.style.transform = "scale(" + scale + ")";
}

function offscreenTransform(direction) {
  if (direction === "left") return "translateX(-100%)";
  if (direction === "right") return "translateX(100%)";
  if (direction === "top") return "translateY(-100%)";
  return "translateY(100%)";
}

function oppositeOffscreenTransform(direction) {
  if (direction === "left") return "translateX(100%)";
  if (direction === "right") return "translateX(-100%)";
  if (direction === "top") return "translateY(100%)";
  return "translateY(-100%)";
}

function renderPresentLayer(containerEl, slide) {
  containerEl.innerHTML = "";
  containerEl.style.backgroundColor = slide.backgroundColor || "#ffffff";
  slide.elements.forEach((element) => {
    const el = renderPresentElement(element);
    containerEl.appendChild(el);
    // This layer is only ever the sliding preview during a push/cube transition, not
    // the real interactive slide -- pre-hide animated elements here too so they don't
    // flash fully visible while sliding in, then vanish once initSlideAnimations()
    // takes over for real once the transition lands.
    applyAnimationPreState(el, element);
  });
}

function resetPresentTransforms() {
  presentCubeStageEl.style.transition = "none";
  presentCubeStageEl.style.transform = "none";
  presentLayerCurrentEl.style.transition = "none";
  presentLayerCurrentEl.style.transform = "none";
  presentLayerIncomingEl.style.transition = "none";
  presentLayerIncomingEl.style.transform = "none";
}

function runFlatTransition(type, direction, animation) {
  presentLayerIncomingEl.style.transform =
    type === "push" ? oppositeOffscreenTransform(direction) : offscreenTransform(direction);

  void presentLayerIncomingEl.offsetWidth;

  presentLayerIncomingEl.style.transition = animation;
  presentLayerIncomingEl.style.transform = "translate(0, 0)";

  if (type === "push") {
    presentLayerCurrentEl.style.transition = animation;
    presentLayerCurrentEl.style.transform = offscreenTransform(direction);
  }
}

function runCubeTransition(direction, animation) {
  const isHorizontal = direction === "left" || direction === "right";
  const sign = direction === "left" || direction === "top" ? -1 : 1;
  const halfWidth = presentViewportEl.clientWidth / 2;
  const halfHeight = presentViewportEl.clientHeight / 2;
  const depth = isHorizontal ? halfWidth : halfHeight;

  presentViewportEl.style.perspective = depth * 4 + "px";

  if (isHorizontal) {
    presentLayerCurrentEl.style.transform = "rotateY(0deg) translateZ(" + halfWidth + "px)";
    presentLayerIncomingEl.style.transform = "rotateY(" + -sign * 90 + "deg) translateZ(" + halfWidth + "px)";
  } else {
    presentLayerCurrentEl.style.transform = "rotateX(0deg) translateZ(" + halfHeight + "px)";
    presentLayerIncomingEl.style.transform = "rotateX(" + -sign * 90 + "deg) translateZ(" + halfHeight + "px)";
  }

  void presentCubeStageEl.offsetWidth;

  presentCubeStageEl.style.transition = animation;
  presentCubeStageEl.style.transform = isHorizontal ? "rotateY(" + sign * 90 + "deg)" : "rotateX(" + sign * 90 + "deg)";
}

function goToPresentSlide(newIndex) {
  if (isPresentTransitioning) return;
  if (newIndex < 0 || newIndex >= slides.length) return;

  const targetSlide = slides[newIndex];
  const transition = targetSlide.transition || { type: "none" };

  if (!transition.type || transition.type === "none") {
    presentIndex = newIndex;
    renderPresentSlide();
    return;
  }

  if (transition.type === "morph") {
    isPresentTransitioning = true;
    const fromSlide = slides[presentIndex];
    runMorphTransition(
      fromSlide,
      targetSlide,
      transition.duration || DEFAULT_TRANSITION_DURATION_MS,
      transition.easing || "linear",
      () => {
        presentIndex = newIndex;
        isPresentTransitioning = false;
      }
    );
    return;
  }

  isPresentTransitioning = true;
  const direction = transition.direction || "left";
  const durationMs = transition.duration || DEFAULT_TRANSITION_DURATION_MS;
  const animation = "transform " + durationMs + "ms " + TRANSITION_EASING;

  renderPresentLayer(presentSlideIncomingEl, targetSlide);
  updatePresentScale();

  resetPresentTransforms();
  presentLayerIncomingEl.style.display = "block";

  if (transition.type === "cube") {
    runCubeTransition(direction, animation);
  } else {
    runFlatTransition(transition.type, direction, animation);
  }

  presentTransitionTimeoutId = setTimeout(() => {
    presentIndex = newIndex;
    renderPresentSlide();

    resetPresentTransforms();
    presentLayerIncomingEl.style.display = "none";
    presentSlideIncomingEl.innerHTML = "";

    isPresentTransitioning = false;
  }, durationMs);
}

function nextPresentSlide() {
  if (isPresentTransitioning) return;
  if (playNextOnClickAnimation()) return;
  goToPresentSlide(presentIndex + 1);
}

function prevPresentSlide() {
  goToPresentSlide(presentIndex - 1);
}

function exitPresent() {
  presentOverlay.classList.remove("active");
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  clearTimeout(presentTransitionTimeoutId);
  cancelAnimationFrame(morphAnimationFrameId);
  presentAutoAnimationTimeouts.forEach((id) => clearTimeout(id));
  presentAutoAnimationTimeouts = [];
  presentEntranceQueue = [];
  presentExitQueue = [];
  isPresentTransitioning = false;
  presentLayerIncomingEl.style.display = "none";
}

presentBtn.addEventListener("click", () => {
  commitEditingText();
  renderSlideCanvas();
  presentIndex = currentSlideIndex;
  presentOverlay.classList.add("active");
  renderPresentSlide();
  updatePresentScale();
  if (presentOverlay.requestFullscreen) {
    presentOverlay.requestFullscreen().catch(() => {});
  }
});

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) {
    exitPresent();
  }
});

presentViewportEl.addEventListener("mousedown", (e) => {
  if (e.button === 0) {
    nextPresentSlide();
  } else if (e.button === 2) {
    prevPresentSlide();
  }
});

presentViewportEl.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

window.addEventListener("resize", () => {
  if (presentOverlay.classList.contains("active")) {
    updatePresentScale();
  }
});
