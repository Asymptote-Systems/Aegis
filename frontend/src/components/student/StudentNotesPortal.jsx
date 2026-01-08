import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import PdfViewerModal from '../PdfViewerModal';

import { 
  Search, Filter, Grid3x3, List, Download, Eye, Calendar,
  ChevronDown, FileText, BookOpen, Clock, Tag, SlidersHorizontal
} from 'lucide-react';
import InfiniteScroll from 'react-infinite-scroll-component';
import api from '../../api/apiClient';

const NOTE_CATEGORIES = [
  { value: 'lecture_notes', label: 'Lecture Notes' },
  { value: 'assignment_solutions', label: 'Assignment Solutions' },
  { value: 'reference_materials', label: 'Reference Materials' },
  { value: 'exam_papers', label: 'Exam Papers' },
  { value: 'study_guides', label: 'Study Guides' },
  { value: 'presentations', label: 'Presentations' },
  { value: 'other', label: 'Other' }
];

const StudentNotesPortal = () => {
  const [notes, setNotes] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // File viewer
  const [selectedNote, setSelectedNote] = useState(null);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (enrolledCourses.length > 0) {
      resetAndFetchNotes();
    }
  }, [searchTerm, selectedCourse, selectedCategory, enrolledCourses]);

  const initializeData = async () => {
    try {
      // Get current user (student)
      const userResponse = await api.get('/users/me'); // Adjust endpoint as needed
      setCurrentUser(userResponse.data);
      
      // Get student's enrolled courses
      await fetchEnrolledCourses(userResponse.data.id);
      
      // Get all courses for filter dropdown
      await fetchAllCourses();
    } catch (error) {
      console.error('Error initializing data:', error);
      toast.error("Failed to load user data");
    }
  };

  const fetchEnrolledCourses = async (studentId) => {
    try {
      const response = await api.get(`/students/${studentId}/courses`);
      const enrolled = response.data.filter(enrollment => enrollment.status === 'enrolled');
      setEnrolledCourses(enrolled);
      
      if (enrolled.length === 0) {
        toast.warning("You are not enrolled in any courses yet");
      }
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      toast.error("Failed to load enrolled courses");
    }
  };

  const fetchAllCourses = async () => {
    try {
      const response = await api.get('/courses');
      setAllCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const resetAndFetchNotes = () => {
    setNotes([]);
    setHasMore(true);
    fetchNotes(true);
  };

  const fetchNotes = useCallback(async (reset = false) => {
    if (isLoading || enrolledCourses.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Get course IDs from enrolled courses
      const enrolledCourseIds = enrolledCourses.map(enrollment => enrollment.course_id);
      
      const params = {
        skip: reset ? 0 : notes.length,
        limit: 20,
        course_ids: enrolledCourseIds.join(','), // Pass enrolled course IDs
        sort_by: 'created_at',
        sort_order: 'desc', // Newest first
      };
      
      // Apply additional filters
      if (selectedCourse !== 'all') {
        // Filter to specific course (must be in enrolled courses)
        if (enrolledCourseIds.includes(selectedCourse)) {
          params.course_ids = selectedCourse;
        }
      }
      
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (searchTerm) params.search = searchTerm;
      
      const response = await api.get('/upload-notes', { params });
      const newNotes = response.data;
      
      if (reset) {
        setNotes(newNotes);
      } else {
        setNotes(prev => [...prev, ...newNotes]);
      }
      
      setHasMore(newNotes.length === 20);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error("Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  }, [notes.length, selectedCourse, selectedCategory, searchTerm, isLoading, enrolledCourses]);

  const handleBulkDownload = async () => {
    if (selectedNotes.length === 0) {
      toast.warning("Please select notes to download");
      return;
    }
    
    try {
      const response = await api.post('/upload-notes/bulk-download', {
      note_ids: selectedNotes  // Send as regular JSON body (no 'data' wrapper needed for POST)
    }, {
      responseType: 'blob',  // Keep this for file download
    });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `selected_notes_${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      setSelectedNotes([]);
      toast.success(`${selectedNotes.length} notes downloaded successfully`);
    } catch (error) {
      console.error('Error downloading notes:', error);
      toast.error("Failed to download notes");
    }
  };

  const toggleNoteSelection = (noteId) => {
    setSelectedNotes(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const selectAll = () => {
    if (selectedNotes.length === notes.length) {
      setSelectedNotes([]);
    } else {
      setSelectedNotes(notes.map(note => note.id));
    }
  };

  const getCourseLabel = (courseId) => {
    const course = allCourses.find(c => c.id === courseId);
    return course ? `${course.course_code} - ${course.course_name}` : 'Unknown Course';
  };

  const getCategoryLabel = (category) => {
    const cat = NOTE_CATEGORIES.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  const groupNotesByCourse = () => {
    const grouped = {};
    notes.forEach(note => {
      const courseId = note.course_id;
      if (!grouped[courseId]) {
        grouped[courseId] = [];
      }
      grouped[courseId].push(note);
    });
    return grouped;
  };

  // Get only enrolled courses for the filter dropdown
  const getEnrolledCoursesForFilter = () => {
    const enrolledCourseIds = enrolledCourses.map(enrollment => enrollment.course_id);
    return allCourses.filter(course => enrolledCourseIds.includes(course.id));
  };

  const groupedNotes = groupNotesByCourse();
  const enrolledCoursesForFilter = getEnrolledCoursesForFilter();

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-black">My Course Notes</h1>
          <p className="text-gray-600 mt-2">
            Study materials from your enrolled courses ({enrolledCourses.length} courses)
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Label htmlFor="search-notes" className="sr-only">Search notes</Label>
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" aria-hidden="true" />
              <Input
                id="search-notes"
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white border-gray-300 focus:border-black focus:ring-black"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="border-gray-300 text-black hover:bg-gray-100"
              aria-expanded={isFilterOpen}
              aria-controls="filter-controls"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </Button>

            {/* View Toggle */}
            <div className="flex items-center border border-gray-300 rounded-lg" role="group" aria-label="View mode">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`rounded-r-none ${viewMode === 'grid' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'}`}
                aria-pressed={viewMode === 'grid'}
                aria-label="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`rounded-l-none ${viewMode === 'list' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'}`}
                aria-pressed={viewMode === 'list'}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {isFilterOpen && (
            <div id="filter-controls" className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <Label htmlFor="course-filter" className="text-sm font-medium text-black">Course</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger id="course-filter" className="bg-white border-gray-300 focus:border-black">
                    <SelectValue placeholder="All Enrolled Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Enrolled Courses</SelectItem>
                    {enrolledCoursesForFilter.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.course_code} - {course.course_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category-filter" className="text-sm font-medium text-black">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category-filter" className="bg-white border-gray-300 focus:border-black">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {NOTE_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedNotes.length > 0 && (
          <div className="bg-gray-900 text-white rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Checkbox
                checked={selectedNotes.length === notes.length}
                onCheckedChange={selectAll}
                aria-label="Select all notes"
              />
              <span className="font-medium">{selectedNotes.length} selected</span>
            </div>
            <Button
              onClick={handleBulkDownload}
              className="bg-white text-black hover:bg-gray-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Selected
            </Button>
          </div>
        )}

        {/* Notes Display */}
        {enrolledCourses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Enrolled Courses</h3>
            <p className="text-gray-600">
              You need to enroll in courses to access study materials
            </p>
          </div>
        ) : Object.keys(groupedNotes).length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Notes Available</h3>
            <p className="text-gray-600">
              {searchTerm || selectedCourse !== 'all' || selectedCategory !== 'all' 
                ? 'Try adjusting your filters or search terms'
                : 'No notes have been made available for your enrolled courses yet'}
            </p>
          </div>
        ) : (
          <InfiniteScroll
            dataLength={notes.length}
            next={() => fetchNotes(false)}
            hasMore={hasMore}
            loader={
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                <p className="mt-2 text-gray-600">Loading more notes...</p>
              </div>
            }
            endMessage={
              <div className="text-center py-4">
                <p className="text-gray-600">All notes loaded</p>
              </div>
            }
          >
            {Object.entries(groupedNotes).map(([courseId, courseNotes]) => (
              <div key={courseId} className="mb-8">
                <div className="border-b border-gray-200 pb-2 mb-4">
                  <h2 className="text-xl font-semibold text-black flex items-center">
                    <BookOpen className="h-5 w-5 mr-2" />
                    {getCourseLabel(courseId)}
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">
                    {courseNotes.length} {courseNotes.length === 1 ? 'note' : 'notes'} available
                  </p>
                </div>

                <div className={viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' 
                  : 'space-y-3'
                }>
                  {courseNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      viewMode={viewMode}
                      isSelected={selectedNotes.includes(note.id)}
                      onToggleSelect={() => toggleNoteSelection(note.id)}
                      onViewFiles={() => {
                        setSelectedNote(note);
                        setIsFileDialogOpen(true);
                      }}
                      getCategoryLabel={getCategoryLabel}
                    />
                  ))}
                </div>
              </div>
            ))}
          </InfiniteScroll>
        )}

        {/* File Viewer Dialog */}
        <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-black">
                {selectedNote?.title}
              </DialogTitle>
            </DialogHeader>
            {selectedNote && (
              <NoteFileViewer 
                note={selectedNote} 
                onClose={() => setIsFileDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Note Card Component (same as before)
const NoteCard = ({ note, viewMode, isSelected, onToggleSelect, onViewFiles, getCategoryLabel }) => {
  return (
    <Card className={`${viewMode === 'grid' ? '' : 'flex items-center p-4'} border-gray-200 hover:border-gray-400 transition-colors ${isSelected ? 'ring-2 ring-black' : ''}`}>
      {viewMode === 'grid' ? (
        <div>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onToggleSelect}
                  aria-label={`Select ${note.title}`}
                />
                <CardTitle className="text-sm font-medium text-black line-clamp-2">
                  {note.title}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 space-y-3">
            {note.description && (
              <p className="text-xs text-gray-600 line-clamp-3">
                {note.description}
              </p>
            )}
            
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs bg-gray-100 text-black">
                {getCategoryLabel(note.category)}
              </Badge>
              <Badge variant="outline" className="text-xs border-gray-300">
                {note.note_files?.length || 0} files
              </Badge>
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {new Date(note.created_at).toLocaleDateString()}
              </div>
            </div>
            
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {note.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs border-gray-300">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {note.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs border-gray-300">
                    +{note.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
            
            <Button
              onClick={onViewFiles}
              className="w-full bg-black text-white hover:bg-gray-800"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Files
            </Button>
          </CardContent>
        </div>
      ) : (
        <div className="flex items-center space-x-4 w-full">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            aria-label={`Select ${note.title}`}
          />
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-black truncate">{note.title}</h4>
            {note.description && (
              <p className="text-sm text-gray-600 truncate mt-1">{note.description}</p>
            )}
            <div className="flex items-center space-x-4 mt-2">
              <Badge variant="secondary" className="text-xs bg-gray-100 text-black">
                {getCategoryLabel(note.category)}
              </Badge>
              <span className="text-xs text-gray-500">
                {note.note_files?.length || 0} files
              </span>
              <span className="text-xs text-gray-500">
                {new Date(note.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <Button
            onClick={onViewFiles}
            className="bg-black text-white hover:bg-gray-800"
            size="sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Files
          </Button>
        </div>
      )}
    </Card>
  );
};

// File Viewer Component (same as before - reuse from previous implementation)
const NoteFileViewer = ({ note, onClose }) => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  useEffect(() => {
    if (note?.note_files) {
      setFiles(note.note_files);
    }
  }, [note]);

  const handleDownloadFile = async (fileId, filename) => {
    try {
      const response = await api.get(`/upload-notes/files/${fileId}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error("Failed to download file");
    }
  };

  // Fix: Ensure proper parameter passing
  const handleViewFile = (fileObj) => {
    console.log('Selected file object:', fileObj); // Debug log
    if (!fileObj || !fileObj.id) {
      toast.error("File information not available");
      return;
    }
    setSelectedFile(fileObj);
    setIsPdfModalOpen(true);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-black">Files ({files.length})</h3>
          {files.length > 1 && (
            <Button 
              onClick={() => {
                files.forEach(file => {
                  setTimeout(() => handleDownloadFile(file.id, file.original_filename), 100);
                });
              }}
              variant="outline"
              className="border-gray-300 text-black hover:bg-gray-100"
            >
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          )}
        </div>
        
        {note.description && (
          <p className="text-gray-600 mt-2">{note.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {files.length === 0 ? (
          <div className="col-span-2 text-center py-8">
            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No files available</p>
          </div>
        ) : (
          files.map((file) => (
            <Card key={file.id} className="border-gray-200">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-black text-sm truncate">
                        {file.original_filename}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(file.file_size)} • {file.content_type}
                      </p>
                      <p className="text-xs text-gray-500">
                        Added {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleViewFile(file)}
                      className="flex-1 bg-black text-white hover:bg-gray-800"
                      size="sm"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      onClick={() => handleDownloadFile(file.id, file.original_filename)}
                      variant="outline"
                      size="sm"
                      className="border-gray-300 text-black hover:bg-gray-100"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
     <PdfViewerModal
        isOpen={isPdfModalOpen}
        onClose={() => {
          setIsPdfModalOpen(false);
          setSelectedFile(null);
        }}
        file={selectedFile}
        noteTitle={note?.title}
      />
    </>   
  );
};

export default StudentNotesPortal;
