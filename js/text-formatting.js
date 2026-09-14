function commitEditingText() {
  if (editingElementIndex === null) return;
  const el = slideCanvasEl.children[editingElementIndex];
  const element = slides[currentSlideIndex].elements[editingElementIndex];
  if (el && element) {
    element.text = el.textContent;
  }
  editingElementIndex = null;
}

function getSelectedElement() {
  const index = getPrimarySelectedIndex();
  if (index === null) return null;
  return slides[currentSlideIndex].elements[index] || null;
}

function getSelectedTextElement() {
  const element = getSelectedElement();
  if (!element || element.type !== "text") return null;
  return element;
}

function getSelectedShapeElement() {
  const element = getSelectedElement();
  if (!element || element.type !== "shape") return null;
  return element;
}

const textToolbarGroupEl = document.getElementById("textToolbarGroup");
const shapeToolbarGroupEl = document.getElementById("shapeToolbarGroup");
const shapeFillColorInput = document.getElementById("shapeFillColorInput");
const shapeTypeBtns = document.querySelectorAll(".shape-type-btn");
const roundnessControlGroupEl = document.getElementById("roundnessControlGroup");

function setupNumberDropdown(btn, panel, slider, valueLabel, onChange, suffix, decimals) {
  suffix = suffix || "";
  decimals = decimals || 0;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("open");
  });

  slider.addEventListener("input", () => {
    const value = parseFloat(slider.value);
    const display = value.toFixed(decimals);
    btn.textContent = display + suffix;
    valueLabel.textContent = display + suffix;
    onChange(value);
  });
}

function setNumberDropdownValue(btn, slider, valueLabel, value, suffix, decimals) {
  suffix = suffix || "";
  decimals = decimals || 0;
  const display = value.toFixed(decimals);
  btn.textContent = display + suffix;
  valueLabel.textContent = display + suffix;
  slider.value = display;
}

const fontSizeBtn = document.getElementById("fontSizeBtn");
const fontSizePanel = document.getElementById("fontSizePanel");
const fontSizeSlider = document.getElementById("fontSizeSlider");
const fontSizeValueLabel = document.getElementById("fontSizeValueLabel");

const shapeRoundnessBtn = document.getElementById("shapeRoundnessBtn");
const shapeRoundnessPanel = document.getElementById("shapeRoundnessPanel");
const shapeRoundnessSlider = document.getElementById("shapeRoundnessSlider");
const shapeRoundnessValueLabel = document.getElementById("shapeRoundnessValueLabel");

const rotationToolbarGroupEl = document.getElementById("rotationToolbarGroup");
const rotationBtn = document.getElementById("rotationBtn");
const rotationPanel = document.getElementById("rotationPanel");
const rotationSlider = document.getElementById("rotationSlider");
const rotationValueLabel = document.getElementById("rotationValueLabel");
const rotate0Btn = document.getElementById("rotate0Btn");
const rotate90Btn = document.getElementById("rotate90Btn");
const rotate180Btn = document.getElementById("rotate180Btn");

const DEGREE_SIGN = "°";

function renderPropertiesToolbar() {
  const anyElement = getSelectedElement();
  const textElement = getSelectedTextElement();
  const shapeElement = getSelectedShapeElement();
  const isRoundableShape = !!shapeElement && shapeElement.shapeType === "rectangle";

  renderSlideTransitionToolbar();

  textToolbarGroupEl.classList.toggle("hidden", !textElement);
  shapeToolbarGroupEl.classList.toggle("hidden", !shapeElement);
  roundnessControlGroupEl.classList.toggle("hidden", !isRoundableShape);
  rotationToolbarGroupEl.classList.toggle("hidden", !anyElement);

  if (anyElement) {
    setNumberDropdownValue(rotationBtn, rotationSlider, rotationValueLabel, anyElement.rotation || 0, DEGREE_SIGN);
  }

  if (textElement) {
    fontFamilySelect.value = textElement.fontFamily || "system-ui, sans-serif";
    setNumberDropdownValue(fontSizeBtn, fontSizeSlider, fontSizeValueLabel, normalizeFontSize(textElement.fontSize));
    textColorInput.value = textElement.color;

    boldBtn.classList.toggle("active", parseInt(textElement.fontWeight, 10) >= 600);
    italicBtn.classList.toggle("active", textElement.fontStyle === "italic");
    underlineBtn.classList.toggle("active", textElement.textDecoration === "underline");

    const align = textElement.textAlign || "left";
    alignLeftBtn.classList.toggle("active", align === "left");
    alignCenterBtn.classList.toggle("active", align === "center");
    alignRightBtn.classList.toggle("active", align === "right");

    const valign = textElement.verticalAlign || "middle";
    valignTopBtn.classList.toggle("active", valign === "top");
    valignMiddleBtn.classList.toggle("active", valign === "middle");
    valignBottomBtn.classList.toggle("active", valign === "bottom");
  }

  if (shapeElement) {
    shapeFillColorInput.value = shapeElement.fillColor;
    shapeTypeBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.shapeType === shapeElement.shapeType);
    });
  }

  if (isRoundableShape) {
    setNumberDropdownValue(shapeRoundnessBtn, shapeRoundnessSlider, shapeRoundnessValueLabel, shapeElement.borderRadius || 0);
  }
}

