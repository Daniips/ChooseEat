import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';

// Fix para iconos de Leaflet (Vite/Webpack issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], map.getZoom());
    }
  }, [position, map]);

  return position ? <Marker position={[position.lat, position.lng]} /> : null;
}

export default function MapPicker({ center, onCenterChange }) {
  const { t } = useTranslation();
  const [position, setPosition] = useState(center || { lat: 41.3879, lng: 2.16992 }); 
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (center && (center.lat !== position.lat || center.lng !== position.lng)) {
      setPosition(center);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center]);

  const handlePositionChange = (newPos) => {
    setPosition(newPos);
    onCenterChange?.(newPos);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(t('geolocation_not_supported') || 'Geolocalización no soportada');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        handlePositionChange(newPos);
        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert(t('geolocation_error') || 'No se pudo obtener tu ubicación');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="map-picker">
      <div className="map-picker__controls">
        <button
          type="button"
          className="btn btn--ghost btn--mini"
          onClick={getCurrentLocation}
          disabled={isLocating}
        >
          {isLocating ? '⏳' : '📍'} {t('use_my_location') || 'Usar mi ubicación'}
        </button>
        <div className="small muted">
          {position && `📍 ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`}
        </div>
      </div>

      <MapContainer
        center={[position.lat, position.lng]}
        zoom={14}
        style={{ height: '400px', width: '100%', borderRadius: '8px', marginTop: '12px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={handlePositionChange} />
      </MapContainer>

      <div className="small muted" style={{ marginTop: '8px' }}>
        💡 {t('map_hint') || 'Haz clic en el mapa para cambiar la ubicación'}
      </div>
    </div>
  );
}