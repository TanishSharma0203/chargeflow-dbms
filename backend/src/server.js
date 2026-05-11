const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET || "chargeflow_dev_secret";
const bookingFee = Number(process.env.BOOKING_FEE || 49);

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "chargeflow",
  password: process.env.DB_PASSWORD || "postgres",
  port: Number(process.env.DB_PORT || 5432),
});

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.send("ChargeFlow Backend Running");
});

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const payload = jwt.verify(token, jwtSecret);

    req.user = payload;

    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }
};

const assertUserHasNoOverlappingReservation = async (
  client,
  userId,
  startIso,
  endIso,
  excludeReservationId
) => {
  const params = [userId, startIso, endIso];
  let sql = `
    SELECT id
    FROM reservations
    WHERE user_id=$1
    AND status IN ('confirmed','active')
    AND tstzrange(start_time, end_time, '[)')
    && tstzrange($2::timestamptz, $3::timestamptz, '[)')
  `;

  if (excludeReservationId) {
    params.push(excludeReservationId);

    sql += ` AND id <> $${params.length}`;
  }

  const overlap = await client.query(sql, params);

  return overlap.rowCount === 0;
};

const assertChargerSlotFree = async (
  client,
  chargerId,
  startIso,
  endIso,
  excludeReservationId
) => {
  const params = [chargerId, startIso, endIso];
  let sql = `
    SELECT id
    FROM reservations
    WHERE charger_id=$1
    AND status IN ('confirmed','active')
    AND tstzrange(start_time, end_time, '[)')
    && tstzrange($2::timestamptz, $3::timestamptz, '[)')
  `;

  if (excludeReservationId) {
    params.push(excludeReservationId);

    sql += ` AND id <> $${params.length}`;
  }

  const overlap = await client.query(sql, params);

  return overlap.rowCount === 0;
};

