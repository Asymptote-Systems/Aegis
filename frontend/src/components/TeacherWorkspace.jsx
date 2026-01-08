import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import CodeEditor from './teacher/CodeEditor';
import AlgorithmVisualizer from './teacher/AlgorithmVisualizer';
import DiagramEditor from './teacher/DiagramEditor';
import LessonBuilder from './teacher/LessonBuilder';
import ClassScheduler from './teacher/ClassScheduler';
import NotificationSystem from './teacher/NotificationSystem';
import UploadNotes from './teacher/UploadNotes';
import { Code, Network, PenTool, BookOpen, Calendar, Upload } from 'lucide-react';
import api from '../api/apiClient';

const TeacherWorkspace = () => {
  const [activeTab, setActiveTab] = useState('code-editor');
  const [teacherProfile, setTeacherProfile] = useState(null);

  useEffect(() => {
    fetchTeacherProfile();
  }, []);

  const fetchTeacherProfile = async () => {
    try {
      const response = await api.get('/teacher-profiles');
      setTeacherProfile(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.warning("Please set up your teacher profile first.");
      } else {
        console.error('Error fetching teacher profile:', error);
        toast.error("Failed to load teacher profile");
      }
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Workspace</h1>
          <p className="text-muted-foreground">
            Manage your code snippets, lessons, and class schedules
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="code-editor" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Code Editor
          </TabsTrigger>
          <TabsTrigger value="algorithm-viz" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Algorithms
          </TabsTrigger>
          <TabsTrigger value="diagrams" className="flex items-center gap-2">
            <PenTool className="h-4 w-4" />
            Diagrams
          </TabsTrigger>
          <TabsTrigger value="lessons" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Lessons
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="upload-notes" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload-notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Notes</CardTitle>
              <CardDescription>
                Upload and manage your course notes and materials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadNotes />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="code-editor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Code Editor</CardTitle>
              <CardDescription>
                Create and manage code snippets with syntax highlighting for multiple languages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeEditor />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="algorithm-viz" className="space-y-6">
          <Card>
            <CardHeader>
            </CardHeader>
            <CardContent>
              <AlgorithmVisualizer />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagrams" className="space-y-6">
          <Card>
            <CardHeader>
            </CardHeader>
            <CardContent>
              <DiagramEditor />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lessons" className="space-y-6">
          <LessonBuilder />
        </TabsContent>

        <TabsContent value="scheduler" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Class Scheduler</CardTitle>
              <CardDescription>
                Schedule and manage your class sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClassScheduler />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NotificationSystem />
    </div>
  );
};

export default TeacherWorkspace;
