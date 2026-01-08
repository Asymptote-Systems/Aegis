// FILE: src/teacherDashboard.jsx

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useContext, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Plus, Calendar, Users, BookOpen, Clock, Eye, Edit, Trash2, Download, LogOut, Settings, BarChart3, TrendingUp, AlertCircle, RefreshCw, FileQuestion, PlusCircle, Search, UserPlus, UserCheck, Info, CheckCircle2, PlayCircle, PauseCircle, StopCircle, BookOpenCheck, ListChecks, CircleCheckBig, X, ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { toast } from "sonner";

import ExamManagementPage from './ExamManagement'
import TeacherWorkspace from './components/TeacherWorkspace';
import ActivitySheets from './ActivitySheets';
import NotificationBell from './components/NotificationBell';
import AnalyticsPage from './AnalyticsPage';

// Import your auth context and api client (adjust paths as needed)
import { AuthContext } from "./auth/AuthProvider";
import api from "./api/apiClient";
import QuestionsManagement from "./QuestionsManagement";

// Mock data for dashboard stats and analytics
const dashboardStats = { activeExams: 3, totalStudents: 245, completedExams: 12, averageScore: 78.5 };
const recentActivity = [
  { id: 1, action: "Student John submitted EXM001", time: "2 minutes ago" },
  { id: 2, action: "Exam EXM002 scheduled", time: "1 hour ago" },
  { id: 3, action: "Results published for EXM001", time: "3 hours ago" },
];
const analyticsData = {
  examPerformance: [
    { exam: "EXM001", averageScore: 82.3, participationRate: 93.3 },
    { exam: "EXM003", averageScore: 75.8, participationRate: 92.1 },
    { exam: "EXM004", averageScore: 88.5, participationRate: 95.2 },
  ],
  monthlyStats: { totalExams: 8, averageParticipation: 91.2, improvementRate: 12.5 }
};

