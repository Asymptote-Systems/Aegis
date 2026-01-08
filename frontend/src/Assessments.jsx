import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, Trash2, Eye, Calendar, Clock, Users, BookOpen } from "lucide-react";
import { toast } from "sonner";

const Assessments = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for assessments
  const mockAssessments = [
    {
      id: 1,
      title: "Data Structures Assessment",
      description: "Comprehensive assessment on arrays, linked lists, and trees",
      type: "Quiz",
      status: "Active",
      dueDate: "2025-09-15T23:59:00",
      studentsAssigned: 25,
      submissionsCount: 18,
      maxScore: 100,
      createdAt: "2025-09-01T10:00:00"
    },
    {
      id: 2,
      title: "Algorithm Analysis Assignment",
      description: "Time and space complexity analysis problems",
      type: "Assignment",
      status: "Draft",
      dueDate: "2025-09-20T23:59:00",
      studentsAssigned: 0,
      submissionsCount: 0,
      maxScore: 50,
      createdAt: "2025-09-05T14:30:00"
    },
    {
      id: 3,
      title: "Database Design Project",
      description: "Design a complete database system for a given scenario",
      type: "Project",
      status: "Completed",
      dueDate: "2025-08-30T23:59:00",
      studentsAssigned: 30,
      submissionsCount: 28,
      maxScore: 200,
      createdAt: "2025-08-15T09:00:00"
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setAssessments(mockAssessments);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusBadge = (status) => {
    const statusConfig = {
      Active: { className: "bg-green-100 text-green-800 border-green-200", label: "Active" },
      Draft: { className: "bg-gray-100 text-gray-800 border-gray-200", label: "Draft" },
      Completed: { className: "bg-blue-100 text-blue-800 border-blue-200", label: "Completed" }
    };

    const config = statusConfig[status] || statusConfig.Draft;
    
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const filteredAssessments = assessments.filter(assessment =>
    assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateAssessment = () => {
    toast.info("Create Assessment", {
      description: "Assessment creation feature will be implemented soon.",
    });
  };

  const handleEditAssessment = (id) => {
    toast.info("Edit Assessment", {
      description: `Editing assessment ${id} - feature will be implemented soon.`,
    });
  };

  const handleViewAssessment = (id) => {
    toast.info("View Assessment", {
      description: `Viewing assessment ${id} - feature will be implemented soon.`,
    });
  };

  const handleDeleteAssessment = (id) => {
    toast.info("Delete Assessment", {
      description: `Deleting assessment ${id} - feature will be implemented soon.`,
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Assessments</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage assessments for your students
          </p>
        </div>
        <Button onClick={handleCreateAssessment} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Assessment
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assessments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary">
              {filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Assessments Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Clock className="h-8 w-8 animate-spin mr-3" />
              <span className="text-lg">Loading assessments...</span>
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="text-center py-12 px-8">
              <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-6" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">
                {searchTerm ? 'No matching assessments' : 'No assessments yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {searchTerm 
                  ? 'Try adjusting your search terms.'
                  : 'Create your first assessment to get started.'
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleCreateAssessment} className="gap-2" size="lg">
                  <Plus className="h-5 w-5" />
                  Create Your First Assessment
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-800">
                <TableRow>
                  <TableHead className="font-semibold">Assessment Details</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Due Date</TableHead>
                  <TableHead className="font-semibold text-center">Students</TableHead>
                  <TableHead className="font-semibold text-center">Submissions</TableHead>
                  <TableHead className="font-semibold text-center">Max Score</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssessments.map((assessment) => (
                  <TableRow key={assessment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-base">{assessment.title}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {assessment.description}
                        </div>
                        <div className="text-xs text-gray-500">
                          Created: {formatDate(assessment.createdAt)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{assessment.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(assessment.status)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(assessment.dueDate)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3 w-3" />
                        {assessment.studentsAssigned}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={assessment.submissionsCount > 0 ? "default" : "secondary"}>
                        {assessment.submissionsCount}/{assessment.studentsAssigned}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {assessment.maxScore}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewAssessment(assessment.id)}
                          className="h-9 w-9 p-0"
                          title="View Assessment"
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAssessment(assessment.id)}
                          className="h-9 w-9 p-0"
                          title="Edit Assessment"
                        >
                          <Edit className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAssessment(assessment.id)}
                          className="h-9 w-9 p-0"
                          title="Delete Assessment"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Assessments;
