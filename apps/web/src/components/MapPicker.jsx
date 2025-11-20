import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapUpdater({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], map.getZoom());
    }
  }, [center, map]);
  
  return null;
}

function LocationMarker({ position, setPosition, radiusKm }) {
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

  return position ? (
    <>
      <Marker position={[position.lat, position.lng]} />
      <Circle
        center={[position.lat, position.lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: 'var(--accent)', fillColor: 'var(--accent)', fillOpacity: 0.1 }}
      />
    </>
  ) : null;
}

export default function MapPicker({ center, onCenterChange, radiusKm = 2 }) {
  const { t } = useTranslation();
  const [position, setPosition] = useState(center || { lat: 41.3879, lng: 2.16992 }); 
  const [isLocating, setIsLocating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    if (center && (center.lat !== position.lat || center.lng !== position.lng)) {
      setPosition(center);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center]);

  useEffect(() => {
    setMapKey(prev => prev + 1);
  }, [position]);

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
    <>
      <div className="map-picker-compact" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          className="map-preview"
          onClick={() => setIsExpanded(true)}
          style={{
            aspectRatio: '3 / 2',
            borderRadius: 8,
            overflow: 'hidden',
            cursor: 'pointer',
            position: 'relative',
            border: '2px solid var(--border-color, #e0e0e0)',
            transition: 'border-color 0.2s, transform 0.2s',
            maxHeight: 220,
            width: '100%',
            maxWidth: 480
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color, #e0e0e0)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <MapContainer
            key={`preview-${mapKey}`}
            center={[position.lat, position.lng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            dragging={false}
            zoomControl={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={position} />
            <Marker position={[position.lat, position.lng]} />
            <Circle
              center={[position.lat, position.lng]}
              radius={radiusKm * 1000}
              pathOptions={{ color: 'var(--accent)', fillColor: 'var(--accent)', fillOpacity: 0.1 }}
            />
          </MapContainer>
          
          <div
            style={{
              position: 'absolute',
              bottom: 6,
              left: 6,
              right: 6,
              background: 'var(--cardSoft)',
              backdropFilter: 'blur(4px)',
              padding: '5px 8px',
              borderRadius: 6,
              fontSize: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <span className="tiny">📍 {position.lat.toFixed(4)}, {position.lng.toFixed(4)}</span>
            <span className="tiny" style={{ color: '#666' }}>🔍 {t('click_to_adjust')}</span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div
          className="map-modal-overlay"
          onClick={() => setIsExpanded(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            className="map-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--cardSoft)",
              borderRadius: 12,
              padding: 20,
              maxWidth: 'min(800px, 95vw)',
              width: '100%',
              maxHeight: 'min(100vh, 1000px)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              animation: 'slideUp 0.3s ease-out'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16, position: 'relative' }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: 18, 
                color: 'var(--text-color)', 
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                pointerEvents: 'none'
              }}>
                {t('zone')}
              </h3>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setIsExpanded(false)}
                style={{ padding: '6px 12px' }}
              >
                ✕ {t('close')}
              </button>
            </div>

            <button
              type="button"
              className="btn btn--ghost btn--mini"
              onClick={getCurrentLocation}
              disabled={isLocating}
              style={{ width: '100%', marginBottom: 12 }}
            >
              {isLocating ? '⏳' : '📍'} {t('use_my_location')}
            </button>

            <div style={{ flex: 1, minHeight: 0, marginBottom: 12 }}>
              <MapContainer
                center={[position.lat, position.lng]}
                zoom={14}
                style={{ height: '100%', width: '100%', borderRadius: 8, minHeight: 400 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker position={position} setPosition={handlePositionChange} radiusKm={radiusKm} />
              </MapContainer>
            </div>

            <div className="small muted" style={{ marginBottom: 8, textAlign: 'center' }}>
              💡 {t('map_hint')}
            </div>

            <div className="small" style={{ marginBottom: 12, textAlign: 'center', color: 'var(--text-color)' }}>
              📍 {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            </div>

            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setIsExpanded(false)}
              style={{ width: '100%' }}
            >
              ✓ {t('confirm_location')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}