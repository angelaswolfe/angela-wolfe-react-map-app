"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { 
  Typography, 
  Container, 
  Box, 
  Paper, 
  TextField, 
  InputAdornment, 
  List, 
  ListItem, 
  Divider, 
  Chip,
  IconButton,
  Button,
  Autocomplete,
  CircularProgress,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Fade,
  Skeleton,
  useTheme,
  alpha
} from '@mui/material';
import { 
  Search as SearchIcon,
  Place as PlaceIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  MyLocation as MyLocationIcon,
  TravelExplore as TravelExploreIcon,
  LocationOn as LocationOnIcon,
  Explore as ExploreIcon
} from '@mui/icons-material';

// Dynamically import the LeafletMap component with no SSR
const LeafletMap = dynamic(
  () => import("@/components/map.component"),
  { 
    ssr: false,
    loading: () => (
      <Box sx={{ height: 480, width: '100%', borderRadius: 2, overflow: 'hidden' }}>
        <Skeleton variant="rectangular" width="100%" height="100%" animation="wave" />
      </Box>
    )
  }
);

// Sample location data
const sampleLocations = [
  { id: 1, name: "Central Park", address: "New York, NY", lat: 40.785091, lng: -73.968285, favorite: true },
  { id: 2, name: "Golden Gate Park", address: "San Francisco, CA", lat: 37.7694, lng: -122.4862, favorite: false },
  { id: 3, name: "Millennium Park", address: "Chicago, IL", lat: 41.8826, lng: -87.6226, favorite: true },
];

// OpenStreetMap Nominatim geocoding search
interface NominatimResponse {
  place_id?: string;
  display_name: string;
  lat: string;
  lon: string;
}

interface GeocodeResult {
  place_id: string;
  description: string;
  lat: number;
  lng: number;
}

const geocodingSearch = async (query: string): Promise<GeocodeResult[]> => {
  if (!query || query.length < 2) return [];
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'TravelSpots App'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch suggestions');
    }
    
    const data: NominatimResponse[] = await response.json();
    
    return data.map((item: NominatimResponse, index: number): GeocodeResult => ({
      place_id: item.place_id || index.toString(),
      description: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon)
    }));
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
};

// Reverse geocoding to get address from coordinates
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'User-Agent': 'TravelSpots App'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to reverse geocode');
    }
    
    const data = await response.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

interface Suggestion {
  place_id: string;
  description: string;
  lat: number;
  lng: number;
}

interface Location {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  favorite: boolean;
}

