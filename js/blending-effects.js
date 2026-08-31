const blendingModalEl = document.getElementById("blendingModal");
const blendingModalHeaderEl = document.getElementById("blendingModalHeader");
const blendingModalCloseBtn = document.getElementById("blendingModalCloseBtn");

const blendingEffectRows = document.querySelectorAll(".blending-effect-row");
const blendingEffectPanels = document.querySelectorAll(".blending-effect-panel");

const threeDEnabledCheckbox = document.getElementById("threeDEnabledCheckbox");
const threeDColorInput = document.getElementById("threeDColorInput");
const threeDDepthSlider = document.getElementById("threeDDepthSlider");
const threeDDepthNumberInput = document.getElementById("threeDDepthNumberInput");
const threeDAngleSlider = document.getElementById("threeDAngleSlider");
const threeDAngleNumberInput = document.getElementById("threeDAngleNumberInput");

const dropShadowEnabledCheckbox = document.getElementById("dropShadowEnabledCheckbox");
const dropShadowColorInput = document.getElementById("dropShadowColorInput");
const dropShadowOpacitySlider = document.getElementById("dropShadowOpacitySlider");
const dropShadowOffsetXSlider = document.getElementById("dropShadowOffsetXSlider");
const dropShadowOffsetYSlider = document.getElementById("dropShadowOffsetYSlider");
const dropShadowBlurSlider = document.getElementById("dropShadowBlurSlider");

const innerShadowEnabledCheckbox = document.getElementById("innerShadowEnabledCheckbox");
const innerShadowColorInput = document.getElementById("innerShadowColorInput");
const innerShadowOpacitySlider = document.getElementById("innerShadowOpacitySlider");
const innerShadowOffsetXSlider = document.getElementById("innerShadowOffsetXSlider");
const innerShadowOffsetYSlider = document.getElementById("innerShadowOffsetYSlider");
const innerShadowBlurSlider = document.getElementById("innerShadowBlurSlider");

const innerGlowEnabledCheckbox = document.getElementById("innerGlowEnabledCheckbox");
const innerGlowColorInput = document.getElementById("innerGlowColorInput");
const innerGlowOpacitySlider = document.getElementById("innerGlowOpacitySlider");
const innerGlowSizeSlider = document.getElementById("innerGlowSizeSlider");

const outerGlowEnabledCheckbox = document.getElementById("outerGlowEnabledCheckbox");
const outerGlowColorInput = document.getElementById("outerGlowColorInput");
const outerGlowOpacitySlider = document.getElementById("outerGlowOpacitySlider");
const outerGlowSizeSlider = document.getElementById("outerGlowSizeSlider");

const strokeEnabledCheckbox = document.getElementById("strokeEnabledCheckbox");
const strokeColorInput = document.getElementById("strokeColorInput");
const strokeWidthSlider = document.getElementById("strokeWidthSlider");
const strokeWidthNumberInput = document.getElementById("strokeWidthNumberInput");

const colorOverlayEnabledCheckbox = document.getElementById("colorOverlayEnabledCheckbox");
const colorOverlayColorInput = document.getElementById("colorOverlayColorInput");
const colorOverlayOpacitySlider = document.getElementById("colorOverlayOpacitySlider");

const gradientOverlayEnabledCheckbox = document.getElementById("gradientOverlayEnabledCheckbox");
const gradientOverlayColor1Input = document.getElementById("gradientOverlayColor1Input");
const gradientOverlayColor2Input = document.getElementById("gradientOverlayColor2Input");
const gradientOverlayMethodSelect = document.getElementById("gradientOverlayMethodSelect");
const gradientOverlayAngleSlider = document.getElementById("gradientOverlayAngleSlider");
const gradientOverlayAngleNumberInput = document.getElementById("gradientOverlayAngleNumberInput");
const gradientOverlayScaleSlider = document.getElementById("gradientOverlayScaleSlider");
const gradientOverlayScaleNumberInput = document.getElementById("gradientOverlayScaleNumberInput");
const gradientOverlayOffsetXSlider = document.getElementById("gradientOverlayOffsetXSlider");
const gradientOverlayOffsetXNumberInput = document.getElementById("gradientOverlayOffsetXNumberInput");
const gradientOverlayOffsetYSlider = document.getElementById("gradientOverlayOffsetYSlider");
const gradientOverlayOffsetYNumberInput = document.getElementById("gradientOverlayOffsetYNumberInput");
const gradientOverlayOpacitySlider = document.getElementById("gradientOverlayOpacitySlider");

