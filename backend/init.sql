-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create bins table
CREATE TABLE bins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lat FLOAT NOT NULL CHECK (lat >= -90 AND lat <= 90),
    lon FLOAT NOT NULL CHECK (lon >= -180 AND lon <= 180),
    waste_level INTEGER NOT NULL CHECK (waste_level >= 0 AND waste_level <= 100),
    is_collected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create trucks table
CREATE TABLE trucks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lat FLOAT NOT NULL CHECK (lat >= -90 AND lat <= 90),
    lon FLOAT NOT NULL CHECK (lon >= -180 AND lon <= 180),
    status VARCHAR(20) CHECK (status IN ('waiting', 'collecting')),
    current_bin_id UUID REFERENCES bins(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add some example data
INSERT INTO bins (lat, lon, waste_level) VALUES 
    (40.7128, -74.0060, 75),  -- New York
    (40.7580, -73.9855, 30),  -- Manhattan
    (40.7829, -73.9654, 90);  -- Upper East Side

INSERT INTO trucks (lat, lon, status) VALUES
    (40.7829, -73.9654, 'waiting');  -- Starting in Upper East Side