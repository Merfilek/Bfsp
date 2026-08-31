const animationModalEl = document.getElementById("animationModal");
const animationModalHeaderEl = document.getElementById("animationModalHeader");
const animationModalCloseBtn = document.getElementById("animationModalCloseBtn");
const animationTypeSelect = document.getElementById("animationTypeSelect");
const animationTriggerSelect = document.getElementById("animationTriggerSelect");
const animationDurationSlider = document.getElementById("animationDurationSlider");
const animationDurationNumberInput = document.getElementById("animationDurationNumberInput");
const animationDelaySlider = document.getElementById("animationDelaySlider");
const animationDelayNumberInput = document.getElementById("animationDelayNumberInput");
const animationDelayFieldEl = document.getElementById("animationDelayField");

const exitAnimationTypeSelect = document.getElementById("exitAnimationTypeSelect");
const exitAnimationTriggerSelect = document.getElementById("exitAnimationTriggerSelect");
const exitAnimationDurationSlider = document.getElementById("exitAnimationDurationSlider");
const exitAnimationDurationNumberInput = document.getElementById("exitAnimationDurationNumberInput");
const exitAnimationDelaySlider = document.getElementById("exitAnimationDelaySlider");
const exitAnimationDelayNumberInput = document.getElementById("exitAnimationDelayNumberInput");
const exitAnimationDelayFieldEl = document.getElementById("exitAnimationDelayField");

const ANIMATION_DEFAULTS = { type: "none", trigger: "onClick", duration: 600, delay: 0 };
const EXIT_ANIMATION_DEFAULTS = { type: "none", trigger: "onClick", duration: 600, delay: 0 };

let animationTargetIndex = null;
let isDraggingAnimationModal = false;
let animationModalDragOffsetX = 0;
let animationModalDragOffsetY = 0;

function getAnimationTargetElement() {
  if (animationTargetIndex === null) return null;
  return slides[currentSlideIndex].elements[animationTargetIndex] || null;
}

function ensureAnimation(element) {
  if (!element.animation) element.animation = Object.assign({}, ANIMATION_DEFAULTS);
  return element.animation;
}

function ensureExitAnimation(element) {
  if (!element.exitAnimation) element.exitAnimation = Object.assign({}, EXIT_ANIMATION_DEFAULTS);
  return element.exitAnimation;
}

function updateAnimationDelayFieldVisibility() {
  animationDelayFieldEl.classList.toggle("hidden", animationTriggerSelect.value !== "auto");
}

function updateExitAnimationDelayFieldVisibility() {
  exitAnimationDelayFieldEl.classList.toggle("hidden", exitAnimationTriggerSelect.value !== "auto");
}

function openElementAnimationOptions(index) {
  if (index === null || index === undefined) return;
  const element = slides[currentSlideIndex].elements[index];
  if (!element) return;

  animationTargetIndex = index;
  const anim = ensureAnimation(element);
  animationTypeSelect.value = anim.type;
  animationTriggerSelect.value = anim.trigger;
  animationDurationSlider.value = anim.duration;
  animationDurationNumberInput.value = anim.duration;
  animationDelaySlider.value = anim.delay;
  animationDelayNumberInput.value = anim.delay;
  updateAnimationDelayFieldVisibility();

  const exitAnim = ensureExitAnimation(element);
  exitAnimationTypeSelect.value = exitAnim.type;
  exitAnimationTriggerSelect.value = exitAnim.trigger;
  exitAnimationDurationSlider.value = exitAnim.duration;
  exitAnimationDurationNumberInput.value = exitAnim.duration;
  exitAnimationDelaySlider.value = exitAnim.delay;
  exitAnimationDelayNumberInput.value = exitAnim.delay;
  updateExitAnimationDelayFieldVisibility();

  animationModalEl.classList.remove("hidden");
}

function closeElementAnimationOptions() {
  animationModalEl.classList.add("hidden");
  animationTargetIndex = null;
}