export default function TeacherDashboard() {
  const { user, loading, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Form state to match API requirements
  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    duration_minutes: '',
    exam_type: 'practice',
    shuffle_questions: false,
    max_attempts: 1,
    questions: '',
    course_id: undefined,
  });

  const [courses, setCourses] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteExamId, setDeleteExamId] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [exams, setExams] = useState([]); // Real exams from API
  const [loadingExams, setLoadingExams] = useState(false);
  const [editingExam, setEditingExam] = useState(null); // For editing mode
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');

  // New state for tracking edit counts
  const [examEditCounts, setExamEditCounts] = useState({}); // Track edit counts by exam ID

  // New state for questions management
  const [questions, setQuestions] = useState([]); // All available questions
  const [examQuestions, setExamQuestions] = useState({}); // Assigned questions by exam ID
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [assigningQuestions, setAssigningQuestions] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [currentExamForQuestions, setCurrentExamForQuestions] = useState(null);

  // New state for search and filtering questions
  const [questionSearchTerm, setQuestionSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');

  // New state for student enrollment management
  const [students, setStudents] = useState([]); // All available students
  const [examRegistrations, setExamRegistrations] = useState({}); // Enrolled students by exam ID
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [enrollingStudents, setEnrollingStudents] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const [currentExamForEnrollment, setCurrentExamForEnrollment] = useState(null);

  // New state for search and filtering students
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // New state for status change management
  const [changingStatus, setChangingStatus] = useState(false);

  // NEW: State for questions per student and student question assignments
  const [questionsPerStudent, setQuestionsPerStudent] = useState(5); // Default value
  const [studentQuestionAssignments, setStudentQuestionAssignments] = useState({}); // student assignments by exam ID
  const [viewAssignmentsDialogOpen, setViewAssignmentsDialogOpen] = useState(false);
  const [currentExamForAssignments, setCurrentExamForAssignments] = useState(null);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assigningStudentQuestions, setAssigningStudentQuestions] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [currentQuestionPage, setCurrentQuestionPage] = useState(1);
  const [questionsPerPage, setQuestionsPerPage] = useState(25);
  // Add these new state variables after your existing state declarations
  const [autoSelectDialogOpen, setAutoSelectDialogOpen] = useState(false);
  const [autoSelectMode, setAutoSelectMode] = useState('total'); // 'total' or 'per-category'
  const [autoSelectConfig, setAutoSelectConfig] = useState({
    totalQuestions: 10,
    difficulties: ['easy', 'medium', 'hard'],
    categories: [],
    categoryConfigs: {}, // { categoryId: { count: number, difficulties: [], difficultyDistribution?: { easy: number, medium: number, hard: number } } }
    difficultyDistribution: {
      easy: 30,
      medium: 50,
      hard: 20
    },
    prioritizeRecent: false,
    excludeUsed: true
  });
  const [loadingAutoSelect, setLoadingAutoSelect] = useState(false);
  // Add these new state variables for configuration enforcement
  const [assignmentConfiguration, setAssignmentConfiguration] = useState(null);
  const [configurationLocked, setConfigurationLocked] = useState(false);
  const [studentProfiles, setStudentProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [batchYearFilter, setBatchYearFilter] = useState('all');
  // Add these with your other state declarations
  const [unenrollConfirmationOpen, setUnenrollConfirmationOpen] = useState(false);
  const [studentToUnenroll, setStudentToUnenroll] = useState(null); // To store { registrationId, studentName, examId }

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get('/courses/');
        setCourses(response.data);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
        toast.error('Failed to load courses');
      }
    };

    fetchCourses();
  }, []);

  // Create a map for quick course lookup
  const courseMap = useMemo(() => {
    const map = {};
    courses.forEach(course => {
      map[course.id] = course;
    });
    return map;
  }, [courses]);

  // Filter exams by selected course
  const filteredExams = useMemo(() => {
    if (selectedCourseFilter === 'all') return exams;
    return exams.filter(exam => exam.course_id === selectedCourseFilter);
  }, [selectedCourseFilter, exams]);

  // Place this after your state declarations

  const enrichedStudents = useMemo(() => {
    if (!students.length || !studentProfiles.length) return [];

    const profileMap = new Map(studentProfiles.map(p => [p.user_id, p]));

    return students.map(student => {
      const profile = profileMap.get(student.id);
      return {
        ...student,
        profile: profile || null,
        roll_number: student.email.split('@')[0],
      };
    }).filter(student => student.profile); // Only include students with a profile
  }, [students, studentProfiles]);

  // Place these memoized helpers with your other helper functions

  const availableDepartments = useMemo(() => {
    const departments = new Set(enrichedStudents.map(s => s.profile.department));
    return Array.from(departments).sort();
  }, [enrichedStudents]);

  const availableBatchYears = useMemo(() => {
    const years = new Set(enrichedStudents.map(s => s.profile.batch_year));
    return Array.from(years).sort((a, b) => b - a); // Sort descending
  }, [enrichedStudents]);

  // Helper function to get course info
  const getCourseInfo = (courseId) => {
    const course = courseMap[courseId];
    return course ? `${course.course_code} - ${course.course_name}` : 'Course unavailable';
  };


  // MCQ state management
  const [mcqs, setMcqs] = useState([]); // All available MCQs
  const [examMcqs, setExamMcqs] = useState({}); // Assigned MCQs by exam ID
  const [loadingMcqs, setLoadingMcqs] = useState(false);
  const [assigningMcqs, setAssigningMcqs] = useState(false);
  const [selectedMcqs, setSelectedMcqs] = useState(new Set());
  const [mcqDialogOpen, setMcqDialogOpen] = useState(false);
  const [currentExamForMcqs, setCurrentExamForMcqs] = useState(null);
  const [mcqSearchTerm, setMcqSearchTerm] = useState('');
  const [previewMcq, setPreviewMcq] = useState(null);
  const [mcqPreviewDialogOpen, setMcqPreviewDialogOpen] = useState(false);
  const [mcqsPerStudent, setMcqsPerStudent] = useState(5);
  // Question type filter for assignment dialog
  const [questionTypeFilter, setQuestionTypeFilter] = useState('coding'); // 'coding' or 'mcq'
  // NEW: State for MCQ student assignments
  const [studentMcqAssignments, setStudentMcqAssignments] = useState({}); // MCQ assignments by exam ID
  // NEW: Smart Assign from Pool states
  const [smartAssignDialogOpen, setSmartAssignDialogOpen] = useState(false);
  const [smartAssignConfig, setSmartAssignConfig] = useState({
    mode: 'simple', // 'simple' or 'category'
    totalQuestions: 5,
    difficultyDistribution: { easy: 2, medium: 2, hard: 1 },
    categoryConfigs: {}, // { categoryId: { easy: x, medium: y, hard: z } }
  });


  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Add this temporarily for debugging
  useEffect(() => {
    console.log('MCQs loaded:', mcqs.length, mcqs);
    console.log('Question type filter:', questionTypeFilter);
    console.log('Filtered MCQs:', getFilteredMcqs().length);
  }, [mcqs, questionTypeFilter, mcqSearchTerm]);


  // Fetch exams when component mounts
  useEffect(() => {
    if (user) {
      fetchExams();
      fetchQuestions();
      fetchMcqs();
    }
  }, [user]);

  // Fetch exam questions when exams are loaded
  useEffect(() => {
    if (filteredExams.length > 0) {
      // Fetch questions for all exams
      exams.forEach(exam => {
        fetchExamQuestions(exam.id);
        fetchExamMcqs(exam.id);
        fetchExamRegistrations(exam.id);
      });
    }
  }, [exams]);

  // Initialize edit counts when exams are loaded
  useEffect(() => {
    const initEditCounts = {};
    exams.forEach(exam => {
      // Initialize edit count from exam's extra_data or default to 0
      initEditCounts[exam.id] = exam.extra_data?.edit_count || 0;
    });
    setExamEditCounts(initEditCounts);
  }, [exams]);

  // FIXED: Auto-completion logic using your exact API endpoint
  useEffect(() => {
    const checkExamTransitions = () => {
      const now = new Date();

      exams.forEach(async (exam) => {
        const startTime = new Date(exam.start_time);
        const endTime = new Date(exam.end_time);

        try {
          // STEP 1: Transition scheduled → active when start time is reached
          if (exam.status === 'scheduled' && now >= startTime && now < endTime) {
            console.log(`Auto-starting exam: ${exam.title}`);

            const response = await api.put(`/exams/${exam.id}`, {
              title: exam.title,
              description: exam.description,
              start_time: exam.start_time,
              end_time: exam.end_time,
              duration_minutes: exam.duration_minutes,
              exam_type: exam.exam_type,
              shuffle_questions: exam.shuffle_questions,
              max_attempts: exam.max_attempts,
              settings: exam.settings || {},
              status: 'active', // Change to active
              extra_data: exam.extra_data || {}
            });

            setExams(prevExams => prevExams.map(e =>
              e.id === exam.id ? response.data : e
            ));

            toast.info("Exam started", {
              description: `"${exam.title}" is now active.`,
            });
          }

          // STEP 2: Transition active → completed when end time is reached
          else if (exam.status === 'active' && now >= endTime) {
            console.log(`Auto-completing exam: ${exam.title}`);

            const response = await api.put(`/exams/${exam.id}`, {
              title: exam.title,
              description: exam.description,
              start_time: exam.start_time,
              end_time: exam.end_time,
              duration_minutes: exam.duration_minutes,
              exam_type: exam.exam_type,
              shuffle_questions: exam.shuffle_questions,
              max_attempts: exam.max_attempts,
              settings: exam.settings || {},
              status: 'completed', // Change to completed
              extra_data: exam.extra_data || {}
            });

            setExams(prevExams => prevExams.map(e =>
              e.id === exam.id ? response.data : e
            ));

            toast.info("Exam completed", {
              description: `"${exam.title}" has been automatically marked as completed.`,
            });
          }
        } catch (error) {
          console.error('Error updating exam status:', error);
          toast.error("Failed to update exam status", {
            description: `Error updating "${exam.title}": ${error.response?.data?.detail || error.message}`,
          });
        }
      });
    };

    // Only run if we have exams
    if (exams.length > 0) {
      // Check every 30 seconds
      const interval = setInterval(checkExamTransitions, 30000);

      // Initial check
      checkExamTransitions();

      return () => clearInterval(interval);
    }
  }, [exams]);


  // NEW: Refresh exams when changingStatus completes
  useEffect(() => {
    if (!changingStatus) {
      // Small delay to ensure backend has processed the change
      const timeoutId = setTimeout(() => {
        fetchExams();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [changingStatus]);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/question-categories/');
        setCategories(response.data || []);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        if (error.response?.status === 401) {
          logout();
          return;
        }
        toast.error("Failed to fetch categories", {
          description: "Unable to load question categories.",
        });
      }
    };

    if (user) {
      fetchCategories();
    }
  }, [user, logout]);


  // Utility function to format datetime for input fields
  const formatDateTimeForInput = (dateTimeString) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
  };

  // Filter and search questions
  // Filter and search questions
  const getFilteredQuestions = () => {
    let filtered = questions;

    // Filter by search term
    if (questionSearchTerm.trim()) {
      filtered = filtered.filter(question =>
        (question.title || '').toLowerCase().includes(questionSearchTerm.toLowerCase()) ||
        (question.description || '').toLowerCase().includes(questionSearchTerm.toLowerCase())
      );
    }

    // Filter by difficulty
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(question => question.difficulty === difficultyFilter);
    }
    // category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(question => question.category_id === categoryFilter);
    }

    // Apply the SAME sorting logic as QuestionsManagement page
    const sortedQuestions = filtered.sort((a, b) => {
      const aQuestionId = a.extra_data?.question_id;
      const bQuestionId = b.extra_data?.question_id;

      // If both have question_id (LeetCode questions), sort by question_id numerically
      if (aQuestionId && bQuestionId) {
        return parseInt(aQuestionId) - parseInt(bQuestionId);
      }

      // If only a has question_id, b comes first (new questions on top)
      if (!aQuestionId && bQuestionId) {
        return -1;
      }

      // If only b has question_id, a comes first (new questions on top)  
      if (aQuestionId && !bQuestionId) {
        return 1;
      }

      // If neither has question_id (both are new), sort by creation date (newest first)
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return sortedQuestions;
  };

  // Filter and search students
  // Find and REPLACE the entire getFilteredStudents function

  const getFilteredStudents = () => {
    let filtered = enrichedStudents;

    // Filter by search term (now checks name and roll number too)
    if (studentSearchTerm.trim()) {
      const lowercasedFilter = studentSearchTerm.toLowerCase();
      filtered = filtered.filter(student =>
        (student.email || '').toLowerCase().includes(lowercasedFilter) ||
        (student.profile?.first_name || '').toLowerCase().includes(lowercasedFilter) ||
        (student.profile?.last_name || '').toLowerCase().includes(lowercasedFilter) ||
        (student.roll_number || '').toLowerCase().includes(lowercasedFilter)
      );
    }

    // NEW: Filter by department
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(student => student.profile?.department === departmentFilter);
    }

    // NEW: Filter by batch year
    if (batchYearFilter !== 'all') {
      filtered = filtered.filter(student => student.profile?.batch_year === parseInt(batchYearFilter));
    }

    // Sort by roll number for consistent order
    return filtered.sort((a, b) => a.roll_number.localeCompare(b.roll_number));
  };

  // Add MCQ dialog handler
  const handleOpenMcqDialog = async (exam) => {
    if (!examSupportsMcqs(exam.exam_type)) {
      toast.error("MCQs not supported", {
        description: `${exam.exam_type} exams do not support MCQ questions. Only Quiz and Practice exams can have MCQs.`,
      });
      return;
    }

    setCurrentExamForMcqs(exam);
    setMcqDialogOpen(true);
    setMcqSearchTerm('');
    setDifficultyFilter('all');
    setQuestionTypeFilter('mcq');

    if (exam.status !== 'draft') {
      toast.info("Exam Status Warning", {
        description: `Modifying MCQs in a ${exam.status} exam will reassign questions to all students.`,
      });
    }

    if (mcqs.length === 0) {
      await fetchMcqs();
    }

    await fetchExamMcqs(exam.id);

    const assignedMcqs = examMcqs[exam.id] || [];
    const assignedMcqIds = new Set(assignedMcqs.map(em => em.mcq_id));
    setSelectedMcqs(assignedMcqIds);
  };

  // NEW: Function to fetch student MCQ assignments
  const fetchStudentMcqAssignments = async (examId) => {
    setLoadingAssignments(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error("Authentication required", {
          description: "Please log in again.",
        });
        logout();
        return {};
      }

      // Use the MCQ endpoint format: /exams/{exam_id}/student-mcqs/
      const response = await api.get(`/exams/${examId}/student-mcqs/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Raw API response for MCQ assignments:', response.data);

      // Process the MCQ assignment data by mapping student and MCQ information
      const assignmentsByStudent = {};
      response.data.forEach(assignment => {
        const studentId = assignment.student_id;

        // Find the MCQ data from our mcqs array
        const mcqData = mcqs.find(m => m.id === assignment.mcq_id);

        // Create processed assignment with MCQ details
        const processedAssignment = {
          ...assignment,
          mcq: mcqData // Add the MCQ object
        };

        if (!assignmentsByStudent[studentId]) {
          assignmentsByStudent[studentId] = [];
        }
        assignmentsByStudent[studentId].push(processedAssignment);
      });

      console.log('Grouped MCQ assignments by student:', assignmentsByStudent);

      setStudentMcqAssignments(prev => ({
        ...prev,
        [examId]: assignmentsByStudent
      }));

      return assignmentsByStudent;
    } catch (error) {
      console.error('Error fetching student MCQ assignments:', error);
      if (error.response?.status === 401) {
        toast.error("Authentication failed", {
          description: "Your session has expired. Please log in again.",
        });
        logout();
        return {};
      }

      // Handle 404 gracefully for MCQs
      if (error.response?.status === 404) {
        console.log('No MCQ assignments found for this exam (404) - this is normal for exams without MCQs');
        setStudentMcqAssignments(prev => ({
          ...prev,
          [examId]: {}
        }));
        return {};
      }

      toast.error("Failed to fetch student MCQ assignments", {
        description: error.response?.data?.detail || "Unable to load student MCQ assignments.",
      });
      return {};
    } finally {
      setLoadingAssignments(false);
    }
  };


  // Get difficulty badge color
  const getDifficultyBadge = (difficulty) => {
    const badgeStyles = {
      easy: "bg-green-100 text-green-800 border-green-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      hard: "bg-red-100 text-red-800 border-red-200"
    };

    return (
      <Badge
        variant="outline"
        className={`text-xs ${badgeStyles[difficulty] || 'bg-gray-100 text-gray-800'}`}
      >
        {difficulty?.charAt(0)?.toUpperCase() + difficulty?.slice(1) || 'Unknown'}
      </Badge>
    );
  };

  // Get available actions based on exam status
  const getAvailableActions = (exam) => {
    const actions = {
      draft: [
        { key: 'enroll-students', label: 'Enroll Students', icon: UserPlus, handler: () => handleOpenEnrollmentDialog(exam) },
        { key: 'add-questions', label: 'Assign Questions', icon: PlusCircle, handler: () => handleOpenQuestionDialog(exam) },
        { key: 'edit', label: 'Edit Exam', icon: Edit, handler: () => handleEditExam(exam) },
        { key: 'delete', label: 'Delete Exam', icon: Trash2, handler: () => setDeleteExamId(exam.id), className: 'text-red-600' }
      ],
      scheduled: [
        { key: 'view-assignments', label: 'View Student Assignments', icon: ListChecks, handler: () => handleViewStudentAssignments(exam) },
        { key: 'enroll-students', label: 'Enroll Students', icon: UserPlus, handler: () => handleOpenEnrollmentDialog(exam) },
        { key: 'view-questions', label: 'View Questions', icon: FileQuestion, handler: () => handleViewQuestions(exam) },
        { key: 'edit', label: 'Edit Exam', icon: Edit, handler: () => handleEditExam(exam) },
        { key: 'delete', label: 'Delete Exam', icon: Trash2, handler: () => setDeleteExamId(exam.id), className: 'text-red-600' }
      ],
      active: [ // "On-Going" status
        { key: 'view-assignments', label: 'View Student Assignments', icon: ListChecks, handler: () => handleViewStudentAssignments(exam) },
        { key: 'view-questions', label: 'View Questions', icon: FileQuestion, handler: () => handleViewQuestions(exam) }
      ],
      completed: [
        { key: 'view-assignments', label: 'View Student Assignments', icon: ListChecks, handler: () => handleViewStudentAssignments(exam) },
        { key: 'view-questions', label: 'View Questions', icon: FileQuestion, handler: () => handleViewQuestions(exam) },
        { key: 'view-results', label: 'View Results', icon: Eye, handler: () => handleViewResults(exam.id) }
      ]
    };

    return actions[exam.status] || [];
  };

  // Enhanced shuffle function using Fisher-Yates algorithm
  const shuffleArray = (array) => {
    const shuffled = [...array]; // Create a copy
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleAutoSelectQuestions = async () => {
    setLoadingAutoSelect(true);
    try {
      if (!currentExamForQuestions) {
        toast.error("No exam selected for question assignment");
        return;
      }

      const availableQuestions = getFilteredQuestions();
      const enrolledStudents = examRegistrations[currentExamForQuestions.id] || [];

      if (enrolledStudents.length === 0) {
        toast.warning("No students enrolled", {
          description: "Questions will be configured for future enrollment.",
        });
      }

      // Store the configuration permanently
      const finalConfiguration = {
        mode: autoSelectMode,
        totalQuestions: autoSelectMode === 'total' ? autoSelectConfig.totalQuestions :
          Object.values(autoSelectConfig.categoryConfigs).reduce((sum, config) => sum + config.count, 0),
        difficultyDistribution: autoSelectMode === 'total' ? autoSelectConfig.difficultyDistribution : null,
        categoryConfigs: autoSelectMode === 'per-category' ? autoSelectConfig.categoryConfigs : {},
        timestamp: new Date().toISOString()
      };

      // Validate configuration before proceeding
      if (autoSelectMode === 'per-category') {
        for (const [categoryId, config] of Object.entries(autoSelectConfig.categoryConfigs)) {
          const category = categories.find(c => c.id === categoryId);
          if (config.difficultyDistribution) {
            const totalDistribution = config.difficultyDistribution.easy +
              config.difficultyDistribution.medium + config.difficultyDistribution.hard;
            if (totalDistribution !== config.count) {
              toast.error(`Invalid distribution for ${category?.name || 'category'}`, {
                description: `Distribution total (${totalDistribution}) doesn't match target count (${config.count}).`,
              });
              return;
            }
          }
        }
      }

      // Clear existing question assignments
      const currentAssignedQuestions = examQuestions[currentExamForQuestions.id] || [];
      if (currentAssignedQuestions.length > 0) {
        const removePromises = currentAssignedQuestions.map(examQuestion =>
          api.delete(`/exam-questions/${examQuestion.id}`)
        );
        await Promise.all(removePromises);
      }

      // Select questions according to configuration with recycling if needed
      const selectedQuestions = selectQuestionsWithConfiguration(availableQuestions, finalConfiguration, enrolledStudents.length);

      if (selectedQuestions.length === 0) {
        toast.error("No questions match the configuration", {
          description: "Please adjust your configuration or add more questions.",
        });
        return;
      }

      // Add selected questions to exam pool
      const addToExamPromises = selectedQuestions.map((questionId, index) =>
        api.post('/exam-questions/', {
          question_order: index,
          points: 1,
          extra_data: { configurationBased: true },
          exam_id: currentExamForQuestions.id,
          question_id: questionId
        })
      );
      await Promise.all(addToExamPromises);

      // Assign questions to students using strict configuration
      if (enrolledStudents.length > 0) {
        await clearExistingStudentAssignments(currentExamForQuestions.id);
        await assignQuestionsWithStrictConfiguration(currentExamForQuestions.id, finalConfiguration, enrolledStudents);
      }

      // Update exam with locked configuration
      const exam = exams.find(e => e.id === currentExamForQuestions.id);
      const updatedExam = {
        ...exam,
        extra_data: {
          ...exam.extra_data,
          assignmentConfiguration: finalConfiguration,
          configurationLocked: true,
          questions_per_student: finalConfiguration.totalQuestions
        }
      };

      await api.put(`/exams/${currentExamForQuestions.id}`, updatedExam);
      setExams(prevExams => prevExams.map(e =>
        e.id === currentExamForQuestions.id ? updatedExam : e
      ));

      // Update local state
      setAssignmentConfiguration(finalConfiguration);
      setConfigurationLocked(true);
      await fetchExamQuestions(currentExamForQuestions.id);
      setSelectedQuestions(new Set(selectedQuestions));
      setAutoSelectDialogOpen(false);

      toast.success("Configuration locked and questions assigned!", {
        description: `${finalConfiguration.totalQuestions} questions per student with strict configuration adherence.`,
      });

    } catch (error) {
      console.error('Error in auto-select:', error);
      toast.error("Failed to configure questions", {
        description: "An error occurred during configuration.",
      });
    } finally {
      setLoadingAutoSelect(false);
    }
  };

  const selectQuestionsWithConfiguration = (availableQuestions, configuration, studentCount) => {
    const questionsNeeded = studentCount * configuration.totalQuestions;
    let selectedQuestions = [];

    if (configuration.mode === 'total') {
      // Total mode with difficulty distribution
      const easyCount = Math.floor((configuration.totalQuestions * configuration.difficultyDistribution.easy) / 100);
      const mediumCount = Math.floor((configuration.totalQuestions * configuration.difficultyDistribution.medium) / 100);
      const hardCount = configuration.totalQuestions - easyCount - mediumCount;

      let filteredQuestions = availableQuestions;
      if (autoSelectConfig.categories.length > 0) {
        filteredQuestions = filteredQuestions.filter(q => autoSelectConfig.categories.includes(q.category_id));
      }

      const questionsByDifficulty = {
        easy: filteredQuestions.filter(q => q.difficulty === 'easy'),
        medium: filteredQuestions.filter(q => q.difficulty === 'medium'),
        hard: filteredQuestions.filter(q => q.difficulty === 'hard')
      };

      // Calculate questions needed with recycling
      const easyNeeded = Math.max(easyCount, studentCount * easyCount);
      const mediumNeeded = Math.max(mediumCount, studentCount * mediumCount);
      const hardNeeded = Math.max(hardCount, studentCount * hardCount);

      // Select questions with recycling
      const easyQuestions = selectWithRecycling(questionsByDifficulty.easy, easyNeeded);
      const mediumQuestions = selectWithRecycling(questionsByDifficulty.medium, mediumNeeded);
      const hardQuestions = selectWithRecycling(questionsByDifficulty.hard, hardNeeded);

      selectedQuestions = [...easyQuestions, ...mediumQuestions, ...hardQuestions];

    } else if (configuration.mode === 'per-category') {
      // Per-category mode
      Object.entries(configuration.categoryConfigs).forEach(([categoryId, config]) => {
        const categoryQuestions = availableQuestions.filter(q => q.category_id === categoryId);

        if (config.difficultyDistribution) {
          // Exact difficulty distribution
          const easyQuestions = categoryQuestions.filter(q => q.difficulty === 'easy');
          const mediumQuestions = categoryQuestions.filter(q => q.difficulty === 'medium');
          const hardQuestions = categoryQuestions.filter(q => q.difficulty === 'hard');

          const easyNeeded = Math.max(config.difficultyDistribution.easy, studentCount * config.difficultyDistribution.easy);
          const mediumNeeded = Math.max(config.difficultyDistribution.medium, studentCount * config.difficultyDistribution.medium);
          const hardNeeded = Math.max(config.difficultyDistribution.hard, studentCount * config.difficultyDistribution.hard);

          const selectedEasy = selectWithRecycling(easyQuestions, easyNeeded);
          const selectedMedium = selectWithRecycling(mediumQuestions, mediumNeeded);
          const selectedHard = selectWithRecycling(hardQuestions, hardNeeded);

          selectedQuestions.push(...selectedEasy, ...selectedMedium, ...selectedHard);
        } else {
          // Regular mode with difficulty filter
          let filteredCategoryQuestions = categoryQuestions;
          if (config.difficulties.length > 0) {
            filteredCategoryQuestions = filteredCategoryQuestions.filter(q =>
              config.difficulties.includes(q.difficulty)
            );
          }

          const questionsNeeded = Math.max(config.count, studentCount * config.count);
          const selected = selectWithRecycling(filteredCategoryQuestions, questionsNeeded);
          selectedQuestions.push(...selected);
        }
      });
    }

    return [...new Set(selectedQuestions.map(q => q.id))];
  };

  const selectWithRecycling = (questions, needed) => {
    if (questions.length === 0) return [];

    const selected = [];
    const shuffled = shuffleArray([...questions]);

    while (selected.length < needed) {
      const remaining = needed - selected.length;
      const toTake = Math.min(remaining, shuffled.length);
      selected.push(...shuffled.slice(0, toTake));

      if (selected.length < needed) {
        // Recycle questions if we need more
        shuffled.push(...shuffleArray([...questions]));
      }
    }

    return selected;
  };

  const assignQuestionsWithStrictConfiguration = async (examId, configuration, enrolledStudents) => {
    setAssigningStudentQuestions(true);
    try {
      const availableQuestions = getFilteredQuestions();
      const assignments = [];

      for (const registration of enrolledStudents) {
        const studentId = registration.student_id;
        const studentQuestions = generateStudentQuestionsByConfiguration(availableQuestions, configuration);

        studentQuestions.forEach((question, index) => {
          assignments.push({
            exam_id: String(examId),
            student_id: String(studentId),
            question_id: String(question.id),
            question_order: index,
            points: 1,
            assignment_metadata: {
              configurationBased: true,
              configuration: configuration,
              assignedBy: 'strict_config'
            }
          });
        });
      }

      const token = localStorage.getItem('access_token');
      await api.post('/student-exam-questions/bulk-assign/', {
        assignments: assignments
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return true;
    } catch (error) {
      console.error('Error in strict configuration assignment:', error);
      return false;
    } finally {
      setAssigningStudentQuestions(false);
    }
  };

  const generateStudentQuestionsByConfiguration = (availableQuestions, configuration) => {
    const studentQuestions = [];

    if (configuration.mode === 'total') {
      const easyCount = Math.floor((configuration.totalQuestions * configuration.difficultyDistribution.easy) / 100);
      const mediumCount = Math.floor((configuration.totalQuestions * configuration.difficultyDistribution.medium) / 100);
      const hardCount = configuration.totalQuestions - easyCount - mediumCount;

      let filteredQuestions = availableQuestions;
      if (autoSelectConfig.categories.length > 0) {
        filteredQuestions = filteredQuestions.filter(q => autoSelectConfig.categories.includes(q.category_id));
      }

      const questionsByDifficulty = {
        easy: filteredQuestions.filter(q => q.difficulty === 'easy'),
        medium: filteredQuestions.filter(q => q.difficulty === 'medium'),
        hard: filteredQuestions.filter(q => q.difficulty === 'hard')
      };

      if (easyCount > 0) studentQuestions.push(...selectRandomWithRecycling(questionsByDifficulty.easy, easyCount));
      if (mediumCount > 0) studentQuestions.push(...selectRandomWithRecycling(questionsByDifficulty.medium, mediumCount));
      if (hardCount > 0) studentQuestions.push(...selectRandomWithRecycling(questionsByDifficulty.hard, hardCount));

    } else if (configuration.mode === 'per-category') {
      Object.entries(configuration.categoryConfigs).forEach(([categoryId, config]) => {
        const categoryQuestions = availableQuestions.filter(q => q.category_id === categoryId);

        if (config.difficultyDistribution) {
          const easyQuestions = categoryQuestions.filter(q => q.difficulty === 'easy');
          const mediumQuestions = categoryQuestions.filter(q => q.difficulty === 'medium');
          const hardQuestions = categoryQuestions.filter(q => q.difficulty === 'hard');

          if (config.difficultyDistribution.easy > 0) {
            studentQuestions.push(...selectRandomWithRecycling(easyQuestions, config.difficultyDistribution.easy));
          }
          if (config.difficultyDistribution.medium > 0) {
            studentQuestions.push(...selectRandomWithRecycling(mediumQuestions, config.difficultyDistribution.medium));
          }
          if (config.difficultyDistribution.hard > 0) {
            studentQuestions.push(...selectRandomWithRecycling(hardQuestions, config.difficultyDistribution.hard));
          }
        } else {
          let filteredCategoryQuestions = categoryQuestions;
          if (config.difficulties.length > 0) {
            filteredCategoryQuestions = filteredCategoryQuestions.filter(q =>
              config.difficulties.includes(q.difficulty)
            );
          }
          studentQuestions.push(...selectRandomWithRecycling(filteredCategoryQuestions, config.count));
        }
      });
    }

    return shuffleArray(studentQuestions);
  };

  const selectRandomWithRecycling = (questions, count) => {
    if (questions.length === 0) return [];

    const selected = [];
    const availablePool = [...questions];

    for (let i = 0; i < count; i++) {
      if (availablePool.length === 0) {
        // Recycle all questions back into the pool
        availablePool.push(...questions);
      }

      const randomIndex = Math.floor(Math.random() * availablePool.length);
      selected.push(availablePool.splice(randomIndex, 1)[0]);
    }

    return selected;
  };

  // Smart assignment from selected pool
  const handleSmartAssignFromPool = async () => {
    setLoadingAutoSelect(true);
    console.log('🚀 Smart Assign Started');

    try {
      if (!currentExamForQuestions) {
        toast.error("No exam selected");
        return;
      }

      const selectedQuestionIds = Array.from(questionTypeFilter === 'coding' ? selectedQuestions : selectedMcqs);
      const enrolledStudents = examRegistrations[currentExamForQuestions.id] || [];

      console.log('📊 Initial Data Check:');
      console.log('- Selected Question IDs:', selectedQuestionIds);
      console.log('- Enrolled Students:', enrolledStudents);
      console.log('- Question Type Filter:', questionTypeFilter);

      if (selectedQuestionIds.length === 0) {
        toast.error("No questions selected", {
          description: "Please select questions first before using Smart Assign.",
        });
        return;
      }

      // Get the actual question objects from the selected pool
      const selectedPool = questionTypeFilter === 'coding'
        ? questions.filter(q => selectedQuestionIds.includes(q.id))
        : mcqs.filter(m => selectedQuestionIds.includes(m.id));

      console.log('📝 Selected Pool:', selectedPool);

      // Validate pool has enough questions
      const validation = validateSmartAssignPool(selectedPool, smartAssignConfig, enrolledStudents.length);
      console.log('✅ Validation Result:', validation);

      if (!validation.isValid) {
        const proceed = window.confirm(
          `Warning: ${validation.message}\n\nQuestions will be recycled (same question may be assigned to multiple students). Do you want to proceed?`
        );
        if (!proceed) {
          setLoadingAutoSelect(false);
          return;
        }
      }

      // Create configuration for storage
      const finalConfiguration = {
        mode: 'smart_pool',
        sourceMode: smartAssignConfig.mode,
        totalQuestions: smartAssignConfig.mode === 'simple'
          ? smartAssignConfig.totalQuestions
          : Object.values(smartAssignConfig.categoryConfigs).reduce((sum, config) =>
            sum + config.easy + config.medium + config.hard, 0),
        difficultyDistribution: smartAssignConfig.mode === 'simple' ? smartAssignConfig.difficultyDistribution : null,
        categoryConfigs: smartAssignConfig.mode === 'category' ? smartAssignConfig.categoryConfigs : {},
        selectedPool: selectedQuestionIds,
        timestamp: new Date().toISOString()
      };

      console.log('⚙️ Final Configuration:', finalConfiguration);

      // STEP 1: Clear existing assignments
      console.log('🗑️ Clearing existing student assignments...');
      await clearExistingStudentAssignments(currentExamForQuestions.id);
      console.log('✅ Student assignments cleared');

      // STEP 2: Clear existing question pool
      console.log('🗑️ Clearing existing exam questions...');
      const currentAssignedQuestions = examQuestions[currentExamForQuestions.id] || [];
      if (currentAssignedQuestions.length > 0) {
        const removePromises = currentAssignedQuestions.map(examQuestion =>
          api.delete(`/exam-questions/${examQuestion.id}`)
        );
        await Promise.all(removePromises);
        console.log(`✅ Removed ${currentAssignedQuestions.length} exam questions`);
      }

      // STEP 3: Add selected questions to exam pool
      console.log('📋 Adding questions to exam pool...');
      const addToExamPromises = selectedQuestionIds.map((questionId, index) =>
        api.post('/exam-questions/', {
          question_order: index,
          points: 1,
          extra_data: { smartAssigned: true },
          exam_id: currentExamForQuestions.id,
          question_id: questionId
        })
      );

      const addResults = await Promise.all(addToExamPromises);
      console.log(`✅ Added ${addResults.length} questions to exam pool:`, addResults);

      // STEP 4: Smart assign to students using the pool
      if (enrolledStudents.length > 0) {
        console.log('👥 Assigning questions to students...');
        const assignmentSuccess = await assignQuestionsWithSmartPool(
          currentExamForQuestions.id,
          selectedPool,
          finalConfiguration,
          enrolledStudents
        );
        console.log('📊 Assignment Success:', assignmentSuccess);

        if (!assignmentSuccess) {
          toast.error("Failed to assign questions to students", {
            description: "The bulk assignment API call failed. Check console for details.",
          });
          return;
        }
      } else {
        console.log('ℹ️ No students enrolled, skipping student assignments');
      }

      // STEP 5: Update exam with configuration
      console.log('💾 Updating exam configuration...');
      const exam = exams.find(e => e.id === currentExamForQuestions.id);
      const updatedExam = {
        ...exam,
        extra_data: {
          ...exam.extra_data,
          assignmentConfiguration: finalConfiguration,
          configurationLocked: true,
          questions_per_student: finalConfiguration.totalQuestions
        }
      };

      await api.put(`/exams/${currentExamForQuestions.id}`, updatedExam);
      console.log('✅ Exam configuration updated');

      // STEP 6: Refresh state
      console.log('🔄 Refreshing data...');
      setExams(prevExams => prevExams.map(e =>
        e.id === currentExamForQuestions.id ? updatedExam : e
      ));

      await fetchExamQuestions(currentExamForQuestions.id);
      console.log('✅ Exam questions refreshed');
      // Add this at the end of handleSmartAssignFromPool, before closing dialogs
      if (enrolledStudents.length > 0) {
        console.log('🔄 Refreshing student assignments...');
        await fetchStudentQuestionAssignments(currentExamForQuestions.id);
        console.log('✅ Student assignments refreshed');
      }

      // Close dialogs
      setSmartAssignDialogOpen(false);
      setQuestionDialogOpen(false);

      console.log('🎉 Smart Assignment Completed Successfully!');

      toast.success("Smart assignment completed!", {
        description: `Assigned ${finalConfiguration.totalQuestions} questions per student from your selected pool of ${selectedQuestionIds.length} questions.`,
      });

    } catch (error) {
      console.error('❌ Error in smart assign:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      toast.error("Failed to smart assign questions", {
        description: `Error: ${error.response?.data?.detail || error.message}`,
      });
    } finally {
      setLoadingAutoSelect(false);
    }
  };


  // Validate if the pool has enough questions for the configuration
  const validateSmartAssignPool = (selectedPool, config, studentCount) => {
    if (config.mode === 'simple') {
      const poolByDifficulty = {
        easy: selectedPool.filter(q => q.difficulty === 'easy'),
        medium: selectedPool.filter(q => q.difficulty === 'medium'),
        hard: selectedPool.filter(q => q.difficulty === 'hard')
      };

      const needed = {
        easy: config.difficultyDistribution.easy * studentCount,
        medium: config.difficultyDistribution.medium * studentCount,
        hard: config.difficultyDistribution.hard * studentCount
      };

      const shortages = [];
      if (needed.easy > poolByDifficulty.easy.length) {
        shortages.push(`Easy: need ${needed.easy}, have ${poolByDifficulty.easy.length}`);
      }
      if (needed.medium > poolByDifficulty.medium.length) {
        shortages.push(`Medium: need ${needed.medium}, have ${poolByDifficulty.medium.length}`);
      }
      if (needed.hard > poolByDifficulty.hard.length) {
        shortages.push(`Hard: need ${needed.hard}, have ${poolByDifficulty.hard.length}`);
      }

      if (shortages.length > 0) {
        return {
          isValid: false,
          message: `Insufficient questions in pool. ${shortages.join('; ')}`
        };
      }
    } else {
      // Category mode validation
      for (const [categoryId, categoryConfig] of Object.entries(config.categoryConfigs)) {
        const categoryQuestions = selectedPool.filter(q => q.category_id === categoryId);
        const poolByDifficulty = {
          easy: categoryQuestions.filter(q => q.difficulty === 'easy'),
          medium: categoryQuestions.filter(q => q.difficulty === 'medium'),
          hard: categoryQuestions.filter(q => q.difficulty === 'hard')
        };

        const needed = {
          easy: categoryConfig.easy * studentCount,
          medium: categoryConfig.medium * studentCount,
          hard: categoryConfig.hard * studentCount
        };

        const categoryName = categories.find(c => c.id === categoryId)?.name || 'Unknown';
        const shortages = [];

        if (needed.easy > poolByDifficulty.easy.length) {
          shortages.push(`${categoryName} Easy: need ${needed.easy}, have ${poolByDifficulty.easy.length}`);
        }
        if (needed.medium > poolByDifficulty.medium.length) {
          shortages.push(`${categoryName} Medium: need ${needed.medium}, have ${poolByDifficulty.medium.length}`);
        }
        if (needed.hard > poolByDifficulty.hard.length) {
          shortages.push(`${categoryName} Hard: need ${needed.hard}, have ${poolByDifficulty.hard.length}`);
        }

        if (shortages.length > 0) {
          return {
            isValid: false,
            message: `Insufficient questions in selected pool. ${shortages.join('; ')}`
          };
        }
      }
    }

    return { isValid: true, message: '' };
  };

  // Assign questions to students using smart pool logic
  const assignQuestionsWithSmartPool = async (examId, selectedPool, configuration, enrolledStudents) => {
    setAssigningStudentQuestions(true);

    try {
      console.log('🔄 Starting bulk assignment...');
      console.log('- Exam ID:', examId);
      console.log('- Selected Pool Size:', selectedPool.length);
      console.log('- Configuration:', configuration);
      console.log('- Enrolled Students:', enrolledStudents.length);

      const assignments = [];

      for (const registration of enrolledStudents) {
        const studentId = registration.student_id;
        console.log(`👤 Generating questions for student: ${studentId}`);

        const studentQuestions = generateStudentQuestionsFromPool(selectedPool, configuration);
        console.log(`📝 Generated ${studentQuestions.length} questions for student ${studentId}:`,
          studentQuestions.map(q => ({ id: q.id, title: q.title, difficulty: q.difficulty })));

        studentQuestions.forEach((question, index) => {
          assignments.push({
            exam_id: String(examId),
            student_id: String(studentId),
            question_id: String(question.id),
            question_order: index,
            points: 1,
            assignment_metadata: {
              smartPoolAssigned: true,
              configuration: configuration,
              assignedBy: 'smart_pool'
            }
          });
        });
      }

      console.log(`📊 Total assignments to create: ${assignments.length}`);
      console.log('📋 Sample assignment:', assignments[0]);

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No access token found');
      }

      console.log('🚀 Making bulk assignment API call...');

      const response = await api.post('/student-exam-questions/bulk-assign/', {
        assignments: assignments
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Bulk assignment response:', response.data);
      console.log('✅ Assignments created successfully');

      return true;

    } catch (error) {
      console.error('❌ Error in assignQuestionsWithSmartPool:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);

      // More detailed error logging
      if (error.response?.data?.detail) {
        console.error('❌ API Error Detail:', error.response.data.detail);
      }

      return false;
    } finally {
      setAssigningStudentQuestions(false);
    }
  };

  // Generate questions for a student from the selected pool
  const generateStudentQuestionsFromPool = (selectedPool, configuration) => {
    const studentQuestions = [];

    if (configuration.sourceMode === 'simple') {
      // Simple difficulty distribution
      const poolByDifficulty = {
        easy: selectedPool.filter(q => q.difficulty === 'easy'),
        medium: selectedPool.filter(q => q.difficulty === 'medium'),
        hard: selectedPool.filter(q => q.difficulty === 'hard')
      };

      // Select questions with recycling if needed
      if (configuration.difficultyDistribution.easy > 0) {
        studentQuestions.push(...selectRandomWithRecycling(poolByDifficulty.easy, configuration.difficultyDistribution.easy));
      }
      if (configuration.difficultyDistribution.medium > 0) {
        studentQuestions.push(...selectRandomWithRecycling(poolByDifficulty.medium, configuration.difficultyDistribution.medium));
      }
      if (configuration.difficultyDistribution.hard > 0) {
        studentQuestions.push(...selectRandomWithRecycling(poolByDifficulty.hard, configuration.difficultyDistribution.hard));
      }
    } else {
      // Category mode
      Object.entries(configuration.categoryConfigs).forEach(([categoryId, categoryConfig]) => {
        const categoryQuestions = selectedPool.filter(q => q.category_id === categoryId);
        const poolByDifficulty = {
          easy: categoryQuestions.filter(q => q.difficulty === 'easy'),
          medium: categoryQuestions.filter(q => q.difficulty === 'medium'),
          hard: categoryQuestions.filter(q => q.difficulty === 'hard')
        };

        if (categoryConfig.easy > 0) {
          studentQuestions.push(...selectRandomWithRecycling(poolByDifficulty.easy, categoryConfig.easy));
        }
        if (categoryConfig.medium > 0) {
          studentQuestions.push(...selectRandomWithRecycling(poolByDifficulty.medium, categoryConfig.medium));
        }
        if (categoryConfig.hard > 0) {
          studentQuestions.push(...selectRandomWithRecycling(poolByDifficulty.hard, categoryConfig.hard));
        }
      });
    }

    return shuffleArray(studentQuestions);
  };

  // FIXED: Function to clear existing student-question assignments - improved error handling
  const clearExistingStudentAssignments = async (examId) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('No access token found');
        return;
      }

      // Get existing assignments
      const response = await api.get(`/exams/${examId}/student-questions/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Found ${response.data.length} existing assignments to clear`);

      if (response.data.length > 0) {
        // Delete each assignment individually with better error handling
        const deletePromises = response.data.map(async (assignment) => {
          try {
            await api.delete(`/student-exam-questions/${assignment.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              }
            });
            console.log(`Deleted assignment ${assignment.id}`);
          } catch (deleteError) {
            console.error(`Failed to delete assignment ${assignment.id}:`, deleteError);
            // Continue with other deletions even if one fails
          }
        });

        await Promise.allSettled(deletePromises);
        console.log('Finished clearing existing student assignments');
      }

    } catch (error) {
      // Handle 404 error gracefully - it means no assignments exist yet
      if (error.response?.status === 404) {
        console.log('No existing assignments found for this exam (404) - this is normal for new exams');
        return;
      }

      console.error('Error in clearExistingStudentAssignments:', error);
      // Don't throw error, just log it as it's not critical for the flow
    }
  };



  // NEW: Function to reassign questions to all students (used when questions change)
  // UPDATED: Function to reassign questions to all students (used when questions change)
  const reassignQuestionsToAllStudents = async (examId) => {
    setAssigningStudentQuestions(true);
    try {
      const exam = exams.find(e => e.id === examId);
      if (!exam) {
        toast.error("Exam not found", {
          description: "The exam could not be found. Please refresh and try again.",
        });
        return false;
      }

      // First clear existing assignments
      await clearExistingStudentAssignments(examId);

      // Get the stored configuration
      const storedConfiguration = exam.extra_data?.assignmentConfiguration;
      const enrolledStudents = examRegistrations[examId] || [];

      if (enrolledStudents.length === 0) {
        toast.warning("No students enrolled", {
          description: "Questions configuration updated, but no students are enrolled to receive assignments.",
        });
        return true;
      }

      // Check if this exam has a stored configuration
      if (storedConfiguration) {
        console.log('🔧 Using stored configuration for reassignment:', storedConfiguration);

        // Use the appropriate assignment method based on configuration type
        if (storedConfiguration.mode === 'smart_pool') {
          // For Smart Pool assignments, we need to regenerate from the stored pool
          toast.info("Smart Pool Reassignment", {
            description: "Reassigning questions using the original Smart Pool configuration.",
          });

          const selectedPool = questionTypeFilter === 'coding'
            ? questions.filter(q => storedConfiguration.selectedPool?.includes(q.id))
            : mcqs.filter(m => storedConfiguration.selectedPool?.includes(m.id));

          if (selectedPool.length === 0) {
            toast.error("Smart Pool Error", {
              description: "Original question pool is no longer available. Please reconfigure assignments.",
            });
            return false;
          }

          // Use Smart Pool assignment logic
          const success = await assignQuestionsWithSmartPool(
            examId,
            selectedPool,
            storedConfiguration,
            enrolledStudents
          );

          if (success) {
            toast.success("Smart Pool Reassignment Complete", {
              description: `Questions reassigned using Smart Pool configuration to ${enrolledStudents.length} students.`,
            });
          }

          return success;

        } else if (storedConfiguration.mode === 'total' || storedConfiguration.mode === 'per-category') {
          // For Auto-Select configurations, use strict configuration assignment
          toast.info("Configuration-Based Reassignment", {
            description: "Reassigning questions using the stored Auto-Select configuration.",
          });

          const success = await assignQuestionsWithStrictConfiguration(
            examId,
            storedConfiguration,
            enrolledStudents
          );

          if (success) {
            toast.success("Configuration Reassignment Complete", {
              description: `Questions reassigned using ${storedConfiguration.mode} configuration to ${enrolledStudents.length} students.`,
            });
          }

          return success;

        } else {
          // Fallback for unknown configuration types
          console.log('⚠️ Unknown configuration mode, falling back to basic assignment');
          return await assignQuestionsToStudents(examId);
        }

      } else {
        // No stored configuration, use basic assignment
        console.log('📝 No stored configuration found, using basic assignment');

        // Check what type of questions are assigned to determine assignment method
        const questionStatus = getQuestionAssignmentStatus(exam);

        let success = true;

        if (questionStatus.codingCount > 0) {
          const codingSuccess = await assignQuestionsToStudents(examId);
          if (!codingSuccess) success = false;
        }

        if (questionStatus.mcqCount > 0) {
          const mcqSuccess = await assignMcqsToStudents(examId);
          if (!mcqSuccess) success = false;
        }

        if (success) {
          toast.success("Basic Reassignment Complete", {
            description: `Questions reassigned using basic randomization to ${enrolledStudents.length} students.`,
          });
        }

        return success;
      }

    } catch (error) {
      console.error('Error reassigning questions:', error);
      toast.error("Reassignment Failed", {
        description: "An error occurred while reassigning questions to students.",
      });
      return false;
    } finally {
      setAssigningStudentQuestions(false);
    }
  };


  // FIXED: Function to assign questions randomly to all enrolled students using bulk assignment endpoint
  const assignQuestionsToStudents = async (examId) => {
    setAssigningStudentQuestions(true);
    try {
      const examQuestionsList = examQuestions[examId] || [];
      const enrolledStudents = examRegistrations[examId] || [];

      if (examQuestionsList.length === 0) {
        toast.error("No questions assigned to exam", {
          description: "Please assign questions to the exam first before setting it to scheduled.",
        });
        return false;
      }

      if (enrolledStudents.length === 0) {
        toast.error("No students enrolled", {
          description: "Please enroll students in the exam first before setting it to scheduled.",
        });
        return false;
      }

      const exam = exams.find(e => e.id === examId);
      const questionsPerStudentCount = exam?.extra_data?.questions_per_student || questionsPerStudent;

      if (questionsPerStudentCount > examQuestionsList.length) {
        toast.error("Not enough questions", {
          description: `Exam has ${examQuestionsList.length} questions but needs ${questionsPerStudentCount} per student.`,
        });
        return false;
      }

      // Get all available question IDs from the exam questions
      const availableQuestionIds = examQuestionsList.map(eq => eq.question_id);
      const assignments = [];

      for (const registration of enrolledStudents) {
        const studentId = registration.student_id;

        // Randomly select questions for this student
        const shuffledQuestions = shuffleArray(availableQuestionIds);
        const selectedQuestions = shuffledQuestions.slice(0, questionsPerStudentCount);

        // Create assignment objects for this student
        selectedQuestions.forEach((questionId, index) => {
          assignments.push({
            exam_id: String(examId), // Ensure string format for UUID
            student_id: String(studentId), // Ensure string format for UUID
            question_id: String(questionId), // Ensure string format for UUID
            question_order: index, // Sequential order per student
            points: 1 // Default points
          });
        });
      }

      console.log('Bulk assignment payload:', { assignments }); // Debug log

      // Get access token for authorization
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error("Authentication required", {
          description: "Please log in again.",
        });
        logout();
        return false;
      }

      // Make bulk assignment request using the correct endpoint
      const response = await api.post('/student-exam-questions/bulk-assign/', {
        assignments: assignments
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Bulk assignment response:', response.data); // Debug log

      toast.success("Questions assigned to students!", {
        description: `Successfully assigned ${questionsPerStudentCount} random questions to ${enrolledStudents.length} students.`,
      });

      return true;

    } catch (error) {
      console.error('Error assigning questions to students:', error);
      console.error('Error response data:', error.response?.data); // Debug log

      if (error.response?.status === 401) {
        toast.error("Authentication failed", {
          description: "Your session has expired. Please log in again.",
        });
        logout();
        return false;
      }

      // Show detailed error message from backend
      let errorMessage = "An error occurred while assigning questions to students.";
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle validation error array
          errorMessage = error.response.data.detail.map(err =>
            `${err.loc?.join('.')} - ${err.msg}`
          ).join('; ');
        }
      }

      toast.error("Failed to assign questions to students", {
        description: errorMessage,
      });
      return false;
    } finally {
      setAssigningStudentQuestions(false);
    }
  };

  // [Rest of your functions remain the same until the Dialog section...]

  // FIXED: Function to fetch student question assignments using the NEW endpoint
  const fetchStudentQuestionAssignments = async (examId) => {
    setLoadingAssignments(true);
    try {
      // Get access token from localStorage
      const token = localStorage.getItem('access_token');

      if (!token) {
        toast.error("Authentication required", {
          description: "Please log in again.",
        });
        logout();
        return {};
      }

      // Use the NEW endpoint format: /exams/{exam_id}/student-questions/
      const response = await api.get(`/exams/${examId}/student-questions/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Raw API response for assignments:', response.data); // Debug log

      // Process the raw assignment data by mapping student and question information
      const assignmentsByStudent = {};
      response.data.forEach(assignment => {
        const studentId = assignment.student_id;

        // Find the question data from our questions array
        const questionData = questions.find(q => q.id === assignment.question_id);

        // Create processed assignment with question details
        const processedAssignment = {
          ...assignment,
          question: questionData // Add the question object
        };

        if (!assignmentsByStudent[studentId]) {
          assignmentsByStudent[studentId] = [];
        }
        assignmentsByStudent[studentId].push(processedAssignment);
      });

      console.log('Grouped assignments by student:', assignmentsByStudent); // Debug log

      setStudentQuestionAssignments(prev => ({
        ...prev,
        [examId]: assignmentsByStudent
      }));

      return assignmentsByStudent;
    } catch (error) {
      console.error('Error fetching student question assignments:', error);
      if (error.response?.status === 401) {
        toast.error("Authentication failed", {
          description: "Your session has expired. Please log in again.",
        });
        logout();
        return {};
      }
      toast.error("Failed to fetch student assignments", {
        description: error.response?.data?.detail || "Unable to load student question assignments.",
      });
      return {};
    } finally {
      setLoadingAssignments(false);
    }
  };

  // UPDATED: Handler to open student assignments view dialog
  const handleViewStudentAssignments = async (exam) => {
    setCurrentExamForAssignments(exam);
    setViewAssignmentsDialogOpen(true);

    // Ensure questions are loaded for mapping question IDs to question data
    if (questions.length === 0) {
      await fetchQuestions();
    }

    // Ensure MCQs are loaded for mapping MCQ IDs to MCQ data
    if (mcqs.length === 0) {
      await fetchMcqs();
    }

    // Ensure students are loaded for mapping student IDs to student data
    if (students.length === 0) {
      await fetchStudents();
    }

    // Fetch both coding and MCQ assignments based on exam type
    if (examSupportsCoding(exam.exam_type)) {
      await fetchStudentQuestionAssignments(exam.id);
    }

    if (examSupportsMcqs(exam.exam_type)) {
      await fetchStudentMcqAssignments(exam.id);
    }
  };


  // Fetch exams from API
  const fetchExams = async () => {
    setLoadingExams(true);
    try {
      const response = await api.get('/exams/');
      setExams(response.data);

      // Update dashboard stats based on real data
      const activeCount = response.data.filter(exam => exam.status === 'active' || exam.status === 'draft').length;
      const completedCount = response.data.filter(exam => exam.status === 'completed').length;

    } catch (error) {
      console.error('Error fetching exams:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      toast.error("Failed to fetch exams", {
        description: "Unable to load your exams. Please refresh the page.",
      });
    } finally {
      setLoadingExams(false);
    }
  };

  // Fetch all available questions
  const fetchQuestions = async (examType = null) => {
    setLoadingQuestions(true);
    try {
      // Build query parameters
      let queryParams = '?skip=0&limit=5000';

      // NEW: Add has_solution filter for practice exams
      if (examType === 'practice') {
        queryParams += '&has_solution=true';
      }

      const response = await api.get(`/questions/${queryParams}`);
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      toast.error("Failed to fetch questions", {
        description: "Unable to load available questions.",
      });
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Fetch all available students
  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await api.get('/users/?skip=0&limit=100');
      // Filter only students
      const studentUsers = response.data.filter(user => user.role === 'student');
      setStudents(studentUsers);
    } catch (error) {
      console.error('Error fetching students:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      toast.error("Failed to fetch students", {
        description: "Unable to load available students.",
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  // Place this function near your other data fetching functions like fetchStudents

  const fetchStudentProfiles = async () => {
    setLoadingProfiles(true);
    try {
      // Assuming 'api' is your configured axios client
      const response = await api.get('/student-profiles/?skip=0&limit=500'); // Fetch more profiles
      setStudentProfiles(response.data || []);
    } catch (error) {
      console.error('Error fetching student profiles:', error);
      toast.error("Failed to fetch student profiles", {
        description: "Could not load detailed student information.",
      });
    } finally {
      setLoadingProfiles(false);
    }
  };

  // FIXED: Fetch exam-specific questions - using correct endpoint
  const fetchExamQuestions = async (examId) => {
    try {
      const response = await api.get('/exam-questions/?skip=0&limit=100');
      // Filter questions for this specific exam
      const examSpecificQuestions = response.data.filter(eq => eq.exam_id === examId);
      setExamQuestions(prev => ({
        ...prev,
        [examId]: examSpecificQuestions
      }));
      return examSpecificQuestions;
    } catch (error) {
      console.error('Error fetching exam questions:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      toast.error("Failed to fetch exam questions", {
        description: "Unable to load assigned questions for this exam.",
      });
      return [];
    }
  };

  // Fetch exam-specific registrations
  const fetchExamRegistrations = async (examId) => {
    try {
      const response = await api.get('/exam-registrations/?skip=0&limit=100');
      // Filter registrations for this specific exam
      const examSpecificRegistrations = response.data.filter(reg => reg.exam_id === examId);
      setExamRegistrations(prev => ({
        ...prev,
        [examId]: examSpecificRegistrations
      }));
      return examSpecificRegistrations;
    } catch (error) {
      console.error('Error fetching exam registrations:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      toast.error("Failed to fetch exam registrations", {
        description: "Unable to load enrolled students for this exam.",
      });
      return [];
    }
  };

  const handleStatusChange = async (examId, newStatus) => {
    setChangingStatus(true);
    try {
      const exam = exams.find(e => e.id === examId);

      if (!exam) {
        toast.error("Exam not found", {
          description: "The exam could not be found. Please refresh and try again.",
        });
        setChangingStatus(false);
        return false;
      }

      if (newStatus === 'scheduled' && exam.status !== 'scheduled') {
        console.log('Checking if assignments need to be enforced...');

        // ✅ NEW: Check if this was Smart Assigned - if so, skip reassignment
        const storedConfiguration = exam.extra_data?.assignmentConfiguration;
        const isSmartPoolAssigned = storedConfiguration?.mode === 'smart_pool';

        if (isSmartPoolAssigned) {
          console.log('⏭️ Skipping reassignment - exam was Smart Assigned from pool');
          toast.info("Smart Assignment Preserved", {
            description: "Existing Smart Assignment configuration preserved.",
          });
        } else {
          // Only clear and reassign if NOT Smart Assigned
          console.log('🔄 Standard assignment - clearing and reassigning...');
          await clearExistingStudentAssignments(examId);
          await new Promise(resolve => setTimeout(resolve, 500));

          const enrolledStudents = examRegistrations[examId] || [];

          if (storedConfiguration && enrolledStudents.length > 0) {
            await assignQuestionsWithStrictConfiguration(examId, storedConfiguration, enrolledStudents);
          } else {
            // Fallback to regular assignment if no configuration stored
            const questionStatus = getQuestionAssignmentStatus(exam);
            if (questionStatus.codingCount > 0) {
              const success = await assignQuestionsToStudents(examId);
              if (!success) {
                setChangingStatus(false);
                return false;
              }
            }
            if (questionStatus.mcqCount > 0) {
              const success = await assignMcqsToStudents(examId);
              if (!success) {
                setChangingStatus(false);
                return false;
              }
            }
          }
        }
      }

      // Continue with the rest of the status change...
      const response = await api.put(`/exams/${examId}`, {
        title: exam.title,
        description: exam.description,
        start_time: exam.start_time,
        end_time: exam.end_time,
        duration_minutes: exam.duration_minutes,
        exam_type: exam.exam_type,
        shuffle_questions: exam.shuffle_questions,
        max_attempts: exam.max_attempts,
        settings: exam.settings || {},
        status: newStatus,
        extra_data: exam.extra_data || {}
      });

      setExams(prevExams => prevExams.map(e =>
        e.id === examId ? response.data : e
      ));

      toast.success("Status updated successfully!", {
        description: `Exam status changed to "${newStatus}".`,
      });

      return true;

    } catch (error) {
      console.error('Error updating exam status:', error);
      if (error.response?.status === 401) {
        toast.error("Session Expired", {
          description: "Please log in again.",
        });
        logout();
        return false;
      }
      toast.error("Failed to update status", {
        description: error.response?.data?.detail || "An error occurred while updating the exam status.",
      });
      return false;
    } finally {
      setChangingStatus(false);
    }
  };

  // IMPROVED: Handle question assignment with status-based validation
  const handleAssignQuestions = async (examId, questionIds) => {
    setAssigningQuestions(true);
    try {
      const exam = exams.find(e => e.id === examId);

      // Check if modifications are allowed based on exam status
      if (exam.status === 'active' || exam.status === 'completed') {
        toast.error("Cannot modify questions", {
          description: `Cannot modify questions in ${exam.status} exams.`,
        });
        setAssigningQuestions(false);
        return;
      }

      const assignPromises = questionIds.map((questionId, index) =>
        api.post('/exam-questions/', {
          question_order: index,
          points: 1, // Default points, can be made configurable
          extra_data: {},
          exam_id: examId,
          question_id: questionId
        })
      );

      await Promise.all(assignPromises);

      // Refresh exam questions
      await fetchExamQuestions(examId);

      // If exam is scheduled, reassign questions to all students
      if (exam.status === 'scheduled') {
        toast.info("Reassigning questions", {
          description: "Reassigning questions to all enrolled students...",
        });
        await reassignQuestionsToAllStudents(examId);
      }

      toast.success("Questions assigned successfully!", {
        description: `${questionIds.length} question(s) have been assigned to the exam.`,
      });

      setSelectedQuestions(new Set());
      setQuestionDialogOpen(false);

    } catch (error) {
      console.error('Error assigning questions:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }

      // Improved error handling
      let errorMessage = "An error occurred while assigning questions.";
      if (error.response?.status === 400) {
        errorMessage = error.response?.data?.detail || "Bad request. Questions may already be assigned or there may be a conflict.";
      }

      toast.error("Failed to assign questions", {
        description: errorMessage,
      });
    } finally {
      setAssigningQuestions(false);
    }
  };

  // IMPROVED: Handle student enrollment with status-based validation
  const handleEnrollStudents = async (examId, studentIds) => {
    setEnrollingStudents(true);
    try {
      const exam = exams.find(e => e.id === examId);

      // Add null check here
      if (!exam) {
        toast.error("Exam not found", {
          description: "The exam could not be found. Please refresh and try again.",
        });
        setEnrollingStudents(false);
        return;
      }

      if (exam.status === 'active' || exam.status === 'completed') {
        toast.error("Cannot modify enrollment", {
          description: `Cannot enroll students in ${exam.status} exams.`,
        });
        setEnrollingStudents(false);
        return;
      }

      const enrollPromises = studentIds.map(studentId =>
        api.post('/exam-registrations/', {
          status: "pending",
          approved_at: new Date().toISOString(),
          extra_data: {},
          exam_id: examId,
          student_id: studentId,
          approved_by: user.id
        })
      );

      await Promise.all(enrollPromises);
      await fetchExamRegistrations(examId);

      // If exam has locked configuration and is scheduled, use strict assignment
      if (exam.status === 'scheduled') {
        const storedConfiguration = exam.extra_data?.assignmentConfiguration;
        if (storedConfiguration) {
          toast.info("Applying configuration", {
            description: "Assigning questions to newly enrolled students using stored configuration...",
          });
          const allEnrolledStudents = examRegistrations[examId] || [];
          await clearExistingStudentAssignments(examId);
          await assignQuestionsWithStrictConfiguration(examId, storedConfiguration, allEnrolledStudents);
        } else {
          await assignQuestionsToStudents(examId);
        }
      }

      toast.success("Students enrolled successfully!", {
        description: `${studentIds.length} student(s) have been enrolled in the exam.`,
      });

      setSelectedStudents(new Set());
      setEnrollmentDialogOpen(false);

    } catch (error) {
      console.error('Error enrolling students:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }

      let errorMessage = "An error occurred while enrolling students.";
      if (error.response?.status === 400) {
        errorMessage = error.response?.data?.detail || "Bad request. Please check if students are already enrolled.";
      }

      toast.error("Failed to enroll students", {
        description: errorMessage,
      });
    } finally {
      setEnrollingStudents(false);
    }
  };


  // IMPROVED: Handle question removal with status-based validation
  const handleRemoveQuestion = async (examQuestionId, examId) => {
    try {
      const exam = exams.find(e => e.id === examId);

      // Check if modifications are allowed
      if (exam.status === 'active' || exam.status === 'completed') {
        toast.error("Cannot modify questions", {
          description: `Cannot remove questions from ${exam.status} exams.`,
        });
        return;
      }

      // If exam is scheduled, warn about reassignment
      if (exam.status === 'scheduled') {
        toast.info("Student assignments will be updated", {
          description: "Questions will be reassigned to all students after removal.",
        });
      }

      await api.delete(`/exam-questions/${examQuestionId}`);

      // Refresh exam questions
      await fetchExamQuestions(examId);

      // If exam is scheduled, reassign questions to all students
      if (exam.status === 'scheduled') {
        await reassignQuestionsToAllStudents(examId);
      }

      toast.success("Question removed successfully!", {
        description: "The question has been removed from the exam.",
      });

    } catch (error) {
      console.error('Error removing question:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }

      let errorMessage = "An error occurred while removing the question.";
      if (error.response?.status === 400) {
        errorMessage = error.response?.data?.detail || "Bad request. Cannot remove question at this time.";
      }

      toast.error("Failed to remove question", {
        description: errorMessage,
      });
    }
  };

  // IMPROVED: Handle student unenrollment with status-based validation
  const handleUnenrollStudent = async (registrationId, examId) => {
    try {
      const exam = exams.find(e => e.id === examId);

      // Check if modifications are allowed
      if (exam.status === 'active' || exam.status === 'completed') {
        toast.error("Cannot modify enrollment", {
          description: `Cannot unenroll students from ${exam.status} exams.`,
        });
        return;
      }

      // If exam is scheduled, warn about reassignment
      if (exam.status === 'scheduled') {
        toast.info("Student assignments will be updated", {
          description: "Questions will be reassigned after unenrolling the student.",
        });
      }

      await api.delete(`/exam-registrations/${registrationId}`);

      // Refresh exam registrations
      await fetchExamRegistrations(examId);

      // If exam is scheduled, clear assignments for this student
      if (exam.status === 'scheduled') {
        await clearExistingStudentAssignments(examId);
        await assignQuestionsToStudents(examId);
      }

      toast.success("Student unenrolled successfully!", {
        description: "The student has been unenrolled from the exam.",
      });

    } catch (error) {
      console.error('Error unenrolling student:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }

      let errorMessage = "An error occurred while unenrolling the student.";
      if (error.response?.status === 400) {
        errorMessage = error.response?.data?.detail || "Bad request. Cannot unenroll student at this time.";
      }

      toast.error("Failed to unenroll student", {
        description: errorMessage,
      });
    }
  };

  // SIMPLIFIED: Handle exam assignment - just change to scheduled
  const handleAssignExam = async (examId) => {
    const exam = exams.find(e => e.id === examId);
    const questionStatus = getQuestionAssignmentStatus(exam);
    const enrollmentStatus = getStudentEnrollmentStatus(exam);

    // Check if exam is ready for assignment
    if (!questionStatus.isAssigned) {
      toast.error("Questions not assigned", {
        description: "Please assign questions to this exam first.",
      });
      return;
    }

    if (!enrollmentStatus.isEnrolled) {
      toast.error("No students enrolled", {
        description: "Please enroll students in this exam first.",
      });
      return;
    }

    // Proceed with assignment (change status to scheduled)
    await handleStatusChange(examId, 'scheduled'); // This should be 'scheduled', not 'completed'
  };

  const getStatusButton = (exam) => {
    const questionStatus = getQuestionAssignmentStatus(exam);
    const enrollmentStatus = getStudentEnrollmentStatus(exam);
    const isReadyForAssignment = questionStatus.isAssigned && enrollmentStatus.isEnrolled;

    const now = new Date();
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);

    if (exam.status === 'draft') {
      return (
        <Button
          size="sm"
          variant={isReadyForAssignment ? "default" : "outline"}
          disabled={!isReadyForAssignment || changingStatus}
          onClick={() => handleAssignExam(exam.id)}
          className={`gap-2 min-w-[90px] ${isReadyForAssignment
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'text-gray-500 border-gray-300'
            }`}
        >
          {changingStatus ? (
            <>
              <Clock className="h-3 w-3 animate-spin" />
              Assigning...
            </>
          ) : (
            <>
              <PlusCircle className="h-3 w-3" />
              Assign
            </>
          )}
        </Button>
      );
    }

    if (exam.status === 'scheduled') {
      return (
        <Button
          size="sm"
          variant="secondary"
          disabled
          className="gap-2 min-w-[90px] bg-green-100 text-green-800 hover:bg-green-200 border-green-300"
        >
          <CheckCircle2 className="h-3 w-3" />
          Assigned
        </Button>
      );
    }

    if (exam.status === 'active') {
      return (
        <Button
          size="sm"
          variant="secondary"
          disabled
          className="gap-2 min-w-[90px] bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300"
        >
          <PlayCircle className="h-3 w-3" />
          On-Going
        </Button>
      );
    }

    if (exam.status === 'completed') {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled
          className="gap-2 min-w-[90px] bg-purple-100 text-purple-800 border-purple-300"
        >
          <CircleCheckBig className="h-3 w-3" />
          Completed
        </Button>
      );
    }

    return null;
  };


  // Update the existing handleOpenQuestionDialog function
  const handleOpenQuestionDialog = async (exam) => {
    setCurrentExamForQuestions(exam);
    setQuestionDialogOpen(true);

    // Reset filters and search
    setQuestionSearchTerm('');
    setMcqSearchTerm('');
    setDifficultyFilter('all');
    setCategoryFilter('all');

    // Set question type based on exam type - enforce restrictions
    if (exam.exam_type === 'quiz') {
      setQuestionTypeFilter('mcq'); // Quiz only supports MCQs
    } else if (['practice', 'midterm', 'final'].includes(exam.exam_type)) {
      setQuestionTypeFilter('coding'); // These only support coding
    } else {
      setQuestionTypeFilter('coding'); // Default fallback
    }

    // Show warning for non-draft exams
    if (exam.status !== 'draft') {
      toast.info("Exam Status Warning", {
        description: `Modifying questions in a ${exam.status} exam will reassign questions to all students.`,
      });
    }

    // Set questions per student from exam data or default
    const examQuestionsPerStudent = exam?.extra_data?.questions_per_student || 5;
    setQuestionsPerStudent(examQuestionsPerStudent);

    // NEW: Fetch questions with practice exam filter
    if (examSupportsCoding(exam.exam_type) && (questions.length === 0 || exam.exam_type === 'practice')) {
      await fetchQuestions(exam.exam_type); // Pass exam type to apply has_solution filter
    }

    if (examSupportsMcqs(exam.exam_type) && mcqs.length === 0) {
      await fetchMcqs();
    }

    // Fetch exam-specific questions and MCQs
    if (examSupportsCoding(exam.exam_type)) {
      await fetchExamQuestions(exam.id);
      const assignedQuestions = examQuestions[exam.id] || [];
      const assignedQuestionIds = new Set(assignedQuestions.map(eq => eq.question_id));
      setSelectedQuestions(assignedQuestionIds);
    }

    if (examSupportsMcqs(exam.exam_type)) {
      await fetchExamMcqs(exam.id);
      const assignedMcqs = examMcqs[exam.id] || [];
      const assignedMcqIds = new Set(assignedMcqs.map(em => em.mcq_id));
      setSelectedMcqs(assignedMcqIds);
    }
  };

  const checkConfigurationLock = (exam) => {
    if (!exam) return false;
    return exam.extra_data?.configurationLocked || false;
  };

  const getConfigurationSummary = (exam) => {
    if (!exam) return null;

    const config = exam.extra_data?.assignmentConfiguration;
    if (!config) return null;

    if (config.mode === 'total') {
      return `Total: ${config.totalQuestions} questions (${config.difficultyDistribution.easy}% Easy, ${config.difficultyDistribution.medium}% Medium, ${config.difficultyDistribution.hard}% Hard)`;
    } else {
      const summary = Object.entries(config.categoryConfigs).map(([categoryId, categoryConfig]) => {
        const categoryName = categories.find(c => c.id === categoryId)?.name || 'Unknown';
        return `${categoryName}: ${categoryConfig.count}`;
      }).join(', ');
      return `Per Category: ${summary}`;
    }
  };


  // IMPROVED: Enhanced dialog with status warnings
  // Find and UPDATE the handleOpenEnrollmentDialog function

  const handleOpenEnrollmentDialog = async (exam) => {
    setCurrentExamForEnrollment(exam);
    setEnrollmentDialogOpen(true);

    // Reset search and filters
    setStudentSearchTerm('');
    setDepartmentFilter('all');
    setBatchYearFilter('all');

    if (exam.status !== 'draft') {
      toast.info("Exam Status Warning", {
        description: `Modifying enrollment in a ${exam.status} exam will reassign questions to all students.`,
      });
    }

    // Fetch students if not already loaded
    if (students.length === 0) {
      await fetchStudents();
    }

    // NEW: Fetch profiles if not already loaded
    if (studentProfiles.length === 0) {
      await fetchStudentProfiles();
    }

    await fetchExamRegistrations(exam.id);

    const enrolledStudents = examRegistrations[exam.id] || [];
    const enrolledStudentIds = new Set(enrolledStudents.map(reg => reg.student_id));
    setSelectedStudents(enrolledStudentIds);
  };


  // Update this function in your teacherDashboard.jsx
  const getQuestionAssignmentStatus = (exam) => {
    const assignedQuestions = examQuestions[exam.id] || [];
    const assignedMcqs = examMcqs[exam.id] || [];

    // Only count questions that are supported by this exam type
    let totalCount = 0;
    let codingCount = 0;
    let mcqCount = 0;
    let hasCodingQuestions = false;
    let hasMcqQuestions = false;

    if (examSupportsCoding(exam.exam_type)) {
      codingCount = assignedQuestions.length;
      totalCount += codingCount;
      hasCodingQuestions = codingCount > 0;
    }

    if (examSupportsMcqs(exam.exam_type)) {
      mcqCount = assignedMcqs.length;
      totalCount += mcqCount;
      hasMcqQuestions = mcqCount > 0;
    }

    return {
      count: totalCount,
      isAssigned: totalCount > 0,
      codingCount: codingCount,
      mcqCount: mcqCount,
      hasCodingQuestions: hasCodingQuestions,
      hasMcqQuestions: hasMcqQuestions
    };
  };

  // Add this new function to your teacherDashboard.jsx
  const assignMcqsToStudents = async (examId) => {
    setAssigningStudentQuestions(true);
    try {
      const examMcqsList = examMcqs[examId] || [];
      const enrolledStudents = examRegistrations[examId] || [];

      if (examMcqsList.length === 0) {
        toast.error("No MCQs assigned to exam", {
          description: "Please assign MCQs to the exam first before setting it to scheduled.",
        });
        return false;
      }

      if (enrolledStudents.length === 0) {
        toast.error("No students enrolled", {
          description: "Please enroll students in the exam first before setting it to scheduled.",
        });
        return false;
      }

      // For MCQs, typically all students get all MCQs
      const assignments = [];
      const availableMcqIds = examMcqsList.map(em => em.mcq_id);

      for (const registration of enrolledStudents) {
        const studentId = registration.student_id;

        // Assign all MCQs to each student (or shuffle if needed)
        availableMcqIds.forEach((mcqId, index) => {
          assignments.push({
            exam_id: String(examId),
            student_id: String(studentId),
            mcq_id: String(mcqId),
            question_order: index,
            points: 1
          });
        });
      }

      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error("Authentication required", {
          description: "Please log in again.",
        });
        logout();
        return false;
      }

      // Use bulk assignment endpoint for MCQs
      const response = await api.post('/student-exam-mcqs/bulk-assign/', {
        assignments: assignments
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      toast.success("MCQs assigned to students!", {
        description: `Successfully assigned ${availableMcqIds.length} MCQs to ${enrolledStudents.length} students.`,
      });

      return true;

    } catch (error) {
      console.error('Error assigning MCQs to students:', error);
      toast.error("Failed to assign MCQs to students", {
        description: error.response?.data?.detail || "An error occurred while assigning MCQs to students.",
      });
      return false;
    } finally {
      setAssigningStudentQuestions(false);
    }
  };


  // Get student enrollment status for an exam
  const getStudentEnrollmentStatus = (exam) => {
    const enrolledStudents = examRegistrations[exam.id] || [];
    return {
      count: enrolledStudents.length,
      isEnrolled: enrolledStudents.length > 0
    };
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    // Add course validation
    if (!examForm.course_id || examForm.course_id === "no-courses") {
      toast.error("Course Required", {
        description: "Please select a course for this exam.",
      });
      return;
    }
    setIsCreating(true);

    try {
      // Prepare API payload
      const apiPayload = {
        title: examForm.title,
        description: examForm.description,
        start_time: examForm.start_time,
        end_time: examForm.end_time,
        duration_minutes: parseInt(examForm.duration_minutes),
        exam_type: examForm.exam_type,
        shuffle_questions: examForm.shuffle_questions,
        max_attempts: parseInt(examForm.max_attempts),
        course_id: examForm.course_id === "none" ? null : examForm.course_id,
        settings: {},
        status: 'draft',
        extra_data: {}
      };

      console.log('Creating exam with payload:', apiPayload);

      let response;
      if (editingExam) {
        // Update existing exam - increment edit count
        const currentEditCount = examEditCounts[editingExam.id] || 0;
        const newEditCount = currentEditCount + 1;

        // FIXED: Include ALL required fields when updating
        const updatePayload = {
          // ALWAYS use previous values for all fields not in the form
          title: examForm.title,
          description: examForm.description,
          start_time: examForm.start_time,
          end_time: examForm.end_time,
          duration_minutes: parseInt(examForm.duration_minutes),
          exam_type: examForm.exam_type || editingExam.exam_type,
          shuffle_questions: typeof examForm.shuffle_questions === 'boolean'
            ? examForm.shuffle_questions
            : editingExam.shuffle_questions,
          max_attempts: parseInt(examForm.max_attempts) || editingExam.max_attempts,
          settings: editingExam.settings || {},                 // <-- always include!
          status: editingExam.status,                           // <-- always include!
          extra_data: {
            ...editingExam.extra_data,
            edit_count: newEditCount
          }
        };

        response = await api.put(`/exams/${editingExam.id}`, updatePayload);

        // Update exam in local state
        setExams(prevExams => prevExams.map(exam =>
          exam.id === editingExam.id ? response.data : exam
        ));

        // Update edit count in local state
        setExamEditCounts(prev => ({
          ...prev,
          [editingExam.id]: newEditCount
        }));

        toast.success("Exam updated successfully!", {
          description: `"${examForm.title}" has been updated (Edit #${newEditCount}).`,
        });
      } else {
        // Create new exam - initialize edit count to 0
        const createPayload = {
          ...apiPayload,
          status: 'draft', // New exams start as draft
          extra_data: { edit_count: 0 }
        };

        response = await api.post('/exams/', createPayload);

        // Add new exam to local state
        setExams(prevExams => [...prevExams, response.data]);

        // Initialize edit count for new exam
        setExamEditCounts(prev => ({
          ...prev,
          [response.data.id]: 0
        }));

        toast.success("Exam created successfully!", {
          description: `"${examForm.title}" has been created and is ready for questions.`,
        });
      }

      console.log('Exam operation successful:', response.data);

      // Reset form and editing state
      resetForm();
      setEditingExam(null);

      // Switch to exams tab to show the exam
      setActiveTab("exams");

    } catch (error) {
      console.error('Error with exam operation:', error);

      // Handle authentication errors
      if (error.response?.status === 401) {
        toast.error("Session Expired", {
          description: "Please log in again.",
        });
        logout();
        return;
      }

      // Handle other errors
      const action = editingExam ? 'update' : 'create';
      toast.error(`Failed to ${action} exam`, {
        description: error.response?.data?.detail || `An unexpected error occurred while ${action.slice(0, -1)}ing the exam.`,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteExam = async (examId) => {
    try {
      await api.delete(`/exams/${examId}`);

      // Remove exam from local state
      setExams(prevExams => prevExams.filter(exam => exam.id !== examId));

      // Remove edit count from local state
      setExamEditCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[examId];
        return newCounts;
      });

      toast.success("Exam deleted successfully!", {
        description: "The exam and all associated data have been removed.",
      });

    } catch (error) {
      console.error('Error deleting exam:', error);

      if (error.response?.status === 401) {
        toast.error("Session Expired", {
          description: "Please log in again.",
        });
        logout();
        return;
      }

      toast.error("Failed to delete exam", {
        description: error.response?.data?.detail || "An unexpected error occurred while deleting the exam.",
      });
    } finally {
      setDeleteExamId(null);
    }
  };


  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error("Logout failed", {
        description: "There was an error logging out. Please try again.",
      });
      navigate('/login');
    }
  };

  const handleViewResults = (examId) => {
    navigate(`/teacher/exam/${examId}/results`);
  };

  const handleViewQuestions = (exam) => {
    navigate(`/teacher/exam/${exam.id}/questions`);
    toast.info("Viewing questions", {
      description: `Opening questions for "${exam.title}"`,
    });
  };

  const handleAddQuestions = (exam) => {
    navigate(`/teacher/exam/${exam.id}/questions/create`);
    toast.info("Add questions", {
      description: `Adding questions to "${exam.title}"`,
    });
  };

  const handleEditExam = (exam) => {
    // Only allow editing for scheduled and draft exams
    if (exam.status !== 'scheduled' && exam.status !== 'draft') {
      toast.warning("Cannot edit exam", {
        description: `Exams with status "${exam.status}" cannot be edited.`,
      });
      return;
    }

    // Pre-fill form with exam data
    setExamForm({
      title: exam.title || '',
      description: exam.description || '',
      start_time: formatDateTimeForInput(exam.start_time),
      end_time: formatDateTimeForInput(exam.end_time),
      duration_minutes: exam.duration_minutes?.toString() || '',
      exam_type: exam.exam_type || 'practice',
      shuffle_questions: exam.shuffle_questions || false,
      max_attempts: exam.max_attempts?.toString() || '1',
      questions: '', // Questions might need to be fetched separately
      course_id: exam.course_id,
    });

    setEditingExam(exam);
    setActiveTab("create-exam");

    const currentEditCount = examEditCounts[exam.id] || 0;
    toast.info("Edit mode", {
      description: `Now editing "${exam.title}". This will be edit #${currentEditCount + 1}.`,
    });
  };

  const resetForm = () => {
    setExamForm({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      duration_minutes: '',
      exam_type: 'practice',
      shuffle_questions: false,
      max_attempts: 1,
      questions: '',
      course_id: undefined,
    });
  };

  const handleNewExam = () => {
    resetForm();
    setEditingExam(null);
    setActiveTab("create-exam");
  };

  const handleExportData = async (examId) => {
    try {
      const response = await api.get(`/exams/${examId}/export`);
      toast.success("Data exported successfully!", {
        description: "The exam data has been downloaded to your device.",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      if (error.response?.status === 401) {
        toast.error("Session Expired", {
          description: "Please log in again.",
        });
        logout();
        return;
      }
      toast.error("Export failed", {
        description: "Unable to export the exam data. Please try again.",
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: {
        icon: CheckCircle2,
        className: "bg-green-100 text-green-800 border-green-200",
        label: "Completed"
      },
      active: {
        icon: PlayCircle,
        className: "bg-blue-100 text-blue-800 border-blue-200",
        label: "On-Going"
      },
      scheduled: {
        icon: Calendar,
        className: "bg-purple-100 text-purple-800 border-purple-200",
        label: "Assigned" // Changed from "Scheduled" to "Assigned" for clarity
      },
      draft: {
        icon: Edit,
        className: "bg-gray-100 text-gray-800 border-gray-200",
        label: "Draft"
      }
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };


  const getStatusDescription = (status) => {
    switch (status) {
      case 'draft':
        return 'Exam is being prepared. Add questions and enroll students to complete setup.';
      case 'scheduled':
        return 'Exam is scheduled and ready. Can be edited before start time.';
      case 'active':
        return 'Exam is currently in progress. Students are taking the exam.';
      case 'completed':
        return 'Exam has ended. Results are available for review.';
      default:
        return '';
    }
  };

  // Enhanced formatDate function to handle the API date format
  const formatDate = (dateString) => {
    if (!dateString) return '-';

    try {
      // Handle the API date format "2025-08-23T15:51:00"
      const date = new Date(dateString);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }

      const dateOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };

      const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // Use 24-hour format to match your API data
      };

      return date.toLocaleDateString('en-US', dateOptions) + ' ' +
        date.toLocaleTimeString('en-US', timeOptions);
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid Date';
    }
  };

  // Alternative: More detailed format showing duration as well
  const formatScheduleDetails = (exam) => {
    const startDate = formatDate(exam.start_time);
    const endDate = formatDate(exam.end_time);
    const duration = exam.duration_minutes;

    return {
      start: startDate,
      end: endDate,
      duration: `${duration} min${duration !== 1 ? 's' : ''}`
    };
  };

  // NEW: Helper function to accurately calculate question distribution
  const calculateDistributedCounts = (total, distribution) => {
    if (!total || !distribution) {
      return { easy: 0, medium: 0, hard: 0 };
    }

    const counts = {
      easy: (total * distribution.easy) / 100,
      medium: (total * distribution.medium) / 100,
      hard: (total * distribution.hard) / 100,
    };

    const roundedCounts = {
      easy: Math.floor(counts.easy),
      medium: Math.floor(counts.medium),
      hard: Math.floor(counts.hard),
    };

    let remainder = total - (roundedCounts.easy + roundedCounts.medium + roundedCounts.hard);

    const fractionalParts = [
      { key: 'easy', value: counts.easy - roundedCounts.easy },
      { key: 'medium', value: counts.medium - roundedCounts.medium },
      { key: 'hard', value: counts.hard - roundedCounts.hard },
    ];

    // Distribute remainder to categories with the largest fractional parts
    fractionalParts.sort((a, b) => b.value - a.value);

    for (let i = 0; i < remainder; i++) {
      roundedCounts[fractionalParts[i].key]++;
    }

    return roundedCounts;
  };

  // Get paginated questions
  const getPaginatedQuestions = () => {
    const filtered = getFilteredQuestions();
    const startIndex = (currentQuestionPage - 1) * questionsPerPage;
    const endIndex = startIndex + questionsPerPage;
    return filtered.slice(startIndex, endIndex);
  };
  // Add these state variables after your existing pagination state
  const [currentMcqPage, setCurrentMcqPage] = useState(1);
  const [mcqsPerPage, setMcqsPerPage] = useState(25);

  // Add this helper function for MCQ pagination
  const getPaginatedMcqs = () => {
    const filtered = getFilteredMcqs();
    const startIndex = (currentMcqPage - 1) * mcqsPerPage;
    const endIndex = startIndex + mcqsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // FIXED: Handle complete question assignment update with randomized order
  const handleUpdateAssignedQuestions = async (examId, newQuestionIds) => {
    setAssigningQuestions(true);
    try {
      const exam = exams.find(e => e.id === examId);

      // Check if modifications are allowed based on exam status
      if (exam.status === 'active' || exam.status === 'completed') {
        toast.error("Cannot modify questions", {
          description: `Cannot modify questions in ${exam.status} exams.`,
        });
        return;
      }

      console.log('Starting question assignment update for exam:', examId);
      console.log('New question IDs:', newQuestionIds);

      // STEP 1: Clear ALL existing questions for this exam first
      const currentAssignedQuestions = examQuestions[examId] || [];
      console.log('Current assigned questions:', currentAssignedQuestions.length);

      if (currentAssignedQuestions.length > 0) {
        console.log('Removing all existing questions...');
        const removePromises = currentAssignedQuestions.map(examQuestion =>
          api.delete(`/exam-questions/${examQuestion.id}`)
        );
        await Promise.all(removePromises);
        console.log('All existing questions removed');
      }

      // STEP 2: Add new questions with randomized order
      if (newQuestionIds.length > 0) {
        console.log('Adding new questions with randomized order...');

        // Shuffle the question IDs to randomize order
        const shuffledQuestionIds = shuffleArray(newQuestionIds);
        console.log('Shuffled question order:', shuffledQuestionIds);

        // Assign questions with sequential order numbers (0, 1, 2, ...) but shuffled arrangement
        const addPromises = shuffledQuestionIds.map((questionId, index) => {
          console.log(`Assigning question ${questionId} with order ${index}`);
          return api.post('/exam-questions/', {
            question_order: index, // Sequential order after shuffling
            points: 1,
            extra_data: {},
            exam_id: examId,
            question_id: questionId
          });
        });

        await Promise.all(addPromises);
        console.log('All new questions added successfully');
      }

      // STEP 3: Refresh exam questions
      await fetchExamQuestions(examId);

      // STEP 4: If exam is scheduled, reassign questions to all students
      if (exam.status === 'scheduled') {
        toast.info("Reassigning questions", {
          description: "Reassigning questions to all enrolled students...",
        });
        await reassignQuestionsToAllStudents(examId);
      }

      if (newQuestionIds.length > 0) {
        toast.success("Questions updated successfully!", {
          description: `${newQuestionIds.length} questions assigned with randomized order.`,
        });
      } else {
        toast.info("All questions removed", {
          description: "No questions are currently assigned to this exam.",
        });
      }

      setQuestionDialogOpen(false);

    } catch (error) {
      console.error('Error updating assigned questions:', error);

      if (error.response?.status === 401) {
        logout();
        return;
      }

      // Handle constraint violation errors specifically
      if (error.response?.status === 500 && error.response?.data?.detail?.includes('UniqueViolation')) {
        toast.error("Database conflict detected", {
          description: "Please refresh the page and try again. There may be conflicting question assignments.",
        });
      } else {
        toast.error("Failed to update questions", {
          description: error.response?.data?.detail || "An error occurred while updating the assigned questions.",
        });
      }
    } finally {
      setAssigningQuestions(false);
    }
  };

  // NEW: Handle MCQ assignment update with randomized order
  const handleUpdateAssignedMcqs = async (examId, newMcqIds) => {
    setAssigningQuestions(true);
    try {
      const exam = exams.find(e => e.id === examId);

      // Check if modifications are allowed based on exam status
      if (exam.status === 'active' || exam.status === 'completed') {
        toast.error("Cannot modify MCQs", {
          description: `Cannot modify MCQs in ${exam.status} exams.`,
        });
        return;
      }

      console.log('Starting MCQ assignment update for exam:', examId);
      console.log('New MCQ IDs:', newMcqIds);

      // STEP 1: Clear ALL existing MCQs for this exam first
      const currentAssignedMcqs = examMcqs[examId] || [];
      console.log('Current assigned MCQs:', currentAssignedMcqs.length);

      if (currentAssignedMcqs.length > 0) {
        console.log('Removing all existing MCQs...');
        const removePromises = currentAssignedMcqs.map(examMcq =>
          api.delete(`/exam-mcqs/${examMcq.id}`)
        );
        await Promise.all(removePromises);
        console.log('All existing MCQs removed');
      }

      // STEP 2: Add new MCQs with randomized order
      if (newMcqIds.length > 0) {
        console.log('Adding new MCQs with randomized order...');

        // Shuffle the MCQ IDs to randomize order
        const shuffledMcqIds = shuffleArray(newMcqIds);
        console.log('Shuffled MCQ order:', shuffledMcqIds);

        // Assign MCQs with sequential order numbers (0, 1, 2, ...) but shuffled arrangement
        const addPromises = shuffledMcqIds.map((mcqId, index) => {
          console.log(`Assigning MCQ ${mcqId} with order ${index}`);
          return api.post('/exam-mcqs/', {
            question_order: index, // Sequential order after shuffling
            points: 1,
            extra_data: {},
            exam_id: examId,
            mcq_id: mcqId // Note: mcq_id instead of question_id
          });
        });

        await Promise.all(addPromises);
        console.log('All new MCQs added successfully');
      }

      // STEP 3: Refresh exam MCQs
      await fetchExamMcqs(examId);

      if (newMcqIds.length > 0) {
        toast.success("MCQs updated successfully!", {
          description: `${newMcqIds.length} MCQs assigned with randomized order.`,
        });
      } else {
        toast.info("All MCQs removed", {
          description: "No MCQs are currently assigned to this exam.",
        });
      }

      setQuestionDialogOpen(false);

    } catch (error) {
      console.error('Error updating assigned MCQs:', error);

      if (error.response?.status === 401) {
        logout();
        return;
      }

      // Handle constraint violation errors specifically
      if (error.response?.status === 500 && error.response?.data?.detail?.includes('UniqueViolation')) {
        toast.error("Database conflict detected", {
          description: "Please refresh the page and try again. There may be conflicting MCQ assignments.",
        });
      } else {
        toast.error("Failed to update MCQs", {
          description: error.response?.data?.detail || "An error occurred while updating the assigned MCQs.",
        });
      }
    } finally {
      setAssigningQuestions(false);
    }
  };


  // Fetch all available MCQs
  const fetchMcqs = async () => {
    setLoadingMcqs(true);
    try {
      const response = await api.get('/mcqs/?skip=0&limit=5000');
      setMcqs(response.data);
    } catch (error) {
      console.error('Error fetching MCQs:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      toast.error("Failed to fetch MCQs", {
        description: "Unable to load available MCQs.",
      });
    } finally {
      setLoadingMcqs(false);
    }
  };

  // Fetch exam-specific MCQs
  const fetchExamMcqs = async (examId) => {
    try {
      console.log('Fetching MCQs for exam:', examId); // Debug log
      const response = await api.get('/exam-mcqs/?skip=0&limit=100');
      console.log('All exam-mcqs response:', response.data); // Debug log
      const examSpecificMcqs = response.data.filter(em => em.exam_id === examId);
      console.log('Filtered MCQs for this exam:', examSpecificMcqs); // Debug log
      setExamMcqs(prev => ({
        ...prev,
        [examId]: examSpecificMcqs
      }));
      return examSpecificMcqs;
    } catch (error) {
      console.error('Error fetching exam MCQs:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      toast.error("Failed to fetch exam MCQs", {
        description: "Unable to load assigned MCQs for this exam.",
      });
      return [];
    }
  };

  // Check if exam type supports MCQs
  const examSupportsMcqs = (examType) => {
    return examType === 'quiz'; // Only quiz supports MCQs
  };

  // Add a function to check if exam type supports coding questions
  const examSupportsCoding = (examType) => {
    return ['practice', 'midterm', 'final'].includes(examType);
  };


  // Get filtered MCQs
  const getFilteredMcqs = () => {
    let filtered = mcqs;

    if (mcqSearchTerm.trim()) {
      filtered = filtered.filter(mcq =>
        (mcq.title || '').toLowerCase().includes(mcqSearchTerm.toLowerCase()) ||
        (mcq.description || '').toLowerCase().includes(mcqSearchTerm.toLowerCase()) ||
        (mcq.question_text || '').toLowerCase().includes(mcqSearchTerm.toLowerCase())
      );
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(mcq => mcq.difficulty === difficultyFilter);
    }

    return filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  };

  // Get MCQ assignment status for an exam
  const getMcqAssignmentStatus = (exam) => {
    const assignedMcqs = examMcqs[exam.id] || [];
    return {
      count: assignedMcqs.length,
      isAssigned: assignedMcqs.length > 0
    };
  };


  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render the dashboard if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teacher Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back, {user?.name || user?.email || 'Teacher'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7"> {/* Changed from grid-cols-6 to grid-cols-7 */}
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="exams" className="gap-2">
              <BookOpen className="h-4 w-4" />
              All Exams ({exams.length})
            </TabsTrigger>
            <TabsTrigger value="create-exam" className="gap-2">
              <Plus className="h-4 w-4" />
              {editingExam ? 'Edit Exam' : 'Create Exam'}
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-2">
              <BookOpenCheck className="h-4 w-4" />
              Questions
            </TabsTrigger>
            <TabsTrigger value="activities" className="gap-2"> {/* Add this new tab */}
              <FileText className="h-4 w-4" />
              Activity Sheets
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2">
              <CircleCheckBig className="h-4 w-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Exams Tab */}
          <TabsContent value="results"><ExamManagementPage /></TabsContent>

          {/*Teacher Workspace */}
          <TabsContent value="dashboard"><TeacherWorkspace /></TabsContent>

          {/* Activity Sheets Tab */}
          <TabsContent value="activities"><ActivitySheets /></TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard_backup" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Draft Exams</CardTitle>
                  <Edit className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {exams.filter(exam => exam.status === 'draft').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Need setup completion</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">On-Going Exams</CardTitle>
                  <PlayCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {exams.filter(exam => exam.status === 'active').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Currently in progress</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Exams</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {exams.filter(exam => exam.status === 'completed').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Results available</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{exams.length}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between border-b pb-2">
                        <p className="text-sm">{activity.action}</p>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full gap-2" onClick={handleNewExam}>
                    <Plus className="h-4 w-4" />
                    Create New Exam
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => toast.info("Export feature", { description: "This feature will be available soon!" })}
                  >
                    <Download className="h-4 w-4" />
                    Export Results
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={fetchExams}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Exams
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Enhanced Create/Edit Exam Tab */}
          <TabsContent value="create-exam">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-xl">
                  {editingExam ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {editingExam ? 'Edit Exam' : 'Create a New Exam'}
                </CardTitle>
                <CardDescription className="text-base">
                  {editingExam
                    ? `Modify the details for "${editingExam.title}"`
                    : 'Set up a new examination for your students with detailed configuration'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                {editingExam && (
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Editing Mode - {editingExam.status}</span>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                      You are editing exam ID: {editingExam.id} (Edit #{(examEditCounts[editingExam.id] || 0) + 1})
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setEditingExam(null);
                        resetForm();
                        toast.info("Edit cancelled", { description: "Returned to create mode." });
                      }}
                    >
                      Cancel Edit
                    </Button>
                  </div>
                )}

                {/* SINGLE FORM - Remove the duplicate */}
                <form onSubmit={handleCreateExam} className="space-y-8">
                  {/* Basic Information Section */}
                  <div className="space-y-6">
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Basic Information</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Enter the basic details of your exam</p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Course Selection - FIXED */}
                      <div className="space-y-3 md:col-span-2">
                        <Label htmlFor="course-select" className="text-sm font-medium">Select Course *</Label>
                        <Select
                          value={examForm.course_id || undefined} // Use undefined instead of empty string
                          onValueChange={(value) => setExamForm(prev => ({ ...prev, course_id: value }))}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Choose a course for this exam" />
                          </SelectTrigger>
                          <SelectContent>
                            {courses.length > 0 ? (
                              courses
                                .filter(course => course.id && String(course.id).trim() !== '') // Filter invalid courses
                                .map((course) => (
                                  <SelectItem key={course.id} value={String(course.id)}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{course.course_code} - {course.course_name}</span>
                                      {course.description && (
                                        <span className="text-xs text-gray-500 truncate">{course.description}</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))
                            ) : (
                              <SelectItem value="placeholder-no-courses" disabled>No courses available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">Select the course this exam belongs to</p>
                      </div>

                      {/* Exam Title */}
                      <div className="space-y-3">
                        <Label htmlFor="exam-title" className="text-sm font-medium">Exam Title *</Label>
                        <Input
                          id="exam-title"
                          value={examForm.title}
                          onChange={(e) => setExamForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Data Structures Final Exam"
                          required
                          className="h-11"
                        />
                        <p className="text-xs text-gray-500">Give your exam a clear, descriptive title</p>
                      </div>

                      {/* Exam Type */}
                      <div className="space-y-3">
                        <Label htmlFor="exam-type" className="text-sm font-medium">Exam Type *</Label>
                        <Select
                          value={examForm.exam_type}
                          onValueChange={(value) => setExamForm(prev => ({ ...prev, exam_type: value }))}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select exam type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="practice">Practice</SelectItem>
                            <SelectItem value="quiz">Quiz</SelectItem>
                            <SelectItem value="midterm">Midterm</SelectItem>
                            <SelectItem value="final">Final</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">Choose the type that best describes your exam</p>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-3">
                      <Label htmlFor="exam-description" className="text-sm font-medium">Description</Label>
                      <Textarea
                        id="exam-description"
                        value={examForm.description}
                        onChange={(e) => setExamForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description of the exam content, topics covered, and any special instructions..."
                        rows={4}
                        className="resize-none"
                      />
                      <p className="text-xs text-gray-500">Provide additional context about this exam</p>
                    </div>
                  </div>

                  {/* Schedule Section */}
                  <div className="space-y-6">
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Schedule & Duration</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Set when the exam will be available and how long it will last</p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="space-y-3">
                        <Label htmlFor="start-time" className="text-sm font-medium">Start Time *</Label>
                        <Input
                          id="start-time"
                          type="datetime-local"
                          value={examForm.start_time}
                          onChange={(e) => setExamForm(prev => ({ ...prev, start_time: e.target.value }))}
                          required
                          className="h-11"
                        />
                        <p className="text-xs text-gray-500">When students can start taking the exam</p>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="end-time" className="text-sm font-medium">End Time *</Label>
                        <Input
                          id="end-time"
                          type="datetime-local"
                          value={examForm.end_time}
                          onChange={(e) => setExamForm(prev => ({ ...prev, end_time: e.target.value }))}
                          required
                          className="h-11"
                        />
                        <p className="text-xs text-gray-500">When the exam period closes</p>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="exam-duration" className="text-sm font-medium">Duration (minutes) *</Label>
                        <Input
                          id="exam-duration"
                          type="number"
                          min="1"
                          value={examForm.duration_minutes}
                          onChange={(e) => setExamForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
                          placeholder="120"
                          required
                          className="h-11"
                        />
                        <p className="text-xs text-gray-500">Maximum time allowed per attempt</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6 border-t">
                    <Button
                      type="submit"
                      disabled={isCreating}
                      className="gap-2 px-8 py-3 text-base"
                      size="lg"
                    >
                      {isCreating ? (
                        <>
                          <Clock className="h-5 w-5 animate-spin" />
                          {editingExam ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        <>
                          {editingExam ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                          {editingExam ? 'Update Exam' : 'Create Exam'}
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetForm();
                        toast.info("Form reset", { description: "All fields have been cleared." });
                      }}
                      className="px-8 py-3 text-base"
                      size="lg"
                    >
                      Reset Form
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced All Exams Tab */}
          <TabsContent value="exams" className="space-y-6">
            <div className="flex items-center gap-4 mb-4 p-4 bg-white rounded-lg border">
              <Label htmlFor="course-filter" className="text-sm font-medium">Filter by Course:</Label>
              <Select
                value={selectedCourseFilter}
                onValueChange={setSelectedCourseFilter}
              >
                <SelectTrigger className="w-80">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.course_code} - {course.course_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-500">
                ({filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''})
              </span>
            </div>
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-t-lg">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">All Exams</CardTitle>
                    <CardDescription className="text-base">
                      Manage your examinations and track their progress
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchExams}
                    disabled={loadingExams}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingExams ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingExams ? (
                  <div className="flex items-center justify-center py-16">
                    <Clock className="h-8 w-8 animate-spin mr-3" />
                    <span className="text-lg">Loading exams...</span>
                  </div>
                ) : exams.length === 0 ? (
                  <div className="text-center py-16 px-8">
                    <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-6" />
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">No exams yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                      Create your first exam to get started with online assessments for your students.
                    </p>
                    <Button onClick={handleNewExam} className="gap-2" size="lg">
                      <Plus className="h-5 w-5" />
                      Create Your First Exam
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50 dark:bg-gray-800">
                        <TableRow>
                          <TableHead className="font-semibold">Exam Details</TableHead>
                          <TableHead className="font-semibold">Schedule</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold text-center">Questions</TableHead>
                          <TableHead className="font-semibold text-center">Students</TableHead>
                          <TableHead className="font-semibold">Created</TableHead>
                          <TableHead className="font-semibold text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExams.map((exam) => {
                          const questionStatus = getQuestionAssignmentStatus(exam);
                          const enrollmentStatus = getStudentEnrollmentStatus(exam);
                          const editCount = examEditCounts[exam.id] || 0;
                          return (
                            <TableRow key={exam.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <TableCell className="py-4">
                                <div className="space-y-1">
                                  <div className="font-semibold text-base">{exam.title}</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400 capitalize flex items-center gap-2">
                                    <BookOpen className="h-3 w-3" />
                                    {exam.exam_type} • {exam.duration_minutes}min
                                    {exam.max_attempts > 1 && ` • ${exam.max_attempts} attempts`}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-500 line-clamp-1">
                                    {exam.description || 'No description provided'}
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">
                                    <span className="font-medium">Course:</span> {getCourseInfo(exam.course_id)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="space-y-1 text-sm">
                                  {/* Start Time */}
                                  <div className="flex items-center gap-1 text-green-600">
                                    <Calendar className="h-3 w-3" />
                                    <span className="font-medium">Start:</span>
                                    {formatDate(exam.start_time)}
                                  </div>

                                  {/* End Time */}
                                  <div className="flex items-center gap-1 text-red-600">
                                    <Clock className="h-3 w-3" />
                                    <span className="font-medium">End:</span>
                                    {formatDate(exam.end_time)}
                                  </div>

                                  {/* Duration */}
                                  <div className="flex items-center gap-1 text-blue-600">
                                    <Clock className="h-3 w-3" />
                                    <span className="font-medium">Duration:</span>
                                    {exam.duration_minutes} mins
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="space-y-2">
                                  {getStatusBadge(exam.status)}
                                  {getStatusButton(exam)}
                                </div>
                              </TableCell>
                              <TableCell className="py-4 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <Badge variant={questionStatus.isAssigned ? "default" : "secondary"}>
                                    {questionStatus.count}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <Badge variant={enrollmentStatus.isEnrolled ? "default" : "secondary"}>
                                    {enrollmentStatus.count}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 text-sm text-muted-foreground">
                                {new Date(exam.created_at).toLocaleDateString()}
                                {editCount > 0 && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    Edited {editCount}x
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center justify-center gap-1">
                                  {/* View Student Assignments - First for scheduled, active, completed */}
                                  {(exam.status === 'scheduled' || exam.status === 'active' || exam.status === 'completed') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewStudentAssignments(exam)}
                                      className="h-9 w-9 p-0"
                                      title="View Student Assignments"
                                    >
                                      <ListChecks className="h-4 w-4 text-indigo-600" />
                                    </Button>
                                  )}

                                  {/* Enroll Students - Always second */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEnrollmentDialog(exam)}
                                    className="h-9 w-9 p-0"
                                    title="Enroll Students"
                                  >
                                    <UserPlus className={`h-4 w-4 ${enrollmentStatus.isEnrolled ? 'text-green-600' : 'text-gray-400'}`} />
                                  </Button>

                                  {/* Assign Questions - Always third */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenQuestionDialog(exam)}
                                    className="h-9 w-9 p-0"
                                    title="Assign Questions"
                                  >
                                    <FileQuestion className={`h-4 w-4 ${questionStatus.isAssigned ? 'text-green-600' : 'text-gray-400'}`} />
                                  </Button>

                                  {/* Edit Exam - Fourth, for draft and scheduled exams only */}
                                  {(exam.status === 'draft' || exam.status === 'scheduled') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditExam(exam)}
                                      className="h-9 w-9 p-0 relative"
                                      title={`Edit Exam (Edited ${editCount} times)`}
                                    >
                                      <Edit className="h-4 w-4 text-blue-600" />
                                      {editCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold leading-none">
                                          {editCount}
                                        </span>
                                      )}
                                    </Button>
                                  )}

                                  {/* View Results - Only for completed exams */}
                                  {exam.status === 'completed' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewResults(exam.id)}
                                      className="h-9 w-9 p-0"
                                      title="View Results"
                                    >
                                      <Eye className="h-4 w-4 text-purple-600" />
                                    </Button>
                                  )}

                                  {/* Delete Exam - Last, for draft and scheduled exams only */}
                                  {(exam.status === 'draft' || exam.status === 'scheduled') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeleteExamId(exam.id)}
                                      className="h-9 w-9 p-0"
                                      title="Delete Exam"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsPage />
          </TabsContent>
          <TabsContent value="questions">
            <QuestionsManagement />
          </TabsContent>
        </Tabs>

        {/* ENHANCED Question Assignment Dialog */}
        <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
          <DialogContent
            className="max-h-[95vh] flex flex-col"
            style={{
              width: '95vw',
              maxWidth: '95vw',
              minWidth: '95vw'
            }}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5" />
                Assign Questions to "{currentExamForQuestions?.title}"
              </DialogTitle>
              <DialogDescription>
                {checkConfigurationLock(currentExamForQuestions) ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-amber-600 font-medium">
                      Configuration Locked: This exam uses strict assignment rules.
                    </span>
                    <span className="text-sm">
                      {getConfigurationSummary(currentExamForQuestions)}
                    </span>
                  </div>
                ) : (
                  <span>
                    Select questions to assign to this exam. {examSupportsMcqs(currentExamForQuestions?.exam_type) ? 'You can assign either coding questions or MCQs, but not both.' : 'Only coding questions are supported for this exam type.'}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {/* Question Type Filter - Only show if exam supports both types */}
            {currentExamForQuestions?.exam_type !== 'quiz' && currentExamForQuestions?.exam_type !== 'practice' && currentExamForQuestions?.exam_type !== 'midterm' && currentExamForQuestions?.exam_type !== 'final' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 mb-4">
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium">Question Type:</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={questionTypeFilter === 'coding' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setQuestionTypeFilter('coding')}
                    >
                      Coding Questions
                    </Button>
                    <Button
                      variant={questionTypeFilter === 'mcq' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setQuestionTypeFilter('mcq')}
                    >
                      MCQ Questions
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Show restricted message for specific exam types */}
            {currentExamForQuestions?.exam_type === 'quiz' && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700 mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-100">
                    Quiz exams only support MCQ questions
                  </span>
                </div>
              </div>
            )}

            {/* Add this after the existing exam type warning messages in the question dialog */}
            {currentExamForQuestions?.exam_type === 'practice' && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 mb-4">
                <div className="flex items-center gap-2">
                  <BookOpenCheck className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-100">
                    Practice exams show only questions with solutions available
                  </span>
                </div>
              </div>
            )}

            {(['practice', 'midterm', 'final'].includes(currentExamForQuestions?.exam_type)) && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 mb-4">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-100">
                    {currentExamForQuestions?.exam_type?.charAt(0)?.toUpperCase() + currentExamForQuestions?.exam_type?.slice(1)} exams only support coding questions
                  </span>
                </div>
              </div>
            )}

            {/* Questions Per Student Input */}
            {questionTypeFilter === 'coding' && (
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 mb-3">
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="questions-per-student" className="text-sm font-medium">
                      Questions Per Student *
                    </Label>
                    <Input
                      id="questions-per-student"
                      type="number"
                      min="1"
                      max="50"
                      value={questionsPerStudent}
                      onChange={(e) => setQuestionsPerStudent(parseInt(e.target.value) || 1)}
                      className="w-24"
                      disabled={true} // Always disabled since auto-select determines this
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Auto-Select Mode:</strong> The number of questions per student is automatically determined by your selection criteria. Each student will receive questions according to the distribution you specify.
                    </p>
                  </div>
                </div>
              </div>
            )}


            {questionTypeFilter === 'mcq' && (
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 mb-3">
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="mcqs-per-student" className="text-sm font-medium">
                      MCQs Per Student *
                    </Label>
                    <Input
                      id="mcqs-per-student"
                      type="number"
                      min="1"
                      max="50"
                      value={mcqsPerStudent}
                      onChange={(e) => setMcqsPerStudent(parseInt(e.target.value) || 1)}
                      className="w-24"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      When this exam is set to <strong>Scheduled</strong>, each enrolled student will automatically receive <strong>{mcqsPerStudent}</strong> random MCQs from the assigned MCQ pool.
                    </p>
                  </div>
                </div>
              </div>
            )}


            {/* Main Content: Split pane with Question List (left) and Selected (right) */}
            <div className="flex flex-1 gap-6 overflow-hidden" style={{ height: 'calc(95vh - 280px)' }}>
              {/* Left pane with search, filters and question table */}
              <div className="flex flex-col flex-[0.65] border rounded-lg overflow-hidden">
                {/* Header with search and filters */}
                <div className="p-4 border-b bg-gray-50 dark:bg-gray-800">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Input */}
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by title or description..."
                        value={questionTypeFilter === 'coding' ? questionSearchTerm : mcqSearchTerm}
                        onChange={(e) => {
                          if (questionTypeFilter === 'coding') {
                            setQuestionSearchTerm(e.target.value);
                          } else {
                            setMcqSearchTerm(e.target.value);
                          }
                        }}
                        className="pl-10"
                      />
                    </div>

                    {/* Difficulty Select */}
                    <div className="w-36">
                      <Select
                        value={difficultyFilter}
                        onValueChange={setDifficultyFilter}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Difficulty</SelectItem>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/*CATEGORY FILTER */}
                    <div className="w-48">
                      <Select
                        value={categoryFilter}
                        onValueChange={setCategoryFilter}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Bulk Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setAutoSelectDialogOpen(true)}
                        className="gap-2 bg-purple-600 hover:bg-purple-700"
                      >
                        <Settings className="h-4 w-4" />
                        Auto-Select
                      </Button>

                      {/* NEW: Smart Assign Button - Only show if questions are selected */}
                      {(questionTypeFilter === 'coding' ? selectedQuestions.size > 0 : selectedMcqs.size > 0) && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setSmartAssignDialogOpen(true)}
                          className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Smart Assign from Pool ({questionTypeFilter === 'coding' ? selectedQuestions.size : selectedMcqs.size})
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (questionTypeFilter === 'coding') {
                            setSelectedQuestions(new Set(getPaginatedQuestions().map(q => q.id)));
                          } else {
                            setSelectedMcqs(new Set(getFilteredMcqs().map(m => m.id)));
                          }
                        }}
                        disabled={(questionTypeFilter === 'coding' ? loadingQuestions : loadingMcqs) ||
                          (questionTypeFilter === 'coding' ? getFilteredQuestions().length === 0 : getFilteredMcqs().length === 0)}
                      >
                        Select All {questionTypeFilter === 'coding' ? 'Questions' : 'MCQs'}
                      </Button>
                    </div>

                  </div>

                  {/* Stats Row */}
                  <div className="flex justify-between items-center mt-3 text-sm text-muted-foreground">
                    <span>
                      Showing {questionTypeFilter === 'coding'
                        ? `${Math.min((currentQuestionPage - 1) * questionsPerPage + 1, getFilteredQuestions().length)}-${Math.min(currentQuestionPage * questionsPerPage, getFilteredQuestions().length)} of ${getFilteredQuestions().length} questions`
                        : `1-${getFilteredMcqs().length} of ${getFilteredMcqs().length} MCQs`
                      }
                    </span>
                    <span>
                      Currently assigned: {questionTypeFilter === 'coding'
                        ? (examQuestions[currentExamForQuestions?.id]?.length || 0)
                        : (examMcqs[currentExamForQuestions?.id]?.length || 0)
                      }
                    </span>
                  </div>
                </div>

                {/* Question Table - Show based on filter */}
                <div className="flex-1 overflow-auto">
                  {(questionTypeFilter === 'coding' ? loadingQuestions : loadingMcqs) ? (
                    <div className="flex items-center justify-center py-12">
                      <Clock className="h-6 w-6 animate-spin mr-2" />
                      <span>Loading {questionTypeFilter === 'coding' ? 'questions' : 'MCQs'}...</span>
                    </div>
                  ) : (questionTypeFilter === 'coding' ? questions : mcqs).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No {questionTypeFilter === 'coding' ? 'Questions' : 'MCQs'} Available</h3>
                      <p className="text-sm">Create some {questionTypeFilter === 'coding' ? 'questions' : 'MCQs'} first to assign them to exams.</p>
                    </div>
                  ) : (questionTypeFilter === 'coding' ? getFilteredQuestions() : getFilteredMcqs()).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No Matching {questionTypeFilter === 'coding' ? 'Questions' : 'MCQs'}</h3>
                      <p className="text-sm">Try adjusting your search term or filters.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={(questionTypeFilter === 'coding' ? getPaginatedQuestions() : getFilteredMcqs()).length > 0 &&
                                (questionTypeFilter === 'coding' ? getPaginatedQuestions() : getFilteredMcqs()).every(item =>
                                  (questionTypeFilter === 'coding' ? selectedQuestions : selectedMcqs).has(item.id))}
                              onCheckedChange={(checked) => {
                                const items = questionTypeFilter === 'coding' ? getPaginatedQuestions() : getFilteredMcqs();
                                const currentSet = questionTypeFilter === 'coding' ? selectedQuestions : selectedMcqs;
                                const setterFn = questionTypeFilter === 'coding' ? setSelectedQuestions : setSelectedMcqs;

                                if (checked) {
                                  setterFn(prev => new Set([...prev, ...items.map(item => item.id)]));
                                } else {
                                  setterFn(prev => {
                                    const newSet = new Set(prev);
                                    items.forEach(item => newSet.delete(item.id));
                                    return newSet;
                                  });
                                }
                              }}
                              aria-label={`Select all visible ${questionTypeFilter === 'coding' ? 'questions' : 'MCQs'}`}
                            />
                          </TableHead>
                          <TableHead className="min-w-[250px]">Title</TableHead>
                          <TableHead className="w-28">Difficulty</TableHead>
                          <TableHead className="w-24 text-center">{questionTypeFilter === 'coding' ? 'Score' : 'Score'}</TableHead>
                          {questionTypeFilter === 'mcq' && <TableHead className="w-20 text-center">Options</TableHead>}
                          <TableHead className="w-16 text-center">Preview</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(questionTypeFilter === 'coding' ? getPaginatedQuestions() : getPaginatedMcqs()).map(item => {
                          const isSelected = (questionTypeFilter === 'coding' ? selectedQuestions : selectedMcqs).has(item.id);
                          return (
                            <TableRow
                              key={item.id}
                              className={`hover:bg-muted/50 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    const setterFn = questionTypeFilter === 'coding' ? setSelectedQuestions : setSelectedMcqs;
                                    setterFn(prev => {
                                      const newSet = new Set(prev);
                                      if (checked) {
                                        newSet.add(item.id);
                                      } else {
                                        newSet.delete(item.id);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  aria-label={`Select ${questionTypeFilter} ${item.title || 'Untitled'}`}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-semibold text-sm line-clamp-1">
                                    {item.title || 'Untitled'}
                                  </div>
                                  {(item.description || item.question_text) && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {item.description || item.question_text}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getDifficultyBadge(item.difficulty)}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {item.max_score || 0}
                              </TableCell>
                              {questionTypeFilter === 'mcq' && (
                                <TableCell className="text-center text-sm">
                                  <Badge variant="secondary">{item.options?.length || 0}</Badge>
                                </TableCell>
                              )}
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    if (questionTypeFilter === 'coding') {
                                      setPreviewQuestion(item);
                                      setPreviewDialogOpen(true);
                                    } else {
                                      setPreviewMcq(item);
                                      setMcqPreviewDialogOpen(true);
                                    }
                                  }}
                                  title={`Preview ${questionTypeFilter}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>


                {/* Pagination Controls - Conditional based on question type */}
                {questionTypeFilter === 'coding' && getFilteredQuestions().length > questionsPerPage && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentQuestionPage === 1}
                      onClick={() => setCurrentQuestionPage(currentQuestionPage - 1)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Page {currentQuestionPage} of {Math.ceil(getFilteredQuestions().length / questionsPerPage)}
                      </span>
                      <Select
                        value={questionsPerPage.toString()}
                        onValueChange={(value) => {
                          setQuestionsPerPage(parseInt(value));
                          setCurrentQuestionPage(1);
                        }}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentQuestionPage >= Math.ceil(getFilteredQuestions().length / questionsPerPage)}
                      onClick={() => setCurrentQuestionPage(currentQuestionPage + 1)}
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}

                {questionTypeFilter === 'mcq' && getFilteredMcqs().length > mcqsPerPage && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentMcqPage === 1}
                      onClick={() => setCurrentMcqPage(currentMcqPage - 1)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Page {currentMcqPage} of {Math.ceil(getFilteredMcqs().length / mcqsPerPage)}
                      </span>
                      <Select
                        value={mcqsPerPage.toString()}
                        onValueChange={(value) => {
                          setMcqsPerPage(parseInt(value));
                          setCurrentMcqPage(1);
                        }}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentMcqPage >= Math.ceil(getFilteredMcqs().length / mcqsPerPage)}
                      onClick={() => setCurrentMcqPage(currentMcqPage + 1)}
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Right pane with selected questions as chips - FIXED FOR BOTH MCQ AND CODING */}
              <div className="flex flex-col flex-[0.35] border rounded-lg overflow-hidden">
                {/* Fixed header */}
                <div className="p-4 border-b bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium">
                      Selected {questionTypeFilter === 'coding' ? 'Questions' : 'MCQs'} (
                      {questionTypeFilter === 'coding' ? selectedQuestions.size : selectedMcqs.size})
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (questionTypeFilter === 'coding') {
                          setSelectedQuestions(new Set());
                        } else {
                          setSelectedMcqs(new Set());
                        }
                      }}
                      disabled={questionTypeFilter === 'coding' ? selectedQuestions.size === 0 : selectedMcqs.size === 0}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                {/* Scrollable content area */}
                <div className="flex-1 overflow-auto p-4">
                  {(questionTypeFilter === 'coding' ? selectedQuestions.size === 0 : selectedMcqs.size === 0) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileQuestion className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No {questionTypeFilter === 'coding' ? 'questions' : 'MCQs'} selected</p>
                      <p className="text-xs">Select {questionTypeFilter === 'coding' ? 'questions' : 'MCQs'} from the left panel</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Array.from(questionTypeFilter === 'coding' ? selectedQuestions : selectedMcqs).map(id => {
                        // Find the item in the appropriate array
                        const item = questionTypeFilter === 'coding'
                          ? questions.find(q => q.id === id)
                          : mcqs.find(m => m.id === id);

                        if (!item) return null;

                        return (
                          <div
                            key={id}
                            className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium line-clamp-1">
                                {item.title || `Untitled ${questionTypeFilter === 'coding' ? 'Question' : 'MCQ'}`}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {getDifficultyBadge(item.difficulty)}
                                <span className="text-xs text-muted-foreground">
                                  {item.max_score || 0} pts
                                </span>
                                {questionTypeFilter === 'mcq' && (
                                  <span className="text-xs text-muted-foreground">
                                    {item.options?.length || 0} options
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 flex-shrink-0"
                              onClick={() => {
                                if (questionTypeFilter === 'coding') {
                                  setSelectedQuestions(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(id);
                                    return newSet;
                                  });
                                } else {
                                  setSelectedMcqs(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(id);
                                    return newSet;
                                  });
                                }
                              }}
                              title={`Remove ${questionTypeFilter === 'coding' ? 'question' : 'MCQ'}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer with action buttons */}
            <DialogFooter className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {(questionTypeFilter === 'coding' ? selectedQuestions.size > 0 : selectedMcqs.size > 0) ? (
                  <span>
                    {questionTypeFilter === 'coding' ? selectedQuestions.size : selectedMcqs.size} {questionTypeFilter === 'coding' ? 'question(s)' : 'MCQ(s)'} selected for assignment
                  </span>
                ) : (
                  <span>Select {questionTypeFilter === 'coding' ? 'questions' : 'MCQs'} to assign to this exam</span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setQuestionDialogOpen(false)}
                  disabled={assigningQuestions}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (currentExamForQuestions) {
                      // Handle different question types differently
                      if (questionTypeFilter === 'coding') {
                        // Update exam metadata first (only for coding questions)
                        const exam = exams.find(e => e.id === currentExamForQuestions.id);
                        const updatedExam = {
                          ...exam,
                          extra_data: {
                            ...exam.extra_data,
                            questions_per_student: questionsPerStudent
                          }
                        };

                        try {
                          await api.put(`/exams/${currentExamForQuestions.id}`, updatedExam);
                          setExams(prevExams => prevExams.map(exam =>
                            exam.id === currentExamForQuestions.id ? updatedExam : exam
                          ));
                        } catch (error) {
                          console.error('Error updating exam metadata:', error);
                        }

                        // Handle coding question assignment
                        const newQuestionIds = Array.from(selectedQuestions);
                        await handleUpdateAssignedQuestions(currentExamForQuestions.id, newQuestionIds);

                      } else if (questionTypeFilter === 'mcq') {
                        // Handle MCQ assignment
                        const newMcqIds = Array.from(selectedMcqs);
                        await handleUpdateAssignedMcqs(currentExamForQuestions.id, newMcqIds);
                      }
                    }
                  }}
                  disabled={assigningQuestions}
                  className="gap-2 min-w-[140px]"
                >
                  {assigningQuestions ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4" />
                      Update {questionTypeFilter === 'coding' ? 'Questions' : 'MCQs'} ({questionTypeFilter === 'coding' ? selectedQuestions.size : selectedMcqs.size})
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Smart Assign from Pool Dialog */}
        <Dialog open={smartAssignDialogOpen} onOpenChange={setSmartAssignDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                Smart Assign from Selected Pool
              </DialogTitle>
              <DialogDescription>
                Configure how to distribute your {questionTypeFilter === 'coding' ? selectedQuestions.size : selectedMcqs.size} selected {questionTypeFilter === 'coding' ? 'questions' : 'MCQs'} among students based on difficulty and categories.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto space-y-6 p-1">
              {/* Assignment Mode */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Assignment Mode</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${smartAssignConfig.mode === 'simple'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                    onClick={() => setSmartAssignConfig(prev => ({ ...prev, mode: 'simple' }))}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 ${smartAssignConfig.mode === 'simple' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                        {smartAssignConfig.mode === 'simple' && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                      <span className="font-medium">Simple Distribution</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set total questions with difficulty distribution (e.g., 2 easy, 2 medium, 1 hard)
                    </p>
                  </div>

                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${smartAssignConfig.mode === 'category'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                    onClick={() => setSmartAssignConfig(prev => ({ ...prev, mode: 'category' }))}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 ${smartAssignConfig.mode === 'category' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                        {smartAssignConfig.mode === 'category' && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                      <span className="font-medium">Category-Based</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set difficulty distribution per category (e.g., 1 easy DSA, 2 medium Algorithms)
                    </p>
                  </div>
                </div>
              </div>

              {/* Simple Mode Configuration */}
              {smartAssignConfig.mode === 'simple' && (
                <div className="space-y-4">
                  <Label className="text-sm font-semibold">Difficulty Distribution</Label>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Total Questions</Label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={smartAssignConfig.totalQuestions}
                        onChange={(e) => setSmartAssignConfig(prev => ({
                          ...prev,
                          totalQuestions: parseInt(e.target.value) || 1
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-green-600">Easy</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={smartAssignConfig.difficultyDistribution.easy}
                        onChange={(e) => setSmartAssignConfig(prev => ({
                          ...prev,
                          difficultyDistribution: {
                            ...prev.difficultyDistribution,
                            easy: parseInt(e.target.value) || 0
                          }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-yellow-600">Medium</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={smartAssignConfig.difficultyDistribution.medium}
                        onChange={(e) => setSmartAssignConfig(prev => ({
                          ...prev,
                          difficultyDistribution: {
                            ...prev.difficultyDistribution,
                            medium: parseInt(e.target.value) || 0
                          }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-red-600">Hard</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={smartAssignConfig.difficultyDistribution.hard}
                        onChange={(e) => setSmartAssignConfig(prev => ({
                          ...prev,
                          difficultyDistribution: {
                            ...prev.difficultyDistribution,
                            hard: parseInt(e.target.value) || 0
                          }
                        }))}
                      />
                    </div>
                  </div>

                  {/* Show validation */}
                  <div className="text-xs text-center">
                    <span className={`${(smartAssignConfig.difficultyDistribution.easy +
                      smartAssignConfig.difficultyDistribution.medium +
                      smartAssignConfig.difficultyDistribution.hard) === smartAssignConfig.totalQuestions
                      ? 'text-green-600'
                      : 'text-red-600'
                      }`}>
                      Total: {smartAssignConfig.difficultyDistribution.easy +
                        smartAssignConfig.difficultyDistribution.medium +
                        smartAssignConfig.difficultyDistribution.hard} / {smartAssignConfig.totalQuestions}
                    </span>
                  </div>
                </div>
              )}

              {/* Category Mode Configuration */}
              {smartAssignConfig.mode === 'category' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Category Configurations</Label>
                    <Select
                      value={undefined}
                      onValueChange={(categoryId) => {
                        if (categoryId && !Object.keys(smartAssignConfig.categoryConfigs).includes(categoryId)) {
                          setSmartAssignConfig(prev => ({
                            ...prev,
                            categoryConfigs: {
                              ...prev.categoryConfigs,
                              [categoryId]: { easy: 1, medium: 1, hard: 0 }
                            }
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Add category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          .filter(cat => !Object.keys(smartAssignConfig.categoryConfigs).includes(cat.id))
                          .map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(smartAssignConfig.categoryConfigs).map(([categoryId, config]) => {
                      const category = categories.find(c => c.id === categoryId);
                      return (
                        <div key={categoryId} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium">{category?.name}</h5>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSmartAssignConfig(prev => {
                                const newConfigs = { ...prev.categoryConfigs };
                                delete newConfigs[categoryId];
                                return { ...prev, categoryConfigs: newConfigs };
                              })}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-green-600">Easy</Label>
                              <Input
                                type="number"
                                min="0"
                                max="5"
                                value={config.easy}
                                onChange={(e) => setSmartAssignConfig(prev => ({
                                  ...prev,
                                  categoryConfigs: {
                                    ...prev.categoryConfigs,
                                    [categoryId]: {
                                      ...config,
                                      easy: parseInt(e.target.value) || 0
                                    }
                                  }
                                }))}
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-yellow-600">Medium</Label>
                              <Input
                                type="number"
                                min="0"
                                max="5"
                                value={config.medium}
                                onChange={(e) => setSmartAssignConfig(prev => ({
                                  ...prev,
                                  categoryConfigs: {
                                    ...prev.categoryConfigs,
                                    [categoryId]: {
                                      ...config,
                                      medium: parseInt(e.target.value) || 0
                                    }
                                  }
                                }))}
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-red-600">Hard</Label>
                              <Input
                                type="number"
                                min="0"
                                max="5"
                                value={config.hard}
                                onChange={(e) => setSmartAssignConfig(prev => ({
                                  ...prev,
                                  categoryConfigs: {
                                    ...prev.categoryConfigs,
                                    [categoryId]: {
                                      ...config,
                                      hard: parseInt(e.target.value) || 0
                                    }
                                  }
                                }))}
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Smart assign from pool of {questionTypeFilter === 'coding' ? selectedQuestions.size : selectedMcqs.size} selected {questionTypeFilter === 'coding' ? 'questions' : 'MCQs'}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSmartAssignDialogOpen(false)}
                  disabled={loadingAutoSelect}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSmartAssignFromPool}
                  disabled={loadingAutoSelect}
                  className="gap-2"
                >
                  {loadingAutoSelect ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4" />
                      Smart Assign
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Question Preview Dialog - Fixed Scrolling */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-6 w-6" />
                Question Preview
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-auto p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
              {previewQuestion && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{previewQuestion.title}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      {getDifficultyBadge(previewQuestion.difficulty)}
                      <Badge variant="outline">{previewQuestion.max_score || 0} points</Badge>
                    </div>
                  </div>
                  {previewQuestion.problem_statement && (
                    <div className="prose prose-sm max-w-none dark:prose-invert break-words overflow-wrap-anywhere">
                      <div
                        dangerouslySetInnerHTML={{ __html: previewQuestion.problem_statement }}
                        style={{ wordWrap: 'break-word', overflowWrap: 'anywhere' }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="flex-shrink-0 mt-4">
              <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* MCQ Preview Dialog */}
        <Dialog open={mcqPreviewDialogOpen} onOpenChange={setMcqPreviewDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-6 w-6" />
                MCQ Preview
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-6">
              {previewMcq && (
                <>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{previewMcq.title}</h3>
                    {previewMcq.description && (
                      <p className="text-gray-600 mb-4">{previewMcq.description}</p>
                    )}
                    <div className="flex items-center gap-4 mb-4">
                      {getDifficultyBadge(previewMcq.difficulty)}
                      <Badge variant="outline">{previewMcq.max_score} points</Badge>
                      {previewMcq.shuffle_options && <Badge variant="outline">Shuffled</Badge>}
                      {previewMcq.partial_scoring && <Badge variant="outline">Partial Scoring</Badge>}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                    <h4 className="font-semibold text-lg mb-4">{previewMcq.question_text}</h4>

                    <div className="space-y-3">
                      {previewMcq.options?.map((option, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded border ${previewMcq.correct_answer === index + 1
                              ? 'bg-green-100 border-green-500 text-green-800 font-semibold'
                              : 'bg-white border-gray-200'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-sm font-medium">
                              {String.fromCharCode(65 + index)}
                            </span>
                            <span>{option}</span>
                            {previewMcq.correct_answer === index + 1 && (
                              <Badge variant="outline" className="ml-auto bg-green-100 text-green-800">
                                Correct Answer
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {previewMcq.explanation && (
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                        <h5 className="font-semibold text-blue-900 mb-2">Explanation:</h5>
                        <p className="text-blue-800">{previewMcq.explanation}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMcqPreviewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Student Enrollment Dialog */}
        <Dialog open={enrollmentDialogOpen} onOpenChange={setEnrollmentDialogOpen}>
          <DialogContent className="max-w-[95vw] w-full max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <UserPlus className="h-6 w-6" />
                Enroll Students in "{currentExamForEnrollment?.title}"
              </DialogTitle>
              <DialogDescription>
                Select students to enroll or unenroll from this exam.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 flex flex-col overflow-hidden space-y-4">
              {/* Filter & Search Controls (with side-by-side filters) */}
              <div className="flex-shrink-0 p-4 border bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="enrollment-search mb-4">
                  <div className="space-y-1">
                    <Label htmlFor="student-search">Search by Name or Roll Number</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="student-search"
                        placeholder="e.g., Advaith Sathish or 21CS01..."
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                <div className="enrollment-filters flex flex-col sm:flex-row gap-4">
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="department-filter">Department</Label>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger id="department-filter">
                        <SelectValue placeholder="Filter by department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {availableDepartments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="batch-filter">Batch Year</Label>
                    <Select value={String(batchYearFilter)} onValueChange={setBatchYearFilter}>
                      <SelectTrigger id="batch-filter">
                        <SelectValue placeholder="Filter by batch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Batches</SelectItem>
                        {availableBatchYears.map(year => (
                          <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Summary Information */}
              <div className="flex-shrink-0 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {getFilteredStudents().length} of {enrichedStudents.length} students.
                  Selected: <span className="font-bold text-primary">{selectedStudents.size}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStudents(new Set(getFilteredStudents().map(s => s.id)))}
                    disabled={loadingStudents || getFilteredStudents().length === 0}
                  >
                    Select All Visible
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStudents(new Set())}
                    disabled={selectedStudents.size === 0}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>

              {/* Students List */}
              <div className="flex-1 overflow-y-auto border rounded-lg">
                {(loadingStudents || loadingProfiles) ? (
                  <div className="flex items-center justify-center h-full">
                    <Clock className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading students...</span>
                  </div>
                ) : getFilteredStudents().length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No Matching Students</h3>
                    <p className="text-sm">Try adjusting your search or filters.</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {getFilteredStudents().map((student) => {
                      const isSelected = selectedStudents.has(student.id);
                      const registration = examRegistrations[currentExamForEnrollment?.id]?.find(
                        reg => reg.student_id === student.id
                      );
                      const isEnrolled = !!registration;

                      return (
                        <div
                          key={student.id}
                          className={`flex items-center gap-4 p-3 rounded-md border transition-all duration-200 ${isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 ring-2 ring-blue-300'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 border-gray-200 dark:border-gray-700'
                            }`}
                        >
                          <Checkbox
                            id={`student-${student.id}`}
                            checked={isSelected}
                            onClick={() => {
                              const newSelected = new Set(selectedStudents);
                              if (isSelected) {
                                newSelected.delete(student.id);
                              } else {
                                newSelected.add(student.id);
                              }
                              setSelectedStudents(newSelected);
                            }}
                            className="flex-shrink-0"
                          />
                          <div
                            className="flex-1 grid grid-cols-9 gap-4 items-center cursor-pointer"
                            onClick={() => {
                              const newSelected = new Set(selectedStudents);
                              if (isSelected) {
                                newSelected.delete(student.id);
                              } else {
                                newSelected.add(student.id);
                              }
                              setSelectedStudents(newSelected);
                            }}
                          >
                            <div className="col-span-4">
                              <p className="font-semibold truncate text-base">
                                {student.profile.first_name} {student.profile.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{student.roll_number}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-sm">{student.profile.department}</p>
                            </div>
                            <div className="col-span-2">
                              <Badge variant="secondary">{student.profile.batch_year}</Badge>
                            </div>
                          </div>
                          {/* NEW: Unenroll Button */}
                          <div className="col-span-1 flex justify-end">
                            {isEnrolled ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:bg-red-100 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row selection
                                  setStudentToUnenroll({
                                    registrationId: registration.id,
                                    studentName: `${student.profile.first_name} ${student.profile.last_name}`,
                                    examId: currentExamForEnrollment.id
                                  });
                                  setUnenrollConfirmationOpen(true);
                                }}
                                title="Unenroll Student"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <div className="w-8 h-8" /> // Placeholder for alignment
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex-shrink-0 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEnrollmentDialogOpen(false)}
                disabled={enrollingStudents}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const studentsToEnroll = Array.from(selectedStudents).filter(sId =>
                    !examRegistrations[currentExamForEnrollment?.id]?.some(reg => reg.student_id === sId)
                  );
                  if (studentsToEnroll.length > 0) {
                    handleEnrollStudents(currentExamForEnrollment.id, studentsToEnroll);
                  } else {
                    toast.info("No new students to enroll", {
                      description: "All selected students are already enrolled or no new students were selected."
                    });
                  }
                }}
                disabled={enrollingStudents || selectedStudents.size === 0}
                className="gap-2 min-w-[160px]"
              >
                {enrollingStudents ? (
                  <><Clock className="h-4 w-4 animate-spin" /> Enrolling...</>
                ) : (
                  <><UserPlus className="h-4 w-4" /> Enroll Selected ({selectedStudents.size})</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>



        {/* NEW: Student Question Assignments View Dialog */}
        <Dialog open={viewAssignmentsDialogOpen} onOpenChange={setViewAssignmentsDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                Student Question Assignments for "{currentExamForAssignments?.title}"
              </DialogTitle>
              <DialogDescription>
                <div className="space-y-2">
                  <span>
                    View the assigned questions for each enrolled student.
                  </span>
                  {/* Configuration Status Indicator */}
                  {(() => {
                    const exam = exams.find(e => e.id === currentExamForAssignments?.id);
                    const config = exam?.extra_data?.assignmentConfiguration;

                    if (config) {
                      let configDescription = '';
                      if (config.mode === 'smart_pool') {
                        configDescription = `Smart Pool assignment with ${config.totalQuestions} questions per student from a curated pool`;
                      } else if (config.mode === 'total') {
                        configDescription = `Auto-Select configuration: ${config.totalQuestions} questions per student (${config.difficultyDistribution?.easy || 0}% Easy, ${config.difficultyDistribution?.medium || 0}% Medium, ${config.difficultyDistribution?.hard || 0}% Hard)`;
                      } else if (config.mode === 'per-category') {
                        const categoryCount = Object.keys(config.categoryConfigs || {}).length;
                        configDescription = `Per-Category configuration: ${config.totalQuestions} questions across ${categoryCount} categories`;
                      }

                      return (
                        <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                          <Settings className="h-3 w-3" />
                          <span className="font-medium">Configuration Locked:</span>
                          <span>{configDescription}</span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          <RefreshCw className="h-3 w-3" />
                          <span>Basic randomization (no stored configuration)</span>
                        </div>
                      );
                    }
                  })()}
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {loadingAssignments ? (
                <div className="flex items-center justify-center py-12">
                  <Clock className="h-8 w-8 animate-spin mr-3" />
                  <span className="text-lg">Loading student assignments...</span>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-6">
                    {currentExamForAssignments && examRegistrations[currentExamForAssignments.id]?.map((registration) => {
                      const student = students.find(s => s.id === registration.student_id);

                      // Get both coding and MCQ assignments
                      const codingAssignments = studentQuestionAssignments[currentExamForAssignments.id]?.[registration.student_id] || [];
                      const mcqAssignments = studentMcqAssignments[currentExamForAssignments.id]?.[registration.student_id] || [];

                      // Combine total count
                      const totalAssignments = codingAssignments.length + mcqAssignments.length;

                      return (
                        <Card key={registration.id} className="border-2">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <UserCheck className="h-5 w-5 text-green-600" />
                                {student?.email || `Student ${registration.student_id.slice(0, 8)}...`}
                              </CardTitle>
                              <div className="flex gap-2">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {totalAssignments} total questions
                                </Badge>
                                {codingAssignments.length > 0 && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    {codingAssignments.length} coding
                                  </Badge>
                                )}
                                {mcqAssignments.length > 0 && (
                                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                    {mcqAssignments.length} MCQs
                                  </Badge>
                                )}
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                  {registration.status}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {totalAssignments === 0 ? (
                              <div className="text-center py-6 text-muted-foreground">
                                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No questions assigned to this student yet.</p>
                                <p className="text-xs">Questions will be assigned when exam status is set to "Scheduled".</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {/* Coding Questions Section */}
                                {codingAssignments.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
                                      <BookOpen className="h-4 w-4 text-green-600" />
                                      Coding Questions ({codingAssignments.length})
                                    </h5>
                                    <div className="grid gap-3">
                                      {codingAssignments
                                        .sort((a, b) => a.question_order - b.question_order)
                                        .map((assignment, index) => {
                                          const question = assignment.question;
                                          return (
                                            <div
                                              key={assignment.id}
                                              className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                            >
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">
                                                      C{assignment.question_order + 1}
                                                    </Badge>
                                                    <span className="text-sm font-semibold">
                                                      {question?.title || `Question ${assignment.question_id.slice(0, 8)}...`}
                                                    </span>
                                                  </div>
                                                  {question?.description && (
                                                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                                      {question.description}
                                                    </p>
                                                  )}
                                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    <span>Points: {assignment.points}</span>
                                                    {question?.difficulty && getDifficultyBadge(question.difficulty)}
                                                    {question?.time_limit_seconds && (
                                                      <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {question.time_limit_seconds}s
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })
                                      }
                                    </div>
                                  </div>
                                )}

                                {/* MCQ Questions Section */}
                                {mcqAssignments.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-purple-600" />
                                      MCQ Questions ({mcqAssignments.length})
                                    </h5>
                                    <div className="grid gap-3">
                                      {mcqAssignments
                                        .sort((a, b) => a.question_order - b.question_order)
                                        .map((assignment, index) => {
                                          const mcq = assignment.mcq;
                                          return (
                                            <div
                                              key={assignment.id}
                                              className="p-3 border rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                                            >
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
                                                      M{assignment.question_order + 1}
                                                    </Badge>
                                                    <span className="text-sm font-semibold">
                                                      {mcq?.title || `MCQ ${assignment.mcq_id.slice(0, 8)}...`}
                                                    </span>
                                                  </div>
                                                  {(mcq?.description || mcq?.question_text) && (
                                                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                                      {mcq?.description || mcq?.question_text}
                                                    </p>
                                                  )}
                                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    <span>Points: {assignment.points}</span>
                                                    {mcq?.difficulty && getDifficultyBadge(mcq.difficulty)}
                                                    {mcq?.options && (
                                                      <span className="flex items-center gap-1">
                                                        <ListChecks className="h-3 w-3" />
                                                        {mcq.options.length} options
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })
                                      }
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}

                    {/* No students enrolled message */}
                    {currentExamForAssignments && (!examRegistrations[currentExamForAssignments.id] || examRegistrations[currentExamForAssignments.id].length === 0) && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No Students Enrolled</h3>
                        <p className="text-sm">Enroll students in this exam to view their question assignments.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>

              )}
            </div>

            <DialogFooter className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {currentExamForAssignments && examRegistrations[currentExamForAssignments.id] && (
                  <span>
                    Showing assignments for {examRegistrations[currentExamForAssignments.id].length} enrolled student(s)
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setViewAssignmentsDialogOpen(false)}
                >
                  Close
                </Button>
                {/* Updated Reassign All Questions Button */}
                {currentExamForAssignments && (
                  <Button
                    onClick={async () => {
                      setViewAssignmentsDialogOpen(false);

                      const exam = exams.find(e => e.id === currentExamForAssignments.id);
                      const storedConfiguration = exam?.extra_data?.assignmentConfiguration;

                      if (storedConfiguration) {
                        const configType = storedConfiguration.mode === 'smart_pool'
                          ? 'Smart Pool'
                          : storedConfiguration.mode === 'total'
                            ? 'Auto-Select (Total)'
                            : storedConfiguration.mode === 'per-category'
                              ? 'Auto-Select (Per Category)'
                              : 'Configuration-based';

                        toast.info("Reassigning with Configuration", {
                          description: `Reassigning questions using ${configType} configuration to maintain consistency.`,
                        });
                      } else {
                        toast.info("Basic Reassignment", {
                          description: "Reassigning questions using basic randomization (no stored configuration).",
                        });
                      }

                      const success = await reassignQuestionsToAllStudents(currentExamForAssignments.id);

                      if (success) {
                        // Refresh the assignments view
                        await fetchStudentQuestionAssignments(currentExamForAssignments.id);
                        if (examSupportsMcqs(currentExamForAssignments.exam_type)) {
                          await fetchStudentMcqAssignments(currentExamForAssignments.id);
                        }
                      }
                    }}
                    variant="outline"
                    className="gap-2"
                    disabled={assigningStudentQuestions}
                  >
                    {assigningStudentQuestions ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Reassigning...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Reassign All Questions
                        {/* Show configuration indicator */}
                        {(() => {
                          const exam = exams.find(e => e.id === currentExamForAssignments.id);
                          const config = exam?.extra_data?.assignmentConfiguration;
                          if (config) {
                            return (
                              <Badge variant="outline" className="ml-1 text-xs">
                                {config.mode === 'smart_pool' ? 'Smart' :
                                  config.mode === 'total' ? 'Auto' :
                                    config.mode === 'per-category' ? 'Category' : 'Config'}
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Exam Confirmation Dialog */}
        <AlertDialog open={deleteExamId !== null} onOpenChange={() => setDeleteExamId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Delete Exam
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Are you sure you want to delete this exam? This action cannot be undone.</p>
                <p className="text-sm text-red-600 font-medium">
                  This will permanently remove:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>The exam and all its settings</li>
                  <li>All assigned questions</li>
                  <li>All student enrollments</li>
                  <li>All student question assignments</li>
                  <li>Any submitted responses (if applicable)</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteExam(deleteExamId)}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Unenroll Student Confirmation Dialog */}
        <AlertDialog open={unenrollConfirmationOpen} onOpenChange={setUnenrollConfirmationOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Confirm Unenrollment
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to unenroll student "{studentToUnenroll?.studentName}"?
                This will remove them from the exam. This action can be reversed by re-enrolling them.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setStudentToUnenroll(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (studentToUnenroll) {
                    handleUnenrollStudent(studentToUnenroll.registrationId, studentToUnenroll.examId);
                    setStudentToUnenroll(null); // Clear after action
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, Unenroll
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Auto-Select Questions Dialog */}
        <Dialog open={autoSelectDialogOpen} onOpenChange={setAutoSelectDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Auto-Select Questions
              </DialogTitle>
              <DialogDescription>
                Automatically select questions based on your criteria. Choose from total count or per-category distribution.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto space-y-6 p-1">
              {/* Selection Mode */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Selection Mode</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${autoSelectMode === 'total'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                    onClick={() => setAutoSelectMode('total')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 ${autoSelectMode === 'total' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                        {autoSelectMode === 'total' && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                      <span className="font-medium">Total Questions</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select a total number of questions with difficulty distribution
                    </p>
                  </div>

                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${autoSelectMode === 'per-category'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                    onClick={() => setAutoSelectMode('per-category')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 ${autoSelectMode === 'per-category' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                        {autoSelectMode === 'per-category' && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                      <span className="font-medium">Per Category</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Specify questions per category with individual difficulty settings
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Questions Mode */}
              {autoSelectMode === 'total' && (
                <div className="space-y-6">
                  {/* Total Count */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="total-questions">Total Questions *</Label>
                      <Input
                        id="total-questions"
                        type="number"
                        min="1"
                        max="100"
                        value={autoSelectConfig.totalQuestions}
                        onChange={(e) => setAutoSelectConfig(prev => ({
                          ...prev,
                          totalQuestions: parseInt(e.target.value) || 1
                        }))}
                        className="h-11"
                      />
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-2">
                      <Label>Categories (Optional)</Label>
                      <Select
                        value={undefined}
                        onValueChange={(categoryId) => {
                          if (categoryId && !autoSelectConfig.categories.includes(categoryId)) {
                            setAutoSelectConfig(prev => ({
                              ...prev,
                              categories: [...prev.categories, categoryId]
                            }));
                          }
                        }}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Add categories..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter(cat => !autoSelectConfig.categories.includes(cat.id))
                            .map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Selected Categories */}
                  {autoSelectConfig.categories.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Selected Categories</Label>
                      <div className="flex flex-wrap gap-2">
                        {autoSelectConfig.categories.map(categoryId => {
                          const category = categories.find(c => c.id === categoryId);
                          return (
                            <Badge key={categoryId} variant="secondary" className="gap-1">
                              {category?.name}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => setAutoSelectConfig(prev => ({
                                  ...prev,
                                  categories: prev.categories.filter(c => c !== categoryId)
                                }))}
                              />
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Difficulty Distribution */}
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold">Difficulty Distribution (%)</Label>

                    {/* Call the helper function here */}
                    {(() => {
                      const distributedCounts = calculateDistributedCounts(autoSelectConfig.totalQuestions, autoSelectConfig.difficultyDistribution);

                      return (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-green-600">Easy ({autoSelectConfig.difficultyDistribution.easy}%)</Label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={autoSelectConfig.difficultyDistribution.easy}
                              onChange={(e) => {
                                const easy = parseInt(e.target.value);
                                const remaining = 100 - easy;
                                const mediumRatio = autoSelectConfig.difficultyDistribution.medium / (autoSelectConfig.difficultyDistribution.medium + autoSelectConfig.difficultyDistribution.hard) || 0;
                                const medium = Math.round(remaining * mediumRatio);
                                const hard = remaining - medium;

                                setAutoSelectConfig(prev => ({
                                  ...prev,
                                  difficultyDistribution: { easy, medium, hard }
                                }));
                              }}
                              className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer slider-thumb-green"
                            />
                            <div className="text-xs text-center text-muted-foreground">
                              {distributedCounts.easy} questions
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs text-yellow-600">Medium ({autoSelectConfig.difficultyDistribution.medium}%)</Label>
                            <input
                              type="range"
                              min="0"
                              max={100 - autoSelectConfig.difficultyDistribution.easy}
                              value={autoSelectConfig.difficultyDistribution.medium}
                              onChange={(e) => {
                                const medium = parseInt(e.target.value);
                                const hard = 100 - autoSelectConfig.difficultyDistribution.easy - medium;

                                setAutoSelectConfig(prev => ({
                                  ...prev,
                                  difficultyDistribution: {
                                    ...prev.difficultyDistribution,
                                    medium,
                                    hard
                                  }
                                }));
                              }}
                              className="w-full h-2 bg-yellow-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="text-xs text-center text-muted-foreground">
                              {distributedCounts.medium} questions
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs text-red-600">Hard ({autoSelectConfig.difficultyDistribution.hard}%)</Label>
                            <div className="w-full h-2 bg-red-200 rounded-lg relative">
                              <div
                                className="h-full bg-red-500 rounded-lg transition-all"
                                style={{ width: `${autoSelectConfig.difficultyDistribution.hard}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-center text-muted-foreground">
                              {distributedCounts.hard} questions
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Per Category Mode */}
              {autoSelectMode === 'per-category' && (
                <div className="space-y-6">
                  {/* Add Category Configuration */}
                  <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/20">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Category Configurations</h4>
                      <Select
                        value={undefined}
                        onValueChange={(categoryId) => {
                          if (categoryId && !Object.keys(autoSelectConfig.categoryConfigs).includes(categoryId)) {
                            setAutoSelectConfig(prev => ({
                              ...prev,
                              categoryConfigs: {
                                ...prev.categoryConfigs,
                                [categoryId]: {
                                  count: 5,
                                  difficulties: ['easy', 'medium', 'hard']
                                }
                              }
                            }));
                          }
                        }}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Add category..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter(cat => !Object.keys(autoSelectConfig.categoryConfigs).includes(cat.id))
                            .map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Category Configurations */}
                    <div className="space-y-4">
                      {Object.entries(autoSelectConfig.categoryConfigs).map(([categoryId, config]) => {
                        const category = categories.find(c => c.id === categoryId);

                        // Calculate available questions by difficulty for this category
                        const categoryQuestions = getFilteredQuestions().filter(q => q.category_id === categoryId);
                        const availableByDifficulty = {
                          easy: categoryQuestions.filter(q => q.difficulty === 'easy').length,
                          medium: categoryQuestions.filter(q => q.difficulty === 'medium').length,
                          hard: categoryQuestions.filter(q => q.difficulty === 'hard').length
                        };

                        return (
                          <div key={categoryId} className="p-4 border rounded-lg bg-white dark:bg-gray-800">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium flex items-center gap-2">
                                {category?.name}
                                <Badge variant="outline">{config.count} questions</Badge>
                              </h5>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAutoSelectConfig(prev => {
                                  const newConfigs = { ...prev.categoryConfigs };
                                  delete newConfigs[categoryId];
                                  return { ...prev, categoryConfigs: newConfigs };
                                })}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="space-y-4">
                              {/* Question Count */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-xs">Total Questions Count</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={config.count}
                                    onChange={(e) => {
                                      const newCount = parseInt(e.target.value) || 1;
                                      setAutoSelectConfig(prev => ({
                                        ...prev,
                                        categoryConfigs: {
                                          ...prev.categoryConfigs,
                                          [categoryId]: {
                                            ...config,
                                            count: newCount,
                                            // Reset difficulty distribution if it exceeds new total
                                            difficultyDistribution: config.difficultyDistribution ? {
                                              ...config.difficultyDistribution,
                                              // Ensure the sum doesn't exceed the new count
                                            } : undefined
                                          }
                                        }
                                      }));
                                    }}
                                  />
                                </div>

                                {/* Enable Difficulty Distribution Toggle */}
                                <div className="space-y-2">
                                  <Label className="text-xs">Difficulty Distribution</Label>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`enable-difficulty-${categoryId}`}
                                      checked={!!config.difficultyDistribution}
                                      onCheckedChange={(checked) => setAutoSelectConfig(prev => ({
                                        ...prev,
                                        categoryConfigs: {
                                          ...prev.categoryConfigs,
                                          [categoryId]: {
                                            ...config,
                                            difficultyDistribution: checked ? {
                                              easy: Math.min(Math.floor(config.count * 0.4), availableByDifficulty.easy),
                                              medium: Math.min(Math.floor(config.count * 0.4), availableByDifficulty.medium),
                                              hard: Math.min(Math.floor(config.count * 0.2), availableByDifficulty.hard)
                                            } : undefined,
                                            difficulties: checked ? ['easy', 'medium', 'hard'] : config.difficulties
                                          }
                                        }
                                      }))}
                                    />
                                    <Label htmlFor={`enable-difficulty-${categoryId}`} className="text-xs">
                                      Specify per difficulty
                                    </Label>
                                  </div>
                                </div>
                              </div>

                              {/* Available Questions Info */}
                              <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs">
                                <div className="flex justify-between">
                                  <span>Available:</span>
                                  <span>
                                    Easy: {availableByDifficulty.easy},
                                    Medium: {availableByDifficulty.medium},
                                    Hard: {availableByDifficulty.hard}
                                  </span>
                                </div>
                              </div>

                              {/* Difficulty Distribution Controls */}
                              {config.difficultyDistribution ? (
                                <div className="space-y-3">
                                  <Label className="text-xs font-medium">Questions per Difficulty</Label>
                                  <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-green-600">Easy</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        max={Math.min(availableByDifficulty.easy, config.count)}
                                        value={Math.max(0, config.difficultyDistribution.easy)}
                                        onChange={(e) => {
                                          const easy = Math.max(0, Math.min(parseInt(e.target.value) || 0, availableByDifficulty.easy));
                                          const currentMedium = config.difficultyDistribution.medium;
                                          const currentHard = config.difficultyDistribution.hard;

                                          // Auto-adjust if total exceeds count
                                          const currentTotal = easy + currentMedium + currentHard;
                                          let medium = currentMedium;
                                          let hard = currentHard;

                                          if (currentTotal > config.count) {
                                            const remaining = config.count - easy;
                                            if (remaining <= 0) {
                                              medium = 0;
                                              hard = 0;
                                            } else {
                                              // Proportionally reduce medium and hard
                                              const mediumRatio = currentMedium / (currentMedium + currentHard);
                                              medium = Math.floor(remaining * mediumRatio);
                                              hard = remaining - medium;
                                            }
                                          }

                                          setAutoSelectConfig(prev => ({
                                            ...prev,
                                            categoryConfigs: {
                                              ...prev.categoryConfigs,
                                              [categoryId]: {
                                                ...config,
                                                difficultyDistribution: { easy, medium, hard }
                                              }
                                            }
                                          }));
                                        }}
                                        className="h-8"
                                      />
                                      <div className="text-xs text-muted-foreground">
                                        Max: {availableByDifficulty.easy}
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs text-yellow-600">Medium</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        max={Math.min(availableByDifficulty.medium, config.count)}
                                        value={Math.max(0, config.difficultyDistribution.medium)}
                                        onChange={(e) => {
                                          const medium = Math.max(0, Math.min(parseInt(e.target.value) || 0, availableByDifficulty.medium));
                                          const currentEasy = config.difficultyDistribution.easy;
                                          const currentHard = config.difficultyDistribution.hard;

                                          // Auto-adjust if total exceeds count
                                          const currentTotal = currentEasy + medium + currentHard;
                                          let easy = currentEasy;
                                          let hard = currentHard;

                                          if (currentTotal > config.count) {
                                            const remaining = config.count - medium;
                                            if (remaining <= 0) {
                                              easy = 0;
                                              hard = 0;
                                            } else {
                                              // Proportionally reduce easy and hard
                                              const easyRatio = currentEasy / (currentEasy + currentHard);
                                              easy = Math.floor(remaining * easyRatio);
                                              hard = remaining - easy;
                                            }
                                          }

                                          setAutoSelectConfig(prev => ({
                                            ...prev,
                                            categoryConfigs: {
                                              ...prev.categoryConfigs,
                                              [categoryId]: {
                                                ...config,
                                                difficultyDistribution: { easy, medium, hard }
                                              }
                                            }
                                          }));
                                        }}
                                        className="h-8"
                                      />
                                      <div className="text-xs text-muted-foreground">
                                        Max: {availableByDifficulty.medium}
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs text-red-600">Hard</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        max={Math.min(availableByDifficulty.hard, config.count)}
                                        value={Math.max(0, config.difficultyDistribution.hard)}
                                        onChange={(e) => {
                                          const hard = Math.max(0, Math.min(parseInt(e.target.value) || 0, availableByDifficulty.hard));
                                          const currentEasy = config.difficultyDistribution.easy;
                                          const currentMedium = config.difficultyDistribution.medium;

                                          // Auto-adjust if total exceeds count
                                          const currentTotal = currentEasy + currentMedium + hard;
                                          let easy = currentEasy;
                                          let medium = currentMedium;

                                          if (currentTotal > config.count) {
                                            const remaining = config.count - hard;
                                            if (remaining <= 0) {
                                              easy = 0;
                                              medium = 0;
                                            } else {
                                              // Proportionally reduce easy and medium
                                              const easyRatio = currentEasy / (currentEasy + currentMedium);
                                              easy = Math.floor(remaining * easyRatio);
                                              medium = remaining - easy;
                                            }
                                          }

                                          setAutoSelectConfig(prev => ({
                                            ...prev,
                                            categoryConfigs: {
                                              ...prev.categoryConfigs,
                                              [categoryId]: {
                                                ...config,
                                                difficultyDistribution: { easy, medium, hard }
                                              }
                                            }
                                          }));
                                        }}
                                        className="h-8"
                                      />
                                      <div className="text-xs text-muted-foreground">
                                        Max: {availableByDifficulty.hard}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Current Total Display */}
                                  <div className="text-xs text-center">
                                    <span className={`${(config.difficultyDistribution.easy + config.difficultyDistribution.medium + config.difficultyDistribution.hard) === config.count
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                      }`}>
                                      Total: {config.difficultyDistribution.easy + config.difficultyDistribution.medium + config.difficultyDistribution.hard} / {config.count}
                                    </span>
                                  </div>

                                  {/* Validation Warning */}
                                  {(config.difficultyDistribution.easy + config.difficultyDistribution.medium + config.difficultyDistribution.hard) !== config.count && (
                                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                      Warning: Distribution total ({config.difficultyDistribution.easy + config.difficultyDistribution.medium + config.difficultyDistribution.hard}) doesn't match target count ({config.count})
                                    </div>
                                  )}
                                </div>
                              ) : (
                                /* Original Difficulties Selection */
                                <div className="space-y-2">
                                  <Label className="text-xs">Difficulties (when not using distribution)</Label>
                                  <div className="flex gap-2">
                                    {['easy', 'medium', 'hard'].map(difficulty => (
                                      <Button
                                        key={difficulty}
                                        variant={config.difficulties.includes(difficulty) ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setAutoSelectConfig(prev => ({
                                          ...prev,
                                          categoryConfigs: {
                                            ...prev.categoryConfigs,
                                            [categoryId]: {
                                              ...config,
                                              difficulties: config.difficulties.includes(difficulty)
                                                ? config.difficulties.filter(d => d !== difficulty)
                                                : [...config.difficulties, difficulty]
                                            }
                                          }
                                        }))}
                                        className={`text-xs ${difficulty === 'easy' ? 'bg-green-600 hover:bg-green-700' :
                                          difficulty === 'medium' ? 'bg-yellow-600 hover:bg-yellow-700' :
                                            'bg-red-600 hover:bg-red-700'
                                          }`}
                                      >
                                        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {Object.keys(autoSelectConfig.categoryConfigs).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No categories configured</p>
                          <p className="text-xs">Add categories above to configure question selection</p>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Summary */}
                  {Object.keys(autoSelectConfig.categoryConfigs).length > 0 && (
                    <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <h4 className="font-medium mb-2">Selection Summary</h4>
                      <div className="text-sm text-muted-foreground">
                        <p>Total questions to select: <strong>
                          {Object.values(autoSelectConfig.categoryConfigs).reduce((sum, config) => sum + config.count, 0)}
                        </strong></p>
                        <p>Categories: <strong>{Object.keys(autoSelectConfig.categoryConfigs).length}</strong></p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Advanced Options */}
              <div className="space-y-4">
                <Label className="text-sm font-semibold">Advanced Options</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="prioritize-recent"
                      checked={autoSelectConfig.prioritizeRecent}
                      onCheckedChange={(checked) => setAutoSelectConfig(prev => ({
                        ...prev,
                        prioritizeRecent: checked
                      }))}
                    />
                    <Label htmlFor="prioritize-recent" className="text-sm">
                      Prioritize recently added questions
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="exclude-used"
                      checked={autoSelectConfig.excludeUsed}
                      onCheckedChange={(checked) => setAutoSelectConfig(prev => ({
                        ...prev,
                        excludeUsed: checked
                      }))}
                    />
                    <Label htmlFor="exclude-used" className="text-sm">
                      Exclude questions already used in other exams
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                <div className="space-y-1">
                  <div>
                    {autoSelectMode === 'total'
                      ? `${autoSelectConfig.totalQuestions} questions per student will be assigned`
                      : `${Object.values(autoSelectConfig.categoryConfigs).reduce((sum, config) => sum + config.count, 0)} questions per student will be assigned`
                    }
                  </div>
                  {/* ✅ Get enrolled students from state */}
                  {currentExamForQuestions && examRegistrations[currentExamForQuestions.id]?.length > 0 && (
                    <div className="text-xs">
                      <span className="font-medium">Total assignments:</span> {examRegistrations[currentExamForQuestions.id].length} students × {autoSelectMode === 'total'
                        ? autoSelectConfig.totalQuestions
                        : Object.values(autoSelectConfig.categoryConfigs).reduce((sum, config) => sum + config.count, 0)
                      } questions = <span className="font-bold text-blue-600">
                        {examRegistrations[currentExamForQuestions.id].length * (autoSelectMode === 'total'
                          ? autoSelectConfig.totalQuestions
                          : Object.values(autoSelectConfig.categoryConfigs).reduce((sum, config) => sum + config.count, 0)
                        )}
                      </span> total assignments
                    </div>
                  )}
                  {/* ✅ Check if no students enrolled */}
                  {(!currentExamForQuestions || !examRegistrations[currentExamForQuestions.id] || examRegistrations[currentExamForQuestions.id].length === 0) && (
                    <div className="text-xs text-amber-600">
                      No students enrolled. Questions will be prepared for future enrollment.
                    </div>
                  )}
                  {autoSelectMode === 'per-category' && (
                    <div className="text-xs mt-2">
                      <span className="font-medium">Distribution:</span> {Object.entries(autoSelectConfig.categoryConfigs).map(([categoryId, config]) => {
                        const category = categories.find(c => c.id === categoryId);
                        return `${category?.name}: ${config.count}`;
                      }).join(', ')}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setAutoSelectDialogOpen(false)}
                  disabled={loadingAutoSelect}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAutoSelectQuestions}
                  disabled={loadingAutoSelect || (
                    autoSelectMode === 'per-category' &&
                    Object.keys(autoSelectConfig.categoryConfigs).length === 0
                  ) || (
                      // Additional validation for per-category mode
                      autoSelectMode === 'per-category' &&
                      Object.values(autoSelectConfig.categoryConfigs).some(config => {
                        if (config.difficultyDistribution) {
                          const total = config.difficultyDistribution.easy + config.difficultyDistribution.medium + config.difficultyDistribution.hard;
                          return total !== config.count;
                        }
                        return false;
                      })
                    )}
                  className="gap-2"
                >
                  {loadingAutoSelect ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Assigning Questions...
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4" />
                      Auto-Assign Questions
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>

          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
