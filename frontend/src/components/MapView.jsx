import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { API_CONFIG, fetchWithRetry, ENDPOINTS } from '../config';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client - Replace with your actual credentials

const SUPABASE_URL="https://pyyhkucbpwfmbazvmztj.supabase.co";
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5eWhrdWNicHdmbWJhenZtenRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODI0NjksImV4cCI6MjA3NDk1ODQ2OX0.bxKUn7UhOE9Zi1YmGcbwkG_pnd1E7Mh1wjcVWsWHesA"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    const [isSimulating, setIsSimulating] = useState(false);
    const [truckPositions, setTruckPositions] = useState([]);

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

    // Function to animate truck movement between two points
    const animateTruckMovement = async (fromLat, fromLon, toLat, toLon, truckId) => {
        const steps = 20; // Number of animation steps
        const duration = 2000; // Total animation duration in ms
        const stepDuration = duration / steps;
        
        const latStep = (toLat - fromLat) / steps;
        const lonStep = (toLon - fromLon) / steps;
        
        for (let i = 0; i <= steps; i++) {
            const currentLat = fromLat + (latStep * i);
            const currentLon = fromLon + (lonStep * i);
            
            // Update truck position
            setTruckPositions(prev => ({
                ...prev,
                [truckId]: { lat: currentLat, lon: currentLon }
            }));
            
            // Wait for the next step
            await new Promise(resolve => setTimeout(resolve, stepDuration));
        }
    };

    const simulateStep = async () => {
        if (loading || isSimulating) return; // Prevent multiple simultaneous runs
        
        try {
            setLoading(true);
            setError(null);
            
            const result = await fetchWithRetry(`${API_CONFIG.baseUrl}${ENDPOINTS.SIMULATE}`, {
                method: 'POST',
            });
            
            console.log('Simulation result:', result);
            
            if (result.success) {
                console.log(`Truck ${result.truck_id} moved from (${result.old_position.lat}, ${result.old_position.lon}) to (${result.new_position.lat}, ${result.new_position.lon})`);
                console.log(`Collected bin ${result.collected_bin_id}`);
            } else {
                console.log('Simulation step:', result.message);
            }
            
            // Refresh data after simulation
            await fetchData();
        } catch (error) {
            setError('Simulation failed. Please try again.');
            console.error('Error during simulation:', error);
        } finally {
            setLoading(false);
        }
    };

    const runFullSimulation = async () => {
        if (isSimulating) return; // Prevent multiple simultaneous runs
        
        try {
            setIsSimulating(true);
            setError(null);
            
            console.log('Starting full simulation...');
            let stepCount = 0;
            const maxSteps = 50; // Prevent infinite loops
            
            // Get initial truck positions
            await fetchData();
            
            while (stepCount < maxSteps) {
                const result = await fetchWithRetry(`${API_CONFIG.baseUrl}${ENDPOINTS.SIMULATE}`, {
                    method: 'POST',
                });
                
                stepCount++;
                console.log(`Simulation step ${stepCount}:`, result);
                
                if (result.success) {
                    console.log(`Truck ${result.truck_id} moving from (${result.old_position.lat}, ${result.old_position.lon}) to (${result.new_position.lat}, ${result.new_position.lon})`);
                    console.log(`Collecting bin ${result.collected_bin_id}`);
                    
                    // Animate truck movement
                    await animateTruckMovement(
                        result.old_position.lat, 
                        result.old_position.lon,
                        result.new_position.lat, 
                        result.new_position.lon,
                        result.truck_id
                    );
                    
                    // Refresh data to update bin status and final truck position
                    await fetchData();
                    
                } else {
                    console.log('Simulation completed:', result.message);
                    break;
                }
            }
            
            if (stepCount >= maxSteps) {
                console.log('Simulation stopped after maximum steps');
            }
            
            console.log(`Full simulation completed in ${stepCount} steps`);
            
        } catch (error) {
            setError('Simulation failed. Please try again.');
            console.error('Error during full simulation:', error);
        } finally {
            setIsSimulating(false);
            setTruckPositions({}); // Clear animation positions
        }
    };

    const testConnection = async () => {
        try {
            console.log('Testing database connection...');
            const testResult = await fetchWithRetry(`${API_CONFIG.baseUrl}/api/bins/test`);
            console.log('Test result:', testResult);
            setError(`Database test: ${testResult.message}. Found ${testResult.sample_data?.length || 0} bins.`);
            setTimeout(() => setError(null), 5000);
        } catch (error) {
            setError(`Database test failed: ${error.message}`);
            console.error('Database test error:', error);
        }
    };

    const testSupabaseDirect = async () => {
        try {
            console.log('Testing Supabase direct connection...');
            console.log('Supabase URL:', SUPABASE_URL);
            console.log('Supabase Key (first 20 chars):', SUPABASE_ANON_KEY.substring(0, 20));
            
            // Test basic connection
            const { data, error } = await supabase
                .from('bins')
                .select('id, is_collected')
                .limit(3);
            
            if (error) {
                throw new Error(`Supabase error: ${error.message}`);
            }
            
            console.log('Supabase test result:', data);
            setError(`Supabase test: Found ${data?.length || 0} bins. Data: ${JSON.stringify(data)}`);
            setTimeout(() => setError(null), 5000);
            
        } catch (error) {
            setError(`Supabase test failed: ${error.message}`);
            console.error('Supabase test error:', error);
        }
    };

    const resetAllBins = async () => {
        if (loading || isSimulating) return;
        
        try {
            setLoading(true);
            setError(null);
            
            console.log('🔥 RESET FUNCTION WORKING 🔥');
            console.log('=== STARTING RESET ===');
            
            // Step 1: Check what bins exist
            console.log('Step 1: Fetching existing bins...');
            const { data: existingBins, error: fetchError } = await supabase
                .from('bins')
                .select('id, is_collected');
            
            if (fetchError) {
                console.error('Fetch error:', fetchError);
                throw new Error(`Failed to fetch bins: ${fetchError.message}`);
            }
            
            console.log('Step 1 Result - Existing bins:', existingBins);
            console.log('Number of bins found:', existingBins?.length || 0);
            
            if (!existingBins || existingBins.length === 0) {
                throw new Error('No bins found in database');
            }
            
            // Step 2: Try the update
            console.log('Step 2: Updating all bins to is_collected = false...');
            const { data: updateData, error: updateError, count } = await supabase
                .from('bins')
                .update({ is_collected: false })
                .neq('id', '00000000-0000-0000-0000-000000000000');
            
            if (updateError) {
                console.error('Update error:', updateError);
                throw new Error(`Update failed: ${updateError.message}`);
            }
            
            console.log('Step 2 Result - Update response:', { updateData, count });
            
            // Step 3: Verify the update
            console.log('Step 3: Verifying update...');
            const { data: verifyData, error: verifyError } = await supabase
                .from('bins')
                .select('id, is_collected');
            
            if (verifyError) {
                console.warn('Verify error:', verifyError);
            } else {
                console.log('Step 3 Result - Bins after update:', verifyData);
                const stillCollected = verifyData?.filter(bin => bin.is_collected === true);
                console.log('Bins still marked as collected:', stillCollected?.length || 0);
            }
            
            // Step 4: Refresh the map data
            console.log('Step 4: Refreshing map data...');
            await fetchData();
            
            console.log('=== RESET COMPLETED ===');
            
            // Show success message
            setError(`✅ Reset completed! ${count || 0} bins updated to uncollected status.`);
            setTimeout(() => setError(null), 5000);
            
        } catch (error) {
            console.error('=== RESET FAILED ===');
            console.error('Full error:', error);
            setError(`❌ Reset failed: ${error.message}. Check console for details.`);
            setTimeout(() => setError(null), 5000);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="map-container" style={{ height: '80vh', width: '100%' }}>
            <div className="controls" style={{ margin: '10px', position: 'absolute', zIndex: 1000, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
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
                    onClick={runFullSimulation}
                    disabled={loading || isSimulating}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        backgroundColor: (loading || isSimulating) ? '#cccccc' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: (loading || isSimulating) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {isSimulating ? 'Simulating...' : loading ? 'Loading...' : 'Run Simulation'}
                </button>
                <button 
                    onClick={resetAllBins}
                    disabled={loading || isSimulating}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        backgroundColor: (loading || isSimulating) ? '#cccccc' : '#ff6b6b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: (loading || isSimulating) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {loading ? 'Resetting...' : 'Reset Simulation'}
                </button>
            </div>
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapUpdater center={center} />
                
                {/* Render Bins - Only show uncollected bins */}
                {bins
                    .filter(bin => !bin.is_collected) // Only show uncollected bins
                    .map((bin) => (
                        <Marker
                            key={bin.id}
                            position={[bin.lat, bin.lon]}
                            icon={createBinMarker(bin.waste_level)}
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
                                        color: '#000'
                                    }}>
                                        Status: Not Collected
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                {/* Render Trucks */}
                {trucks.map((truck) => {
                    // Use animated position if available, otherwise use truck's actual position
                    const animatedPos = truckPositions[truck.id];
                    const position = animatedPos ? [animatedPos.lat, animatedPos.lon] : [truck.lat, truck.lon];
                    
                    return (
                        <Marker
                            key={truck.id}
                            position={position}
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
                                    {animatedPos && (
                                        <div style={{
                                            backgroundColor: '#ff6b6b',
                                            color: 'white',
                                            padding: '3px',
                                            borderRadius: '3px',
                                            marginTop: '5px',
                                            fontSize: '12px'
                                        }}>
                                            Moving...
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default MapView;