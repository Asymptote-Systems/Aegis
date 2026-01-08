//QuestionsManagement.jsx 

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import HTMLEditor from './components/HTMLEditor';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  TestTube,
  Tag,
  Database,
  Clock,
  FileText,
  FileCheck,
  BookOpenCheck,
  Eye
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { toast } from "sonner"

const host_ip = import.meta.env.VITE_HOST_IP;
const API_BASE_URL = `http://${host_ip}:8000`;

// Utility function for API calls
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

export default function QuestionsManagement() {
  // State management
  const [activeTab, setActiveTab] = useState("questions");
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  // Dialog states
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isTestCaseDialogOpen, setIsTestCaseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isEditorFullScreen, setIsEditorFullScreen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfMode, setPdfMode] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState(null);
  const [uploadedPdfInfo, setUploadedPdfInfo] = useState(null);
  const [pdfPreviewDialogOpen, setPdfPreviewDialogOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);

  // Solution-related states (NEW)
  const [solutionMode, setSolutionMode] = useState(false); // 'html' or 'pdf'
  const [selectedSolutionPdfFile, setSelectedSolutionPdfFile] = useState(null);
  const [uploadedSolutionPdfInfo, setUploadedSolutionPdfInfo] = useState(null);
  const [solutionPreviewUrl, setSolutionPreviewUrl] = useState(null);
  const [showSolutionPreview, setShowSolutionPreview] = useState(false);
  const [solutionPreviewDialogOpen, setSolutionPreviewDialogOpen] = useState(false);
  const [isSolutionEditorFullScreen, setIsSolutionEditorFullScreen] = useState(false);

  // Form states
  const [questionForm, setQuestionForm] = useState({
    title: '',
    description: '',
    problem_statement: '',
    difficulty: 'easy',
    max_score: 100,
    is_active: true,
    category_id: '',
    statement_type: 'html',
    pdfFile: null,
    // Solution fields (NEW)
    has_solution: false,
    solution_type: 'html',
    solution_text: '',
    solution_pdf_file: null,
    extra_data: {}
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    is_active: true,
    extra_data: {}
  });

  const [testCaseForm, setTestCaseForm] = useState({
    input_data: '',
    expected_output: '',
    is_sample: false,
    is_hidden: false,
    extra_data: {},
    question_id: ''
  });

  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedQuestionForTestCases, setSelectedQuestionForTestCases] = useState(null);

  // MCQ state management (existing)
  const [mcqs, setMcqs] = useState([]);
  const [loadingMcqs, setLoadingMcqs] = useState(false);
  const [mcqForm, setMcqForm] = useState({
    title: '',
    description: '',
    category_id: '',
    difficulty: 'easy',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: 1,
    shuffle_options: false,
    explanation: '',
    max_score: 100,
    partial_scoring: false,
    is_active: true,
    extra_data: {}
  });
  const [editingMcq, setEditingMcq] = useState(null);
  const [mcqDialogOpen, setMcqDialogOpen] = useState(false);
  const [mcqPreviewDialogOpen, setMcqPreviewDialogOpen] = useState(false);
  const [previewMcq, setPreviewMcq] = useState(null);
  const [mcqSearchTerm, setMcqSearchTerm] = useState("");
  const [mcqFilterCategory, setMcqFilterCategory] = useState("all");
  const [mcqFilterDifficulty, setMcqFilterDifficulty] = useState("all");

  // Load data on component mount
  useEffect(() => {
    loadQuestions();
    loadCategories();
    loadMcqs();
  }, []);

  // Auto-fullscreen when reaching step 2 or solution step
  useEffect(() => {
    if (currentStep === 2) {
      setIsEditorFullScreen(true);
    } else if (currentStep === 3 && questionForm.solution_type === 'html') {
      setIsSolutionEditorFullScreen(true);
    }
  }, [currentStep, questionForm.solution_type]);

  // Reset pagination when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterDifficulty]);

  // Helper functions
  const getTags = (question) => {
    return question.extra_data?.tags || [];
  };

  // Import JSONL data function (existing)
  const handleImportJSONLData = async () => {
    setLoading(true);
    try {
      await apiCall('/admin/import-leetcode-jsonl/', {
        method: 'POST',
        body: JSON.stringify({
          file_paths: [
            'backend/LeetCodeDataset-v0.3.1-train.jsonl',
          ],
          overwrite: false
        })
      });

      await loadQuestions();
      await loadCategories();
      //alert('LeetCode JSONL data imported successfully!');
      toast.success('LeetCode JSONL data imported successfully!');
    } catch (error) {
      console.error('Import failed:', error);
      //alert('Import failed. Please check console for details.');
      toast.error('Import failed. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Load questions from API (existing but updated to handle solution fields)
  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/questions/?skip=0&limit=10000');

      if (Array.isArray(data)) {
        const sortedQuestions = data.sort((a, b) => {
          const aQuestionId = a.extra_data?.question_id;
          const bQuestionId = b.extra_data?.question_id;

          if (aQuestionId && bQuestionId) {
            return parseInt(aQuestionId) - parseInt(bQuestionId);
          }

          if (!aQuestionId && bQuestionId) {
            return -1;
          }

          if (aQuestionId && !bQuestionId) {
            return 1;
          }

          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

        setQuestions(sortedQuestions);
      } else {
        setQuestions([]);
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load categories and MCQs (existing)
  const loadCategories = async () => {
    try {
      const data = await apiCall('/question-categories/?skip=0&limit=100');
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  const loadMcqs = async () => {
    setLoadingMcqs(true);
    try {
      const data = await apiCall('/mcqs/?skip=0&limit=10000');
      if (Array.isArray(data)) {
        const sortedMcqs = data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setMcqs(sortedMcqs);
      } else {
        setMcqs([]);
      }
    } catch (error) {
      console.error('Failed to load MCQs:', error);
      setMcqs([]);
    } finally {
      setLoadingMcqs(false);
    }
  };

  // Load test cases for a specific question (existing)
  const loadTestCases = async (questionId) => {
    try {
      const data = await apiCall(`/questions/${questionId}/test-cases/`);
      setTestCases(Array.isArray(data) ? data : []);
    } catch (error) {
      try {
        const allData = await apiCall(`/question-test-cases/?skip=0&limit=1000`);
        const filteredTestCases = Array.isArray(allData) ?
          allData.filter(tc => tc.question_id === questionId) : [];
        setTestCases(filteredTestCases);
      } catch (fallbackError) {
        console.error('Failed to load test cases:', fallbackError);
        setTestCases([]);
      }
    }
  };

  // Create or update question (UPDATED to handle solutions)
  const handleQuestionSubmit = async () => {
    setLoading(true);
    try {
      let result;

      if (questionForm.pdfFile || questionForm.solution_pdf_file) {
        // Handle file uploads
        const endpoint = editingQuestion ? `/questions/${editingQuestion.id}` : '/questions/';
        const method = editingQuestion ? 'PUT' : 'POST';

        // First, create/update the question without files
        const questionData = { ...questionForm };
        delete questionData.pdfFile;
        delete questionData.solution_pdf_file;

        result = await apiCall(endpoint, {
          method,
          body: JSON.stringify(questionData),
        });

        // Upload statement PDF if provided
        if (questionForm.pdfFile) {
          const formData = new FormData();
          formData.append('file', questionForm.pdfFile);

          const token = localStorage.getItem('access_token');
          const uploadResponse = await fetch(`${API_BASE_URL}/questions/${result.id}/upload-pdf/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData
          });

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload statement PDF file');
          }
        }

        // Upload solution PDF if provided
        if (questionForm.solution_pdf_file) {
          const formData = new FormData();
          formData.append('file', questionForm.solution_pdf_file);

          const token = localStorage.getItem('access_token');
          const uploadResponse = await fetch(`${API_BASE_URL}/questions/${result.id}/upload-solution-pdf/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData
          });

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload solution PDF file');
          }
        }

        // Refresh the question data
        const updatedQuestion = await apiCall(`/questions/${result.id}`);
        result = updatedQuestion;

      } else {
        // Handle regular question creation/update
        const endpoint = editingQuestion ? `/questions/${editingQuestion.id}` : '/questions/';
        const method = editingQuestion ? 'PUT' : 'POST';

        result = await apiCall(endpoint, {
          method,
          body: JSON.stringify(questionForm),
        });
      }

      // Update questions list
      if (editingQuestion) {
        setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? result : q));
      } else {
        setQuestions(prev => {
          const leetcodeQuestions = prev.filter(q => q.extra_data?.question_id);
          const newQuestions = prev.filter(q => !q.extra_data?.question_id);
          return [result, ...newQuestions, ...leetcodeQuestions];
        });
      }

      setIsEditorFullScreen(false);
      setIsSolutionEditorFullScreen(false);
      setIsQuestionDialogOpen(false);
      resetQuestionForm();
    } catch (error) {
      console.error('Failed to save question:', error);
      //alert('Failed to save question: ' + error.message);
      toast.error('Failed to save question: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle solution PDF upload (NEW)
  const handleSolutionPdfUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      //alert('Please select a PDF file');
      toast.warning('Please select a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      //alert('File size too large (max 10MB)');
      toast.warning('File size too large (max 10MB)');
      return;
    }

    setQuestionForm(prev => ({
      ...prev,
      solution_pdf_file: file,
      solution_type: 'pdf',
      has_solution: true
    }));

    setUploadedSolutionPdfInfo({
      filename: file.name,
      size: file.size
    });

    const previewUrl = URL.createObjectURL(file);
    setSolutionPreviewUrl(previewUrl);
  };

  // Handle statement PDF upload (existing but updated)
  const handlePdfUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      //alert('Please select a PDF file');
      toast.warning('Please select a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      //alert('File size too large (max 10MB)');
      toast.warning('File size too large (max 10MB)');
      return;
    }

    setQuestionForm(prev => ({
      ...prev,
      pdfFile: file,
      statement_type: 'pdf'
    }));

    setUploadedPdfInfo({
      filename: file.name,
      size: file.size
    });

    const previewUrl = URL.createObjectURL(file);
    setPdfPreviewUrl(previewUrl);
  };

  // View existing solution PDF (NEW)
  const handleViewExistingSolutionPdf = async (questionId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/questions/${questionId}/solution-pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setSolutionPreviewUrl(url);
        setShowSolutionPreview(true);
      } else {
        //alert('Failed to load solution PDF preview');
        toast.error('Failed to load solution PDF preview');
      }
    } catch (error) {
      console.error('Error loading solution PDF:', error);
      //alert('Error loading solution PDF preview');
      toast.error('Error loading solution PDF preview')
    }
  };

  // View existing statement PDF (existing)
  const handleViewExistingPdf = async (questionId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/questions/${questionId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl(url);
        setShowPdfPreview(true);
      } else {
        //alert('Failed to load PDF preview');
        toast.error('Failed to load PDF preview')
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
      //alert('Error loading PDF preview');
      toast.error('Error loading PDF preview')
    }
  };

  // Reset question form (UPDATED to include solution fields)
  const resetQuestionForm = () => {
    // Clean up preview URLs
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
    if (solutionPreviewUrl) {
      URL.revokeObjectURL(solutionPreviewUrl);
      setSolutionPreviewUrl(null);
    }

    setQuestionForm({
      title: '',
      description: '',
      problem_statement: '',
      difficulty: 'easy',
      max_score: 100,
      is_active: true,
      category_id: '',
      statement_type: 'html',
      pdfFile: null,
      has_solution: false,
      solution_type: 'html',
      solution_text: '',
      solution_pdf_file: null,
      extra_data: {}
    });

    setEditingQuestion(null);
    setCurrentStep(1);
    setIsEditorFullScreen(false);
    setIsSolutionEditorFullScreen(false);

    // Reset all PDF-related states
    setPdfMode(false);
    setSolutionMode(false);
    setSelectedPdfFile(null);
    setSelectedSolutionPdfFile(null);
    setUploadedPdfInfo(null);
    setUploadedSolutionPdfInfo(null);
    setShowPdfPreview(false);
    setShowSolutionPreview(false);
    setPdfPreviewDialogOpen(false);
    setSolutionPreviewDialogOpen(false);
  };

  // Handle edit question (UPDATED to include solution fields)
  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setQuestionForm({
      title: question.title || '',
      description: question.description || '',
      problem_statement: question.problem_statement || '',
      difficulty: question.difficulty || 'easy',
      max_score: question.max_score || 100,
      is_active: question.is_active !== false,
      category_id: question.category_id || '',
      statement_type: question.statement_type || 'html',
      pdfFile: null,
      has_solution: question.has_solution || false,
      solution_type: question.solution_type || 'html',
      solution_text: question.solution_text || '',
      solution_pdf_file: null,
      extra_data: question.extra_data || {}
    });

    // Set PDF info if editing a PDF question
    if (question.statement_type === 'pdf' && question.pdf_filename) {
      setUploadedPdfInfo({
        filename: question.pdf_filename,
        size: question.pdf_filesize || 0,
        isExisting: true
      });
    }

    // Set solution PDF info if editing a question with PDF solution
    if (question.has_solution && question.solution_type === 'pdf' && question.solution_pdf_filename) {
      setUploadedSolutionPdfInfo({
        filename: question.solution_pdf_filename,
        size: question.solution_pdf_filesize || 0,
        isExisting: true
      });
    }

    setCurrentStep(1);
    setIsQuestionDialogOpen(true);
  };

  // Other existing functions (categories, test cases, MCQs) remain the same...
  const handleCategorySubmit = async () => {
    setLoading(true);
    try {
      const endpoint = editingCategory ? `/question-categories/${editingCategory.id}` : '/question-categories/';
      const method = editingCategory ? 'PUT' : 'POST';

      await apiCall(endpoint, {
        method,
        body: JSON.stringify(categoryForm),
      });

      await loadCategories();
      resetCategoryForm();
      setIsCategoryDialogOpen(false);
    } catch (error) {
      console.error('Failed to save category:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestCaseSubmit = async () => {
    setLoading(true);
    try {
      await apiCall('/question-test-cases/', {
        method: 'POST',
        body: JSON.stringify(testCaseForm),
      });

      await loadTestCases(selectedQuestionForTestCases);
      resetTestCaseForm();
      setIsTestCaseDialogOpen(false);
    } catch (error) {
      console.error('Failed to save test case:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setLoading(true);
    try {
      if (deleteTarget.type === 'question') {
        await apiCall(`/questions/${deleteTarget.id}`, { method: 'DELETE' });
        await loadQuestions();
      } else if (deleteTarget.type === 'category') {
        await apiCall(`/question-categories/${deleteTarget.id}`, { method: 'DELETE' });
        await loadCategories();
      } else if (deleteTarget.type === 'testcase') {
        await apiCall(`/question-test-cases/${deleteTarget.id}`, { method: 'DELETE' });
        await loadTestCases(selectedQuestionForTestCases);
      }

      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      is_active: true,
      extra_data: {}
    });
    setEditingCategory(null);
  };

  const resetTestCaseForm = () => {
    setTestCaseForm({
      input_data: '',
      expected_output: '',
      is_sample: false,
      is_hidden: false,
      extra_data: {},
      question_id: selectedQuestionForTestCases || ''
    });
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name || '',
      description: category.description || '',
      is_active: category.is_active !== false,
      extra_data: category.extra_data || {}
    });
    setIsCategoryDialogOpen(true);
  };

  // Navigation functions (UPDATED to handle solution step)
  const handleCloseEditor = () => {
    setIsEditorFullScreen(false);
    setIsSolutionEditorFullScreen(false);
    setIsQuestionDialogOpen(false);
    resetQuestionForm();
  };

  const handleGoToPrevious = () => {
    if (currentStep === 3) {
      setCurrentStep(2);
      setIsSolutionEditorFullScreen(false);
      setIsEditorFullScreen(true);
    } else if (currentStep === 2) {
      setCurrentStep(1);
      setIsEditorFullScreen(false);
    }
  };

  const handleGoToNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
      setIsEditorFullScreen(true);
    } else if (currentStep === 2 && questionForm.has_solution) {
      setCurrentStep(3);
      setIsEditorFullScreen(false);
      if (questionForm.solution_type === 'html') {
        setIsSolutionEditorFullScreen(true);
      }
    }
  };

  // Helper functions
  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || question.category_id === filterCategory;
    const matchesDifficulty = filterDifficulty === 'all' || question.difficulty === filterDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSelectedQuestionForTestCases = () => {
    return selectedQuestionForTestCases ?
      questions.find(q => q.id === selectedQuestionForTestCases) : null;
  };

  // Render question statement (UPDATED to show solution indicator)
  const renderQuestionStatement = (question) => {
    if (question.statement_type === 'pdf') {
      return (
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <FileText className="h-4 w-4 text-red-500" />
            <span className="text-sm text-muted-foreground">PDF Statement</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPreviewPdfUrl(`${API_BASE_URL}/questions/${question.id}/pdf/`);
              setPdfPreviewDialogOpen(true);
            }}
          >
            View PDF
          </Button>
          {question.has_solution && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <BookOpenCheck className="h-3 w-3 mr-1" />
              Has Solution
            </Badge>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        <div className="max-w-md truncate">
          {question.description?.replace(/<[^>]*>/g, '').substring(0, 100) || 'No description'}
        </div>
        {question.has_solution && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <BookOpenCheck className="h-3 w-3 mr-1" />
            Has Solution
          </Badge>
        )}
      </div>
    );
  };

  // MCQ functions (existing, unchanged)
  const handleMcqSubmit = async () => {
    setLoadingMcqs(true);
    try {
      if (!mcqForm.title || !mcqForm.category_id || !mcqForm.question_text) {
        //alert('Please fill all required fields: Title, Category, and Question Text');
        toast.warning('Please fill all required fields: Title, Category, and Question Text')
        return;
      }

      if (mcqForm.options.some(opt => !opt.trim())) {
        //alert('Please fill all 4 options');
        toast.warning('Please fill all 4 options')
        return;
      }

      const endpoint = editingMcq ? `/mcqs/${editingMcq.id}` : '/mcqs/';
      const method = editingMcq ? 'PUT' : 'POST';

      const result = await apiCall(endpoint, {
        method,
        body: JSON.stringify(mcqForm),
      });

      if (editingMcq) {
        setMcqs(prev => prev.map(m => m.id === editingMcq.id ? result : m));
      } else {
        setMcqs(prev => [result, ...prev]);
      }

      setMcqDialogOpen(false);
      resetMcqForm();
    } catch (error) {
      console.error('Failed to save MCQ:', error);
      //alert('Failed to save MCQ. Please try again.');
      toast.error('Failed to save MCQ. Please try again.')
    } finally {
      setLoadingMcqs(false);
    }
  };

  const resetMcqForm = () => {
    setMcqForm({
      title: '',
      description: '',
      category_id: '',
      difficulty: 'easy',
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: 1,
      shuffle_options: false,
      explanation: '',
      max_score: 100,
      partial_scoring: false,
      is_active: true,
      extra_data: {}
    });
    setEditingMcq(null);
  };

  const handleEditMcq = (mcq) => {
    setEditingMcq(mcq);
    setMcqForm({
      title: mcq.title || '',
      description: mcq.description || '',
      category_id: mcq.category_id || '',
      difficulty: mcq.difficulty || 'easy',
      question_text: mcq.question_text || '',
      options: mcq.options || ['', '', '', ''],
      correct_answer: mcq.correct_answer || 1,
      shuffle_options: mcq.shuffle_options || false,
      explanation: mcq.explanation || '',
      max_score: mcq.max_score || 100,
      partial_scoring: mcq.partial_scoring || false,
      is_active: mcq.is_active !== false,
      extra_data: mcq.extra_data || {}
    });
    setMcqDialogOpen(true);
  };

  const deleteMcq = async (mcqId) => {
    if (!confirm('Are you sure you want to delete this MCQ?')) return;

    try {
      await apiCall(`/mcqs/${mcqId}`, { method: 'DELETE' });
      setMcqs(prev => prev.filter(m => m.id !== mcqId));
    } catch (error) {
      console.error('Failed to delete MCQ:', error);
      //alert('Failed to delete MCQ. Please try again.');
      toast.error('Failed to delete MCQ. Please try again.')
    }
  };

  const filteredMcqs = mcqs.filter(mcq => {
    const matchesSearch = mcq.title?.toLowerCase().includes(mcqSearchTerm.toLowerCase()) ||
      mcq.description?.toLowerCase().includes(mcqSearchTerm.toLowerCase()) ||
      mcq.question_text?.toLowerCase().includes(mcqSearchTerm.toLowerCase());
    const matchesCategory = mcqFilterCategory === 'all' || mcq.category_id === mcqFilterCategory;
    const matchesDifficulty = mcqFilterDifficulty === 'all' || mcq.difficulty === mcqFilterDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <div className="space-y-6">
      <TooltipProvider>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="mcqs">MCQs</TabsTrigger>
            <TabsTrigger value="testcases">
              Test Cases
              {selectedQuestionForTestCases && ` (${testCases.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Questions Tab (UPDATED) */}
          <TabsContent value="questions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Questions Database
                    </CardTitle>
                    <CardDescription>
                      Manage your coding questions with solutions and test cases ({questions.length} questions loaded)
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleImportJSONLData}
                      variant="outline"
                      className="flex items-center gap-2"
                      disabled={loading}
                    >
                      <Database className="h-4 w-4" />
                      Import Questions
                    </Button>
                    <Button
                      onClick={() => {
                        resetQuestionForm();
                        setIsQuestionDialogOpen(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Question
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter Controls */}
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search questions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by category" />
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
                  <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Questions Table (UPDATED to show solution indicators) */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Max Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex items-center justify-center gap-2 text-gray-500">
                              <Clock className="h-6 w-6 animate-spin" />
                              <span>Loading questions, do not refresh</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredQuestions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No questions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredQuestions
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((question) => (
                            <TableRow key={question.id}>
                              <TableCell className="font-medium">
                                <div>
                                  <p className="font-semibold">{question.title}</p>
                                  {renderQuestionStatement(question)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {getCategoryName(question.category_id)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={getDifficultyColor(question.difficulty)}>
                                  {question.difficulty}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {getTags(question).slice(0, 3).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs bg-blue-50">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {getTags(question).length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{getTags(question).length - 3}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{question.max_score}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge variant={question.is_active ? "default" : "secondary"}>
                                    {question.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditQuestion(question)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Edit Question</p>
                                    </TooltipContent>
                                  </Tooltip>

                                  {/* Solution View Button (NEW) */}
                                  {question.has_solution && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            if (question.solution_type === 'pdf') {
                                              handleViewExistingSolutionPdf(question.id);
                                            } else {
                                              // Show HTML solution in a dialog or modal
                                              alert('HTML Solution: ' + (question.solution_text || 'No solution text available'));
                                            }
                                          }}
                                        >
                                          <BookOpenCheck className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>View Solution</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedQuestionForTestCases(question.id);
                                          loadTestCases(question.id);
                                          setActiveTab("testcases");
                                        }}
                                      >
                                        <TestTube className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Manage Test Cases</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setDeleteTarget({ type: 'question', id: question.id, name: question.title });
                                          setDeleteDialogOpen(true);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Delete Question</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {filteredQuestions.length > 0 && (
                  <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="text-sm text-gray-700">
                      Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredQuestions.length)} to{' '}
                      {Math.min(currentPage * itemsPerPage, filteredQuestions.length)} of{' '}
                      {filteredQuestions.length} questions
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Previous
                      </Button>

                      <div className="flex items-center space-x-2">
                        <span className="text-sm">Page</span>
                        <Input
                          type="number"
                          min="1"
                          max={Math.ceil(filteredQuestions.length / itemsPerPage)}
                          value={currentPage}
                          onChange={(e) => {
                            const page = parseInt(e.target.value);
                            if (page >= 1 && page <= Math.ceil(filteredQuestions.length / itemsPerPage)) {
                              setCurrentPage(page);
                            }
                          }}
                          className="w-16 h-8 text-center"
                        />
                        <span className="text-sm">of {Math.ceil(filteredQuestions.length / itemsPerPage)}</span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredQuestions.length / itemsPerPage)))}
                        disabled={currentPage === Math.ceil(filteredQuestions.length / itemsPerPage)}
                      >
                        Next
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab (unchanged) */}
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Question Categories
                    </CardTitle>
                    <CardDescription>
                      Organize your questions into categories
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      resetCategoryForm();
                      setIsCategoryDialogOpen(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categories.map((category) => (
                    <Card key={category.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditCategory(category)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit Category</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setDeleteTarget({ type: 'category', id: category.id, name: category.name });
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete Category</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                        <div className="flex justify-between items-center text-sm">
                          <Badge variant={category.is_active ? "default" : "secondary"}>
                            {category.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-gray-500">
                            {((count) => `${count} question${count !== 1 ? 's' : ''}`)(questions.filter(q => q.category_id === category.id).length)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MCQs Tab (unchanged) */}
          <TabsContent value="mcqs" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      MCQ Questions Database
                    </CardTitle>
                    <CardDescription>
                      Manage your multiple choice questions ({mcqs.length} MCQs loaded)
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      resetMcqForm();
                      setMcqDialogOpen(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add MCQ
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter Controls */}
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search MCQs..."
                        value={mcqSearchTerm}
                        onChange={(e) => setMcqSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={mcqFilterCategory} onValueChange={setMcqFilterCategory}>
                    <SelectTrigger className="w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by category" />
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
                  <Select value={mcqFilterDifficulty} onValueChange={setMcqFilterDifficulty}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* MCQs Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>Options</TableHead>
                        <TableHead>Max Score</TableHead>
                        <TableHead>Features</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingMcqs ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <div className="flex items-center justify-center gap-2 text-gray-500">
                              <Clock className="h-6 w-6 animate-spin" />
                              <span>Loading MCQs...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredMcqs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                            {mcqs.length === 0 ? 'No MCQs found. Create your first MCQ!' : 'No MCQs match your search criteria.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMcqs.map((mcq) => (
                          <TableRow key={mcq.id}>
                            <TableCell className="font-medium">
                              <div>
                                <p className="font-semibold">{mcq.title}</p>
                                <p className="text-sm text-gray-500 truncate max-w-xs">
                                  {mcq.description}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getCategoryName(mcq.category_id)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getDifficultyColor(mcq.difficulty)}>
                                {mcq.difficulty}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {mcq.options?.length || 0} options
                              </Badge>
                            </TableCell>
                            <TableCell>{mcq.max_score}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {mcq.shuffle_options && (
                                  <Badge variant="outline" className="text-xs bg-blue-50">
                                    Shuffle
                                  </Badge>
                                )}
                                {mcq.partial_scoring && (
                                  <Badge variant="outline" className="text-xs bg-green-50">
                                    Partial
                                  </Badge>
                                )}
                                {mcq.explanation && (
                                  <Badge variant="outline" className="text-xs bg-purple-50">
                                    Explanation
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={mcq.is_active ? "default" : "secondary"}>
                                {mcq.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditMcq(mcq)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit MCQ</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setPreviewMcq(mcq);
                                        setMcqPreviewDialogOpen(true);
                                      }}
                                    >
                                      <TestTube className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Preview MCQ</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteMcq(mcq.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete MCQ</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Cases Tab (unchanged) */}
          <TabsContent value="testcases" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      <TestTube className="mr-2 h-5 w-5" />
                      Test Cases
                      {getSelectedQuestionForTestCases() && (
                        <span className="text-base font-normal text-blue-700 ml-2">
                          - {getSelectedQuestionForTestCases().title}
                        </span>
                      )}
                      {selectedQuestionForTestCases && (
                        <Badge variant="outline" className="ml-2">
                          Question Selected
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {selectedQuestionForTestCases
                        ? `Manage test cases for: "${getSelectedQuestionForTestCases()?.title || 'Selected Question'}"`
                        : `Select a question from the Questions tab to manage its test cases`
                      }
                    </CardDescription>
                  </div>
                  {selectedQuestionForTestCases && (
                    <Button onClick={() => {
                      setTestCaseForm(prev => ({
                        ...prev,
                        question_id: selectedQuestionForTestCases
                      }));
                      setIsTestCaseDialogOpen(true);
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Test Case
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedQuestionForTestCases ? (
                  <div className="text-center py-8">
                    <TestTube className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No question selected</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Go to the Questions tab and click the test tube icon to select a question.
                    </p>
                  </div>
                ) : testCases.length === 0 ? (
                  <div className="text-center py-8">
                    <TestTube className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No test cases</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by creating a new test case for this question.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Input</TableHead>
                        <TableHead>Expected Output</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Visibility</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testCases.map((testCase) => (
                        <TableRow key={testCase.id}>
                          <TableCell>
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                              {testCase.input_data?.substring(0, 50)}
                              {testCase.input_data?.length > 50 && '...'}
                            </code>
                          </TableCell>
                          <TableCell>
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                              {testCase.expected_output?.substring(0, 50)}
                              {testCase.expected_output?.length > 50 && '...'}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant={testCase.is_sample ? "default" : "secondary"}>
                              {testCase.is_sample ? "Sample" : "Test"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={testCase.is_hidden ? "destructive" : "default"}>
                              {testCase.is_hidden ? "Hidden" : "Visible"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDeleteTarget({ type: 'testcase', id: testCase.id });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Question Create/Edit Dialog (UPDATED with 3-step process) */}
        {!isEditorFullScreen && !isSolutionEditorFullScreen && (
          <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingQuestion ? 'Edit Question' : 'Create New Question'}
                </DialogTitle>
                <DialogDescription>
                  Step {currentStep} of {questionForm.has_solution ? '3' : '2'}: {
                    currentStep === 1 ? 'Basic Information' :
                      currentStep === 2 ? 'Problem Statement' :
                        'Solution (Optional)'
                  }
                </DialogDescription>
              </DialogHeader>

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={questionForm.title}
                        onChange={(e) => setQuestionForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter question title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={questionForm.category_id}
                        onValueChange={(value) => setQuestionForm(prev => ({ ...prev, category_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select
                        value={questionForm.difficulty}
                        onValueChange={(value) => setQuestionForm(prev => ({ ...prev, difficulty: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxScore">Max Score</Label>
                      <Input
                        id="maxScore"
                        type="number"
                        value={questionForm.max_score}
                        onChange={(e) => setQuestionForm(prev => ({ ...prev, max_score: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={questionForm.description}
                      onChange={(e) => setQuestionForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the question"
                      rows={3}
                    />
                  </div>

                  {/* Statement Type Selection */}
                  <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <Label className="text-base font-semibold">Problem Statement Type</Label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="html_statement"
                          name="statement_type"
                          checked={!pdfMode}
                          onChange={() => setPdfMode(false)}
                        />
                        <Label htmlFor="html_statement">HTML Editor</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="pdf_statement"
                          name="statement_type"
                          checked={pdfMode}
                          onChange={() => setPdfMode(true)}
                        />
                        <Label htmlFor="pdf_statement">Upload PDF</Label>
                      </div>
                    </div>

                    {/* PDF Upload Section */}
                    {pdfMode && (
                      <div className="space-y-3">
                        <Label htmlFor="pdf_upload">Upload PDF Statement *</Label>
                        <input
                          id="pdf_upload"
                          type="file"
                          accept=".pdf"
                          onChange={handlePdfUpload}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {uploadedPdfInfo && (
                          <div className="p-4 border rounded-lg bg-green-50">
                            <p className="text-sm text-green-700">
                              PDF {uploadedPdfInfo.isExisting ? 'current' : 'selected'}: {uploadedPdfInfo.filename}
                              {uploadedPdfInfo.size > 0 && ` (${(uploadedPdfInfo.size / 1024).toFixed(1)} KB)`}
                            </p>
                            {uploadedPdfInfo.isExisting && editingQuestion && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`${API_BASE_URL}/questions/${editingQuestion.id}/pdf`, '_blank')}
                                className="mt-2"
                              >
                                View Current PDF
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Solution Section (NEW) */}
                  <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="has_solution"
                        checked={questionForm.has_solution}
                        onCheckedChange={(checked) => setQuestionForm(prev => ({
                          ...prev,
                          has_solution: checked,
                          solution_type: checked ? prev.solution_type : 'html'
                        }))}
                      />
                      <Label htmlFor="has_solution" className="text-base font-semibold">
                        Include Solution
                      </Label>
                    </div>

                    {questionForm.has_solution && (
                      <div className="space-y-4">
                        <Label className="text-base font-semibold">Solution Type</Label>
                        <div className="flex space-x-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="html_solution"
                              name="solution_type"
                              checked={questionForm.solution_type === 'html'}
                              onChange={() => setQuestionForm(prev => ({ ...prev, solution_type: 'html' }))}
                            />
                            <Label htmlFor="html_solution">HTML Editor</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="pdf_solution"
                              name="solution_type"
                              checked={questionForm.solution_type === 'pdf'}
                              onChange={() => setQuestionForm(prev => ({ ...prev, solution_type: 'pdf' }))}
                            />
                            <Label htmlFor="pdf_solution">Upload PDF</Label>
                          </div>
                        </div>

                        {/* Solution PDF Upload */}
                        {questionForm.solution_type === 'pdf' && (
                          <div className="space-y-3">
                            <Label htmlFor="solution_pdf_upload">Upload Solution PDF *</Label>
                            <input
                              id="solution_pdf_upload"
                              type="file"
                              accept=".pdf"
                              onChange={handleSolutionPdfUpload}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                            />
                            {uploadedSolutionPdfInfo && (
                              <div className="p-4 border rounded-lg bg-green-50">
                                <p className="text-sm text-green-700">
                                  Solution PDF {uploadedSolutionPdfInfo.isExisting ? 'current' : 'selected'}: {uploadedSolutionPdfInfo.filename}
                                  {uploadedSolutionPdfInfo.size > 0 && ` (${(uploadedSolutionPdfInfo.size / 1024).toFixed(1)} KB)`}
                                </p>
                                {uploadedSolutionPdfInfo.isExisting && editingQuestion && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(`${API_BASE_URL}/questions/${editingQuestion.id}/solution-pdf`, '_blank')}
                                    className="mt-2"
                                  >
                                    View Current Solution PDF
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Show tags if editing */}
                  {editingQuestion && (
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {getTags(editingQuestion).map((tag) => (
                          <Badge key={tag} variant="outline" className="bg-blue-50">
                            {tag}
                          </Badge>
                        ))}
                        {getTags(editingQuestion).length === 0 && (
                          <span className="text-sm text-gray-500">No tags</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={questionForm.is_active}
                      onCheckedChange={(checked) => setQuestionForm(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                </div>
              )}

              <DialogFooter>
                <div className="flex justify-between w-full">
                  <div></div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsQuestionDialogOpen(false)}>
                      Cancel
                    </Button>
                    {currentStep === 1 && (
                      <>
                        {!pdfMode ? (
                          <Button
                            onClick={handleGoToNext}
                            className="flex items-center gap-2"
                            disabled={!questionForm.title || !questionForm.category_id}
                          >
                            Next: Problem Statement
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            onClick={questionForm.has_solution && questionForm.solution_type === 'html' ? handleGoToNext : handleQuestionSubmit}
                            disabled={!questionForm.title || !questionForm.category_id || !questionForm.pdfFile ||
                              (questionForm.has_solution && questionForm.solution_type === 'pdf' && !questionForm.solution_pdf_file) || loading}
                            className="flex items-center gap-2"
                          >
                            {loading ? 'Creating...' :
                              questionForm.has_solution && questionForm.solution_type === 'html' ? 'Next: Solution' :
                                (editingQuestion ? 'Update Question' : 'Create Question')}
                            {questionForm.has_solution && questionForm.solution_type === 'html' && <ArrowRight className="h-4 w-4" />}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Fullscreen HTMLEditor for Problem Statement */}
        {isEditorFullScreen && currentStep === 2 && (
          <HTMLEditor
            value={questionForm.problem_statement}
            onChange={(value) => setQuestionForm(prev => ({ ...prev, problem_statement: value }))}
            onSave={questionForm.has_solution && questionForm.solution_type === 'html' ? handleGoToNext : handleQuestionSubmit}
            onClose={handleCloseEditor}
            onPrevious={handleGoToPrevious}
            loading={loading}
            editingQuestion={editingQuestion}
            title="Problem Statement"
            saveButtonText={questionForm.has_solution && questionForm.solution_type === 'html' ? 'Next: Solution' : (editingQuestion ? 'Update Question' : 'Create Question')}
          />
        )}

        {/* Fullscreen HTMLEditor for Solution (NEW) */}
        {isSolutionEditorFullScreen && currentStep === 3 && (
          <HTMLEditor
            value={questionForm.solution_text}
            onChange={(value) => setQuestionForm(prev => ({ ...prev, solution_text: value }))}
            onSave={handleQuestionSubmit}
            onClose={handleCloseEditor}
            onPrevious={handleGoToPrevious}
            loading={loading}
            editingQuestion={editingQuestion}
            title="Solution"
            saveButtonText={editingQuestion ? 'Update Question' : 'Create Question'}
            backgroundColor="bg-green-50"
          />
        )}

        {/* All other dialogs remain the same - Category, Test Cases, MCQ, etc. */}
        {/* Category Create/Edit Dialog */}
        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </DialogTitle>
              <DialogDescription>
                Categories help organize your questions by topic or subject area.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">Name *</Label>
                <Input
                  id="categoryName"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Data Structures, Algorithms"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryDescription">Description</Label>
                <Textarea
                  id="categoryDescription"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this category"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="categoryActive"
                  checked={categoryForm.is_active}
                  onCheckedChange={(checked) => setCategoryForm(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="categoryActive">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCategorySubmit} disabled={loading}>
                {loading ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Test Cases Dialog */}
        <Dialog open={isTestCaseDialogOpen} onOpenChange={setIsTestCaseDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Manage Test Cases</DialogTitle>
              <DialogDescription>
                Add and manage test cases for this question
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Add Test Case Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add New Test Case</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inputData">Input Data</Label>
                      <Textarea
                        id="inputData"
                        value={testCaseForm.input_data}
                        onChange={(e) => setTestCaseForm(prev => ({ ...prev, input_data: e.target.value }))}
                        placeholder="Enter input data"
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expectedOutput">Expected Output</Label>
                      <Textarea
                        id="expectedOutput"
                        value={testCaseForm.expected_output}
                        onChange={(e) => setTestCaseForm(prev => ({ ...prev, expected_output: e.target.value }))}
                        placeholder="Enter expected output"
                        rows={4}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isSample"
                        checked={testCaseForm.is_sample}
                        onCheckedChange={(checked) => setTestCaseForm(prev => ({ ...prev, is_sample: checked }))}
                      />
                      <Label htmlFor="isSample">Sample Test Case</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isHidden"
                        checked={testCaseForm.is_hidden}
                        onCheckedChange={(checked) => setTestCaseForm(prev => ({ ...prev, is_hidden: checked }))}
                      />
                      <Label htmlFor="isHidden">Hidden Test case</Label>
                    </div>
                  </div>

                  <Button onClick={handleTestCaseSubmit} disabled={loading}>
                    Add Test Case
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Test Cases */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Existing Test Cases</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {testCases.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No test cases found</p>
                    ) : (
                      testCases.map((testCase, index) => (
                        <div key={testCase.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex gap-2">
                              <Badge variant={testCase.is_sample ? "default" : "secondary"}>
                                {testCase.is_sample ? "Sample" : "Test"} Case {index + 1}
                              </Badge>
                              {testCase.is_hidden && (
                                <Badge variant="outline">Hidden</Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeleteTarget({ type: 'testcase', id: testCase.id, name: `Test Case ${index + 1}` });
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <Label>Input:</Label>
                              <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                                {testCase.input_data}
                              </pre>
                            </div>
                            <div>
                              <Label>Expected Output:</Label>
                              <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                                {testCase.expected_output}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTestCaseDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this item. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={loading}>
                {loading ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* MCQ Create/Edit Dialog (unchanged) */}
        <Dialog open={mcqDialogOpen} onOpenChange={setMcqDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMcq ? 'Edit MCQ Question' : 'Create New MCQ Question'}
              </DialogTitle>
              <DialogDescription>
                Create multiple choice questions with 4 options and flexible scoring
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mcq-title">Title *</Label>
                    <Input
                      id="mcq-title"
                      value={mcqForm.title}
                      onChange={(e) => setMcqForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter MCQ title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mcq-category">Category *</Label>
                    <Select
                      value={mcqForm.category_id}
                      onValueChange={(value) => setMcqForm(prev => ({ ...prev, category_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mcq-difficulty">Difficulty</Label>
                    <Select
                      value={mcqForm.difficulty}
                      onValueChange={(value) => setMcqForm(prev => ({ ...prev, difficulty: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mcq-maxScore">Max Score</Label>
                    <Input
                      id="mcq-maxScore"
                      type="number"
                      min="1"
                      value={mcqForm.max_score}
                      onChange={(e) => setMcqForm(prev => ({ ...prev, max_score: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mcq-description">Description</Label>
                  <Textarea
                    id="mcq-description"
                    value={mcqForm.description}
                    onChange={(e) => setMcqForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the MCQ"
                    rows={2}
                  />
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Question</h3>
                <div className="space-y-2">
                  <Label htmlFor="mcq-question">Question Text *</Label>
                  <Textarea
                    id="mcq-question"
                    value={mcqForm.question_text}
                    onChange={(e) => setMcqForm(prev => ({ ...prev, question_text: e.target.value }))}
                    placeholder="Enter your multiple choice question here..."
                    rows={4}
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Answer Options</h3>
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id={`correct-${index}`}
                          name="correct_answer"
                          checked={mcqForm.correct_answer === index + 1}
                          onChange={() => setMcqForm(prev => ({ ...prev, correct_answer: index + 1 }))}
                          className="mr-2"
                        />
                        <Label htmlFor={`correct-${index}`} className="text-sm font-medium">
                          Option {index + 1}:
                        </Label>
                      </div>
                      <Input
                        value={mcqForm.options[index]}
                        onChange={(e) => {
                          const newOptions = [...mcqForm.options];
                          newOptions[index] = e.target.value;
                          setMcqForm(prev => ({ ...prev, options: newOptions }));
                        }}
                        placeholder={`Enter option ${index + 1}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-600">Select the radio button next to the correct answer</p>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Advanced Settings</h3>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="mcq-shuffle"
                      checked={mcqForm.shuffle_options}
                      onCheckedChange={(checked) => setMcqForm(prev => ({ ...prev, shuffle_options: checked }))}
                    />
                    <Label htmlFor="mcq-shuffle">Shuffle Options</Label>
                    <span className="text-sm text-gray-500">(Randomize option order for each student)</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="mcq-partial"
                      checked={mcqForm.partial_scoring}
                      onCheckedChange={(checked) => setMcqForm(prev => ({ ...prev, partial_scoring: checked }))}
                    />
                    <Label htmlFor="mcq-partial">Partial Scoring</Label>
                    <span className="text-sm text-gray-500">(Allow partial points for incorrect answers)</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="mcq-active"
                      checked={mcqForm.is_active}
                      onCheckedChange={(checked) => setMcqForm(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="mcq-active">Active</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mcq-explanation">Explanation (Optional)</Label>
                  <Textarea
                    id="mcq-explanation"
                    value={mcqForm.explanation}
                    onChange={(e) => setMcqForm(prev => ({ ...prev, explanation: e.target.value }))}
                    placeholder="Explain why this answer is correct (shown after submission)..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMcqDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleMcqSubmit} disabled={loadingMcqs}>
                {loadingMcqs ? 'Saving...' : (editingMcq ? 'Update MCQ' : 'Create MCQ')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MCQ Preview Dialog (unchanged) */}
        <Dialog open={mcqPreviewDialogOpen} onOpenChange={setMcqPreviewDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TestTube className="h-6 w-6" />
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
                      <Badge className={getDifficultyColor(previewMcq.difficulty)}>
                        {previewMcq.difficulty}
                      </Badge>
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

        {/* PDF Preview Dialog for statement PDFs */}
        <Dialog open={pdfPreviewDialogOpen || showPdfPreview} onOpenChange={(open) => {
          setPdfPreviewDialogOpen(open);
          setShowPdfPreview(open);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                PDF Question Statement
              </DialogTitle>
            </DialogHeader>
            <div className="w-full h-[70vh] border rounded">
              {(previewPdfUrl || pdfPreviewUrl) && (
                <iframe
                  src={previewPdfUrl || pdfPreviewUrl}
                  width="100%"
                  height="100%"
                  className="rounded"
                  title="PDF Preview"
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setPdfPreviewDialogOpen(false);
                setShowPdfPreview(false);
              }}>
                Close
              </Button>
              <Button
                onClick={() => window.open(previewPdfUrl || pdfPreviewUrl, '_blank')}
                variant="default"
              >
                Open in New Tab
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Solution PDF Preview Dialog (NEW) */}
        <Dialog open={solutionPreviewDialogOpen || showSolutionPreview} onOpenChange={(open) => {
          setSolutionPreviewDialogOpen(open);
          setShowSolutionPreview(open);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpenCheck className="h-6 w-6" />
                Solution PDF Preview
              </DialogTitle>
            </DialogHeader>
            <div className="w-full h-[70vh] border rounded">
              {solutionPreviewUrl && (
                <iframe
                  src={solutionPreviewUrl}
                  width="100%"
                  height="100%"
                  className="rounded"
                  title="Solution PDF Preview"
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setSolutionPreviewDialogOpen(false);
                setShowSolutionPreview(false);
              }}>
                Close
              </Button>
              <Button
                onClick={() => window.open(solutionPreviewUrl, '_blank')}
                variant="default"
              >
                Open in New Tab
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </div>
  );
}
