import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Plus, Edit2, Trash2, Upload, Download, Search, Filter, 
  Grid3x3, List, Eye, FileText, CheckSquare, Square 
} from 'lucide-react';
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

const UploadNotes = () => {
  const [notes, setNotes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedNote, setSelectedNote] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  
  // Form state
  const [editingNote, setEditingNote] = useState({
    title: '',
    description: '',
    course_id: '',
    category: '',
    tags: [],
    is_public: false
  });

  useEffect(() => {
    fetchNotes();
    fetchCourses();
  }, [selectedCourse, selectedCategory, searchTerm, sortBy]);

  const fetchNotes = async () => {
    try {
      const params = {};
      if (selectedCourse !== 'all') params.course_id = selectedCourse;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (searchTerm) params.search = searchTerm;
      
      const response = await api.get('/upload-notes', { params });
      setNotes(response.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error("Failed to load notes");
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleSaveNote = async () => {
    try {
      const url = `/upload-notes${selectedNote ? `/${selectedNote.id}` : ''}`;
      const method = selectedNote ? 'put' : 'post';
      
      const response = await api[method](url, editingNote);
      const savedNote = response.data;
      
      if (selectedNote) {
        setNotes(prev => prev.map(note => 
          note.id === selectedNote.id ? savedNote : note
        ));
      } else {
        setNotes(prev => [savedNote, ...prev]);
      }

      setIsDialogOpen(false);
      toast.success(`Note ${selectedNote ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error("Failed to save note");
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await api.delete(`/upload-notes/${noteId}`);
      setNotes(prev => prev.filter(note => note.id !== noteId));
      toast.success("Note deleted successfully");
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error("Failed to delete note");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNotes.length === 0) return;
    
    try {
      await api.delete('/upload-notes/bulk-delete', {
        data: {
        note_ids: selectedNotes  // Use note_ids to match the Pydantic model
      }
      });
      
      setNotes(prev => prev.filter(note => !selectedNotes.includes(note.id)));
      setSelectedNotes([]);
      toast.success(`${selectedNotes.length} notes deleted successfully`);
    } catch (error) {
      console.error('Error bulk deleting notes:', error);
      toast.error("Failed to delete notes");
    }
  };

  const handleFileUpload = async (noteId, files) => {
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      await api.post(`/upload-notes/${noteId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success("Files uploaded successfully");
      const params = {};
      if (selectedCourse !== 'all') params.course_id = selectedCourse;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (searchTerm) params.search = searchTerm;
      
      const response = await api.get('/upload-notes', { params });
      setNotes(response.data); // This will properly update the UI
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error("Failed to upload files");
    }
  };

  const openCreateDialog = () => {
    setEditingNote({
      title: '',
      description: '',
      course_id: '',
      category: '',
      tags: [],
      is_public: false
    });
    setSelectedNote(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (note) => {
    setEditingNote({
      title: note.title,
      description: note.description || '',
      course_id: note.course_id,
      category: note.category,
      tags: note.tags || [],
      is_public: note.is_public
    });
    setSelectedNote(note);
    setIsDialogOpen(true);
  };

  const toggleNoteSelection = (noteId) => {
    setSelectedNotes(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const getCourseLabel = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course ? `${course.course_code} - ${course.course_name}` : 'Unknown Course';
  };

  const getCategoryLabel = (category) => {
    const cat = NOTE_CATEGORIES.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  const filteredNotes = notes; // Filtering is done server-side

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.course_code} - {course.course_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Category" />
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

          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedNotes.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedNotes.length})
            </Button>
          )}
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedNote ? 'Edit' : 'Create'} Note
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={editingNote.title}
                    onChange={(e) => setEditingNote(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter note title"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={editingNote.description}
                    onChange={(e) => setEditingNote(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter description (optional)"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Course</label>
                    <Select
                      value={editingNote.course_id}
                      onValueChange={(value) => setEditingNote(prev => ({ ...prev, course_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.course_code} - {course.course_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={editingNote.category}
                      onValueChange={(value) => setEditingNote(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTE_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Tags (comma-separated)</label>
                  <Input
                    value={editingNote.tags.join(', ')}
                    onChange={(e) => setEditingNote(prev => ({ 
                      ...prev, 
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                    }))}
                    placeholder="e.g., important, midterm, chapter1"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_public"
                    checked={editingNote.is_public}
                    onCheckedChange={(checked) => setEditingNote(prev => ({ ...prev, is_public: checked }))}
                  />
                  <label htmlFor="is_public" className="text-sm">
                    Make available to students
                  </label>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleSaveNote}>
                    {selectedNote ? 'Update' : 'Create'} Note
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Notes Display */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
        {filteredNotes.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notes found</p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <Card key={note.id} className={viewMode === 'grid' ? '' : 'p-4'}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedNotes.includes(note.id)}
                      onCheckedChange={() => toggleNoteSelection(note.id)}
                    />
                    <CardTitle className="text-base truncate">{note.title}</CardTitle>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(note)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {note.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {note.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {getCategoryLabel(note.category)}
                  </Badge>
                  {note.is_public && (
                    <Badge variant="outline" className="text-xs">
                      Public
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {note.note_files?.length || 0} files
                  </Badge>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>{getCourseLabel(note.course_id)}</p>
                  <p>{new Date(note.created_at).toLocaleDateString()}</p>
                </div>
                
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {note.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Open file dialog for this note
                      setSelectedNote(note);
                      setIsFileDialogOpen(true);
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Files
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    <input
                      type="file"
                      id={`upload-${note.id}`}
                      multiple
                      onChange={(e) => handleFileUpload(note.id, e.target.files)}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById(`upload-${note.id}`).click()}
                    >
                      <Upload className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* File Viewer Dialog */}
      <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Files - {selectedNote?.title}
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
  );
};

// Separate component for file viewing
const NoteFileViewer = ({ note, onClose }) => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);

const handleViewFile = async (file) => {
  try {
    const response = await api.get(`/upload-notes/files/${file.id}`, {
      responseType: 'blob',
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    setFileUrl(url);
    setSelectedFile(file);
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to load file",
      variant: "destructive",
    });
  }
};

  useEffect(() => {
    fetchFiles();
  }, [note.id]);

  const fetchFiles = async () => {
    try {
      const response = await api.get(`/upload-notes/${note.id}/files`);
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

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

  const handleDeleteFile = async (fileId) => {
    try {
      await api.delete(`/upload-notes/files/${fileId}`);
      setFiles(prev => prev.filter(file => file.id !== fileId));
      toast.success("File deleted successfully");
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error("Failed to delete file");
    }
  };

  const handleDownloadAll = async () => {
    try {
      const response = await api.get(`/upload-notes/${note.id}/download-all`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${note.title}_files.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading all files:', error);
      toast.error("Failed to download files");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Files ({files.length})</h3>
        {files.length > 1 && (
          <Button onClick={handleDownloadAll} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {files.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No files uploaded yet</p>
          </div>
        ) : (
          files.map((file) => (
            <Card key={file.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{file.original_filename}</h4>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} • {file.content_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewFile(file)}
                      className="flex-1"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>

                    {/* Modal to display file */}
                    <Dialog open={selectedFile !== null} onOpenChange={() => setSelectedFile(null)}>
                    <DialogContent className="max-w-4xl max-h-[90vh]">
                        <DialogHeader>
                        <DialogTitle>{selectedFile?.original_filename}</DialogTitle>
                        </DialogHeader>
                        {fileUrl && (
                        <iframe
                            src={fileUrl}
                            width="100%"
                            height="600px"
                            title={selectedFile?.original_filename}
                        />
                        )}
                    </DialogContent>
                    </Dialog>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadFile(file.id, file.original_filename)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default UploadNotes;
