import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import config from '../config';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker creator for bins based on waste level
const createBinMarker = (wasteLevel) => {
    const color = (() => {
        if (wasteLevel > 75) return '#ff0000';
        if (wasteLevel > 50) return '#ffa500';
        if (wasteLevel > 25) return '#ffff00';
        return '#00ff00';
    })();

    return L.divIcon({
        className: 'custom-bin-marker',
        html: `<div style="
            width: 20px;
            height: 20px;
            background-color: ${color};
            border: 2px solid #000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: ${wasteLevel > 50 ? '#fff' : '#000'};
        ">${wasteLevel}%</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
    });
};

// Custom marker for trucks
const truckIcon = L.divIcon({
    className: 'custom-truck-marker',
    html: `<div style="
        width: 30px;
        height: 30px;
        background-color: #4a90e2;
        border: 2px solid #2c3e50;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
    ">🚛</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
});

// Helper component to update map view when coordinates change
function MapUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center);
    }, [center, map]);
    return null;
}

const MapView = () => {
    const [bins, setBins] = useState([]);
    const [trucks, setTrucks] = useState([]);
    const [center, setCenter] = useState([40.7128, -74.0060]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [binsResponse, trucksResponse] = await Promise.all([
                fetch(`${config.apiUrl}/api/bins`),
                fetch(`${config.apiUrl}/api/trucks`)
            ]);

            if (!binsResponse.ok || !trucksResponse.ok) {
                throw new Error('Failed to fetch data');
            }

            const [binsData, trucksData] = await Promise.all([
                binsResponse.json(),
                trucksResponse.json()
            ]);

            setBins(binsData);
            setTrucks(trucksData);
            setError(null);
        } catch (err) {
            setError('Failed to fetch data. Please try again.');
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Set up polling interval
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    // Function to get color based on waste level
    const getWasteLevelColor = (level) => {
        if (level > 75) return '#ff0000';
        if (level > 50) return '#ffa500';
        if (level > 25) return '#ffff00';
        return '#00ff00';
    };

    const simulateStep = async () => {
        try {
            const response = await fetch(`${config.apiUrl}/api/simulate/step`, {
                method: 'POST',
            });
            
            if (!response.ok) {
                throw new Error('Simulation failed');
            }
            
            const result = await response.json();
            console.log('Simulation result:', result);
            
            // Refresh data after simulation
            await fetchData();
        } catch (error) {
            setError('Simulation failed. Please try again.');
            console.error('Error during simulation:', error);
        }
    };

    return (
        <div className="map-container" style={{ height: '80vh', width: '100%' }}>
            <div className="controls" style={{ margin: '10px', position: 'absolute', zIndex: 1000 }}>
                {error && (
                    <div style={{
                        backgroundColor: '#ff6b6b',
                        color: 'white',
                        padding: '10px',
                        borderRadius: '5px',
                        marginBottom: '10px'
                    }}>
                        {error}
                    </div>
                )}
                <button 
                    onClick={simulateStep}
                    disabled={loading}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        backgroundColor: loading ? '#cccccc' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Loading...' : 'Run Simulation Step'}
                </button>
            </div>
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapUpdater center={center} />
                
                {/* Render Bins */}
                {bins.map((bin) => (
                    <Marker
                        key={bin.id}
                        position={[bin.lat, bin.lon]}
                        icon={createBinMarker(bin.waste_level)}
                        opacity={bin.is_collected ? 0.5 : 1}
                    >
                        <Popup>
                            <div style={{ padding: '5px', textAlign: 'center' }}>
                                <h3 style={{ margin: '0 0 5px 0' }}>Bin #{bin.id}</h3>
                                <div style={{
                                    backgroundColor: getWasteLevelColor(bin.waste_level),
                                    padding: '5px',
                                    borderRadius: '3px',
                                    marginBottom: '5px'
                                }}>
                                    <strong>Waste Level: {bin.waste_level}%</strong>
                                </div>
                                <p style={{ 
                                    margin: '5px 0',
                                    color: bin.is_collected ? '#888' : '#000'
                                }}>
                                    Status: {bin.is_collected ? 'Collected' : 'Not Collected'}
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Render Trucks */}
                {trucks.map((truck) => (
                    <Marker
                        key={truck.id}
                        position={[truck.lat, truck.lon]}
                        icon={truckIcon}
                    >
                        <Popup>
                            <div style={{ padding: '5px', textAlign: 'center' }}>
                                <h3 style={{ margin: '0 0 5px 0' }}>Truck #{truck.id}</h3>
                                <div style={{
                                    backgroundColor: '#4a90e2',
                                    color: 'white',
                                    padding: '5px',
                                    borderRadius: '3px'
                                }}>
                                    <strong>Status: {truck.status}</strong>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default MapView;
