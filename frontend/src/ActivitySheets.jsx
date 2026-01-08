// ActivitySheets.jsx
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Search, Plus, Edit, Trash2, Eye, Clock, Users, FileText, Upload, 
  BarChart3, TrendingUp, UserCheck, CheckCircle2, Archive, FileDown, 
  AlertCircle, ClipboardList, Play, Save, User, Code, FileCode, Star, 
  RefreshCw as Sync
} from "lucide-react";
import ActivitySubmissions from './components/ActivitySubmissions';
import { toast } from "sonner";

// Utility functions
const formatDate = (date) => {
  if (!date) return '';
  try {
    // Convert UTC to IST (UTC + 5:30)
    const utcDate = new Date(date);
    const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
    return istDate.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

const getBaseUrl = () => {
  const currentUrl = new URL(window.location.origin);
  return `${currentUrl.protocol}//${currentUrl.hostname}:8000`;
};

// Helper function to convert IST datetime-local input to UTC
const istToUtc = (istDateString) => {
  // When user selects a time in datetime-local, it's in their local timezone
  // We need to convert it to UTC for the backend
  const localDate = new Date(istDateString);
  return localDate.toISOString();
};

// Helper function to convert UTC to IST for datetime-local input
const utcToIstInput = (utcDate) => {
  if (!utcDate) return '';
  try {
    // Convert UTC to IST for display in datetime-local input
    const date = new Date(utcDate);
    // Add 5.5 hours to convert UTC to IST
    const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    return istDate.toISOString().slice(0, 16);
  } catch (error) {
    console.error('Date conversion error:', error);
    return '';
  }
};

const getAuthHeaders = (includeContentType = true) => {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('authToken');
  if (!token) return includeContentType ? { 'Content-Type': 'application/json' } : {};
  const headers = { 'Authorization': `Bearer ${token}` };
  if (includeContentType) headers['Content-Type'] = 'application/json';
  return headers;
};

const checkAuthToken = () => {
  // Try multiple possible token keys
  const tokenKeys = ['token', 'access_token', 'authToken', 'accessToken'];
  let token = null;
  for (const key of tokenKeys) {
    token = localStorage.getItem(key);
    if (token) {
      localStorage.setItem('token', token);
      break;
    }
  }
  if (!token) return false;
  // Simple JWT validation: check expiry
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      tokenKeys.forEach(key => localStorage.removeItem(key));
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const makeAuthenticatedRequest = async (url, options = {}) => {
  if (!checkAuthToken()) throw new Error('No valid authentication token');
  const defaultOptions = { headers: getAuthHeaders() };
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...options.headers }
  };
  try {
    const response = await fetch(url, mergedOptions);
    // Handle auth errors
    if (response.status === 401) {
      ['token', 'access_token', 'authToken', 'accessToken'].forEach(key => { localStorage.removeItem(key); });
      toast.error('Session expired. Please log in again.');
      setTimeout(() => { window.location.href = '/login'; }, 2000);
      throw new Error('Authentication failed');
    }
    if (response.status === 403) {
      toast.error('You do not have permission to perform this action');
      throw new Error('Permission denied');
    }
    return response;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      toast.error('Network error. Please check your connection.');
      throw new Error('Network error');
    }
    throw error;
  }
};

// Status badge utility
const getStatusBadge = (status) => {
  switch (status) {
    case 'active':
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>;
    case 'archived':
      return <Badge variant="secondary" className="bg-gray-200 text-gray-700">Archived</Badge>;
    case 'pending':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    case 'completed':
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Completed</Badge>;
    default:
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">{status || 'Unknown'}</Badge>;
  }
};

// Helper function to get student display name
const getStudentDisplayName = (submission, profiles = []) => {
  // Try to find profile by user_id or student_id
  const profile = profiles.find(p => 
    p.user_id === submission.student_id || 
    p.user_id === submission.user_id
  );
  
  if (profile && profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }
  
  if (submission.student_name) {
    return submission.student_name;
  }
  if (submission.student_email) {
    return submission.student_email;
  }
  if (submission.student_id) {
    return `Student ${submission.student_id.slice(0, 8)}`;
  }
  return 'Unknown Student';
};

// Simple syntax highlighter for code
const highlightCode = (code, language) => {
  if (!code) return 'No code submitted';
  
  // Define color schemes for different languages
  const keywords = {
    python: ['def', 'class', 'import', 'from', 'if', 'elif', 'else', 'for', 'while', 'return', 'try', 'except', 'finally', 'with', 'as', 'in', 'is', 'not', 'and', 'or', 'True', 'False', 'None', 'pass', 'break', 'continue', 'lambda', 'yield', 'async', 'await'],
    javascript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'try', 'catch', 'finally', 'class', 'extends', 'import', 'export', 'default', 'async', 'await', 'new', 'this', 'true', 'false', 'null', 'undefined'],
    java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'final', 'void', 'int', 'String', 'boolean', 'if', 'else', 'for', 'while', 'return', 'try', 'catch', 'finally', 'new', 'this', 'true', 'false', 'null'],
    cpp: ['int', 'float', 'double', 'char', 'void', 'class', 'struct', 'public', 'private', 'protected', 'if', 'else', 'for', 'while', 'return', 'try', 'catch', 'new', 'delete', 'true', 'false', 'nullptr', 'const', 'static'],
    c: ['int', 'float', 'double', 'char', 'void', 'struct', 'if', 'else', 'for', 'while', 'return', 'const', 'static', 'typedef', 'sizeof']
  };
  
  const langKeywords = keywords[language?.toLowerCase()] || keywords.python;
  
  // Escape HTML
  let highlighted = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Highlight strings
  highlighted = highlighted.replace(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g, '<span style="color: #22863a;">$1$2$1</span>');
  
  // Highlight comments
  highlighted = highlighted.replace(/(#.*$)/gm, '<span style="color: #6a737d; font-style: italic;">$1</span>');
  highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span style="color: #6a737d; font-style: italic;">$1</span>');
  highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color: #6a737d; font-style: italic;">$1</span>');
  
  // Highlight numbers
  highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span style="color: #005cc5;">$1</span>');
  
  // Highlight keywords
  langKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
    highlighted = highlighted.replace(regex, '<span style="color: #d73a49; font-weight: 600;">$1</span>');
  });
  
  // Highlight function calls
  highlighted = highlighted.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, '<span style="color: #6f42c1;">$1</span>(');
  
  return highlighted;
};

