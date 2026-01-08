import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api/apiClient';

const PdfViewerModal = ({ isOpen, onClose, file, noteTitle }) => {
  const [fileUrl, setFileUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !file) {
      // Cleanup previous URL
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
        setFileUrl(null);
      }
      return;
    }

    const fetchFile = async () => {
      setIsLoading(true);
      try {
        console.log('Fetching file with ID:', file.id); // Debug log
        const response = await api.get(`/upload-notes/files/${file.id}`, {
          responseType: 'blob',
        });

        const blob = new Blob([response.data], { type: file.content_type });
        const url = URL.createObjectURL(blob);
        setFileUrl(url);
      } catch (error) {
        console.error('Error loading file:', error);
        toast.error("Failed to load file");
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    fetchFile();

    // Cleanup on unmount
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [isOpen, file]);

  const handleDownload = async () => {
    try {
      const response = await api.get(`/upload-notes/files/${file.id}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success("File downloaded successfully");
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error("Failed to download file");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] w-full">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-semibold text-black truncate">
            {noteTitle} - {file?.original_filename}
          </DialogTitle>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="border-gray-300 text-black hover:bg-gray-100"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="border-gray-300 text-black hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
              <p className="ml-3 text-gray-600">Loading file...</p>
            </div>
          ) : fileUrl ? (
            <iframe
              src={fileUrl}
              title={file?.original_filename || 'File Viewer'}
              className="w-full h-[70vh] border-0 rounded-lg"
              style={{ minHeight: '600px' }}
            />
          ) : (
            <div className="flex items-center justify-center h-96 text-gray-500">
              <p>Unable to load file</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PdfViewerModal;
