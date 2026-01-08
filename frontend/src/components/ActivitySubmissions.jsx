import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  BarChart2
} from "lucide-react";
import { toast } from "sonner";

// Helper to get auth headers (customize as needed)
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

const ActivityOverview = ({ activityId, data }) => {
  if (!data) return null;
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_submissions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From all students
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Average Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(data.average_completion_rate)}%
            </div>
            <Progress 
              value={data.average_completion_rate} 
              className="mt-2"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Submission Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              Latest: {new Date(data.submission_timeline[data.submission_timeline.length - 1]).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Question Statistics</CardTitle>
          <CardDescription>Performance breakdown by question</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Completion Rate</TableHead>
                <TableHead>Avg. Time</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead>Languages</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.question_stats.map((stat) => (
                <TableRow key={stat.question_number}>
                  <TableCell>Q{stat.question_number}: {stat.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={stat.completion_rate} className="w-20" />
                      <span>{Math.round(stat.completion_rate)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{Math.round(stat.average_time_spent / 60)} min</TableCell>
                  <TableCell>{stat.submission_count}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {stat.languages_used.map(lang => (
                        <Badge key={lang.language} variant="secondary">
                          {lang.language} ({lang.count})
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const ClassPerformance = ({ activityId, data }) => {
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.student_count}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.submission_count}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(data.average_completion_rate)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Submissions</CardTitle>
          <CardDescription>Individual student performance</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Time Spent</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.student_submissions.map((submission) => (
                <TableRow key={submission.student_id}>
                  <TableCell>{submission.student_name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={submission.status === 'completed' ? 'success' : 'warning'}
                    >
                      {submission.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={submission.completion_rate} className="w-20" />
                      <span>{Math.round(submission.completion_rate)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{Math.round(submission.total_time_spent / 60)} min</TableCell>
                  <TableCell>{new Date(submission.submission_timestamp).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const StudentSubmissions = ({ activityId, data }) => {
  if (!data || !data.length) return null;

  return (
    <div className="space-y-4">
      {data.map((submission) => (
        <Card key={submission.student_id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{submission.student_name}</CardTitle>
                <CardDescription>
                  Submitted: {new Date(submission.submission_details.assessment_data.submission_timestamp).toLocaleString()}
                </CardDescription>
              </div>
              <Badge
                variant={
                  submission.submission_details.submission_analytics.activity_completion.completion_status === 'completed'
                    ? 'success'
                    : 'warning'
                }
              >
                {submission.submission_details.submission_analytics.activity_completion.completion_status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="text-sm font-medium">Completion</div>
                    <div className="text-2xl font-bold">
                      {Math.round(submission.submission_details.submission_analytics.question_completion_rate)}%
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium">Time Spent</div>
                    <div className="text-2xl font-bold">
                      {Math.round(submission.submission_details.submission_analytics.total_time_spent / 60)} min
                    </div>
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Time Spent</TableHead>
                    <TableHead>Last Modified</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submission.submission_details.student_work.questions.map((question) => (
                    <TableRow key={question.number}>
                      <TableCell>
                        Q{question.number}: {question.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            question.progress_tracking.status === 'completed'
                              ? 'success'
                              : question.progress_tracking.status === 'partial'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {question.progress_tracking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{question.submission.language}</Badge>
                      </TableCell>
                      <TableCell>
                        {Math.round(question.progress_tracking.time_spent / 60)} min
                      </TableCell>
                      <TableCell>
                        {new Date(question.progress_tracking.last_modified).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          View Code
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const ActivitySubmissions = ({ activityId }) => {
  const [activeView, setActiveView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [classData, setClassData] = useState(null);
  const [submissions, setSubmissions] = useState(null);

  useEffect(() => {
    if (!activityId) return;
    loadData();
  }, [activityId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const baseUrl = baseUrl();

      // Fetch overview data
      const overviewResponse = await fetch(
        `${baseUrl}/assessments/activities/${activityId}/overview`,
        { headers: getAuthHeaders() }
      );
      if (!overviewResponse.ok) throw new Error('Failed to fetch overview');
      const overviewData = await overviewResponse.json();
      setOverview(overviewData);

      // Fetch class performance data
      const classResponse = await fetch(
        `${baseUrl}/assessments/activities/${activityId}/class/${overviewData.class_id}`,
        { headers: getAuthHeaders() }
      );
      if (!classResponse.ok) throw new Error('Failed to fetch class data');
      const classData = await classResponse.json();
      setClassData(classData);

      // Fetch detailed student submissions
      const submissionsPromises = classData.student_submissions.map(student =>
        fetch(
          `${baseUrl}/assessments/activities/${activityId}/students/${student.student_id}`,
          { headers: getAuthHeaders() }
        ).then(res => res.json())
      );
      const submissionsData = await Promise.all(submissionsPromises);
      setSubmissions(submissionsData);

    } catch (error) {
      console.error('Error loading submission data:', error);
      toast.error('Failed to load submission data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-sm text-muted-foreground">Loading submission data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart2 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="class">
            <Users className="h-4 w-4 mr-2" />
            Class Performance
          </TabsTrigger>
          <TabsTrigger value="submissions">
            <CheckCircle className="h-4 w-4 mr-2" />
            Student Submissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <ActivityOverview activityId={activityId} data={overview} />
        </TabsContent>
        
        <TabsContent value="class" className="mt-4">
          <ClassPerformance activityId={activityId} data={classData} />
        </TabsContent>
        
        <TabsContent value="submissions" className="mt-4">
          <StudentSubmissions activityId={activityId} data={submissions} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ActivitySubmissions;