app.get("/api/users/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, name, email, phone, vehicle_type, created_at
      FROM users
      WHERE id=$1
      `,
      [req.user.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to load profile",
    });
  }
});

app.get("/api/users/me/account", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      activeList,
      sessionPayments,
      bookingFees,
    ] = await Promise.all([
      pool.query(
        `
        SELECT r.*,
        c.charger_type,
        c.charger_code,
        s.id AS station_id,
        s.station_name,
        s.location
        FROM reservations r
        JOIN chargers c ON c.id=r.charger_id
        JOIN charging_stations s ON s.id=c.station_id
        WHERE r.user_id=$1
        AND r.status IN ('confirmed','active')
        ORDER BY r.start_time ASC
        `,
        [userId]
      ),

      pool.query(
        `
        SELECT p.id,
        p.amount,
        p.payment_status,
        p.payment_method,
        p.paid_at,
        r.id AS reservation_id,
        s.station_name
        FROM payments p
        JOIN charging_sessions cs ON cs.id=p.session_id
        JOIN reservations r ON r.id=cs.reservation_id
        JOIN chargers c ON c.id=r.charger_id
        JOIN charging_stations s ON s.id=c.station_id
        WHERE r.user_id=$1
        ORDER BY p.paid_at DESC
        `,
        [userId]
      ),

      pool.query(
        `
        SELECT r.id AS reservation_id,
        r.booking_fee AS amount,
        r.created_at AS charged_at,
        s.station_name
        FROM reservations r
        JOIN chargers c ON c.id=r.charger_id
        JOIN charging_stations s ON s.id=c.station_id
        WHERE r.user_id=$1
        AND r.booking_fee > 0
        ORDER BY r.created_at DESC
        `,
        [userId]
      ),
    ]);

    res.json({
      activeReservationsCount: activeList.rowCount,
      activeReservations: activeList.rows,
      sessionPayments: sessionPayments.rows,
      bookingFees: bookingFees.rows,
      bookingFeePolicy: {
        amount: bookingFee,
        nonRefundable: true,
        description:
          "A non-refundable booking fee is charged per reservation to prevent slot spam. You can only hold one active time window at a time (no overlapping bookings).",
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to load account",
    });
  }
});

app.get("/api/health", async (_req, res) => {
  try {
    const db = await pool.query("SELECT NOW() AS now");

    res.json({
      status: "ok",
      database: db.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      vehicle_type,
    } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const user = await pool.query(
      `INSERT INTO users
      (name, email, phone, password_hash, vehicle_type)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id, name, email, phone, vehicle_type, created_at`,
      [name, email, phone, hashed, vehicle_type]
    );

    const token = jwt.sign(
      {
        id: user.rows[0].id,
        role: "user",
      },
      jwtSecret,
      {
        expiresIn: "7d",
      }
    );

    res.status(201).json({
      user: user.rows[0],
      token,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Signup failed",
      detail: error.message,
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (!result.rowCount) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!valid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: "user",
      },
      jwtSecret,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        vehicle_type: user.vehicle_type,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Login failed",
      detail: error.message,
    });
  }
});

app.get("/api/stations", async (req, res) => {
  try {
    const {
      search,
      available_now,
      charger_type,
    } = req.query;

    let sql = `
      SELECT s.*,
      COUNT(c.id)::int AS total_chargers,
      COUNT(CASE WHEN c.status='available' THEN 1 END)::int AS available_chargers,
      ROUND(COALESCE(AVG(r.rating),0)::numeric,1) AS rating
      FROM charging_stations s
      LEFT JOIN chargers c ON c.station_id=s.id
      LEFT JOIN reviews r ON r.station_id=s.id
      WHERE 1=1
    `;

    const values = [];

    if (search) {
      values.push(`%${search}%`);

      sql += `
        AND (
          s.station_name ILIKE $${values.length}
          OR s.location ILIKE $${values.length}
        )
      `;
    }

    if (charger_type) {
      values.push(charger_type);

      sql += `
        AND c.charger_type = $${values.length}
      `;
    }

    sql += " GROUP BY s.id";

    if (available_now === "true") {
      sql += `
        HAVING COUNT(
          CASE WHEN c.status='available' THEN 1 END
        ) > 0
      `;
    }

    const stations = await pool.query(sql, values);

    res.json(stations.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch stations",
      detail: error.message,
    });
  }
});





/* =========================
   RESERVATIONS
========================= */

app.post("/api/reservations", auth, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      charger_id,
      start_time,
      end_time,
    } = req.body;

    if (
      !charger_id ||
      !start_time ||
      !end_time
    ) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const startIso = new Date(start_time).toISOString();
    const endIso = new Date(end_time).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      return res.status(400).json({
        message: "End time must be after start time",
      });
    }

    await client.query("BEGIN");

    const userOk = await assertUserHasNoOverlappingReservation(
      client,
      req.user.id,
      startIso,
      endIso,
      null
    );

    if (!userOk) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message:
          "You already have an active reservation that overlaps this time. Only one booking window is allowed at a time.",
      });
    }

    const chargerOk = await assertChargerSlotFree(
      client,
      charger_id,
      startIso,
      endIso,
      null
    );

    if (!chargerOk) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message: "Slot unavailable for this charger",
      });
    }

    const reservation = await client.query(
      `
      INSERT INTO reservations
      (
        user_id,
        charger_id,
        start_time,
        end_time,
        status,
        booking_fee
      )
      VALUES ($1,$2,$3,$4,'confirmed',$5)
      RETURNING *
      `,
      [
        req.user.id,
        charger_id,
        startIso,
        endIso,
        bookingFee,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      bookingFeeCharged: bookingFee,
      bookingFeeNonRefundable: true,
      reservation: reservation.rows[0],
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      // no transaction to roll back
    }

    console.error("Reservation Error:", error);

    res.status(500).json({
      message: "Reservation creation failed",
      detail: error.message,
    });
  } finally {
    client.release();
  }
});

app.patch("/api/reservations/:id", auth, async (req, res) => {
  const reservationId = Number(req.params.id);

  if (!Number.isFinite(reservationId)) {
    return res.status(400).json({
      message: "Invalid reservation id",
    });
  }

  const {
    charger_id,
    start_time,
    end_time,
  } = req.body;

  const existing = await pool.query(
    `
    SELECT r.*
    FROM reservations r
    WHERE r.id=$1 AND r.user_id=$2
    `,
    [reservationId, req.user.id]
  );

  if (!existing.rowCount) {
    return res.status(404).json({
      message: "Reservation not found",
    });
  }

  const row = existing.rows[0];

  if (row.status !== "confirmed") {
    return res.status(400).json({
      message:
        "Only confirmed reservations can be changed. Active or completed bookings cannot be edited here.",
    });
  }

  const nextChargerId = charger_id ?? row.charger_id;
  const nextStartIso = start_time
    ? new Date(start_time).toISOString()
    : new Date(row.start_time).toISOString();
  const nextEndIso = end_time
    ? new Date(end_time).toISOString()
    : new Date(row.end_time).toISOString();

  if (new Date(nextEndIso) <= new Date(nextStartIso)) {
    return res.status(400).json({
      message: "End time must be after start time",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userOk = await assertUserHasNoOverlappingReservation(
      client,
      req.user.id,
      nextStartIso,
      nextEndIso,
      reservationId
    );

    if (!userOk) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message:
          "This change overlaps another of your reservations. You can only have one active time window at a time.",
      });
    }

    const chargerOk = await assertChargerSlotFree(
      client,
      nextChargerId,
      nextStartIso,
      nextEndIso,
      reservationId
    );

    if (!chargerOk) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message: "Slot unavailable for the selected charger",
      });
    }

    const updated = await client.query(
      `
      UPDATE reservations
      SET
        charger_id=$2,
        start_time=$3,
        end_time=$4
      WHERE id=$1 AND user_id=$5 AND status='confirmed'
      RETURNING *
      `,
      [
        reservationId,
        nextChargerId,
        nextStartIso,
        nextEndIso,
        req.user.id,
      ]
    );

    if (!updated.rowCount) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Reservation could not be updated",
      });
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      reservation: updated.rows[0],
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      // ignore
    }

    console.error("Reservation update error:", error);

    res.status(500).json({
      message: "Reservation update failed",
    });
  } finally {
    client.release();
  }
});





app.get("/api/reservations/me", auth, async (req, res) => {
  try {
    const reservations = await pool.query(
      `
      SELECT r.*,
      c.charger_type,
      s.station_name,
      s.location
      FROM reservations r
      JOIN chargers c ON c.id=r.charger_id
      JOIN charging_stations s ON s.id=c.station_id
      WHERE r.user_id=$1
      ORDER BY r.start_time DESC
      `,
      [req.user.id]
    );

    res.json(reservations.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch reservations",
    });
  }
});

app.post("/api/sessions/start", auth, async (req, res) => {
  try {
    const {
      reservation_id,
      initial_battery,
    } = req.body;

    const session = await pool.query(
      `
      INSERT INTO charging_sessions
      (
        reservation_id,
        start_battery,
        started_at,
        status
      )
      VALUES ($1,$2,NOW(),'active')
      RETURNING *
      `,
      [reservation_id, initial_battery]
    );

    await pool.query(
      `
      UPDATE reservations
      SET status='active'
      WHERE id=$1
      `,
      [reservation_id]
    );

    res.status(201).json(session.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to start session",
    });
  }
});

app.post("/api/sessions/end", auth, async (req, res) => {
  try {
    const {
      session_id,
      end_battery,
      power_kwh,
    } = req.body;

    const ended = await pool.query(
      `
      UPDATE charging_sessions
      SET
        ended_at=NOW(),
        end_battery=$2,
        power_kwh=$3,
        status='completed'
      WHERE id=$1
      RETURNING *
      `,
      [session_id, end_battery, power_kwh]
    );

    if (!ended.rowCount) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    const payment = await pool.query(
      `
      INSERT INTO payments
      (
        session_id,
        amount,
        payment_status,
        payment_method
      )
      VALUES ($1,$2,'paid','UPI')
      RETURNING *
      `,
      [session_id, Number(power_kwh) * 0.45]
    );

    res.json({
      session: ended.rows[0],
      payment: payment.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to end session",
    });
  }
});

app.get("/api/admin/metrics", async (_req, res) => {
  try {
    const [
      users,
      reservations,
      revenue,
      stations,
    ] = await Promise.all([
      pool.query(
        "SELECT COUNT(*)::int AS users FROM users"
      ),

      pool.query(
        `
        SELECT COUNT(*)::int AS reservations
        FROM reservations
        WHERE status IN ('confirmed','active')
        `
      ),

      pool.query(
        `
        SELECT COALESCE(
          SUM(amount),
          0
        )::numeric(10,2) AS revenue
        FROM payments
        `
      ),

      pool.query(
        `
        SELECT COUNT(*)::int AS stations
        FROM charging_stations
        `
      ),
    ]);

    res.json({
      users: users.rows[0].users,
      activeReservations:
        reservations.rows[0].reservations,
      revenue: Number(revenue.rows[0].revenue),
      stations: stations.rows[0].stations,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch admin metrics",
    });
  }
});

app.post("/api/reviews", auth, async (req, res) => {
  try {
    const {
      station_id,
      rating,
      comment,
    } = req.body;

    const review = await pool.query(
      `
      INSERT INTO reviews
      (
        user_id,
        station_id,
        rating,
        comment
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
      [
        req.user.id,
        station_id,
        rating,
        comment,
      ]
    );

    res.status(201).json(review.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Review submission failed",
    });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);

  res.status(500).json({
    message: "Server error",
    detail: err.message,
  });
});

app.listen(port, () => {
  console.log(
    `ChargeFlow API running on http://localhost:${port}`
  );
});