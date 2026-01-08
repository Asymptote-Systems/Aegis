import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Filter,
  Search,
  RefreshCw,
  Users,
  Trophy,
  Code2,
  Timer,
  MemoryStick,
  User,
  Activity,
  BarChart3,
  FileSpreadsheet,
  Database,
  Sparkles,
  Copy,
  X,
  Code,
  Terminal,
  FileText,
  Calendar,
  GitBranch,
  Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import api from './api/apiClient';

const SubmissionResultsDashboard = ({ examId }) => {
  const [submissions, setSubmissions] = useState([]);
  const [submissionResults, setSubmissionResults] = useState([]);
  const [submissionDetails, setSubmissionDetails] = useState({});
  const [userDetails, setUserDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({});
  const [exportingExcel, setExportingExcel] = useState(false);
  const [examDetails, setExamDetails] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [codeViewDialog, setCodeViewDialog] = useState(false);
  const [selectedCodeSubmission, setSelectedCodeSubmission] = useState(null);

  // Professional monochromatic status configurations
  const statusConfig = {
    pending: { 
      icon: Clock, 
      color: 'bg-slate-500', 
      textColor: 'text-slate-700 dark:text-slate-300', 
      bgColor: 'bg-slate-50 dark:bg-slate-900/20',
      borderColor: 'border-slate-200 dark:border-slate-700',
      label: 'Pending',
      description: 'Awaiting evaluation'
    },
    running: { 
      icon: RefreshCw, 
      color: 'bg-slate-600', 
      textColor: 'text-slate-700 dark:text-slate-300', 
      bgColor: 'bg-slate-100 dark:bg-slate-800/20',
      borderColor: 'border-slate-300 dark:border-slate-600',
      label: 'Running',
      description: 'Currently processing'
    },
    accepted: { 
      icon: CheckCircle, 
      color: 'bg-slate-800', 
      textColor: 'text-slate-900 dark:text-slate-100', 
      bgColor: 'bg-slate-200 dark:bg-slate-700/20',
      borderColor: 'border-slate-400 dark:border-slate-500',
      label: 'Accepted',
      description: 'Solution correct'
    },
    wrong_answer: { 
      icon: XCircle, 
      color: 'bg-slate-700', 
      textColor: 'text-slate-700 dark:text-slate-300', 
      bgColor: 'bg-slate-100 dark:bg-slate-800/30',
      borderColor: 'border-slate-300 dark:border-slate-600',
      label: 'Wrong Answer',
      description: 'Incorrect solution'
    },
    compilation_error: { 
      icon: AlertTriangle, 
      color: 'bg-slate-600', 
      textColor: 'text-slate-700 dark:text-slate-300', 
      bgColor: 'bg-slate-50 dark:bg-slate-900/20',
      borderColor: 'border-slate-200 dark:border-slate-700',
      label: 'Compilation Error',
      description: 'Code failed to compile'
    },
    runtime_error: { 
      icon: AlertTriangle, 
      color: 'bg-slate-700', 
      textColor: 'text-slate-700 dark:text-slate-300', 
      bgColor: 'bg-slate-100 dark:bg-slate-800/20',
      borderColor: 'border-slate-300 dark:border-slate-600',
      label: 'Runtime Error',
      description: 'Error during execution'
    },
    time_limit_exceeded: { 
      icon: Timer, 
      color: 'bg-slate-500', 
      textColor: 'text-slate-700 dark:text-slate-300', 
      bgColor: 'bg-slate-50 dark:bg-slate-900/20',
      borderColor: 'border-slate-200 dark:border-slate-700',
      label: 'Time Limit',
      description: 'Execution timeout'
    },
    internal_error: { 
      icon: XCircle, 
      color: 'bg-slate-400', 
      textColor: 'text-slate-700 dark:text-slate-300', 
      bgColor: 'bg-slate-50 dark:bg-slate-900/20',
      borderColor: 'border-slate-200 dark:border-slate-700',
      label: 'Internal Error',
      description: 'System error'
    }
  };

  // Language configurations
  const languageConfig = {
    python: { label: 'Python', color: 'bg-blue-100 text-blue-800', icon: '🐍' },
    java: { label: 'Java', color: 'bg-red-100 text-red-800', icon: '☕' },
    cpp: { label: 'C++', color: 'bg-purple-100 text-purple-800', icon: '🤖' },
    c: { label: 'C', color: 'bg-gray-100 text-gray-800', icon: '⚡' },
    text: { label: 'Plain Text', color: 'bg-slate-100 text-slate-800', icon: '📄' },
    javascript: { label: 'JavaScript', color: 'bg-yellow-100 text-yellow-800', icon: '⁉️' }
  };

  // Fetch exam details
  const fetchExamDetails = async () => {
    try {
      const response = await api.get(`/exams/${examId}`);
      setExamDetails(response.data);
    } catch (error) {
      console.error('Error fetching exam details:', error);
      setExamDetails({ title: 'Exam Results', id: examId });
    }
  };

  // Enhanced user details fetching
  const fetchUserDetails = async (studentIds) => {
    const userDetailsMap = {};
    const uniqueStudentIds = [...new Set(studentIds)];

    await Promise.all(
      uniqueStudentIds.map(async (studentId) => {
        try {
          const response = await api.get(`/users/${studentId}`);
          userDetailsMap[studentId] = response.data;
        } catch (error) {
          console.error(`Error fetching user ${studentId}:`, error);
          userDetailsMap[studentId] = {
            email: `student_${studentId}@exam.local`,
            name: `Student ${studentId}`,
            first_name: 'Student',
            last_name: studentId,
            id: studentId
          };
        }
      })
    );
    return userDetailsMap;
  };

  // Enhanced data fetching with source code retrieval using correct API endpoint
  const fetchSubmissionResults = async (showLoadingToast = false) => {
    setLoading(true);
    setRefreshing(true);
    
    if (showLoadingToast) {
      toast.info('Refreshing submission data...', {
        description: 'Fetching submissions, results, and source code from server.'
      });
    }

    try {
      await fetchExamDetails();

      // Get submissions
      const submissionsResponse = await api.get(`/exams/${examId}/submissions?skip=0&limit=1000`);
      const submissionsData = submissionsResponse.data;
      setSubmissions(submissionsData);

      // Fetch user details
      const studentIds = submissionsData.map(s => s.student_id);
      const userDetailsMap = await fetchUserDetails(studentIds);
      setUserDetails(userDetailsMap);

      // Get submission results
      const resultsPromises = submissionsData.map(async (submission) => {
        try {
          const resultResponse = await api.get(`/submission-results/by-submission/${submission.id}`);
          return resultResponse.data || createDefaultResult(submission);
        } catch (error) {
          console.warn(`Failed to fetch results for submission ${submission.id}:`, error);
          return createDefaultResult(submission);
        }
      });

      const results = await Promise.all(resultsPromises);
      setSubmissionResults(results);

      // Get detailed submission info including source code using correct API endpoint
      const detailsPromises = submissionsData.map(async (submission) => {
        try {
          const detailResponse = await api.get(`/submissions/${submission.id}`);
          return {
            submission_id: submission.id,
            ...detailResponse.data
          };
        } catch (error) {
          console.warn(`Failed to fetch details for submission ${submission.id}:`, error);
          return {
            submission_id: submission.id,
            source_code: '',
            language: 'text',
            status: 'pending',
            attempt_number: 1,
            extra_data: {},
            id: submission.id,
            exam_id: examId,
            question_id: null,
            student_id: submission.student_id,
            submitted_at: submission.submitted_at,
            created_at: submission.created_at,
            updated_at: submission.updated_at
          };
        }
      });

      const details = await Promise.all(detailsPromises);
      const detailsMap = {};
      details.forEach(detail => {
        detailsMap[detail.submission_id] = detail;
      });
      setSubmissionDetails(detailsMap);

      calculateStats(submissionsData, results, detailsMap);

      if (showLoadingToast) {
        toast.success('Data refreshed successfully!', {
          description: `Updated ${submissionsData.length} submissions with source code.`
        });
      }

    } catch (error) {
      console.error('Error fetching submission results:', error);
      toast.error('Failed to load submission data', {
        description: 'Some data may be unavailable. Please try refreshing again.'
      });
      
      setSubmissions([]);
      setSubmissionResults([]);
      setSubmissionDetails({});
      setUserDetails({});
      setStats({
        totalSubmissions: 0,
        processedSubmissions: 0,
        pendingSubmissions: 0,
        acceptedSubmissions: 0,
        wrongAnswerSubmissions: 0,
        errorSubmissions: 0,
        averageScore: 0
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Create default result structure
  const createDefaultResult = (submission) => ({
    submission_id: submission.id,
    status: 'pending',
    score: 0,
    max_score: 100,
    execution_time: 0,
    memory_used: 0,
    test_cases_passed: 0,
    total_test_cases: 0,
    error_message: null,
    created_at: submission.created_at,
    updated_at: submission.created_at
  });

  // Enhanced statistics calculation
  const calculateStats = (submissions, results, details) => {
    const validResults = results.filter(r => r !== null);
    
    const stats = {
      totalSubmissions: submissions.length,
      processedSubmissions: validResults.filter(r => r.status !== 'pending').length,
      pendingSubmissions: validResults.filter(r => r.status === 'pending').length,
      acceptedSubmissions: validResults.filter(r => r.status === 'accepted').length,
      wrongAnswerSubmissions: validResults.filter(r => r.status === 'wrong_answer').length,
      errorSubmissions: validResults.filter(r => 
        ['compilation_error', 'runtime_error', 'internal_error'].includes(r.status)
      ).length,
      timeoutSubmissions: validResults.filter(r => r.status === 'time_limit_exceeded').length,
      runningSubmissions: validResults.filter(r => r.status === 'running').length,
      averageScore: validResults.length > 0 
        ? (validResults.reduce((sum, r) => sum + (r.score || 0), 0) / validResults.length).toFixed(1) 
        : 0,
      averageExecutionTime: validResults.length > 0 
        ? (validResults.reduce((sum, r) => sum + (r.execution_time || 0), 0) / validResults.length).toFixed(0) 
        : 0,
      successRate: validResults.length > 0 
        ? ((validResults.filter(r => r.status === 'accepted').length / validResults.length) * 100).toFixed(1)
        : 0
    };

    setStats(stats);
  };

  // Student-focused Excel Export
  const handleExportToExcel = async () => {
    setExportingExcel(true);
    toast.info('Preparing Excel export...', {
      description: 'Compiling all student submission data with source code.'
    });

    try {
      const filteredData = getFilteredData();
      const workbook = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ['SUBMISSION RESULTS EXPORT'],
        [''],
        ['Export Details'],
        ['Generated On', new Date().toLocaleString()],
        ['Exam ID', examId],
        ['Exam Title', examDetails?.title || 'Exam Results'],
        ['Total Records', filteredData.length],
        [''],
        ['Performance Summary'],
        ['Total Submissions', stats.totalSubmissions],
        ['Processed Submissions', stats.processedSubmissions],
        ['Accepted Solutions', stats.acceptedSubmissions],
        ['Wrong Answers', stats.wrongAnswerSubmissions],
        ['Error Submissions', stats.errorSubmissions],
        ['Pending Evaluation', stats.pendingSubmissions],
        ['Average Score', `${stats.averageScore}%`],
        ['Success Rate', `${stats.successRate}%`]
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 25 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Student Results Sheet
      const studentHeaders = [
        'Student Email',
        'Student Name',
        'Student ID',
        'Submission ID',
        'Status',
        'Score',
        'Max Score',
        'Score Percentage',
        'Programming Language',
        'Attempt Number',
        'Submitted At',
        'Client Timezone',
        'Execution Time (ms)',
        'Memory Used (KB)',
        'Test Cases Passed',
        'Total Test Cases',
        'Error Message',
        'Source Code'
      ];

      const studentData = [studentHeaders];

      filteredData.forEach(item => {
        const user = item.user || {};
        const result = item.result || {};
        const detail = item.detail || {};
        const scorePercentage = result.max_score > 0 ? ((result.score / result.max_score) * 100).toFixed(1) : 0;
        
        studentData.push([
          user.email || `student_${item.student_id}@exam.local`,
          `${user.first_name || 'Student'} ${user.last_name || item.student_id}`.trim(),
          item.student_id,
          item.id,
          statusConfig[result.status || detail.status || 'pending']?.label || 'Unknown',
          result.score || 0,
          result.max_score || 100,
          scorePercentage,
          detail.language || 'text',
          detail.attempt_number || 1,
          item.submitted_at ? new Date(item.submitted_at).toLocaleString() : 'Not submitted',
          detail.extra_data?.client_timezone || 'Unknown',
          result.execution_time || 0,
          result.memory_used || 0,
          result.test_cases_passed || 0,
          result.total_test_cases || 0,
          result.error_message || 'None',
          detail.source_code || 'No code submitted'
        ]);
      });

      const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
      studentSheet['!cols'] = [
        { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
        { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
        { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 30 }, { wch: 100 }
      ];
      XLSX.utils.book_append_sheet(workbook, studentSheet, 'Student Results');

      // Source Code Only Sheet
      const codeHeaders = ['Student Email', 'Student Name', 'Language', 'Status', 'Score', 'Submitted At', 'Source Code'];
      const codeData = [codeHeaders];

      filteredData.forEach(item => {
        const user = item.user || {};
        const result = item.result || {};
        const detail = item.detail || {};
        
        codeData.push([
          user.email || `student_${item.student_id}@exam.local`,
          `${user.first_name || 'Student'} ${user.last_name || item.student_id}`.trim(),
          detail.language || 'text',
          statusConfig[result.status || detail.status || 'pending']?.label || 'Unknown',
          `${result.score || 0}/${result.max_score || 100}`,
          item.submitted_at ? new Date(item.submitted_at).toLocaleString() : 'Not submitted',
          detail.source_code || 'No code submitted'
        ]);
      });

      const codeSheet = XLSX.utils.aoa_to_sheet(codeData);
      codeSheet['!cols'] = [
        { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 22 }, { wch: 120 }
      ];
      XLSX.utils.book_append_sheet(workbook, codeSheet, 'Source Code');

      // Generate and download
      const examTitle = examDetails?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Exam';
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `${examTitle}_Student_Results_${timestamp}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);

      toast.success('Excel Export Completed! 📊', {
        description: `File "${fileName}" downloaded with all student data and source code.`
      });

    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Export Failed', {
        description: 'Unable to generate Excel file. Please try again.'
      });
    } finally {
      setExportingExcel(false);
    }
  };

  // Enhanced filtering
  const getFilteredData = () => {
    let data = submissions.map(submission => {
      const result = submissionResults.find(r => r.submission_id === submission.id);
      const detail = submissionDetails[submission.id];
      const user = userDetails[submission.student_id] || {};
      return {
        ...submission,
        result: result || createDefaultResult(submission),
        detail: detail || {},
        user: user
      };
    });

    if (searchTerm) {
      data = data.filter(item => {
        const user = item.user || {};
        const searchLower = searchTerm.toLowerCase();
        return (
          (user.email && user.email.toLowerCase().includes(searchLower)) ||
          (user.name && user.name.toLowerCase().includes(searchLower)) ||
          (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
          (user.last_name && user.last_name.toLowerCase().includes(searchLower)) ||
          item.student_id.toLowerCase().includes(searchLower)
        );
      });
    }

    if (statusFilter !== 'all') {
      data = data.filter(item => (item.result.status || item.detail.status || 'pending') === statusFilter);
    }

    return data;
  };

  // View source code
  const handleViewSourceCode = (submission) => {
    setSelectedCodeSubmission(submission);
    setCodeViewDialog(true);
  };

  // Copy code to clipboard
  const copyCodeToClipboard = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Source code copied to clipboard! 📋');
    } catch (error) {
      toast.error('Failed to copy code to clipboard');
    }
  };

  // Status badge component
  const StatusBadge = ({ status, showTooltip = true }) => {
    const config = statusConfig[status] || statusConfig.internal_error;
    const Icon = config.icon;

    const badge = (
      <Badge 
        variant="outline" 
        className={`${config.bgColor} ${config.textColor} ${config.borderColor} border-2 px-3 py-1.5 font-semibold hover:shadow-md transition-all duration-200 cursor-default`}
      >
        <Icon className="w-3 h-3 mr-2" />
        {config.label}
      </Badge>
    );

    if (!showTooltip) return badge;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-semibold">{config.label}</p>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Score display component
  const ScoreDisplay = ({ score, maxScore }) => {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    let colorClass = 'text-slate-600 dark:text-slate-400';
    let bgClass = 'bg-slate-100 dark:bg-slate-800';
    
    if (percentage >= 90) {
      colorClass = 'text-slate-900 dark:text-slate-100';
      bgClass = 'bg-slate-200 dark:bg-slate-700';
    } else if (percentage >= 80) {
      colorClass = 'text-slate-800 dark:text-slate-200';
      bgClass = 'bg-slate-150 dark:bg-slate-750';
    } else if (percentage >= 70) {
      colorClass = 'text-slate-700 dark:text-slate-300';
      bgClass = 'bg-slate-125 dark:bg-slate-775';
    }

    return (
      <div className="text-center">
        <div className={`text-base font-bold ${colorClass} ${bgClass} px-2 py-1 rounded-lg min-w-[60px]`}>
          {score}/{maxScore}
        </div>
        <div className={`text-xs ${colorClass} mt-1`}>
          {percentage.toFixed(1)}%
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchSubmissionResults();
  }, [examId]);

  const filteredData = getFilteredData();

// Question Display Panel Component - Perfectly Spaced
const QuestionDisplayPanel = ({ submissionId }) => {
  const [questionData, setQuestionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const fetchQuestionData = async () => {
      try {
        const submissionResponse = await api.get(`/submissions/${submissionId}`);
        const questionId = submissionResponse.data.question_id;
        
        if (questionId) {
          const questionResponse = await api.get(`/questions/${questionId}`);
          setQuestionData(questionResponse.data);
        }
      } catch (error) {
        console.error('Error fetching question data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (submissionId) {
      fetchQuestionData();
    }
  }, [submissionId]);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    );
  }

  if (!questionData) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <FileText className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Question Not Found
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Unable to load the question details for this submission.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      
      {/* Question Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-300 dark:to-slate-400 rounded-xl shadow-sm">
              <FileText className="h-6 w-6 text-white dark:text-slate-900" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight">
                {questionData.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Problem Statement & Requirements
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-10 w-10 p-0 shrink-0"
          >
            <Eye className={`h-5 w-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Question Content */}
      {!collapsed && (
        <div className="flex-1 overflow-auto">
          <div className="p-8 space-y-8">
            
            {/* Question Description */}
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <div 
                className="text-slate-700 dark:text-slate-300 leading-relaxed bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800/50 dark:to-slate-900/30 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
                dangerouslySetInnerHTML={{ 
                  __html: questionData.problem_statement || 'No description available.' 
                }}
                style={{
                  fontSize: '15px',
                  lineHeight: '1.7'
                }}
              />
            </div>

            {/* Question Metadata */}
            {(questionData.difficulty || questionData.max_score || questionData.time_limit) && (
              <div className="grid grid-cols-1 gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Problem Details
                </h4>
                
                {questionData.difficulty && (
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <Trophy className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider">Difficulty Level</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 capitalize">{questionData.difficulty}</p>
                    </div>
                  </div>
                )}
                
                {questionData.max_score && (
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider">Maximum Score</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{questionData.max_score} points</p>
                    </div>
                  </div>
                )}
                
                {questionData.time_limit && (
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <Clock className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider">Time Limit</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{questionData.time_limit} seconds</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Code Display Component with Syntax Highlighting
const EnhancedCodeDisplay = ({ sourceCode, language, submission, isDarkMode = true }) => {
  const [selectedLines, setSelectedLines] = useState(new Set());
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wrapLines, setWrapLines] = useState(true);

  // Map your language codes to Prism-supported languages
  const getLanguageForHighlighting = (lang) => {
    const languageMap = {
      'python': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'javascript': 'javascript',
      'js': 'javascript',
      'text': 'text',
      'txt': 'text'
    };
    return languageMap[lang?.toLowerCase()] || 'text';
  };

  // Copy code to clipboard
  const copyCodeToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sourceCode);
      toast.success('Source code copied to clipboard! 📋');
    } catch (error) {
      toast.error('Failed to copy code to clipboard');
    }
  };

  // Toggle line selection for debugging annotations
  const handleLineClick = (lineNumber) => {
    const newSelected = new Set(selectedLines);
    if (newSelected.has(lineNumber)) {
      newSelected.delete(lineNumber);
    } else {
      newSelected.add(lineNumber);
    }
    setSelectedLines(newSelected);
  };

  // Custom line number renderer with click handling
  const lineNumberRenderer = (lineNumber) => (
    <span
      className={`select-none cursor-pointer px-2 py-1 rounded-l transition-colors ${
        selectedLines.has(lineNumber) 
          ? 'bg-yellow-500/20 text-yellow-300 font-bold' 
          : 'text-slate-500 hover:text-slate-300'
      }`}
      onClick={() => handleLineClick(lineNumber)}
      title={`Click to ${selectedLines.has(lineNumber) ? 'deselect' : 'select'} line ${lineNumber}`}
    >
      {lineNumber}
    </span>
  );

  const codeStyle = isDarkMode ? oneDark : oneLight;
  const highlightLanguage = getLanguageForHighlighting(language);

  return (
    <div className="h-full bg-gradient-to-br from-slate-950 to-slate-900 dark:from-slate-950 dark:to-black rounded-2xl border border-slate-800 dark:border-slate-950 shadow-2xl overflow-hidden">
      
      {/* Enhanced Code Header */}
      <div className="p-6 border-b border-slate-800 dark:border-slate-900 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-mono text-sm font-medium">
                {language || 'text'}.{language === 'python' ? 'py' : language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : 'txt'}
              </span>
              <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700">
                {highlightLanguage.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 px-3 py-1">
              <Layers className="h-3 w-3 mr-2" />
              {sourceCode.length.toLocaleString()} chars
            </Badge>
            
            {/* Code Display Options */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLineNumbers(!showLineNumbers)}
                className={`h-8 px-3 ${showLineNumbers ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'}`}
                title="Toggle line numbers"
              >
                <span className="text-xs font-mono">#</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWrapLines(!wrapLines)}
                className={`h-8 px-3 ${wrapLines ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'}`}
                title="Toggle line wrapping"
              >
                <FileText className="h-3 w-3" />
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={copyCodeToClipboard}
              className="bg-slate-800 border-slate-700 hover:bg-slate-700"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
        </div>
        
        {/* Selected Lines Info */}
        {selectedLines.size > 0 && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-yellow-300 text-sm font-medium">
                📍 Selected lines: {Array.from(selectedLines).sort((a, b) => a - b).join(', ')}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLines(new Set())}
                className="text-yellow-400 hover:text-yellow-300 h-6 px-2"
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Syntax Highlighted Code */}
      <div className="h-[calc(100%-8rem)] overflow-auto">
        <SyntaxHighlighter
          language={highlightLanguage}
          style={codeStyle}
          showLineNumbers={showLineNumbers}
          wrapLines={wrapLines}
          wrapLongLines={wrapLines}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            textAlign: 'right',
            userSelect: 'none',
            cursor: 'pointer'
          }}
          customStyle={{
            margin: 0,
            padding: '2rem',
            background: 'transparent',
            fontSize: '14px',
            lineHeight: '1.6',
            fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace'
          }}
          codeTagProps={{
            style: {
              fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace'
            }
          }}
          lineProps={(lineNumber) => ({
            style: {
              display: 'block',
              backgroundColor: selectedLines.has(lineNumber) ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
              borderLeft: selectedLines.has(lineNumber) ? '3px solid #f59e0b' : '3px solid transparent',
              paddingLeft: '0.5rem',
              cursor: 'pointer'
            },
            onClick: () => handleLineClick(lineNumber)
          })}
        >
          {sourceCode}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};


// Code and Results Panel Component - Perfect Layout
const CodeAndResultsPanel = ({ submission }) => {
  const [activeTab, setActiveTab] = useState('code');
  const hasCode = submission.detail?.source_code && submission.detail.source_code.trim();
  const hasResults = submission.result;

  const copyCodeToClipboard = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Source code copied to clipboard! 📋');
    } catch (error) {
      toast.error('Failed to copy code to clipboard');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      
      {/* Tab Navigation */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50/30 to-slate-100/30 dark:from-slate-800/30 dark:to-slate-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'code' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('code')}
              className={`px-4 py-2 ${activeTab === 'code' 
                ? 'bg-slate-700 hover:bg-slate-800 text-white shadow-lg' 
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Terminal className="h-4 w-4 mr-2" />
              Source Code
            </Button>
            
            {hasResults && (
              <Button
                variant={activeTab === 'results' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('results')}
                className={`px-4 py-2 ${activeTab === 'results' 
                  ? 'bg-slate-700 hover:bg-slate-800 text-white shadow-lg' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Activity className="h-4 w-4 mr-2" />
                Test Results
              </Button>
            )}
          </div>
          
          {hasCode && activeTab === 'code' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyCodeToClipboard(submission.detail.source_code)}
              className="px-4 py-2 border-2"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </Button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
{activeTab === 'code' && (
  <div className="h-full p-8">
    {hasCode ? (
      <EnhancedCodeDisplay 
        sourceCode={submission.detail.source_code}
        language={submission.detail.language}
        submission={submission}
        isDarkMode={true}
      />
    ) : (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
            <FileText className="h-12 w-12 text-slate-400" />
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
              No Source Code Available
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              This submission doesn't contain any source code.
            </p>
          </div>
        </div>
      </div>
    )}
  </div>
)}


        {activeTab === 'results' && hasResults && (
          <div className="h-full overflow-auto p-8">
            <TestResultsDisplay result={submission.result} />
          </div>
        )}
      </div>
    </div>
  );
};

// Test Results Display Component - Clean & Spaced
const TestResultsDisplay = ({ result }) => {
  const hasTestResults = result.test_cases_passed !== undefined || result.total_test_cases !== undefined;
  
  return (
    <div className="space-y-8 max-w-2xl">
      
      {/* Test Cases Results */}
      {hasTestResults && (
        <div className="bg-gradient-to-r from-slate-50/80 to-white/80 dark:from-slate-800/50 dark:to-slate-900/50 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg">
          <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            Test Case Results
          </h4>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                {result.test_cases_passed || 0}
              </div>
              <div className="text-slate-600 dark:text-slate-400 font-medium">Test Cases Passed</div>
            </div>
            <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <div className="text-3xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                {result.total_test_cases || 0}
              </div>
              <div className="text-slate-600 dark:text-slate-400 font-medium">Total Test Cases</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          {(result.total_test_cases || 0) > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Success Rate</span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {Math.round(((result.test_cases_passed || 0) / result.total_test_cases) * 100)}%
                </span>
              </div>
              <Progress 
                value={((result.test_cases_passed || 0) / result.total_test_cases) * 100} 
                className="h-3"
              />
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {result.error_message && (
        <div className="bg-red-50 dark:bg-red-950/20 p-8 rounded-2xl border border-red-200 dark:border-red-800/30 shadow-lg">
          <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            Error Details
          </h4>
          <div className="bg-red-100 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800/50">
            <pre className="text-sm text-red-800 dark:text-red-300 font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
              {result.error_message}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      {/* Professional Header */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="p-3 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-100 dark:to-slate-200 rounded-xl shadow-lg flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-white dark:text-slate-900" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-slate-100 dark:via-slate-300 dark:to-slate-100 bg-clip-text text-transparent truncate">
                  Submission Results Dashboard
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2 truncate">
                  <Sparkles className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Code Review & Student Results Platform</span>
                  {examDetails?.title && (
                    <>
                      <Separator orientation="vertical" className="h-4 flex-shrink-0" />
                      <span className="font-medium truncate">{examDetails.title}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleExportToExcel}
                      disabled={exportingExcel || filteredData.length === 0}
                      size="sm"
                      className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 dark:from-slate-200 dark:to-slate-300 dark:hover:from-slate-100 dark:hover:to-slate-200 dark:text-slate-900"
                    >
                      {exportingExcel ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Export Excel</span>
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export all student results with source code</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => fetchSubmissionResults(true)} 
                      variant="outline" 
                      size="sm"
                      disabled={refreshing}
                      className="shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh submission data</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 lg:gap-6 mb-8">
          {[
            {
              title: "Total",
              value: stats.totalSubmissions || 0,
              icon: Users,
              description: "submissions"
            },
            {
              title: "Accepted",
              value: stats.acceptedSubmissions || 0,
              icon: CheckCircle,
              description: "correct"
            },
            {
              title: "Wrong",
              value: stats.wrongAnswerSubmissions || 0,
              icon: XCircle,
              description: "incorrect"
            },
            {
              title: "Errors",
              value: stats.errorSubmissions || 0,
              icon: AlertTriangle,
              description: "compile/run"
            },
            {
              title: "Pending",
              value: (stats.pendingSubmissions || 0) + (stats.runningSubmissions || 0),
              icon: Clock,
              description: "processing"
            },
            {
              title: "Average Score",
              value: `${stats.averageScore || 0}%`,
              icon: Trophy,
              description: "mean score"
            }
          ].map((stat, index) => (
            <Card key={index} className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider truncate">
                      {stat.title}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 truncate">
                      {stat.description}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg flex-shrink-0">
                    <stat.icon className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enhanced Search and Filter */}
        <Card className="mb-8 border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <Input
                    placeholder="Search by student email, name, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-base border-2 border-slate-200 dark:border-slate-700 shadow-sm bg-white/80 dark:bg-slate-700/80"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="min-w-0">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48 h-12 border-2 border-slate-200 dark:border-slate-700 shadow-sm bg-white/80 dark:bg-slate-700/80">
                      <Filter className="h-5 w-5 mr-2 flex-shrink-0" />
                      <SelectValue className="truncate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Badge variant="outline" className="px-3 py-2 text-base h-12 flex items-center">
                  {filteredData.length} Results
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3 truncate">
                  <Code2 className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                  <span className="truncate">Student Submission Results</span>
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2">
                  Review student submissions and view source code
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 sm:p-12 space-y-8">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center mb-6">
                    <RefreshCw className="h-8 w-8 animate-spin text-slate-600 dark:text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Loading Submission Data
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Fetching submissions and source code...
                  </p>
                </div>
                
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                      <div className="space-y-2 flex-1 min-w-0">
                        <Skeleton className="h-4 w-full max-w-[200px]" />
                        <Skeleton className="h-4 w-full max-w-[150px]" />
                      </div>
                      <Skeleton className="h-8 w-24 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-16 sm:py-24">
                <div className="max-w-md mx-auto space-y-6">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center">
                    <Database className="h-10 w-10 text-slate-400" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      No Results Found
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {submissions.length === 0
                        ? 'No submissions have been received for this exam yet.'
                        : 'No submissions match your current search criteria.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                {/* Results Grid */}
                <div className="grid gap-6">
                  {filteredData.map((submission) => {
                    const result = submission.result || {};
                    const detail = submission.detail || {};
                    const user = submission.user || {};
                    const userInfo = {
                      displayEmail: user.email || `student_${submission.student_id}@exam.local`,
                      displayName: `${user.first_name || 'Student'} ${user.last_name || submission.student_id}`.trim()
                    };

                    const hasCode = detail.source_code && detail.source_code.trim();
                    const language = detail.language || 'text';
                    const langConfig = languageConfig[language] || languageConfig.text;

                    return (
                      <Card key={submission.id} className="border-0 shadow-lg bg-gradient-to-r from-white/90 to-slate-50/90 dark:from-slate-800/90 dark:to-slate-900/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            {/* Student Information Section */}
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              <div className="relative">
                                <Avatar className="h-12 w-12 border-2 border-slate-200 dark:border-slate-700 flex-shrink-0">
                                  <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-300 dark:to-slate-400 text-white dark:text-slate-900 text-lg font-bold">
                                    {userInfo.displayEmail[0]?.toUpperCase() || 'S'}
                                  </AvatarFallback>
                                </Avatar>
                                {hasCode && (
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-600 dark:bg-slate-400 rounded-full flex items-center justify-center">
                                    <Code className="h-3 w-3 text-white dark:text-slate-900" />
                                  </div>
                                )}
                              </div>
                              
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {userInfo.displayEmail}
                                  </h3>
                                  <StatusBadge status={result.status || detail.status || 'pending'} />
                                  {hasCode && (
                                    <Badge variant="outline" className={langConfig.color}>
                                      <span className="mr-1">{langConfig.icon}</span>
                                      {langConfig.label}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                                  {userInfo.displayName}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500 mt-1">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {submission.submitted_at 
                                      ? new Date(submission.submitted_at).toLocaleDateString()
                                      : 'Not submitted'
                                    }
                                  </span>
                                  {detail.attempt_number && (
                                    <span className="flex items-center gap-1">
                                      <GitBranch className="h-3 w-3" />
                                      Attempt {detail.attempt_number}
                                    </span>
                                  )}
                                  {hasCode && (
                                    <span className="flex items-center gap-1">
                                      <Layers className="h-3 w-3" />
                                      {detail.source_code.length} chars
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Performance Section */}
                            <div className="flex items-center gap-6 flex-shrink-0">
                              <div className="text-center">
                                <ScoreDisplay 
                                  score={result.score || 0} 
                                  maxScore={result.max_score || 100} 
                                />
                              </div>
                              
                              {(result.execution_time !== undefined || result.memory_used !== undefined) && (
                                <div className="flex flex-col gap-1 text-xs">
                                  {result.execution_time !== undefined && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
                                      <Timer className="h-3 w-3" />
                                      {result.execution_time}ms
                                    </div>
                                  )}
                                  {result.memory_used !== undefined && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
                                      <MemoryStick className="h-3 w-3" />
                                      {result.memory_used}KB
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Action Button */}
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                  onClick={() => handleViewSourceCode({
                                    ...submission,
                                    result,
                                    detail,
                                    user: userInfo
                                  })}
                                  size="sm"
                                  className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 dark:from-slate-200 dark:to-slate-300 dark:hover:from-slate-100 dark:hover:to-slate-200 dark:text-slate-900"
                                >
                                  <Code className="h-4 w-4 mr-2" />
                                  {hasCode ? 'View Code' : 'View Details'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Results Summary */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <p>
                      Showing {filteredData.length} of {submissions.length} submissions
                    </p>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="px-3 py-1">
                        Average: {stats.averageScore}%
                      </Badge>
                      {filteredData.length > 0 && (
                        <Badge variant="outline" className="px-3 py-1">
                          {((filteredData.filter(s => (s.result.status || s.detail.status) === 'accepted').length / filteredData.length) * 100).toFixed(1)}% Success Rate
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full-Screen Source Code View Modal */}
{codeViewDialog && (
  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
    <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      
      {/* Fixed Header */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 shadow-lg">
        <div className="max-w-[98vw] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-slate-700 to-slate-800 dark:from-slate-200 dark:to-slate-300 rounded-xl shadow-lg">
                <Code className="h-6 w-6 text-white dark:text-slate-900" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  Code Review & Analysis
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Question analysis and student submission review
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {selectedCodeSubmission?.detail?.language && (
                <Badge variant="outline" className={`${languageConfig[selectedCodeSubmission.detail.language]?.color || 'bg-slate-100 text-slate-800'} px-4 py-2 font-medium`}>
                  <span className="mr-2 text-lg">{languageConfig[selectedCodeSubmission.detail.language]?.icon || '📄'}</span>
                  {languageConfig[selectedCodeSubmission.detail.language]?.label || selectedCodeSubmission.detail.language}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCodeViewDialog(false)}
                className="h-10 px-4 hover:bg-slate-100 dark:hover:bg-slate-800 border-2"
              >
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Student Information Bar */}
      {selectedCodeSubmission && (
        <div className="bg-gradient-to-r from-slate-50/90 to-slate-100/90 dark:from-slate-800/50 dark:to-slate-900/50 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="max-w-[98vw] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-slate-300 dark:border-slate-600 shadow-lg">
                    <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-300 dark:to-slate-400 text-white dark:text-slate-900 font-bold text-lg">
                      {selectedCodeSubmission.user?.displayEmail?.[0]?.toUpperCase() || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-700 dark:bg-slate-300 rounded-full flex items-center justify-center shadow-md">
                    <User className="h-3 w-3 text-white dark:text-slate-900" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {selectedCodeSubmission.user?.displayEmail}
                    </h3>
                    <StatusBadge status={selectedCodeSubmission.result?.status || selectedCodeSubmission.detail?.status || 'pending'} showTooltip={false} />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    {selectedCodeSubmission.user?.displayName}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {selectedCodeSubmission.submitted_at 
                        ? new Date(selectedCodeSubmission.submitted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Not submitted'
                      }
                    </span>
                  </div>
                  
                  {selectedCodeSubmission.detail?.attempt_number && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <GitBranch className="h-4 w-4 text-slate-500" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        Attempt #{selectedCodeSubmission.detail.attempt_number}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <ScoreDisplay 
                    score={selectedCodeSubmission.result?.score || 0} 
                    maxScore={selectedCodeSubmission.result?.max_score || 100} 
                  />
                  
                  {(selectedCodeSubmission.result?.execution_time !== undefined || selectedCodeSubmission.result?.memory_used !== undefined) && (
                    <div className="flex gap-3">
                      {selectedCodeSubmission.result?.execution_time !== undefined && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <Timer className="h-4 w-4 text-slate-500" />
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {selectedCodeSubmission.result.execution_time}ms
                          </span>
                        </div>
                      )}
                      {selectedCodeSubmission.result?.memory_used !== undefined && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <MemoryStick className="h-4 w-4 text-slate-500" />
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {selectedCodeSubmission.result.memory_used}KB
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Perfect Side by Side */}
      {selectedCodeSubmission && (
        <div className="flex h-[calc(100vh-140px)] overflow-hidden">
          
          {/* Left Panel - Question (50% width) */}
          <div className="w-1/2 flex flex-col border-r border-slate-200 dark:border-slate-700">
            <QuestionDisplayPanel submissionId={selectedCodeSubmission.id} />
          </div>
          
          {/* Right Panel - Code & Results (50% width) */}
          <div className="w-1/2 flex flex-col">
            <CodeAndResultsPanel submission={selectedCodeSubmission} />
          </div>
          
        </div>
      )}
    </div>
  </div>
)}


    </div>
  );
};

export default SubmissionResultsDashboard;
