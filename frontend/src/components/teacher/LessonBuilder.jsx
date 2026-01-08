import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Plus, Edit2, Trash2, Upload, FileText, Eye, Clock, BookOpen
} from 'lucide-react';
import KanbanBoard from './KanbanBoard';
import api from '../../api/apiClient';

// Import the AuthenticatedPDFViewer component
const AuthenticatedPDFViewer = ({ pdfUrl, title, className = "w-full h-96" }) => {
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        const urlWithTimestamp = `${pdfUrl}?t=${Date.now()}`;
        
        const response = await api.get(pdfUrl, {
          responseType: 'blob',
        });

        if (pdfBlobUrl) {
          URL.revokeObjectURL(pdfBlobUrl);
        }
        
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
        
      } catch (error) {
        console.error('Error fetching PDF:', error);
        
        if (error.response?.status === 404) {
          setError('No PDF has been uploaded yet');
        } else if (error.response?.status === 403) {
          setError('Access denied');
        } else {
          setError('Failed to load PDF document');
        }
      } finally {
        setLoading(false);
      }
    };

    if (pdfUrl) {
      fetchPDF();
    }

    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfUrl]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className} bg-gray-50 rounded-lg border`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center ${className} bg-gray-50 rounded-lg border`}>
        <FileText className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500 mb-2 text-center">{error}</p>
        {error.includes('uploaded') && (
          <p className="text-sm text-gray-400 text-center">Upload a PDF to view it here</p>
        )}
      </div>
    );
  }

  return (
    <iframe
      src={pdfBlobUrl}
      title={title}
      className={`border rounded-lg ${className}`}
    />
  );
};

