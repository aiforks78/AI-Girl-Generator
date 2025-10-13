const PROMPT_SEEDS: string[] = [
  "japanese woman with shoulder-length chestnut hair, soft almond eyes, straight brows, ivory blouse, light freckles, gentle smile",
  "korean woman with sleek black lob, monolid eyes, defined arched brows, ribbed knit top in slate, calm expression",
  "chinese woman with long raven hair, oval face, balanced nose bridge, soft pink lips, cotton blouse, tidy bangs",
  "thai woman with loose black braid, smooth tan skin, rounded cheeks, embroidered blouse, bright friendly eyes",
  "filipina woman with long honey waves, warm medium skin, softly angled brows, silk blouse, lively eyes",
  "indian woman with long braided dark hair, warm brown skin, high cheekbones, embroidered kurti, gentle smile",
  "ethiopian woman with tight coiled updo, high cheekbones, wide bright eyes, white blouse, calm confidence",
  "lebanese woman with layered brunette hair, high cheekbones, softly arched brows, fitted top, soft smile",
  "egyptian woman with curly shoulder-length hair, warm golden undertone, defined jawline, linen shirt, bright eyes",
  "nigerian woman with high puff curls, defined brows, bright eyes, jersey top, lively smile",
  "french woman with long ash-brown hair, light freckles across nose, straight brows, ribbed knit top, soft smile",
  "spanish woman with long dark waves, softly arched brows, warm tan skin, cotton blouse, gentle smile",
  "turkish woman with loose dark waves, deep brown eyes, strong brows, satin blouse, confident look",
  "brazilian woman with voluminous caramel curls, golden undertone, bold brows, linen tank, friendly smile",
  "mexican-heritage woman with long wavy black hair, olive complexion, confident look, denim jacket, light makeup",
  "american woman with shoulder-length auburn hair, soft hazel eyes, straight brows, knit sweater, relaxed smile",
  "german woman with straight auburn hair, fair cool skin, bow-shaped lips, buttoned cardigan, composed gaze",
  "polish woman with straight brunette hair, soft pink cheeks, thin brows, ribbed cardigan, relaxed smile",
  "australian woman with sun-kissed waves, light blue eyes, freckles, linen blouse, bright grin",
  "argentinian woman with sleek chestnut hair, warm amber eyes, tailored blouse, poised expression"
];

export function getRandomSeed(): string | null {
  if (PROMPT_SEEDS.length === 0) {
    return null;
  }
  const index = Math.floor(Math.random() * PROMPT_SEEDS.length);
  return PROMPT_SEEDS[Math.max(0, Math.min(index, PROMPT_SEEDS.length - 1))];
}
