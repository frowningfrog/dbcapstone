const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseNullableInteger(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function getStudentIdFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.id;
  } catch (err) {
    return null;
  }
}

async function requireAdmin(req, res, next) {
  const studentId = getStudentIdFromRequest(req);
  if (!studentId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { rows } = await pool.query(
    "SELECT student_id, is_admin FROM student WHERE student_id = $1",
    [studentId],
  );

  if (rows.length === 0 || rows[0].is_admin !== true) {
    return res.status(403).json({ message: "Admin access required" });
  }

  req.studentId = studentId;
  next();
}

router.use(requireAdmin);

router.get("/users", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         s.student_id,
         s.first_name,
         s.last_name,
         s.email,
         s.address,
         s.activebool,
         s.is_admin,
         COUNT(e.course_id) AS course_count
       FROM student s
       LEFT JOIN enrollment e ON e.student_id = s.student_id
       GROUP BY s.student_id
       ORDER BY s.student_id ASC`,
    );

    res.json({ users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch users." });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { first_name, last_name, email, address, password } = req.body;
    if (
      !isNonEmptyString(first_name) ||
      !isNonEmptyString(last_name) ||
      !isNonEmptyString(email) ||
      !isNonEmptyString(address) ||
      !isNonEmptyString(password)
    ) {
      return res.status(400).json({ message: "All user fields are required." });
    }

    const existing = await pool.query("SELECT 1 FROM student WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "A user with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO student
       (first_name, last_name, email, address, password, activebool, is_admin)
       VALUES ($1, $2, $3, $4, $5, true, false)
       RETURNING student_id, first_name, last_name, email, address, activebool, is_admin`,
      [first_name, last_name, email, address, hashedPassword],
    );

    res.status(201).json({ user: rows[0], message: "User created." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not create user." });
  }
});

router.put("/users/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const parsedStudentId = parsePositiveInteger(studentId);
    if (!parsedStudentId) {
      return res.status(400).json({ message: "Invalid student ID." });
    }

    const { first_name, last_name, email, address, password } = req.body;

    if (
      !isNonEmptyString(first_name) ||
      !isNonEmptyString(last_name) ||
      !isNonEmptyString(email) ||
      !isNonEmptyString(address)
    ) {
      return res.status(400).json({ message: "All user fields are required." });
    }

    const duplicateEmail = await pool.query(
      "SELECT 1 FROM student WHERE email = $1 AND student_id <> $2",
      [email, parsedStudentId],
    );
    if (duplicateEmail.rows.length > 0) {
      return res.status(409).json({ message: "A user with this email already exists." });
    }

    let passwordClause = "";
    const values = [first_name, last_name, email, address, parsedStudentId];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      passwordClause = ", password = $6";
      values.push(hashedPassword);
    }

    const query = `UPDATE student
      SET first_name = $1,
          last_name = $2,
          email = $3,
          address = $4
          ${passwordClause}
      WHERE student_id = $5
      RETURNING student_id, first_name, last_name, email, address, activebool, is_admin`;

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ user: rows[0], message: "User updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update user." });
  }
});

router.delete("/users/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const parsedStudentId = parsePositiveInteger(studentId);
    if (!parsedStudentId) {
      return res.status(400).json({ message: "Invalid student ID." });
    }

    const { rowCount } = await pool.query(
      "DELETE FROM student WHERE student_id = $1",
      [parsedStudentId],
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ message: "User deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete user." });
  }
});

router.get("/courses", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         c.course_id,
         c.course_title,
         c.course_description,
         c.classroom_number,
         c.capacity,
         c.credit_hours,
         c.tuition_cost,
         COUNT(e.student_id) AS enrolled_count
       FROM courses c
       LEFT JOIN enrollment e ON e.course_id = c.course_id
       GROUP BY c.course_id
       ORDER BY c.course_id ASC`,
    );

    res.json({ courses: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch courses." });
  }
});

router.post("/courses", async (req, res) => {
  try {
    const {
      course_id,
      course_title,
      course_description,
      classroom_number,
      capacity,
      credit_hours,
      tuition_cost,
    } = req.body;

    if (
      !isNonEmptyString(course_id) ||
      !isNonEmptyString(course_title) ||
      !isNonEmptyString(course_description) ||
      !isNonEmptyString(String(credit_hours)) ||
      !isNonEmptyString(String(tuition_cost))
    ) {
      return res.status(400).json({
        message: "All course fields except room and capacity are required.",
      });
    }

    const parsedCapacity = parseNullableInteger(capacity);
    if (capacity !== "" && capacity !== null && capacity !== undefined && parsedCapacity === null) {
      return res.status(400).json({ message: "Capacity must be a valid integer." });
    }

    const parsedCreditHours = parsePositiveInteger(credit_hours);
    if (!parsedCreditHours) {
      return res.status(400).json({ message: "Credit hours must be a positive integer." });
    }

    const existingCourse = await pool.query(
      "SELECT 1 FROM courses WHERE course_id = $1",
      [course_id],
    );
    if (existingCourse.rows.length > 0) {
      return res.status(409).json({ message: "A course with this ID already exists." });
    }

    const { rows } = await pool.query(
      `INSERT INTO courses
       (course_id, course_title, course_description, classroom_number, capacity, credit_hours, tuition_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        course_id,
        course_title,
        course_description,
        classroom_number || null,
        parsedCapacity,
        parsedCreditHours,
        tuition_cost,
      ],
    );

    res.status(201).json({ course: rows[0], message: "Course created." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not create course." });
  }
});

