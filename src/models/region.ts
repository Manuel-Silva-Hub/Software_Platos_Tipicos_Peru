// src/models/region.ts
// Represents a region in the application.

export interface Region {
  id: number;
  name: string;
  lat: number;
  lng: number;
  description: string;
  photo_url: string;
}
