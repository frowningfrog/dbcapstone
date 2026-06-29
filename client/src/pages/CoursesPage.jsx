import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function CoursesPage() {
  const { authFetch, user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState("all");

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await authFetch("/api/courses");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Could not load courses.");
      }
      setCourses(data.courses || []);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  async function enroll(courseId) {
    setMessage("");
    try {
      const res = await authFetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Could not enroll.");
      }
      setMessage(data.message || "Enrollment successful.");
      await loadCourses();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function drop(courseId) {
    setMessage("");
    try {
      const res = await authFetch(`/api/courses/${courseId}/drop`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Could not drop course.");
      }
      setMessage(data.message || "Dropped course.");
      await loadCourses();
    } catch (err) {
      setMessage(err.message);
    }
  }

  const visibleCourses = courses.filter((course) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [course.course_id, course.course_title, course.classroom_number]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

    const matchesAvailability =
      availability === "all" ||
      (availability === "enrolled" && course.isEnrolled) ||
      (availability === "not-enrolled" && !course.isEnrolled);

    return matchesSearch && matchesAvailability;
  });

  function formatMoney(value) {
    const n = parseFloat(String(value || "").replace(/[^0-9.-]+/g, ""));
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-inner">
          <div className="brand">
            <span className="brand-logo">M</span>
            <span className="brand-name">MTECH</span>
          </div>
          <nav className="page-nav">
            <Link to="/courses" className="nav-link">
              Courses
            </Link>
            <Link to="/profile" className="nav-link">
              Profile
            </Link>
            {user?.is_admin && (
              <Link to="/admin" className="nav-link">
                Admin
              </Link>
            )}
            <Link to="/logout" className="nav-link nav-link--logout">
              Sign out
            </Link>
          </nav>
        </div>
      </header>

      <main className="page-main">
        <div className="section-head">
          <h1>Course Catalog</h1>
          <p>Browse, enroll, and manage your registrations.</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}

        <section className="card" style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 220px",
              gap: "0.8rem",
            }}
          >
            <input
              type="search"
              placeholder="Search by course ID, title, or room"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            >
              <option value="all">All courses</option>
              <option value="enrolled">Enrolled</option>
              <option value="not-enrolled">Not enrolled</option>
            </select>
          </div>
        </section>

        <div className="course-grid">
          {visibleCourses.map((course) => (
            <article key={course.course_id} className="card">
              <h2>{course.course_title}</h2>
              <p className="course-meta">{course.course_id}</p>
              <p>{course.course_description}</p>
              <p className="course-meta">
                Room: {course.classroom_number || "TBA"} | Credits:{" "}
                {course.credit_hours} | Tuition: $
                {formatMoney(course.tuition_cost)}
              </p>
              <button
                className={course.isEnrolled ? "btn-danger" : "btn-primary"}
                type="button"
                onClick={() =>
                  course.isEnrolled
                    ? drop(course.course_id)
                    : enroll(course.course_id)
                }
              >
                {course.isEnrolled ? "Drop" : "Enroll"}
              </button>
            </article>
          ))}
          {visibleCourses.length === 0 && (
            <p>No courses matched your filters.</p>
          )}
        </div>
      </main>
    </div>
  );
}
