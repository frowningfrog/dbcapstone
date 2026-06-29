import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const blankUser = {
	first_name: "",
	last_name: "",
	email: "",
	address: "",
	password: "",
};

const blankCourse = {
	course_id: "",
	course_title: "",
	course_description: "",
	classroom_number: "",
	capacity: "",
	credit_hours: "",
	tuition_cost: "",
};

const blankEnrollment = {
	student_id: "",
	course_id: "",
};

export default function AdminPage() {
	const { authFetch } = useAuth();
	const [users, setUsers] = useState([]);
	const [courses, setCourses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [pageError, setPageError] = useState("");

	const [userSearch, setUserSearch] = useState("");
	const [userStatus, setUserStatus] = useState("all");
	const [courseSearch, setCourseSearch] = useState("");
	const [courseAvailability, setCourseAvailability] = useState("all");

	const [userForm, setUserForm] = useState(blankUser);
	const [userEditId, setUserEditId] = useState(null);
	const [userBusy, setUserBusy] = useState(false);
	const [userMessage, setUserMessage] = useState("");

	const [courseForm, setCourseForm] = useState(blankCourse);
	const [courseEditId, setCourseEditId] = useState(null);
	const [courseBusy, setCourseBusy] = useState(false);
	const [courseMessage, setCourseMessage] = useState("");

	const [enrollmentForm, setEnrollmentForm] = useState(blankEnrollment);
	const [enrollmentBusy, setEnrollmentBusy] = useState(false);
	const [enrollmentMessage, setEnrollmentMessage] = useState("");

	const loadData = useCallback(async () => {
		setLoading(true);
		setPageError("");
		try {
			const [usersRes, coursesRes] = await Promise.all([
				authFetch("/api/admin/users"),
				authFetch("/api/admin/courses"),
			]);
			const usersData = await usersRes.json();
			const coursesData = await coursesRes.json();

			if (!usersRes.ok) throw new Error(usersData.message || "Could not load users.");
			if (!coursesRes.ok) throw new Error(coursesData.message || "Could not load courses.");

			setUsers(usersData.users || []);
			setCourses(coursesData.courses || []);
		} catch (err) {
			setPageError(err.message || "Could not load admin data.");
		} finally {
			setLoading(false);
		}
	}, [authFetch]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const visibleUsers = useMemo(() => {
		const search = userSearch.trim().toLowerCase();
		return users.filter((user) => {
			const matchesSearch =
				!search ||
				[user.student_id, user.first_name, user.last_name, user.email]
					.filter(Boolean)
					.some((value) => String(value).toLowerCase().includes(search));
			const matchesStatus =
				userStatus === "all" ||
				(userStatus === "active" && user.activebool) ||
				(userStatus === "inactive" && !user.activebool);
			return matchesSearch && matchesStatus;
		});
	}, [users, userSearch, userStatus]);

	const visibleCourses = useMemo(() => {
		const search = courseSearch.trim().toLowerCase();
		return courses.filter((course) => {
			const matchesSearch =
				!search ||
				[course.course_id, course.course_title, course.classroom_number]
					.filter(Boolean)
					.some((value) => String(value).toLowerCase().includes(search));
			const enrolledCount = Number(course.enrolled_count) || 0;
			const capacity = course.capacity === null ? null : Number(course.capacity);
			const isFull = capacity !== null && enrolledCount >= capacity;
			const matchesAvailability =
				courseAvailability === "all" ||
				(courseAvailability === "open" && !isFull) ||
				(courseAvailability === "full" && isFull);
			return matchesSearch && matchesAvailability;
		});
	}, [courses, courseSearch, courseAvailability]);

	function resetUserForm() {
		setUserForm(blankUser);
		setUserEditId(null);
		setUserMessage("");
	}

	function resetCourseForm() {
		setCourseForm(blankCourse);
		setCourseEditId(null);
		setCourseMessage("");
	}

	function handleUserChange(e) {
		const { name, value } = e.target;
		setUserForm((current) => ({ ...current, [name]: value }));
	}

	function handleCourseChange(e) {
		const { name, value } = e.target;
		setCourseForm((current) => ({ ...current, [name]: value }));
	}

	function handleEnrollmentChange(e) {
		const { name, value } = e.target;
		setEnrollmentForm((current) => ({ ...current, [name]: value }));
	}

	function editUser(user) {
		setUserEditId(user.student_id);
		setUserForm({
			first_name: user.first_name || "",
			last_name: user.last_name || "",
			email: user.email || "",
			address: user.address || "",
			password: "",
		});
		setUserMessage("");
	}

	function editCourse(course) {
		setCourseEditId(course.course_id);
		setCourseForm({
			course_id: course.course_id || "",
			course_title: course.course_title || "",
			course_description: course.course_description || "",
			classroom_number: course.classroom_number || "",
			capacity: course.capacity === null || course.capacity === undefined ? "" : String(course.capacity),
			credit_hours: course.credit_hours === null || course.credit_hours === undefined ? "" : String(course.credit_hours),
			tuition_cost: course.tuition_cost || "",
		});
		setCourseMessage("");
	}

	async function handleUserSubmit(e) {
		e.preventDefault();
		if (!userForm.first_name || !userForm.last_name || !userForm.email || !userForm.address) {
			setUserMessage("All user fields are required.");
			return;
		}
		if (!userEditId && !userForm.password) {
			setUserMessage("Password is required for new users.");
			return;
		}

		setUserBusy(true);
		try {
			const payload = {
				first_name: userForm.first_name,
				last_name: userForm.last_name,
				email: userForm.email,
				address: userForm.address,
			};
			if (userForm.password) {
				payload.password = userForm.password;
			}

			const res = await authFetch(
				userEditId ? `/api/admin/users/${userEditId}` : "/api/admin/users",
				{
					method: userEditId ? "PUT" : "POST",
					body: JSON.stringify(payload),
				},
			);
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || data.errors?.[0]?.msg || "Could not save user.");

			setUserMessage(userEditId ? "User updated." : "User created.");
			resetUserForm();
			await loadData();
		} catch (err) {
			setUserMessage(err.message);
		} finally {
			setUserBusy(false);
		}
	}

	async function handleDeleteUser(studentId) {
		if (!window.confirm("Delete this user?")) return;
		try {
			const res = await authFetch(`/api/admin/users/${studentId}`, { method: "DELETE" });
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Could not delete user.");
			await loadData();
			setUserMessage(data.message || "User deleted.");
		} catch (err) {
			setUserMessage(err.message);
		}
	}

	async function handleCourseSubmit(e) {
		e.preventDefault();
		if (!courseForm.course_id || !courseForm.course_title || !courseForm.course_description || !courseForm.credit_hours || !courseForm.tuition_cost) {
			setCourseMessage("All course fields except room and capacity are required.");
			return;
		}

		setCourseBusy(true);
		try {
			const payload = {
				course_id: courseForm.course_id,
				course_title: courseForm.course_title,
				course_description: courseForm.course_description,
				classroom_number: courseForm.classroom_number,
				capacity: courseForm.capacity,
				credit_hours: courseForm.credit_hours,
				tuition_cost: courseForm.tuition_cost,
			};

			const res = await authFetch(
				courseEditId ? `/api/admin/courses/${courseEditId}` : "/api/admin/courses",
				{
					method: courseEditId ? "PUT" : "POST",
					body: JSON.stringify(payload),
				},
			);
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || data.errors?.[0]?.msg || "Could not save course.");

			setCourseMessage(courseEditId ? "Course updated." : "Course created.");
			resetCourseForm();
			await loadData();
		} catch (err) {
			setCourseMessage(err.message);
		} finally {
			setCourseBusy(false);
		}
	}

	async function handleDeleteCourse(courseId) {
		if (!window.confirm("Delete this course?")) return;
		try {
			const res = await authFetch(`/api/admin/courses/${courseId}`, { method: "DELETE" });
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Could not delete course.");
			await loadData();
			setCourseMessage(data.message || "Course deleted.");
		} catch (err) {
			setCourseMessage(err.message);
		}
	}

	async function handleRegisterEnrollment() {
		if (!enrollmentForm.student_id || !enrollmentForm.course_id) {
			setEnrollmentMessage("Select a student and a course.");
			return;
		}

		setEnrollmentBusy(true);
		try {
			const res = await authFetch("/api/admin/enrollments", {
				method: "POST",
				body: JSON.stringify(enrollmentForm),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Could not register the student.");
			await loadData();
			setEnrollmentMessage(data.message || "Student registered.");
		} catch (err) {
			setEnrollmentMessage(err.message);
		} finally {
			setEnrollmentBusy(false);
		}
	}

	async function handleUnregisterEnrollment() {
		if (!enrollmentForm.student_id || !enrollmentForm.course_id) {
			setEnrollmentMessage("Select a student and a course.");
			return;
		}

		setEnrollmentBusy(true);
		try {
			const res = await authFetch("/api/admin/enrollments", {
				method: "DELETE",
				body: JSON.stringify(enrollmentForm),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Could not unregister the student.");
			await loadData();
			setEnrollmentMessage(data.message || "Student unregistered.");
		} catch (err) {
			setEnrollmentMessage(err.message);
		} finally {
			setEnrollmentBusy(false);
		}
	}

	if (loading) {
		return (
			<div className="loading-screen">
				<div className="spinner" />
			</div>
		);
	}

	return (
		<div className="page" style={{ width: "100%", minHeight: "100vh", textAlign: "left" }}>
			<header className="page-header">
				<div className="page-header-inner" style={{ justifyContent: "space-between", gap: "1rem" }}>
					<div className="brand">
						<span className="brand-logo">M</span>
						<span className="brand-name">MTECH Admin</span>
					</div>
					<nav className="page-nav" style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
						<Link to="/profile" className="nav-link">
							Student profile
						</Link>
						<Link to="/courses" className="nav-link">
							Courses
						</Link>
						<Link to="/logout" className="nav-link nav-link--logout">
							Sign out
						</Link>
					</nav>
				</div>
			</header>

			<main className="page-main">
				<div className="section-head" style={{ textAlign: "left" }}>
					<h1>Admin Console</h1>
					<p>Manage users, courses, and enrollments from one place.</p>
				</div>

				{pageError && <div className="alert alert-error">{pageError}</div>}

				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
					<div className="card">
						<strong>{users.length}</strong>
						<div>Total users</div>
					</div>
					<div className="card">
						<strong>{courses.length}</strong>
						<div>Total courses</div>
					</div>
					<div className="card">
						<strong>{visibleUsers.length}</strong>
						<div>Visible users</div>
					</div>
					<div className="card">
						<strong>{visibleCourses.length}</strong>
						<div>Visible courses</div>
					</div>
				</div>

				<section className="card" style={{ marginBottom: "1.5rem" }}>
					<div className="card-head" style={{ justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
						<h2>User management</h2>
						<button className="btn-secondary" type="button" onClick={resetUserForm}>
							New user
						</button>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 220px", gap: "1rem", marginBottom: "1rem" }}>
						<input
							type="search"
							placeholder="Search users by name, email, or ID"
							value={userSearch}
							onChange={(e) => setUserSearch(e.target.value)}
						/>
						<select value={userStatus} onChange={(e) => setUserStatus(e.target.value)}>
							<option value="all">All users</option>
							<option value="active">Active only</option>
							<option value="inactive">Inactive only</option>
						</select>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)", gap: "1rem", alignItems: "start" }}>
						<form onSubmit={handleUserSubmit} style={{ display: "grid", gap: "0.85rem" }}>
							<h3>{userEditId ? `Edit user ${userEditId}` : "Create user"}</h3>
							{userMessage && <div className="alert alert-success">{userMessage}</div>}
							<label className="field">
								<span>First name</span>
								<input name="first_name" value={userForm.first_name} onChange={handleUserChange} disabled={userBusy} />
							</label>
							<label className="field">
								<span>Last name</span>
								<input name="last_name" value={userForm.last_name} onChange={handleUserChange} disabled={userBusy} />
							</label>
							<label className="field">
								<span>Email</span>
								<input name="email" type="email" value={userForm.email} onChange={handleUserChange} disabled={userBusy} />
							</label>
							<label className="field">
								<span>Address</span>
								<input name="address" value={userForm.address} onChange={handleUserChange} disabled={userBusy} />
							</label>
							<label className="field">
								<span>Password {userEditId ? "(leave blank to keep current)" : ""}</span>
								<input name="password" type="password" value={userForm.password} onChange={handleUserChange} disabled={userBusy} />
							</label>
							<div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
								<button className="btn-primary" type="submit" disabled={userBusy}>
									{userBusy ? "Saving…" : userEditId ? "Update user" : "Create user"}
								</button>
								{userEditId && (
									<button className="btn-ghost" type="button" onClick={resetUserForm} disabled={userBusy}>
										Cancel
									</button>
								)}
							</div>
						</form>

						<div style={{ overflowX: "auto" }}>
							<table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
								<thead>
									<tr>
										<th>ID</th>
										<th>Name</th>
										<th>Email</th>
										<th>Status</th>
										<th>Courses</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{visibleUsers.map((user) => (
										<tr key={user.student_id}>
											<td>{user.student_id}</td>
											<td>
												{user.first_name} {user.last_name}
											</td>
											<td>{user.email}</td>
											<td>{user.activebool ? "Active" : "Inactive"}</td>
											<td>{user.course_count}</td>
											<td>
												<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
													<button className="btn-secondary" type="button" onClick={() => editUser(user)}>
														Edit
													</button>
													<button className="btn-danger" type="button" onClick={() => handleDeleteUser(user.student_id)}>
														Delete
													</button>
												</div>
											</td>
										</tr>
									))}
									{visibleUsers.length === 0 && (
										<tr>
											<td colSpan="6">No users matched your search.</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</section>

				<section className="card" style={{ marginBottom: "1.5rem" }}>
					<div className="card-head" style={{ justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
						<h2>Course management</h2>
						<button className="btn-secondary" type="button" onClick={resetCourseForm}>
							New course
						</button>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 220px", gap: "1rem", marginBottom: "1rem" }}>
						<input
							type="search"
							placeholder="Search courses by title, ID, or room"
							value={courseSearch}
							onChange={(e) => setCourseSearch(e.target.value)}
						/>
						<select value={courseAvailability} onChange={(e) => setCourseAvailability(e.target.value)}>
							<option value="all">All courses</option>
							<option value="open">Open only</option>
							<option value="full">Full only</option>
						</select>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)", gap: "1rem", alignItems: "start" }}>
						<form onSubmit={handleCourseSubmit} style={{ display: "grid", gap: "0.85rem" }}>
							<h3>{courseEditId ? `Edit course ${courseEditId}` : "Create course"}</h3>
							{courseMessage && <div className="alert alert-success">{courseMessage}</div>}
							<label className="field">
								<span>Course ID</span>
								<input name="course_id" value={courseForm.course_id} onChange={handleCourseChange} disabled={courseBusy || Boolean(courseEditId)} />
							</label>
							<label className="field">
								<span>Title</span>
								<input name="course_title" value={courseForm.course_title} onChange={handleCourseChange} disabled={courseBusy} />
							</label>
							<label className="field">
								<span>Description</span>
								<textarea name="course_description" value={courseForm.course_description} onChange={handleCourseChange} disabled={courseBusy} rows="4" />
							</label>
							<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.85rem" }}>
								<label className="field">
									<span>Room</span>
									<input name="classroom_number" value={courseForm.classroom_number} onChange={handleCourseChange} disabled={courseBusy} />
								</label>
								<label className="field">
									<span>Capacity</span>
									<input name="capacity" type="number" min="0" value={courseForm.capacity} onChange={handleCourseChange} disabled={courseBusy} />
								</label>
							</div>
							<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.85rem" }}>
								<label className="field">
									<span>Credit hours</span>
									<input name="credit_hours" type="number" min="0" value={courseForm.credit_hours} onChange={handleCourseChange} disabled={courseBusy} />
								</label>
								<label className="field">
									<span>Tuition cost</span>
									<input name="tuition_cost" value={courseForm.tuition_cost} onChange={handleCourseChange} disabled={courseBusy} />
								</label>
							</div>
							<div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
								<button className="btn-primary" type="submit" disabled={courseBusy}>
									{courseBusy ? "Saving…" : courseEditId ? "Update course" : "Create course"}
								</button>
								{courseEditId && (
									<button className="btn-ghost" type="button" onClick={resetCourseForm} disabled={courseBusy}>
										Cancel
									</button>
								)}
							</div>
						</form>

						<div style={{ overflowX: "auto" }}>
							<table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
								<thead>
									<tr>
										<th>ID</th>
										<th>Title</th>
										<th>Room</th>
										<th>Seats</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{visibleCourses.map((course) => {
										const enrolledCount = Number(course.enrolled_count) || 0;
										const capacity = course.capacity === null ? null : Number(course.capacity);
										const seats = capacity === null ? "Unlimited" : `${Math.max(0, capacity - enrolledCount)} / ${capacity}`;
										return (
											<tr key={course.course_id}>
												<td>{course.course_id}</td>
												<td>{course.course_title}</td>
												<td>{course.classroom_number || "TBA"}</td>
												<td>{seats}</td>
												<td>
													<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
														<button className="btn-secondary" type="button" onClick={() => editCourse(course)}>
															Edit
														</button>
														<button className="btn-danger" type="button" onClick={() => handleDeleteCourse(course.course_id)}>
															Delete
														</button>
													</div>
												</td>
											</tr>
										);
									})}
									{visibleCourses.length === 0 && (
										<tr>
											<td colSpan="5">No courses matched your search.</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</section>

				<section className="card">
					<div className="card-head" style={{ justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
						<h2>Enrollment control</h2>
						<p>Register or unregister any student for any course.</p>
					</div>

					{enrollmentMessage && <div className="alert alert-success">{enrollmentMessage}</div>}

					<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "1rem", alignItems: "end" }}>
						<label className="field">
							<span>Student</span>
							<select name="student_id" value={enrollmentForm.student_id} onChange={handleEnrollmentChange} disabled={enrollmentBusy}>
								<option value="">Select a student</option>
								{users.map((user) => (
									<option key={user.student_id} value={user.student_id}>
										{user.student_id} - {user.first_name} {user.last_name}
									</option>
								))}
							</select>
						</label>

						<label className="field">
							<span>Course</span>
							<select name="course_id" value={enrollmentForm.course_id} onChange={handleEnrollmentChange} disabled={enrollmentBusy}>
								<option value="">Select a course</option>
								{courses.map((course) => (
									<option key={course.course_id} value={course.course_id}>
										{course.course_id} - {course.course_title}
									</option>
								))}
							</select>
						</label>

						<div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
							<button className="btn-primary" type="button" onClick={handleRegisterEnrollment} disabled={enrollmentBusy}>
								{enrollmentBusy ? "Working…" : "Register"}
							</button>
							<button className="btn-danger" type="button" onClick={handleUnregisterEnrollment} disabled={enrollmentBusy}>
								Unregister
							</button>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
