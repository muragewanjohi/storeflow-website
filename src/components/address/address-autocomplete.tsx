/**
 * Address Autocomplete Component
 * 
 * Uses Google Maps Places Autocomplete for address input
 * Follows Shopify/e-commerce best practices for address collection
 */

'use client';

import { useRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface AddressComponents {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  formatted_address: string;
  place_id?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, components?: AddressComponents) => void;
  onPlaceSelected?: (components: AddressComponents) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  label = 'Address',
  placeholder = 'Start typing your address...',
  required = false,
  disabled = false,
  error,
  className,
}: Readonly<AddressAutocompleteProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    // Check if already loaded
    if (window.google?.maps?.places) {
      setIsScriptLoaded(true);
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Wait for it to load
      existingScript.addEventListener('load', () => {
        setIsScriptLoaded(true);
      });
      return;
    }

    // Get API key from environment or use a placeholder
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    
    if (!apiKey) {
      console.warn('Google Maps API key not found. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsScriptLoaded(true);
    };
    
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts (optional)
    };
  }, []);

  // Initialize autocomplete when script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current || disabled) return;

    try {
      // Create autocomplete instance
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        fields: [
          'address_components',
          'formatted_address',
          'place_id',
          'geometry',
        ],
        componentRestrictions: undefined, // Allow all countries
      });

      autocompleteRef.current = autocomplete;

      // Handle place selection
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (!place.address_components || !place.formatted_address) {
          return;
        }

        setIsLoading(true);

        // Extract address components
        const components: AddressComponents = {
          address_line_1: '',
          address_line_2: '',
          city: '',
          state: '',
          postal_code: '',
          country: '',
          formatted_address: place.formatted_address,
          place_id: place.place_id,
          coordinates: place.geometry?.location
            ? {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              }
            : undefined,
        };

        // Parse address components
        place.address_components?.forEach((component) => {
          const types = component.types;

          if (types.includes('street_number')) {
            components.address_line_1 = component.long_name + ' ';
          }
          if (types.includes('route')) {
            components.address_line_1 += component.long_name;
          }
          if (types.includes('subpremise')) {
            components.address_line_2 = component.long_name;
          }
          if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
            if (!components.city) {
              components.city = component.long_name;
            }
          }
          if (types.includes('locality')) {
            components.city = component.long_name;
          }
          if (types.includes('administrative_area_level_1')) {
            components.state = component.short_name || component.long_name;
          }
          if (types.includes('postal_code')) {
            components.postal_code = component.long_name;
          }
          if (types.includes('country')) {
            components.country = component.long_name;
          }
        });

        // Clean up address_line_1
        components.address_line_1 = components.address_line_1.trim();

        // If no street address, use formatted address
        if (!components.address_line_1) {
          components.address_line_1 = place.formatted_address;
        }

        // Update parent component
        onChange(place.formatted_address, components);
        onPlaceSelected?.(components);

        setIsLoading(false);
      });

      return () => {
        if (autocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      };
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
    }
  }, [isScriptLoaded, disabled, onChange, onPlaceSelected]);

  // Handle manual input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={className}>
      {label && (
        <Label htmlFor="address-autocomplete">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          id="address-autocomplete"
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled || !isScriptLoaded}
          className={error ? 'border-destructive' : ''}
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
      {!isScriptLoaded && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <p className="text-xs text-muted-foreground mt-1">
          Address autocomplete requires Google Maps API key
        </p>
      )}
    </div>
  );
}
