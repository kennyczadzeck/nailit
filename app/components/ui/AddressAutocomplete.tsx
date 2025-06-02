'use client';

import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    initGoogleMaps: () => void;
    googleMapsLoading: boolean;
    googleMapsCallbacks: (() => void)[];
  }
}

interface AddressData {
  placeId: string;
  lat?: number;
  lng?: number;
  formattedAddress?: string;
  streetNumber?: string;
  route?: string;
  locality?: string;
  administrativeAreaLevel1?: string;
  country?: string;
  postalCode?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string, addressData?: AddressData) => void;
  placeholder?: string;
  className?: string;
  apiKey: string;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Enter address...",
  className = "",
  apiKey
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [lastSelectedAddress, setLastSelectedAddress] = useState('');

  // Load Google Maps API with duplicate prevention
  useEffect(() => {
    // If already loaded, set state and return
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsGoogleMapsLoaded(true);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      // Script exists, wait for it to load
      if (!window.googleMapsCallbacks) {
        window.googleMapsCallbacks = [];
      }
      window.googleMapsCallbacks.push(() => setIsGoogleMapsLoaded(true));
      return;
    }

    // Check if already loading
    if (window.googleMapsLoading) {
      if (!window.googleMapsCallbacks) {
        window.googleMapsCallbacks = [];
      }
      window.googleMapsCallbacks.push(() => setIsGoogleMapsLoaded(true));
      return;
    }

    // Mark as loading and create script
    window.googleMapsLoading = true;
    window.googleMapsCallbacks = [() => setIsGoogleMapsLoaded(true)];

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    window.initGoogleMaps = () => {
      window.googleMapsLoading = false;
      // Call all waiting callbacks
      if (window.googleMapsCallbacks) {
        window.googleMapsCallbacks.forEach(callback => callback());
        window.googleMapsCallbacks = [];
      }
    };
    
    script.onload = window.initGoogleMaps;
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      window.googleMapsLoading = false;
    };
    
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [apiKey]);

  // Initialize autocomplete when Google Maps is loaded
  useEffect(() => {
    if (!isGoogleMapsLoaded || !inputRef.current || autocompleteRef.current) {
      return;
    }

    // Initialize autocomplete with options
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ['address_components', 'formatted_address', 'geometry', 'place_id'],
      types: ['address'],
      componentRestrictions: { country: 'us' } // Restrict to US, modify as needed
    });

    autocompleteRef.current = autocomplete;

    // Listen for place selection
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (!place.geometry) {
        console.warn('Place has no geometry');
        return;
      }

      // Parse address components
      const addressData = parseAddressComponents(place);
      
      // Mark as autocomplete selection and preserve the formatted address
      const selectedAddress = place.formatted_address || '';
      setLastSelectedAddress(selectedAddress);
      
      // Use setTimeout to ensure this happens after any pending state updates
      setTimeout(() => {
        onChange(selectedAddress, addressData);
      }, 0);
    });

    // Cleanup function
    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isGoogleMapsLoaded, onChange]);

  // Parse Google Places address components
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseAddressComponents = (place: any): AddressData => {
    const components = place.address_components || [];
    
    const getComponent = (types: string[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const component = components.find((comp: any) => 
        comp.types.some((type: string) => types.includes(type))
      );
      return component?.long_name || '';
    };

    return {
      formattedAddress: place.formatted_address || '',
      placeId: place.place_id || '',
      lat: place.geometry?.location?.lat(),
      lng: place.geometry?.location?.lng(),
      streetNumber: getComponent(['street_number']),
      route: getComponent(['route']),
      locality: getComponent(['locality', 'administrative_area_level_2']),
      administrativeAreaLevel1: getComponent(['administrative_area_level_1']),
      country: getComponent(['country']),
      postalCode: getComponent(['postal_code'])
    };
  };

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  // Handle input focus - no special handling needed
  const handleFocus = () => {
    // No special handling needed - let user edit freely
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleInputChange}
      onFocus={handleFocus}
      placeholder={placeholder}
      className={`w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm ${className}`}
    />
  );
}; 