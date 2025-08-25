"use client";

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { 
  AddLocation as AddLocationIcon, 
  MyLocation as MyLocationIcon, 
  ZoomIn as ZoomInIcon 
} from '@mui/icons-material';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon issues in React Leaflet
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Create custom icons for regular and favorite locations
const createCustomIcon = (isFavorite: boolean) => {
  return new L.Icon({
    iconUrl: isFavorite 
      ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png'
      : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

// Component to handle smooth map view updates
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const previousCenter = useRef<[number, number]>(center);
  const previousZoom = useRef<number>(zoom);
  
  useEffect(() => {
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    
    const centerChanged = Math.abs(currentCenter.lat - center[0]) > 0.0001 || 
                         Math.abs(currentCenter.lng - center[1]) > 0.0001;
    const zoomChanged = Math.abs(currentZoom - zoom) > 0.1;
    
    if (centerChanged || zoomChanged) {
      map.flyTo(center, zoom, {
        duration: 1.5,
        easeLinearity: 0.25,
        animate: true
      });
    }
    
    previousCenter.current = center;
    previousZoom.current = zoom;
  }, [center, zoom, map]);
  
  return null;
}

// Component to handle map events
function MapEventHandler({ 
  onDoubleClick, 
  onRightClick 
}: { 
  onDoubleClick?: (lat: number, lng: number) => void;
  onRightClick?: (lat: number, lng: number, clientX: number, clientY: number) => void;
}) {
  useMapEvents({
    dblclick(e) {
      console.log('Double click detected at:', e.latlng);
      const { lat, lng } = e.latlng;
      if (onDoubleClick) {
        onDoubleClick(lat, lng);
      }
    },
    contextmenu(e) {
      e.originalEvent.preventDefault(); // Prevent default browser context menu
      console.log('Right click detected at:', e.latlng);
      const { lat, lng } = e.latlng;
      // Use the original mouse event coordinates for proper positioning
      const { clientX, clientY } = e.originalEvent;
      if (onRightClick) {
        onRightClick(lat, lng, clientX, clientY);
      }
    }
  });
  
  return null;
}

interface ContextMenuProps {
  open: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onAddLocation: () => void;
  onZoomIn: () => void;
  onCenterHere: () => void;
}

function ContextMenu({ open, position, onClose, onAddLocation, onZoomIn, onCenterHere }: ContextMenuProps) {
  return (
    <Menu
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={{ top: position.y, left: position.x }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      sx={{ '& .MuiPaper-root': { minWidth: 150 } }}
    >
      <MenuItem onClick={onAddLocation}>
        <ListItemIcon>
          <AddLocationIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Add Location</ListItemText>
      </MenuItem>
      <MenuItem onClick={onCenterHere}>
        <ListItemIcon>
          <MyLocationIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Center Here</ListItemText>
      </MenuItem>
      <MenuItem onClick={onZoomIn}>
        <ListItemIcon>
          <ZoomInIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Zoom In</ListItemText>
      </MenuItem>
    </Menu>
  );
}

interface MapComponentProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    id: string | number;
    lat: number;
    lng: number;
    name: string;
    address: string;
    favorite: boolean;
  }>;
  selectedId?: string | number | null;
  onDoubleClick?: (lat: number, lng: number) => void;
  onAddLocation?: (lat: number, lng: number) => void;
  onCenterMap?: (lat: number, lng: number) => void;
  onZoomIn?: (lat: number, lng: number) => void;
}

export default function MapComponent({ 
  center = [39.8283, -98.5795],
  zoom = 4,
  markers = [],
  selectedId = null,
  onDoubleClick,
  onAddLocation,
  onCenterMap,
  onZoomIn
}: MapComponentProps) {
  const mapRef = useRef(null);
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    position: { x: number; y: number };
    lat: number;
    lng: number;
  }>({
    open: false,
    position: { x: 0, y: 0 },
    lat: 0,
    lng: 0
  });

  const handleRightClick = (lat: number, lng: number, clientX: number, clientY: number) => {
    setContextMenu({
      open: true,
      position: { x: clientX, y: clientY }, // Use client coordinates directly
      lat,
      lng
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(prev => ({ ...prev, open: false }));
  };

  const handleAddLocation = () => {
    if (onAddLocation) {
      onAddLocation(contextMenu.lat, contextMenu.lng);
    }
    handleContextMenuClose();
  };

  const handleCenterHere = () => {
    if (onCenterMap) {
      onCenterMap(contextMenu.lat, contextMenu.lng);
    }
    handleContextMenuClose();
  };

  const handleZoomIn = () => {
    if (onZoomIn) {
      onZoomIn(contextMenu.lat, contextMenu.lng);
    }
    handleContextMenuClose();
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        doubleClickZoom={false}
        zoomControl={true}
        scrollWheelZoom={true}
        touchZoom={true}
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {markers.map(marker => (
          <Marker 
            key={`marker-${marker.id}`}
            position={[marker.lat, marker.lng]}
            icon={createCustomIcon(marker.favorite)}
          >
            <Popup>
              <div>
                <strong>{marker.name}</strong>
                <div>{marker.address}</div>
                <div style={{ fontSize: '0.8em', marginTop: '8px' }}>
                  Lat: {marker.lat.toFixed(4)}, Lng: {marker.lng.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        
        <MapUpdater center={center} zoom={zoom} />
        <MapEventHandler 
          onDoubleClick={onDoubleClick} 
          onRightClick={handleRightClick}
        />
      </MapContainer>
      
      <ContextMenu 
        open={contextMenu.open}
        position={contextMenu.position}
        onClose={handleContextMenuClose}
        onAddLocation={handleAddLocation}
        onCenterHere={handleCenterHere}
        onZoomIn={handleZoomIn}
      />
    </div>
  );
}