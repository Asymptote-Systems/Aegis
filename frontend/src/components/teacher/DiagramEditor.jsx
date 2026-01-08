import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Code, ZoomIn, ZoomOut } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Download, Shapes } from 'lucide-react';

const handleDownloadShapes = () => {
  const shapeFiles = [
    { name: 'Array.xml', path: '/DiagramXML/Array.xml' },
    { name: 'LinkedList.xml', path: '/DiagramXML/LinkedList.xml' },
    { name: 'Stack.xml', path: '/DiagramXML/Stack.xml' }
  ];

  shapeFiles.forEach((file) => {
    const link = document.createElement('a');
    link.href = file.path;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.appendChild(link);
  });
};

const DiagramEditor = () => {
  const iframeRef = useRef(null);
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [codeContent, setCodeContent] = useState('');
  const [fontSize, setFontSize] = useState(14);

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
  ];

  const minFontSize = 10;
  const maxFontSize = 28;
  const fontIncrement = 2;

  const handleCodeChange = (value) => {
    setCodeContent(value || '');
  };

  const toggleCodeEditor = () => {
    setIsCodeEditorOpen(!isCodeEditorOpen);
  };

  const handleZoomIn = () => {
    setFontSize(prev => Math.min(prev + fontIncrement, maxFontSize));
  };

  const handleZoomOut = () => {
    setFontSize(prev => Math.max(prev - fontIncrement, minFontSize));
  };

  const resetZoom = () => {
    setFontSize(14);
  };

  const codeEditorWidth = 420;

  return (
    <div className="h-screen w-screen bg-background overflow-hidden relative">
      {/* Main Draw.io Container */}
      <div 
        className="absolute top-0 left-0 h-full bg-white transition-all duration-300 ease-in-out"
        style={{
          width: isCodeEditorOpen ? `calc(100vw - ${codeEditorWidth}px)` : '100vw',
          margin: 0,
          padding: 0
        }}
      >
        <iframe
          ref={iframeRef}
          src={`http://${import.meta.env.VITE_HOST_IP}:9090/?ui=min`}
          className="w-full h-full border-0 block"
          title="Draw.io Diagram Editor"
          style={{
            margin: 0,
            padding: 0,
            display: 'block'
          }}
        />
      </div>

      {/* Toggle Button - Always Visible */}
      <Button
        variant="outline"
        size="sm"
        onClick={toggleCodeEditor}
        className="fixed top-1/2 -translate-y-1/2 z-50 h-12 w-8 p-0 bg-background hover:bg-muted shadow-lg border border-border transition-all duration-300 ease-in-out"
        style={{
          right: isCodeEditorOpen ? `${codeEditorWidth}px` : '0px',
          borderRadius: isCodeEditorOpen ? '6px 0 0 6px' : '0 6px 6px 0'
        }}
        aria-label={isCodeEditorOpen ? 'Close code editor' : 'Open code editor'}
      >
        {isCodeEditorOpen ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Collapsible Code Editor Panel */}
      <div 
        className="fixed top-0 right-0 h-full bg-background border-l border-border z-40 transition-all duration-300 ease-in-out"
        style={{
          width: `${codeEditorWidth}px`,
          transform: isCodeEditorOpen ? 'translateX(0)' : 'translateX(100%)'
        }}
      >
        <Card className="h-full w-full rounded-none border-0">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border bg-muted/30 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Code className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Code Notes</span>
                </div>

              <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadShapes}
                  className="h-7 px-2 text-xs"
                  aria-label="Download custom shapes"
                >
                  <Shapes className="h-3 w-3 mr-1" />
                  Shapes
                </Button>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Language Selector */}
                <div className="flex-1">
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value} className="text-xs">
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Zoom Controls */}
                <div className="flex items-center space-x-1 bg-background border border-border rounded-md p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={fontSize <= minFontSize}
                    className="h-6 w-6 p-0 hover:bg-muted"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <button
                    onClick={resetZoom}
                    className="text-xs text-muted-foreground min-w-[2.5rem] text-center hover:text-foreground transition-colors cursor-pointer px-1"
                    aria-label="Reset zoom"
                  >
                    {fontSize}px
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={fontSize >= maxFontSize}
                    className="h-6 w-6 p-0 hover:bg-muted"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <Editor
                height="100%"
                language={selectedLanguage}
                theme="vs-light"
                value={codeContent}
                onChange={handleCodeChange}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: fontSize,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollbar: {
                    vertical: 'auto',
                    horizontal: 'auto',
                  },
                  wordWrap: 'on',
                  automaticLayout: true,
                  padding: { top: 16, bottom: 16 },
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnEnter: 'on',
                  tabSize: 2,
                  insertSpaces: true,
                  contextmenu: true,
                  selectOnLineNumbers: true,
                  smoothScrolling: true,
                }}
                loading={
                  <div className="flex items-center justify-center h-full">
                    <div className="text-sm text-muted-foreground">Loading editor...</div>
                  </div>
                }
              />
            </div>

            {/* Footer Info */}
            <div className="p-3 border-t border-border bg-muted/20 flex-shrink-0">
              <p className="text-xs text-muted-foreground">
                Add code snippets or algorithm notes • Click font size to reset zoom
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Keyboard Shortcut Hint - Only show when closed */}
      {!isCodeEditorOpen && (
        <div className="fixed bottom-4 right-4 bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-md z-30">
          <p className="text-xs text-muted-foreground">
            Press the <span className="font-mono bg-muted px-1 rounded text-foreground">←</span> button to open code editor
          </p>
        </div>
      )}
    </div>
  );
};

export default DiagramEditor;
