import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

const VISUALGO_TOPICS = [
  { value: 'sorting', label: 'Sorting Algorithms', url: 'https://visualgo.net/en/sorting' },
  { value: 'bst', label: 'Binary Search Trees', url: 'https://visualgo.net/en/bst' },
  { value: 'heap', label: 'Binary Heap', url: 'https://visualgo.net/en/heap' },
  { value: 'hashtable', label: 'Hash Table', url: 'https://visualgo.net/en/hashtable' },
  { value: 'graph', label: 'Graph Traversal', url: 'https://visualgo.net/en/dfsbfs' },
  { value: 'mst', label: 'Minimum Spanning Tree', url: 'https://visualgo.net/en/mst' },
  { value: 'sssp', label: 'Single Source Shortest Path', url: 'https://visualgo.net/en/sssp' },
  { value: 'recursion', label: 'Recursion Tree', url: 'https://visualgo.net/en/recursion' },
  { value: 'linkedlist', label: 'Linked List', url: 'https://visualgo.net/en/list' },
  { value: 'stack', label: 'Stack', url: 'https://visualgo.net/en/list' },
];

const TOOL_OPTIONS = [
  { value: 'visualgo', label: 'VisualGo' },
  { value: 'csvistool', label: 'CSVIS Tool' }
];

const AlgorithmVisualizer = () => {
  const [selectedTool, setSelectedTool] = useState('visualgo');
  const [selectedTopic, setSelectedTopic] = useState('sorting');
  
  const getCurrentUrl = () => {
    if (selectedTool === 'visualgo') {
      const topic = VISUALGO_TOPICS.find(t => t.value === selectedTopic);
      return topic ? topic.url : VISUALGO_TOPICS[0].url;
    } else {
      return 'https://csvistool.com/';
    }
  };

  const openInNewTab = () => {
    window.open(getCurrentUrl(), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900">
      {/* Header with minimal height for maximum iframe space */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Algorithm Visualizer</h1>
            <p className="text-sm text-gray-600">Interactive Data Structures & Algorithms</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Tool Selection */}
          <Select value={selectedTool} onValueChange={setSelectedTool}>
            <SelectTrigger className="w-36 bg-white border-gray-300 text-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOOL_OPTIONS.map((tool) => (
                <SelectItem key={tool.value} value={tool.value} className="text-gray-700">
                  {tool.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Topic Selection - only for VisualGo */}
          {selectedTool === 'visualgo' && (
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger className="w-52 bg-white border-gray-300 text-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISUALGO_TOPICS.map((topic) => (
                  <SelectItem key={topic.value} value={topic.value} className="text-gray-700">
                    {topic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Open in New Tab Button */}
          <Button
            variant="outline"
            onClick={openInNewTab}
            className="flex items-center space-x-2 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink size={16} />
            <span>New Tab</span>
          </Button>
        </div>
      </header>

      {/* Main content - maximum iframe space */}
      <main className="flex-1 p-4 overflow-hidden">
        <Card className="h-full border-gray-200 shadow-sm">
          <CardContent className="p-0 h-full">
            <iframe
              src={getCurrentUrl()}
              width="100%"
              height="100%"
              className="border-0 rounded-md"
              title={`${selectedTool === 'visualgo' ? 'VisualGo' : 'CSVIS Tool'} - ${selectedTool === 'visualgo' ? selectedTopic : 'Data Structures & Algorithms'}`}
              allowFullScreen
            />
          </CardContent>
        </Card>
      </main>

      {/* Minimal footer */}
      <footer className="px-6 py-2 bg-white border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Powered by{' '}
          <a
            href={selectedTool === 'visualgo' ? 'https://visualgo.net' : 'https://csvistool.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-800 underline"
          >
            {selectedTool === 'visualgo' ? 'VisualGo' : 'CSVIS Tool'}
          </a>
        </p>
      </footer>
    </div>
  );
};

export default AlgorithmVisualizer;
