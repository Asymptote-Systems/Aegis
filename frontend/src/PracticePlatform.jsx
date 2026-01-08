//practice platform
import React, { useState, useEffect, useCallback, useRef, useMemo, useContext } from 'react';
import { Clock, FileCheck, AlertTriangle, Save, CheckCircle, Moon, Sun, LogOut, Trophy, Calendar, RotateCcw, Play, FileText, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Editor from "@monaco-editor/react";
import { toast } from "sonner";
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from "./auth/AuthProvider";
// Shadcn UI Components
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup
} from '@/components/ui/resizable';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const pdfPanelStyle = {
    height: 'calc(100vh - 200px)',
    minHeight: '600px'
};

const PDFViewer = ({ pdfUrl, title }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const handleLoad = () => {
        setLoading(false);
        setError(null);
    };

    const handleError = () => {
        setError('Failed to load PDF document');
        setLoading(false);
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-red-500 mb-2">{error}</p>
                <Button
                    variant="outline"
                    onClick={() => window.open(pdfUrl, '_blank')}
                >
                    Open PDF in New Tab
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[600px] bg-white rounded-lg border shadow-sm overflow-hidden">
            {loading && (
                <div className="flex items-center justify-center h-96 bg-gray-50">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                        <p className="text-gray-600">Loading PDF...</p>
                    </div>
                </div>
            )}

            <iframe
                src={pdfUrl}
                width="100%"
                height="100%"
                style={{ minHeight: '600px', border: 'none' }}
                title={title || "PDF Question Statement"}
                onLoad={handleLoad}
                onError={handleError}
                className="rounded-lg"
            />

            {/* Fallback link */}
            <div className="p-2 bg-gray-50 border-t text-center">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(pdfUrl, '_blank')}
                    className="text-xs text-gray-600 hover:text-gray-800"
                >
                    Open PDF in New Tab
                </Button>
            </div>
        </div>
    );
};

const SolutionPanel = ({ currentQuestion, solutionUnlocked, timeUntilUnlock, onUnlockSolution }) => {
    const [showUnlockDialog, setShowUnlockDialog] = useState(false);

    if (!currentQuestion) return null;

    // Check if question has solution
    const hasSolution = currentQuestion.has_solution;

    if (!hasSolution) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border">
                <ShieldCheck className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 text-center">No solution available for this question.</p>
            </div>
        );
    }

    // If solution is not unlocked yet
    if (!solutionUnlocked) {
        const minutes = Math.floor(timeUntilUnlock / 60);
        const seconds = timeUntilUnlock % 60;
        const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        return (
            <div className="flex flex-col items-center justify-center h-96 bg-amber-50 rounded-lg border border-amber-200">
                <div className="text-center p-6">
                    <Clock className="h-16 w-16 text-amber-500 mb-4 mx-auto" />
                    <h3 className="text-xl font-semibold text-amber-900 mb-2">Solution Locked</h3>
                    <p className="text-amber-700 mb-4">
                        Solutions are available after 5 minutes of practice time.
                    </p>
                    <div className="bg-amber-100 p-4 rounded-lg mb-4">
                        <p className="text-amber-800 font-mono text-2xl">
                            {timeDisplay}
                        </p>
                        <p className="text-amber-600 text-sm">remaining</p>
                    </div>
                    <p className="text-amber-600 text-sm">
                        Use this time to attempt the problem yourself first!
                    </p>
                </div>
            </div>
        );
    }

    // If solution is unlocked, show unlock button first time
    return (
        <div className="h-full">
            <AlertDialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
                <AlertDialogTrigger asChild>
                    <div className="flex flex-col items-center justify-center h-96 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-center p-6">
                            <Eye className="h-16 w-16 text-green-500 mb-4 mx-auto" />
                            <h3 className="text-xl font-semibold text-green-900 mb-2">Solution Available</h3>
                            <p className="text-green-700 mb-4">
                                You can now view the solution for this question.
                            </p>
                            <Button
                                className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                onClick={() => setShowUnlockDialog(true)}
                            >
                                <Eye className="h-4 w-4" />
                                View Solution
                            </Button>
                            <p className="text-green-600 text-sm mt-3">
                                ⚠️ Once viewed, you cannot hide the solution
                            </p>
                        </div>
                    </div>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            View Solution?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to view the solution for this question?
                            <br /><br />
                            <strong>Warning:</strong> Once you view the solution, you cannot hide it again.
                            This is meant for learning purposes after you've attempted the problem.
                            <br /><br />
                            <strong>Question:</strong> {currentQuestion.title}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                onUnlockSolution();
                                setShowUnlockDialog(false);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Yes, Show Solution
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

const SolutionContent = ({ currentQuestion }) => {
    if (!currentQuestion?.has_solution) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border">
                <ShieldCheck className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">No solution available for this question.</p>
            </div>
        );
    }

    if (currentQuestion.solution_type === 'pdf') {
        return (
            <PDFViewer
                pdfUrl={`http://${import.meta.env.VITE_HOST_IP}:8000/questions/${currentQuestion.id}/solution-pdf/`}
                title={`${currentQuestion.title} - Solution`}
            />
        );
    } else if (currentQuestion.solution_type === 'html' && currentQuestion.solution_text) {
        return (
            <div className="h-full p-6 overflow-y-auto">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700">
                            <CheckCircle className="h-5 w-5" />
                            Solution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="prose dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: currentQuestion.solution_text }}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">Solution format not supported.</p>
        </div>
    );
};

