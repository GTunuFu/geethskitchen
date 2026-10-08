export const FLAVORS = [
  "spicy",
  "garlicky",
  "cheesy",
  "tangy",
  "sweet",
  "umami",
  "smoky",
  "herby",
  "creamy",
  "crunchy",
  "citrusy",
  "salty",
  "rich",
  "fresh",
  "saucy",
  "gingery",
];

export const CUISINES: { name: string; emoji: string }[] = [
  { name: "Italian", emoji: "🍝" },
  { name: "Indian", emoji: "🍛" },
  { name: "Mexican", emoji: "🌮" },
  { name: "Japanese", emoji: "🍣" },
  { name: "Chinese", emoji: "🥡" },
  { name: "Thai", emoji: "🍜" },
  { name: "Korean", emoji: "🥘" },
  { name: "Mediterranean", emoji: "🫒" },
  { name: "Middle Eastern", emoji: "🧆" },
  { name: "Vietnamese", emoji: "🥢" },
  { name: "American", emoji: "🍔" },
  { name: "French", emoji: "🥐" },
  { name: "Comfort food", emoji: "🧀" },
  { name: "Healthy-ish", emoji: "🥗" },
  { name: "Breakfast-y", emoji: "🍳" },
  { name: "Sweet treat", emoji: "🍰" },
];

export function cuisineEmoji(c?: string | null) {
  return CUISINES.find((x) => x.name.toLowerCase() === (c || "").toLowerCase())?.emoji || "🍽️";
}

export const CARD_COLORS = ["#FF5A36", "#FFD23F", "#FF8FC2", "#3D5AFE", "#2EC4A0", "#FF9F5A", "#B28DFF"];
export function cardColor(id: number) {
  return CARD_COLORS[id % CARD_COLORS.length];
}