const EFFECT_DEFAULTS = {
  threeD: { enabled: false, color: "#000000", depth: 20, angle: 45 },
  dropShadow: { enabled: false, offsetX: 4, offsetY: 4, blur: 8, color: "#000000", opacity: 0.5 },
  innerShadow: { enabled: false, offsetX: 4, offsetY: 4, blur: 8, color: "#000000", opacity: 0.5 },
  innerGlow: { enabled: false, color: "#ffdd55", opacity: 0.75, size: 12 },
  outerGlow: { enabled: false, color: "#ffdd55", opacity: 0.75, size: 12 },
  stroke: { enabled: false, color: "#000000", width: 3 },
  colorOverlay: { enabled: false, color: "#ff0000", opacity: 0.5 },
  gradientOverlay: {
    enabled: false,
    color1: "#ff0000",
    color2: "#0000ff",
    method: "classic",
    angle: 90,
    scale: 100,
    offsetX: 0,
    offsetY: 0,
    opacity: 0.75,
  },
};

let blendingTargetIndex = null;
let activeEffectKey = "dropShadow";
let isDraggingBlendingModal = false;
let blendingModalDragOffsetX = 0;
let blendingModalDragOffsetY = 0;

function getBlendingTargetElement() {
  if (blendingTargetIndex === null) return null;
  return slides[currentSlideIndex].elements[blendingTargetIndex] || null;
}

function ensureEffect(element, key) {
  if (!element.effects) element.effects = {};
  if (!element.effects[key]) {
    element.effects[key] = Object.assign({}, EFFECT_DEFAULTS[key]);
  }
  return element.effects[key];
}

function setActiveEffectTab(key) {
  activeEffectKey = key;
  blendingEffectRows.forEach((row) => {
    row.classList.toggle("active", row.dataset.effect === key);
  });
  blendingEffectPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.effectPanel !== key);
  });
}

blendingEffectRows.forEach((row) => {
  row.addEventListener("click", () => setActiveEffectTab(row.dataset.effect));
});

