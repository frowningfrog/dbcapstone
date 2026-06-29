const express = require("express");
const path = require("node:path");
const pool = require("./db");
const coursesRouter = require("./routes/courses");
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");

const PORT = process.env.PORT || 3001;

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Have Node serve the files for our built React app (prod)
app.use(express.static(path.resolve(__dirname, "../client/dist")));

// Handle GET requests to /api route
app.get("/api", (req, res) => {
  res.json({ message: "Hello from server!" });
});

// Use auth router
app.use("/api/auth", authRouter);

// Use courses router
app.use("/api/courses", coursesRouter);

// Use admin router
app.use("/api/admin", adminRouter);

async function ensureSchema() {
  // Keep this idempotent so existing databases continue to work.
  await pool.query(
    "ALTER TABLE student ADD COLUMN IF NOT EXISTS first_name varchar(255)",
  );
  await pool.query(
    "ALTER TABLE student ADD COLUMN IF NOT EXISTS last_name varchar(255)",
  );
  await pool.query(
    "ALTER TABLE student ADD COLUMN IF NOT EXISTS address varchar(1000)",
  );
  await pool.query(
    "ALTER TABLE student ADD COLUMN IF NOT EXISTS activebool boolean DEFAULT true",
  );
  await pool.query(
    "ALTER TABLE student ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false",
  );
}

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../client/dist/index.html"));
});

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Schema setup failed:", err);
    process.exit(1);
  });
