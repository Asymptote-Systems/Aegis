import React, { useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Code, Plus, Edit2, Trash2, Save, Search } from 'lucide-react';
import api from '../../api/apiClient';

const PROGRAMMING_LANGUAGES = [
  { value: 'python', label: 'Python', monacoId: 'python' },
  { value: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { value: 'java', label: 'Java', monacoId: 'java' },
  { value: 'cpp', label: 'C++', monacoId: 'cpp' },
  { value: 'csharp', label: 'C#', monacoId: 'csharp' }
];

const CodeEditor = () => {
  const [codeSnippets, setCodeSnippets] = useState([]);
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState({
    topic: '',
    sub_topic: '',
    notes: '',
    language: 'python',
    code_content: '// Start coding here...'
  });

  useEffect(() => {
    fetchCodeSnippets();
  }, []);

  const fetchCodeSnippets = async () => {
  try {
    const response = await api.get('/code-snippets');
    setCodeSnippets(response.data);
  } catch (error) {
    console.error('Error fetching code snippets:', error);
    toast.error("Failed to load code snippets");
  }
};

const handleSaveSnippet = async () => {
    try {
      const url = `/code-snippets${selectedSnippet ? `/${selectedSnippet.id}` : ''}`;
      const method = selectedSnippet ? 'put' : 'post';
      
      const response = await api[method](url, editingSnippet);
      const savedSnippet = response.data;
      
      if (selectedSnippet) {
        setCodeSnippets(prev => 
          prev.map(snippet => 
            snippet.id === selectedSnippet.id ? savedSnippet : snippet
          )
        );
        setSelectedSnippet(savedSnippet);
      } else {
        setCodeSnippets(prev => [savedSnippet, ...prev]);
        setSelectedSnippet(savedSnippet);
      }
  
      setIsDialogOpen(false);
      toast.success(`Code snippet ${selectedSnippet ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving code snippet:', error);
      toast.error("Failed to save code snippet");
    }
  };

  const handleDeleteSnippet = async (snippetId) => {
    try {
      await api.delete(`/code-snippets/${snippetId}`);
      setCodeSnippets(prev => prev.filter(snippet => snippet.id !== snippetId));
      if (selectedSnippet && selectedSnippet.id === snippetId) {
        setSelectedSnippet(null);
      }
      toast.success("Code snippet deleted successfully");
    } catch (error) {
      console.error('Error deleting code snippet:', error);
      toast.error("Failed to delete code snippet");
    }
  };

  const openCreateDialog = () => {
    setEditingSnippet({
      topic: '',
      sub_topic: '',
      notes: '',
      language: 'python',
      code_content: '// Start coding here...'
    });
    setSelectedSnippet(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (snippet) => {
    setEditingSnippet({
      topic: snippet.topic,
      sub_topic: snippet.sub_topic || '',
      notes: snippet.notes || '',
      language: snippet.language,
      code_content: snippet.code_content
    });
    setSelectedSnippet(snippet);
    setIsDialogOpen(true);
  };

  const filteredSnippets = codeSnippets.filter(snippet =>
    snippet.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (snippet.sub_topic && snippet.sub_topic.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getLanguageLabel = (langValue) => {
    const lang = PROGRAMMING_LANGUAGES.find(l => l.value === langValue);
    return lang ? lang.label : langValue;
  };

  const getMonacoLanguage = (langValue) => {
    const lang = PROGRAMMING_LANGUAGES.find(l => l.value === langValue);
    return lang ? lang.monacoId : 'javascript';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search snippets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Snippet
            </Button>
          </DialogTrigger>
          <DialogContent
           className="max-h-[95vh] overflow-y-auto"
           style={{
              width: '95vw',
              maxWidth: '95vw',
              minWidth: '95vw'
            }}
           >
            <DialogHeader>
              <DialogTitle>
                {selectedSnippet ? 'Edit' : 'Create'} Code Snippet
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Topic</label>
                  <Input
                    value={editingSnippet.topic}
                    onChange={(e) => setEditingSnippet(prev => ({ ...prev, topic: e.target.value }))}
                    placeholder="Enter topic"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Sub-topic (Optional)</label>
                  <Input
                    value={editingSnippet.sub_topic}
                    onChange={(e) => setEditingSnippet(prev => ({ ...prev, sub_topic: e.target.value }))}
                    placeholder="Enter sub-topic"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Language</label>
                  <Select
                    value={editingSnippet.language}
                    onValueChange={(value) => setEditingSnippet(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROGRAMMING_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Notes (Optional)</label>
                  <Textarea
                    value={editingSnippet.notes}
                    onChange={(e) => setEditingSnippet(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add notes about this code snippet"
                    rows={4}
                  />
                </div>
                
                <Button onClick={handleSaveSnippet} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {selectedSnippet ? 'Update' : 'Create'} Snippet
                </Button>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Code</label>
                <div className="border rounded-md overflow-hidden">
                  <Editor
                    height="400px"
                    language={getMonacoLanguage(editingSnippet.language)}
                    value={editingSnippet.code_content}
                    onChange={(value) => setEditingSnippet(prev => ({ ...prev, code_content: value || '' }))}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Snippets List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Code Snippets ({filteredSnippets.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredSnippets.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  {searchTerm ? 'No snippets match your search' : 'No code snippets yet'}
                </p>
              ) : (
                filteredSnippets.map((snippet) => (
                  <div
                    key={snippet.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSnippet?.id === snippet.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedSnippet(snippet)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{snippet.topic}</h4>
                        {snippet.sub_topic && (
                          <p className="text-xs text-muted-foreground truncate">
                            {snippet.sub_topic}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {getLanguageLabel(snippet.language)}
                          </Badge>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(snippet);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSnippet(snippet.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Code Viewer */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedSnippet ? selectedSnippet.topic : 'Select a Code Snippet'}
              </CardTitle>
              {selectedSnippet && selectedSnippet.sub_topic && (
                <p className="text-sm text-muted-foreground">{selectedSnippet.sub_topic}</p>
              )}
            </CardHeader>
            <CardContent>
              {selectedSnippet ? (
                <div className="space-y-4">
                  {selectedSnippet.notes && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Notes:</h4>
                      <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                        {selectedSnippet.notes}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">Code:</h4>
                      <Badge variant="outline">
                        {getLanguageLabel(selectedSnippet.language)}
                      </Badge>
                    </div>
                    <div className="border rounded-md overflow-hidden">
                      <Editor
                        height="400px"
                        language={getMonacoLanguage(selectedSnippet.language)}
                        value={selectedSnippet.code_content}
                        theme="vs-dark"
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: 'on',
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a code snippet from the list to view its details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
