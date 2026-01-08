import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { AlertTriangle, Trophy, Clock, Bug, HelpCircle, TrendingUp, Users, Target, BookOpen, Activity, RefreshCw, Download, Filter } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AnalyticsPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [rawSubmissionResults, setRawSubmissionResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Theme state management
  // Inherit theme from parent (TeacherDashboard)
  const isDarkMode = false; // Always use light theme to match dashboard

  // ✅ NEW: Add state for course filtering and student selection
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedStudentsForProgress, setSelectedStudentsForProgress] = useState([]);
  const [showStudentSelector, setShowStudentSelector] = useState(false);

  // API call function
  const API_BASE_URL = 'http://localhost:8000';

  const apiCall = async (endpoint, options = {}) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      });
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };

  // [Include all your existing calculation functions here - unchanged from previous version]
  const processSubmissionResults = async (submissionResults) => {
    try {
      console.log('🔄 Processing', submissionResults.length, 'submission results...');

      if (!submissionResults || submissionResults.length === 0) {
        console.warn('⚠️ No submission results to process');
        return getEmptyDashboardData();
      }

      const [submissions, questions, users] = await Promise.all([
        apiCall('/submissions/?skip=0&limit=10000'),
        apiCall('/questions/?skip=0&limit=10000'),
        apiCall('/users/?skip=0&limit=10000')
      ]);

      const submissionMap = new Map(submissions.map(s => [s.id, s]));
      const questionMap = new Map(questions.map(q => [q.id, q]));
      const userMap = new Map(users.map(u => [u.id, u]));

      const processedData = {
        topic_data: calculateTopicPerformance(submissionResults, submissionMap, questionMap),
        time_data: calculateTimetrends(submissionResults, submissionMap),
        failed_problems: calculateFailedProblems(submissionResults, submissionMap, questionMap),
        leaderboard: calculateLeaderboard(submissionResults, submissionMap, userMap),
        activity_data: calculateDailyActivity(submissionResults, submissionMap),
        metrics: calculateMetrics(submissionResults, submissionMap, userMap),
        alerts: generateAlerts(submissionResults, submissionMap, userMap),
        // ✅ NEW: Add the 4 enhanced charts
        difficulty_distribution: calculateDifficultyDistribution(submissionResults, submissionMap, questionMap),
        student_progress: calculateStudentProgress(submissionResults, submissionMap, userMap),
        status_breakdown: calculateStatusBreakdown(submissionResults, submissionMap),
        performance_heatmap: calculatePerformanceHeatmap(submissionResults, submissionMap)
      };

      return processedData;

    } catch (error) {
      console.error('❌ Error processing submission results:', error);
      return getEmptyDashboardData();
    }
  };

  // ✅ EXISTING: Keep all your original calculation functions
  const calculateTopicPerformance = (results, submissionMap, questionMap) => {
    try {
      const topicStats = new Map();
      results.forEach(result => {
        const submission = submissionMap.get(result.submission_id);
        if (!submission) return;

        const question = questionMap.get(submission.question_id);
        if (!question || !question.extra_data) return;

        let extraData;
        try {
          extraData = typeof question.extra_data === 'string' ? JSON.parse(question.extra_data) : question.extra_data;
        } catch {
          return;
        }

        const tags = extraData.tags || [];
        const isAccepted = result.status === 'accepted' || result.status === 'ACCEPTED';

        tags.forEach(tag => {
          if (!topicStats.has(tag)) {
            topicStats.set(tag, { total: 0, solved: 0 });
          }
          const stats = topicStats.get(tag);
          stats.total += 1;
          if (isAccepted) stats.solved += 1;
        });
      });

      return Array.from(topicStats.entries())
        .map(([topic, stats]) => ({
          topic: topic.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          total: stats.total,
          solved: stats.solved,
          avg_score: stats.total > 0 ? Math.round((stats.solved / stats.total) * 100 * 10) / 10 : 0
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    } catch (error) {
      return [];
    }
  };

  const calculateTimetrends = (results, submissionMap) => {
    try {
      const weekStats = new Map();
      const now = new Date();
      const eightWeeksAgo = new Date(now.getTime() - (8 * 7 * 24 * 60 * 60 * 1000));

      results.forEach(result => {
        const submission = submissionMap.get(result.submission_id);
        if (!submission || !submission.submitted_at) return;

        const submittedDate = new Date(submission.submitted_at);
        if (submittedDate < eightWeeksAgo) return;

        const weekNumber = getWeekNumber(submittedDate);
        const weekKey = `Week ${weekNumber}`;

        if (!weekStats.has(weekKey)) {
          weekStats.set(weekKey, { count: 0, totalTime: 0 });
        }

        const stats = weekStats.get(weekKey);
        stats.count += 1;
        stats.totalTime += (result.execution_time || 0);
      });

      return Array.from(weekStats.entries())
        .map(([week, stats]) => ({
          week,
          submissions: stats.count,
          avg_time: stats.count > 0 ? Math.round((stats.totalTime / stats.count) * 10) / 10 : 0
        }))
        .sort((a, b) => a.week.localeCompare(b.week));
    } catch (error) {
      return [];
    }
  };

  const calculateFailedProblems = (results, submissionMap, questionMap) => {
    try {
      const problemStats = new Map();
      results.forEach(result => {
        const submission = submissionMap.get(result.submission_id);
        if (!submission) return;

        const question = questionMap.get(submission.question_id);
        if (!question) return;

        let taskId = question.title;
        let difficulty = 'Medium';

        if (question.extra_data) {
          try {
            const extraData = typeof question.extra_data === 'string' ? JSON.parse(question.extra_data) : question.extra_data;
            taskId = extraData.task_id || question.title;
            const tags = extraData.tags || [];

            if (tags.some(tag => ['array', 'hash-table', 'string'].includes(tag))) {
              difficulty = 'Easy';
            } else if (tags.some(tag => ['dynamic-programming', 'backtracking', 'graph'].includes(tag))) {
              difficulty = 'Hard';
            }
          } catch {
            // Use defaults
          }
        }

        if (!problemStats.has(taskId)) {
          problemStats.set(taskId, { total: 0, failed: 0, difficulty });
        }

        const stats = problemStats.get(taskId);
        stats.total += 1;
        const isAccepted = result.status === 'accepted' || result.status === 'ACCEPTED';
        if (!isAccepted) stats.failed += 1;
      });

      return Array.from(problemStats.entries())
        .map(([name, stats]) => ({
          name: name.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          failure_rate: stats.total > 0 ? Math.round((stats.failed / stats.total) * 100 * 10) / 10 : 0,
          attempts: stats.total,
          difficulty: stats.difficulty
        }))
        .filter(p => p.attempts >= 2)
        .sort((a, b) => b.failure_rate - a.failure_rate);
    } catch (error) {
      return [];
    }
  };

  const calculateLeaderboard = (results, submissionMap, userMap) => {
    try {
      const studentStats = new Map();
      results.forEach(result => {
        const submission = submissionMap.get(result.submission_id);
        if (!submission) return;

        const user = userMap.get(submission.student_id);
        if (!user) return;

        const userRole = user.role ? user.role.toString().toLowerCase() : '';
        if (!userRole.includes('student')) return;

        const studentId = submission.student_id;
        if (!studentStats.has(studentId)) {
          let studentName = 'Unknown Student';
          if (user.email) {
            studentName = user.email.split('@')[0];
          } else if (user.username) {
            studentName = user.username;
          } else {
            studentName = `Student ${studentId.toString().slice(-4)}`;
          }

          studentStats.set(studentId, {
            id: studentId,
            name: studentName,
            total: 0,
            successful: 0
          });
        }

        const stats = studentStats.get(studentId);
        stats.total += 1;
        const status = result.status ? result.status.toString().toLowerCase() : '';
        const isAccepted = status === 'accepted' || status === 'success' || status.includes('accept');
        if (isAccepted) {
          stats.successful += 1;
        }
      });

      if (studentStats.size === 0) {
        return [];
      }

      const leaderboard = Array.from(studentStats.values())
        .map((stats) => ({
          id: stats.id,
          name: stats.name,
          score: stats.total > 0 ? Math.round((stats.successful / stats.total) * 100 * 10) / 10 : 0,
          total_submissions: stats.total,
          rank: 0
        }))
        .sort((a, b) => b.score - a.score || b.total_submissions - a.total_submissions)
        .map((student, index) => ({ ...student, rank: index + 1 }))
        .slice(0, 10);

      return leaderboard;
    } catch (error) {
      return [];
    }
  };

  const calculateDailyActivity = (results, submissionMap) => {
    try {
      const dayStats = new Map([
        ['Sun', { submissions: 0, users: new Set() }],
        ['Mon', { submissions: 0, users: new Set() }],
        ['Tue', { submissions: 0, users: new Set() }],
        ['Wed', { submissions: 0, users: new Set() }],
        ['Thu', { submissions: 0, users: new Set() }],
        ['Fri', { submissions: 0, users: new Set() }],
        ['Sat', { submissions: 0, users: new Set() }]
      ]);

      const oneWeekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));

      results.forEach(result => {
        const submission = submissionMap.get(result.submission_id);
        if (!submission || !submission.submitted_at) return;

        const submittedDate = new Date(submission.submitted_at);
        if (submittedDate < oneWeekAgo) return;

        const dayName = submittedDate.toLocaleDateString('en-US', { weekday: 'short' });
        if (dayStats.has(dayName)) {
          const stats = dayStats.get(dayName);
          stats.submissions += 1;
          stats.users.add(submission.student_id);
        }
      });

      return Array.from(dayStats.entries()).map(([day, stats]) => ({
        day,
        submissions: stats.submissions,
        active_users: stats.users.size
      }));
    } catch (error) {
      return [];
    }
  };

  const calculateMetrics = (results, submissionMap, userMap) => {
    try {
      const totalResults = results.length;
      const acceptedResults = results.filter(r => r.status === 'accepted' || r.status === 'ACCEPTED').length;

      const avgScore = totalResults > 0 ? results.reduce((sum, r) => {
        const score = r.max_score > 0 ? (r.score / r.max_score) * 100 : 0;
        return sum + score;
      }, 0) / totalResults : 0;

      const avgTime = totalResults > 0 ? results.reduce((sum, r) => sum + (r.execution_time || 0), 0) / totalResults : 0;

      const activeStudents = new Set();
      results.forEach(result => {
        const submission = submissionMap.get(result.submission_id);
        if (submission) activeStudents.add(submission.student_id);
      });

      const submissionRate = totalResults > 0 ? (acceptedResults / totalResults) * 100 : 0;

      return {
        avg_score: Math.round(avgScore * 10) / 10,
        active_students: activeStudents.size,
        total_submissions: totalResults,
        completed_exams: 1,
        avg_time: Math.round(avgTime * 10) / 10,
        submission_rate: Math.round(submissionRate * 10) / 10
      };
    } catch (error) {
      return {
        avg_score: 0,
        active_students: 0,
        total_submissions: 0,
        completed_exams: 0,
        avg_time: 0,
        submission_rate: 0
      };
    }
  };

  const generateAlerts = (results, submissionMap, userMap) => {
    try {
      const alerts = [];
      const totalResults = results.length;

      if (totalResults === 0) {
        alerts.push({
          id: 'no_data',
          type: 'warning',
          title: 'No Data Available',
          message: 'No submission results found. Create test data to populate analytics.',
          timestamp: new Date().toISOString(),
          priority: 'medium'
        });
        return alerts;
      }

      const failedResults = results.filter(r => r.status !== 'accepted' && r.status !== 'ACCEPTED').length;
      const failureRate = (failedResults / totalResults) * 100;

      if (failureRate > 50) {
        alerts.push({
          id: 'high_failure_rate',
          type: 'danger',
          title: 'High Failure Rate Alert',
          message: `Current failure rate is ${Math.round(failureRate * 10) / 10}% - students may need additional support.`,
          timestamp: new Date().toISOString(),
          priority: 'high'
        });
      }

      return alerts;
    } catch (error) {
      return [];
    }
  };

  // ✅ NEW: Additional calculation functions for the 4 new charts
  const calculateDifficultyDistribution = (results, submissionMap, questionMap) => {
    try {
      const difficultyStats = { "Easy": 0, "Medium": 0, "Hard": 0 };

      results.forEach(result => {
        const submission = submissionMap.get(result.submission_id);
        if (!submission) return;

        const question = questionMap.get(submission.question_id);
        if (!question || !question.extra_data) return;

        try {
          const extraData = typeof question.extra_data === 'string' ? JSON.parse(question.extra_data) : question.extra_data;
          const tags = extraData.tags || [];

          // Determine difficulty from tags
          if (tags.some(tag => ['array', 'hash-table', 'string', 'math'].includes(tag))) {
            difficultyStats["Easy"] += 1;
          } else if (tags.some(tag => ['dynamic-programming', 'backtracking', 'graph', 'tree'].includes(tag))) {
            difficultyStats["Hard"] += 1;
          } else {
            difficultyStats["Medium"] += 1;
          }
        } catch {
          difficultyStats["Medium"] += 1;
        }
      });

      // Convert to array format
      const result = [];
      const total = Object.values(difficultyStats).reduce((sum, count) => sum + count, 0);
      for (const [difficulty, count] of Object.entries(difficultyStats)) {
        if (count > 0) {
          result.push({
            difficulty,
            count,
            percentage: total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0
          });
        }
      }

      return result;
    } catch (error) {
      return [];
    }
  };

  // ✅ UPDATED: Enhanced Student Progress with Course Filtering
  const calculateStudentProgress = (results, submissionMap, userMap) => {
    try {
      const studentProgressMap = new Map();
      const coursesSet = new Set();
      const start_date = new Date();
      start_date.setDate(start_date.getDate() - 30); // Last 30 days

      results.forEach(result => {
        const submission = submissionMap.get(result.submission_id);
        if (!submission || !submission.submitted_at) return;

        const submittedDate = new Date(submission.submitted_at);
        if (submittedDate < start_date) return;

        const user = userMap.get(submission.student_id);
        if (!user) return;

        const userRole = user.role ? user.role.toString().toLowerCase() : '';
        if (!userRole.includes('student')) return;

        let studentName = 'Unknown Student';
        if (user.email) {
          studentName = user.email.split('@')[0];
        } else if (user.username) {
          studentName = user.username;
        } else {
          studentName = `Student ${submission.student_id.toString().slice(-4)}`;
        }

        // ✅ NEW: Extract course information from user data
        let courseName = 'General';
        if (user.extra_data) {
          try {
            const userData = typeof user.extra_data === 'string' ? JSON.parse(user.extra_data) : user.extra_data;
            courseName = userData.course || userData.department || 'General';
          } catch {
            courseName = 'General';
          }
        }

        coursesSet.add(courseName);

        const dateKey = submittedDate.toISOString().split('T')[0];
        const studentKey = `${studentName}`;

        if (!studentProgressMap.has(studentKey)) {
          studentProgressMap.set(studentKey, {
            course: courseName,
            progressData: new Map()
          });
        }

        const studentData = studentProgressMap.get(studentKey);
        if (!studentData.progressData.has(dateKey)) {
          studentData.progressData.set(dateKey, { total: 0, successful: 0 });
        }

        const dayStats = studentData.progressData.get(dateKey);
        dayStats.total += 1;
        if (result.status === 'accepted' || result.status === 'ACCEPTED') {
          dayStats.successful += 1;
        }
      });

      // ✅ NEW: Update available courses
      setAvailableCourses(Array.from(coursesSet).sort());

      // Convert to required format
      const allStudents = [];
      for (const [studentName, studentInfo] of studentProgressMap.entries()) {
        const progress_data = [];
        for (const [date, stats] of studentInfo.progressData.entries()) {
          const success_rate = stats.total > 0 ? Math.round((stats.successful / stats.total) * 100 * 10) / 10 : 0;
          progress_data.push({
            date,
            success_rate,
            attempts: stats.total
          });
        }

        if (progress_data.length > 0) {
          allStudents.push({
            student_name: studentName,
            course: studentInfo.course,
            progress_data: progress_data.sort((a, b) => a.date.localeCompare(b.date)),
            total_activity: progress_data.length
          });
        }
      }

      // ✅ NEW: Filter by selected course
      const filteredStudents = selectedCourse === 'all'
        ? allStudents
        : allStudents.filter(student => student.course === selectedCourse);

      // ✅ NEW: Limit to selected students or top 5 most active
      let finalStudents;
      if (selectedStudentsForProgress.length > 0) {
        finalStudents = filteredStudents.filter(student =>
          selectedStudentsForProgress.includes(student.student_name)
        );
      } else {
        finalStudents = filteredStudents
          .sort((a, b) => b.total_activity - a.total_activity)
          .slice(0, 5);
      }

      return {
        students: finalStudents,
        allStudents: filteredStudents // For student selector
      };

    } catch (error) {
      return { students: [], allStudents: [] };
    }
  };

  const calculateStatusBreakdown = (results, submissionMap) => {
    try {
      const statusStats = new Map();

      results.forEach(result => {
        const status = result.status || 'Unknown';
        statusStats.set(status, (statusStats.get(status) || 0) + 1);
      });

      const statusNames = {
        'accepted': 'Accepted',
        'ACCEPTED': 'Accepted',
        'runtime_error': 'Runtime Error',
        'RUNTIME_ERROR': 'Runtime Error',
        'time_limit_exceeded': 'Time Limit Exceeded',
        'TIME_LIMIT_EXCEEDED': 'Time Limit Exceeded',
        'compilation_error': 'Compilation Error',
        'COMPILATION_ERROR': 'Compilation Error',
        'wrong_answer': 'Wrong Answer',
        'WRONG_ANSWER': 'Wrong Answer',
        'memory_limit_exceeded': 'Memory Limit Exceeded',
        'MEMORY_LIMIT_EXCEEDED': 'Memory Limit Exceeded'
      };

      const result = [];
      const totalCount = Array.from(statusStats.values()).reduce((sum, count) => sum + count, 0);

      for (const [status, count] of statusStats.entries()) {
        const statusName = statusNames[status] || status;
        const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100 * 10) / 10 : 0;
        result.push({
          status: statusName,
          count,
          percentage
        });
      }

      return result.sort((a, b) => b.count - a.count);
    } catch (error) {
      return [];
    }
  };

  const calculatePerformanceHeatmap = (results, submissionMap) => {
    try {
      const heatmapData = [];
      const start_date = new Date();
      start_date.setDate(start_date.getDate() - 56); // Last 8 weeks

      const weekData = new Map();

      results.forEach(result => {
        const submission = submissionMap.get(result.submission_id);
        if (!submission || !submission.submitted_at) return;

        const submittedDate = new Date(submission.submitted_at);
        if (submittedDate < start_date) return;

        const dayName = submittedDate.toLocaleDateString('en-US', { weekday: 'short' });
        const weekNumber = getWeekNumber(submittedDate);
        const weekKey = `W${weekNumber}`;
        const dayWeekKey = `${dayName}-${weekKey}`;

        if (!weekData.has(dayWeekKey)) {
          weekData.set(dayWeekKey, {
            day: dayName,
            week: weekKey,
            total: 0,
            successful: 0
          });
        }

        const data = weekData.get(dayWeekKey);
        data.total += 1;
        if (result.status === 'accepted' || result.status === 'ACCEPTED') {
          data.successful += 1;
        }
      });

      for (const [key, data] of weekData.entries()) {
        const success_rate = data.total > 0 ? Math.round((data.successful / data.total) * 100 * 10) / 10 : 0;
        heatmapData.push({
          day: data.day,
          week: data.week,
          success_rate,
          total_submissions: data.total,
          intensity: Math.min(success_rate / 20, 5)
        });
      }

      return heatmapData;
    } catch (error) {
      return [];
    }
  };

  // Helper functions
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const getEmptyDashboardData = () => ({
    topic_data: [],
    time_data: [],
    failed_problems: [],
    leaderboard: [],
    activity_data: [
      { day: 'Sun', submissions: 0, active_users: 0 },
      { day: 'Mon', submissions: 0, active_users: 0 },
      { day: 'Tue', submissions: 0, active_users: 0 },
      { day: 'Wed', submissions: 0, active_users: 0 },
      { day: 'Thu', submissions: 0, active_users: 0 },
      { day: 'Fri', submissions: 0, active_users: 0 },
      { day: 'Sat', submissions: 0, active_users: 0 }
    ],
    metrics: {
      avg_score: 0,
      active_students: 0,
      total_submissions: 0,
      completed_exams: 0,
      avg_time: 0,
      submission_rate: 0
    },
    alerts: [],
    // ✅ NEW: Add empty data for new charts
    difficulty_distribution: [],
    student_progress: { students: [], allStudents: [] },
    status_breakdown: [],
    performance_heatmap: []
  });

  // Fetch data using authenticated API calls
  const fetchDashboardData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const submissionResults = await apiCall('/submission-results/?skip=0&limit=10000');
      setRawSubmissionResults(submissionResults || []);

      const processedData = await processSubmissionResults(submissionResults || []);
      setDashboardData(processedData);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load authenticated data from submission-results API');
      setDashboardData(getEmptyDashboardData());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => fetchDashboardData(false), 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // ✅ NEW: Enhanced chart data processing functions

  // NEW CHART 1: Difficulty Distribution Chart Data
  const getDifficultyDistributionData = () => {
    if (!dashboardData?.difficulty_distribution || dashboardData.difficulty_distribution.length === 0) {
      return null;
    }

    return {
      labels: dashboardData.difficulty_distribution.map(item => item.difficulty),
      datasets: [{
        data: dashboardData.difficulty_distribution.map(item => item.count),
        backgroundColor: dashboardData.difficulty_distribution.map(item => {
          switch (item.difficulty) {
            case 'Easy': return isDarkMode ? '#4ade80' : '#22c55e';
            case 'Medium': return isDarkMode ? '#fbbf24' : '#f59e0b';
            case 'Hard': return isDarkMode ? '#f87171' : '#ef4444';
            default: return isDarkMode ? '#8b5cf6' : '#a855f7';
          }
        }),
        borderColor: isDarkMode ? '#333333' : '#ffffff',
        borderWidth: 2
      }]
    };
  };

  // ✅ UPDATED: Enhanced Student Progress Chart Data
  const getStudentProgressData = () => {
    if (!dashboardData?.student_progress?.students || dashboardData.student_progress.students.length === 0) {
      return null;
    }

    // Create date labels from the data
    const allDates = new Set();
    dashboardData.student_progress.students.forEach(student => {
      student.progress_data?.forEach(point => allDates.add(point.date));
    });
    const sortedDates = Array.from(allDates).sort();

    const colors = ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#8b5cf6', '#06d6a0'];

    return {
      labels: sortedDates,
      datasets: dashboardData.student_progress.students.map((student, index) => ({
        label: `${student.student_name} (${student.course})`,
        data: sortedDates.map(date => {
          const dataPoint = student.progress_data?.find(p => p.date === date);
          return dataPoint ? dataPoint.success_rate : null;
        }),
        borderColor: colors[index % colors.length],
        backgroundColor: 'transparent',
        tension: 0.4,
        spanGaps: true,
        pointBackgroundColor: colors[index % colors.length],
        pointBorderColor: colors[index % colors.length],
        pointRadius: 4
      }))
    };
  };

  // NEW CHART 3: Status Breakdown Chart Data  
  const getStatusBreakdownData = () => {
    if (!dashboardData?.status_breakdown || dashboardData.status_breakdown.length === 0) {
      return null;
    }

    const statusColors = {
      'Accepted': isDarkMode ? '#4ade80' : '#22c55e',
      'Runtime Error': isDarkMode ? '#f87171' : '#ef4444',
      'Wrong Answer': isDarkMode ? '#fbbf24' : '#f59e0b',
      'Time Limit Exceeded': isDarkMode ? '#a78bfa' : '#8b5cf6',
      'Compilation Error': isDarkMode ? '#fb7185' : '#ec4899',
      'Memory Limit Exceeded': isDarkMode ? '#fbbf24' : '#f59e0b'
    };

    return {
      labels: dashboardData.status_breakdown.map(item => item.status),
      datasets: [{
        data: dashboardData.status_breakdown.map(item => item.count),
        backgroundColor: dashboardData.status_breakdown.map(item =>
          statusColors[item.status] || (isDarkMode ? '#6b7280' : '#9ca3af')
        ),
        borderColor: isDarkMode ? '#333333' : '#ffffff',
        borderWidth: 2,
        cutout: '50%'
      }]
    };
  };

  // NEW CHART 4: Performance Heatmap Component
  const PerformanceHeatmap = ({ data }) => {
    if (!data || data.length === 0) {
      return (
        <div style={{
          ...styles.chartContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isDarkMode ? '#cccccc' : '#6b7280'
        }}>
          <div style={{ textAlign: 'center' }}>
            <Activity size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <div>No performance data available</div>
          </div>
        </div>
      );
    }

    // Group data by week
    const weeks = [...new Set(data.map(d => d.week))].sort();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getCellColor = (successRate) => {
      if (successRate === 0) return isDarkMode ? '#1f2937' : '#f3f4f6';
      if (successRate < 20) return isDarkMode ? '#7f1d1d' : '#fecaca';
      if (successRate < 40) return isDarkMode ? '#a16207' : '#fed7aa';
      if (successRate < 60) return isDarkMode ? '#15803d' : '#bbf7d0';
      if (successRate < 80) return isDarkMode ? '#166534' : '#86efac';
      return isDarkMode ? '#14532d' : '#4ade80';
    };

    return (
      <div style={{ padding: '1rem', height: '100%', overflow: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `80px repeat(${weeks.length}, 1fr)`,
          gap: '4px',
          fontSize: '12px'
        }}>
          {/* Header row */}
          <div></div>
          {weeks.map(week => (
            <div key={week} style={{
              textAlign: 'center',
              fontWeight: '600',
              color: isDarkMode ? '#ffffff' : '#374151'
            }}>
              {week}
            </div>
          ))}

          {/* Data rows */}
          {days.map(day => (
            <React.Fragment key={day}>
              <div style={{
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                color: isDarkMode ? '#ffffff' : '#374151'
              }}>
                {day}
              </div>
              {weeks.map(week => {
                const cellData = data.find(d => d.day === day && d.week === week);
                const successRate = cellData ? cellData.success_rate : 0;
                const submissions = cellData ? cellData.total_submissions : 0;

                return (
                  <div
                    key={`${day}-${week}`}
                    title={`${day} ${week}: ${successRate}% success (${submissions} submissions)`}
                    style={{
                      backgroundColor: getCellColor(successRate),
                      height: '24px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: successRate > 50 ? '#ffffff' : (isDarkMode ? '#cccccc' : '#374151'),
                      fontSize: '10px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    {submissions > 0 ? `${successRate}%` : ''}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  // ✅ EXISTING: Keep all existing chart data functions
  const getTopicData = () => {
    if (!dashboardData?.topic_data || dashboardData.topic_data.length === 0) {
      return null;
    }

    return {
      labels: dashboardData.topic_data.map(item => item.topic),
      datasets: [{
        label: 'Success Rate (%)',
        data: dashboardData.topic_data.map(item => item.avg_score),
        backgroundColor: isDarkMode ? '#60a5fa' : '#3b82f6',
        borderRadius: 8,
        borderSkipped: false,
      }]
    };
  };

  const getTimeData = () => {
    if (!dashboardData?.time_data || dashboardData.time_data.length === 0) {
      return null;
    }

    return {
      labels: dashboardData.time_data.map(item => item.week),
      datasets: [{
        label: 'Submissions',
        data: dashboardData.time_data.map(item => item.submissions),
        borderColor: isDarkMode ? '#34d399' : '#10b981',
        backgroundColor: 'transparent',
        tension: 0.4
      }]
    };
  };

  const getActivityData = () => {
    if (!dashboardData?.activity_data || dashboardData.activity_data.length === 0) {
      return null;
    }

    return {
      labels: dashboardData.activity_data.map(item => item.day),
      datasets: [{
        label: 'Active Users',
        data: dashboardData.activity_data.map(item => item.active_users),
        backgroundColor: isDarkMode ? '#f59e0b' : '#f59e0b',
        borderRadius: 6,
      }]
    };
  };

  // No data display component
  const NoDataDisplay = ({ icon: Icon, message }) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: isDarkMode ? '#cccccc' : '#6b7280'
    }}>
      <Icon size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
      <div>{message}</div>
    </div>
  );

  // ✅ NEW: Student Selector Modal Component
  const StudentSelector = () => {
    if (!showStudentSelector || !dashboardData?.student_progress?.allStudents) return null;

    const availableStudents = dashboardData.student_progress.allStudents;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: isDarkMode ? '#111111' : '#ffffff',
          borderRadius: '16px',
          padding: '2rem',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '70vh',
          overflow: 'auto',
          border: `1px solid ${isDarkMode ? '#333333' : '#e9ecef'}`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            borderBottom: `2px solid ${isDarkMode ? '#333333' : '#e9ecef'}`,
            paddingBottom: '1rem'
          }}>
            <h3 style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#212529' }}>
              Select Students for Progress Chart
            </h3>
            <button
              onClick={() => setShowStudentSelector(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: isDarkMode ? '#ffffff' : '#212529'
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              fontSize: '0.9rem',
              color: isDarkMode ? '#cccccc' : '#6b7280',
              marginBottom: '0.5rem'
            }}>
              Select up to 8 students (leave empty for top 5 most active):
            </div>
          </div>

          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {availableStudents.map(student => (
              <label
                key={student.student_name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                  backgroundColor: selectedStudentsForProgress.includes(student.student_name)
                    ? (isDarkMode ? '#333333' : '#f3f4f6')
                    : 'transparent',
                  border: `1px solid ${isDarkMode ? '#333333' : '#e9ecef'}`
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedStudentsForProgress.includes(student.student_name)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      if (selectedStudentsForProgress.length < 8) {
                        setSelectedStudentsForProgress(prev => [...prev, student.student_name]);
                      }
                    } else {
                      setSelectedStudentsForProgress(prev =>
                        prev.filter(name => name !== student.student_name)
                      );
                    }
                  }}
                  style={{ marginRight: '0.75rem' }}
                  disabled={!selectedStudentsForProgress.includes(student.student_name) && selectedStudentsForProgress.length >= 8}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: '600',
                    color: isDarkMode ? '#ffffff' : '#212529'
                  }}>
                    {student.student_name}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: isDarkMode ? '#cccccc' : '#6b7280'
                  }}>
                    {student.course} • {student.total_activity} days active
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: `1px solid ${isDarkMode ? '#333333' : '#e9ecef'}`
          }}>
            <button
              onClick={() => {
                setSelectedStudentsForProgress([]);
                setShowStudentSelector(false);
              }}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                border: `1px solid ${isDarkMode ? '#333333' : '#e9ecef'}`,
                backgroundColor: isDarkMode ? '#333333' : '#f8f9fa',
                color: isDarkMode ? '#ffffff' : '#212529',
                cursor: 'pointer'
              }}
            >
              Clear & Show Top 5
            </button>
            <button
              onClick={() => setShowStudentSelector(false)}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isDarkMode ? '#60a5fa' : '#3b82f6',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Apply Selection
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Dynamic theme-based styles
  const getThemeStyles = () => {
    if (isDarkMode) {
      return {
        container: {
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          backgroundColor: '#000000',
          minHeight: '100vh',
          padding: '1.5rem',
          color: '#ffffff',
          transition: 'all 0.3s ease'
        },
        statusBar: {
          backgroundColor: '#111111',
          borderRadius: '16px',
          padding: '1rem 2rem',
          marginBottom: '2rem',
          fontSize: '0.9rem',
          color: '#cccccc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid #333333',
          boxShadow: '0 4px 6px rgba(255, 255, 255, 0.05)'
        },
        grid: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '2rem',
          maxWidth: '1600px',
          margin: '0 auto'
        },
        widget: {
          backgroundColor: '#111111',
          borderRadius: '20px',
          padding: '2rem',
          border: '1px solid #333333',
          boxShadow: '0 8px 16px rgba(255, 255, 255, 0.05)',
          transition: 'all 0.3s ease',
          height: '500px',
          display: 'flex',
          flexDirection: 'column'
        },
        wideWidget: {
          backgroundColor: '#111111',
          borderRadius: '20px',
          padding: '2rem',
          border: '1px solid #333333',
          boxShadow: '0 8px 16px rgba(255, 255, 255, 0.05)',
          gridColumn: 'span 2',
          transition: 'all 0.3s ease'
        },
        widgetTitle: {
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '1.4rem',
          fontWeight: 700,
          color: '#ffffff',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid #333333',
          flexShrink: 0
        },
        chartContainer: {
          height: '350px',
          width: '100%',
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          flex: 1
        },
        failedProblemsContainer: {
          height: '350px',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: '8px',
          flex: 1
        },
        table: {
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.95rem',
          backgroundColor: '#111111'
        },
        th: {
          padding: '1rem',
          textAlign: 'left',
          backgroundColor: '#000000',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '0.9rem',
          borderBottom: '2px solid #333333',
          position: 'sticky',
          top: 0,
          zIndex: 10
        },
        td: {
          padding: '1rem',
          textAlign: 'left',
          borderBottom: '1px solid #333333',
          color: '#cccccc'
        },
        leaderboard: {
          listStyle: 'none',
          margin: 0,
          padding: 0,
          height: '350px',
          overflowY: 'auto',
          flex: 1
        },
        leaderboardItem: {
          display: 'flex',
          alignItems: 'center',
          padding: '1.5rem 0',
          borderBottom: '1px solid #333333',
          transition: 'all 0.3s ease'
        },
        rank: {
          backgroundColor: '#ffffff',
          color: '#000000',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '1.1rem'
        },
        studentName: {
          flex: 1,
          marginLeft: '1.5rem',
          fontWeight: 600,
          fontSize: '1.1rem',
          color: '#ffffff'
        },
        score: {
          fontWeight: 700,
          color: '#ffffff',
          fontSize: '1.3rem'
        },
        alert: {
          padding: '1.5rem',
          borderRadius: '12px',
          margin: '1rem 0',
          borderLeft: '4px solid #ffffff',
          backgroundColor: '#111111',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem'
        },
        metricsGrid: {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1.5rem',
          height: '350px',
          flex: 1
        },
        metricCard: {
          textAlign: 'center',
          padding: '2rem 1.5rem',
          backgroundColor: '#000000',
          color: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #333333',
          transition: 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        },
        metricValue: {
          fontSize: '2.5rem',
          fontWeight: 800,
          marginBottom: '0.5rem',
          color: '#ffffff'
        },
        metricLabel: {
          fontSize: '1rem',
          fontWeight: 500,
          color: '#cccccc'
        },
        themeToggle: {
          backgroundColor: '#333333',
          color: '#ffffff',
          border: 'none',
          borderRadius: '50px',
          padding: '0.75rem 1.5rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem',
          fontWeight: '600',
          transition: 'all 0.3s ease'
        }
      };
    } else {
      return {
        container: {
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          backgroundColor: 'transparent',
          minHeight: 'auto',
          padding: '0',
          color: 'inherit',
          transition: 'all 0.3s ease'
        },
        statusBar: {
          backgroundColor: '#f8f9fa',
          borderRadius: '16px',
          padding: '1rem 2rem',
          marginBottom: '2rem',
          fontSize: '0.9rem',
          color: '#495057',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid #e9ecef',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        },
        grid: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '2rem',
          maxWidth: '1600px',
          margin: '0 auto'
        },
        widget: {
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '2rem',
          border: '1px solid #e9ecef',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          height: '500px',
          display: 'flex',
          flexDirection: 'column'
        },
        wideWidget: {
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '2rem',
          border: '1px solid #e9ecef',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
          gridColumn: 'span 2',
          transition: 'all 0.3s ease'
        },
        widgetTitle: {
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '1.4rem',
          fontWeight: 700,
          color: '#212529',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid #e9ecef',
          flexShrink: 0
        },
        chartContainer: {
          height: '350px',
          width: '100%',
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          flex: 1
        },
        failedProblemsContainer: {
          height: '350px',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: '8px',
          flex: 1
        },
        table: {
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.95rem',
          backgroundColor: '#ffffff'
        },
        th: {
          padding: '1rem',
          textAlign: 'left',
          backgroundColor: '#f8f9fa',
          color: '#212529',
          fontWeight: 600,
          fontSize: '0.9rem',
          borderBottom: '2px solid #e9ecef',
          position: 'sticky',
          top: 0,
          zIndex: 10
        },
        td: {
          padding: '1rem',
          textAlign: 'left',
          borderBottom: '1px solid #e9ecef',
          color: '#495057'
        },
        leaderboard: {
          listStyle: 'none',
          margin: 0,
          padding: 0,
          height: '350px',
          overflowY: 'auto',
          flex: 1
        },
        leaderboardItem: {
          display: 'flex',
          alignItems: 'center',
          padding: '1.5rem 0',
          borderBottom: '1px solid #e9ecef',
          transition: 'all 0.3s ease'
        },
        rank: {
          backgroundColor: '#000000',
          color: '#ffffff',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '1.1rem'
        },
        studentName: {
          flex: 1,
          marginLeft: '1.5rem',
          fontWeight: 600,
          fontSize: '1.1rem',
          color: '#212529'
        },
        score: {
          fontWeight: 700,
          color: '#000000',
          fontSize: '1.3rem'
        },
        alert: {
          padding: '1.5rem',
          borderRadius: '12px',
          margin: '1rem 0',
          borderLeft: '4px solid #000000',
          backgroundColor: '#f8f9fa',
          color: '#212529',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem'
        },
        metricsGrid: {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1.5rem',
          height: '350px',
          flex: 1
        },
        metricCard: {
          textAlign: 'center',
          padding: '2rem 1.5rem',
          backgroundColor: '#f8f9fa',
          color: '#212529',
          borderRadius: '16px',
          border: '1px solid #e9ecef',
          transition: 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        },
        metricValue: {
          fontSize: '2.5rem',
          fontWeight: 800,
          marginBottom: '0.5rem',
          color: '#000000'
        },
        metricLabel: {
          fontSize: '1rem',
          fontWeight: 500,
          color: '#495057'
        },
        themeToggle: {
          backgroundColor: '#f8f9fa',
          color: '#212529',
          border: '2px solid #e9ecef',
          borderRadius: '50px',
          padding: '0.75rem 1.5rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem',
          fontWeight: '600',
          transition: 'all 0.3s ease'
        }
      };
    }
  };

  // Dynamic theme-based chart options
  const getThemeChartOptions = () => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: isDarkMode ? '#ffffff' : '#212529',
            font: {
              size: 12,
              family: 'Inter, sans-serif',
              weight: '500'
            },
            padding: 20,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: isDarkMode ? '#000000' : '#ffffff',
          titleColor: isDarkMode ? '#ffffff' : '#000000',
          bodyColor: isDarkMode ? '#cccccc' : '#495057',
          cornerRadius: 8,
          displayColors: false,
          borderColor: isDarkMode ? '#333333' : '#e9ecef',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          ticks: {
            color: isDarkMode ? '#cccccc' : '#495057',
            font: {
              size: 11,
              family: 'Inter, sans-serif'
            },
            maxTicksLimit: 8
          },
          grid: {
            color: isDarkMode ? '#333333' : '#e9ecef',
            borderDash: [2, 2]
          },
          border: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: isDarkMode ? '#cccccc' : '#495057',
            font: {
              size: 11,
              family: 'Inter, sans-serif'
            },
            maxTicksLimit: 6
          },
          grid: {
            color: isDarkMode ? '#333333' : '#e9ecef',
            borderDash: [2, 2]
          },
          border: {
            display: false
          }
        }
      }
    };
    return baseOptions;
  };

  const styles = getThemeStyles();
  const chartOptions = getThemeChartOptions();

  if (loading && !dashboardData) {
    return (
      <div style={styles.container}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <RefreshCw size={48} style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>
            Loading Enhanced Analytics Dashboard...
          </div>
          <div style={{ color: isDarkMode ? '#cccccc' : '#6b7280' }}>
            Processing submission results...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <AlertTriangle size={48} color="#f87171" />
          <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#f87171' }}>
            Unable to connect to the analytics API
          </div>
          <div style={{ color: isDarkMode ? '#cccccc' : '#6b7280', textAlign: 'center' }}>
            {error}
          </div>
          <button
            onClick={() => fetchDashboardData()}
            style={{
              ...styles.themeToggle,
              marginTop: '1rem'
            }}
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Status Bar */}
      <div style={styles.statusBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Activity size={20} />
          <span style={{ fontWeight: '600' }}>Enhanced Live Analytics Dashboard</span>
          <div style={{
            fontSize: '0.8rem',
            padding: '0.25rem 0.75rem',
            backgroundColor: '#dcfce7',
            color: '#166534',
            borderRadius: '12px',
            fontWeight: '600'
          }}>
            LIVE
          </div>
        </div>


        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem' }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>


          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              background: 'none',
              border: '1px solid #e9ecef',
              color: 'inherit',
              borderRadius: '8px',
              padding: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem'
            }}
          >
            <RefreshCw size={14} style={{
              animation: autoRefresh ? 'spin 2s linear infinite' : 'none'
            }} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </button>
        </div>
      </div>


      {/* Main Grid */}
      <div style={styles.grid}>
        {/* ✅ EXISTING WIDGETS: Topic Performance */}
        <div style={styles.widget}>
          <div style={styles.widgetTitle}>
            <BookOpen size={24} />
            Topic Performance
          </div>
          <div style={styles.chartContainer}>
            {getTopicData() ? (
              <Bar data={getTopicData()} options={chartOptions} />
            ) : (
              <NoDataDisplay icon={BookOpen} message="No topic data available" />
            )}
          </div>
        </div>

        {/* ✅ EXISTING WIDGETS: Time Trends */}
        <div style={styles.widget}>
          <div style={styles.widgetTitle}>
            <Clock size={24} />
            Submission Trends
          </div>
          <div style={styles.chartContainer}>
            {getTimeData() ? (
              <Line data={getTimeData()} options={chartOptions} />
            ) : (
              <NoDataDisplay icon={Clock} message="No time trend data available" />
            )}
          </div>
        </div>

        {/* ✅ EXISTING WIDGETS: Daily Activity */}
        <div style={styles.widget}>
          <div style={styles.widgetTitle}>
            <Users size={24} />
            Daily Activity
          </div>
          <div style={styles.chartContainer}>
            {getActivityData() ? (
              <Bar data={getActivityData()} options={chartOptions} />
            ) : (
              <NoDataDisplay icon={Users} message="No activity data available" />
            )}
          </div>
        </div>

        {/* ✅ EXISTING WIDGETS: Key Metrics */}
        <div style={styles.widget}>
          <div style={styles.widgetTitle}>
            <Target size={24} />
            Key Metrics
          </div>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricValue}>
                {dashboardData?.metrics?.avg_score || '0.0'}%
              </div>
              <div style={styles.metricLabel}>Average Score</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricValue}>
                {dashboardData?.metrics?.active_students || '0'}
              </div>
              <div style={styles.metricLabel}>Active Students</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricValue}>
                {dashboardData?.metrics?.total_submissions || '0'}
              </div>
              <div style={styles.metricLabel}>Total Submissions</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricValue}>
                {dashboardData?.metrics?.submission_rate || '0.0'}%
              </div>
              <div style={styles.metricLabel}>Success Rate</div>
            </div>
          </div>
        </div>

        {/* ✅ NEW CHART 1: Question Difficulty Distribution */}
        <div style={styles.widget}>
          <div style={styles.widgetTitle}>
            <Target size={24} />
            Difficulty Distribution
          </div>
          <div style={styles.chartContainer}>
            {getDifficultyDistributionData() ? (
              <Pie
                data={getDifficultyDistributionData()}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      ...chartOptions.plugins.legend,
                      position: 'bottom'
                    }
                  }
                }}
              />
            ) : (
              <NoDataDisplay icon={Target} message="No difficulty data available" />
            )}
          </div>
        </div>

        {/* ✅ ENHANCED: Student Progress Over Time with Course Filtering */}
        <div style={styles.widget}>
          <div style={styles.widgetTitle}>
            <TrendingUp size={24} />
            Student Progress
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {/* Course Filter Dropdown */}
              <select
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setSelectedStudentsForProgress([]); // Reset student selection when changing course
                }}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  border: `1px solid ${isDarkMode ? '#333333' : '#e9ecef'}`,
                  backgroundColor: isDarkMode ? '#000000' : '#ffffff',
                  color: isDarkMode ? '#ffffff' : '#212529',
                  fontSize: '0.8rem'
                }}
              >
                <option value="all">All Courses</option>
                {availableCourses.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>

              {/* Student Selector Button */}
              <button
                onClick={() => setShowStudentSelector(true)}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  border: `1px solid ${isDarkMode ? '#333333' : '#e9ecef'}`,
                  backgroundColor: isDarkMode ? '#333333' : '#f8f9fa',
                  color: isDarkMode ? '#ffffff' : '#212529',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
                title="Select specific students"
              >
                <Users size={14} />
                {selectedStudentsForProgress.length > 0
                  ? `${selectedStudentsForProgress.length} Selected`
                  : 'Select Students'
                }
              </button>
            </div>
          </div>
          <div style={styles.chartContainer}>
            {getStudentProgressData() ? (
              <Line
                data={getStudentProgressData()}
                options={{
                  ...chartOptions,
                  scales: {
                    ...chartOptions.scales,
                    y: {
                      ...chartOptions.scales.y,
                      min: 0,
                      max: 100,
                      ticks: {
                        ...chartOptions.scales.y.ticks,
                        callback: function (value) {
                          return value + '%';
                        }
                      }
                    }
                  },
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      ...chartOptions.plugins.legend,
                      display: true,
                      position: 'top',
                      labels: {
                        ...chartOptions.plugins.legend.labels,
                        boxWidth: 12,
                        font: { size: 10 }
                      }
                    }
                  }
                }}
              />
            ) : (
              <NoDataDisplay icon={TrendingUp} message="No student progress data available" />
            )}
          </div>
        </div>

        {/* ✅ NEW CHART 3: Submission Status Breakdown */}
        <div style={styles.widget}>
          <div style={styles.widgetTitle}>
            <AlertTriangle size={24} />
            Status Breakdown
          </div>
          <div style={styles.chartContainer}>
            {getStatusBreakdownData() ? (
              <Pie
                data={getStatusBreakdownData()}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      ...chartOptions.plugins.legend,
                      position: 'bottom'
                    }
                  }
                }}
              />
            ) : (
              <NoDataDisplay icon={AlertTriangle} message="No status data available" />
            )}
          </div>
        </div>

        {/* ✅ NEW CHART 4: Weekly Performance Heatmap */}
        <div style={styles.widget}>
          <div style={styles.widgetTitle}>
            <Activity size={24} />
            Weekly Performance
          </div>
          <PerformanceHeatmap data={dashboardData?.performance_heatmap || []} />
        </div>

        {/* ✅ EXISTING WIDGETS: Student Leaderboard */}
        <div style={styles.widget}>
          <div style={styles.widgetTitle}>
            <Trophy size={24} />
            Student Leaderboard
          </div>
          <div style={styles.leaderboard}>
            {dashboardData?.leaderboard && dashboardData.leaderboard.length > 0 ? (
              dashboardData.leaderboard.map((student) => (
                <div key={student.id} style={styles.leaderboardItem}>
                  <div style={styles.rank}>
                    {student.rank}
                  </div>
                  <div style={styles.studentName}>
                    {student.name}
                  </div>
                  <div style={styles.score}>
                    {student.score}%
                  </div>
                </div>
              ))
            ) : (
              <NoDataDisplay icon={Trophy} message="Waiting for student submissions..." />
            )}
          </div>
        </div>

        {/* ✅ EXISTING WIDGETS: Failed Problems */}
        <div style={styles.wideWidget}>
          <div style={styles.widgetTitle}>
            <Bug size={24} />
            Problem Analysis
          </div>
          <div style={styles.failedProblemsContainer}>
            {dashboardData?.failed_problems && dashboardData.failed_problems.length > 0 ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Problem</th>
                    <th style={styles.th}>Failure Rate</th>
                    <th style={styles.th}>Attempts</th>
                    <th style={styles.th}>Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.failed_problems.map((problem, index) => (
                    <tr key={index}>
                      <td style={styles.td}>{problem.name}</td>
                      <td style={styles.td}>{problem.failure_rate}%</td>
                      <td style={styles.td}>{problem.attempts}</td>
                      <td style={styles.td}>{problem.difficulty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <NoDataDisplay icon={Bug} message="All problems are being solved successfully!" />
            )}
          </div>
        </div>

        {/* ✅ EXISTING WIDGETS: Alerts */}
        <div style={styles.wideWidget}>
          <div style={styles.widgetTitle}>
            <AlertTriangle size={24} />
            System Alerts
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {dashboardData?.alerts && dashboardData.alerts.length > 0 ? (
              dashboardData.alerts.map((alert) => (
                <div key={alert.id} style={styles.alert}>
                  <AlertTriangle size={20} style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                      {alert.title}
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                      {alert.message}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <NoDataDisplay icon={HelpCircle} message="System is running smoothly! 🎉" />
            )}
          </div>
        </div>
      </div>

      {/* ✅ NEW: Add Student Selector Modal */}
      <StudentSelector />
    </>
  );
};


export default AnalyticsPage;
