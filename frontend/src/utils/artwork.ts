// Presentation only: category names and filtering always come from the API.
export function categoryTheme(category: string) {
  if (/desk|office|tech|electronic/i.test(category)) return "indigo";
  if (/home|living|kitchen/i.test(category)) return "peach";
  if (/outdoor|sport|garden/i.test(category)) return "mint";
  return "lilac";
}
export function artworkKind(name: string, category = "") {
  if (/lamp/i.test(name)) return "lamp";
  if (/notebook|book/i.test(name)) return "notebook";
  if (/pen/i.test(name)) return "pens";
  if (/mug|cup/i.test(name)) return "mug";
  if (/throw|blanket/i.test(name)) return "blanket";
  if (/basket/i.test(name)) return "basket";
  if (/bottle/i.test(name)) return "bottle";
  if (/tote|bag/i.test(name)) return "tote";
  if (/pouch/i.test(name)) return "pouch";
  if (/desk|office/i.test(category)) return "notebook";
  if (/home/i.test(category)) return "mug";
  if (/outdoor/i.test(category)) return "bottle";
  if (/accessor/i.test(category)) return "tote";
  return "box";
}
