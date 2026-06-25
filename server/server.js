const express = require("express");
const bcrypt = require("bcrypt");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const LocalStrategy = require("passport-local").Strategy;
const { body, validationResult } = require("express-validator");
const coursesRouter = require("./routes/courses");
const authRouter = require("./routes/auth");

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

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
