const slideTransitionToolbarGroupEl = document.getElementById("slideTransitionToolbarGroup");
const transitionTypeSelect = document.getElementById("transitionTypeSelect");
const transitionDirectionGroupEl = document.getElementById("transitionDirectionGroup");
const transitionDirBtns = document.querySelectorAll(".transition-dir-btn");
const slideBackgroundColorInput = document.getElementById("slideBackgroundColorInput");

const transitionEasingGroupEl = document.getElementById("transitionEasingGroup");
const transitionEasingSelect = document.getElementById("transitionEasingSelect");
const transitionSpeedGroupEl = document.getElementById("transitionSpeedGroup");

const TRANSITION_DIRECTION_TYPES = ["slide", "push", "cube"];

const transitionSpeedBtn = document.getElementById("transitionSpeedBtn");
const transitionSpeedPanel = document.getElementById("transitionSpeedPanel");
const transitionSpeedSlider = document.getElementById("transitionSpeedSlider");
const transitionSpeedValueLabel = document.getElementById("transitionSpeedValueLabel");

const DEFAULT_TRANSITION_DURATION_MS = 500;

function getCurrentSlideTransition() {
  const slide = slides[currentSlideIndex];
  return (
    slide.transition || {
      type: "none",
      direction: "left",
      duration: DEFAULT_TRANSITION_DURATION_MS,
      easing: "linear",
    }
  );
}

function updateCurrentSlideTransition(changes) {
  const slide = slides[currentSlideIndex];
  const current = getCurrentSlideTransition();
  slide.transition = Object.assign({}, current, changes);
  renderSlideCanvas();
}

function renderSlideTransitionToolbar() {
  const showTransitionControls = selectedElementIndices.length === 0;
  slideTransitionToolbarGroupEl.classList.toggle("hidden", !showTransitionControls);
  if (!showTransitionControls) return;

  const slide = slides[currentSlideIndex];
  slideBackgroundColorInput.value = slide.backgroundColor || "#ffffff";

  const transition = getCurrentSlideTransition();
  const type = transition.type || "none";
  transitionTypeSelect.value = type;
  transitionDirectionGroupEl.classList.toggle("hidden", !TRANSITION_DIRECTION_TYPES.includes(type));
  transitionEasingGroupEl.classList.toggle("hidden", type !== "morph");
  transitionSpeedGroupEl.classList.toggle("hidden", type === "none");

  transitionDirBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.direction === (transition.direction || "left"));
  });

  transitionEasingSelect.value = transition.easing || "linear";

  const durationSeconds = (transition.duration || DEFAULT_TRANSITION_DURATION_MS) / 1000;
  setNumberDropdownValue(transitionSpeedBtn, transitionSpeedSlider, transitionSpeedValueLabel, durationSeconds, "s", 1);
}

slideBackgroundColorInput.addEventListener("input", () => {
  const slide = slides[currentSlideIndex];
  slide.backgroundColor = slideBackgroundColorInput.value;
  renderSlideCanvas();
});

transitionTypeSelect.addEventListener("change", () => {
  updateCurrentSlideTransition({ type: transitionTypeSelect.value });
});

transitionEasingSelect.addEventListener("change", () => {
  updateCurrentSlideTransition({ easing: transitionEasingSelect.value });
});

transitionDirBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    updateCurrentSlideTransition({ direction: btn.dataset.direction });
  });
});

setupNumberDropdown(transitionSpeedBtn, transitionSpeedPanel, transitionSpeedSlider, transitionSpeedValueLabel, (value) => {
  updateCurrentSlideTransition({ duration: Math.round(value * 1000) });
}, "s", 1);