const STORAGE_KEY = "student_practice_progress";
const THEME_STORAGE_KEY = "student_practice_theme";
const AUTO_SAVE_INTERVAL = 5000; // 5 seconds
const SAVE_DEBOUNCE_DELAY = 2000; // 2 seconds
const SOLUTION_UNLOCK_TIME = 10; // 5 minutes in seconds

const Practice_Platform = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const { logout } = useContext(AuthContext);

    // Refs for cleanup
    const timerRef = useRef(null);
    const autoSaveIntervalRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const lastCodeRef = useRef('');
    const isInitializedRef = useRef(false);
    const practiceStartTimeRef = useRef(null);
    const solutionTimerRef = useRef(null);

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
    const [code, setCode] = useState(initialState.code || '');
    const [language, setLanguage] = useState(initialState.language || 'javascript');
    const [practiceTime, setPracticeTime] = useState(0);
    const [savedAnswers, setSavedAnswers] = useState(initialState.savedAnswers || {});
    const [theme, setTheme] = useState(initialTheme);
    const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Solution-related state
    const [solutionUnlockedQuestions, setSolutionUnlockedQuestions] = useState(new Set(initialState.solutionUnlockedQuestions || []));
    const [viewedSolutions, setViewedSolutions] = useState(new Set(initialState.viewedSolutions || []));
    const [timeUntilSolutionUnlock, setTimeUntilSolutionUnlock] = useState(SOLUTION_UNLOCK_TIME);
    const [activeTab, setActiveTab] = useState('question');

    // Add these new state variables for Run Code functionality
    const [runResult, setRunResult] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [showRunOutput, setShowRunOutput] = useState(false);
    const [stdin, setStdin] = useState(''); // For user input

    // Language mapping for API
    const languageMapping = useMemo(() => ({
        'javascript': 'javascript',
        'python': 'python3',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c'
    }), []);

    // Generate UUID
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

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

    // Starter code templates
    const starterCodeTemplates = useMemo(() => ({
        javascript: '',
        python: '',
        java: '',
        cpp: '',
        c: ''
    }), []);

    // Memoized calculations
    const currentQuestion = useMemo(() => {
        return examData?.questions?.[currentQuestionIndex] || null;
    }, [examData, currentQuestionIndex]);

    const isSolutionUnlocked = useMemo(() => {
        return currentQuestion ? solutionUnlockedQuestions.has(currentQuestion.id) : false;
    }, [currentQuestion, solutionUnlockedQuestions]);

    const isSolutionViewed = useMemo(() => {
        return currentQuestion ? viewedSolutions.has(currentQuestion.id) : false;
    }, [currentQuestion, viewedSolutions]);

    // Persist state function
    const persistState = useCallback((additionalState = {}) => {
        try {
            const stateToSave = {
                currentQuestionIndex,
                code,
                language,
                savedAnswers,
                practiceStartTime: practiceStartTimeRef.current,
                solutionUnlockedQuestions: Array.from(solutionUnlockedQuestions),
                viewedSolutions: Array.from(viewedSolutions),
                lastSavedTime: Date.now(),
                ...additionalState
            };
            localStorage.setItem(storageKey, JSON.stringify(stateToSave));
            return true;
        } catch (error) {
            console.error('Failed to persist state:', error);
            return false;
        }
    }, [currentQuestionIndex, code, language, savedAnswers, solutionUnlockedQuestions, viewedSolutions, storageKey]);

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

    // Auto-save function
    const performAutoSave = useCallback(async () => {
        if (!hasUnsavedChanges || !currentQuestion) {
            return;
        }

        setAutoSaveStatus('saving');

        try {
            const updatedSavedAnswers = {
                ...savedAnswers,
                [currentQuestion.id]: code
            };

            setSavedAnswers(updatedSavedAnswers);

            const success = persistState({ savedAnswers: updatedSavedAnswers });

            if (success) {
                setAutoSaveStatus('saved');
                setHasUnsavedChanges(false);
                setTimeout(() => setAutoSaveStatus('idle'), 2000);
            } else {
                setAutoSaveStatus('error');
                setTimeout(() => setAutoSaveStatus('idle'), 3000);
            }
        } catch (error) {
            console.error('Auto-save failed:', error);
            setAutoSaveStatus('error');
            setTimeout(() => setAutoSaveStatus('idle'), 3000);
        }
    }, [hasUnsavedChanges, currentQuestion, savedAnswers, code, persistState]);

    // Debounced auto save
    const debouncedAutoSave = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(performAutoSave, SAVE_DEBOUNCE_DELAY);
    }, [performAutoSave]);

    // Extract example from HTML
    const extractExampleFromProblemStatement = useCallback((html) => {
        if (!html) return "";
        try {
            const exampleMatch = html.match(/<h3>Example<\/h3>\s*<pre[^>]*>([\s\S]*?)<\/pre>/i);
            if (exampleMatch) return exampleMatch[1].trim();
            const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
            if (preMatch) return preMatch[1].trim();
            return "";
        } catch {
            return "";
        }
    }, []);

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

                // Restore saved state
                if (initialState.practiceStartTime) {
                    practiceStartTimeRef.current = initialState.practiceStartTime;
                }

                const host_ip = import.meta.env.VITE_HOST_IP;

                // Fetch questions and exam details
                const [questionsResponse, examResponse] = await Promise.all([
                    fetch(`http://${host_ip}:8000/exams/${examId}/questions-with-details/`, {
                        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`http://${host_ip}:8000/exams/${examId}/`, {
                        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
                    })
                ]);

                if (!questionsResponse.ok) {
                    throw new Error(`Failed to fetch questions: ${questionsResponse.status}`);
                }

                const questionsData = await questionsResponse.json();
                let examDetails = {
                    title: 'Practice Session',
                    exam_type: 'practice'
                };

                if (examResponse.ok) {
                    examDetails = await examResponse.json();
                }

                if (!isMounted) return;

                const questions = questionsData
                    .map((q, index) => ({
                        id: q.question.id,
                        title: q.question.title || "Untitled Question",
                        difficulty: q.question.difficulty ?
                            q.question.difficulty.charAt(0).toUpperCase() + q.question.difficulty.slice(1) :
                            "Easy",
                        description: q.question.description || "",
                        problem_statement: q.question.problem_statement || "",
                        statement_type: q.question.statement_type || 'html',
                        has_solution: q.question.has_solution || false,
                        solution_type: q.question.solution_type || 'html',
                        solution_text: q.question.solution_text || "",
                        example: extractExampleFromProblemStatement(q.question.problem_statement),
                        testCases: [],
                        points: q.points || 1,
                        order: q.question_order || index
                    }))
                    .sort((a, b) => a.order - b.order);

                const examDataObject = {
                    id: examId,
                    title: examDetails.title,
                    exam_type: examDetails.exam_type,
                    totalQuestions: questions.length,
                    questions
                };

                setExamData(examDataObject);

                // Set practice start time if not already set
                if (!practiceStartTimeRef.current) {
                    practiceStartTimeRef.current = Date.now();
                }

                isInitializedRef.current = true;
                setIsLoading(false);

            } catch (error) {
                console.error('Failed to fetch exam data:', error);
                if (isMounted) {
                    setFetchError('Failed to fetch practice questions. Please try again.');
                    setIsLoading(false);
                }
            }
        };

        fetchExamData();

        return () => {
            isMounted = false;
        };
    }, [examId, initialState, extractExampleFromProblemStatement]);

    // Practice timer and solution unlock timer
    useEffect(() => {
        if (!practiceStartTimeRef.current) return;

        const updateTimers = () => {
            const elapsed = Math.floor((Date.now() - practiceStartTimeRef.current) / 1000);
            setPracticeTime(elapsed);

            // Update solution unlock timer
            const remaining = Math.max(0, SOLUTION_UNLOCK_TIME - elapsed);
            setTimeUntilSolutionUnlock(remaining);

            // Auto-unlock solutions for all questions after 5 minutes
            if (remaining === 0 && examData?.questions) {
                const allQuestionIds = examData.questions.map(q => q.id);
                setSolutionUnlockedQuestions(new Set(allQuestionIds));
            }
        };

        // Update immediately, then every second
        updateTimers();
        timerRef.current = setInterval(updateTimers, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [practiceStartTimeRef.current, examData]);

    // Auto-save interval effect
    useEffect(() => {
        if (!examData) return;

        autoSaveIntervalRef.current = setInterval(() => {
            if (hasUnsavedChanges) {
                performAutoSave();
            }
        }, AUTO_SAVE_INTERVAL);

        return () => {
            if (autoSaveIntervalRef.current) {
                clearInterval(autoSaveIntervalRef.current);
                autoSaveIntervalRef.current = null;
            }
        };
    }, [examData, hasUnsavedChanges, performAutoSave]);

    // Code change tracking
    useEffect(() => {
        if (lastCodeRef.current !== code && lastCodeRef.current !== '') {
            setHasUnsavedChanges(true);
            debouncedAutoSave();
        }
        lastCodeRef.current = code;
    }, [code, debouncedAutoSave]);

    // Load saved answer when question changes
    useEffect(() => {
        if (!currentQuestion) return;

        const savedCode = savedAnswers[currentQuestion.id];
        if (savedCode !== undefined) {
            setCode(savedCode);
            lastCodeRef.current = savedCode;
        } else {
            const starterCode = starterCodeTemplates[language] || starterCodeTemplates.javascript;
            setCode(starterCode);
            lastCodeRef.current = starterCode;
        }
        setHasUnsavedChanges(false);
    }, [currentQuestion, savedAnswers, language, starterCodeTemplates]);

    // Persist state on changes
    useEffect(() => {
        if (!examData || practiceTime === 0) return;

        const timeoutId = setTimeout(() => {
            persistState();
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [examData, persistState]);

    // Handle browser unload
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                persistState();
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges, persistState]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            if (solutionTimerRef.current) clearTimeout(solutionTimerRef.current);
        };
    }, []);

    // Event handlers
    const handleNextQuestion = useCallback(async () => {
        if (!examData || currentQuestionIndex >= examData.questions.length - 1) return;
        await performAutoSave();
        setCurrentQuestionIndex(prev => prev + 1);
        setActiveTab('question'); // Reset to question tab
    }, [examData, currentQuestionIndex, performAutoSave]);

    const handlePrevQuestion = useCallback(async () => {
        if (currentQuestionIndex <= 0) return;
        await performAutoSave();
        setCurrentQuestionIndex(prev => prev - 1);
        setActiveTab('question'); // Reset to question tab
    }, [currentQuestionIndex, performAutoSave]);

    const handleLanguageChange = useCallback((newLanguage) => {
        setLanguage(newLanguage);
        if (currentQuestion && !savedAnswers[currentQuestion.id]) {
            const starterCode = starterCodeTemplates[newLanguage] || starterCodeTemplates.javascript;
            setCode(starterCode);
            lastCodeRef.current = starterCode;
        }
    }, [currentQuestion, savedAnswers, starterCodeTemplates]);

    // Run Code handler function
    const handleRunCode = useCallback(async () => {
        if (!code.trim()) {
            toast.error("No Code to Run", {
                description: "Please write some code before running it.",
            });
            return;
        }

        setIsRunning(true);
        setRunResult(null);

        try {
            const host_ip = import.meta.env.VITE_HOST_IP;
            const response = await makeAPICall(`http://${host_ip}:8000/exams/${examId}/run-code`, {
                method: 'POST',
                body: JSON.stringify({
                    source_code: code,
                    language: languageMapping[language] || language,
                    stdin: stdin || ""
                })
            });

            setRunResult(response);
            setShowRunOutput(true);

            // Show success toast
            if (response.success && response.status_id === 3) {
                toast.success("Code Executed Successfully!", {
                    description: `Execution completed in ${response.execution_time}s`,
                });
            }
        } catch (error) {
            console.error('Run code failed:', error);
            const errorResult = {
                success: false,
                message: `❌ Error: ${error.message || 'Failed to run code'}`,
                stderr: error.message || 'Failed to run code',
                stdout: "",
                execution_time: 0,
                memory_used: 0
            };
            setRunResult(errorResult);
            setShowRunOutput(true);

            toast.error("Code Execution Failed", {
                description: error.message || "Failed to run code. Please try again.",
            });
        } finally {
            setIsRunning(false);
        }
    }, [code, language, languageMapping, examId, makeAPICall, stdin]);

    // Solution unlock handler
    const handleUnlockSolution = useCallback(() => {
        if (!currentQuestion) return;

        const newViewedSolutions = new Set(viewedSolutions);
        newViewedSolutions.add(currentQuestion.id);
        setViewedSolutions(newViewedSolutions);

        setActiveTab('solution');

        toast.success("Solution Unlocked!", {
            description: "You can now view the solution for this question.",
        });
    }, [currentQuestion, viewedSolutions]);

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

    const getDifficultyVariant = useCallback((difficulty) => {
        switch (difficulty) {
            case 'Easy': return 'default';
            case 'Medium': return 'secondary';
            case 'Hard': return 'destructive';
            default: return 'default';
        }
    }, []);

    // Auto-save badge component
    const autoSaveBadge = useMemo(() => {
        const badges = {
            idle: null,
            saving: (
                <Badge variant="secondary" className="gap-1 animate-pulse">
                    <Save className="h-3 w-3" />
                    Saving...
                </Badge>
            ),
            saved: (
                <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Auto-saved
                </Badge>
            ),
            error: (
                <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Save failed
                </Badge>
            )
        };
        return badges[autoSaveStatus];
    }, [autoSaveStatus]);

    // Loading state
    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-lg">Loading practice questions...</p>
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
                    <h2 className="text-xl font-bold mb-2">Failed to Load Practice</h2>
                    <p className="text-red-600 mb-4">{fetchError}</p>
                    <Button onClick={() => window.location.reload()}>
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    if (!examData?.questions?.length) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
                <div className="text-center">
                    <p className="text-lg">No practice questions available.</p>
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
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Practice Mode
                    </Badge>
                    <Badge variant="outline">
                        Question {currentQuestionIndex + 1} of {examData.questions.length}
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

                    {/* Practice Timer */}
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-mono text-lg font-bold text-blue-500">
                            {formatTime(practiceTime)}
                        </span>
                    </div>

                    {/* Solution Status */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Solutions:</span>
                        {timeUntilSolutionUnlock > 0 ? (
                            <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" />
                                {Math.floor(timeUntilSolutionUnlock / 60)}:{(timeUntilSolutionUnlock % 60).toString().padStart(2, '0')}
                            </Badge>
                        ) : (
                            <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
                                <CheckCircle className="h-3 w-3" />
                                Available
                            </Badge>
                        )}
                    </div>

                    {/* Exit Practice */}
                    <Button
                        variant="outline"
                        onClick={() => navigate('/student/dashboard')}
                        className="gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        Exit Practice
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex p-4 overflow-hidden">
                <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border">
                    {/* Left Panel - Questions and Solutions */}
                    <ResizablePanel defaultSize={40} minSize={30} className="overflow-hidden">
                        <div className="h-full">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                                <div className="flex-shrink-0 px-6 pt-6">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="question" className="gap-2">
                                            <FileText className="h-4 w-4" />
                                            Question
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="solution"
                                            className="gap-2"
                                            disabled={!currentQuestion?.has_solution}
                                        >
                                            <Eye className="h-4 w-4" />
                                            Solution
                                            {currentQuestion?.has_solution && timeUntilSolutionUnlock <= 0 && (
                                                <CheckCircle className="h-3 w-3 text-green-500" />
                                            )}
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <div className="flex-1 overflow-hidden">
                                    <TabsContent value="question" className="h-full m-0 p-6">
                                        <Card className="h-full">
                                            <CardHeader>
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="flex items-center gap-2">
                                                        {currentQuestion?.title}
                                                        <Badge variant={getDifficultyVariant(currentQuestion?.difficulty)}>
                                                            {currentQuestion?.difficulty}
                                                        </Badge>
                                                    </CardTitle>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4 h-full overflow-y-auto">
                                                <div>
                                                    {currentQuestion?.description && (
                                                        <div className="mb-4">
                                                            <p>{currentQuestion.description}</p>
                                                        </div>
                                                    )}

                                                    {/* Check if it's a PDF question */}
                                                    {currentQuestion?.statement_type === 'pdf' ? (
                                                        <div className="w-full h-full">
                                                            <PDFViewer
                                                                pdfUrl={`http://${import.meta.env.VITE_HOST_IP}:8000/questions/${currentQuestion.id}/pdf/`}
                                                                title={currentQuestion.title}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {currentQuestion?.problem_statement && (
                                                                <div
                                                                    className="mb-4 prose dark:prose-invert max-w-none"
                                                                    dangerouslySetInnerHTML={{ __html: currentQuestion.problem_statement }}
                                                                />
                                                            )}
                                                            {currentQuestion?.example && (
                                                                <div className="bg-muted p-4 rounded-lg">
                                                                    <strong>Example:</strong>
                                                                    <pre className="mt-2 whitespace-pre-wrap text-sm">
                                                                        {currentQuestion.example}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </>
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
                                                        disabled={currentQuestionIndex === examData.questions.length - 1}
                                                    >
                                                        Next
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="solution" className="h-full m-0 p-6">
                                        {!isSolutionViewed ? (
                                            <SolutionPanel
                                                currentQuestion={currentQuestion}
                                                solutionUnlocked={isSolutionUnlocked}
                                                timeUntilUnlock={timeUntilSolutionUnlock}
                                                onUnlockSolution={handleUnlockSolution}
                                            />
                                        ) : (
                                            <SolutionContent currentQuestion={currentQuestion} />
                                        )}
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Right Panel - Code Editor */}
                    <ResizablePanel defaultSize={60} minSize={40} className="overflow-hidden">
                        <div className="h-full flex flex-col overflow-hidden">
                            {/* Editor Header */}
                            <div className="flex-shrink-0 flex items-center justify-between p-2 border-b">
                                <div className="flex items-center gap-2">
                                    <Label>Your Solution:</Label>
                                    {currentQuestion && savedAnswers[currentQuestion.id] && (
                                        <Badge variant="secondary" className="gap-1">
                                            <FileCheck className="h-3 w-3" />
                                            Saved
                                        </Badge>
                                    )}
                                    {autoSaveBadge}
                                    {hasUnsavedChanges && autoSaveStatus === 'idle' && (
                                        <Badge variant="outline" className="gap-1 text-yellow-600">
                                            <Save className="h-3 w-3" />
                                            Unsaved changes
                                        </Badge>
                                    )}
                                </div>

                                {/* Language Selector */}
                                <Select value={language} onValueChange={handleLanguageChange}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="javascript">JavaScript</SelectItem>
                                        <SelectItem value="python">Python</SelectItem>
                                        <SelectItem value="java">Java</SelectItem>
                                        <SelectItem value="cpp">C++</SelectItem>
                                        <SelectItem value="c">C</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Main Content Area - Editor + Output */}
                            <div className="flex-1 overflow-hidden">
                                {showRunOutput && runResult ? (
                                    // When output is shown, use ResizablePanelGroup for vertical split
                                    <ResizablePanelGroup direction="vertical" className="h-full">
                                        {/* Monaco Editor Panel */}
                                        <ResizablePanel defaultSize={55} minSize={0}>
                                            <div className="h-full">
                                                <Editor
                                                    height="100%"
                                                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                                    language={language === "c" ? "cpp" : language}
                                                    value={code}
                                                    onChange={(val) => setCode(val || "")}
                                                    options={{
                                                        fontSize: 14,
                                                        minimap: { enabled: false },
                                                        scrollBeyondLastLine: false,
                                                        automaticLayout: true,
                                                        autoClosingBrackets: "always",
                                                        autoClosingQuotes: "always",
                                                        formatOnType: true,
                                                        formatOnPaste: true,
                                                        wordWrap: 'on',
                                                        lineNumbers: 'on',
                                                        renderWhitespace: 'selection',
                                                        tabSize: 2,
                                                        insertSpaces: true
                                                    }}
                                                />
                                            </div>
                                        </ResizablePanel>

                                        {/* Resize Handle */}
                                        <ResizableHandle withHandle />

                                        {/* Run Output Panel */}
                                        <ResizablePanel defaultSize={45} minSize={0} maxSize={100}>
                                            <div className="h-full border-t bg-muted/30 overflow-hidden">
                                                <div className="h-full flex flex-col p-2">
                                                    <div className="flex-shrink-0 flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Label className="font-semibold">Run Result:</Label>
                                                            {runResult.execution_time > 0 && (
                                                                <Badge variant="secondary">
                                                                    <Clock className="h-3 w-3 mr-1" />
                                                                    {runResult.execution_time}s
                                                                </Badge>
                                                            )}
                                                            {runResult.memory_used > 0 && (
                                                                <Badge variant="secondary">
                                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                                    {runResult.memory_used}KB
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setShowRunOutput(false)}
                                                            className="h-6 w-6 p-0"
                                                        >
                                                            ✕
                                                        </Button>
                                                    </div>

                                                    {/* Scrollable Content Area */}
                                                    <div className="flex-1 overflow-y-auto space-y-2">
                                                        {/* Status Message */}
                                                        {runResult.message && (
                                                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                                                                {runResult.message}
                                                            </div>
                                                        )}

                                                        {/* Output */}
                                                        {runResult.stdout && (
                                                            <div>
                                                                <Label className="text-xs font-semibold text-green-700 flex items-center gap-1">
                                                                    <CheckCircle className="h-3 w-3" />
                                                                    Output:
                                                                </Label>
                                                                <pre className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-xs overflow-x-auto border">
                                                                    {runResult.stdout}
                                                                </pre>
                                                            </div>
                                                        )}

                                                        {/* Errors */}
                                                        {(runResult.stderr || runResult.compile_output) && (
                                                            <div>
                                                                <Label className="text-xs font-semibold text-red-700 flex items-center gap-1">
                                                                    <AlertTriangle className="h-3 w-3" />
                                                                    {runResult.compile_output ? 'Compilation Error:' : 'Runtime Error:'}
                                                                </Label>
                                                                <pre className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-xs overflow-x-auto border text-red-800 dark:text-red-200">
                                                                    {runResult.compile_output || runResult.stderr}
                                                                </pre>
                                                            </div>
                                                        )}

                                                        {/* No Output */}
                                                        {!runResult.stdout && !runResult.stderr && !runResult.compile_output && runResult.success && (
                                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-700 dark:text-blue-200 text-xs flex items-center gap-2">
                                                                <CheckCircle className="h-3 w-3" />
                                                                Code executed successfully with no output.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </ResizablePanel>
                                    </ResizablePanelGroup>
                                ) : (
                                    // When no output is shown, show full editor
                                    <div className="h-full">
                                        <Editor
                                            height="100%"
                                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                            language={language === "c" ? "cpp" : language}
                                            value={code}
                                            onChange={(val) => setCode(val || "")}
                                            options={{
                                                fontSize: 14,
                                                minimap: { enabled: false },
                                                scrollBeyondLastLine: false,
                                                automaticLayout: true,
                                                autoClosingBrackets: "always",
                                                autoClosingQuotes: "always",
                                                formatOnType: true,
                                                formatOnPaste: true,
                                                wordWrap: 'on',
                                                lineNumbers: 'on',
                                                renderWhitespace: 'selection',
                                                tabSize: 2,
                                                insertSpaces: true
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Input Section for STDIN */}
                            <div className="flex-shrink-0 p-2 border-t">
                                <Label className="text-xs text-muted-foreground">Input (stdin) - Optional:</Label>
                                <textarea
                                    value={stdin}
                                    onChange={(e) => setStdin(e.target.value)}
                                    placeholder="Enter input for your program here..."
                                    className="w-full mt-1 p-2 text-sm border rounded resize-none"
                                    rows="2"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex-shrink-0 flex justify-between gap-2 p-2 border-t">
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={performAutoSave}
                                        disabled={autoSaveStatus === 'saving' || !hasUnsavedChanges}
                                    >
                                        {autoSaveStatus === 'saving' ? 'Saving...' : 'Save Code'}
                                    </Button>

                                    <Button
                                        variant="secondary"
                                        onClick={handleRunCode}
                                        disabled={isRunning || !code.trim()}
                                        className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {isRunning ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                                Running...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="h-4 w-4" />
                                                Run Code
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* Practice mode doesn't have submit - just save and run */}
                                <div className="text-xs text-muted-foreground flex items-center">
                                    Practice Mode - No submission required
                                </div>
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </main>
        </div>
    );
};

export default Practice_Platform;
