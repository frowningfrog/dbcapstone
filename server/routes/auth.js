const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function serializeUser(row) {
  return {
    id: row.student_id,
    student_id: row.student_id,
    first_name: row.first_name || "",
    last_name: row.last_name || "",
    email: row.email,
    address: row.address || "",
    activebool: row.activebool !== false,
    is_admin: row.is_admin === true,
  };
}

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split(" ")[1];
}

// POST /register
router.post("/register", async (req, res) => {
  try {
    const { first_name, last_name, email, address, password, isAdmin } =
      req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Check if user already exists
    const userExists = await pool.query(
      "SELECT * FROM student WHERE email = $1",
      [email],
    );

    if (userExists.rows.length > 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const adminEmails = getAdminEmails();
    // const isAdmin = adminEmails.has(String(email).toLowerCase());

    const result = await pool.query(
      `INSERT INTO student (
        first_name,
        last_name,
        email,
        address,
        password,
        activebool,
        is_admin
      ) VALUES ($1, $2, $3, $4, $5, true, $6)
      RETURNING student_id, first_name, last_name, email, address, activebool, is_admin`,
      [
        first_name || "",
        last_name || "",
        email,
        address || "",
        hashedPassword,
        isAdmin,
      ],
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.student_id,
        email: user.email,
        is_admin: user.is_admin === true,
      },
      JWT_SECRET,
      {
        expiresIn: "24h",
      },
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Find user by email
    const result = await pool.query(
      "SELECT student_id, first_name, last_name, email, address, password, activebool, is_admin FROM student WHERE email = $1",
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.student_id,
        email: user.email,
        is_admin: user.is_admin === true,
      },
      JWT_SECRET,
      {
        expiresIn: "24h",
      },
    );

    res.json({
      message: "Login successful",
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /me
router.get("/me", async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(
      "SELECT student_id, first_name, last_name, email, address, activebool, is_admin FROM student WHERE student_id = $1",
      [payload.id],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    return res.json({ user: serializeUser(result.rows[0]) });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
});

module.exports = router;
