// Only the configured R → D → W → V hierarchy has an optional W step.
// Other configured hierarchies retain their existing sequential behavior.
export const hasOptionalWard = (types) =>
  Array.isArray(types) && types.length === 4 && types.join(",") === "R,D,W,V";

// The family form stores the actual selected location, never a synthetic W.
// Populate each field by its real type rather than by its ancestry depth:
// a V below D must leave the W field empty when re-opening the form.
export const locationPathState = (value, types) => {
  const state = { "location_-2": null, "location_-1": null };
  types.slice(2).forEach((_, index) => { state[`location_${index}`] = null; });
  let current = value;
  const visited = new Set();
  while (current && !visited.has(current.uuid)) {
    visited.add(current.uuid);
    const index = types.indexOf(current.type);
    if (index === 0) state["location_-2"] = current;
    else if (index === 1) state["location_-1"] = current;
    else if (index >= 2) state[`location_${index - 2}`] = current;
    current = current.parent;
  }
  return state;
};

// The cascader must show real W and V children of D, and V children of W.
// No W is created or inferred when the source gives D → V directly.
export const nextLocationLevels = (level, maxLevel, types) => {
  if (hasOptionalWard(types) && level === 1 && maxLevel >= 4) return [2, 3];
  return level + 1 < maxLevel ? [level + 1] : [];
};

// rc-cascader supplies empty option paths when the current selection is cleared.
// Keep the callback contract stable instead of dereferencing an absent option.
export const normalizeCascaderSelection = (multiple, selectedOptions) => {
  const paths = Array.isArray(selectedOptions) ? selectedOptions : [];
  const selected = paths
    .map((path) => (Array.isArray(path) ? path[path.length - 1] : path))
    .filter(Boolean)
    .map((option) => option.raw);
  return multiple ? selected : selected[0] || null;
};

export const selectFamilyLocation = (previousState, index, location, types) => {
  const next = location ? locationPathState(location, types) : { ...previousState };
  next[`location_${index}`] = location;
  for (let i = index + 1; i < types.length - 2; i++) next[`location_${i}`] = null;
  return {
    state: next,
    // Only the actual terminal V satisfies the family's required location.
    familyLocation: index === types.length - 3 ? location : null,
  };
};