export default function Home() {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [locations, setLocations] = useState(sampleLocations);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.8283, -98.5795]);
  const [mapZoom, setMapZoom] = useState(4);
  
  // State for autocomplete
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State for notifications
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Debounce search for autocomplete
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchInput) {
        setLoading(true);
        const results = await geocodingSearch(searchInput);
        setSuggestions(results);
        setLoading(false);
      } else {
        setSuggestions([]);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchInput]);
  
  // Filter locations based on search term
  const filteredLocations = locations.filter(location => 
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.address.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Toggle favorite status
  const toggleFavorite = (id: number) => {
    setLocations(locations.map(location => 
      location.id === id ? {...location, favorite: !location.favorite} : location
    ));
  };
  
  // Find my location
  const findMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        setMapZoom(15);
      });
    } else {
      setNotification({
        open: true,
        message: 'Geolocation is not supported by this browser.',
        severity: 'error'
      });
    }
  };
  
  // Handle selection of a location from the sidebar
  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location.id);
    setMapCenter([location.lat, location.lng]);
    setMapZoom(15);
  };
  
  // Handle selection of a place from autocomplete
  const handlePlaceSelect = (event: React.SyntheticEvent, suggestion: Suggestion | string | null) => {
    if (suggestion && typeof suggestion !== 'string') {
      setMapCenter([suggestion.lat, suggestion.lng]);
      setMapZoom(14);
      setSelectedLocation(null);
    }
  };

  // Handle double-click on map to zoom in
  const handleMapDoubleClick = async (lat: number, lng: number) => {
    const currentZoom = mapZoom;
    const newZoom = Math.min(currentZoom + 2, 18);
    
    setMapCenter([lat, lng]);
    setMapZoom(newZoom);
  };

  // Handle adding location from context menu
  const handleAddLocation = async (lat: number, lng: number) => {
    try {
      const address = await reverseGeocode(lat, lng);
      const name = address.split(',')[0] || 'Custom Location';
      
      const newLocation: Location = {
        id: Date.now(),
        name: name,
        address: address,
        lat: lat,
        lng: lng,
        favorite: false
      };
      
      setLocations(prev => [...prev, newLocation]);
      setSelectedLocation(newLocation.id);
      
      setNotification({
        open: true,
        message: 'New location added to map!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error adding location:', error);
      setNotification({
        open: true,
        message: 'Error adding location',
        severity: 'error'
      });
    }
  };

  // Handle centering map from context menu
  const handleCenterMap = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    setSelectedLocation(null);
  };

  // Handle zoom in from context menu
  const handleZoomIn = (lat: number, lng: number) => {
    const currentZoom = mapZoom;
    const newZoom = Math.min(currentZoom + 2, 18);
    setMapCenter([lat, lng]);
    setMapZoom(newZoom);
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
        py: 4
      }}
    >
      <Container maxWidth="xl">
        {/* Header Section */}
        <Fade in={true} timeout={800}>
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <TravelExploreIcon 
                sx={{ 
                  fontSize: 48, 
                  color: 'primary.main', 
                  mr: 2,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }} 
              />
              <Typography 
                variant="h2" 
                component="h1" 
                sx={{ 
                  fontWeight: 700,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.5px'
                }}
              >
                TravelSpots
              </Typography>
            </Box>
          </Box>
        </Fade>
        
        <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', lg: 'row' } }}>
          {/* Sidebar */}
          <Fade in={true} timeout={1000}>
            <Card 
              elevation={0}
              sx={{ 
                width: { xs: '100%', lg: 380 },
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(10px)',
                height: 'fit-content'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                {/* Search Section */}
                <Box sx={{ mb: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <ExploreIcon color="primary" />
                    Explore Locations
                  </Typography>
                  
                  <Autocomplete
                    freeSolo
                    options={suggestions}
                    getOptionLabel={(option) => typeof option === 'string' ? option : option.description}
                    loading={loading}
                    onChange={handlePlaceSelect}
                    onInputChange={(event, newInputValue) => {
                      setSearchInput(newInputValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        placeholder="Search for any location..."
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: alpha(theme.palette.background.default, 0.5),
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.background.default, 0.8),
                            },
                            '&.Mui-focused': {
                              backgroundColor: theme.palette.background.default,
                            }
                          }
                        }}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <InputAdornment position="start">
                                <SearchIcon color="action" />
                              </InputAdornment>
                              {params.InputProps.startAdornment}
                            </>
                          ),
                          endAdornment: (
                            <>
                              {loading ? <CircularProgress color="primary" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <ListItem 
                          key={key} 
                          {...otherProps} 
                          dense
                          sx={{
                            borderRadius: 1,
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.05)
                            }
                          }}
                        >
                          <LocationOnIcon fontSize="small" color="primary" sx={{ mr: 1.5 }} />
                          <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                            {option.description}
                          </Typography>
                        </ListItem>
                      );
                    }}
                  />
                </Box>

                <Divider sx={{ my: 3, opacity: 0.3 }} />

                {/* Saved Locations Section */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <PlaceIcon color="primary" />
                      Saved Places
                    </Typography>
                    <Button 
                      startIcon={<MyLocationIcon />}
                      size="small"
                      variant="outlined"
                      onClick={findMyLocation}
                      sx={{ 
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500
                      }}
                    >
                      Find Me
                    </Button>
                  </Box>
                  
                  <TextField
                    fullWidth
                    placeholder="Filter your locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.background.default, 0.5),
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''}
                    </Typography>
                    <Chip 
                      icon={<FavoriteIcon fontSize="small" />} 
                      label={`${locations.filter(l => l.favorite).length} favorites`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ borderRadius: 2 }}
                    />
                  </Box>
                  
                  <List sx={{ maxHeight: 400, overflow: 'auto', px: 0 }}>
                    {filteredLocations.map((location, index) => (
                      <Fade in={true} timeout={300 + index * 100} key={location.id}>
                        <Paper
                          elevation={selectedLocation === location.id ? 2 : 0}
                          sx={{ 
                            mb: 1,
                            borderRadius: 2,
                            border: selectedLocation === location.id 
                              ? `2px solid ${theme.palette.primary.main}`
                              : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            backgroundColor: selectedLocation === location.id 
                              ? alpha(theme.palette.primary.main, 0.05)
                              : 'transparent',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': { 
                              transform: 'translateY(-1px)',
                              boxShadow: theme.shadows[2],
                              backgroundColor: selectedLocation === location.id 
                                ? alpha(theme.palette.primary.main, 0.08)
                                : alpha(theme.palette.action.hover, 0.5)
                            }
                          }}
                        >
                          <ListItem 
                            disablePadding
                            secondaryAction={
                              <IconButton 
                                edge="end" 
                                aria-label="favorite"
                                onClick={() => toggleFavorite(location.id)}
                                sx={{
                                  transition: 'transform 0.2s ease-in-out',
                                  '&:hover': {
                                    transform: 'scale(1.1)'
                                  }
                                }}
                              >
                                {location.favorite ? 
                                  <FavoriteIcon sx={{ color: '#e91e63' }} /> : 
                                  <FavoriteBorderIcon color="action" />}
                              </IconButton>
                            }
                          >
                            <Box 
                              sx={{ 
                                p: 2, 
                                width: '100%', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5
                              }}
                              onClick={() => handleLocationSelect(location)}
                            >
                              <LocationOnIcon 
                                color={selectedLocation === location.id ? 'primary' : 'action'} 
                                fontSize="small" 
                              />
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography 
                                  variant="subtitle2" 
                                  sx={{ 
                                    fontWeight: 600,
                                    color: selectedLocation === location.id ? 'primary.main' : 'text.primary'
                                  }}
                                >
                                  {location.name}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary" 
                                  sx={{ 
                                    fontSize: '0.8rem',
                                    opacity: 0.8
                                  }}
                                >
                                  {location.address}
                                </Typography>
                              </Box>
                            </Box>
                          </ListItem>
                        </Paper>
                      </Fade>
                    ))}
                    {filteredLocations.length === 0 && (
                      <Box sx={{ py: 4, textAlign: 'center' }}>
                        <ExploreIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          No locations found
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          Try adjusting your search or add new places
                        </Typography>
                      </Box>
                    )}
                  </List>
                </Box>
              </CardContent>
            </Card>
          </Fade>
          
          {/* Map Section */}
          <Fade in={true} timeout={1200}>
            <Card 
              elevation={0}
              sx={{ 
                flexGrow: 1,
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(10px)',
                overflow: 'hidden'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography 
                    variant="h5" 
                    component="h2" 
                    sx={{ 
                      fontWeight: 600,
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1.5
                    }}
                  >
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <PlaceIcon color="primary" />
                    </Box>
                    Interactive Map
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      icon={<LocationOnIcon fontSize="small" />} 
                      label={`${locations.length} locations`}
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: 2 }}
                    />
                    <Chip 
                      icon={<FavoriteIcon fontSize="small" />} 
                      label={`${locations.filter(l => l.favorite).length} favorites`}
                      size="small"
                      color="primary"
                      variant="filled"
                      sx={{ borderRadius: 2 }}
                    />
                  </Box>
                </Box>
                
                <Paper
                  elevation={1}
                  sx={{ 
                    height: 520, 
                    width: '100%', 
                    borderRadius: 2, 
                    overflow: 'hidden',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    position: 'relative'
                  }}
                >
                  <LeafletMap 
                    center={mapCenter} 
                    zoom={mapZoom} 
                    markers={locations}
                    selectedId={selectedLocation}
                    onDoubleClick={handleMapDoubleClick}
                    onAddLocation={handleAddLocation}
                    onCenterMap={handleCenterMap}
                    onZoomIn={handleZoomIn}
                  />
                </Paper>
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
                    💡 Double-click to zoom in • Right-click for menu options
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      size="small" 
                      label="Interactive" 
                      color="success" 
                      variant="outlined"
                      sx={{ borderRadius: 2, fontSize: '0.7rem' }}
                    />
                    <Chip 
                      size="small" 
                      label="Real-time" 
                      color="info" 
                      variant="outlined"
                      sx={{ borderRadius: 2, fontSize: '0.7rem' }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Fade>
        </Box>
        
        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={4000}
          onClose={() => setNotification({ ...notification, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setNotification({ ...notification, open: false })} 
            severity={notification.severity}
            variant="filled"
            sx={{ 
              width: '100%',
              borderRadius: 2,
              fontWeight: 500
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}