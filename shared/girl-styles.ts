/**
 * Shared Girl Generator style configuration and helpers
 */

export interface GirlStyle {
  id: string;
  name: string;
  description: string;
  preview: string;
  hd: string;
  qualityBoost: string[];
  colorPalette: string[];
  mood: string;
  tags: string[];
}

export const GIRL_STYLES: Record<string, GirlStyle> = {
  sweet: {
    id: "sweet",
    name: "Sweet and Cute",
    description: "Gentle, sweet style filled with youthful energy",
    preview: "cute, kawaii, pastel colors, soft lighting, adorable, sweet smile, innocent, youthful",
    hd: "cute, kawaii, pastel colors, soft lighting, adorable, sweet smile, innocent, youthful, detailed facial features, gentle expression, warm atmosphere",
    qualityBoost: ["soft focus", "dreamy lighting", "delicate features", "gentle colors"],
    colorPalette: ["#FFB6C1", "#FFC0CB", "#FFCCCB", "#F0E68C", "#E6E6FA"],
    mood: "gentle, innocent, cheerful",
    tags: ["cute", "sweet", "kawaii", "innocent", "youthful"]
  },
  elegant: {
    id: "elegant",
    name: "Elegant and Intellectual",
    description: "Sophisticated allure that expresses intelligent beauty",
    preview: "elegant, sophisticated, graceful, refined, classy, professional, mature, poised",
    hd: "elegant, sophisticated, graceful, refined, classy, professional, mature, poised, detailed portrait, perfect composition, refined beauty",
    qualityBoost: ["professional lighting", "sharp details", "sophisticated composition", "refined aesthetics"],
    colorPalette: ["#2F4F4F", "#708090", "#B0C4DE", "#D3D3D3", "#F5F5DC"],
    mood: "sophisticated, confident, graceful",
    tags: ["elegant", "sophisticated", "mature", "professional", "classy"]
  },
  playful: {
    id: "playful",
    name: "Playful and Lively",
    description: "Energetic playful style showing vibrant youthfulness",
    preview: "playful, energetic, vibrant, fun, cheerful, dynamic, lively, spirited",
    hd: "playful, energetic, vibrant, fun, cheerful, dynamic, lively, spirited, detailed expression, bright colors, joyful atmosphere",
    qualityBoost: ["vibrant colors", "dynamic pose", "energetic expression", "bright lighting"],
    colorPalette: ["#FF6347", "#FFD700", "#32CD32", "#00CED1", "#FF69B4"],
    mood: "energetic, joyful, spontaneous",
    tags: ["playful", "energetic", "vibrant", "fun", "dynamic"]
  },
  dreamy: {
    id: "dreamy",
    name: "Dreamy Ethereal",
    description: "Dreamlike ethereal vibe with a mysterious allure",
    preview: "dreamy, ethereal, soft focus, romantic, fantasy, magical, mystical, enchanting",
    hd: "dreamy, ethereal, soft focus, romantic, fantasy, magical, mystical, enchanting, detailed atmosphere, otherworldly beauty, celestial lighting",
    qualityBoost: ["ethereal glow", "soft bokeh", "mystical atmosphere", "fantasy lighting"],
    colorPalette: ["#E6E6FA", "#DDA0DD", "#F0E68C", "#AFEEEE", "#F5FFFA"],
    mood: "mystical, romantic, otherworldly",
    tags: ["dreamy", "ethereal", "fantasy", "magical", "romantic"]
  },
  modern: {
    id: "modern",
    name: "Modern Chic",
    description: "Forward urban fashion that highlights modern feminine appeal",
    preview: "modern, trendy, stylish, contemporary, chic, fashionable, urban, sleek",
    hd: "modern, trendy, stylish, contemporary, chic, fashionable, urban, sleek, detailed styling, perfect fashion, cutting-edge aesthetics",
    qualityBoost: ["sharp contrast", "modern aesthetics", "fashion photography", "urban style"],
    colorPalette: ["#000000", "#FFFFFF", "#C0C0C0", "#FF0000", "#0000FF"],
    mood: "confident, trendy, bold",
    tags: ["modern", "trendy", "fashionable", "urban", "contemporary"]
  }
};

export const QUALITY_ENHANCERS = {
  preview: ["high quality", "detailed", "beautiful", "perfect"],
  hd: [
    "masterpiece",
    "best quality",
    "ultra detailed",
    "extremely detailed",
    "high resolution",
    "8k",
    "photorealistic",
    "professional photography",
    "sharp focus",
    "perfect lighting",
    "cinematic quality"
  ]
};

export function buildPrompt(userPrompt: string, styleId: string, type: "txt2img" | "img2img" = "txt2img"): string {
  const style = GIRL_STYLES[styleId] || GIRL_STYLES.sweet;
  const stylePrompt = type === "img2img" ? style.hd : style.preview;
  const qualityWords = QUALITY_ENHANCERS[type === "img2img" ? "hd" : "preview"].join(", ");

  const hasPersonDescription = /\b(woman|girl|lady|female|person|character)\b/i.test(userPrompt);

  if (hasPersonDescription) {
    return `${userPrompt}, ${stylePrompt}, ${qualityWords}`;
  }
  return `a beautiful young woman, ${userPrompt}, ${stylePrompt}, ${qualityWords}`;
}

export function getStyleOptions() {
  return Object.values(GIRL_STYLES).map((style) => ({
    id: style.id,
    name: style.name,
    description: style.description,
    mood: style.mood,
    colorPalette: style.colorPalette,
    tags: style.tags
  }));
}

export function isValidStyleId(styleId: string): boolean {
  return styleId in GIRL_STYLES;
}

export function getDefaultStyle(): GirlStyle {
  return GIRL_STYLES.sweet;
}

export function recommendStyle(userPrompt: string): string {
  const prompt = userPrompt.toLowerCase();

  if (prompt.includes("cute") || prompt.includes("kawaii") || prompt.includes("sweet")) {
    return "sweet";
  }
  if (prompt.includes("elegant") || prompt.includes("professional") || prompt.includes("mature")) {
    return "elegant";
  }
  if (prompt.includes("fun") || prompt.includes("energetic") || prompt.includes("playful")) {
    return "playful";
  }
  if (prompt.includes("fantasy") || prompt.includes("magical") || prompt.includes("dreamy")) {
    return "dreamy";
  }
  if (prompt.includes("modern") || prompt.includes("fashion") || prompt.includes("trendy")) {
    return "modern";
  }
  return "sweet";
}

export type StyleId = keyof typeof GIRL_STYLES;
export type GenerationType = "txt2img" | "img2img";
