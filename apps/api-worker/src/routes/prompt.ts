import { json } from "../lib/response";
import { getRandomSeed } from "../data/prompt-seeds";

export type PromptEnv = {
  SILICONFLOW_API_KEY?: string;
  SILICONFLOW_MODEL?: string;
  SILICONFLOW_API_BASE?: string;
};

const TRANSLATE_PATH = "/translate/prompt";
const PROMPT_GENERATE_PATH = "/prompt/generate";

export function handlePromptOptions(request: Request): Response | null {
  const url = new URL(request.url);
  if (!isPromptPath(url.pathname)) {
    return null;
  }

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };

  return new Response(null, { status: 204, headers });
}

export async function handlePromptRequest(request: Request, env: PromptEnv): Promise<Response | null> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS" && isPromptPath(url.pathname)) {
    return handlePromptOptions(request);
  }

  if (request.method !== "POST") {
    return null;
  }

  if (url.pathname === TRANSLATE_PATH) {
    return handleTranslatePrompt(request, env);
  }

  if (url.pathname === PROMPT_GENERATE_PATH) {
    return handleGeneratePrompt(request, env);
  }

  return null;
}

async function handleTranslatePrompt(request: Request, env: PromptEnv): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch (error) {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const original = String(body?.text || "").trim();
  if (!original) {
    return json({ error: "EMPTY_TEXT" }, 400);
  }

  const targetLang = String(body?.target_lang || "").toLowerCase() === "zh" ? "zh" : "en";
  const apiKey = env.SILICONFLOW_API_KEY;
  const configured = env.SILICONFLOW_MODEL || "deepseek-ai/DeepSeek-V3.1";

  if (!apiKey) {
    return json({
      original,
      translated: original,
      detected_lang: targetLang,
      warning: "MISSING_API_KEY"
    });
  }

  const systemPrompt = buildTranslateSystemPrompt(original, targetLang === "zh" ? "zh" : "en");
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: original }
  ];

  const { data, error, tried } = await callSiliconChat({
    apiKey,
    models: [configured, "deepseek-ai/DeepSeek-V3.1", "deepseek-ai/DeepSeek-V3"],
    messages,
    maxTokens: 256,
    temperature: 0.2,
    bases: resolveSiliconBases(env)
  });

  if (!data) {
    return json({ error: "TRANSLATE_FAILED", detail: error, tried }, 502);
  }

  let content: string = data?.choices?.[0]?.message?.content || "";
  content = content.trim().replace(/^\s*[“"`]?(.*?)[”"`]?\s*$/s, "$1");
  if (!content) {
    content = original;
  }
  if (content.length > 500) {
    content = content.slice(0, 500);
  }

  return json({ original, translated: content, detected_lang: targetLang });
}

async function handleGeneratePrompt(_request: Request, env: PromptEnv): Promise<Response> {
  const seed = getRandomSeed();
  if (seed) {
    return json({ phrase: seed, source: "local" });
  }

  const apiKey = env.SILICONFLOW_API_KEY;
  const configured = env.SILICONFLOW_MODEL || "deepseek-ai/DeepSeek-V3.1";
  if (!apiKey) {
    return json({ error: "MISSING_API_KEY" }, 500);
  }

  const messages = [
    { role: "system", content: PROMPT_SYSTEM_PROMPT },
    { role: "user", content: "Generate one new phrase now." }
  ];

  const { data, error, tried } = await callSiliconChat({
    apiKey,
    models: [configured, "deepseek-ai/DeepSeek-V3.1", "deepseek-ai/DeepSeek-V3"],
    messages,
    maxTokens: 128,
    temperature: 0.7,
    bases: resolveSiliconBases(env)
  });

  if (!data) {
    return json({ error: "AI_PROMPT_FAILED", detail: error, tried }, 502);
  }

  let phrase: string = data?.choices?.[0]?.message?.content || "";
  phrase = phrase.trim().replace(/^\s*["“`']?|["”`']?\s*$/g, "").replace(/\s+/g, " ");

  return json({ phrase, source: "remote" });
}

function isPromptPath(pathname: string): boolean {
  return pathname === TRANSLATE_PATH || pathname === PROMPT_GENERATE_PATH;
}

