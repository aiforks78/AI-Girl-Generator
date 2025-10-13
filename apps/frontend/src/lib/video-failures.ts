const VIDEO_FAIL_REASON_LABELS: Record<string, string> = {
  PUBLIC_ERROR_SEXUAL: 'Sexual content not allowed',
  PUBLIC_ERROR_NUDITY: 'Nudity not allowed',
  PUBLIC_ERROR_VIOLENCE: 'Violent content not allowed',
  PUBLIC_ERROR_HATE: 'Hate or discriminatory content not allowed',
  PUBLIC_ERROR_POLITICAL: 'Sensitive political content not allowed',
  PUBLIC_ERROR_DRUGS: 'Drug-related content not allowed',
  PUBLIC_ERROR_WEAPONS: 'Weapon-related content not allowed',
};

export function formatVideoFailReason(raw?: string | null): string {
  const reason = String(raw || '').trim();
  if (!reason) return 'Generation failed';

  const normalizedKey = reason.replace(/\s+/g, '_').replace(/-+/g, '_').toUpperCase();
  if (VIDEO_FAIL_REASON_LABELS[normalizedKey]) return VIDEO_FAIL_REASON_LABELS[normalizedKey];

  const cleaned = reason.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Generation failed';

  const fallbackKey = cleaned.replace(/\s+/g, '_').toUpperCase();
  if (VIDEO_FAIL_REASON_LABELS[fallbackKey]) return VIDEO_FAIL_REASON_LABELS[fallbackKey];

  return cleaned.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export { VIDEO_FAIL_REASON_LABELS };