shapeFillColorInput.addEventListener("input", () => {
  const element = getSelectedShapeElement();
  if (!element) return;
  element.fillColor = shapeFillColorInput.value;
  renderSlideCanvas();
});

shapeTypeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const element = getSelectedShapeElement();
    if (!element) return;
    element.shapeType = btn.dataset.shapeType;
    if (element.shapeType === "rectangle" && element.borderRadius === undefined) {
      element.borderRadius = 0;
    }
    renderSlideCanvas();
  });
});

setupNumberDropdown(fontSizeBtn, fontSizePanel, fontSizeSlider, fontSizeValueLabel, (value) => {
  if (value > 0) {
    updateSelectedElementProp((el) => {
      el.fontSize = value;
    });
  }
});

setupNumberDropdown(shapeRoundnessBtn, shapeRoundnessPanel, shapeRoundnessSlider, shapeRoundnessValueLabel, (value) => {
  const element = getSelectedShapeElement();
  if (!element || element.shapeType !== "rectangle") return;
  element.borderRadius = value;
  renderSlideCanvas();
});

function updateSelectedElementRotation(value) {
  const element = getSelectedElement();
  if (!element) return;
  element.rotation = ((value % 360) + 360) % 360;
  renderSlideCanvas();
}

setupNumberDropdown(rotationBtn, rotationPanel, rotationSlider, rotationValueLabel, (value) => {
  updateSelectedElementRotation(value);
}, DEGREE_SIGN);

rotate0Btn.addEventListener("click", () => updateSelectedElementRotation(0));
rotate90Btn.addEventListener("click", () => updateSelectedElementRotation(90));
rotate180Btn.addEventListener("click", () => updateSelectedElementRotation(180));

function updateSelectedElementProp(mutator) {
  const element = getSelectedTextElement();
  if (!element) return;
  mutator(element);
  renderSlideCanvas();
}

fontFamilySelect.addEventListener("change", () => {
  updateSelectedElementProp((el) => {
    el.fontFamily = fontFamilySelect.value;
  });
});

boldBtn.addEventListener("click", () => {
  updateSelectedElementProp((el) => {
    el.fontWeight = parseInt(el.fontWeight, 10) >= 600 ? "400" : "700";
  });
});

italicBtn.addEventListener("click", () => {
  updateSelectedElementProp((el) => {
    el.fontStyle = el.fontStyle === "italic" ? "normal" : "italic";
  });
});

underlineBtn.addEventListener("click", () => {
  updateSelectedElementProp((el) => {
    el.textDecoration = el.textDecoration === "underline" ? "none" : "underline";
  });
});

textColorInput.addEventListener("input", () => {
  updateSelectedElementProp((el) => {
    el.color = textColorInput.value;
  });
});

alignLeftBtn.addEventListener("click", () => {
  updateSelectedElementProp((el) => {
    el.textAlign = "left";
  });
});

alignCenterBtn.addEventListener("click", () => {
  updateSelectedElementProp((el) => {
    el.textAlign = "center";
  });
});

alignRightBtn.addEventListener("click", () => {
  updateSelectedElementProp((el) => {
    el.textAlign = "right";
  });
});

valignTopBtn.addEventListener("click", () => {
  updateSelectedElementProp((el) => {
    el.verticalAlign = "top";
  });
});

valignMiddleBtn.addEventListener("click", () => {
  updateSelectedElementProp((el) => {
    el.verticalAlign = "middle";
  });
});

valignBottomBtn.addEventListener("click", () => {
  updateSelectedElementProp((el) => {
    el.verticalAlign = "bottom";
  });
});