function updateAnimation(changes) {
  const element = getAnimationTargetElement();
  if (!element) return;
  Object.assign(ensureAnimation(element), changes);
}

function updateExitAnimation(changes) {
  const element = getAnimationTargetElement();
  if (!element) return;
  Object.assign(ensureExitAnimation(element), changes);
}

animationTypeSelect.addEventListener("change", () => {
  updateAnimation({ type: animationTypeSelect.value });
});

animationTriggerSelect.addEventListener("change", () => {
  updateAnimation({ trigger: animationTriggerSelect.value });
  updateAnimationDelayFieldVisibility();
});

animationDurationSlider.addEventListener("input", () => {
  animationDurationNumberInput.value = animationDurationSlider.value;
  updateAnimation({ duration: parseInt(animationDurationSlider.value, 10) });
});
animationDurationNumberInput.addEventListener("input", () => {
  animationDurationSlider.value = animationDurationNumberInput.value;
  updateAnimation({ duration: parseInt(animationDurationNumberInput.value, 10) || ANIMATION_DEFAULTS.duration });
});

animationDelaySlider.addEventListener("input", () => {
  animationDelayNumberInput.value = animationDelaySlider.value;
  updateAnimation({ delay: parseInt(animationDelaySlider.value, 10) });
});
animationDelayNumberInput.addEventListener("input", () => {
  animationDelaySlider.value = animationDelayNumberInput.value;
  updateAnimation({ delay: parseInt(animationDelayNumberInput.value, 10) || 0 });
});

exitAnimationTypeSelect.addEventListener("change", () => {
  updateExitAnimation({ type: exitAnimationTypeSelect.value });
});

exitAnimationTriggerSelect.addEventListener("change", () => {
  updateExitAnimation({ trigger: exitAnimationTriggerSelect.value });
  updateExitAnimationDelayFieldVisibility();
});

exitAnimationDurationSlider.addEventListener("input", () => {
  exitAnimationDurationNumberInput.value = exitAnimationDurationSlider.value;
  updateExitAnimation({ duration: parseInt(exitAnimationDurationSlider.value, 10) });
});
exitAnimationDurationNumberInput.addEventListener("input", () => {
  exitAnimationDurationSlider.value = exitAnimationDurationNumberInput.value;
  updateExitAnimation({ duration: parseInt(exitAnimationDurationNumberInput.value, 10) || EXIT_ANIMATION_DEFAULTS.duration });
});

exitAnimationDelaySlider.addEventListener("input", () => {
  exitAnimationDelayNumberInput.value = exitAnimationDelaySlider.value;
  updateExitAnimation({ delay: parseInt(exitAnimationDelaySlider.value, 10) });
});
exitAnimationDelayNumberInput.addEventListener("input", () => {
  exitAnimationDelaySlider.value = exitAnimationDelayNumberInput.value;
  updateExitAnimation({ delay: parseInt(exitAnimationDelayNumberInput.value, 10) || 0 });
});

animationModalCloseBtn.addEventListener("click", () => {
  closeElementAnimationOptions();
});

animationModalHeaderEl.addEventListener("mousedown", (e) => {
  if (e.target === animationModalCloseBtn) return;
  isDraggingAnimationModal = true;
  const rect = animationModalEl.getBoundingClientRect();
  animationModalDragOffsetX = e.clientX - rect.left;
  animationModalDragOffsetY = e.clientY - rect.top;
  animationModalEl.style.transform = "none";
  animationModalEl.style.left = rect.left + "px";
  animationModalEl.style.top = rect.top + "px";
});

document.addEventListener("mousemove", (e) => {
  if (!isDraggingAnimationModal) return;
  animationModalEl.style.left = e.clientX - animationModalDragOffsetX + "px";
  animationModalEl.style.top = e.clientY - animationModalDragOffsetY + "px";
});

document.addEventListener("mouseup", () => {
  isDraggingAnimationModal = false;
});
