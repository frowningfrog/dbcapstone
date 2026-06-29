import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function ProfilePage() {
  const { authFetch, user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfileCourses() {
      setLoading(true);
      setError("");
      try {
        const res = await authFetch("/api/courses/profile");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Could not load profile.");
        }
        setCourses(data.courses || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfileCourses();
  }, [authFetch]);

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
          <h1>Profile</h1>
          <p>
            {user?.first_name || user?.last_name
              ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
              : user?.email}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <section className="card">
          <h2>Your Enrolled Courses</h2>
          {courses.length === 0 && <p>You are not enrolled in any courses.</p>}
          <ul className="simple-list">
            {courses.map((course) => (
              <li key={course.course_id}>
                <strong>{course.course_id}</strong> - {course.course_title}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