router.put("/courses/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!isNonEmptyString(courseId)) {
      return res.status(400).json({ message: "Invalid course ID." });
    }

    const {
      course_title,
      course_description,
      classroom_number,
      capacity,
      credit_hours,
      tuition_cost,
    } = req.body;

    if (
      !isNonEmptyString(course_title) ||
      !isNonEmptyString(course_description) ||
      !isNonEmptyString(String(credit_hours)) ||
      !isNonEmptyString(String(tuition_cost))
    ) {
      return res.status(400).json({
        message: "All course fields except room and capacity are required.",
      });
    }

    const parsedCapacity = parseNullableInteger(capacity);
    if (capacity !== "" && capacity !== null && capacity !== undefined && parsedCapacity === null) {
      return res.status(400).json({ message: "Capacity must be a valid integer." });
    }

    const parsedCreditHours = parsePositiveInteger(credit_hours);
    if (!parsedCreditHours) {
      return res.status(400).json({ message: "Credit hours must be a positive integer." });
    }

    const { rows } = await pool.query(
      `UPDATE courses
       SET course_title = $1,
           course_description = $2,
           classroom_number = $3,
           capacity = $4,
           credit_hours = $5,
           tuition_cost = $6
       WHERE course_id = $7
       RETURNING *`,
      [
        course_title,
        course_description,
        classroom_number || null,
        parsedCapacity,
        parsedCreditHours,
        tuition_cost,
        courseId,
      ],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Course not found." });
    }

    res.json({ course: rows[0], message: "Course updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update course." });
  }
});

router.delete("/courses/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!isNonEmptyString(courseId)) {
      return res.status(400).json({ message: "Invalid course ID." });
    }

    const { rowCount } = await pool.query(
      "DELETE FROM courses WHERE course_id = $1",
      [courseId],
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: "Course not found." });
    }

    res.json({ message: "Course deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete course." });
  }
});

router.post("/enrollments", async (req, res) => {
  try {
    const { student_id, course_id } = req.body;
    const parsedStudentId = parsePositiveInteger(student_id);
    if (!parsedStudentId || !isNonEmptyString(course_id)) {
      return res.status(400).json({ message: "Student and course are required." });
    }

    const studentExists = await pool.query(
      "SELECT 1 FROM student WHERE student_id = $1",
      [parsedStudentId],
    );
    if (studentExists.rows.length === 0) {
      return res.status(404).json({ message: "Student not found." });
    }

    const courseExists = await pool.query(
      "SELECT 1 FROM courses WHERE course_id = $1",
      [course_id],
    );
    if (courseExists.rows.length === 0) {
      return res.status(404).json({ message: "Course not found." });
    }

    const exists = await pool.query(
      "SELECT 1 FROM enrollment WHERE student_id = $1 AND course_id = $2",
      [parsedStudentId, course_id],
    );

    if (exists.rows.length > 0) {
      return res.status(409).json({ message: "Student is already enrolled." });
    }

    await pool.query(
      "INSERT INTO enrollment (student_id, course_id) VALUES ($1, $2)",
      [parsedStudentId, course_id],
    );

    res.status(201).json({ message: "Student registered." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not register student." });
  }
});

router.delete("/enrollments", async (req, res) => {
  try {
    const { student_id, course_id } = req.body;
    const parsedStudentId = parsePositiveInteger(student_id);
    if (!parsedStudentId || !isNonEmptyString(course_id)) {
      return res.status(400).json({ message: "Student and course are required." });
    }

    const studentExists = await pool.query(
      "SELECT 1 FROM student WHERE student_id = $1",
      [parsedStudentId],
    );
    if (studentExists.rows.length === 0) {
      return res.status(404).json({ message: "Student not found." });
    }

    const courseExists = await pool.query(
      "SELECT 1 FROM courses WHERE course_id = $1",
      [course_id],
    );
    if (courseExists.rows.length === 0) {
      return res.status(404).json({ message: "Course not found." });
    }

    const { rowCount } = await pool.query(
      "DELETE FROM enrollment WHERE student_id = $1 AND course_id = $2",
      [parsedStudentId, course_id],
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: "Enrollment not found." });
    }

    res.json({ message: "Student unregistered." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not unregister student." });
  }
});

module.exports = router;
