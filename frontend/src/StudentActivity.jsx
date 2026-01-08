// StudentActivity.jsx - QUERY PARAMETER FIX
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, Save, CheckCircle, Trophy, FileText, Code, 
  Plus, Edit3, AlertTriangle, RotateCcw, Trash2,
  Timer, Target, Award, BookOpen, ExternalLink
} from 'lucide-react';
import Editor from "@monaco-editor/react";
import { toast } from "sonner";

// Shadcn UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
         AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
         AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

// Utility functions
const getBaseUrl = () => {
  const currentUrl = new URL(window.location.origin);
  return `${currentUrl.protocol}//${currentUrl.hostname}:8000`;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Get current user ID from JWT token
const getCurrentUserId = () => {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (!token) return null;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || payload.user_id || payload.id || null;
  } catch (err) {
    console.error('Failed to extract user ID from token:', err);
    return null;
  }
};

// Language configurations
const LANGUAGE_CONFIGS = {
  python: {
    name: 'Python',
    defaultCode: `# Write your Python solution here\ndef solve():\n    # Your code here\n    pass\n\nif __name__ == "__main__":\n    solve()`,
    monaco: 'python'
  },
  cpp: {
    name: 'C++',
    defaultCode: `#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nint main() {\n    // Your C++ solution here\n    \n    return 0;\n}`,
    monaco: 'cpp'
  },
  c: {
    name: 'C',
    defaultCode: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    // Your C solution here\n    \n    return 0;\n}`,
    monaco: 'c'
  },
  java: {
    name: 'Java',
    defaultCode: `public class Solution {\n    public static void main(String[] args) {\n        // Your Java solution here\n        \n    }\n}`,
    monaco: 'java'
  }
};

