// Manual outfit canvas layout helpers.
// Garment positions are stored as percentages of the avatar stage, so a look
// keeps its composition on any screen size.

export const CATEGORY_BASE_WIDTH = {
  top: 46,
  bottom: 38,
  dress: 50,
  outerwear: 50,
  underwear: 34,
  shoes: 24,
  bag: 20,
  accessory: 16,
};

// Sensible starting spot + layering per category.
const CATEGORY_PLACEMENT = {
  top:       { x: 50, y: 33, z: 2 },
  bottom:    { x: 50, y: 57, z: 1 },
  dress:     { x: 50, y: 45, z: 1 },
  outerwear: { x: 50, y: 33, z: 3 },
  underwear: { x: 50, y: 37, z: 1 },
  shoes:     { x: 50, y: 88, z: 2 },
  bag:       { x: 74, y: 57, z: 4 },
  accessory: { x: 72, y: 28, z: 5 },
};

export function isDress(category) {
  return category === "dress";
}

export function defaultPlacement(category) {
  const cfg = CATEGORY_PLACEMENT[category] || { x: 50, y: 50, z: 1 };
  return { x: cfg.x, y: cfg.y, scale: 1, rotation: 0, z_index: cfg.z };
}