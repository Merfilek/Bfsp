const SHAPE_MORPH_POINT_COUNT = 48;

function resamplePolygon(vertices, n) {
  const edges = [];
  let total = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    edges.push({ a, b, len });
    total += len;
  }

  const points = [];
  for (let i = 0; i < n; i++) {
    let target = (total * i) / n;
    let edgeIndex = 0;
    while (edgeIndex < edges.length - 1 && target > edges[edgeIndex].len) {
      target -= edges[edgeIndex].len;
      edgeIndex++;
    }
    const edge = edges[edgeIndex];
    const frac = edge.len === 0 ? 0 : target / edge.len;
    points.push({
      x: edge.a.x + (edge.b.x - edge.a.x) * frac,
      y: edge.a.y + (edge.b.y - edge.a.y) * frac,
    });
  }
  return points;
}

function ellipseOutlinePoints(n) {
  const points = [];
  for (let i = 0; i < n; i++) {
    const theta = -Math.PI / 2 + (i / n) * Math.PI * 2;
    points.push({ x: 0.5 + 0.5 * Math.cos(theta), y: 0.5 + 0.5 * Math.sin(theta) });
  }
  return points;
}

const SHAPE_MORPH_RAW_VERTICES = {
  rectangle: [
    { x: 0.5, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: 0, y: 0 },
  ],
  triangle: [
    { x: 0.5, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ],
  hexagon: [
    { x: 0.5, y: 0 },
    { x: 0.75, y: 0 },
    { x: 1, y: 0.5 },
    { x: 0.75, y: 1 },
    { x: 0.25, y: 1 },
    { x: 0, y: 0.5 },
    { x: 0.25, y: 0 },
  ],
};

const SHAPE_MORPH_POINTS = {
  ellipse: ellipseOutlinePoints(SHAPE_MORPH_POINT_COUNT),
  rectangle: resamplePolygon(SHAPE_MORPH_RAW_VERTICES.rectangle, SHAPE_MORPH_POINT_COUNT),
  triangle: resamplePolygon(SHAPE_MORPH_RAW_VERTICES.triangle, SHAPE_MORPH_POINT_COUNT),
  hexagon: resamplePolygon(SHAPE_MORPH_RAW_VERTICES.hexagon, SHAPE_MORPH_POINT_COUNT),
};
SHAPE_MORPH_POINTS.line = SHAPE_MORPH_POINTS.rectangle;
