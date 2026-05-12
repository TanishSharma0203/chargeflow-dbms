import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate
} from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { api } from "./api/client";
import { useAuth } from "./context/AuthContext";

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

type ChargerOption = {
  id: number;
  station_id: number;
  charger_code: string;
  charger_type: string;
  power_kw: string | number;
  status: string;
  station_name: string;
  location: string;
  price_per_kwh: string | number;
};

const BOOKING_FEE_DISPLAY =
  import.meta.env.VITE_BOOKING_FEE ?? "49";

function isoToDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type ProfileRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  created_at: string;
};

type ActiveReservation = {
  id: number;
  user_id: number;
  charger_id: number;
  start_time: string;
  end_time: string;
  status: string;
  booking_fee: string | number;
  station_name: string;
  location: string;
  charger_type: string;
  charger_code: string;
};

type AccountPayload = {
  activeReservationsCount: number;
  activeReservations: ActiveReservation[];
  sessionPayments: {
    id: number;
    amount: string | number;
    payment_status: string;
    payment_method: string;
    paid_at: string;
    reservation_id: number;
    station_name: string;
  }[];
  bookingFees: {
    reservation_id: number;
    amount: string | number;
    charged_at: string;
    station_name: string;
  }[];
  bookingFeePolicy: {
    amount: number;
    nonRefundable: boolean;
    description: string;
  };
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
  const { token, user, logout } = useAuth();

  return (
    <nav className="nav glass">
      <h1>ChargeFlow</h1>

      <div className="nav-links">
        <Link to="/">Home</Link>

        {token && (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/account">My account</Link>
            <Link to="/profile">Profile</Link>
          </>
        )}

        <Link to="/stations">Stations</Link>
        <Link to="/reservations">Reservation</Link>
        <Link to="/admin">Admin</Link>
      </div>

      <div className="row">
        {token && user && (
          <span className="badge" style={{ opacity: 0.9 }}>
            {user.name}
          </span>
        )}

        {token ? (
          <button type="button" className="btn secondary" onClick={logout}>
            Logout
          </button>
        ) : (
          <Link className="btn secondary" to="/auth">
            Sign in
          </Link>
        )}

        <button type="button" onClick={toggleTheme} className="btn secondary">
          {dark ? "Light" : "Dark"} Mode
        </button>
      </div>
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
  const { login, signup, token, loading } = useAuth();
  const navigate = useNavigate();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupVehicle, setSignupVehicle] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && token) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      await login(loginEmail.trim(), loginPassword);
      toast.success("Signed in");
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error("Invalid email or password");
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      await signup({
        name: signupName.trim(),
        email: signupEmail.trim(),
        phone: signupPhone.trim(),
        password: signupPassword,
        vehicle_type: signupVehicle.trim(),
      });
      toast.success("Account created");
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error("Signup failed — check fields or try another email/phone");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="card form" style={{ maxWidth: 420 }}>
        <p>Checking your session…</p>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <form className="card form" onSubmit={handleLogin}>
        <h3>Login</h3>

        <input
          placeholder="Email"
          value={loginEmail}
          onChange={(e) => setLoginEmail(e.target.value)}
          autoComplete="email"
        />

        <input
          placeholder="Password"
          type="password"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          autoComplete="current-password"
        />

        <button className="btn" type="submit" disabled={busy}>
          Sign In
        </button>
      </form>

      <form className="card form" onSubmit={handleSignup}>
        <h3>Signup</h3>

        <input
          placeholder="Name"
          value={signupName}
          onChange={(e) => setSignupName(e.target.value)}
        />

        <input
          placeholder="Email"
          value={signupEmail}
          onChange={(e) => setSignupEmail(e.target.value)}
          autoComplete="email"
        />

        <input
          placeholder="Phone"
          value={signupPhone}
          onChange={(e) => setSignupPhone(e.target.value)}
        />

        <input
          placeholder="Vehicle Type"
          value={signupVehicle}
          onChange={(e) => setSignupVehicle(e.target.value)}
        />

        <input
          placeholder="Password"
          type="password"
          value={signupPassword}
          onChange={(e) => setSignupPassword(e.target.value)}
          autoComplete="new-password"
        />

        <button className="btn" type="submit" disabled={busy}>
          Create Account
        </button>
      </form>

      <div className="card form">
        <h3>Forgot Password</h3>

        <p style={{ margin: 0, opacity: 0.85 }}>
          Password reset is not wired yet — contact support or use seed
          credentials for local demos.
        </p>
      </div>
    </div>
  );
}