// Enhanced PDF Viewer Component
const PDFViewer = ({ activityId }) => {
  const [pdfUrl, setPdfUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl = null;

    const fetchPdfUrl = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const headers = getAuthHeaders();
        const response = await fetch(`${getBaseUrl()}/activities/${activityId}/pdf/`, {
          headers: headers
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status}`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        if (isMounted) {
          setPdfUrl(objectUrl);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching PDF:', err);
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    if (activityId) {
      fetchPdfUrl();
    }

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [activityId]);

  if (!activityId) {
    return <div className="flex items-center justify-center h-full">No activity selected</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-500">
          <p>Failed to load PDF</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
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
        <p className="text-center p-4">
          If you're seeing this message, the PDF could not be displayed.
          <Button
            variant="link"
            className="text-blue-500 hover:underline mt-2"
            onClick={() => window.open(pdfUrl, '_blank')}
          >
            Open PDF in new tab
          </Button>
        </p>
      </object>
    </div>
  );
};

const StudentActivity = () => {
  // Initialize params and navigation first
  const { activityId } = useParams();
  const navigate = useNavigate();

  // Get current user ID for user-specific storage
  const userId = getCurrentUserId();

  // Define a unique storage key for this activity AND user
  const storageKey = `student_activity_${activityId}_${userId}_state`;

  // Initialize refs before state
  const timerRef = useRef(null);
  const questionDataRef = useRef({});
  const isInitialized = useRef(false);

  // Function to get initial state from localStorage
  const getInitialState = () => {
    try {
      const savedState = localStorage.getItem(storageKey);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        console.log('Restored state from localStorage:', parsed);
        return {
          questions: parsed.questions || [],
          questionData: parsed.questionData || {},
          selectedQuestionId: parsed.selectedQuestionId || null,
          isSubmitted: parsed.isSubmitted || false
        };
      }
    } catch (err) {
      console.error('Failed to parse saved state:', err);
    }
    return {
      questions: [],
      questionData: {},
      selectedQuestionId: null,
      isSubmitted: false
    };
  };

  // Initialize state with data from localStorage
  const initialState = getInitialState();

  // Initialize all state
  const [activity, setActivity] = useState(null);
  const [questions, setQuestions] = useState(initialState.questions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(initialState.isSubmitted);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedQuestionId, setSelectedQuestionId] = useState(initialState.selectedQuestionId);
  const [currentCode, setCurrentCode] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState('python');
  const [questionContext, setQuestionContext] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');

  // State for adding new questions
  const [newQuestionNumber, setNewQuestionNumber] = useState('');
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [showAddQuestionDialog, setShowAddQuestionDialog] = useState(false);

  // Initialize questionDataRef with saved data
  useEffect(() => {
    questionDataRef.current = initialState.questionData;
    console.log('Initialized questionDataRef:', questionDataRef.current);
  }, []);

  // Cleanup old user's data from localStorage when component mounts
  useEffect(() => {
    if (!userId || !activityId) return;

    try {
      // Find and remove any localStorage entries for this activity that don't belong to current user
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`student_activity_${activityId}_`) && key !== storageKey) {
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        console.log(`🧹 Cleaning up ${keysToRemove.length} old activity data entries`);
        keysToRemove.forEach(key => {
          console.log('  - Removing:', key);
          localStorage.removeItem(key);
        });
      } else {
        console.log('✅ No old activity data to clean up');
      }

      console.log(`📦 Current storage key for this user: ${storageKey}`);
    } catch (err) {
      console.error('Failed to cleanup old user data:', err);
    }
  }, [userId, activityId, storageKey]);

  // Persist state function
  const persistState = useCallback(() => {
    try {
      const stateToSave = {
        selectedQuestionId,
        questionData: questionDataRef.current,
        questions,
        isSubmitted,
        timestamp: Date.now()
      };

      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
      console.log('State persisted successfully:', stateToSave);
    } catch (err) {
      console.error('Failed to persist state:', err);
    }
  }, [selectedQuestionId, questions, isSubmitted, storageKey]);

  // Auto-persist state whenever it changes (only after initialization)
  useEffect(() => {
    if (isInitialized.current) {
      persistState();
    }
  }, [questions, selectedQuestionId, isSubmitted, persistState]);

  // Initialize activity data fetching
  useEffect(() => {
    let isMounted = true;

    const checkSubmissionStatus = async () => {
      try {
        const headers = getAuthHeaders();
        const response = await fetch(
          `${getBaseUrl()}/activities/activities/${activityId}/my-submission-status`,
          { headers }
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log('📊 Submission status:', data);
          
          if (data.has_submitted) {
            console.log('⚠️ User has already submitted this activity');
            console.log(`   Submission ID: ${data.submission_id}`);
            console.log(`   Submitted at: ${data.submission_time}`);
            console.log(`   Score: ${data.score}`);
            
            setIsSubmitted(true);
            localStorage.removeItem(storageKey);
            
            toast.info("Already Submitted", {
              description: `You submitted this activity on ${new Date(data.submission_time).toLocaleString()}`,
              duration: 7000
            });
            
            return true; // Indicate that submission exists
          }
        }
        return false; // No submission found
      } catch (err) {
        console.error('Failed to check submission status:', err);
        return false;
      }
    };

    const initializeActivity = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, check if user has already submitted
        const alreadySubmitted = await checkSubmissionStatus();
        if (alreadySubmitted && isMounted) {
          setLoading(false);
          return; // Stop initialization if already submitted
        }

        const headers = getAuthHeaders();
        const response = await fetch(`${getBaseUrl()}/activities/${activityId}`, {
          headers: headers
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed. Please log in again.');
          }
          throw new Error(`Failed to fetch activity: ${response.status}`);
        }

        const data = await response.json();

        if (isMounted) {
          setActivity(data);
          
          // Calculate time remaining - use both possible field names
          const endTime = new Date(data.end_time || data.end_date).getTime();
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
          setTimeLeft(remaining);
          setLoading(false);
          isInitialized.current = true;
          console.log('Activity initialized:', data);
        }
      } catch (err) {
        console.error('Activity initialization error:', err);
        if (isMounted) {
          setError(err.message);
          setLoading(false);
          if (err.message.includes('Authentication')) {
            toast.error("Authentication Error", {
              description: "Please log in again to continue."
            });
            navigate('/login');
          }
        }
      }
    };

    // Check authentication first
    if (!localStorage.getItem('token') && !localStorage.getItem('access_token')) {
      setError('Authentication required');
      setLoading(false);
      toast.error("Authentication Required", {
        description: "Please log in to access this activity."
      });
      navigate('/login');
      return;
    }

    if (activityId) {
      initializeActivity();
    }

    return () => {
      isMounted = false;
    };
  }, [activityId, navigate]);

  // Handle time updates
  useEffect(() => {
    if (timeLeft === null) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Load question data when selection changes
  useEffect(() => {
    if (!selectedQuestionId || !isInitialized.current) return;

    const savedData = questionDataRef.current[selectedQuestionId];
    if (savedData) {
      setCurrentCode(savedData.code || '');
      setCurrentLanguage(savedData.language || 'python');
      setQuestionContext(savedData.context || '');
      console.log('Loaded question data for:', selectedQuestionId, savedData);
    } else {
      const defaultCode = LANGUAGE_CONFIGS[currentLanguage]?.defaultCode || '';
      setCurrentCode(defaultCode);
      setQuestionContext('');
    }

    setHasUnsavedChanges(false);
  }, [selectedQuestionId, currentLanguage]);

  // Track code changes for unsaved indicator
  useEffect(() => {
    if (!selectedQuestionId || !isInitialized.current) return;

    const savedData = questionDataRef.current[selectedQuestionId];
    const hasChanges = savedData?.code !== currentCode || 
                      savedData?.context !== questionContext || 
                      savedData?.language !== currentLanguage;

    setHasUnsavedChanges(hasChanges);
  }, [currentCode, questionContext, currentLanguage, selectedQuestionId]);

  // Save current question
  const handleSaveQuestion = useCallback(async () => {
    if (!selectedQuestionId) return;

    try {
      setSaveStatus('saving');

      const saveData = {
        code: currentCode,
        language: currentLanguage,
        context: questionContext,
        timestamp: Date.now(),
        saveCount: (questionDataRef.current[selectedQuestionId]?.saveCount || 0) + 1
      };

      questionDataRef.current[selectedQuestionId] = saveData;
      console.log('Saved question data:', selectedQuestionId, saveData);

      // Trigger state persistence
      persistState();

      setSaveStatus('saved');
      setHasUnsavedChanges(false);

      toast.success("Question saved", {
        description: "Your work has been saved successfully."
      });

      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);

    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');
      toast.error("Save failed", {
        description: err.message || "Failed to save question"
      });
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [selectedQuestionId, currentCode, currentLanguage, questionContext, persistState]);

  // Handle time expired
  const handleTimeExpired = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    toast.error("Time's Up!", {
      description: "The activity time has expired. You can no longer make submissions.",
      duration: 10000,
    });

    handleSaveQuestion();
  }, [handleSaveQuestion]);

  // Add new question
  const handleAddQuestion = useCallback(() => {
    if (!newQuestionNumber || !newQuestionTitle) {
      toast.error("Missing information", {
        description: "Please provide both question number and title."
      });
      return;
    }

    const questionNum = parseInt(newQuestionNumber);
    if (questions.find(q => q.question_number === questionNum)) {
      toast.error("Question number exists", {
        description: "A question with this number already exists."
      });
      return;
    }

    const newQuestion = {
      id: `q_new_${Date.now()}`,
      question_number: questionNum,
      question_title: newQuestionTitle,
      question_description: `Question ${questionNum}: ${newQuestionTitle}`,
      submitted: false
    };

    const updatedQuestions = [...questions, newQuestion].sort((a, b) => a.question_number - b.question_number);
    setQuestions(updatedQuestions);
    setSelectedQuestionId(newQuestion.id);
    setActiveTab('code');

    setNewQuestionNumber('');
    setNewQuestionTitle('');
    setShowAddQuestionDialog(false);

    toast.success("Question added", {
      description: `Question ${questionNum} has been added successfully.`
    });
  }, [newQuestionNumber, newQuestionTitle, questions]);

  // Delete question
  const handleDeleteQuestion = useCallback((questionId) => {
    const updatedQuestions = questions.filter(q => q.id !== questionId);
    setQuestions(updatedQuestions);

    delete questionDataRef.current[questionId];

    if (selectedQuestionId === questionId) {
      setSelectedQuestionId(updatedQuestions.length > 0 ? updatedQuestions[0].id : null);
    }

    toast.success("Question deleted", {
      description: "The question has been removed."
    });
  }, [questions, selectedQuestionId]);

  const handleSubmitActivity = useCallback(async () => {
      if (isSubmitting) return;

      setIsSubmitting(true);
      try {
          // Save current question if needed
          if (selectedQuestionId && hasUnsavedChanges) {
              await handleSaveQuestion();
          }

          // Validation
          if (questions.length === 0) {
            toast.error("No questions to submit", {
              description: "Please add at least one question before submitting."
            });
            return;
          }

          // Check for incomplete questions
          const incompleteQuestions = questions.filter(q => {
            const savedData = questionDataRef.current[q.id];
            return !savedData?.code?.trim() || !savedData?.context?.trim();
          });

          if (incompleteQuestions.length > 0) {
            toast.error("Incomplete questions found", {
              description: `Please complete questions: ${incompleteQuestions.map(q => `Q${q.question_number}`).join(', ')}`
            });
            return;
          }

          // Prepare submission data with proper structure
          const submissionData = {
            activity_id: activityId,
            questions: questions
              .sort((a, b) => a.question_number - b.question_number)
              .map(q => {
                const savedData = questionDataRef.current[q.id] || {};
                return {
                  question_number: String(q.question_number),
                  title: String(q.question_title || ''),
                  context: String(savedData.context || ''),
                  language: String(savedData.language || 'python'),
                  code: String(savedData.code || '')
                };
              })
          };

          console.log('🚀 Submitting activity:', {
            activityId,
            userId,
            questionCount: questions.length,
            storageKey
          });
          console.log('📝 Submission data:', submissionData);

          // Make submission request
          const response = await fetch(`${getBaseUrl()}/activities/submit`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(submissionData)
          });

          const responseText = await response.text();
          console.log('📡 Response status:', response.status);
          console.log('📡 Response text:', responseText);

          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch (e) {
            responseData = { detail: responseText };
          }

          if (!response.ok) {
            let errorMessage = 'Submission failed';
            
            if (response.status === 409) {
              // Check if this is really the current user's duplicate submission
              console.log('⚠️ Conflict error (409) - Activity may be already submitted');
              errorMessage = responseData.detail || 'You have already submitted this activity. Multiple submissions are not allowed.';
            } else if (response.status === 404) {
              errorMessage = 'Activity not found';
            } else if (response.status === 401) {
              errorMessage = 'Authentication failed. Please login again.';
              navigate('/login');
              return;
            } else if (responseData.detail) {
              if (Array.isArray(responseData.detail)) {
                errorMessage = responseData.detail.map(err => 
                  `${err.loc?.join('.')}: ${err.msg}`
                ).join(', ');
              } else {
                errorMessage = responseData.detail;
              }
            }
            
            throw new Error(errorMessage);
          }

          // Success!
          console.log('🎉 Submission successful:', responseData);
          
          setIsSubmitted(true);
          persistState();

          toast.success("Activity submitted successfully!", {
            description: `Submitted ${questions.length} questions. Submission ID: ${responseData.submission_id}`,
            duration: 5000
          });

          // Clear saved data and redirect
          setTimeout(() => {
            localStorage.removeItem(storageKey);
            navigate('/student/dashboard');
          }, 3000);

      } catch (err) {
          console.error('💥 Submission failed:', err);
          toast.error("Submission failed", {
            description: err.message || "An unexpected error occurred."
          });
      } finally {
        setIsSubmitting(false);
      }
  }, [
    questions, 
    selectedQuestionId, 
    hasUnsavedChanges, 
    handleSaveQuestion, 
    activityId, 
    navigate, 
    storageKey,
    isSubmitting,
    persistState
  ]);

  // Utility functions
  const getCurrentQuestion = () => questions.find(q => q.id === selectedQuestionId);

  const getCompletedQuestionsCount = () => 
    questions.filter(q => {
      const savedData = questionDataRef.current[q.id];
      return savedData?.code?.trim() && savedData?.context?.trim();
    }).length;

  const formatTime = (seconds) => {
    if (seconds === null || seconds < 0) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft === null) return 'text-muted-foreground';
    if (timeLeft < 300) return 'text-red-500 animate-pulse';
    if (timeLeft < 900) return 'text-red-500';
    if (timeLeft < 1800) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getSaveBadge = () => {
    switch (saveStatus) {
      case 'saving':
        return <Badge variant="secondary" className="text-xs">Saving...</Badge>;
      case 'saved':
        return <Badge variant="outline" className="text-xs text-green-600">Saved</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Save failed</Badge>;
      default:
        return null;
    }
  };

  // Early returns for error states
  if (!activityId) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Activity</h2>
            <p className="text-muted-foreground mb-4">No activity ID provided</p>
            <Button onClick={() => navigate('/student/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if user ID is valid
  if (!userId) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
            <p className="text-muted-foreground mb-4">Unable to verify your identity. Please log in again.</p>
            <Button onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-600">Loading activity...</p>
            <p className="text-sm text-gray-500">Please wait while we fetch your activity details</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Activity</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="space-x-2">
              <Button onClick={() => window.location.reload()}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button variant="outline" onClick={() => navigate('/student/dashboard')}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Activity Submitted Successfully!</h2>
            <p className="text-muted-foreground mb-4">
              Your activity has been submitted with {questions.length} questions.
            </p>
            <Button onClick={() => navigate('/student/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = getCurrentQuestion();
  const completedCount = getCompletedQuestionsCount();
  const totalQuestions = questions.length;
  const completionPercentage = totalQuestions > 0 ? Math.round((completedCount / totalQuestions) * 100) : 0;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/student/dashboard')}
            >
              ← Back to Dashboard
            </Button>
            <div>
              <h1 className="text-xl font-bold">{activity?.title}</h1>
              <p className="text-sm text-muted-foreground">{activity?.description}</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Progress */}
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">{completedCount}/{totalQuestions}</span>
              <Badge variant="outline" className="text-xs">{completionPercentage}%</Badge>
            </div>

            {/* Timer */}
            <div className="flex items-center space-x-2">
              <Clock className={`h-4 w-4 ${getTimeColor()}`} />
              <span className={`font-mono font-medium ${getTimeColor()}`}>
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Save status */}
            {getSaveBadge()}

            {/* Submit activity button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={timeLeft <= 0 || totalQuestions === 0 || isSubmitting}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Submit Activity'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit Activity</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to submit this activity? You have completed {completedCount} out of {totalQuestions} questions.
                    This action cannot be undone and will submit all your work.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmitActivity} disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Activity'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Overall Progress</span>
            <span>{completedCount} of {totalQuestions} questions completed</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - PDF Viewer */}
        <div className="w-1/2 border-r flex flex-col">
          <div className="p-4 border-b bg-muted/50">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">Activity Sheet</h3>
            </div>
          </div>
          <div className="flex-1">
            <PDFViewer activityId={activityId} />
          </div>
        </div>

        {/* Right Panel - Questions and Code Editor */}
        <div className="w-1/2 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b bg-muted/50">
              <TabsList className="grid w-full grid-cols-3 h-12">
                <TabsTrigger value="overview" className="data-[state=active]:bg-background">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="questions" className="data-[state=active]:bg-background">
                  <Target className="h-4 w-4 mr-2" />
                  Questions ({totalQuestions})
                </TabsTrigger>
                <TabsTrigger value="code" className="data-[state=active]:bg-background" disabled={!currentQuestion}>
                  <Code className="h-4 w-4 mr-2" />
                  Code Editor
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0">
              {/* Overview Tab */}
              <TabsContent value="overview" className="h-full p-6 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Target className="h-4 w-4 mr-2 text-blue-500" />
                        Questions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalQuestions}</div>
                      <p className="text-xs text-muted-foreground">Total questions</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        Completed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                      <p className="text-xs text-muted-foreground">Questions ready</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Timer className="h-4 w-4 mr-2 text-orange-500" />
                        Time Left
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${getTimeColor()}`}>
                        {formatTime(timeLeft)}
                      </div>
                      <p className="text-xs text-muted-foreground">Until deadline</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Award className="h-4 w-4 mr-2 text-purple-500" />
                        Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">{completionPercentage}%</div>
                      <p className="text-xs text-muted-foreground">Overall completion</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p>• Review the PDF document on the left side carefully</p>
                      <p>• Add questions you need to solve using the Questions tab</p>
                      <p>• Write your code solutions using the Code Editor tab</p>
                      <p>• Use the Save button to save your work for each question</p>
                      <p>• You can edit previously saved questions anytime</p>
                      <p>• Submit the entire activity when all questions are complete</p>
                      <p><strong>Note:</strong> You can only submit once, so ensure all work is complete</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Questions Tab */}
              <TabsContent value="questions" className="h-full flex flex-col">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">My Questions</h3>
                    <AlertDialog open={showAddQuestionDialog} onOpenChange={setShowAddQuestionDialog}>
                      <AlertDialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Question
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Add New Question</AlertDialogTitle>
                          <AlertDialogDescription>
                            Create a new question to work on. You can identify questions from the PDF and add them here.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="questionNumber">Question Number</Label>
                            <Input
                              id="questionNumber"
                              type="number"
                              placeholder="e.g., 1, 2, 3..."
                              value={newQuestionNumber}
                              onChange={(e) => setNewQuestionNumber(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="questionTitle">Question Title</Label>
                            <Input
                              id="questionTitle"
                              placeholder="Brief title for the question"
                              value={newQuestionTitle}
                              onChange={(e) => setNewQuestionTitle(e.target.value)}
                            />
                          </div>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleAddQuestion}>
                            Add Question
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-3">
                    {questions.length === 0 ? (
                      <div className="text-center py-12">
                        <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No questions added yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Review the PDF and add questions you need to solve
                        </p>
                      </div>
                    ) :
                      questions
                        .sort((a, b) => a.question_number - b.question_number)
                        .map(question => {
                          const isSelected = selectedQuestionId === question.id;
                          const savedData = questionDataRef.current[question.id];
                          const hasCode = savedData?.code?.trim();
                          const hasContext = savedData?.context?.trim();
                          const isComplete = hasCode && hasContext;

                          return (
                            <Card 
                              key={question.id}
                              className={`cursor-pointer transition-all ${
                                isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50' : 'hover:bg-muted/50'
                              }`}
                              onClick={() => {
                                setSelectedQuestionId(question.id);
                                setActiveTab('code');
                              }}
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm font-medium flex items-center">
                                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded mr-2">
                                      Q{question.question_number}
                                    </span>
                                    {question.question_title}
                                  </CardTitle>
                                  <div className="flex items-center space-x-2">
                                    {isComplete && (
                                      <Badge variant="default" className="bg-green-100 text-green-800">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Complete
                                      </Badge>
                                    )}
                                    {hasCode && !isComplete && (
                                      <Badge variant="secondary">
                                        <Edit3 className="h-3 w-3 mr-1" />
                                        In Progress
                                      </Badge>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteQuestion(question.id);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground">
                                  {question.question_description}
                                </p>
                                {savedData && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    {hasCode && <span>✓ Code written</span>}
                                    {hasCode && hasContext && <span> • </span>}
                                    {hasContext && <span>✓ Context provided</span>}
                                    {savedData.language && <span> • Language: {LANGUAGE_CONFIGS[savedData.language]?.name}</span>}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })
                    }
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Code Editor Tab */}
              <TabsContent value="code" className="h-full flex flex-col">
                {!currentQuestion ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Select a question to start coding</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Question Header */}
                    <div className="p-4 border-b bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold flex items-center">
                          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded mr-2">
                            Q{currentQuestion.question_number}
                          </span>
                          {currentQuestion.question_title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <Select value={currentLanguage} onValueChange={setCurrentLanguage}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(LANGUAGE_CONFIGS).map(([key, config]) => (
                                <SelectItem key={key} value={key}>{config.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Context Input */}
                      <div className="space-y-2">
                        <Label htmlFor="context" className="text-sm font-medium">
                          Question Context/Description *
                        </Label>
                        <Textarea
                          id="context"
                          placeholder="Describe what this question is asking and your approach to solving it..."
                          value={questionContext}
                          onChange={(e) => setQuestionContext(e.target.value)}
                          className="h-20 text-sm resize-none"
                        />
                      </div>
                    </div>

                    {/* Code Editor */}
                    <div className="flex-1">
                      <Editor
                        height="100%"
                        language={LANGUAGE_CONFIGS[currentLanguage]?.monaco}
                        value={currentCode}
                        onChange={(value) => setCurrentCode(value || "")}
                        options={{
                          fontSize: 14,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          wordWrap: 'on',
                          lineNumbers: 'on'
                        }}
                      />
                    </div>

                    {/* Action Panel */}
                    <div className="border-t bg-muted/50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {hasUnsavedChanges && (
                            <Badge variant="secondary" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Unsaved changes
                            </Badge>
                          )}
                          {!hasUnsavedChanges && currentCode.trim() && questionContext.trim() && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Question saved
                            </Badge>
                          )}
                        </div>

                        <Button
                          onClick={handleSaveQuestion}
                          disabled={!currentCode.trim() || !questionContext.trim() || saveStatus === 'saving'}
                          variant="default"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {saveStatus === 'saving' ? 'Saving...' : 'Save Question'}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default StudentActivity;