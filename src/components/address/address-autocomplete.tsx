/**
 * Address Autocomplete Component
 * 
 * Uses Google Maps Places Autocomplete for address input
 * Follows Shopify/e-commerce best practices for address collection
 * 
 * Implementation Notes:
 * - Migrated to new Places API using importLibrary and Place class (recommended)
 * - Falls back to legacy Autocomplete API for backward compatibility
 * - Uses modern dynamic library loading with importLibrary
 * - Reference: https://developers.google.com/maps/documentation/javascript/legacy/places-migration-overview
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

// Helper function to parse address components from new Place class (camelCase)
function parseAddressComponentsFromPlace(place: any): AddressComponents {
  const components: AddressComponents = {
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    formatted_address: place.formattedAddress || '',
    place_id: place.id || undefined,
    coordinates: place.location
      ? {
          lat: typeof place.location.lat === 'function' 
            ? place.location.lat() 
            : (place.location.lat as number),
          lng: typeof place.location.lng === 'function'
            ? place.location.lng()
            : (place.location.lng as number),
        }
      : undefined,
  };

  // Parse address components (new API uses camelCase: longText, shortText)
  place.addressComponents?.forEach((component: any) => {
    const types = component.types || [];

    if (types.includes('street_number')) {
      components.address_line_1 = (component.longText || component.long_name || '') + ' ';
    }
    if (types.includes('route')) {
      components.address_line_1 += (component.longText || component.long_name || '');
    }
    if (types.includes('subpremise')) {
      components.address_line_2 = component.longText || component.long_name || '';
    }
    if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
      if (!components.city) {
        components.city = component.longText || component.long_name || '';
      }
    }
    if (types.includes('locality')) {
      components.city = component.longText || component.long_name || '';
    }
    if (types.includes('administrative_area_level_1')) {
      components.state = (component.shortText || component.short_name || component.longText || component.long_name || '');
    }
    if (types.includes('postal_code')) {
      components.postal_code = component.longText || component.long_name || '';
    }
    if (types.includes('country')) {
      components.country = component.longText || component.long_name || '';
    }
  });

  // Clean up address_line_1
  components.address_line_1 = components.address_line_1.trim();

  // If no street address, use formatted address
  if (!components.address_line_1) {
    components.address_line_1 = place.formattedAddress || '';
  }

  return components;
}

// Helper function to parse address components from legacy PlaceResult (snake_case)
function parseAddressComponentsFromPlaceResult(place: google.maps.places.PlaceResult): AddressComponents {
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

  // Parse address components (legacy API uses snake_case)
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
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [useNewAPI, setUseNewAPI] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [allowManualInput, setAllowManualInput] = useState(true);

  // Load Google Maps using modern importLibrary approach
  useEffect(() => {
    const loadGoogleMaps = async () => {
      // Check if already loaded
      if (window.google?.maps?.places) {
        // Check if new API is available
        if (window.google.maps.places.PlaceAutocompleteElement) {
          setUseNewAPI(true);
        }
        setIsScriptLoaded(true);
        return;
      }

      // Get API key
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
      if (!apiKey) {
        console.warn('Google Maps API key not found. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
        setAllowManualInput(true);
        return;
      }

      try {
        // Use modern importLibrary approach (recommended by Google)
        // This loads the Maps JavaScript API dynamically
        if (!window.google) {
          // Load the loader first
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Google Maps script'));
            document.head.appendChild(script);
          });
        }

        // Now import the places library using the modern API
        if (window.google?.maps?.importLibrary) {
          const placesLibrary = await window.google.maps.importLibrary('places') as google.maps.PlacesLibrary;
          
          // Check if new API is available (Place class with fetchFields method)
          if (placesLibrary && 'Place' in placesLibrary) {
            const Place = (placesLibrary as any).Place;
            if (Place && typeof Place.prototype?.fetchFields === 'function') {
              setUseNewAPI(true);
            }
          }
          
          setIsScriptLoaded(true);
        } else {
          // Fallback to legacy script loading
          console.warn('importLibrary not available, using legacy script loading');
          await loadLegacyScript(apiKey);
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setApiError('Failed to load Google Maps. You can still type your address manually.');
        setAllowManualInput(true);
        // Try legacy loading as fallback
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
        if (apiKey) {
          await loadLegacyScript(apiKey);
        }
      }
    };

    const loadLegacyScript = (apiKey: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if script already exists
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
          const checkLoaded = () => {
            if (window.google?.maps?.places) {
              setIsScriptLoaded(true);
              resolve();
            } else {
              setTimeout(checkLoaded, 100);
            }
          };
          checkLoaded();
          return;
        }

        const callbackName = `initGoogleMapsPlaces_${Date.now()}`;
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places&callback=${callbackName}`;
        script.async = true;
        script.defer = true;

        (window as any)[callbackName] = () => {
          setTimeout(() => {
            if (window.google?.maps?.places) {
              setIsScriptLoaded(true);
              delete (window as any)[callbackName];
              resolve();
            } else {
              reject(new Error('Places library not available'));
            }
          }, 100);
        };

        script.onerror = () => {
          delete (window as any)[callbackName];
          reject(new Error('Failed to load Google Maps script'));
        };

        document.head.appendChild(script);
      });
    };

    loadGoogleMaps();

    // Error handlers
    const handleWindowError = (event: ErrorEvent) => {
      const errorMessage = event.message || '';
      if (errorMessage.includes('RefererNotAllowedMapError') || 
          errorMessage.includes('RefererNotAllowed')) {
        setApiError('Google Maps API key is not authorized for this domain. Please update API key restrictions in Google Cloud Console.');
        setAllowManualInput(true);
        if (inputRef.current) {
          inputRef.current.disabled = false;
        }
      } else if (errorMessage.includes('Google Maps') || 
                 errorMessage.includes('Maps JavaScript API')) {
        setApiError('Google Maps API error detected. Manual input is available.');
        setAllowManualInput(true);
        if (inputRef.current) {
          inputRef.current.disabled = false;
        }
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || event.reason || '';
      const reasonStr = String(reason);
      if (reasonStr.includes('RefererNotAllowedMapError') || 
          reasonStr.includes('RefererNotAllowed') ||
          reasonStr.includes('Google Maps')) {
        setApiError('Google Maps API error detected. You can type your address manually.');
        setAllowManualInput(true);
        if (inputRef.current) {
          inputRef.current.disabled = false;
        }
      }
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Initialize autocomplete when script is loaded
  useEffect(() => {
    if (disabled || !isScriptLoaded || !inputRef.current) {
      return;
    }

    const initTimer = setTimeout(async () => {
      if (!window.google?.maps?.places) {
        setApiError('Google Maps Places library failed to load. You can still type your address manually.');
        setAllowManualInput(true);
        if (inputRef.current) {
          inputRef.current.disabled = false;
        }
        return;
      }

      try {
        if (!inputRef.current) {
          return;
        }

        // Try to use new API first (if available and supported)
        if (useNewAPI && window.google.maps.places.PlaceAutocompleteElement) {
          // PlaceAutocompleteElement is a web component - requires different handling
          // For now, we'll use the legacy Autocomplete which works better with React
          // TODO: Implement PlaceAutocompleteElement web component wrapper if needed
          console.log('New API available, but using legacy Autocomplete for React compatibility');
        }

        // Use legacy Autocomplete API (works with both old and new API keys)
        // This is the most compatible approach for React
        if (!window.google.maps.places.Autocomplete) {
          console.error('Google Maps Places Autocomplete is not available.');
          setApiError('Autocomplete is not available. You can still type your address manually.');
          setAllowManualInput(true);
          if (inputRef.current) {
            inputRef.current.disabled = false;
          }
          return;
        }

        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          fields: [
            'address_components',
            'formatted_address',
            'place_id',
            'geometry',
          ],
          componentRestrictions: undefined,
        });

        autocompleteRef.current = autocomplete;

        // Handle place selection
        autocomplete.addListener('place_changed', async () => {
          const placeResult = autocomplete.getPlace();
          
          if (!placeResult.address_components || !placeResult.formatted_address) {
            return;
          }

          setIsLoading(true);

          try {
            let components: AddressComponents;

            // Try to use new Place API if available
            if (useNewAPI && placeResult.place_id) {
              try {
                // Import places library to get Place class
                const placesLibrary = await window.google.maps.importLibrary('places') as google.maps.PlacesLibrary;
                if (placesLibrary && 'Place' in placesLibrary) {
                  const Place = placesLibrary.Place;
                  // Use new Place class with fetchFields (modern API)
                  const place = new Place({ id: placeResult.place_id });
                  await place.fetchFields({
                    fields: [
                      'id',
                      'formattedAddress',
                      'addressComponents',
                      'location',
                    ],
                  });

                  components = parseAddressComponentsFromPlace(place);
                } else {
                  // Fallback to legacy parsing
                  components = parseAddressComponentsFromPlaceResult(placeResult);
                }
              } catch (error) {
                // Fallback to legacy parsing
                console.warn('Failed to use new Place API, falling back to legacy:', error);
                components = parseAddressComponentsFromPlaceResult(placeResult);
              }
            } else {
              // Use legacy parsing
              components = parseAddressComponentsFromPlaceResult(placeResult);
            }

            // Update parent component
            onChange(components.formatted_address, components);
            onPlaceSelected?.(components);
          } catch (error) {
            console.error('Error processing place:', error);
            // Fallback to basic parsing
            const components = parseAddressComponentsFromPlaceResult(placeResult);
            onChange(components.formatted_address, components);
            onPlaceSelected?.(components);
          } finally {
            setIsLoading(false);
          }
        });

      } catch (error) {
        console.error('Error initializing Google Places Autocomplete:', error);
        setApiError('Failed to initialize address autocomplete. You can still type your address manually.');
        setAllowManualInput(true);
        if (inputRef.current) {
          inputRef.current.disabled = false;
        }
      }
    }, 200);

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
  }, [isScriptLoaded, disabled, onChange, onPlaceSelected, useNewAPI]);

  // Handle manual input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };
  
  // Ensure input is always enabled for manual typing
  useEffect(() => {
    const ensureInputEnabled = () => {
      if (inputRef.current && !disabled) {
        inputRef.current.disabled = false;
      }
    };
    
    ensureInputEnabled();
    const interval = setInterval(ensureInputEnabled, 500);
    
    return () => clearInterval(interval);
  }, [disabled, apiError, allowManualInput]);

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
          disabled={disabled}
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
