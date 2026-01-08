import React, { useState, useEffect, useCallback, useRef, useMemo, useContext } from 'react';
import { Clock, FileCheck, AlertTriangle, CheckCircle, Moon, Sun, LogOut, Trophy, Calendar, RotateCcw } from 'lucide-react';
import { toast } from "sonner";
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from "./auth/AuthProvider";

// Shadcn UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const STORAGE_KEY = "student_mcq_progress";
const THEME_STORAGE_KEY = "student_exam_theme";
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

const MCQPlatform = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  // Refs for cleanup
  const timerRef = useRef(null);
  const autoSaveIntervalRef = useRef(null);
  const isInitializedRef = useRef(false);
  const examStartTimeRef = useRef(null);
  const examEndTimeRef = useRef(null);
  const examRegistrationIdRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const examCreatedByRef = useRef(null);
  const hasShown5MinWarningRef = useRef(false);
  const hasShown1MinWarningRef = useRef(false);
  const lastTimeLeftRef = useRef(null);

  // Memoized storage key
  const storageKey = useMemo(() => `${STORAGE_KEY}_${examId}`, [examId]);

  // Load persisted state
  const initialState = useMemo(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
      return {};
    }
  }, [storageKey]);

  // Load theme preference
  const initialTheme = useMemo(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
    } catch {
      return 'light';
    }
  }, []);

  // State management
  const [examData, setExamData] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialState.currentQuestionIndex || 0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState(initialState.selectedAnswers || {});
  const [submittedAnswers, setSubmittedAnswers] = useState(initialState.submittedAnswers || {});
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [theme, setTheme] = useState(initialTheme);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExamCompleted, setIsExamCompleted] = useState(false);

  // Generate UUID
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Calculate time remaining
  const calculateTimeRemaining = useCallback(() => {
    const now = Date.now();
    if (!examEndTimeRef.current) return 0;
    const remainingMs = examEndTimeRef.current - now;
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    return remainingSeconds;
  }, []);

  // Get current user info
  const getCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;

      const host_ip = import.meta.env.VITE_HOST_IP;
      const response = await fetch(`http://${host_ip}:8000/users/me`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const user = await response.json();
        currentUserIdRef.current = user.id;
        return user;
      }
    } catch (error) {
      console.error('Failed to get current user:', error);
    }
    return null;
  }, []);

  // API call helper function
  const makeAPICall = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const defaultHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || `API call failed with status ${response.status}`);
    }

    return response.json();
  }, []);

  // Submit MCQ answer to API
  const submitMCQAnswerToAPI = useCallback(async (mcqId, selectedAnswer) => {
    const submissionData = {
      selected_answer: selectedAnswer,
      attempt_number: 1,
      extra_data: {
        submitted_at: new Date().toISOString(),
        client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      exam_id: examId,
      mcq_id: mcqId
    };

    try {
      const host_ip = import.meta.env.VITE_HOST_IP;
      const result = await makeAPICall(`http://${host_ip}:8000/mcq-submissions/`, {
        method: 'POST',
        body: JSON.stringify(submissionData)
      });

      return result;
    } catch (error) {
      console.error('MCQ submission failed:', error);
      throw error;
    }
  }, [examId, makeAPICall]);

  // Memoized calculations
  const answeredQuestionsCount = useMemo(() => {
    return Object.keys(submittedAnswers).length;
  }, [submittedAnswers]);

  const completionPercentage = useMemo(() => {
    if (!examData || examData.mcqs.length === 0) return 0;
    return Math.round((answeredQuestionsCount / examData.mcqs.length) * 100);
  }, [answeredQuestionsCount, examData]);

  const currentMCQ = useMemo(() => {
    return examData?.mcqs?.[currentQuestionIndex] || null;
  }, [examData, currentQuestionIndex]);

  const isCurrentMCQSubmitted = useMemo(() => {
    return currentMCQ ? submittedAnswers.hasOwnProperty(currentMCQ.id) : false;
  }, [currentMCQ, submittedAnswers]);

  // Persist state function
  const persistState = useCallback((additionalState = {}) => {
    try {
      const stateToSave = {
        currentQuestionIndex,
        selectedAnswers,
        submittedAnswers,
        examStartTime: examStartTimeRef.current,
        examEndTime: examEndTimeRef.current,
        examRegistrationId: examRegistrationIdRef.current,
        examCreatedBy: examCreatedByRef.current,
        lastSavedTime: Date.now(),
        hasShown5MinWarning: hasShown5MinWarningRef.current,
        hasShown1MinWarning: hasShown1MinWarningRef.current,
        ...additionalState
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
      return true;
    } catch (error) {
      console.error('Failed to persist state:', error);
      return false;
    }
  }, [currentQuestionIndex, selectedAnswers, submittedAnswers, storageKey]);

  // Update exam registration status
  const updateExamRegistrationStatus = useCallback(async (status) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token || !examRegistrationIdRef.current) {
        console.warn('Missing required data for registration update');
        return false;
      }

      let teacherId = examCreatedByRef.current;
      if (!teacherId) {
        console.error('Teacher ID not found! Cannot update registration status.');
        return false;
      }

      const updateData = {
        status: status,
        approved_at: new Date().toISOString(),
        approved_by: teacherId,
        extra_data: {
          submitted_at: new Date().toISOString(),
          submission_type: "mcq_exam_submission",
          client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };

      const host_ip = import.meta.env.VITE_HOST_IP;
      const response = await fetch(`http://${host_ip}:8000/exam-registrations/${examRegistrationIdRef.current}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Failed to update registration status: ${response.status} - ${errorData?.detail || response.statusText}`);
      }

      const result = await response.json();
      console.log('Registration status updated successfully:', result);
      return true;
    } catch (error) {
      console.error('Failed to update exam registration status:', error);
      return false;
    }
  }, []);

  // Handle submit exam
  const handleSubmitExam = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsSubmitting(true);

    try {
      console.log("Starting MCQ exam submission process...");

      if (!currentUserIdRef.current) {
        await getCurrentUser();
      }

      if (!examCreatedByRef.current) {
        throw new Error("Teacher information not available. Cannot complete submission.");
      }

      const updateData = {
        status: "submitted",
        approved_at: new Date().toISOString(),
        approved_by: examCreatedByRef.current,
        extra_data: {}
      };

      const host_ip = import.meta.env.VITE_HOST_IP;
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `http://${host_ip}:8000/exam-registrations/${examRegistrationIdRef.current}`,
        {
          method: "PUT",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(updateData)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update exam registration: ${errorText}`);
      }

      console.log("MCQ exam registration status updated to 'submitted' successfully");
      
      localStorage.removeItem(storageKey);
      setIsExamCompleted(true);

      toast.success("MCQ Exam Submitted Successfully", {
        description: "Your exam has been submitted and you will be redirected to login.",
      });

      setTimeout(() => {
        logout();
        navigate("/login", {
          replace: true,
          state: {
            message: "Your MCQ exam has been submitted successfully. Please login again to access your dashboard.",
            type: "success"
          }
        });
      }, 10000);

    } catch (error) {
      console.error("Failed to submit MCQ exam:", error);
      toast.error("Submission Failed", {
        description: error.message || "Failed to submit exam. Please try again.",
      });
      setIsSubmitting(false);

      // Restart timer if submission failed
      if (examEndTimeRef.current) {
        const remaining = calculateTimeRemaining();
        setTimeLeft(remaining);
        if (remaining > 0) {
          timerRef.current = setInterval(() => {
            const newRemaining = calculateTimeRemaining();
            setTimeLeft(newRemaining);
            if (newRemaining <= 0) {
              clearInterval(timerRef.current);
              handleSubmitExam();
            }
          }, 1000);
        }
      }
    }
  }, [storageKey, logout, navigate, calculateTimeRemaining, getCurrentUser]);

  // Parse date string to timestamp
  const parseDateTime = useCallback((dateTimeString) => {
    if (!dateTimeString) return null;

    try {
      let date;
      if (typeof dateTimeString === 'number') {
        return dateTimeString;
      }
      date = new Date(dateTimeString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date format:', dateTimeString);
        return null;
      }
      return date.getTime();
    } catch (error) {
      console.error('Error parsing date:', dateTimeString, error);
      return null;
    }
  }, []);

  // Fetch exam registration data
  const fetchExamRegistration = useCallback(async (token) => {
    try {
      const host_ip = import.meta.env.VITE_HOST_IP;
      const response = await fetch(`http://${host_ip}:8000/exam-registrations/?exam_id=${examId}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const registrations = await response.json();
        const currentRegistration = registrations.find(reg => reg.exam_id === examId);

        if (currentRegistration) {
          examRegistrationIdRef.current = currentRegistration.id;

          if (currentRegistration.status === "submitted") {
            setIsExamCompleted(true);
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Failed to fetch exam registration:', error);
      return true;
    }
  }, [examId]);

  // Fetch exam data
  useEffect(() => {
    let isMounted = true;

    const fetchExamData = async () => {
      if (!examId || isInitializedRef.current) return;

      try {
        setIsLoading(true);
        setFetchError(null);

        const token = localStorage.getItem('access_token');
        if (!token) {
          if (isMounted) {
            setFetchError('No access token found. Please login.');
            setIsLoading(false);
          }
          return;
        }

        const user = await getCurrentUser();
        if (user) {
          console.log('Current user loaded:', user.id);
        }

        const shouldContinue = await fetchExamRegistration(token);
        if (!shouldContinue) {
          setIsLoading(false);
          return;
        }

        // Restore saved state
        if (initialState.hasShown5MinWarning) {
          hasShown5MinWarningRef.current = true;
        }
        if (initialState.hasShown1MinWarning) {
          hasShown1MinWarningRef.current = true;
        }
        if (initialState.examCreatedBy) {
          examCreatedByRef.current = initialState.examCreatedBy;
        }

        const host_ip = import.meta.env.VITE_HOST_IP;

        // Fetch MCQs and exam details
        const [mcqsResponse, examResponse] = await Promise.all([
          fetch(`http://${host_ip}:8000/exams/${examId}/mcqs-with-details/`, {
            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
          }),
          fetch(`http://${host_ip}:8000/exams/${examId}/`, {
            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (!mcqsResponse.ok) {
          throw new Error(`Failed to fetch MCQs: ${mcqsResponse.status}`);
        }

        const mcqsData = await mcqsResponse.json();
        let examDetails = {
          duration: 120,
          title: 'MCQ Quiz',
          start_time: null,
          end_time: null,
          created_by: null
        };

        if (examResponse.ok) {
          examDetails = await examResponse.json();
          if (examDetails.created_by) {
            examCreatedByRef.current = examDetails.created_by;
          }
        }

        if (!isMounted) return;

        const mcqs = mcqsData
          .map((q, index) => ({
            id: q.mcq.id,
            title: q.mcq.title || "Untitled Question",
            difficulty: q.mcq.difficulty ?
              q.mcq.difficulty.charAt(0).toUpperCase() + q.mcq.difficulty.slice(1) :
              "Easy",
            description: q.mcq.description || "",
            question_text: q.mcq.question_text || "",
            options: q.mcq.options || [],
            correct_answer: q.mcq.correct_answer,
            explanation: q.mcq.explanation || "",
            max_score: q.mcq.max_score || 1,
            shuffle_options: q.mcq.shuffle_options || false,
            points: q.points || 1,
            order: q.question_order || index
          }))
          .sort((a, b) => a.order - b.order);

        const examDataObject = {
          id: examId,
          title: examDetails.title,
          duration: examDetails.duration_minutes || examDetails.duration,
          startTime: examDetails.start_time,
          endTime: examDetails.end_time,
          createdBy: examDetails.created_by,
          totalQuestions: mcqs.length,
          mcqs
        };

        setExamData(examDataObject);

        // Setup exam timing
        let examStartTime, examEndTime;

        if (initialState.examStartTime && initialState.examEndTime) {
          examStartTime = initialState.examStartTime;
          examEndTime = initialState.examEndTime;
        } else if (examDetails.start_time && examDetails.end_time) {
          examStartTime = parseDateTime(examDetails.start_time);
          examEndTime = parseDateTime(examDetails.end_time);
        } else if (examDetails.start_time) {
          examStartTime = parseDateTime(examDetails.start_time);
          if (examStartTime) {
            const durationMinutes = examDetails.duration_minutes || examDetails.duration || 120;
            examEndTime = examStartTime + (durationMinutes * 60 * 1000);
          }
        } else {
          const now = Date.now();
          examStartTime = now;
          const durationMinutes = examDetails.duration_minutes || examDetails.duration || 120;
          examEndTime = now + (durationMinutes * 60 * 1000);
        }

        examStartTimeRef.current = examStartTime;
        examEndTimeRef.current = examEndTime;

        const initialTimeRemaining = calculateTimeRemaining();
        setTimeLeft(initialTimeRemaining);

        if (initialTimeRemaining <= 0) {
          toast.error("Time's Up!", {
            description: "The exam time has expired. Your exam will be submitted automatically.",
          });
          setTimeout(() => handleSubmitExam(), 1000);
          return;
        }

        isInitializedRef.current = true;
        setIsLoading(false);

      } catch (error) {
        console.error('Failed to fetch exam data:', error);
        if (isMounted) {
          setFetchError('Failed to fetch MCQ questions. Please try again.');
          setIsLoading(false);
        }
      }
    };

    fetchExamData();

    return () => {
      isMounted = false;
    };
  }, [examId, initialState, calculateTimeRemaining, handleSubmitExam, parseDateTime, fetchExamRegistration, getCurrentUser]);

  // Timer effect
  useEffect(() => {
    if (!examEndTimeRef.current || timeLeft === null || isExamCompleted) return;

    const updateTimer = () => {
      const remaining = calculateTimeRemaining();
      const prevTimeLeft = lastTimeLeftRef.current;

      setTimeLeft(remaining);
      lastTimeLeftRef.current = remaining;

      // Time warnings
      if (!hasShown5MinWarningRef.current && remaining <= 300 && remaining > 0 && (prevTimeLeft === null || prevTimeLeft > 300)) {
        hasShown5MinWarningRef.current = true;
        persistState({ hasShown5MinWarning: true });
        toast.warning("5 Minutes Remaining!", {
          description: "You have 5 minutes left to complete the exam.",
          duration: 10000,
        });
        alert("⚠️ Warning: Only 5 minutes remaining!\n\nPlease complete your exam soon.");
      }

      if (!hasShown1MinWarningRef.current && remaining <= 60 && remaining > 0 && (prevTimeLeft === null || prevTimeLeft > 60)) {
        hasShown1MinWarningRef.current = true;
        persistState({ hasShown1MinWarning: true });
        toast.error("1 Minute Remaining!", {
          description: "You have only 1 minute left! The exam will auto-submit when time runs out.",
          duration: 10000,
        });
        alert("🚨 URGENT: Only 1 minute remaining!\n\nThe exam will auto-submit when time runs out!");
      }

      // Auto-submit when time runs out
      if (remaining <= 0 && prevTimeLeft > 0) {
        alert("⏰ Time's Up!\n\nYour exam will be submitted automatically now.");
        toast.error("Time's Up!", {
          description: "The exam time has expired. Your exam is being submitted automatically.",
        });
        handleSubmitExam();
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [calculateTimeRemaining, handleSubmitExam, timeLeft, persistState, isExamCompleted]);

  // Auto-save interval effect
  useEffect(() => {
    if (!examData) return;

    autoSaveIntervalRef.current = setInterval(() => {
      persistState();
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [examData, persistState]);

  // Persist state on changes
  useEffect(() => {
    if (!examData || timeLeft === null) return;

    const timeoutId = setTimeout(() => {
      persistState();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [examData, persistState]);

  // Handle browser unload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      persistState();
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [persistState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
    };
  }, []);

  // Event handlers
  const handleOptionSelect = useCallback(async (mcqId, selectedOption) => {
    if (isCurrentMCQSubmitted || isSubmitting) return;

    // Update selected answer immediately for UI feedback
    setSelectedAnswers(prev => ({
      ...prev,
      [mcqId]: selectedOption
    }));

    try {
      // Submit the answer immediately
      const submissionResult = await submitMCQAnswerToAPI(mcqId, selectedOption);

      // Update submitted answers
      const updatedSubmittedAnswers = {
        ...submittedAnswers,
        [mcqId]: {
          selected_answer: selectedOption,
          is_correct: submissionResult.is_correct,
          score: submissionResult.score,
          submitted_at: submissionResult.submitted_at
        }
      };

      setSubmittedAnswers(updatedSubmittedAnswers);
      persistState({ 
        selectedAnswers: { ...selectedAnswers, [mcqId]: selectedOption },
        submittedAnswers: updatedSubmittedAnswers 
      });

      toast.success("Answer Submitted", {
        description: `Your answer for "${currentMCQ?.title}" has been submitted.`,
      });

    } catch (error) {
      console.error('Submit MCQ answer failed:', error);
      toast.error("Submission Failed", {
        description: error.message || "Failed to submit your answer. Please try again.",
      });
      
      // Revert the selection if submission failed
      setSelectedAnswers(prev => {
        const updated = { ...prev };
        delete updated[mcqId];
        return updated;
      });
    }
  }, [currentMCQ, isCurrentMCQSubmitted, isSubmitting, submittedAnswers, selectedAnswers, submitMCQAnswerToAPI, persistState]);

  const handleNextQuestion = useCallback(() => {
    if (!examData || currentQuestionIndex >= examData.mcqs.length - 1) return;
    setCurrentQuestionIndex(prev => prev + 1);
  }, [examData, currentQuestionIndex]);

  const handlePrevQuestion = useCallback(() => {
    if (currentQuestionIndex <= 0) return;
    setCurrentQuestionIndex(prev => prev - 1);
  }, [currentQuestionIndex]);

  const handleNavigateToQuestion = useCallback((index) => {
    if (index >= 0 && index < examData?.mcqs?.length) {
      setCurrentQuestionIndex(index);
    }
  }, [examData]);

  // Theme management
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, [theme]);

  // Apply theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Utility functions
  const formatTime = useCallback((seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
      return '00:00:00';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getTimeColor = useCallback(() => {
    if (timeLeft === null || typeof timeLeft !== 'number') return 'text-muted-foreground';
    if (timeLeft < 300) return 'text-red-500 animate-pulse';
    if (timeLeft < 600) return 'text-red-500';
    if (timeLeft < 1800) return 'text-yellow-500';
    return 'text-green-500';
  }, [timeLeft]);

  const getDifficultyVariant = useCallback((difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'default';
      case 'Medium': return 'secondary';
      case 'Hard': return 'destructive';
      default: return 'default';
    }
  }, []);

  const getQuestionStatus = useCallback((mcqId) => {
    if (submittedAnswers[mcqId]) return 'submitted';
    if (selectedAnswers[mcqId]) return 'attempted';
    return 'unanswered';
  }, [submittedAnswers, selectedAnswers]);

  const getQuestionStatusColor = useCallback((status, isCurrent) => {
    if (isCurrent) return 'bg-blue-500 text-white';
    switch (status) {
      case 'submitted': return 'bg-green-500 text-white';
      case 'attempted': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  }, []);

  // Exam completion screen
  if (isExamCompleted) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Card className="w-full max-w-2xl mx-4 shadow-2xl border-0 bg-white/90 backdrop-blur-sm dark:bg-gray-900/90">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Trophy className="h-24 w-24 text-yellow-500 animate-bounce" />
                <div className="absolute -top-1 -right-1 h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              MCQ Exam Completed Successfully! 🎉
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-green-600" />
                Exam Summary
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Exam Title:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{examData?.title || 'MCQ Quiz'}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Questions Answered:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{answeredQuestionsCount} / {examData?.mcqs?.length || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Completion Rate:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{completionPercentage}%</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Submitted At:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <RotateCcw className="h-4 w-4" />
                Redirecting to login in <span className="font-mono font-bold">10</span> seconds...
              </div>
              <Button
                onClick={() => {
                  logout();
                  navigate('/login', {
                    replace: true,
                    state: {
                      message: 'Your MCQ exam has been submitted successfully.',
                      type: 'success'
                    }
                  });
                }}
                className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <LogOut className="h-4 w-4" />
                Go to Login Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading MCQ questions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center max-w-md p-6">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to Load MCQ Exam</h2>
          <p className="text-red-600 mb-4">{fetchError}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!examData?.mcqs?.length) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-lg">No MCQ questions available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      {/* Header Section */}
      <header className="flex justify-between items-center p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">{examData.title}</h1>
          <Badge variant="outline">
            Question {currentQuestionIndex + 1} of {examData.mcqs.length}
          </Badge>
        </div>

        <div className="flex items-center gap-6">
          {/* Theme Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          {/* Timer */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className={`font-mono text-lg font-bold ${getTimeColor()}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Progress:</span>
            <Progress value={completionPercentage} className="w-20" />
            <span className="text-sm font-medium">
              {answeredQuestionsCount}/{examData.mcqs.length}
            </span>
          </div>

          {/* Submit Button */}
          <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2" disabled={isSubmitting}>
                <FileCheck className="h-4 w-4" />
                {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Submit MCQ Exam?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  You have answered {answeredQuestionsCount} out of {examData.mcqs.length} questions.
                  Once submitted, you will be automatically logged out and cannot make any changes.
                  Are you sure you want to submit your exam?
                  <br /><br />
                  <strong>Note:</strong> After submission, you will be automatically logged out.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSubmitExam}
                  className="bg-destructive hover:bg-destructive/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    'Yes, Submit & Logout'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Main MCQ Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {currentMCQ?.title}
                  <Badge variant={getDifficultyVariant(currentMCQ?.difficulty)}>
                    {currentMCQ?.difficulty}
                  </Badge>
                </CardTitle>
                {isCurrentMCQSubmitted && (
                  <Badge variant="destructive" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Submitted
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question Content */}
              <div>
                {currentMCQ?.description && (
                  <div className="mb-4 text-sm text-muted-foreground">
                    <p>{currentMCQ.description}</p>
                  </div>
                )}
                
                <div className="mb-6">
                  <div
                    className="prose dark:prose-invert max-w-none text-lg"
                    dangerouslySetInnerHTML={{ __html: currentMCQ?.question_text || '' }}
                  />
                </div>

                {/* MCQ Options */}
                <RadioGroup
                  value={selectedAnswers[currentMCQ?.id]?.toString() || ''}
                  onValueChange={(value) => handleOptionSelect(currentMCQ?.id, parseInt(value))}
                  disabled={isCurrentMCQSubmitted}
                  className="space-y-4"
                >
                  {currentMCQ?.options?.map((option, index) => {
                    const optionValue = index + 1;
                    const isSelected = selectedAnswers[currentMCQ?.id] === optionValue;
                    const isSubmitted = isCurrentMCQSubmitted;
                    const submissionData = submittedAnswers[currentMCQ?.id];
                    const isCorrect = submissionData?.is_correct && submissionData?.selected_answer === optionValue;
                    const isWrong = submissionData && !submissionData.is_correct && submissionData.selected_answer === optionValue;

                    return (
                      <div
                        key={optionValue}
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors ${
                          isSubmitted
                            ? isCorrect
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : isWrong
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                              : 'border-gray-200 dark:border-gray-700'
                            : isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <RadioGroupItem
                          value={optionValue.toString()}
                          id={`option-${optionValue}`}
                          className={`${
                            isSubmitted
                              ? isCorrect
                                ? 'border-green-500 text-green-600'
                                : isWrong
                                ? 'border-red-500 text-red-600'
                                : ''
                              : isSelected
                              ? 'border-blue-500 text-blue-600'
                              : ''
                          }`}
                        />
                        <Label
                          htmlFor={`option-${optionValue}`}
                          className={`flex-1 cursor-pointer text-base ${
                            isSubmitted
                              ? isCorrect
                                ? 'text-green-700 dark:text-green-300'
                                : isWrong
                                ? 'text-red-700 dark:text-red-300'
                                : ''
                              : isSelected
                              ? 'text-blue-700 dark:text-blue-300 font-medium'
                              : ''
                          } ${isCurrentMCQSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <span className="inline-flex items-center gap-3">
                            <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                              isSubmitted
                                ? isCorrect
                                  ? 'border-green-500 bg-green-500 text-white'
                                  : isWrong
                                  ? 'border-red-500 bg-red-500 text-white'
                                  : 'border-gray-300 text-gray-600'
                                : isSelected
                                ? 'border-blue-500 bg-blue-500 text-white'
                                : 'border-gray-300 text-gray-600'
                            }`}>
                              {String.fromCharCode(65 + index)}
                            </span>
                            {option}
                          </span>
                        </Label>
                        {isSubmitted && isCorrect && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>

                {/* Explanation */}
                {isCurrentMCQSubmitted && currentMCQ?.explanation && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Explanation:</h4>
                    <p className="text-blue-800 dark:text-blue-200">{currentMCQ.explanation}</p>
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handlePrevQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === examData.mcqs.length - 1}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Question Navigation */}
        <div className="w-16 border-l bg-card overflow-y-auto">
          <div className="p-2 space-y-2">
            {examData.mcqs.map((mcq, index) => {
              const status = getQuestionStatus(mcq.id);
              const isCurrent = index === currentQuestionIndex;
              return (
                <Button
                  key={mcq.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNavigateToQuestion(index)}
                  className={`w-12 h-12 rounded-full text-sm font-bold transition-colors ${getQuestionStatusColor(status, isCurrent)}`}
                  title={`${index + 1}. ${mcq.title} (${status})`}
                >
                  {index + 1}
                </Button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MCQPlatform;
