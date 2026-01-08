// FILE: src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from './auth/AuthProvider';
import RequireAuth from './auth/RequireAuth';
import RequireRole from './auth/RequireRole';

// Import all your page components
import Login from './Login.jsx';
import StudentPlatform from './StudentPlatform.jsx';
import TeacherDashboard from './TeacherDashboard.jsx';
import StudentDashboard from "./StudentDashboard";
import AdminDashboard from './AdminDashboard.jsx'; // Add this import
import Page404 from './Page404.jsx';
import APITest from './APITest.jsx';
import Forbidden from './Forbidden.jsx';
import ExamManagementPage from './ExamManagement'
import SubmissionResultsDashboard from "./SubmissionResultsDashboard";
import ProctorAegisHomepage from './ProctorAegisHomepage.jsx';
import MCQPlatform from './MCQPlatform';
import PracticePlatform from "./PracticePlatform";
import TeacherWorkspace from './components/TeacherWorkspace';
import StudentNotesPortal from './components/student/StudentNotesPortal';
import { Toaster } from './components/ui/sonner';
import StudentActivity from './StudentActivity';
import ActivitySheets from './ActivitySheets';
import AnalyticsPage from './AnalyticsPage.jsx';
import StudentGrades from './StudentGrades.jsx';

function App() {
  return (
    <AuthProvider>
      <>
        <Toaster />
        <Routes>
           {/* Homepage route - accessible to everyone */}
           <Route path="/" element={<ProctorAegisHomepage />} />

           <Route path="/student/notes" element={<StudentNotesPortal />} />

           <Route path="/teacher" element={<TeacherWorkspace />} />

          {/* Redirect /home to homepage if needed */}
          <Route path="/home" element={<Navigate to="/"replace/>}/>

          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          {/* Protected Student Routes */}
          {/* <Route 
            path="/student/dashboard" 
            element={
              <RequireAuth>
                <RequireRole roles={["student"]}>
                  <StudentDashboard />
                </RequireRole>
              </RequireAuth>
            } 
          /> */}
          <Route 
            path="/student/platform/:examId" 
            element={
              <RequireAuth>
                <RequireRole roles={["student"]}>
                  <StudentPlatform />
                </RequireRole>
              </RequireAuth>
            } 
          />

          {/* Protected Teacher Routes */}
          <Route 
            path="/teacher/dashboard" 
            element={
              <RequireAuth>
                <RequireRole roles={["teacher", "admin"]}>
                  <TeacherDashboard />
                </RequireRole>
              </RequireAuth>
            } 
          />
          
          {/* Activity Sheets Route */}
          <Route
            path="/activities/:activityId"
            element={
              <RequireAuth>
                <RequireRole roles={["teacher", "admin"]}>
                  <ActivitySheets />
                </RequireRole>
              </RequireAuth>
            }
          />
          
          {/* Protected Student Routes */}
          <Route
            path="/student/dashboard"
            element={
              <RequireAuth>
                <RequireRole roles={["student"]}>
                  <StudentDashboard />
                </RequireRole>
              </RequireAuth>
            }
          />
          
         {/* Protected Student Routes */}
          <Route
            path="/student/dashboard"
            element={
              <RequireAuth>
                <RequireRole roles={["student"]}>
                  <StudentDashboard />
                </RequireRole>
              </RequireAuth>
            }
          />

          {/* Protected Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <RequireAuth>
                <RequireRole roles={["admin"]}>
                  <AdminDashboard />
                </RequireRole>
              </RequireAuth>
            }
          /> 

          {/* --- 2. ADD THE NEW ROUTE FOR THE PROFILES PAGE --- */}
          {/* <Route 
            path="/profiles" 
            element={
              <RequireAuth>
                <RequireRole roles={["teacher", "admin"]}>
                  <ProfilesPage />
                </RequireRole>
              </RequireAuth>
            } 
          /> */}

          <Route 
            path="/analytics" 
            element={
              <RequireAuth>
                <RequireRole roles={["teacher", "admin"]}>
                  <AnalyticsPage />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route path="/exam-evaluation" element={<ExamManagementPage />} />
          <Route path="/results" element={<SubmissionResultsDashboard />} />
          <Route path="/student/MCQPlatform/:examId" element={<MCQPlatform />} />
          <Route path="/student/PracticePlatform/:examId" element={<PracticePlatform />} />
          <Route 
            path="/student/activity/:activityId" 
            element={
                <RequireAuth>
                    <StudentActivity />
                </RequireAuth>
            } 
          />
          
          {/* Student Grades Route */}
          <Route 
            path="/student/grades" 
            element={
              <RequireAuth>
                <RequireRole roles={["student"]}>
                  <StudentGrades />
                </RequireRole>
              </RequireAuth>
            } 
          />
          
          {/* Error pages */}
          <Route path="/403" element={<Forbidden />} />
          <Route path="*" element={<Page404 />} />
        </Routes>
      </>
    </AuthProvider>
  );
}

export default App;
