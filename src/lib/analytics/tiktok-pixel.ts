declare global {
  interface Window {
    ttq?: {
      page: () => void;
      identify: (payload: Record<string, string>) => void;
      track: (eventName: string, params?: Record<string, unknown>) => void;
    };
  }
}

function mapMetaEventToTikTok(eventName: string): string {
  const mapping: Record<string, string> = {
    Purchase: 'Purchase',
    Lead: 'SubmitForm',
    Contact: 'Contact',
    Subscribe: 'Subscribe',
    CompleteRegistration: 'CompleteRegistration',
    InitiateCheckout: 'InitiateCheckout',
    AddToCart: 'AddToCart',
    ViewContent: 'ViewContent',
    PageView: 'PageView',
  };

  return mapping[eventName] || eventName;
}

function canUseSubtleCrypto(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.subtle !== 'undefined' &&
    typeof TextEncoder !== 'undefined'
  );
}

async function hashSha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface TikTokIdentifyInput {
  email?: string;
  phoneNumber?: string;
  externalId?: string;
}

export function identifyTikTokPixelUser(
  input: Readonly<TikTokIdentifyInput>
): void {
  if (typeof window === 'undefined' || !window.ttq?.identify) return;
  if (!canUseSubtleCrypto()) return;

  const normalizedPhone = input.phoneNumber?.replace(/\s+/g, '');
  const hasAny =
    Boolean(input.email?.trim()) ||
    Boolean(normalizedPhone?.trim()) ||
    Boolean(input.externalId?.trim());
  if (!hasAny) return;

  void (async () => {
    try {
      const identifyPayload: Record<string, string> = {};
      if (input.email?.trim()) {
        identifyPayload.email = await hashSha256(input.email);
      }
      if (normalizedPhone?.trim()) {
        identifyPayload.phone_number = await hashSha256(normalizedPhone);
      }
      if (input.externalId?.trim()) {
        identifyPayload.external_id = await hashSha256(input.externalId);
      }

      if (Object.keys(identifyPayload).length > 0) {
        window.ttq?.identify(identifyPayload);
        if (process.env.NODE_ENV === 'development') {
          console.log('[TikTok Pixel] identify called');
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[TikTok Pixel] identify failed:', error);
      }
    }
  })();
}

export function trackTikTokPixelEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === 'undefined' || !window.ttq) return;

  try {
    const tikTokEventName = mapMetaEventToTikTok(eventName);
    window.ttq.track(tikTokEventName, params);
    if (process.env.NODE_ENV === 'development') {
      console.log('[TikTok Pixel] Event tracked:', tikTokEventName, params);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[TikTok Pixel] Error tracking event:', error);
    }
  }
}