// ================ MAIN COMPONENT ================
const ActivitySheets = () => {
  const [activities, setActivities] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('activities');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('all');

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showReportsDialog, setShowReportsDialog] = useState(false);
  const [showSubmissionsDialog, setShowSubmissionsDialog] = useState(false);

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [assigning, setAssigning] = useState(false);

  
  // Forms and dialog data
  const defaultFormData = {
    title: '',
    description: '',
    course_id: '',
    start_time: new Date(),
    end_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
    max_attempts: 1,
    max_score: 100,
    file: null
  };
  const [formData, setFormData] = useState({ ...defaultFormData });

  // Reset form function
  const resetForm = () => setFormData({ ...defaultFormData });

  // Assignment
  const [assignmentType, setAssignmentType] = useState('manual');
  const [assignmentStudentIds, setAssignmentStudentIds] = useState([]);

  // Reports
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // New state for Reports tab
  const [reportActivities, setReportActivities] = useState([]);
  const [selectedReportActivity, setSelectedReportActivity] = useState(null);
  const [activitySubmissions, setActivitySubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loadingReportActivities, setLoadingReportActivities] = useState(false);
  const [runningCode, setRunningCode] = useState(false);
  const [codeOutput, setCodeOutput] = useState({});
  const [userInput, setUserInput] = useState('');
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [gradeInput, setGradeInput] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);
  const [currentQuestionForInput, setCurrentQuestionForInput] = useState(null);

  // Add new state for PDF handling
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Add new state for local grade storage
  const [localGrades, setLocalGrades] = useState({});
  
  // Add new state for student profiles
  const [studentProfiles, setStudentProfiles] = useState([]);

  // Grading state for backend API
  const [activityGrades, setActivityGrades] = useState([]); // Backend grades
  const [publishing, setPublishing] = useState(false);
  const [gradeComments, setGradeComments] = useState('');
  const [activityGradingStatuses, setActivityGradingStatuses] = useState({}); // Map of activity_id -> status

  useEffect(() => {
    if (!checkAuthToken()) {
      toast.error('Please log in to access this page');
      setTimeout(() => { window.location.href = '/login'; }, 2000);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchCourses(),
      fetchStudents()
    ]).then(fetchActivities).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (courses.length > 0) {
      fetchActivities();
    }
  }, [selectedCourse]);

  // Fetch all
  const fetchActivities = async () => {
    try {
      setLoading(true);
      const baseUrl = getBaseUrl();
      const params = new URLSearchParams();
      if (selectedCourse && selectedCourse !== 'all') { params.append('course_id', selectedCourse); }
      const url = `${baseUrl}/activities/${params.toString() ? '?' + params.toString() : ''}`;
      const response = await makeAuthenticatedRequest(url, {});
      const data = response.ok ? await response.json() : [];
      setActivities(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error.message !== 'Authentication failed') { toast.error('Failed to load activities'); }
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };
  const fetchCourses = async () => {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/courses/`;
      const response = await makeAuthenticatedRequest(url, {});
      const data = response.ok ? await response.json() : [];
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error.message !== 'Authentication failed') { toast.error('Failed to load courses'); }
      setCourses([]);
    }
  };
  const fetchStudents = async () => {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/users/`;
      const response = await makeAuthenticatedRequest(url, {});
      const data = response.ok ? await response.json() : [];
      setStudents(Array.isArray(data) ? data.filter(user => user.role === 'student') : []);
    } catch (error) {
      if (error.message !== 'Authentication failed') { toast.error('Failed to load students'); }
      setStudents([]);
    }
  };

  // Update the form handling functions in ActivitySheets.jsx

// --------- FILE UPLOAD (multipart/form-data) logic for CREATE ----------
const handleCreateActivity = async () => {
  if (!formData.title || !formData.course_id || !formData.start_time || !formData.end_time) {
    toast.error('Please fill in all required fields');
    return;
  }
  if (formData.start_time >= formData.end_time) {
    toast.error('End time must be after start time');
    return;
  }
  setCreating(true);
  try {
    const baseUrl = getBaseUrl();
    // Use FormData for file uploads!
    const multipart = new FormData();
    multipart.append('title', formData.title);
    multipart.append('description', formData.description || '');
    multipart.append('course_id', formData.course_id);
    multipart.append('start_time', formData.start_time.toISOString());
    multipart.append('end_time', formData.end_time.toISOString());
    multipart.append('max_attempts', formData.max_attempts.toString());
    multipart.append('max_score', formData.max_score.toString());
    if (formData.file) {
      multipart.append('file', formData.file);
    }

    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('authToken');
    const response = await fetch(`${baseUrl}/activities/`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: multipart
    });
    
    if (response.ok) {
      toast.success('Activity created successfully');
      setShowCreateDialog(false);
      await fetchActivities();
      resetForm();
    } else {
      let errorMessage = 'Failed to create activity';
      try {
        const errJson = await response.json();
        if (errJson.detail) {
          errorMessage = Array.isArray(errJson.detail)
            ? errJson.detail.map(e => e.msg || e).join(', ')
            : errJson.detail;
        }
      } catch { errorMessage = 'Failed to create activity'; }
      toast.error(errorMessage);
    }
  } catch (e) {
    console.error('Create activity error:', e);
    toast.error('Failed to create activity');
  } finally {
    setCreating(false);
  }
};

