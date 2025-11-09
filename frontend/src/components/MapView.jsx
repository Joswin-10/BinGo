import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { API_CONFIG, fetchWithRetry, ENDPOINTS } from '../config';

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
    const [simulating, setSimulating] = useState(false);
    const [simulationProgress, setSimulationProgress] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [binsData, trucksData] = await Promise.all([
                fetchWithRetry(`${API_CONFIG.baseUrl}${ENDPOINTS.BINS}`),
                fetchWithRetry(`${API_CONFIG.baseUrl}${ENDPOINTS.TRUCKS}`)
            ]);

            setBins(binsData);
            setTrucks(trucksData);
            setError(null);
        } catch (err) {
            setError('Failed to fetch data. Retrying...');
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
            setLoading(true);
            const result = await fetchWithRetry(`${API_CONFIG.baseUrl}${ENDPOINTS.SIMULATE}`, {
                method: 'POST',
            });
            
            console.log('Simulation result:', result);
            setError(null);
            
            // Refresh data after simulation
            await fetchData();
        } catch (error) {
            setError('Simulation failed. Retrying...');
            console.error('Error during simulation:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetBins = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const result = await fetchWithRetry(`${API_CONFIG.baseUrl}${ENDPOINTS.RESET_BINS}`, {
                method: 'POST',
            });
            
            console.log('Reset result:', result);
            setError(null);
            
            // Clear simulation progress
            setSimulationProgress(null);
            
            // Refresh data after reset
            await fetchData();
        } catch (error) {
            setError('Reset failed: ' + error.message);
            console.error('Error resetting bins:', error);
        } finally {
            setLoading(false);
        }
    };

    const runFullSimulation = async () => {
        try {
            setSimulating(true);
            setError(null);
            setSimulationProgress({ current: 0, total: 0, timeElapsed: 0 });
            
            const startTime = Date.now();
            let stepCount = 0;
            
            // Helper to fetch and get bins count
            const getUncollectedCount = async () => {
                const binsData = await fetchWithRetry(`${API_CONFIG.baseUrl}${ENDPOINTS.BINS}`);
                const uncollected = binsData.filter(b => !b.is_collected);
                return uncollected.length;
            };
            
            // Initial fetch
            await fetchData();
            let uncollectedCount = await getUncollectedCount();
            
            // Run simulation steps until all bins are collected
            while (uncollectedCount > 0) {
                // Run one simulation step
                try {
                    const result = await fetchWithRetry(`${API_CONFIG.baseUrl}${ENDPOINTS.SIMULATE}`, {
                        method: 'POST',
                    });
                    
                    stepCount++;
                    const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
                    
                    // Refresh data to show truck movement
                    await fetchData();
                    
                    // Update uncollected count
                    uncollectedCount = await getUncollectedCount();
                    
                    setSimulationProgress({
                        current: stepCount,
                        total: uncollectedCount + stepCount,
                        timeElapsed: timeElapsed,
                        lastStep: result
                    });
                    
                    // Add delay so user can see truck traveling (500ms delay)
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Check if simulation should stop
                    if (result.message === "All bins collected" || result.message === "No accessible bins found") {
                        setSimulationProgress(prev => ({ ...prev, completed: true }));
                        break;
                    }
                } catch (stepError) {
                    console.error('Error in simulation step:', stepError);
                    setError('Error during simulation step. Continuing...');
                    // Continue with next step
                    uncollectedCount = await getUncollectedCount();
                }
            }
            
            // Final data refresh
            await fetchData();
            setSimulationProgress(prev => ({ ...prev, completed: true }));
            
        } catch (error) {
            setError('Simulation failed: ' + error.message);
            console.error('Error during full simulation:', error);
        } finally {
            setSimulating(false);
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
                {simulationProgress && (
                    <div style={{
                        backgroundColor: '#4a90e2',
                        color: 'white',
                        padding: '10px',
                        borderRadius: '5px',
                        marginBottom: '10px',
                        fontSize: '14px'
                    }}>
                        <div><strong>Simulation Progress:</strong></div>
                        <div>Steps: {simulationProgress.current} / {simulationProgress.total || '?'}</div>
                        <div>Time Elapsed: {simulationProgress.timeElapsed}s</div>
                        {simulationProgress.completed && (
                            <div style={{ marginTop: '5px', fontWeight: 'bold' }}>✓ All bins collected!</div>
                        )}
                    </div>
                )}
                <button 
                    onClick={runFullSimulation}
                    disabled={loading || simulating}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        backgroundColor: (loading || simulating) ? '#cccccc' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: (loading || simulating) ? 'not-allowed' : 'pointer',
                        marginRight: '10px'
                    }}
                >
                    {simulating ? 'Running Simulation...' : 'Run Simulation'}
                </button>
                <button 
                    onClick={simulateStep}
                    disabled={loading || simulating}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        backgroundColor: (loading || simulating) ? '#cccccc' : '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: (loading || simulating) ? 'not-allowed' : 'pointer',
                        marginRight: '10px'
                    }}
                >
                    {loading ? 'Loading...' : 'Run Single Step'}
                </button>
                <button 
                    onClick={resetBins}
                    disabled={loading || simulating}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        backgroundColor: (loading || simulating) ? '#cccccc' : '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: (loading || simulating) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Resetting...' : 'Reset All Bins'}
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
                                {bin.is_collected && bin.collected_at && (
                                    <p style={{ 
                                        margin: '5px 0',
                                        fontSize: '12px',
                                        color: '#666'
                                    }}>
                                        Collected at: {new Date(bin.collected_at).toLocaleTimeString()}
                                    </p>
                                )}
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
