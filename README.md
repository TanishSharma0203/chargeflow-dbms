# ChargeFlow - EV Charging Station Management & Reservation System

ChargeFlow is a modern DBMS mini-project web application for EV charging station discovery, reservations, charging session tracking, and admin analytics.

## Tech Stack

- Frontend: React + Vite + TypeScript + Recharts
- Backend: Node.js + Express + PostgreSQL
- Database: Relational schema with PK/FK constraints and indexes

## Folder Structure

- `frontend/` - multi-page SaaS-style UI (landing, auth, dashboard, stations, reservations, sessions, admin, reviews)
- `backend/` - REST API with auth, station listing, reservation and session management
- `database/schema.sql` - DB schema (Users, ChargingStations, Chargers, Reservations, ChargingSessions, Payments, Reviews, Admins)
- `database/seed.sql` - realistic sample records

## Quick Start

### 1) Database

1. Create PostgreSQL database:
   - `CREATE DATABASE chargeflow;`
2. Run:
   - `database/schema.sql`
   - `database/seed.sql`

### 2) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 3) Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Highlights

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/stations`
- `POST /api/reservations`
- `GET /api/reservations/me`
- `POST /api/sessions/start`
- `POST /api/sessions/end`
- `GET /api/admin/metrics`
- `POST /api/reviews`

## DBMS Design Notes

- One-to-many:
  - `admins -> charging_stations`
  - `charging_stations -> chargers`
  - `users -> reservations`
  - `users -> reviews`
  - `charging_stations -> reviews`
- One-to-one:
  - `reservations -> charging_sessions`
  - `charging_sessions -> payments`
- Constraints:
  - PK/FK, unique email/phone, enum-like checks for statuses and charger types
- Performance:
  - indexed reservation windows, stations by city, chargers/reviews by station

## ER-Style Relation Summary

- `Users(id)` 1----* `Reservations(user_id)`
- `ChargingStations(id)` 1----* `Chargers(station_id)`
- `Chargers(id)` 1----* `Reservations(charger_id)`
- `Reservations(id)` 1----1 `ChargingSessions(reservation_id)`
- `ChargingSessions(id)` 1----1 `Payments(session_id)`
- `Users(id)` 1----* `Reviews(user_id)`
- `ChargingStations(id)` 1----* `Reviews(station_id)`
- `Admins(id)` 1----* `ChargingStations(created_by_admin_id)`