function openBlendingOptions(index) {
  if (index === null || index === undefined) return;
  const element = slides[currentSlideIndex].elements[index];
  if (!element) return;

  blendingTargetIndex = index;

  const threeD = ensureEffect(element, "threeD");
  threeDEnabledCheckbox.checked = threeD.enabled;
  threeDColorInput.value = threeD.color;
  threeDDepthSlider.value = threeD.depth;
  threeDDepthNumberInput.value = threeD.depth;
  threeDAngleSlider.value = threeD.angle;
  threeDAngleNumberInput.value = threeD.angle;

  const dropShadow = ensureEffect(element, "dropShadow");
  dropShadowEnabledCheckbox.checked = dropShadow.enabled;
  dropShadowColorInput.value = dropShadow.color;
  dropShadowOpacitySlider.value = Math.round(dropShadow.opacity * 100);
  dropShadowOffsetXSlider.value = dropShadow.offsetX;
  dropShadowOffsetYSlider.value = dropShadow.offsetY;
  dropShadowBlurSlider.value = dropShadow.blur;

  const innerShadow = ensureEffect(element, "innerShadow");
  innerShadowEnabledCheckbox.checked = innerShadow.enabled;
  innerShadowColorInput.value = innerShadow.color;
  innerShadowOpacitySlider.value = Math.round(innerShadow.opacity * 100);
  innerShadowOffsetXSlider.value = innerShadow.offsetX;
  innerShadowOffsetYSlider.value = innerShadow.offsetY;
  innerShadowBlurSlider.value = innerShadow.blur;

  const innerGlow = ensureEffect(element, "innerGlow");
  innerGlowEnabledCheckbox.checked = innerGlow.enabled;
  innerGlowColorInput.value = innerGlow.color;
  innerGlowOpacitySlider.value = Math.round(innerGlow.opacity * 100);
  innerGlowSizeSlider.value = innerGlow.size;

  const outerGlow = ensureEffect(element, "outerGlow");
  outerGlowEnabledCheckbox.checked = outerGlow.enabled;
  outerGlowColorInput.value = outerGlow.color;
  outerGlowOpacitySlider.value = Math.round(outerGlow.opacity * 100);
  outerGlowSizeSlider.value = outerGlow.size;

  const stroke = ensureEffect(element, "stroke");
  strokeEnabledCheckbox.checked = stroke.enabled;
  strokeColorInput.value = stroke.color;
  strokeWidthSlider.value = stroke.width;
  strokeWidthNumberInput.value = stroke.width;

  const colorOverlay = ensureEffect(element, "colorOverlay");
  colorOverlayEnabledCheckbox.checked = colorOverlay.enabled;
  colorOverlayColorInput.value = colorOverlay.color;
  colorOverlayOpacitySlider.value = Math.round(colorOverlay.opacity * 100);

  const gradientOverlay = ensureEffect(element, "gradientOverlay");
  gradientOverlayEnabledCheckbox.checked = gradientOverlay.enabled;
  gradientOverlayColor1Input.value = gradientOverlay.color1;
  gradientOverlayColor2Input.value = gradientOverlay.color2;
  gradientOverlayMethodSelect.value = gradientOverlay.method;
  gradientOverlayAngleSlider.value = gradientOverlay.angle;
  gradientOverlayAngleNumberInput.value = gradientOverlay.angle;
  gradientOverlayScaleSlider.value = gradientOverlay.scale;
  gradientOverlayScaleNumberInput.value = gradientOverlay.scale;
  gradientOverlayOffsetXSlider.value = gradientOverlay.offsetX;
  gradientOverlayOffsetXNumberInput.value = gradientOverlay.offsetX;
  gradientOverlayOffsetYSlider.value = gradientOverlay.offsetY;
  gradientOverlayOffsetYNumberInput.value = gradientOverlay.offsetY;
  gradientOverlayOpacitySlider.value = Math.round(gradientOverlay.opacity * 100);

  setActiveEffectTab(activeEffectKey);
  blendingModalEl.classList.remove("hidden");
}

function closeBlendingOptions() {
  blendingModalEl.classList.add("hidden");
  blendingTargetIndex = null;
}

function updateEffect(key, changes) {
  const element = getBlendingTargetElement();
  if (!element) return;
  const effect = ensureEffect(element, key);
  Object.assign(effect, changes);
  renderSlideCanvas();
}

threeDEnabledCheckbox.addEventListener("change", () => {
  updateEffect("threeD", { enabled: threeDEnabledCheckbox.checked });
});
threeDColorInput.addEventListener("input", () => {
  updateEffect("threeD", { color: threeDColorInput.value });
});
threeDDepthSlider.addEventListener("input", () => {
  threeDDepthNumberInput.value = threeDDepthSlider.value;
  updateEffect("threeD", { depth: parseInt(threeDDepthSlider.value, 10) });
});
threeDDepthNumberInput.addEventListener("input", () => {
  let value = parseInt(threeDDepthNumberInput.value, 10);
  if (isNaN(value)) return;
  value = Math.min(60, Math.max(0, value));
  threeDDepthSlider.value = value;
  updateEffect("threeD", { depth: value });
});
threeDAngleSlider.addEventListener("input", () => {
  threeDAngleNumberInput.value = threeDAngleSlider.value;
  updateEffect("threeD", { angle: parseInt(threeDAngleSlider.value, 10) });
});
threeDAngleNumberInput.addEventListener("input", () => {
  let value = parseInt(threeDAngleNumberInput.value, 10);
  if (isNaN(value)) return;
  value = Math.min(360, Math.max(0, value));
  threeDAngleSlider.value = value;
  updateEffect("threeD", { angle: value });
});

dropShadowEnabledCheckbox.addEventListener("change", () => {
  updateEffect("dropShadow", { enabled: dropShadowEnabledCheckbox.checked });
});
dropShadowColorInput.addEventListener("input", () => {
  updateEffect("dropShadow", { color: dropShadowColorInput.value });
});
dropShadowOpacitySlider.addEventListener("input", () => {
  updateEffect("dropShadow", { opacity: parseInt(dropShadowOpacitySlider.value, 10) / 100 });
});
dropShadowOffsetXSlider.addEventListener("input", () => {
  updateEffect("dropShadow", { offsetX: parseInt(dropShadowOffsetXSlider.value, 10) });
});
dropShadowOffsetYSlider.addEventListener("input", () => {
  updateEffect("dropShadow", { offsetY: parseInt(dropShadowOffsetYSlider.value, 10) });
});
dropShadowBlurSlider.addEventListener("input", () => {
  updateEffect("dropShadow", { blur: parseInt(dropShadowBlurSlider.value, 10) });
});