// --------- FILE UPLOAD (multipart/form-data) logic for EDIT ----------
const handleUpdateActivity = async () => {
  if (!selectedActivity || !formData.title || !formData.start_time || !formData.end_time) {
    toast.error('Please fill in all required fields'); 
    return;
  }
  if (formData.start_time >= formData.end_time) {
    toast.error('End time must be after start time'); 
    return;
  }
  setUpdating(true);
  try {
    const baseUrl = getBaseUrl();
    // Always use FormData for updates to handle potential file uploads
    const multipart = new FormData();
    multipart.append('title', formData.title);
    multipart.append('description', formData.description || '');
    multipart.append('start_time', formData.start_time.toISOString());
    multipart.append('end_time', formData.end_time.toISOString());
    multipart.append('max_attempts', formData.max_attempts.toString());
    multipart.append('max_score', formData.max_score.toString());
    
    if (formData.file) {
      multipart.append('file', formData.file);
    }

    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('authToken');
    const response = await fetch(`${baseUrl}/activities/${selectedActivity.id}`, {
      method: 'PUT',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: multipart
    });
    
    if (response.ok) {
      toast.success('Activity updated successfully');
      setShowEditDialog(false);
      await fetchActivities();
      resetForm();
    } else {
      let errorMessage = 'Failed to update activity';
      try {
        const errJson = await response.json();
        if (errJson.detail) {
          errorMessage = Array.isArray(errJson.detail)
            ? errJson.detail.map(e => e.msg || e).join(', ')
            : errJson.detail;
        }
      } catch { errorMessage = 'Failed to update activity'; }
      toast.error(errorMessage);
    }
  } catch (e) {
    console.error('Update activity error:', e);
    toast.error('Failed to update activity');
  } finally {
    setUpdating(false);
  }
};


  // ---------------- DELETE & ARCHIVE
  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm('Are you sure you want to delete this activity? This cannot be undone.')) return;
    try {
      const baseUrl = getBaseUrl();
      const response = await makeAuthenticatedRequest(`${baseUrl}/activities/${activityId}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Activity deleted successfully');
        await fetchActivities();
      } else {
        toast.error('Failed to delete activity');
      }
    } catch (e) {
      toast.error('Failed to delete activity');
    }
  };

  const handleArchiveActivity = async (activityId) => {
    if (!window.confirm('Are you sure you want to archive this activity?')) return;
    try {
      const baseUrl = getBaseUrl();
      const response = await makeAuthenticatedRequest(`${baseUrl}/activities/${activityId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'archived' })
      });
      if (response.ok) {
        toast.success('Activity archived successfully');
        await fetchActivities();
      } else {
        toast.error('Failed to archive activity');
      }
    } catch (e) {
      toast.error('Failed to archive activity');
    }
  };

  // ==================== Assign Students Dialog (Exam-style) ====================
  // Show all eligible students, with bulk "select all" (manual or by-course)
  const openAssignDialog = (activity) => {
    setSelectedActivity(activity);
    setAssignmentType('manual');
    setAssignmentStudentIds([]);
    setShowAssignDialog(true);
  };

  const handleAssignStudents = async () => {
    if (!selectedActivity) {
      toast.error('No activity selected'); return;
    }
    if (assignmentType === 'manual' && assignmentStudentIds.length === 0) {
      toast.error('Please select at least one student'); return;
    }
    setAssigning(true);
    try {
      const baseUrl = getBaseUrl();
      let response;
      if (assignmentType === 'course') {
        response = await makeAuthenticatedRequest(`${baseUrl}/activities/${selectedActivity.id}/assign-course/`, { method: 'POST' });
      } else {
        response = await makeAuthenticatedRequest(`${baseUrl}/activities/${selectedActivity.id}/assign/`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ student_ids: assignmentStudentIds })
        });
      }
      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Students assigned successfully');
        setShowAssignDialog(false);
      } else {
        toast.error('Failed to assign students');
      }
    } catch (e) {
      toast.error('Failed to assign students');
    } finally {
      setAssigning(false);
    }
  };

  // PDF Preview - Improved error handling
  const handlePreviewPdf = async (activity) => {
    try {
      const baseUrl = getBaseUrl();
      const response = await makeAuthenticatedRequest(`${baseUrl}/activities/${activity.id}/pdf/`, {});
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("No PDF file attached to this activity");
        } else {
          toast.error("Unable to load PDF file");
        }
        return;
      }
      
      // Check if response has content
      const blob = await response.blob();
      if (blob.size === 0) {
        toast.error("PDF file is empty or corrupted");
        return;
      }
      
      // Open PDF in new tab
      const fileUrl = window.URL.createObjectURL(blob);
      const newWindow = window.open(fileUrl, '_blank');
      
      if (!newWindow) {
        toast.error("Popup blocked. Please allow popups for this site.");
        window.URL.revokeObjectURL(fileUrl);
        return;
      }
      
      // Clean up URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(fileUrl);
      }, 1000);
      
    } catch (e) {
      console.error('PDF preview error:', e);
      toast.error("Unable to preview PDF file");
    }
  };

  // Define openReportsDialog to fix the error
  const openReportsDialog = (activity) => {
    setSelectedActivity(activity);
    setShowReportsDialog(true);
    fetchActivityReport(activity.id);
  };

  // Open Edit Dialog function
  const openEditDialog = (activity) => {
    setSelectedActivity(activity);
    setFormData({
      title: activity.title || '',
      description: activity.description || '',
      course_id: activity.course_id || '',
      start_time: activity.start_time ? new Date(activity.start_time) : new Date(),
      end_time: activity.end_time ? new Date(activity.end_time) : new Date(Date.now() + 24 * 60 * 60 * 1000),
      max_attempts: activity.max_attempts || 1,
      max_score: activity.max_score || 100,
      file: null
    });
    setShowEditDialog(true);
  };

  // Report
  const fetchActivityReport = async (activityId) => {
    try {
      setLoadingReport(true);
      const baseUrl = getBaseUrl();
      const response = await makeAuthenticatedRequest(`${baseUrl}/activities/${activityId}/statistics/`, {});
      
      if (response.ok) {
        const data = await response.json();
        setReportData(data || null);
      } else {
        console.error('Statistics endpoint failed:', response.status);
        // Don't show error for statistics, just set empty data
        setReportData(null);
      }
    } catch (e) {
      console.error('Failed to load report:', e);
      // Don't show toast error for statistics endpoint
      setReportData(null);
    } finally {
      setLoadingReport(false);
    }
  };
  const handleExportExcel = async (activityId) => {
    try {
      const baseUrl = getBaseUrl();
      const response = await makeAuthenticatedRequest(`${baseUrl}/activities/${activityId}/report/excel/`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity_report_${activityId}_${Date.now()}.xlsx`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
        toast.success('Report exported successfully');
      } else {
        toast.error('Failed to export report');
      }
    } catch (e) {
      toast.error('Failed to export report');
    }
  };

  // New functions for Reports tab
  const fetchReportActivities = async () => {
    try {
      setLoadingReportActivities(true);
      const baseUrl = getBaseUrl();
      const response = await makeAuthenticatedRequest(`${baseUrl}/activities/`, {});
      const data = response.ok ? await response.json() : [];
      const activities = Array.isArray(data) ? data : [];
      setReportActivities(activities);
      
      // Fetch student profiles once for all submissions
      await fetchStudentProfiles();
      
      // Fetch grading status for each activity
      await fetchAllGradingStatuses(activities);
    } catch (error) {
      if (error.message !== 'Authentication failed') {
        toast.error('Failed to load activities for reports');
      }
      setReportActivities([]);
    } finally {
      setLoadingReportActivities(false);
    }
  };

  // Fetch grading statuses for all activities
  const fetchAllGradingStatuses = async (activities) => {
    const baseUrl = getBaseUrl();
    const statusPromises = activities.map(async (activity) => {
      try {
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/activity-grades/activity/${activity.id}/grading-status`,
          {}
        );
        if (response.ok) {
          const status = await response.json();
          return { activityId: activity.id, status };
        }
      } catch (error) {
        console.error(`Failed to fetch status for activity ${activity.id}:`, error);
      }
      return null;
    });

    const results = await Promise.all(statusPromises);
    const statusMap = {};
    results.forEach(result => {
      if (result) {
        statusMap[result.activityId] = result.status;
      }
    });
    setActivityGradingStatuses(statusMap);
  };

  // Fetch all student profiles
  const fetchStudentProfiles = async () => {
    try {
      const baseUrl = getBaseUrl();
      const response = await makeAuthenticatedRequest(`${baseUrl}/student-profiles/?skip=0&limit=1000`, {});
      if (response.ok) {
        const data = await response.json();
        setStudentProfiles(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch student profiles:', error);
      setStudentProfiles([]);
    }
  };

  const fetchActivitySubmissions = async (activityId) => {
    try {
      setLoadingSubmissions(true);
      const baseUrl = getBaseUrl();
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/activities/activities/${activityId}/submissions`,
        {}
      );
      if (response.ok) {
        const data = await response.json();
        // Process submissions to ensure we have proper student names
        const processedSubmissions = (data.submissions || []).map(submission => ({
          ...submission,
          student_name: submission.student_name || submission.student_email || `Student ${submission.student_id?.slice(0, 8)}` || 'Unknown Student',
          // Apply local grades if they exist
          score: localGrades[submission.submission_id]?.score ?? submission.score,
          is_evaluated: localGrades[submission.submission_id]?.is_evaluated ?? submission.is_evaluated
        }));
        setActivitySubmissions(processedSubmissions);
      } else {
        setActivitySubmissions([]);
        toast.error('Failed to load submissions');
      }
    } catch (error) {
      if (error.message !== 'Authentication failed') {
        toast.error('Failed to load submissions');
      }
      setActivitySubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Fetch activity grades from backend
  const fetchActivityGrades = async (activityId) => {
    try {
      const baseUrl = getBaseUrl();
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/activity-grades/activity/${activityId}/grades`,
        {}
      );
      if (response.ok) {
        const data = await response.json();
        setActivityGrades(data);
        
        // Map grades to submissions
        const gradesMap = {};
        data.forEach(grade => {
          gradesMap[grade.submission_id] = grade;
        });
        
        // Update submissions with grade info
        setActivitySubmissions(prev => {
          const updatedSubmissions = prev.map(sub => ({
            ...sub,
            grade: gradesMap[sub.submission_id],
            score: gradesMap[sub.submission_id]?.score ?? sub.score,
            is_evaluated: gradesMap[sub.submission_id]?.status === 'published'
          }));
          
          // If a submission is currently selected, update its grade input
          setSelectedSubmission(currentSelected => {
            if (currentSelected) {
              const updatedSelected = updatedSubmissions.find(
                s => s.submission_id === currentSelected.submission_id
              );
              if (updatedSelected) {
                const grade = updatedSelected.grade;
                if (grade) {
                  setGradeInput(grade.score?.toString() || '');
                  setGradeComments(grade.comments || '');
                }
                return updatedSelected;
              }
            }
            return currentSelected;
          });
          
          return updatedSubmissions;
        });
      }
    } catch (error) {
      console.error('Failed to fetch grades:', error);
    }
  };

  // Publish all grades for an activity
  const handlePublishAllGrades = async () => {
    if (!selectedReportActivity) return;
    
    setPublishing(true);
    try {
      const baseUrl = getBaseUrl();
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/activity-grades/activity/${selectedReportActivity.id}/publish-all`,
        {
          method: 'POST'
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        // Refresh grading status and grades
        await fetchActivityGrades(selectedReportActivity.id);
        // Refresh the grading status for the current activity
        await fetchAllGradingStatuses([selectedReportActivity]);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to publish grades');
      }
    } catch (error) {
      toast.error('Failed to publish grades');
    } finally {
      setPublishing(false);
    }
  };

  // Add function to fetch PDF with authentication
  const fetchPdfBlob = async (activityId) => {
    try {
      setLoadingPdf(true);
      const baseUrl = getBaseUrl();
      const response = await makeAuthenticatedRequest(`${baseUrl}/activities/${activityId}/pdf/`, {});
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("No PDF file attached to this activity");
        } else {
          toast.error("Unable to load PDF file");
        }
        setPdfUrl(null);
        return;
      }
      
      const blob = await response.blob();
      if (blob.size === 0) {
        toast.error("PDF file is empty or corrupted");
        setPdfUrl(null);
        return;
      }
      
      // Create object URL for the blob
      const fileUrl = URL.createObjectURL(blob);
      setPdfUrl(fileUrl);
      
    } catch (error) {
      console.error('PDF fetch error:', error);
      toast.error("Unable to load PDF file");
      setPdfUrl(null);
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleActivitySelect = (activity) => {
    // Clean up previous PDF URL
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    
    setSelectedReportActivity(activity);
    setSelectedSubmission(null);
    setActivitySubmissions([]);
    setCodeOutput({});
    fetchActivitySubmissions(activity.id);
    
    // Fetch PDF immediately when activity is selected
    fetchPdfBlob(activity.id);
  };

  const handleSubmissionSelect = (submission) => {
    setSelectedSubmission(submission);
    // Check if there's a grade object first, then fall back to submission score
    const grade = submission.grade || activityGrades.find(g => g.submission_id === submission.submission_id);
    setGradeInput(grade?.score?.toString() || submission.score?.toString() || '');
    setGradeComments(grade?.comments || '');
    setCodeOutput({});
    
    // Fetch PDF when submission is selected
    if (selectedReportActivity) {
      fetchPdfBlob(selectedReportActivity.id);
    }
  };

  // Code execution function adapted from StudentPlatform
  const executeCode = async (code, language = 'python', questionIndex) => {
    setRunningCode(true);
    setCodeOutput(prev => ({
      ...prev,
      [questionIndex]: 'Executing code...\n'
    }));
    
    try {
      const baseUrl = getBaseUrl();
      const response = await makeAuthenticatedRequest(`${baseUrl}/execute-code/`, {
        method: 'POST',
        body: JSON.stringify({
          code: code,
          language: language,
          input: userInput
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCodeOutput(prev => ({
            ...prev,
            [questionIndex]: result.output || 'Code executed successfully with no output.'
          }));
        } else {
          setCodeOutput(prev => ({
            ...prev,
            [questionIndex]: `Error: ${result.error || 'Unknown error occurred'}`
          }));
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setCodeOutput(prev => ({
          ...prev,
          [questionIndex]: `Execution failed: ${errorData.detail || 'Unknown error'}`
        }));
      }
    } catch (error) {
      setCodeOutput(prev => ({
        ...prev,
        [questionIndex]: `Network error: ${error.message}`
      }));
    } finally {
      setRunningCode(false);
      setUserInput('');
    }
  };

  const handleRunCode = (code, language, questionIndex) => {
    if (code.includes('input(') && !userInput.trim()) {
      setCurrentQuestionForInput({ code, language, questionIndex });
      setShowInputDialog(true);
      return;
    }
    executeCode(code, language, questionIndex);
  };

  const handleInputSubmit = () => {
    setShowInputDialog(false);
    if (currentQuestionForInput) {
      executeCode(
        currentQuestionForInput.code,
        currentQuestionForInput.language,
        currentQuestionForInput.questionIndex
      );
      setCurrentQuestionForInput(null);
    }
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmission || !gradeInput.trim()) {
      toast.error('Please enter a valid grade');
      return;
    }

    const grade = parseFloat(gradeInput);
    if (isNaN(grade) || grade < 0) {
      toast.error('Please enter a valid numeric grade');
      return;
    }

    if (grade > selectedSubmission.max_score) {
      toast.error(`Grade cannot exceed maximum score of ${selectedSubmission.max_score}`);
      return;
    }

    setSavingGrade(true);
    
    try {
      const baseUrl = getBaseUrl();
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/activity-grades/`,
        {
          method: 'POST',
          body: JSON.stringify({
            student_id: selectedSubmission.student_id,
            activity_id: selectedReportActivity.id,
            submission_id: selectedSubmission.submission_id,
            score: grade,
            max_score: selectedSubmission.max_score,
            comments: gradeComments
          })
        }
      );

      if (response.ok) {
        const savedGrade = await response.json();
        toast.success('Grade saved as draft');
        
        // Update local state
        setActivitySubmissions(prev => 
          prev.map(sub => 
            sub.submission_id === selectedSubmission.submission_id 
              ? { 
                  ...sub, 
                  score: grade, 
                  is_evaluated: false, // Draft, not published yet
                  grade: savedGrade
                }
              : sub
          )
        );

        // Update selected submission
        setSelectedSubmission(prev => ({ 
          ...prev, 
          score: grade, 
          is_evaluated: false,
          grade: savedGrade
        }));
        
        // Refresh grades and status
        await fetchActivityGrades(selectedReportActivity.id);
        await fetchAllGradingStatuses([selectedReportActivity]);
        
        // Clear inputs
        setGradeInput('');
        setGradeComments('');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to save grade');
      }
    } catch (error) {
      toast.error('Failed to save grade');
    } finally {
      setSavingGrade(false);
    }
  };

  // Load report activities when Reports tab is selected
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReportActivities();
    }
  }, [activeTab]);

  // Fetch grades and status when a report activity is selected
  useEffect(() => {
    if (selectedReportActivity) {
      fetchActivitySubmissions(selectedReportActivity.id);
      fetchActivityGrades(selectedReportActivity.id);
      fetchAllGradingStatuses([selectedReportActivity]);
    }
  }, [selectedReportActivity]);

  // ==================== JSX ====================

  // Filter activities based on searchTerm and selectedCourse
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (activity.description && activity.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCourse = selectedCourse === 'all' || activity.course_id === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Activity Sheets</h1>
            <p className="text-muted-foreground">
              Create and manage activity sheets and assignments for students
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button disabled={courses.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Create Activity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Activity</DialogTitle>
                <DialogDescription>
                  Create a new activity sheet with questions and assignments for students.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter activity title"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter activity description"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="course">Course *</Label>
                  <Select
                    value={formData.course_id}
                    onValueChange={(value) => setFormData({ ...formData, course_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={courses.length === 0 ? "Loading courses..." : "Select a course"} />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.course_code} - {course.course_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {courses.length === 0 && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      No courses available. Please create a course first.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start_time">Start Time * (IST)</Label>
                    <Input
                      id="start_time"
                      type="datetime-local"
                      value={utcToIstInput(formData.start_time)}
                      onChange={(e) => setFormData({ ...formData, start_time: new Date(istToUtc(e.target.value)) })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end_time">End Time * (IST)</Label>
                    <Input
                      id="end_time"
                      type="datetime-local"
                      value={utcToIstInput(formData.end_time)}
                      onChange={(e) => setFormData({ ...formData, end_time: new Date(istToUtc(e.target.value)) })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="max_attempts">Max Attempts</Label>
                    <Input
                      id="max_attempts"
                      type="number"
                      value={formData.max_attempts}
                      onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 1 })}
                      min="1"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="max_score">Max Score</Label>
                    <Input
                      id="max_score"
                      type="number"
                      value={formData.max_score}
                      onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) || 1 })}
                      min="1"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="file">Activity Sheet (PDF)</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                  />
                  <p className="text-sm text-muted-foreground">Optional: Upload a PDF file with activity instructions</p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => { setShowCreateDialog(false); resetForm(); }}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateActivity} disabled={creating || courses.length === 0}>
                  {creating ? 'Creating...' : 'Create Activity'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.course_code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Activities</CardTitle>
                <CardDescription>
                  Manage your activity sheets and track their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : filteredActivities.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">
                      {activities.length === 0 ? 'No activities created' : 'No activities found'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm
                        ? 'Try adjusting your search terms.'
                        : activities.length === 0
                          ? 'Create your first activity to get started.'
                          : 'All activities are filtered out.'}
                    </p>
                    {!searchTerm && activities.length === 0 && courses.length > 0 && (
                      <div className="mt-6">
                        <Button onClick={() => setShowCreateDialog(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Activity
                        </Button>
                      </div>
                    )}
                    {courses.length === 0 && (
                      <div className="mt-6">
                        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          Create a course first to add activities
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Start Time</TableHead>
                          <TableHead>End Time</TableHead>
                          <TableHead>Max Score</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredActivities.map((activity) => (
                          <TableRow key={activity.id}>
                            <TableCell className="font-medium">{activity.title}</TableCell>
                            <TableCell>
                              {courses.find(c => c.id === activity.course_id)?.course_code || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(activity.status)}
                            </TableCell>
                            <TableCell>{formatDate(activity.start_time)}</TableCell>
                            <TableCell>{formatDate(activity.end_time)}</TableCell>
                            <TableCell>{activity.max_score}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(activity)}
                                  title="Edit activity"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openAssignDialog(activity)}
                                  title="Assign to students"
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedActivity(activity);
                                    setShowSubmissionsDialog(true);
                                  }}
                                  title="View submissions"
                                >
                                  <ClipboardList className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openReportsDialog(activity)}
                                  title="View reports"
                                >
                                  <BarChart3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleArchiveActivity(activity.id)}
                                  title="Archive activity"
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteActivity(activity.id)}
                                  title="Delete activity"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Preview PDF"
                                  onClick={() => handlePreviewPdf(activity)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Sync button row - always visible */}
                        <TableRow>
                          <TableCell colSpan={7} className="text-right py-2">
                            <Button
                              variant="outline"
                              onClick={async () => {
                                // Sync all local grades with backend
                                for (const [submissionId, gradeData] of Object.entries(localGrades)) {
                                  try {
                                    const baseUrl = getBaseUrl();
                                    const response = await makeAuthenticatedRequest(
                                      `${baseUrl}/activities/submissions/${submissionId}/grade`,
                                      {
                                        method: 'PUT',
                                        body: JSON.stringify(gradeData)
                                      }
                                    );

                                    if (response.ok) {
                                      console.log(`Grade for submission ${submissionId} synced successfully`);
                                      // Remove from local grades after successful sync
                                      setLocalGrades(prev => {
                                        const newGrades = { ...prev };
                                        delete newGrades[submissionId];
                                        return newGrades;
                                      });
                                    } else {
                                      console.log(`Failed to sync grade for submission ${submissionId}`);
                                    }
                                  } catch (error) {
                                    console.log(`Error syncing grade for submission ${submissionId}:`, error);
                                  }
                                }
                                toast.success('Sync process completed');
                              }}
                              className="min-w-[120px]"
                            >
                              <Sync className="mr-2 h-4 w-4" />
                              Sync Grades
                            </Button>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-12 gap-6" style={{ height: 'calc(100vh - 200px)' }}>
              {/* Left Panel - Activities List */}
              <div className="col-span-3">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Activities</CardTitle>
                    <CardDescription>Select an activity to view submissions</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingReportActivities ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      </div>
                    ) : reportActivities.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">
                        <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No activities found</p>
                      </div>
                    ) : (
                      <div style={{ height: 'calc(100vh - 350px)', overflowY: 'auto' }}>
                        {reportActivities.map((activity) => {
                          const status = activityGradingStatuses[activity.id];
                          return (
                            <div
                              key={activity.id}
                              className={`p-4 border-b transition-colors ${
                                selectedReportActivity?.id === activity.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                              }`}
                            >
                              <div 
                                className="cursor-pointer hover:bg-muted/50 rounded p-2 -m-2"
                                onClick={() => handleActivitySelect(activity)}
                              >
                                <div className="font-medium text-sm truncate">{activity.title}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {courses.find(c => c.id === activity.course_id)?.course_code || 'Unknown Course'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(activity.start_time)}
                                </div>
                              </div>
                              
                              {/* Grading Status Badges */}
                              {status && (
                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {status.all_published ? (
                                      <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Published
                                      </Badge>
                                    ) : status.all_graded ? (
                                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        All Graded
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {status.total_graded_students}/{status.total_assigned_students}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {/* Publish Button - only show if can_publish */}
                                  {status.can_publish && !status.all_published && (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        // Select activity if not selected
                                        if (selectedReportActivity?.id !== activity.id) {
                                          await handleActivitySelect(activity);
                                        }
                                        // Wait a bit for state to update
                                        setTimeout(() => {
                                          handlePublishAllGrades();
                                        }, 100);
                                      }}
                                      disabled={publishing}
                                    >
                                      {publishing && selectedReportActivity?.id === activity.id ? (
                                        <>
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                          Publishing...
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="w-3 h-3 mr-1" />
                                          Publish
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Middle Panel - Submissions List */}
              <div className="col-span-3">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Student Submissions</CardTitle>
                    <CardDescription>
                      {selectedReportActivity ? `Submissions for: ${selectedReportActivity.title}` : 'Select an activity first'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {!selectedReportActivity ? (
                      <div className="p-6 text-center text-muted-foreground">
                        <ClipboardList className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Select an activity to view submissions</p>
                      </div>
                    ) : loadingSubmissions ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      </div>
                    ) : activitySubmissions.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">
                        <User className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No submissions found</p>
                      </div>
                    ) : (
                      <div style={{ height: 'calc(100vh - 350px)', overflowY: 'auto' }}>
                        {activitySubmissions.map((submission) => (
                          <div
                            key={submission.submission_id}
                            className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                              selectedSubmission?.submission_id === submission.submission_id 
                                ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                            }`}
                            onClick={() => handleSubmissionSelect(submission)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-sm">{getStudentDisplayName(submission, studentProfiles)}</div>
                              <div className="flex items-center gap-1">
                                {submission.grade?.status === 'published' ? (
                                  <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Published
                                  </Badge>
                                ) : submission.grade?.status === 'draft' ? (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                    <Save className="w-3 h-3 mr-1" />
                                    Draft
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                                {/* Show local indicator if grade is saved locally */}
                                {localGrades[submission.submission_id] && (
                                  <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                                    Local
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">Score:</span> {submission.grade?.score ?? submission.score ?? 0}/{submission.max_score}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Submitted: {formatDate(submission.submission_time)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Questions: {submission.questions?.length || 0}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Panel - Submission Details */}
              <div className="col-span-6">
                {!selectedSubmission ? (
                  <Card className="h-full">
                    <CardContent className="flex items-center justify-center h-full">
                      <div className="text-center text-muted-foreground">
                        <Eye className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No Submission Selected</h3>
                        <p className="text-sm">Select a student submission to view details and grade it</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-4 h-full overflow-y-auto">
                    {/* PDF Viewer */}
                    <Card className="flex-shrink-0">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Activity PDF</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="bg-muted/20 border rounded-lg overflow-hidden" style={{ height: '400px' }}>
                          {loadingPdf ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                              <span className="ml-2 text-sm text-muted-foreground">Loading PDF...</span>
                            </div>
                          ) : pdfUrl ? (
                            <object
                              data={pdfUrl}
                              type="application/pdf"
                              width="100%"
                              height="100%"
                              style={{ border: 'none' }}
                              className="w-full h-full"
                            >
                              <embed
                                src={pdfUrl}
                                type="application/pdf"
                                width="100%"
                                height="100%"
                                className="w-full h-full"
                              />
                              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                                <FileText className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm text-center">PDF could not be displayed in browser</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2"
                                  onClick={() => window.open(pdfUrl, '_blank')}
                                >
                                  Open PDF in new tab
                                </Button>
                              </div>
                            </object>
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              <div className="text-center">
                                <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm">No PDF available</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Student Submissions - Questions */}
                    <Card className="flex-shrink-0">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">
                          Student Submissions - {getStudentDisplayName(selectedSubmission, studentProfiles)}
                        </CardTitle>
                        <CardDescription>
                          {selectedSubmission.questions?.length || 0} question(s) submitted
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedSubmission.questions && selectedSubmission.questions.length > 0 ? (
                          selectedSubmission.questions.map((question, index) => (
                            <Card key={index} className="border-2">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono">
                                      Q{question.question_number || index + 1}
                                    </Badge>
                                    <Badge variant="secondary" className="capitalize">
                                      {question.language || 'Unknown'}
                                    </Badge>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => handleRunCode(question.code, question.language, index)}
                                    disabled={runningCode}
                                  >
                                    <Play className="h-4 w-4 mr-1" />
                                    Run Code
                                  </Button>
                                </div>
                                {question.context && (
                                  <p className="text-sm text-muted-foreground mt-2">{question.context}</p>
                                )}
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {/* Code Display with Syntax Highlighting */}
                                <div className="border-2 rounded-lg overflow-hidden">
                                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-2 flex items-center justify-between">
                                    <span className="text-white text-xs font-semibold uppercase tracking-wider">
                                      {question.language || 'Code'}
                                    </span>
                                    <Badge variant="secondary" className="bg-slate-700 text-slate-200 text-xs">
                                      <Code className="w-3 h-3 mr-1" />
                                      Submission
                                    </Badge>
                                  </div>
                                  <div className="bg-slate-50 p-4">
                                    <pre 
                                      className="text-sm font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed"
                                      dangerouslySetInnerHTML={{ 
                                        __html: highlightCode(question.code, question.language) 
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* Code Output */}
                                {codeOutput[index] && (
                                  <div className="border-2 rounded-lg overflow-hidden">
                                    <div className="bg-gradient-to-r from-green-700 to-green-800 px-4 py-2 flex items-center gap-2">
                                      <Code className="h-4 w-4 text-white" />
                                      <span className="text-white text-xs font-semibold uppercase tracking-wider">
                                        Output
                                      </span>
                                    </div>
                                    <div className="bg-slate-100 p-4">
                                      <pre className="text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto text-slate-800">
                                        {codeOutput[index]}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileCode className="mx-auto h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">No code submissions found</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Grading Section */}
                    <Card className="flex-shrink-0 border-2">
                      <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Star className="h-5 w-5 text-yellow-500" />
                              Grade Submission
                            </CardTitle>
                            <CardDescription>
                              Max Score: {selectedSubmission.max_score} points
                            </CardDescription>
                          </div>
                          {selectedSubmission.grade && (
                            <Badge variant={selectedSubmission.grade.status === 'published' ? 'default' : 'secondary'}>
                              {selectedSubmission.grade.status === 'published' ? 'Published' : 'Draft'}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="grade" className="text-sm font-medium mb-2 flex items-center gap-2">
                              <span>Score (out of {selectedSubmission.max_score})</span>
                            </Label>
                            <Input
                              id="grade"
                              type="number"
                              min="0"
                              max={selectedSubmission.max_score}
                              value={gradeInput}
                              onChange={(e) => setGradeInput(e.target.value)}
                              placeholder={`Enter score (0-${selectedSubmission.max_score})`}
                              className="text-lg font-semibold"
                            />
                          </div>
                          <div>
                            <Label htmlFor="comments" className="text-sm font-medium mb-2 block">
                              Comments (Optional)
                            </Label>
                            <Textarea
                              id="comments"
                              value={gradeComments}
                              onChange={(e) => setGradeComments(e.target.value)}
                              placeholder="Add feedback for the student..."
                              rows={3}
                              className="resize-none"
                            />
                          </div>
                          <Button
                            onClick={handleSaveGrade}
                            disabled={savingGrade || !gradeInput.trim()}
                            className="w-full"
                          >
                            {savingGrade ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Grade (Draft)
                              </>
                            )}
                          </Button>
                          {selectedSubmission.grade && (
                            <div className="p-3 bg-blue-50 rounded-lg text-sm space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">Status:</span>
                                <Badge variant={selectedSubmission.grade.status === 'published' ? 'default' : 'secondary'}>
                                  {selectedSubmission.grade.status}
                                </Badge>
                              </div>
                              {selectedSubmission.grade.published_at && (
                                <div className="text-gray-600">
                                  Published: {new Date(selectedSubmission.grade.published_at).toLocaleString()}
                                </div>
                              )}
                            </div>
                          )}
                          {selectedSubmission.is_evaluated && !selectedSubmission.grade && (
                            <p className="text-sm text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              This submission has been graded
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        {/* Dialog for Editing Activity*/}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Activity</DialogTitle>
              <DialogDescription>
                Modify the activity details and settings.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_title">Title *</Label>
                <Input
                  id="edit_title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter activity title"
                  required
                />
              </div>
              {/* Edit PDF file */}
              <div className="grid gap-2">
                <Label htmlFor="edit_file">Replace Activity Sheet (PDF)</Label>
                <Input
                  id="edit_file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                />
                <p className="text-sm text-muted-foreground">Optional: Upload to replace activity PDF</p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setShowEditDialog(false); resetForm(); }}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateActivity} disabled={updating}>
                {updating ? 'Updating...' : 'Update Activity'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Students Dialog - IMPROVED UI */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assign Students to: {selectedActivity?.title}</DialogTitle>
              <DialogDescription>
                Select students to assign this activity to, either manually or by course.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-3">
                <Label className="text-sm font-medium">Assignment Type</Label>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="manual"
                      name="assignment_type"
                      value="manual"
                      checked={assignmentType === 'manual'}
                      onChange={(e) => { 
                        setAssignmentType(e.target.value); 
                        setAssignmentStudentIds([]); 
                      }}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="manual" className="text-sm">Manual Selection</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="course"
                      name="assignment_type"
                      value="course"
                      checked={assignmentType === 'course'}
                      onChange={(e) => { 
                        setAssignmentType(e.target.value); 
                        setAssignmentStudentIds([]); 
                      }}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="course" className="text-sm">All Course Students</Label>
                  </div>
                </div>
              </div>
              
              {assignmentType === 'manual' && (
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Select Students ({assignmentStudentIds.length} selected)
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAssignmentStudentIds(students.map(s => s.id))}
                        disabled={students.length === 0}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAssignmentStudentIds([])}
                        disabled={assignmentStudentIds.length === 0}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  
                  {students.length === 0 ? (
                    <div className="border rounded-lg p-8 text-center text-muted-foreground">
                      <Users className="mx-auto h-12 w-12 mb-3 opacity-50" />
                      <p className="text-sm">No students available</p>
                      <p className="text-xs mt-1">Students must be enrolled in courses to appear here</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg max-h-64 overflow-y-auto">
                      <div className="p-3 bg-muted/50 border-b sticky top-0">
                        <p className="text-xs text-muted-foreground">
                          {students.length} students available
                        </p>
                      </div>
                      <div className="p-2">
                        {students.map((student) => (
                          <div 
                            key={student.id} 
                            className={`flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors ${
                              assignmentStudentIds.includes(student.id) ? 'bg-primary/5' : ''
                            }`}
                          >
                            <Checkbox
                              id={`student-${student.id}`}
                              checked={assignmentStudentIds.includes(student.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setAssignmentStudentIds(prev => [...prev, student.id]);
                                } else {
                                  setAssignmentStudentIds(prev => prev.filter(id => id !== student.id));
                                }
                              }}
                            />
                            <Label 
                              htmlFor={`student-${student.id}`} 
                              className="flex-1 text-sm cursor-pointer"
                            >
                              <div className="font-medium">{student.email}</div>
                              {student.role && (
                                <div className="text-xs text-muted-foreground capitalize">
                                  {student.role.replace('_', ' ')}
                                </div>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {assignmentType === 'course' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                      <Users className="w-3 h-3 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-900 mb-1">
                        Course-wide Assignment
                      </h4>
                      <p className="text-sm text-blue-700">
                        This will assign the activity to all students enrolled in:{" "}
                        <span className="font-semibold">
                          {courses.find(c => c.id === selectedActivity?.course_id)?.course_name || 'Unknown Course'}
                        </span>
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        New students who enroll later will not automatically receive this assignment.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignDialog(false);
                  setAssignmentType('manual');
                  setAssignmentStudentIds([]);
                }}
                disabled={assigning}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignStudents}
                disabled={
                  assigning ||
                  (assignmentType === 'manual' && assignmentStudentIds.length === 0)
                }
                className="min-w-[120px]"
              >
                {assigning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Assigning...
                  </>
                ) : (
                  `Assign ${assignmentType === 'manual' ? `(${assignmentStudentIds.length})` : 'All'}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Submissions Dialog */}
        <Dialog open={showSubmissionsDialog} onOpenChange={setShowSubmissionsDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Activity Submissions: {selectedActivity?.title}</DialogTitle>
              <DialogDescription>
                View and manage all student submissions for this activity.
              </DialogDescription>
            </DialogHeader>
            {selectedActivity && (
              <div className="mt-4">
                <ActivitySubmissions activityId={selectedActivity.id} />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reports Dialog */}
        <Dialog open={showReportsDialog} onOpenChange={setShowReportsDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Activity Report: {selectedActivity?.title}</DialogTitle>
              <DialogDescription>
                View detailed statistics and analytics for this activity.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {loadingReport ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : reportData ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Assignments</p>
                            <p className="text-2xl font-bold">{reportData.total_assignments || 0}</p>
                          </div>
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Completed</p>
                            <p className="text-2xl font-bold">{reportData.completed_assignments || 0}</p>
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                            <p className="text-2xl font-bold">{reportData.average_score?.toFixed(1) || '0.0'}</p>
                          </div>
                          <TrendingUp className="h-5 w-5 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                            <p className="text-2xl font-bold">{reportData.completion_rate?.toFixed(1) || '0.0'}%</p>
                          </div>
                          <BarChart3 className="h-5 w-5 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  {/* Progress Bar */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Overall Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Completion Rate</span>
                          <span>{reportData.completion_rate?.toFixed(1) || '0.0'}%</span>
                        </div>
                        <Progress value={reportData.completion_rate || 0} className="w-full" />
                      </div>
                    </CardContent>
                  </Card>
                  {/* Export Button */}
                  <div className="flex justify-end">
                    <Button onClick={() => handleExportExcel(selectedActivity.id)}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Export Excel Report
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">No data available</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Unable to load report data for this activity.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReportsDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Input Dialog for code execution */}
        <Dialog open={showInputDialog} onOpenChange={setShowInputDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Code Input Required</DialogTitle>
              <DialogDescription>
                This code requires input values to execute properly.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This code requires input. Please provide the input values:
              </p>
              <Textarea
                placeholder="Enter input values (one per line if multiple inputs are needed)"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInputDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleInputSubmit}>
                Run with Input
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ActivitySheets;