function buildTranslateSystemPrompt(userText: string, target: "en" | "zh"): string {
  if (target === "zh") {
    return `You are a senior prompt engineer and translator supporting Simplified Chinese diffusion models.\n\nTASK\nRewrite the user input into exactly one prompt written in Simplified Chinese that suits text-to-image generation.\n\nRULES\n1. Preserve proper nouns, brand names, and other key entities.\n2. If the subject is unspecified, default to "girl".\n3. When core photography details are missing, add: studio cyclorama background in pale gray, soft ring light, medium depth of field, half-body framing.\n4. Do not include negative prompts or explanations.\n5. Return only the final Simplified Chinese prompt with no quotation marks.\n\nEXAMPLE\nInput: cute japanese girl in a sakura cafe\nOutput: Provide a single sentence in Simplified Chinese that follows the rules above.\n\nBEGIN\nUser input: <<${userText}>>`;
  }

  return `You are an expert prompt engineer and translator.\n\nTASK\nTranslate the user's text into a SINGLE English prompt suitable for modern text-to-image diffusion models (e.g. popular web or API-based generators).\n\nRULES\n1. Preserve proper nouns, brand names, and stylised words.\n2. Keep subject gender/age; default to "girl" if unspecified.\n3. If missing, add: studio cyclorama background in pale gray; ring-light soft illumination; medium depth-of-field; half-body shot.\n4. Do NOT append negative prompts or commentary.\n5. Return ONLY the final English prompt string.\n\nEXAMPLE\nInput: a cute girl in a sakura cafe\nOutput: cute japanese girl in a sakura cafe, studio cyclorama background in pale gray, ring-light soft illumination, medium depth-of-field, half-body shot\n\nNow translate:\n<<${userText}>>`;
}

const PROMPT_SYSTEM_PROMPT = `You are a prompt-engineering assistant for text-to-image models.\n\nGOAL\nWhen there is no user input, output ONE English phrase that describes only a realistic adult girl subject for image generation.\n\nSTRICT RULES\n1) Describe the GIRL ONLY: facial features, skin tone, hair style/color/length, clothing style, accessories (if any), expression/mood, and a distinctive trait (e.g., freckles, dimples).\n2) Absolutely NO background, environment, lighting, camera/lens, composition, quality tags, brand names, or artist names.\n3) Include ONE explicit nationality/heritage/country-of-origin adjective (e.g., japanese, ethiopian, mexican-heritage, indian, korean-american, brazilian, lebanese, nigerian-british). Do not add locations.\n4) Do NOT mention any neck jewelry: no necklace, pendant, chain, locket, choker, collar.\n5) Keep it realistic (no anime/cyberpunk/fantasy/cartoon keywords).\n6) Age must be 18+ and not stated as a number. Avoid sexualized terms.\n7) 14–26 english words, concise and vivid, lowercase preferred.\n8) Enrich facial details (eye shape/size, brows, lips, nose bridge, cheekbones, jawline) and garment texture/cut/color (e.g., linen blouse, ribbed knit, cuffed sleeves).\n9) Each call should vary regions and clothing over time for diversity.\n10) Output ONLY the final phrase, no quotes or extra text.\n\nEXAMPLES (style of wording only; do NOT repeat verbatim)\n- “freckled japanese girl with shoulder-length chestnut hair, soft smile, ivory blouse, small hoop earrings”\n- “ethiopian girl with tight coiled updo, warm brown skin, calm gaze, white linen shirt, subtle gold pendant”\n- “mexican-heritage girl with long wavy black hair, olive complexion, confident look, denim jacket, light makeup”\n\nNow produce one new phrase following the rules above.`;

function resolveSiliconBases(env: PromptEnv): string[] {
  const configured = (env.SILICONFLOW_API_BASE || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => value.replace(/\/$/, ""));

  if (configured.length > 0) {
    return configured;
  }

  return ["https://api.your-silicon-provider.com"];
}

async function callSiliconChat(options: {
  apiKey: string;
  models: string[];
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  bases: string[];
}): Promise<{ data?: any; error?: any; tried: string[] }> {
  const tried: string[] = [];
  let lastError: any = null;

  for (const model of options.models) {
    for (const base of options.bases) {
      const url = `${base}/v1/chat/completions`;
      tried.push(`${base}|${model}`);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.2,
          top_p: options.topP ?? 0.9,
          max_tokens: options.maxTokens ?? 256,
          stream: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        return { data, tried };
      }

      try {
        lastError = await response.json();
      } catch {
        lastError = await response.text().catch(() => "");
      }
    }
  }

  return { error: lastError ?? "unknown_error", tried };
}
