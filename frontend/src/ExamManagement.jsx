import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  Users,
  FileText,
  Play,
  Eye,
  RefreshCw,
  ChevronRight,
  Download,
} from 'lucide-react';
import { SubmissionProcessor } from './components/SubmissionProcessor';
import SubmissionResultsDashboard from './SubmissionResultsDashboard';
import api from './api/apiClient';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Constants
const statusColors = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  active: 'bg-green-100 text-green-700 border-green-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
  archived: 'bg-orange-100 text-orange-700 border-orange-200'
};

const EXAM_TYPES_QUIZ = ['quiz'];

// Utility functions
function groupByStudent(submissions) {
  return submissions.reduce((acc, sub) => {
    if (!acc[sub.student_id]) acc[sub.student_id] = [];
    acc[sub.student_id].push(sub);
    return acc;
  }, {});
}

const ExamManagementPage = () => {
  // State declarations
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [examSubmissions, setExamSubmissions] = useState({});
  const [mcqSubmissionsByExam, setMcqSubmissionsByExam] = useState({});
  const [mcqs, setMcqs] = useState([]);
  const [students, setStudents] = useState([]);
  const [previewMcq, setPreviewMcq] = useState(null);

  // Memoized MCQ mapping
  const mcqsMap = useMemo(() => {
    const map = {};
    for (const m of mcqs) map[m.id] = m;
    return map;
  }, [mcqs]);

  useEffect(() => {
    fetchAll();
  }, []);

  // Fetch all data
  const fetchAll = async () => {
    await Promise.all([fetchExams(), fetchStudents(), fetchMcqs()]);
  };

  // Fetch exams and their submission counts
  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await api.get('/exams/?skip=0&limit=100');
      const examsData = response.data;
      setExams(examsData);

      // Fetch submission counts for each exam
      const submissionCounts = {};
      const mcqSubmissionCounts = {};

      await Promise.all(
        examsData.map(async (exam) => {
          try {
            if (EXAM_TYPES_QUIZ.includes(exam?.exam_type)) {
              // Handle quiz/MCQ exams
              const mcqResponse = await api.get(`/mcq-submissions/?exam_id=${exam.id}`);
              const filteredSubmissions = mcqResponse.data?.filter(sub => sub.exam_id === exam.id) || [];
              mcqSubmissionCounts[exam.id] = filteredSubmissions;
              submissionCounts[exam.id] = new Set(filteredSubmissions.map(s => s.student_id)).size;
            } else {
              // Handle coding exams
              const submissionsResponse = await api.get(`/exams/${exam.id}/submissions?skip=0&limit=1000`);
              submissionCounts[exam.id] = submissionsResponse.data.length;
            }
          } catch (error) {
            submissionCounts[exam.id] = 0;
          }
        })
      );

      setExamSubmissions(submissionCounts);
      setMcqSubmissionsByExam(mcqSubmissionCounts);
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data } = await api.get('/users/?role=student&limit=1000');
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchMcqs = async () => {
    try {
      const { data } = await api.get('/mcqs/?limit=1000');
      setMcqs(data || []);
    } catch (error) {
      console.error('Error fetching MCQs:', error);
    }
  };

  // Navigation functions
  const selectExam = (exam) => {
    setSelectedExam(exam);
  };

  const goBackToList = () => {
    setSelectedExam(null);
    setPreviewMcq(null);
  };

  // Get submission count for an exam
  const getSubmissionCount = (exam) => {
    return examSubmissions[exam.id] || 0;
  };

  // Export quiz results
  const exportResults = () => {
    if (!selectedExam || !EXAM_TYPES_QUIZ.includes(selectedExam?.exam_type)) {
      alert('Export only supported for quiz exams.');
      return;
    }

    const examSpecificSubmissions = mcqSubmissionsByExam[selectedExam.id] || [];
    const groupedSubs = groupByStudent(examSpecificSubmissions);
    const studentIds = Object.keys(groupedSubs);

    const rows = [];
    for (const studentId of studentIds) {
      const studentRows = groupedSubs[studentId];
      if (!studentRows) continue;
      
      for (const sub of studentRows) {
        const mcq = mcqsMap[sub.mcq_id];
        const student = students.find((s) => s.id === studentId);
        rows.push({
          Student: student?.email || studentId,
          Question: mcq?.title || '',
          'Student Answer': mcq?.options?.[sub.selected_answer - 1] || '',
          'Correct Answer': mcq?.options?.[mcq?.correct_answer - 1] || '',
          Score: sub.score,
          'Max Score': mcq?.max_score || 0,
          'Submitted At': sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '',
        });
      }
    }

    if (!rows.length) {
      alert('No submissions found to export');
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([wbout], { type: 'application/octet-stream' }),
      `${selectedExam.title}_results.xlsx`
    );
  };

  if (selectedExam) {
    return (
      <SelectedExamView
        exam={selectedExam}
        submissionCount={getSubmissionCount(selectedExam)}
        onBack={goBackToList}
        mcqSubmissions={mcqSubmissionsByExam[selectedExam.id] || []}
        mcqsMap={mcqsMap}
        students={students}
        onPreview={setPreviewMcq}
        onExport={exportResults}
        previewMcq={previewMcq}
        setPreviewMcq={setPreviewMcq}
      />
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Exam Management</h1>
            <p className="text-muted-foreground">
              Select an exam to process submissions and view results
            </p>
          </div>
          <Button onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{exams.length}</p>
                  <p className="text-xs text-muted-foreground">Total Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Play className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {exams.filter(e => e.status === 'active').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {Object.values(examSubmissions).reduce((sum, count) => sum + count, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {exams.filter(e => e.status === 'draft').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Draft Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exams List */}
        <Card>
          <CardHeader>
            <CardTitle>Available Exams</CardTitle>
            <CardDescription>Click on an exam to manage submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading exams...</p>
              </div>
            ) : exams.length > 0 ? (
              <div className="space-y-3">
                {exams.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    submissionCount={getSubmissionCount(exam)}
                    onSelect={() => selectExam(exam)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No exams found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Individual Exam Card Component
const ExamCard = ({ exam, submissionCount, onSelect }) => {
  return (
    <div
      className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="font-semibold text-lg truncate">{exam.title}</h3>
            <Badge className={`${statusColors[exam.status] || statusColors.draft} border`}>
              {exam.status.toUpperCase()}
            </Badge>
            {EXAM_TYPES_QUIZ.includes(exam?.exam_type) && (
              <Badge variant="secondary">QUIZ</Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {exam.description || 'No description provided'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Start: {new Date(exam.start_time).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Clock className="w-4 h-4 mr-2" />
              <span>Duration: {exam.duration_minutes} min</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Users className="w-4 h-4 mr-2" />
              <span>{submissionCount} submissions</span>
            </div>
          </div>
        </div>
        <div className="flex items-center ml-4">
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};

// Selected Exam View Component
const SelectedExamView = ({
  exam,
  submissionCount,
  onBack,
  mcqSubmissions,
  mcqsMap,
  students,
  onPreview,
  onExport,
  previewMcq,
  setPreviewMcq
}) => {
  const isQuiz = EXAM_TYPES_QUIZ.includes(exam?.exam_type);
  const groupedSubs = isQuiz ? groupByStudent(mcqSubmissions) : {};
  const studentIds = Object.keys(groupedSubs);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={onBack}>
              ← Back to Exams
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{exam.title}</h1>
              <p className="text-muted-foreground">
                Managing submissions for this {isQuiz ? 'quiz' : 'exam'}
              </p>
            </div>
          </div>
          {isQuiz && (
            <Button
              onClick={onExport}
              variant="outline"
              disabled={!studentIds.length}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          )}
        </div>

        {/* Exam Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Exam Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="font-semibold">Status</p>
                <Badge className="mt-1">{exam.status.toUpperCase()}</Badge>
              </div>
              <div>
                <p className="font-semibold">Type</p>
                <Badge variant="secondary" className="mt-1">
                  {isQuiz ? 'QUIZ' : 'CODING'}
                </Badge>
              </div>
              <div>
                <p className="font-semibold">Duration</p>
                <p className="text-muted-foreground">{exam.duration_minutes} minutes</p>
              </div>
              <div>
                <p className="font-semibold">Start Time</p>
                <p className="text-muted-foreground">
                  {new Date(exam.start_time).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="font-semibold">Submissions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {isQuiz ? studentIds.length : submissionCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content with Tabs */}
        <Tabs defaultValue={isQuiz ? "results" : "process"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            {!isQuiz && <TabsTrigger value="process">Process Submissions</TabsTrigger>}
            <TabsTrigger value="results">View Results</TabsTrigger>
          </TabsList>

          {!isQuiz && (
            <TabsContent value="process" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Process Submissions</CardTitle>
                  <CardDescription>
                    Run all submissions through Judge0 and calculate scores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {submissionCount > 0 ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">
                          <strong>Ready to process {submissionCount} submissions</strong>
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          This will test each submission against their respective test cases and create submission results.
                        </p>
                      </div>

                      <SubmissionProcessor examId={exam.id} />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No submissions found for this exam.</p>
                      <p className="text-sm mt-1">
                        Make sure students have submitted their solutions.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="results">
            {isQuiz ? (
              <QuizResults
                submissions={groupedSubs}
                mcqs={mcqsMap}
                students={students}
                onPreview={onPreview}
              />
            ) : (
              <SubmissionResultsDashboard examId={exam.id} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* MCQ Preview Dialog */}
      <Dialog open={!!previewMcq} onOpenChange={(open) => !open && setPreviewMcq(null)}>
        <DialogContent>
          {previewMcq ? (
            <>
              <DialogHeader>
                <DialogTitle>{previewMcq.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold">Difficulty:</p>
                  <Badge variant="outline">{previewMcq.difficulty}</Badge>
                </div>
                
                {previewMcq.description && (
                  <div>
                    <p className="font-semibold">Description:</p>
                    <p className="text-sm text-muted-foreground">{previewMcq.description}</p>
                  </div>
                )}
                
                <div>
                  <p className="font-semibold">Question:</p>
                  <p>{previewMcq.question_text}</p>
                </div>
                
                <div>
                  <p className="font-semibold">Options:</p>
                  <ol className="list-decimal pl-6 space-y-1">
                    {previewMcq.options?.map((opt, i) => (
                      <li
                        key={i}
                        className={
                          i + 1 === previewMcq.correct_answer
                            ? 'bg-green-100 rounded px-2 py-1 font-medium'
                            : 'py-1'
                        }
                      >
                        {opt}
                      </li>
                    ))}
                  </ol>
                </div>
                
                {previewMcq.explanation && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="font-semibold text-blue-800">Explanation:</p>
                    <p className="text-sm text-blue-700">{previewMcq.explanation}</p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Quiz Results Component
const QuizResults = ({ submissions, mcqs, students, onPreview }) => {
  const studentIds = Object.keys(submissions);
  
  if (!studentIds.length) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No quiz submissions found for this exam.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz Results</CardTitle>
        <CardDescription>
          Showing results for {studentIds.length} students
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[600px] border rounded">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50">
                {[
                  'Student',
                  'Question',
                  'Student Answer',
                  'Correct Answer',
                  'Score',
                  'Preview',
                  'Submitted At'
                ].map((header) => (
                  <th
                    key={header}
                    className="sticky top-0 bg-gray-50 px-3 py-2 text-left font-semibold"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {studentIds.map((studentId) => {
                const student = students.find((s) => s.id === studentId) || { email: studentId };
                const userSubs = submissions[studentId];
                
                return userSubs.map((sub, i) => {
                  const mcq = mcqs[sub.mcq_id] || {};
                  
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      {i === 0 && (
                        <td
                          rowSpan={userSubs.length}
                          className="align-top font-medium px-3 py-2 border-r"
                        >
                          {student.email}
                        </td>
                      )}
                      <td className="px-3 py-2 max-w-xs truncate">
                        {mcq.question_text || 'Deleted question'}
                      </td>
                      <td className={`px-3 py-2 ${sub.is_correct ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Option {sub.selected_answer}:</span>
                          <span>{mcq.options?.[sub.selected_answer - 1] || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Option {mcq.correct_answer}:</span>
                          <span>{mcq.options?.[mcq.correct_answer - 1] || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={sub.is_correct ? 'default' : 'destructive'}>
                          {sub.score} / {mcq.max_score || 100}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onPreview(mcq)}
                          disabled={!mcq.id}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {sub.submitted_at
                          ? new Date(sub.submitted_at).toLocaleString()
                          : 'N/A'}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExamManagementPage;
