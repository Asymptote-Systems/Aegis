// FILE: src/components/HTMLEditor.jsx

import React, { useState, useEffect, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Code, Save, FileText, BookOpen, X, ArrowLeft, Moon, Sun, BookOpenCheck } from "lucide-react";

const HTMLEditor = ({
  value,
  onChange,
  onSave,
  onClose,
  onPrevious,
  loading,
  editingQuestion,
  title = "Problem Statement", // NEW
  saveButtonText = "Save", // NEW
  backgroundColor = "bg-blue-50" // NEW
}) => {
  const [editorValue, setEditorValue] = useState(value || '');
  const [activeView, setActiveView] = useState('split');
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('htmleditor_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    setEditorValue(value || '');
  }, [value]);

  const handleEditorChange = (newValue) => {
    setEditorValue(newValue || '');
    onChange(newValue || '');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      localStorage.setItem('htmleditor_theme', newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  // NEW: Dynamic templates based on editor type
  const insertTemplate = (template) => {
    const isSolutionEditor = title.toLowerCase().includes('solution');

    const templates = {
      basic: isSolutionEditor ? `<div class="solution">
  <h2>Solution Approach</h2>
  <p>This problem can be solved using...</p>
  
  <h3>Algorithm</h3>
  <ol>
    <li>Step 1: Initialize variables</li>
    <li>Step 2: Process input</li>
    <li>Step 3: Apply main logic</li>
    <li>Step 4: Return result</li>
  </ol>
  
  <h3>Code Implementation</h3>
  <pre><code>def solve(arr):
    # Your solution code here
    result = 0
    for num in arr:
        result += num
    return result</code></pre>
  
  <h3>Time Complexity</h3>
  <p>O(n) - where n is the length of the array</p>
  
  <h3>Space Complexity</h3>
  <p>O(1) - constant extra space</p>
</div>` : `<div class="problem-statement">
  <h2>Problem Title</h2>
  <p>Problem description goes here...</p>
  
  <h3>Input</h3>
  <p>Input description...</p>
  
  <h3>Output</h3>
  <p>Output description...</p>
  
  <h3>Example</h3>
  <pre>Input:
5
1 2 3 4 5

Output:
15</pre>
  
  <h3>Constraints</h3>
  <ul>
    <li>1 ≤ n ≤ 10<sup>5</sup></li>
    <li>1 ≤ a[i] ≤ 10<sup>9</sup></li>
  </ul>
</div>`,

      advanced: isSolutionEditor ? `<div class="solution">
  <h1>Advanced Solution</h1>
  
  <div class="approach">
    <h2>Approach: Dynamic Programming</h2>
    <p>This problem can be efficiently solved using dynamic programming. The key insight is to...</p>
  </div>
  
  <h3>Detailed Algorithm</h3>
  <ol>
    <li><strong>Initialization:</strong> Create a DP table of size n+1</li>
    <li><strong>Base Case:</strong> Set dp[0] = initial_value</li>
    <li><strong>Recurrence:</strong> For each i from 1 to n:
      <ul>
        <li>dp[i] = optimal(dp[i-1], current_choice)</li>
      </ul>
    </li>
    <li><strong>Result:</strong> Return dp[n]</li>
  </ol>
  
  <h3>Implementation</h3>
  <div class="code-section">
    <h4>Python Implementation</h4>
    <pre><code>def advanced_solution(arr):
    n = len(arr)
    dp = [0] * (n + 1)
    
    # Base case
    dp[0] = 0
    
    # Fill DP table
    for i in range(1, n + 1):
        dp[i] = max(dp[i-1], dp[i-1] + arr[i-1])
    
    return dp[n]</code></pre>
    
    <h4>Java Implementation</h4>
    <pre><code>public int advancedSolution(int[] arr) {
    int n = arr.length;
    int[] dp = new int[n + 1];
    
    dp[0] = 0;
    for (int i = 1; i <= n; i++) {
        dp[i] = Math.max(dp[i-1], dp[i-1] + arr[i-1]);
    }
    
    return dp[n];
}</code></pre>
  </div>
  
  <h3>Complexity Analysis</h3>
  <table class="complexity-table">
    <tr>
      <th>Aspect</th>
      <th>Complexity</th>
      <th>Explanation</th>
    </tr>
    <tr>
      <td>Time</td>
      <td>O(n)</td>
      <td>Single pass through the array</td>
    </tr>
    <tr>
      <td>Space</td>
      <td>O(n)</td>
      <td>DP table of size n+1</td>
    </tr>
  </table>
  
  <blockquote>
    <strong>Alternative Approach:</strong> This can be optimized to O(1) space by using two variables instead of an array.
  </blockquote>
  
  <h3>Edge Cases</h3>
  <ul>
    <li>Empty array: Return 0</li>
    <li>Single element: Return that element if positive, 0 otherwise</li>
    <li>All negative numbers: Return 0 (empty subarray)</li>
  </ul>
</div>` : `<div class="problem-statement">
  <h1>Advanced Problem Statement</h1>
  
  <div class="section">
    <p>Given an array of integers, find the maximum subarray sum using Kadane's algorithm.</p>
  </div>
  
  <h3>Input Format</h3>
  <p>The first line contains an integer <code>n</code>, the size of the array.</p>
  <p>The second line contains <code>n</code> space-separated integers.</p>
  
  <h3>Output Format</h3>
  <p>Print the maximum subarray sum.</p>
  
  <h3>Sample Input/Output</h3>
  <table class="example-table">
    <tr>
      <th>Input</th>
      <th>Output</th>
      <th>Explanation</th>
    </tr>
    <tr>
      <td><pre>5
-2 1 -3 4 -1</pre></td>
      <td><pre>4</pre></td>
      <td>The subarray [4] has the maximum sum of 4.</td>
    </tr>
    <tr>
      <td><pre>6
-2 -3 4 -1 -2 1</pre></td>
      <td><pre>4</pre></td>
      <td>The subarray [4] has the maximum sum of 4.</td>
    </tr>
  </table>
  
  <h3>Constraints</h3>
  <ul>
    <li><code>1 ≤ n ≤ 10<sup>5</sup></code></li>
    <li><code>-10<sup>9</sup> ≤ arr[i] ≤ 10<sup>9</sup></code></li>
  </ul>
  
  <blockquote>
    <strong>Note:</strong> Try to solve this problem in O(n) time complexity.
  </blockquote>
</div>`
    };

    setEditorValue(templates[template]);
    onChange(templates[template]);
  };

  // Enhanced editor options for better dark mode experience
  const editorOptions = useMemo(() => ({
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: false,
    cursorStyle: 'line',
    automaticLayout: true,
    wordWrap: 'on',
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    fontSize: 16,
    lineNumbers: 'on',
    glyphMargin: false,
    folding: true,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 3,
    renderLineHighlight: 'line',
    tabSize: 2,
    insertSpaces: true,
    formatOnPaste: true,
    formatOnType: true,
    language: 'html',
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
    },
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    renderWhitespace: 'selection',
  }), []);

  // NEW: Dynamic background color based on editor type
  const getBackgroundColor = () => {
    if (title.toLowerCase().includes('solution')) {
      return theme === 'dark' ? 'bg-green-900' : 'bg-green-50';
    }
    return theme === 'dark' ? 'bg-slate-900' : backgroundColor;
  };

  // NEW: Dynamic icon based on editor type
  const getEditorIcon = () => {
    return title.toLowerCase().includes('solution') ? BookOpenCheck : Code;
  };

  // Local theme container class (no global impact)
  const containerClasses = `fixed inset-0 z-[9999] ${theme === 'dark'
    ? 'bg-slate-900 text-slate-100'
    : 'bg-white text-slate-900'
    }`;

  const EditorIcon = getEditorIcon();

  return (
    <div className={containerClasses} style={{ zIndex: 9999 }}>
      <div className={theme === 'dark' ? 'dark-editor-container' : 'light-editor-container'}>
        <Card className={`h-full ${theme === 'dark'
          ? 'bg-slate-900 border-slate-700 shadow-2xl'
          : 'bg-white border-slate-200 shadow-lg'
          }`}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                }`}>
                <EditorIcon className="h-5 w-5" />
                {title} Editor {/* NEW: Dynamic title */}
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Theme Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTheme}
                  className={`flex items-center gap-2 ${theme === 'dark'
                    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700'
                    : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
                    }`}
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  {theme === 'light' ? 'Dark' : 'Light'}
                </Button>

                {/* NEW: Dynamic template buttons based on editor type */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertTemplate('basic')}
                  className={`hidden sm:flex ${theme === 'dark'
                    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700'
                    : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  {title.toLowerCase().includes('solution') ? 'Basic Solution' : 'Basic Template'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertTemplate('advanced')}
                  className={`hidden sm:flex ${theme === 'dark'
                    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700'
                    : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  <BookOpen className="h-4 w-4 mr-1" />
                  {title.toLowerCase().includes('solution') ? 'Advanced Solution' : 'Advanced Template'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrevious}
                  className={`flex items-center gap-2 ${theme === 'dark'
                    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700'
                    : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  onClick={onSave}
                  disabled={loading}
                  className={`flex items-center gap-2 ${title.toLowerCase().includes('solution')
                      ? theme === 'dark'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                      : theme === 'dark'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                  <Save className="h-4 w-4" />
                  {loading ? 'Saving...' : saveButtonText} {/* NEW: Dynamic save button text */}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className={`flex items-center gap-2 ${theme === 'dark'
                    ? 'border-red-600 bg-red-900 text-red-100 hover:bg-red-800'
                    : 'border-red-300 bg-red-50 text-red-900 hover:bg-red-100'
                    }`}
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="h-full p-0">
            <Tabs value={activeView} onValueChange={setActiveView} className="h-full">
              <div className={`border-b px-4 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                }`}>
                <TabsList className={`grid grid-cols-3 max-w-md ${theme === 'dark'
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-slate-100 border-slate-200'
                  }`}>
                  <TabsTrigger
                    value="split"
                    className={theme === 'dark' ? 'data-[state=active]:bg-slate-700 text-slate-200' : ''}
                  >
                    Split View
                  </TabsTrigger>
                  <TabsTrigger
                    value="code"
                    className={theme === 'dark' ? 'data-[state=active]:bg-slate-700 text-slate-200' : ''}
                  >
                    Code Only
                  </TabsTrigger>
                  <TabsTrigger
                    value="preview"
                    className={theme === 'dark' ? 'data-[state=active]:bg-slate-700 text-slate-200' : ''}
                  >
                    Preview Only
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="split" className="m-0 h-[calc(100%-4rem)]">
                <div className="grid grid-cols-2 h-full">
                  <div className={`border-r ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                    }`}>
                    <div className={`h-8 border-b flex items-center px-3 ${theme === 'dark'
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-slate-50 border-slate-200'
                      }`}>
                      <Badge variant="outline" className={`text-xs ${theme === 'dark'
                        ? 'border-slate-600 text-slate-300'
                        : 'border-slate-300 text-slate-700'
                        }`}>
                        HTML Editor
                      </Badge>
                    </div>
                    <Editor
                      height="calc(100vh - 12rem)"
                      defaultLanguage="html"
                      value={editorValue}
                      onChange={handleEditorChange}
                      options={editorOptions}
                      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                    />
                  </div>
                  <div className={theme === 'dark' ? 'bg-slate-800' : getBackgroundColor()}>
                    <div className={`h-8 border-b flex items-center px-3 ${theme === 'dark'
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-slate-50 border-slate-200'
                      }`}>
                      <Badge variant="outline" className={`text-xs ${theme === 'dark'
                        ? 'border-slate-600 text-slate-300'
                        : 'border-slate-300 text-slate-700'
                        }`}>
                        Live Preview
                      </Badge>
                    </div>
                    <div
                      className={`h-[calc(100vh-12rem)] p-4 overflow-auto ${theme === 'dark'
                        ? 'bg-slate-900 text-slate-100'
                        : title.toLowerCase().includes('solution')
                          ? 'bg-green-50 text-slate-900'
                          : 'bg-white text-slate-900'
                        }`}
                      dangerouslySetInnerHTML={{ __html: editorValue }}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="code" className="m-0 h-[calc(100%-4rem)]">
                <Editor
                  height="calc(100vh - 10rem)"
                  defaultLanguage="html"
                  value={editorValue}
                  onChange={handleEditorChange}
                  options={{
                    ...editorOptions,
                    minimap: { enabled: true }
                  }}
                  theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                />
              </TabsContent>

              <TabsContent value="preview" className="m-0 h-[calc(100%-4rem)]">
                <div
                  className={`h-[calc(100vh-10rem)] p-6 overflow-auto ${theme === 'dark'
                    ? 'bg-slate-900 text-slate-100'
                    : title.toLowerCase().includes('solution')
                      ? 'bg-green-50 text-slate-900'
                      : 'bg-white text-slate-900'
                    }`}
                  dangerouslySetInnerHTML={{ __html: editorValue }}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced scoped CSS for both problem statements and solutions */}
      <style jsx>{`
        /* Dark mode styles */
        .dark-editor-container .problem-statement,
        .dark-editor-container .solution {
          color: #e2e8f0;
          line-height: 1.7;
        }
        
        .dark-editor-container h1,
        .dark-editor-container h2,
        .dark-editor-container h3,
        .dark-editor-container h4,
        .dark-editor-container h5,
        .dark-editor-container h6 {
          color: #f8fafc;
          border-bottom: 1px solid #475569;
          margin-top: 24px;
          margin-bottom: 16px;
          padding-bottom: 8px;
        }
        
        .dark-editor-container code {
          background-color: #475569;
          color: #fbbf24;
          padding: 3px 6px;
          border-radius: 4px;
          font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
          font-size: 0.9em;
        }
        
        .dark-editor-container pre {
          background-color: #1e293b;
          color: #e5e7eb;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #475569;
          overflow-x: auto;
          font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
          line-height: 1.6;
          margin: 16px 0;
        }
        
        .dark-editor-container pre code {
          background: none;
          color: inherit;
          padding: 0;
          border-radius: 0;
        }
        
        .dark-editor-container blockquote {
          border-left: 4px solid #3b82f6;
          background-color: rgba(59, 130, 246, 0.1);
          padding: 16px 20px;
          margin: 20px 0;
          border-radius: 6px;
          font-style: italic;
        }
        
        .dark-editor-container table,
        .dark-editor-container .complexity-table,
        .dark-editor-container .example-table {
          border-collapse: collapse;
          width: 100%;
          margin: 20px 0;
          background-color: #1e293b;
        }
        
        .dark-editor-container th,
        .dark-editor-container td {
          border: 1px solid #475569;
          padding: 12px 16px;
          text-align: left;
        }
        
        .dark-editor-container th {
          background-color: #334155;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .dark-editor-container tr:nth-child(even) {
          background-color: rgba(71, 85, 105, 0.2);
        }
        
        .dark-editor-container ul,
        .dark-editor-container ol {
          padding-left: 24px;
          margin: 16px 0;
        }
        
        .dark-editor-container li {
          margin: 6px 0;
          line-height: 1.6;
        }
        
        .dark-editor-container .section,
        .dark-editor-container .approach,
        .dark-editor-container .code-section {
          margin: 20px 0;
          padding: 16px;
          background-color: rgba(71, 85, 105, 0.2);
          border-radius: 8px;
          border-left: 4px solid #64748b;
        }
        
        /* Solution-specific dark mode styles */
        .dark-editor-container .solution .approach {
          border-left-color: #10b981;
          background-color: rgba(16, 185, 129, 0.1);
        }
        
        .dark-editor-container .solution .code-section {
          border-left-color: #8b5cf6;
          background-color: rgba(139, 92, 246, 0.1);
        }

        /* Light mode styles */
        .light-editor-container .problem-statement,
        .light-editor-container .solution {
          color: #1e293b;
          line-height: 1.7;
        }
        
        .light-editor-container h1,
        .light-editor-container h2,
        .light-editor-container h3,
        .light-editor-container h4,
        .light-editor-container h5,
        .light-editor-container h6 {
          color: #0f172a;
          margin-top: 28px;
          margin-bottom: 16px;
          font-weight: 600;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .light-editor-container code {
          background-color: #f1f5f9;
          color: #dc2626;
          padding: 3px 6px;
          border-radius: 4px;
          font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
          font-size: 0.9em;
          border: 1px solid #e2e8f0;
        }
        
        .light-editor-container pre {
          background-color: #f8fafc;
          color: #475569;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          overflow-x: auto;
          font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
          line-height: 1.6;
          margin: 16px 0;
        }
        
        .light-editor-container pre code {
          background: none;
          color: inherit;
          padding: 0;
          border: none;
          border-radius: 0;
        }
        
        .light-editor-container blockquote {
          border-left: 4px solid #3b82f6;
          background-color: rgba(59, 130, 246, 0.05);
          padding: 16px 20px;
          margin: 20px 0;
          border-radius: 6px;
          font-style: italic;
          color: #475569;
        }
        
        .light-editor-container table,
        .light-editor-container .complexity-table,
        .light-editor-container .example-table {
          border-collapse: collapse;
          width: 100%;
          margin: 20px 0;
          background-color: #ffffff;
        }
        
        .light-editor-container th,
        .light-editor-container td {
          border: 1px solid #cbd5e1;
          padding: 12px 16px;
          text-align: left;
        }
        
        .light-editor-container th {
          background-color: #f1f5f9;
          font-weight: 600;
          color: #0f172a;
        }
        
        .light-editor-container tr:nth-child(even) {
          background-color: #f8fafc;
        }
        
        .light-editor-container ul,
        .light-editor-container ol {
          padding-left: 24px;
          margin: 16px 0;
        }
        
        .light-editor-container li {
          margin: 6px 0;
          line-height: 1.6;
        }
        
        .light-editor-container .section,
        .light-editor-container .approach,
        .light-editor-container .code-section {
          margin: 20px 0;
          padding: 16px;
          background-color: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #64748b;
        }
        
        /* Solution-specific light mode styles */
        .light-editor-container .solution .approach {
          border-left-color: #10b981;
          background-color: #ecfdf5;
        }
        
        .light-editor-container .solution .code-section {
          border-left-color: #8b5cf6;
          background-color: #f3e8ff;
        }
        
        /* Solution-specific heading colors */
        .light-editor-container .solution h1,
        .light-editor-container .solution h2 {
          color: #065f46;
        }
        
        .dark-editor-container .solution h1,
        .dark-editor-container .solution h2 {
          color: #34d399;
        }
        
        /* Code highlighting improvements */
        .light-editor-container .solution pre {
          background-color: #f0fdf4;
          border-color: #bbf7d0;
        }
        
        .dark-editor-container .solution pre {
          background-color: #064e3b;
          border-color: #065f46;
        }
      `}</style>
    </div>
  );
};

export default HTMLEditor;
