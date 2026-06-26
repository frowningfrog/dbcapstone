CREATE SEQUENCE IF NOT EXISTS student_student_id_seq
AS BIGINT
START WITH 10
INCREMENT BY 5
MINVALUE 1
MAXVALUE 999999
NO CYCLE;

CREATE TABLE IF NOT EXISTS public.student
(
    student_id integer NOT NULL DEFAULT nextval('student_student_id_seq'::regclass),
    email varchar(300),
    password varchar(500)
);

-- SELECT * FROM courses ORDER BY course_id;
-- ALTER TABLE courses ADD PRIMARY KEY (Course_ID);

-- UPDATE courses SET course_id = 'CSCI-2002' WHERE course_title = 'Data Structures';

CREATE TABLE IF NOT EXISTS courses (
    Course_ID varchar(1000) PRIMARY KEY,
    Course_Title varchar(1000),
    Course_Description varchar(2000),
    Classroom_Number varchar(500), 
    Capacity integer,
    Credit_Hours integer,
    Tuition_Cost varchar(500)
);

-- Junction table for student ↔ course enrollment
CREATE TABLE IF NOT EXISTS enrollment (
    student_id integer NOT NULL,
    course_id varchar(1000) NOT NULL,
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);