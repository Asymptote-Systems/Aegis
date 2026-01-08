import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import api from '../../api/apiClient';

const AuthenticatedPDFViewer = ({ pdfUrl, title, className = "w-full h-96" }) => {
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch PDF with authentication headers
        const response = await api.get(pdfUrl, {
          responseType: 'blob',
        });
        
        // Create blob URL for iframe
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

    // Cleanup blob URL when component unmounts
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
        <p className="text-red-500 mb-2">{error}</p>
        <Button
          variant="outline"
          onClick={() => window.open(pdfUrl, '_blank')}
        >
          Open in New Tab
        </Button>
      </div>
    );
  }

  return (
    <iframe
      src={pdfBlobUrl}
      title={title}
      className={`border rounded-lg ${className}`}
      onLoad={() => setLoading(false)}
      onError={() => setError('Failed to display PDF')}
    />
  );
};

export default AuthenticatedPDFViewer;
