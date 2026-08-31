function computeBoundingBox(elements) {
  const minX = Math.min(...elements.map((el) => el.x));
  const minY = Math.min(...elements.map((el) => el.y));
  const maxX = Math.max(...elements.map((el) => el.x + el.width));
  const maxY = Math.max(...elements.map((el) => el.y + el.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function rotatePointAround(px, py, cx, cy, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

function groupSelectedElements() {
  if (selectedElementIndices.length < 2) return;

  const slide = slides[currentSlideIndex];
  const sortedIndices = [...selectedElementIndices].sort((a, b) => a - b);
  const members = sortedIndices.map((index) => slide.elements[index]);
  const box = computeBoundingBox(members);

  const children = members.map((member) => {
    const child = cloneElementData(member);
    child.xFraction = box.width === 0 ? 0 : (member.x - box.x) / box.width;
    child.yFraction = box.height === 0 ? 0 : (member.y - box.y) / box.height;
    child.widthFraction = box.width === 0 ? 1 : member.width / box.width;
    child.heightFraction = box.height === 0 ? 1 : member.height / box.height;
    delete child.x;
    delete child.y;
    delete child.width;
    delete child.height;
    return child;
  });

  [...sortedIndices].sort((a, b) => b - a).forEach((index) => slide.elements.splice(index, 1));

  const insertIndex = Math.min(...sortedIndices);
  const groupElement = {
    id: generateElementId(),
    type: "group",
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    rotation: 0,
    children,
  };
  slide.elements.splice(insertIndex, 0, groupElement);

  selectOnly(insertIndex);
  renderAll();
}

function ungroupSelectedElement() {
  const index = getPrimarySelectedIndex();
  if (index === null) return;

  const slide = slides[currentSlideIndex];
  const group = slide.elements[index];
  if (!group || group.type !== "group") return;

  const groupCenterX = group.x + group.width / 2;
  const groupCenterY = group.y + group.height / 2;
  const groupRotation = group.rotation || 0;

  const reconstructed = group.children.map((child) => {
    const element = cloneElementData(child);
    delete element.xFraction;
    delete element.yFraction;
    delete element.widthFraction;
    delete element.heightFraction;

    element.width = child.widthFraction * group.width;
    element.height = child.heightFraction * group.height;

    const unrotatedCenterX = group.x + child.xFraction * group.width + element.width / 2;
    const unrotatedCenterY = group.y + child.yFraction * group.height + element.height / 2;
    const rotatedCenter = rotatePointAround(
      unrotatedCenterX,
      unrotatedCenterY,
      groupCenterX,
      groupCenterY,
      groupRotation
    );

    element.x = rotatedCenter.x - element.width / 2;
    element.y = rotatedCenter.y - element.height / 2;
    element.rotation = (child.rotation || 0) + groupRotation;

    return element;
  });

  slide.elements.splice(index, 1, ...reconstructed);
  selectedElementIndices = reconstructed.map((_, i) => index + i);
  mainSelectedIndex = selectedElementIndices[selectedElementIndices.length - 1];
  renderAll();
}
