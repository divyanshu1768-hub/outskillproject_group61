import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';

interface Location {
  name: string;
  lat: number;
  lng: number;
  type: 'departure' | 'destination' | 'stop';
  day?: number;
}

interface TripMapProps {
  departure: string;
  destination: string;
  stops?: string[];
}

const departureIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const destinationIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const stopIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

async function geocodeLocation(locationName: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export function TripMap({ departure, destination, stops = [] }: TripMapProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadLocations() {
      setIsLoading(true);
      const locationPromises: Promise<Location | null>[] = [];

      locationPromises.push(
        geocodeLocation(departure).then(coords =>
          coords ? { name: departure, ...coords, type: 'departure' as const } : null
        )
      );

      locationPromises.push(
        geocodeLocation(destination).then(coords =>
          coords ? { name: destination, ...coords, type: 'destination' as const } : null
        )
      );

      stops.forEach((stop, index) => {
        locationPromises.push(
          geocodeLocation(stop).then(coords =>
            coords ? { name: stop, ...coords, type: 'stop' as const, day: index + 2 } : null
          )
        );
      });

      const results = await Promise.all(locationPromises);
      const validLocations = results.filter((loc): loc is Location => loc !== null);
      setLocations(validLocations);
      setIsLoading(false);
    }

    loadLocations();
  }, [departure, destination, stops]);

  if (isLoading) {
    return (
      <div className="w-full h-[400px] bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  if (locations.length < 2) {
    return (
      <div className="w-full h-[400px] bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-gray-600">Unable to load map locations</p>
      </div>
    );
  }

  const center = {
    lat: locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length,
    lng: locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length
  };

  const lineCoordinates: [number, number][] = locations.map(loc => [loc.lat, loc.lng]);

  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden shadow-lg border border-gray-200">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {lineCoordinates.length > 1 && (
          <Polyline
            positions={lineCoordinates}
            color="#3b82f6"
            weight={3}
            opacity={0.7}
          />
        )}

        {locations.map((location, index) => (
          <Marker
            key={index}
            position={[location.lat, location.lng]}
            icon={
              location.type === 'departure'
                ? departureIcon
                : location.type === 'destination'
                ? destinationIcon
                : stopIcon
            }
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-gray-900">{location.name}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {location.type === 'departure' && 'Starting Point'}
                  {location.type === 'destination' && 'Final Destination'}
                  {location.type === 'stop' && `Day ${location.day} Stop`}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
