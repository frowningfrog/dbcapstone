const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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

async function requireAuth(req, res, next) {
  const studentId = getStudentIdFromRequest(req);
  if (!studentId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  req.studentId = studentId;
  next();
}

// GET all courses with enrollment status for the logged-in student
router.get("/", async (req, res) => {
  try {
    const studentId = getStudentIdFromRequest(req);
    const { rows: courses } = await pool.query("SELECT * FROM courses");

    const mappedCourses = courses.map((course) => ({
      ...course,
      id: course.course_id || course.id,
    }));

    if (!studentId) {
      return res.json({
        courses: mappedCourses.map((course) => ({
          ...course,
          isEnrolled: false,
        })),
      });
    }

    const { rows: enrolledRows } = await pool.query(
      "SELECT course_id FROM enrollment WHERE student_id = $1",
      [studentId],
    );

    const enrolledCourseIds = new Set(enrolledRows.map((row) => row.course_id));
    res.json({
      courses: mappedCourses.map((course) => ({
        ...course,
        isEnrolled: enrolledCourseIds.has(course.course_id || course.id),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching courses." });
  }
});

// POST enroll in a course
router.post("/:courseId/enroll", requireAuth, async (req, res) => {
  try {
    const courseId = req.params.courseId;
    if (!courseId || typeof courseId !== "string") {
      return res.status(400).json({ message: "Invalid course ID." });
    }

    const { rows } = await pool.query(
      "SELECT 1 FROM enrollment WHERE student_id = $1 AND course_id = $2",
      [req.studentId, courseId],
    );

    if (rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Already enrolled in this course." });
    }

    await pool.query(
      "INSERT INTO enrollment (student_id, course_id) VALUES ($1, $2)",
      [req.studentId, courseId],
    );

    res.json({ message: "Enrollment successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error enrolling in course." });
  }
});

module.exports = router;
