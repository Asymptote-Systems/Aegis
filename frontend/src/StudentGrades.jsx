import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Award, TrendingUp, Calendar, MessageSquare, RefreshCw } from 'lucide-react';

// Utility functions
const getBaseUrl = () => {
  const currentUrl = new URL(window.location.origin);
  return `${currentUrl.protocol}//${currentUrl.hostname}:8000`;
};

const getAuthHeaders = (includeContentType = true) => {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('authToken');
  if (!token) return includeContentType ? { 'Content-Type': 'application/json' } : {};
  const headers = { 'Authorization': `Bearer ${token}` };
  if (includeContentType) headers['Content-Type'] = 'application/json';
  return headers;
};

const checkAuthToken = () => {
  const tokenKeys = ['token', 'access_token', 'authToken', 'accessToken'];
  let token = null;
  for (const key of tokenKeys) {
    token = localStorage.getItem(key);
    if (token) {
      localStorage.setItem('token', token);
      break;
    }
  }
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      tokenKeys.forEach(key => localStorage.removeItem(key));
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const makeAuthenticatedRequest = async (url, options = {}) => {
  if (!checkAuthToken()) throw new Error('No valid authentication token');
  const defaultOptions = { headers: getAuthHeaders() };
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...options.headers }
  };
  try {
    const response = await fetch(url, mergedOptions);
    if (response.status === 401) {
      ['token', 'access_token', 'authToken', 'accessToken'].forEach(key => { localStorage.removeItem(key); });
      toast.error('Session expired. Please log in again.');
      setTimeout(() => { window.location.href = '/login'; }, 2000);
      throw new Error('Authentication failed');
    }
    if (response.status === 403) {
      toast.error('You do not have permission to perform this action');
      throw new Error('Permission denied');
    }
    return response;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      toast.error('Network error. Please check your connection.');
      throw new Error('Network error');
    }
    throw error;
  }
};

const StudentGrades = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyGrades();
  }, []);

  const fetchMyGrades = async () => {
    setLoading(true);
    try {
      const baseUrl = getBaseUrl();
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/activity-grades/student/my-grades`,
        {}
      );
      
      if (response.ok) {
        const data = await response.json();
        setGrades(data);
      } else {
        toast.error('Failed to load grades');
      }
    } catch (error) {
      toast.error('Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'text-green-600 bg-green-50';
    if (percentage >= 80) return 'text-blue-600 bg-blue-50';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-50';
    if (percentage >= 60) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getGradeBadgeVariant = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 70) return 'default';
    return 'secondary';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading your grades...</p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalGrades = grades.length;
  const averagePercentage = totalGrades > 0
    ? grades.reduce((sum, grade) => sum + (grade.score / grade.max_score) * 100, 0) / totalGrades
    : 0;

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Award className="h-8 w-8 text-primary" />
            My Grades
          </h1>
          <p className="text-gray-600 mt-1">View your published activity grades and feedback</p>
        </div>
        <Button onClick={fetchMyGrades} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {totalGrades > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Graded Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalGrades}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                {averagePercentage.toFixed(1)}%
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {grades.reduce((sum, g) => sum + g.score, 0)} / {grades.reduce((sum, g) => sum + g.max_score, 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Grades List */}
      {grades.length === 0 ? (
        <Alert>
          <AlertDescription className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            No published grades yet. Grades will appear here once your teacher publishes them.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {grades.map(grade => {
            const percentage = ((grade.score / grade.max_score) * 100).toFixed(1);
            return (
              <Card key={grade.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Activity Grade</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        Graded on {new Date(grade.graded_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={getGradeBadgeVariant(grade.score, grade.max_score)}
                      className={`text-lg px-4 py-2 ${getGradeColor(grade.score, grade.max_score)}`}
                    >
                      {percentage}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Score</p>
                      <p className="text-2xl font-bold">
                        {grade.score} <span className="text-gray-400 text-base">/ {grade.max_score}</span>
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Percentage</p>
                      <p className="text-2xl font-bold">{percentage}%</p>
                    </div>
                  </div>
                  
                  {grade.comments && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2 mb-2">
                        <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                        <p className="font-semibold text-blue-900">Teacher's Feedback</p>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap pl-7">{grade.comments}</p>
                    </div>
                  )}
                  
                  {grade.published_at && (
                    <div className="text-xs text-gray-500 border-t pt-3 mt-3">
                      Published: {new Date(grade.published_at).toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentGrades;
