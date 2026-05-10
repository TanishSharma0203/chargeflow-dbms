CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    vehicle_type VARCHAR(60) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(40) DEFAULT 'manager',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE charging_stations (
    id SERIAL PRIMARY KEY,
    station_name VARCHAR(120) NOT NULL,
    location VARCHAR(255) NOT NULL,
    city VARCHAR(80) NOT NULL,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    price_per_kwh DECIMAL(8, 2) NOT NULL,
    open_24x7 BOOLEAN DEFAULT TRUE,
    created_by_admin_id INT REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chargers (
    id SERIAL PRIMARY KEY,
    station_id INT NOT NULL REFERENCES charging_stations(id) ON DELETE CASCADE,
    charger_code VARCHAR(50) UNIQUE NOT NULL,
    charger_type VARCHAR(20) CHECK (charger_type IN ('AC', 'DC', 'FAST')) NOT NULL,
    power_kw DECIMAL(6, 2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('available', 'occupied', 'maintenance')) DEFAULT 'available'
);

CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    charger_id INT NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) CHECK (status IN ('confirmed', 'active', 'completed', 'cancelled')) DEFAULT 'confirmed',
    qr_code_token VARCHAR(100) DEFAULT md5(random()::text),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE charging_sessions (
    id SERIAL PRIMARY KEY,
    reservation_id INT UNIQUE NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    start_battery INT CHECK (start_battery BETWEEN 0 AND 100),
    end_battery INT CHECK (end_battery BETWEEN 0 AND 100),
    power_kwh DECIMAL(8, 2) DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('active', 'completed')) DEFAULT 'active'
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    session_id INT UNIQUE NOT NULL REFERENCES charging_sessions(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'paid', 'failed')) DEFAULT 'pending',
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    station_id INT NOT NULL REFERENCES charging_stations(id) ON DELETE CASCADE,
    rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reservation_time ON reservations(start_time, end_time);
CREATE INDEX idx_station_city ON charging_stations(city);
CREATE INDEX idx_chargers_station ON chargers(station_id);
CREATE INDEX idx_reviews_station ON reviews(station_id);