innerShadowEnabledCheckbox.addEventListener("change", () => {
  updateEffect("innerShadow", { enabled: innerShadowEnabledCheckbox.checked });
});
innerShadowColorInput.addEventListener("input", () => {
  updateEffect("innerShadow", { color: innerShadowColorInput.value });
});
innerShadowOpacitySlider.addEventListener("input", () => {
  updateEffect("innerShadow", { opacity: parseInt(innerShadowOpacitySlider.value, 10) / 100 });
});
innerShadowOffsetXSlider.addEventListener("input", () => {
  updateEffect("innerShadow", { offsetX: parseInt(innerShadowOffsetXSlider.value, 10) });
});
innerShadowOffsetYSlider.addEventListener("input", () => {
  updateEffect("innerShadow", { offsetY: parseInt(innerShadowOffsetYSlider.value, 10) });
});
innerShadowBlurSlider.addEventListener("input", () => {
  updateEffect("innerShadow", { blur: parseInt(innerShadowBlurSlider.value, 10) });
});

innerGlowEnabledCheckbox.addEventListener("change", () => {
  updateEffect("innerGlow", { enabled: innerGlowEnabledCheckbox.checked });
});
innerGlowColorInput.addEventListener("input", () => {
  updateEffect("innerGlow", { color: innerGlowColorInput.value });
});
innerGlowOpacitySlider.addEventListener("input", () => {
  updateEffect("innerGlow", { opacity: parseInt(innerGlowOpacitySlider.value, 10) / 100 });
});
innerGlowSizeSlider.addEventListener("input", () => {
  updateEffect("innerGlow", { size: parseInt(innerGlowSizeSlider.value, 10) });
});

outerGlowEnabledCheckbox.addEventListener("change", () => {
  updateEffect("outerGlow", { enabled: outerGlowEnabledCheckbox.checked });
});
outerGlowColorInput.addEventListener("input", () => {
  updateEffect("outerGlow", { color: outerGlowColorInput.value });
});
outerGlowOpacitySlider.addEventListener("input", () => {
  updateEffect("outerGlow", { opacity: parseInt(outerGlowOpacitySlider.value, 10) / 100 });
});
outerGlowSizeSlider.addEventListener("input", () => {
  updateEffect("outerGlow", { size: parseInt(outerGlowSizeSlider.value, 10) });
});

strokeEnabledCheckbox.addEventListener("change", () => {
  updateEffect("stroke", { enabled: strokeEnabledCheckbox.checked });
});
strokeColorInput.addEventListener("input", () => {
  updateEffect("stroke", { color: strokeColorInput.value });
});
strokeWidthSlider.addEventListener("input", () => {
  strokeWidthNumberInput.value = strokeWidthSlider.value;
  updateEffect("stroke", { width: parseFloat(strokeWidthSlider.value) });
});
strokeWidthNumberInput.addEventListener("input", () => {
  let value = parseFloat(strokeWidthNumberInput.value);
  if (isNaN(value)) return;
  value = Math.min(20, Math.max(0, value));
  strokeWidthSlider.value = value;
  updateEffect("stroke", { width: value });
});

colorOverlayEnabledCheckbox.addEventListener("change", () => {
  updateEffect("colorOverlay", { enabled: colorOverlayEnabledCheckbox.checked });
});
colorOverlayColorInput.addEventListener("input", () => {
  updateEffect("colorOverlay", { color: colorOverlayColorInput.value });
});
colorOverlayOpacitySlider.addEventListener("input", () => {
  updateEffect("colorOverlay", { opacity: parseInt(colorOverlayOpacitySlider.value, 10) / 100 });
});

