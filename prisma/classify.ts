// Standardized part-category classification, applied to the ALREADY
// TRANSLATED (English) product name at seed time. Replaces the old
// per-scrape classification so every brand/model uses the exact same
// fixed set of category names and priority order, instead of whatever
// subcategories a given model happened to have on the source site.
//
// Order matters: first match wins. The order mirrors the original
// scheme (screen > battery > cover > chassis > connector > camera >
// speaker > flex > adhesive > sim/button > ic&screws > other) so
// existing edge cases (e.g. "Battery Cover" -> Batteries, since battery
// is checked before cover) keep behaving the same way.

export const CATEGORY_ORDER: Record<string, number> = {
  "Screens": 1,
  "Batteries": 2,
  "Tampa": 3,
  "Chassis": 4,
  "Charging Board": 5,
  "Cameras": 6,
  "Speakers": 7,
  "Network Flex": 8,
  "Volume Flex": 9,
  "Power Flex": 10,
  "Main Flex": 11,
  "Adhesives": 12,
  "Buttons": 13,
  "Sim Tray": 14,
  "IC & Screws": 15,
  "Other": 99,
};

export function classifyCategory(translatedName: string): string {
  const n = translatedName.toLowerCase();
  const has = (kw: string) => n.includes(kw);

  if (has("screen") || (has("glass") && !has("camera") && !has("lens"))) return "Screens";
  if (has("battery")) return "Batteries";
  if (has("cover") || has("housing")) return "Tampa";
  if (has("chassis") || has("frame")) return "Chassis";
  if (has("connector") || has("charging") || has("charger") || has("dock")) return "Charging Board";
  if (has("camera") || has("lens")) return "Cameras";
  if (has("speaker") || has("earpiece") || has("microphone") || has("vibration motor") || has("buzzer")) {
    return "Speakers";
  }

  // Antenna/network parts are classified by theme regardless of whether
  // the product is literally called "flex" or "cable" or "module".
  if (
    has("network") || has("antenna") || has("nfc") || has("wifi") ||
    has("bluetooth") || has("signal") || has("gps") || has("modem") ||
    has("baseband") || has("coaxial")
  ) {
    return "Network Flex";
  }

  if (has("flex") || has("cable")) {
    if (has("volume")) return "Volume Flex";
    if (has("power") || has("home")) return "Power Flex";
    return "Main Flex";
  }

  if (has("adhesive") || has("sticker")) return "Adhesives";

  if (has("sim") && has("tray")) return "Sim Tray";
  if (has("button")) return "Buttons";

  if (has("screw") || /\bic\b/.test(n) || has("circuit") || has("chip") || has("programmer")) {
    return "IC & Screws";
  }

  return "Other";
}
