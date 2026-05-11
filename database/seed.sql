INSERT INTO admins (name, email, password_hash, role) VALUES
('Admin One', 'admin@chargeflow.com', '$2b$10$kMz7oN2eqNfNx8lt6YhJfOVvWwE7U0f0s6Qj4R1V0xU0H4M4sJ5Mm', 'super_admin');

INSERT INTO users (name, email, phone, password_hash, vehicle_type) VALUES
('Aarav Sharma', 'aarav@gmail.com', '9876543210', '$2b$10$kMz7oN2eqNfNx8lt6YhJfOVvWwE7U0f0s6Qj4R1V0xU0H4M4sJ5Mm', 'Electric Sedan'),
('Isha Verma', 'isha@gmail.com', '9988776655', '$2b$10$kMz7oN2eqNfNx8lt6YhJfOVvWwE7U0f0s6Qj4R1V0xU0H4M4sJ5Mm', 'Electric Scooter');

INSERT INTO charging_stations (station_name, location, city, latitude, longitude, price_per_kwh, created_by_admin_id) VALUES
('ChargeFlow Nexus Hub', 'Sector 62, Noida', 'Noida', 28.6208000, 77.3622000, 18.50, 1),
('EcoVolt Smart Station', 'Cyber City, Gurugram', 'Gurugram', 28.4940000, 77.0888000, 20.00, 1),
('GreenPulse Downtown', 'MG Road, Bengaluru', 'Bengaluru', 12.9750000, 77.6060000, 19.25, 1);

INSERT INTO chargers (station_id, charger_code, charger_type, power_kw, status) VALUES
(1, 'CF-NX-AC-01', 'AC', 22, 'available'),
(1, 'CF-NX-DC-01', 'DC', 60, 'occupied'),
(1, 'CF-NX-FAST-01', 'FAST', 120, 'available'),
(2, 'EV-CS-AC-11', 'AC', 11, 'available'),
(2, 'EV-CS-FAST-20', 'FAST', 150, 'maintenance'),
(3, 'GP-DT-DC-07', 'DC', 50, 'available');

INSERT INTO reservations (user_id, charger_id, start_time, end_time, status, booking_fee) VALUES
(1, 1, NOW() + interval '2 hour', NOW() + interval '3 hour', 'confirmed', 49.00),
(2, 6, NOW() + interval '1 day', NOW() + interval '1 day 1 hour', 'confirmed', 49.00);

INSERT INTO reviews (user_id, station_id, rating, comment) VALUES
(1, 1, 5, 'Fast, clean and seamless reservation process.'),
(2, 2, 4, 'Great location but one charger was under maintenance.');
