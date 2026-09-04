// Best-effort Spanish -> English translation for scraped catalog text.
// Applied at seed time so the raw scrape (data/*.json) stays historically
// accurate to what the source site actually showed.

export const PART_TYPE_TRANSLATIONS: Record<string, string> = {
  "Pantallas": "Screens",
  "Baterías": "Batteries",
  "Tapas": "Back Covers",
  "Chasis": "Chassis",
  "Conectores": "Connectors",
  "Cámaras": "Cameras",
  "Altavoces": "Speakers",
  "Flex": "Flex Cables",
  "Adhesivos": "Adhesives",
  "Sim & Botones": "SIM & Buttons",
  "IC & Tornillos": "IC & Screws",
  "Otros": "Other",
};

// Multi-word phrases, longest/most-specific first. Matched case-insensitively
// with word boundaries; replacement case follows the matched text's case.
const PHRASES: [string, string][] = [
  ["tapa trasera", "back cover"],
  ["tapa batería", "battery cover"],
  ["tapa bateria", "battery cover"],
  ["botón encendido volumen", "power & volume button"],
  ["boton encendido volumen", "power & volume button"],
  ["pantalla táctil", "touch screen"],
  ["pantalla tactil", "touch screen"],
  ["lector de huella", "fingerprint reader"],
  ["lector huella", "fingerprint reader"],
  ["sensor de huella", "fingerprint sensor"],
  ["cristal templado", "tempered glass"],
  ["botón de encendido", "power button"],
  ["boton de encendido", "power button"],
  ["botón de volumen", "volume button"],
  ["boton de volumen", "volume button"],
  ["flex de carga", "charging flex"],
  ["conector de carga", "charging connector"],
  ["placa base", "motherboard"],
  ["cable flex", "flex cable"],
  ["con marco", "with frame"],
  ["sin marco", "without frame"],
];

// Single-word dictionary. Keys are lowercase, accents matter (both accented
// and unaccented variants are listed where products spell it either way).
const WORDS: Record<string, string> = {
  // colors
  "negro": "black", "negra": "black",
  "blanco": "white", "blanca": "white",
  "azul": "blue",
  "verde": "green",
  "rojo": "red", "roja": "red",
  "plata": "silver", "plateado": "silver", "plateada": "silver",
  "gris": "gray",
  "rosa": "pink",
  "dorado": "gold", "dorada": "gold", "oro": "gold",
  "morado": "purple", "morada": "purple", "purpura": "purple", "púrpura": "purple",
  "amarillo": "yellow", "amarilla": "yellow",
  "naranja": "orange",
  "grafito": "graphite",
  "marrón": "brown", "marron": "brown",
  "burdeos": "burgundy",
  "crema": "cream",
  "bronce": "bronze",
  "menta": "mint",
  "titanio": "titanium",
  "transparente": "transparent",
  "claro": "light",
  "oscuro": "dark",
  "cielo": "sky",

  // parts / components
  "pantalla": "screen",
  "táctil": "touch", "tactil": "touch",
  "digitalizador": "digitizer",
  "batería": "battery", "bateria": "battery",
  "tapa": "cover",
  "trasera": "rear", "trasero": "rear",
  "frontal": "front",
  "marco": "frame",
  "chasis": "chassis",
  "conector": "connector",
  "carga": "charging",
  "botón": "button", "boton": "button", "botónes": "buttons", "botones": "buttons",
  "encendido": "power",
  "volumen": "volume",
  "cámara": "camera", "camara": "camera",
  "lente": "lens", "lentes": "lenses",
  "cristal": "glass",
  "altavoz": "speaker", "altavoces": "speakers",
  "auricular": "earpiece",
  "micrófono": "microphone", "microfono": "microphone",
  "vibrador": "vibration motor",
  "adhesivo": "adhesive",
  "antena": "antenna",
  "bandeja": "tray",
  "soporte": "bracket",
  "placa": "board",
  "módulo": "module", "modulo": "module",
  "carcasa": "housing",
  "embellecedor": "trim",
  "puerto": "port",
  "pines": "pins",
  "teclado": "keyboard",
  "interno": "internal", "interna": "internal",
  "central": "central",
  "inferior": "lower",
  "superior": "upper",
  "izquierdo": "left", "izquierda": "left",
  "derecho": "right", "derecha": "right",
  "lateral": "side", "laterales": "side",
  "exterior": "outer",
  "señal": "signal",
  "sonido": "sound",
  "luz": "light",
  "rejilla": "grille",
  "malla": "mesh",
  "goma": "rubber",
  "imanes": "magnets",
  "antipolvo": "dust-proof",
  "profundidad": "depth",
  "retroiluminación": "backlight", "retroiluminacion": "backlight",
  "película": "film", "pelicula": "film",
  "protector": "protector",
  "funda": "case",
  "alimentación": "power supply", "alimentacion": "power supply",
  "cargador": "charger",
  "inalámbrica": "wireless", "inalambrica": "wireless", "inalámbrico": "wireless", "inalambrico": "wireless",
  "conexión": "connection", "conexion": "connection",
  "código": "code", "codigo": "code",
  "administración": "management", "administracion": "management",
  "capacidad": "capacity",
  "potencia": "power",
  "amplificador": "amplifier",
  "reparación": "repair", "reparacion": "repair",
  "diagnóstico": "diagnostic", "diagnostico": "diagnostic",
  "modo": "mode",
  "grado": "grade",
  "reacondicionado": "refurbished",
  "sujeción": "mount", "sujecion": "mount",
  "blindaje": "shield",
  "componentes": "components",
  "piezas": "parts",
  "unidad": "unit",
  "plantilla": "template",
  "lamina": "sheet", "lámina": "sheet",
  "nota": "note",
  "móvil": "mobile", "movil": "mobile",
  "secundaria": "secondary", "secundario": "secondary",
  "principal": "main",
  "conjunto": "assembly",
  "silencio": "mute",
  "defectuosa": "defective", "defectuoso": "defective",
  "mate": "matte",
  "subplaca": "sub-board",
  "versión": "version", "version": "version",
  "serie": "series",
  "tipo": "type",
  "grande": "large", "gran": "large",
  "europea": "european", "europeo": "european",
  "español": "spanish", "espanol": "spanish",
  "templado": "tempered",
  "pulgadas": "inch",
  "mediados": "mid",
  "lápiz": "stylus", "lapiz": "stylus",
  "pegatina": "sticker",
  "programador": "programmer",
  "bobina": "coil",
  "prisma": "prism",
  "lavanda": "lavender",
  "agujero": "hole",
  "completa": "complete", "completo": "complete",
  "cerámico": "ceramic", "ceramico": "ceramic",
  "huella": "fingerprint",
  "lector": "reader",
  "pierde": "loses",
  "intermedio": "middle", "intermedia": "middle",
  "proximidad": "proximity",

  // misc / connective words
  "para": "for",
  "con": "with",
  "sin": "without",
  "de": "of",
  "y": "and",
  "dos": "two",
  "usado": "used", "usada": "used",
  "alta": "high",
};