function Dashboard() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="card">
        <p>Loading session…</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

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
  const [suggestOpen, setSuggestOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target as Node)
      ) {
        setSuggestOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);

    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const fetchStations = async () => {
    try {
      const response = await api.get<Station[]>("/api/stations");

      setStations(response.data);
    } catch (error) {
      console.error("Failed to fetch stations", error);
    }
  };

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = !q
      ? stations.slice(0, 10)
      : stations.filter(
          (s) =>
            s.station_name.toLowerCase().includes(q) ||
            s.location.toLowerCase().includes(q)
        ).slice(0, 12);

    return list;
  }, [query, stations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      return stations;
    }

    return stations.filter(
      (s) =>
        s.station_name.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q)
    );
  }, [query, stations]);

  return (
    <div>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="station-search-wrap" ref={searchWrapRef}>
          <input
            id="station-search"
            className="search"
            style={{ width: "100%" }}
            placeholder="Type station name to search…"
            value={query}
            autoComplete="off"
            role="combobox"
            aria-expanded={suggestOpen}
            aria-controls="station-suggest-list"
            aria-autocomplete="list"
            onChange={(e) => {
              setQuery(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => setSuggestOpen(true)}
          />

          {suggestOpen && suggestions.length > 0 && (
            <ul
              id="station-suggest-list"
              className="station-suggestions"
              role="listbox"
              aria-labelledby="station-search"
            >
              {suggestions.map((s) => (
                <li
                  key={s.id}
                  role="option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery(s.station_name);
                    setSuggestOpen(false);
                  }}
                >
                  <strong>{s.station_name}</strong>

                  <span className="station-suggest-meta">{s.location}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

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
  const { token, loading } = useAuth();
  const navigate = useNavigate();
  const [chargers, setChargers] = useState<ChargerOption[]>([]);
  const [loadingChargers, setLoadingChargers] = useState(true);
  const [chargerId, setChargerId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get<ChargerOption[]>("/api/chargers");

        if (!cancelled) {
          setChargers(data);
        }
      } catch (error) {
        console.error("Failed to fetch chargers", error);

        if (!cancelled) {
          setMessage("Could not load chargers. Check the backend connection.");
        }
      } finally {
        if (!cancelled) {
          setLoadingChargers(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleReservation = async () => {
    if (!token) {
      setMessage("Please sign in to book a slot.");

      return;
    }

    if (!chargerId || !startTime || !endTime) {
      setMessage("Choose a charger and enter both start and end time.");

      return;
    }

    try {
      setMessage("Processing reservation...");

      const response = await api.post("/api/reservations", {
        charger_id: Number(chargerId),
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      });

      if (response.status === 201 || response.data.success) {
        const fee = response.data.bookingFeeCharged ?? BOOKING_FEE_DISPLAY;

        setMessage(
          `Reservation confirmed. Non-refundable booking fee: Rs ${fee}`
        );

        toast.success("Reservation created");
        navigate("/account");
      } else {
        setMessage("Unexpected response from server.");
      }
    } catch (error) {
      console.error("Reservation Error:", error);

      if (axios.isAxiosError(error) && error.response?.data?.message) {
        setMessage(String(error.response.data.message));
        toast.error(String(error.response.data.message));
      } else if (axios.isAxiosError(error) && error.response?.status === 401) {
        setMessage("Please sign in again.");
      } else {
        setMessage("Server connection error.");
      }
    }
  };

  if (loading) {
    return (
      <div className="card form">
        <p>Loading session...</p>
      </div>
    );
  }

  return (
    <div className="card form">
      <h3>
        <Bolt size={18} /> Reservation workflow
      </h3>

      {!token && (
        <p style={{ marginTop: 0 }}>
          <Link to="/auth">Sign in</Link> to book. A non-refundable booking fee
          of Rs {BOOKING_FEE_DISPLAY} applies per reservation and stops
          overlapping spam bookings.
        </p>
      )}

      {token && (
        <p style={{ marginTop: 0, opacity: 0.9 }}>
          Booking fee Rs {BOOKING_FEE_DISPLAY} (non-refundable) is charged when
          you confirm. You cannot overlap another of your own active bookings.
        </p>
      )}

      <label htmlFor="charger-pick">Charger</label>

      <select
        id="charger-pick"
        value={chargerId}
        onChange={(e) => setChargerId(e.target.value)}
        disabled={loadingChargers}
      >
        <option value="">
          {loadingChargers ? "Loading chargers..." : "Select a charger"}
        </option>

        {chargers.map((charger) => (
          <option key={charger.id} value={charger.id}>
            #{charger.id} - {charger.station_name} - {charger.charger_code} (
            {charger.charger_type}, {Number(charger.power_kw)} kW)
          </option>
        ))}
      </select>

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
        <span className="badge">Booking fee: Rs {BOOKING_FEE_DISPLAY}</span>

        <span className="badge">One active time window per user</span>
      </div>

      <button
        className="btn"
        type="button"
        onClick={handleReservation}
        disabled={!token || loadingChargers}
      >
        Confirm reservation
      </button>

      {!token && (
        <p style={{ marginTop: "8px", opacity: 0.85 }}>
          Use <Link to="/auth">Sign in</Link> first - the button stays disabled
          until you are logged in.
        </p>
      )}

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

function UserProfile() {
  const { token, loading, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const { data } = await api.get<ProfileRow>("/api/users/me");

      setProfile(data);
      setError("");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout();
      } else if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(String(err.response.data.message));
      } else {
        setError("Could not load profile. Check that the backend is running.");
      }
    }
  }, [token, logout]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="card">
        <p>Loading session…</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  if (error) {
    return (
      <div className="card">
        <p>{error}</p>

        <button className="btn" type="button" onClick={loadProfile}>
          Try again
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card">
        <p>Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="grid" style={{ maxWidth: 720 }}>
      <article className="card">
        <p className="page-kicker">Your identity</p>

        <h2 className="page-title">Profile</h2>

        <p className="page-lead">
          Details stored in ChargeFlow from your user record.
        </p>

        <table>
          <tbody>
            <tr>
              <th>Name</th>
              <td>{profile.name || "Not provided"}</td>
            </tr>
            <tr>
              <th>Email</th>
              <td>{profile.email || "Not provided"}</td>
            </tr>
            <tr>
              <th>Phone</th>
              <td>{profile.phone || "Not provided"}</td>
            </tr>
            <tr>
              <th>Vehicle</th>
              <td>{profile.vehicle_type || "Not provided"}</td>
            </tr>
            <tr>
              <th>Member since</th>
              <td>{new Date(profile.created_at).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  );
}

function UserAccount() {
  const { token, loading, logout } = useAuth();
  const [data, setData] = useState<AccountPayload | null>(null);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [editCharger, setEditCharger] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: payload } = await api.get<AccountPayload>(
        "/api/users/me/account"
      );

      setData(payload);
      setLoadError("");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout();

        return;
      }

      setLoadError("Could not load your account.");
    }
  }, [logout]);

  useEffect(() => {
    if (!token) {
      return;
    }

    load();
  }, [token, load]);

  useEffect(() => {
    if (!data || selectedId === "") {
      return;
    }

    const row = data.activeReservations.find((r) => r.id === selectedId);

    if (row && row.status === "confirmed") {
      setEditCharger(String(row.charger_id));
      setEditStart(isoToDatetimeLocalValue(row.start_time));
      setEditEnd(isoToDatetimeLocalValue(row.end_time));
    }
  }, [data, selectedId]);

  if (loading) {
    return (
      <div className="card">
        <p>Loading session…</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  if (loadError) {
    return (
      <div className="card">
        <p>{loadError}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card">
        <p>Loading account…</p>
      </div>
    );
  }

  const changeable = data.activeReservations.filter(
    (r) => r.status === "confirmed"
  );

  const handleSaveReservation = async (e: FormEvent) => {
    e.preventDefault();

    if (selectedId === "") {
      toast.error("Pick a reservation to update");

      return;
    }

    setSaving(true);

    try {
      await api.patch(`/api/reservations/${selectedId}`, {
        charger_id: Number(editCharger),
        start_time: new Date(editStart).toISOString(),
        end_time: new Date(editEnd).toISOString(),
      });

      toast.success("Reservation updated");
      await load();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        toast.error(String(err.response.data.message));
      } else {
        toast.error("Update failed");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid" style={{ maxWidth: 720 }}>
      <article className="card page-intro">
        <p className="page-kicker">Account & billing</p>

        <h2 className="page-title">My account</h2>

        <p className="page-lead">
          Reservations you can change, booking fees, and charging payments.
        </p>
      </article>

      <article className="stat">
        <p>Active reservations</p>

        <h3>{data.activeReservationsCount}</h3>
      </article>

      <article className="stat">
        <p>Non-refundable booking fee (per new booking)</p>

        <h3>Rs {data.bookingFeePolicy.amount}</h3>
      </article>

      <article className="card" style={{ gridColumn: "1 / -1" }}>
        <h3>Booking rules</h3>

        <p style={{ marginTop: 0, opacity: 0.9 }}>
          {data.bookingFeePolicy.description}
        </p>
      </article>

      <article className="card" style={{ gridColumn: "1 / -1" }}>
        <h3>Active reservations</h3>

        {data.activeReservations.length === 0 ? (
          <p>No active or upcoming reservations.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Station</th>
                  <th>Charger</th>
                  <th>Window</th>
                  <th>Status</th>
                  <th>Booking fee</th>
                </tr>
              </thead>

              <tbody>
                {data.activeReservations.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.station_name}</td>
                    <td>
                      #{r.charger_id} ({r.charger_type})
                    </td>
                    <td>
                      {new Date(r.start_time).toLocaleString()} →{" "}
                      {new Date(r.end_time).toLocaleString()}
                    </td>
                    <td>{r.status}</td>
                    <td>Rs {Number(r.booking_fee).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="card form" style={{ gridColumn: "1 / -1" }}>
        <h3>Change a confirmed reservation</h3>

        <p style={{ marginTop: 0, opacity: 0.85 }}>
          You can reschedule or switch charger while status is{" "}
          <strong>confirmed</strong>. The original booking fee stays
          non-refundable.
        </p>

        {changeable.length === 0 ? (
          <p>No confirmed reservations to edit.</p>
        ) : (
          <form onSubmit={handleSaveReservation}>
            <label htmlFor="res-pick">Reservation</label>

            <select
              id="res-pick"
              value={selectedId === "" ? "" : String(selectedId)}
              onChange={(e) =>
                setSelectedId(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
            >
              <option value="">Select…</option>

              {changeable.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} — {r.station_name} (
                  {new Date(r.start_time).toLocaleString()})
                </option>
              ))}
            </select>

            <input
              placeholder="Charger ID"
              value={editCharger}
              onChange={(e) => setEditCharger(e.target.value)}
            />

            <input
              type="datetime-local"
              value={editStart}
              onChange={(e) => setEditStart(e.target.value)}
            />

            <input
              type="datetime-local"
              value={editEnd}
              onChange={(e) => setEditEnd(e.target.value)}
            />

            <button className="btn" type="submit" disabled={saving}>
              Save changes
            </button>
          </form>
        )}
      </article>

      <article className="card" style={{ gridColumn: "1 / -1" }}>
        <h3>Booking fees charged (non-refundable)</h3>

        {data.bookingFees.length === 0 ? (
          <p>No booking fee records yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Reservation</th>
                <th>Station</th>
                <th>Amount</th>
                <th>Charged at</th>
              </tr>
            </thead>

            <tbody>
              {data.bookingFees.map((b) => (
                <tr key={b.reservation_id}>
                  <td>{b.reservation_id}</td>
                  <td>{b.station_name}</td>
                  <td>Rs {Number(b.amount).toFixed(2)}</td>
                  <td>{new Date(b.charged_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>

      <article className="card" style={{ gridColumn: "1 / -1" }}>
        <h3>Charging session payments</h3>

        {data.sessionPayments.length === 0 ? (
          <p>No completed charging payments yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Payment</th>
                <th>Reservation</th>
                <th>Station</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Paid at</th>
              </tr>
            </thead>

            <tbody>
              {data.sessionPayments.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.reservation_id}</td>
                  <td>{p.station_name}</td>
                  <td>Rs {Number(p.amount).toFixed(2)}</td>
                  <td>{p.payment_status}</td>
                  <td>{new Date(p.paid_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
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
        <Route path="/account" element={<UserAccount />} />
        <Route path="/profile" element={<UserProfile />} />
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
