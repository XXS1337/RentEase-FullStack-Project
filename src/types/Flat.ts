// Interface representing a flat in the system.
export interface Flat {
  adTitle: string; // Title or name of the flat
  city: string; // City where the flat is located
  streetName: string; // Name of the street
  streetNumber: number; // Street number
  areaSize: number; // Area size in m²
  hasAC: boolean; // Whether the flat has AC
  yearBuilt: number; // Year the flat was built
  rentPrice: number; // Rental price
  dateAvailable: string; // Date when the flat is available
  image: string; // Image filename or URL
  ownerID: string; // User ID of the owner
  isFavorite?: boolean; // Optional: Whether the flat is a favorite
  createdAt: number; // Timestamp when the flat was added
  updatedAt?: number; // Optional: Timestamp of the last update
}

export interface FieldErrors {
  adTitle?: string;
  city?: string;
  streetName?: string;
  streetNumber?: string;
  areaSize?: string;
  yearBuilt?: string;
  rentPrice?: string;
  dateAvailable?: string;
  image?: string;
  general?: string;
}

export interface FormData {
  adTitle: string;
  city: string;
  streetName: string;
  streetNumber: string;
  areaSize: string;
  yearBuilt: string;
  rentPrice: string;
  dateAvailable: string;
  image: File | null;
  hasAC: boolean;
}
