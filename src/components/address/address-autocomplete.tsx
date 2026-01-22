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
  }
}

// Helper function to parse address components
function parseAddressComponents(place: google.maps.places.PlaceResult): AddressComponents {
  const components: AddressComponents = {
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    formatted_address: place.formatted_address || '',
    place_id: place.place_id,
    coordinates: place.geometry?.location
      ? {
          lat: typeof (place.geometry.location as any).lat === 'function' 
            ? (place.geometry.location as any).lat() 
            : (place.geometry.location as any).lat as number,
          lng: typeof (place.geometry.location as any).lng === 'function'
            ? (place.geometry.location as any).lng()
            : (place.geometry.location as any).lng as number,
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
    components.address_line_1 = place.formatted_address || '';
  }

  return components;
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
  const autocompleteRef = useRef<google.maps.places.Autocomplete | google.maps.places.PlaceAutocompleteElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [useNewAPI, setUseNewAPI] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [allowManualInput, setAllowManualInput] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    // Check if already loaded
    if (window.google?.maps?.places) {
      // Check if new API is available
      if (window.google.maps.places.PlaceAutocompleteElement) {
        setUseNewAPI(true);
      }
      setIsScriptLoaded(true);
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Wait for it to load
      const checkLoaded = () => {
        if (window.google?.maps?.places) {
          if (window.google.maps.places.PlaceAutocompleteElement) {
            setUseNewAPI(true);
          }
          setIsScriptLoaded(true);
        } else {
          // Check again after a short delay
          setTimeout(checkLoaded, 100);
        }
      };
      existingScript.addEventListener('load', checkLoaded);
      // Also check immediately in case it's already loaded
      checkLoaded();
      return;
    }

    // Get API key from environment or use a placeholder
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    
    if (!apiKey) {
      console.warn('Google Maps API key not found. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
      return;
    }

    // Load Google Maps script with callback
    const callbackName = `initGoogleMapsPlaces_${Date.now()}`;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    
    // Set up global callback
    (window as any)[callbackName] = () => {
      // Wait a bit for Places library to fully initialize
      setTimeout(() => {
        if (window.google?.maps?.places) {
          // Check if new API is available
          if (window.google.maps.places.PlaceAutocompleteElement) {
            setUseNewAPI(true);
          }
          setIsScriptLoaded(true);
        } else {
          console.error('Google Maps Places library not available after script load');
        }
        // Clean up callback
        delete (window as any)[callbackName];
      }, 100);
    };
    
    // Listen for Google Maps API errors via window error events
    const handleWindowError = (event: ErrorEvent) => {
      const errorMessage = event.message || '';
      if (errorMessage.includes('RefererNotAllowedMapError') || 
          errorMessage.includes('RefererNotAllowed')) {
        setApiError('Google Maps API key is not authorized for this domain. Please update API key restrictions in Google Cloud Console.');
        setAllowManualInput(true);
      } else if (errorMessage.includes('Google Maps') || 
                 errorMessage.includes('Maps JavaScript API')) {
        setApiError('Google Maps API error detected. Manual input is available.');
        setAllowManualInput(true);
      }
    };
    
    window.addEventListener('error', handleWindowError);
    
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      setApiError('Failed to load Google Maps. Please check your API key configuration.');
      setAllowManualInput(true); // Allow manual input even if script fails
      window.removeEventListener('error', handleWindowError);
      delete (window as any)[callbackName];
    };
    
    // Also check for Google Maps errors after script loads
    const checkForErrors = setInterval(() => {
      // Check if there are any Google Maps related errors in the console
      // This is a fallback if error events don't fire
      if (window.google?.maps && !window.google.maps.places) {
        setApiError('Google Maps Places library failed to load. You can still type your address manually.');
        setAllowManualInput(true);
        clearInterval(checkForErrors);
        window.removeEventListener('error', handleWindowError);
      }
    }, 1000);
    
    // Clear interval after 10 seconds
    setTimeout(() => {
      clearInterval(checkForErrors);
      window.removeEventListener('error', handleWindowError);
    }, 10000);

    document.head.appendChild(script);

    return () => {
      // Cleanup will be handled in the callback or error handlers
    };
  }, []);

  // Initialize autocomplete when script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current || disabled) {
      // If script failed to load, allow manual input
      if (!isScriptLoaded && !disabled) {
        setAllowManualInput(true);
      }
      return;
    }
    
    // Wait a bit more to ensure Places library is fully initialized
    const initTimer = setTimeout(() => {
      if (!window.google?.maps?.places) {
        console.error('Google Maps Places library not loaded');
        setApiError('Google Maps Places library failed to load. You can still type your address manually.');
        setAllowManualInput(true);
        return;
      }

      // Check if Autocomplete is available (legacy API - still works for existing customers)
      if (!window.google.maps.places.Autocomplete) {
        console.error('Google Maps Places Autocomplete is not available. This may be because:');
        console.error('1. Your API key was created after March 1, 2025 (new customers must use PlaceAutocompleteElement)');
        console.error('2. Places API is not enabled in Google Cloud Console');
        console.error('3. The script has not fully loaded yet');
        setApiError('Autocomplete is not available. You can still type your address manually.');
        setAllowManualInput(true);
        return;
      }

      try {
        if (!inputRef.current) {
          console.error('Input ref is null');
          return;
        }

        // Use legacy Autocomplete API (works for existing customers)
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

          const components = parseAddressComponents(place);

          // Update parent component
          onChange(place.formatted_address, components);
          onPlaceSelected?.(components);

          setIsLoading(false);
        });

      } catch (error) {
        console.error('Error initializing Google Places Autocomplete:', error);
        console.error('Error details:', {
          hasGoogle: !!window.google,
          hasMaps: !!window.google?.maps,
          hasPlaces: !!window.google?.maps?.places,
          hasAutocomplete: !!window.google?.maps?.places?.Autocomplete,
        });
        setApiError('Failed to initialize address autocomplete. You can still type your address manually.');
        setAllowManualInput(true);
      }
    }, 200); // Small delay to ensure library is ready

    return () => {
      clearTimeout(initTimer);
      if (autocompleteRef.current && window.google?.maps?.event) {
        try {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current as google.maps.places.Autocomplete);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
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
          placeholder={apiError ? 'Type your address manually...' : placeholder}
          required={required}
          disabled={disabled || (!isScriptLoaded && !allowManualInput)}
          className={error || apiError ? 'border-destructive' : ''}
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
      {apiError && (
        <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
          <p className="text-sm text-amber-900 dark:text-amber-100 font-medium mb-1">
            ⚠️ Address Autocomplete Unavailable
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
            {apiError}
          </p>
          {apiError.includes('RefererNotAllowedMapError') && (
            <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
              <p className="font-medium">To fix this:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console → APIs & Services → Credentials</a></li>
                <li>Click on your API key</li>
                <li>Under &quot;Application restrictions&quot; → &quot;HTTP referrers (web sites)&quot;</li>
                <li>Add: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">https://matunda.dukanest.com/*</code></li>
                <li>Or for all subdomains: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">*.dukanest.com/*</code></li>
                <li>Click &quot;Save&quot;</li>
              </ol>
            </div>
          )}
          <p className="text-xs text-amber-800 dark:text-amber-200 mt-2">
            <strong>Note:</strong> You can still type your address manually in the field above.
          </p>
        </div>
      )}
      {!isScriptLoaded && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && !apiError && (
        <p className="text-xs text-muted-foreground mt-1">
          Address autocomplete requires Google Maps API key
        </p>
      )}
    </div>
  );
}