gradientOverlayEnabledCheckbox.addEventListener("change", () => {
  updateEffect("gradientOverlay", { enabled: gradientOverlayEnabledCheckbox.checked });
});
gradientOverlayColor1Input.addEventListener("input", () => {
  updateEffect("gradientOverlay", { color1: gradientOverlayColor1Input.value });
});
gradientOverlayColor2Input.addEventListener("input", () => {
  updateEffect("gradientOverlay", { color2: gradientOverlayColor2Input.value });
});
gradientOverlayMethodSelect.addEventListener("change", () => {
  updateEffect("gradientOverlay", { method: gradientOverlayMethodSelect.value });
});

gradientOverlayAngleSlider.addEventListener("input", () => {
  gradientOverlayAngleNumberInput.value = gradientOverlayAngleSlider.value;
  updateEffect("gradientOverlay", { angle: parseInt(gradientOverlayAngleSlider.value, 10) });
});
gradientOverlayAngleNumberInput.addEventListener("input", () => {
  let value = parseInt(gradientOverlayAngleNumberInput.value, 10);
  if (isNaN(value)) return;
  value = Math.min(360, Math.max(0, value));
  gradientOverlayAngleSlider.value = value;
  updateEffect("gradientOverlay", { angle: value });
});

gradientOverlayScaleSlider.addEventListener("input", () => {
  gradientOverlayScaleNumberInput.value = gradientOverlayScaleSlider.value;
  updateEffect("gradientOverlay", { scale: parseInt(gradientOverlayScaleSlider.value, 10) });
});
gradientOverlayScaleNumberInput.addEventListener("input", () => {
  let value = parseInt(gradientOverlayScaleNumberInput.value, 10);
  if (isNaN(value)) return;
  value = Math.min(200, Math.max(10, value));
  gradientOverlayScaleSlider.value = value;
  updateEffect("gradientOverlay", { scale: value });
});

gradientOverlayOffsetXSlider.addEventListener("input", () => {
  gradientOverlayOffsetXNumberInput.value = gradientOverlayOffsetXSlider.value;
  updateEffect("gradientOverlay", { offsetX: parseInt(gradientOverlayOffsetXSlider.value, 10) });
});
gradientOverlayOffsetXNumberInput.addEventListener("input", () => {
  let value = parseInt(gradientOverlayOffsetXNumberInput.value, 10);
  if (isNaN(value)) return;
  value = Math.min(100, Math.max(-100, value));
  gradientOverlayOffsetXSlider.value = value;
  updateEffect("gradientOverlay", { offsetX: value });
});

gradientOverlayOffsetYSlider.addEventListener("input", () => {
  gradientOverlayOffsetYNumberInput.value = gradientOverlayOffsetYSlider.value;
  updateEffect("gradientOverlay", { offsetY: parseInt(gradientOverlayOffsetYSlider.value, 10) });
});
gradientOverlayOffsetYNumberInput.addEventListener("input", () => {
  let value = parseInt(gradientOverlayOffsetYNumberInput.value, 10);
  if (isNaN(value)) return;
  value = Math.min(100, Math.max(-100, value));
  gradientOverlayOffsetYSlider.value = value;
  updateEffect("gradientOverlay", { offsetY: value });
});

gradientOverlayOpacitySlider.addEventListener("input", () => {
  updateEffect("gradientOverlay", { opacity: parseInt(gradientOverlayOpacitySlider.value, 10) / 100 });
});

blendingModalCloseBtn.addEventListener("click", () => {
  closeBlendingOptions();
});

blendingModalHeaderEl.addEventListener("mousedown", (e) => {
  if (e.target === blendingModalCloseBtn) return;
  isDraggingBlendingModal = true;
  const rect = blendingModalEl.getBoundingClientRect();
  blendingModalDragOffsetX = e.clientX - rect.left;
  blendingModalDragOffsetY = e.clientY - rect.top;
  blendingModalEl.style.transform = "none";
  blendingModalEl.style.left = rect.left + "px";
  blendingModalEl.style.top = rect.top + "px";
});

document.addEventListener("mousemove", (e) => {
  if (!isDraggingBlendingModal) return;
  blendingModalEl.style.left = e.clientX - blendingModalDragOffsetX + "px";
  blendingModalEl.style.top = e.clientY - blendingModalDragOffsetY + "px";
});

document.addEventListener("mouseup", () => {
  isDraggingBlendingModal = false;
});