function applyCase(original: string, translated: string): string {
  if (original === original.toUpperCase()) return translated.toUpperCase();
  if (original[0] === original[0].toUpperCase()) {
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  }
  return translated;
}

function titleCase(text: string): string {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

function translatePhrases(text: string): string {
  let result = text;
  for (const [es, en] of PHRASES) {
    const re = new RegExp(`\\b${es.replace(/ /g, "\\s+")}\\b`, "gi");
    result = result.replace(re, (match) =>
      match[0] === match[0].toUpperCase() ? titleCase(en) : en
    );
  }
  return result;
}

function translateWords(text: string): string {
  return text.replace(/\p{L}+/gu, (word) => {
    const lower = word.toLowerCase();
    const en = WORDS[lower];
    return en ? applyCase(word, en) : word;
  });
}

function translateOrdinals(text: string): string {
  // Spanish ordinal marks (7ª, 8º) -> English "7th" (irregular 1st/2nd/3rd
  // are rare in this context - generation numbers - so a flat "th" is an
  // acceptable simplification).
  return text.replace(/(\d+)[ªº]/g, "$1th");
}

function collapseDuplicateWords(text: string): string {
  // Handles redundant bilingual tagging in the source ("Power Boton
  // Encendido" -> "Power Power Button") and pre-existing source
  // duplicates ("Purple Morado" -> "Purple Purple").
  return text.replace(/\b(\w+)(\s+\1\b)+/gi, "$1");
}

export function translateText(text: string): string {
  return collapseDuplicateWords(translateWords(translatePhrases(translateOrdinals(text))));
}

export function translateLineName(name: string): string {
  if (name === "Otras Series") return "Other Series";
  const m = name.match(/^Serie\s+(.+)$/i);
  if (m) return `${m[1]} Series`;
  return name;
}

export function translateModelName(name: string): string {
  return name.replace(/\bSerie\b/gi, (m) => applyCase(m, "series"));
}