const LessonBuilder = () => {
  // ✅ PROPERLY DECLARE ALL STATE VARIABLES
  const [currentUser, setCurrentUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseLessons, setCourseLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [timetableExists, setTimetableExists] = useState(false);
  const [timetableRefreshKey, setTimetableRefreshKey] = useState(0);
  const [cdpRefreshKey, setCdpRefreshKey] = useState(0);
  
  // Dialog states
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  
  // Form states
  const [editingLesson, setEditingLesson] = useState({
    title: '',
    content: '',
    lesson_order: 1
  });

  // Fetch initial data
  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseLessons(selectedCourse.id);
    }
  }, [selectedCourse]);

  const initializeData = async () => {
    try {
      // ✅ SIMPLIFIED: Only get current user, no separate teacher profile needed
      const userResponse = await api.get('/users/me');
      setCurrentUser(userResponse.data);
      
      // Use currentUser.id directly for all operations
      await fetchTeacherCourses(userResponse.data.id);
      await checkTimetableExists(userResponse.data.id);
      
    } catch (error) {
      console.error('Error initializing data:', error);
      toast.error("Failed to load initial data");
    }
  };

  const fetchTeacherCourses = async (userId) => {
    try {
      const response = await api.get(`/teachers/${userId}/courses`);
      setCourses(response.data.courses);
      
      if (response.data.courses.length > 0 && !selectedCourse) {
        setSelectedCourse(response.data.courses[0]);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error("Failed to load courses");
    }
  };

  const checkTimetableExists = async (userId) => {
    try {
      await api.get(`/teachers/${userId}/timetable`);
      setTimetableExists(true);
    } catch (error) {
      setTimetableExists(false);
    }
  };

  const fetchCourseLessons = async (courseId) => {
    try {
      const response = await api.get(`/courses/${courseId}/lessons`);
      setCourseLessons(response.data);
    } catch (error) {
      console.error('Error fetching course lessons:', error);
      toast.error("Failed to load lessons");
    }
  };

  // Timetable upload handler
  const handleTimetableUpload = async (file) => {
    if (!currentUser) return;
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`/teachers/${currentUser.id}/timetable`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('Upload successful:', response.data);

      setTimetableExists(true);
      setTimetableRefreshKey(prev => prev + 1);

      const timestamp = Date.now();
      toast.success("Timetable uploaded successfully");
    } catch (error) {
      console.error('Error uploading timetable:', error);
      toast.error("Failed to upload timetable");
    }
  };

  // CDP upload handler
  const handleCDPUpload = async (courseId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`/courses/${courseId}/cdp`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('CDP upload successful:', response.data);

      setCdpRefreshKey(prev => prev + 1);

      //await fetchTeacherCourses(currentUser.id);

      toast.success("CDP uploaded successfully");
      if (currentUser) {
        fetchTeacherCourses(currentUser.id);
      }
    } catch (error) {
      console.error('Error uploading CDP:', error);
      toast.error("Failed to upload CDP");
    }
  };

  // Lesson management handlers
  const handleSaveLesson = async () => {
    try {
      if (!selectedCourse || !currentUser) return;
      
      const lessonData = {
        ...editingLesson,
        course_id: selectedCourse.id,
        teacher_id: currentUser.id
      };

      const url = selectedLesson 
        ? `/lessons/${selectedLesson.id}` 
        : `/courses/${selectedCourse.id}/lessons`;
      const method = selectedLesson ? 'put' : 'post';
      
      const response = await api[method](url, lessonData);
      const savedLesson = response.data;
      
      if (selectedLesson) {
        setCourseLessons(prev => 
          prev.map(lesson => 
            lesson.id === selectedLesson.id ? savedLesson : lesson
          )
        );
      } else {
        setCourseLessons(prev => [...prev, savedLesson]);
      }
      
      setIsLessonDialogOpen(false);
      setSelectedLesson(null);
      toast.success(`Lesson ${selectedLesson ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast.error("Failed to save lesson");
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    try {
      await api.delete(`/lessons/${lessonId}`);
      setCourseLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
      
      if (selectedLesson && selectedLesson.id === lessonId) {
        setSelectedLesson(null);
      }
      
      toast.success("Lesson deleted successfully");
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast.error("Failed to delete lesson");
    }
  };

  // Dialog handlers
  const openCreateLessonDialog = () => {
    setEditingLesson({
      title: '',
      content: '',
      lesson_order: courseLessons.length + 1
    });
    setSelectedLesson(null);
    setIsLessonDialogOpen(true);
  };

  const openEditLessonDialog = (lesson) => {
    setEditingLesson({
      title: lesson.title,
      content: lesson.content,
      lesson_order: lesson.lesson_order || 1
    });
    setSelectedLesson(lesson);
    setIsLessonDialogOpen(true);
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image', 'code-block'],
      ['clean']
    ],
  };

  // ✅ CONDITIONAL RENDERING: Don't render until currentUser is loaded
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="lessons" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lessons">Lessons & Courses</TabsTrigger>
          <TabsTrigger value="kanban">Task Board</TabsTrigger>
        </TabsList>
        
        <TabsContent value="lessons" className="space-y-6">
          {/* Central Timetable Display */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  My Timetable
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    id="timetable-upload"
                    accept=".pdf"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        handleTimetableUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('timetable-upload').click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {timetableExists ? 'Update' : 'Upload'} Timetable
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {timetableExists ? (
                <AuthenticatedPDFViewer
                  key={timetableRefreshKey}
                  pdfUrl={`/teachers/${currentUser.id}/timetable`}
                  title="Teacher Timetable"
                  className="w-full h-96"
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No timetable uploaded yet</p>
                  <p className="text-sm">Upload your timetable PDF to display it here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Courses Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Course Selection */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>My Courses ({courses.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {courses.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No courses assigned yet
                    </p>
                  ) : (
                    courses.map((course) => (
                      <div
                        key={course.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedCourse?.id === course.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedCourse(course)}
                      >
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">
                            {course.course_code} - {course.course_name}
                          </h4>
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">
                              {course.credits} Credits
                            </Badge>
                            <div className="flex items-center space-x-1">
                              <input
                                type="file"
                                id={`cdp-upload-${course.id}`}
                                accept=".pdf"
                                onChange={(e) => {
                                  if (e.target.files[0]) {
                                    handleCDPUpload(course.id, e.target.files[0]);
                                  }
                                }}
                                className="hidden"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  document.getElementById(`cdp-upload-${course.id}`).click();
                                }}
                              >
                                <Upload className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Course Details & Lessons */}
            <div className="lg:col-span-2">
              {selectedCourse ? (
                <div className="space-y-6">
                  {/* Course CDP Display */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center">
                          <BookOpen className="h-5 w-5 mr-2" />
                          {selectedCourse.course_code} - Course Development Plan
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <AuthenticatedPDFViewer
                        key={`${selectedCourse.id}-${cdpRefreshKey}`}
                        pdfUrl={`/courses/${selectedCourse.id}/cdp`}
                        title={`${selectedCourse.course_code} CDP`}
                        className="w-full h-64"
                      />
                    </CardContent>
                  </Card>

                  {/* Course Lessons */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>
                          Lessons ({courseLessons.length})
                        </CardTitle>
                        <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
                          <DialogTrigger asChild>
                            <Button onClick={openCreateLessonDialog}>
                              <Plus className="h-4 w-4 mr-2" />
                              New Lesson
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                {selectedLesson ? 'Edit' : 'Create'} Lesson for {selectedCourse.course_code}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Title</label>
                                  <Input
                                    value={editingLesson.title}
                                    onChange={(e) => setEditingLesson(prev => ({ 
                                      ...prev, title: e.target.value 
                                    }))}
                                    placeholder="Enter lesson title"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Lesson Order</label>
                                  <Input
                                    type="number"
                                    value={editingLesson.lesson_order}
                                    onChange={(e) => setEditingLesson(prev => ({ 
                                      ...prev, lesson_order: parseInt(e.target.value) || 1 
                                    }))}
                                    placeholder="Order"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Content</label>
                                <div className="mt-2">
                                  <ReactQuill
                                    theme="snow"
                                    value={editingLesson.content}
                                    onChange={(value) => setEditingLesson(prev => ({ 
                                      ...prev, content: value 
                                    }))}
                                    modules={quillModules}
                                    style={{ height: '300px', marginBottom: '50px' }}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex justify-end">
                                <Button onClick={handleSaveLesson}>
                                  {selectedLesson ? 'Update' : 'Create'} Lesson
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {courseLessons.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No lessons created for this course yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {courseLessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className={`p-4 rounded-lg border transition-colors ${
                                selectedLesson?.id === lesson.id
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:bg-muted/50'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div 
                                  className="flex-1 cursor-pointer"
                                  onClick={() => setSelectedLesson(
                                    selectedLesson?.id === lesson.id ? null : lesson
                                  )}
                                >
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="text-xs">
                                      #{lesson.lesson_order || 1}
                                    </Badge>
                                    <h4 className="font-medium">{lesson.title}</h4>
                                  </div>
                                  
                                  {selectedLesson?.id === lesson.id && (
                                    <div className="mt-3 pt-3 border-t">
                                      <div 
                                        className="prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: lesson.content }}
                                      />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditLessonDialog(lesson)}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteLesson(lesson.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a course to view details and manage lessons</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="kanban">
          <KanbanBoard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LessonBuilder;
