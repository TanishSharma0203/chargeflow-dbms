import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import axios from "axios";

import {
  BatteryCharging,
  Bolt,
  Calendar,
  ChartColumn,
  Leaf,
  ShieldCheck,
  Star,
  Zap
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type Station = {
  id: number;
  station_name: string;
  location: string;
  price_per_kwh: number;
  available_chargers: number;
  total_chargers: number;
  rating: number;
};

const stats = [
  { name: "Active Reservations", value: 124 },
  { name: "CO2 Saved (kg)", value: 5480 },
  { name: "Avg Session (min)", value: 42 }
];

const monthlyData = [
  { month: "Jan", usage: 320 },
  { month: "Feb", usage: 380 },
  { month: "Mar", usage: 410 },
  { month: "Apr", usage: 450 }
];

function Navbar({
  dark,
  toggleTheme
}: {
  dark: boolean;
  toggleTheme: () => void;
}) {
  return (
    <nav className="nav glass">
      <h1>ChargeFlow</h1>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/stations">Stations</Link>
        <Link to="/reservations">Reservation</Link>
        <Link to="/admin">Admin</Link>
      </div>

      <button onClick={toggleTheme} className="btn secondary">
        {dark ? "Light" : "Dark"} Mode
      </button>
    </nav>
  );
}

function Landing() {
  return (
    <div>
      <section className="hero glass">
        <h2>Smart EV Charging Reservation Platform</h2>

        <p>
          Futuristic charging intelligence for electric mobility, smart cities,
          and sustainable transportation.
        </p>

        <div className="row">
          <Link to="/stations" className="btn">
            Find Stations
          </Link>

          <Link to="/reservations" className="btn secondary">
            Book Charging Slot
          </Link>
        </div>
      </section>

      <section className="grid">
        {[
          ["Real-time Availability", <Zap size={18} />],
          ["Session Analytics", <ChartColumn size={18} />],
          ["Secure Auth + Payments", <ShieldCheck size={18} />]
        ].map(([t, i], idx) => (
          <article className="card" key={idx}>
            <h3>
              {i} {t}
            </h3>

            <p>
              Responsive, startup-grade UX with DBMS-backed operations and smart
              workflows.
            </p>
          </article>
        ))}
      </section>

      <section className="grid">
        {stats.map((s) => (
          <article key={s.name} className="stat">
            <p>{s.name}</p>
            <h3>{s.value}</h3>
          </article>
        ))}
      </section>
    </div>
  );
}

function Auth() {
  return (
    <div className="auth-wrap">
      <form className="card form">
        <h3>Login</h3>
        <input placeholder="Email" />
        <input placeholder="Password" type="password" />
        <button className="btn">Sign In</button>
      </form>

      <form className="card form">
        <h3>Signup</h3>
        <input placeholder="Name" />
        <input placeholder="Email" />
        <input placeholder="Phone" />
        <input placeholder="Vehicle Type" />
        <input placeholder="Password" type="password" />
        <button className="btn">Create Account</button>
      </form>

      <form className="card form">
        <h3>Forgot Password</h3>
        <input placeholder="Registered Email" />
        <button className="btn secondary">Reset Link</button>
      </form>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="grid">
      <article className="card">
        <h3>
          <BatteryCharging size={18} /> Battery Progress
        </h3>

        <div className="progress">
          <span style={{ width: "68%" }} />
        </div>

        <p>Charging 68% | ETA 24 mins</p>
      </article>

      <article className="card">
        <h3>
          <Calendar size={18} /> Upcoming Reservation
        </h3>

        <p>Tomorrow 10:00 AM at ChargeFlow Nexus Hub</p>
      </article>

      <article className="card">
        <h3>
          <Leaf size={18} /> Environmental Impact
        </h3>

        <p>CO2 saved this month: 148 kg</p>
      </article>

      <article className="card chart">
        <h3>Energy Usage Analytics</h3>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="usage" fill="#00b8ff" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </article>

      <article className="card chart">
        <h3>Favorite Stations</h3>

        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={[
                { name: "Nexus", value: 50 },
                { name: "EcoVolt", value: 30 },
                { name: "GreenPulse", value: 20 }
              ]}
              dataKey="value"
              outerRadius={70}
              fill="#39ff88"
            />

            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </article>
    </div>
  );
}

function Stations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/stations"
      );

      setStations(response.data);
    } catch (error) {
      console.error("Failed to fetch stations", error);
    }
  };

  const filtered = useMemo(() => {
    return stations.filter(
      (s) =>
        s.station_name.toLowerCase().includes(query.toLowerCase()) ||
        s.location.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, stations]);

  return (
    <div>
      <div className="row">
        <input
          className="search"
          placeholder="Search stations, city, location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <span className="badge">
          AI Recommendations: ChargeFlow Nexus Hub
        </span>
      </div>

      <div className="grid">
        {filtered.map((s) => (
          <article key={s.id} className="card">
            <h3>{s.station_name}</h3>

            <p>{s.location}</p>

            <p>
              {s.available_chargers}/{s.total_chargers} Available • Rs{" "}
              {s.price_per_kwh}/kWh
            </p>

            <p>
              <Star size={14} /> {s.rating}
            </p>

            <Link className="btn" to="/reservations">
              Reserve
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

function Reservations() {
  const [chargerId, setChargerId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState("");

  const handleReservation = async () => {
    try {
      setMessage("Processing reservation...");

      const response = await axios.post(
        "http://localhost:5000/api/reservations",
        {
          charger_id: Number(chargerId),
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
        }
      );

      console.log("Reservation Response:", response.data);

      if (response.status === 201 || response.data.success) {
        setMessage("Reservation successful!");

        setChargerId("");
        setStartTime("");
        setEndTime("");
      } else {
        setMessage(
          "Reservation created but unexpected response received."
        );
      }
    } catch (error) {
      console.error("Reservation Error:", error);

      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage("Server connection error.");
      }
    }
  };

  return (
    <div className="card form">
      <h3>
        <Bolt size={18} /> Reservation Workflow
      </h3>

      <input
        placeholder="Enter Charger ID"
        value={chargerId}
        onChange={(e) => setChargerId(e.target.value)}
      />

      <input
        type="datetime-local"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
      />

      <input
        type="datetime-local"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
      />

      <div className="row">
        <span className="badge">
          Real-time slots: Available
        </span>

        <span className="badge">
          QR Preview: CF-BOOK-2026-9211
        </span>
      </div>

      <div className="card">
        <p>
          Payment summary: Estimated 24 kWh x Rs 19.5 = Rs 468
        </p>
      </div>

      <button
        className="btn"
        onClick={handleReservation}
      >
        Confirm Reservation
      </button>

      {message && (
        <p
          style={{
            marginTop: "12px",
            fontWeight: "600",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

function Session() {
  return (
    <div className="card">
      <h3>Charging Session Management</h3>

      <p>
        Live timer: 00:28:13 | Power consumed: 14.2 kWh |
        Cost: Rs 276.9
      </p>

      <div className="row">
        <button className="btn">Start Session</button>
        <button className="btn secondary">End Session</button>
      </div>
    </div>
  );
}

function Admin() {
  return (
    <div className="grid">
      {[
        ["Users", "2,410"],
        ["Active Reservations", "124"],
        ["Revenue", "Rs 2.8L"],
        ["Station Utilization", "73%"]
      ].map(([k, v]) => (
        <article className="stat" key={k}>
          <p>{k}</p>
          <h3>{v}</h3>
        </article>
      ))}
    </div>
  );
}

function Reviews() {
  return (
    <div className="grid">
      <article className="card">
        <h3>Rate & Review</h3>

        <p>
          Users can post ratings and report issues for each station.
        </p>

        <p>
          <Star size={14} /> 4.9 - "Reliable charging and smooth app UX"
        </p>
      </article>
    </div>
  );
}

export default function App() {
  const [dark, setDark] = useState(true);

  return (
    <main className={dark ? "theme-dark app" : "theme-light app"}>
      <Navbar
        dark={dark}
        toggleTheme={() => setDark((p) => !p)}
      />

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/stations" element={<Stations />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/sessions" element={<Session />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <footer className="footer">
        ChargeFlow © 2026 • Smart city EV infrastructure platform
      </footer>
    </main>
  );
}