const express = require("express");
const pool = require("../db");

const router = express.Router();

// GET all courses
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM courses`);
    res.json({ courses: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching courses." });
  }
});

module.exports = router;
