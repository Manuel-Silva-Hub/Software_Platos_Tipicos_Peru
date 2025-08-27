// src/views/components/MapView.tsx
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet icons (because Vite doesn't resolve paths well by default)
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png";

// Setting a default icon for map markers
const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Defines the default icon for all Leaflet markers
L.Marker.prototype.options.icon = DefaultIcon;

// Type definition (interface) for region markers
type RegionMarker = {
  id?: number;
  name: string;
  lat: number;
  lng: number;
  count?: number;
};

// Defining the properties that the MapView component receives
type Props = {
  regionMarkers: RegionMarker[];
};

// Main component that displays the map with the region markers
export function MapView({ regionMarkers }: Props) {
  // If there are no markers available, a message is displayed instead of the map
  if (!regionMarkers || regionMarkers.length === 0) {
    return (
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        No hay regiones disponibles.
      </p>
    );
  }

  // Rendering the map with the markers
  return (
    <div style={{ width: "100%", height: "400px", marginTop: "1rem" }}>
      <MapContainer
        center={[-9.19, -75.015]} // centro de Perú
        zoom={5}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {regionMarkers.map((r) => (
          <Marker key={r.id ?? r.name} position={[r.lat, r.lng]}>
            <Popup>
              <strong>{r.name}</strong>
              <br />
              {r.count ?? 0} platos
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
