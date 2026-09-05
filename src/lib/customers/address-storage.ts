type AddressMetadata = {
  state?: string | null;
  country?: string | null;
  addressLabel?: string | null;
};

export type ParsedStoredAddress = {
  address: string;
  state: string | null;
  country: string | null;
  addressLabel: string | null;
};

function encodePart(value: string): string {
  return encodeURIComponent(value);
}

function decodePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Stores extra metadata in the existing address field to avoid a schema migration.
 * Format:
 *   <address>|state:<encoded>|country:<encoded>|label:<encoded>
 */
export function serializeStoredAddress(
  address: string,
  metadata: AddressMetadata,
): string {
  const parts = [address.trim()];
  if (metadata.state?.trim()) {
    parts.push(`state:${encodePart(metadata.state.trim())}`);
  }
  if (metadata.country?.trim()) {
    parts.push(`country:${encodePart(metadata.country.trim())}`);
  }
  if (metadata.addressLabel?.trim()) {
    parts.push(`label:${encodePart(metadata.addressLabel.trim())}`);
  }
  return parts.join('|');
}

export function parseStoredAddress(rawAddress: string | null | undefined): ParsedStoredAddress {
  if (!rawAddress) {
    return {
      address: '',
      state: null,
      country: null,
      addressLabel: null,
    };
  }

  const parts = rawAddress.split('|');
  const baseAddress = parts[0] ?? '';
  let state: string | null = null;
  let country: string | null = null;
  let addressLabel: string | null = null;

  for (const part of parts.slice(1)) {
    if (part.startsWith('state:')) {
      state = decodePart(part.replace('state:', '')) || null;
      continue;
    }
    if (part.startsWith('country:')) {
      country = decodePart(part.replace('country:', '')) || null;
      continue;
    }
    if (part.startsWith('label:')) {
      addressLabel = decodePart(part.replace('label:', '')) || null;
    }
  }

  return {
    address: baseAddress,
    state,
    country,
    addressLabel,
  };
}

