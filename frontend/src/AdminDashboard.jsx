// FILE: src/AdminDashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload, Users, RefreshCw, Search, FileSpreadsheet, CheckCircle, XCircle, Clock,
  Download, UserPlus, Trash2, Eye, AlertTriangle, Info, GraduationCap, UserCheck, X,
  Edit, Save, Pencil  
} from 'lucide-react';
import * as XLSX from '@e965/xlsx';
import LogoutButton from './LogoutButton';
import axios from 'axios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
// API Client - ENHANCED VERSION with duplicate check and teacher support
const host_ip = import.meta.env.VITE_HOST_IP;

const apiClient = {
  baseURL: `http://${host_ip}:8000`,

  // Get headers with authentication
  getHeaders() {
    const token = localStorage.getItem('authToken');
    const csrfToken = localStorage.getItem('csrfToken');
    return {
      'Content-Type': 'application/json',
      'accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    };
  },

  async getTeacherCourses(teacherId) {
    try {
      console.log('Fetching courses for teacher ID:', teacherId);
      const response = await axios.get(`${this.baseURL}/teachers/${teacherId}/courses`, {
        headers: this.getHeaders(),
        timeout: 5000
      });
      console.log('Teacher courses fetched:', response.data);
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching teacher courses:', error);
      throw error;
    }
  },

  // Get teachers teaching a course
  async getCourseTeachers(courseId) {
    try {
      console.log('Fetching teachers for course ID:', courseId);
      const response = await axios.get(`${this.baseURL}/courses/${courseId}/teachers`, {
        headers: this.getHeaders(),
        timeout: 5000
      });
      console.log('Course teachers fetched:', response.data);
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching course teachers:', error);
      throw error;
    }
  },

  // Update teacher courses
  async updateTeacherCourses(teacherId, courseIds) {
    try {
      console.log('Updating courses for teacher ID:', teacherId);
      const response = await axios.put(`${this.baseURL}/teachers/${teacherId}/courses`, {
        course_ids: courseIds
      }, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      console.log('Teacher courses updated:', response.data);
      return { data: response.data };
    } catch (error) {
      console.error('Error updating teacher courses:', error);
      throw error;
    }
  },

  // Check if user already exists
  async checkUserExists(email) {
    try {
      const response = await axios.get(`${this.baseURL}/users/`, {
        headers: this.getHeaders(),
        timeout: 5000
      });

      const allUsers = Array.isArray(response.data) ? response.data : [];
      return allUsers.some(user => user.email.toLowerCase() === email.toLowerCase());
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  },

  // Create user (student or teacher) with duplicate check
  async createUser(user, role = "student") {
    // Check if user already exists
    const userExists = await this.checkUserExists(user.email);
    if (userExists) {
      throw new Error(`User with email ${user.email} already exists`);
    }

    const payload = {
      email: user.email,
      password: user.password,
      role: role,
      is_active: true,
      extra_data: {}
    };

    try {
      const response = await axios.post(`${this.baseURL}/users/`, payload, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      const createdUser = response.data;

      // If creating a student, also create student profile
      if (role === "student" && user.profileData) {
        try {
          await this.createStudentProfile(createdUser.id, user.profileData);
        } catch (profileError) {
          console.error('Failed to create student profile:', profileError);
          // Optionally, you might want to delete the user if profile creation fails
          // await this.deleteUser(createdUser.id);
          // throw new Error(`User created but profile creation failed: ${profileError.message}`);
        }
      }

      // If creating a teacher, also create teacher profile
      if (role === "teacher" && user.profileData) {
        try {
          await this.createTeacherProfile(createdUser.id, user.profileData);
        } catch (profileError) {
          console.error('Failed to create teacher profile:', profileError);
          // Optionally, you might want to delete the user if profile creation fails
          // await this.deleteUser(createdUser.id);
          // throw new Error(`User created but profile creation failed: ${profileError.message}`);
        }
      }

      console.log(`${role} user created successfully:`, createdUser);
      return { data: createdUser, success: true };
    } catch (error) {
      console.error(`Error creating ${role} user:`, error);
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        if (status === 400 && errorData?.detail?.includes('already exists')) {
          throw new Error(`User with email ${user.email} already exists`);
        } else if (status === 400) {
          throw new Error(errorData?.detail || 'Invalid user data provided');
        } else if (status === 422) {
          throw new Error('Validation error: Please check email format and password requirements');
        } else {
          throw new Error(`Server error: ${status} - ${errorData?.detail || 'Unknown error'}`);
        }
      } else if (error.request) {
        throw new Error('No response from server. Check if your backend is running.');
      } else {
        throw new Error(`Request failed: ${error.message}`);
      }
    }
  },

  // Delete user
  async deleteUser(userId) {
    try {
      console.log('Deleting user:', userId);
      const response = await axios.delete(`${this.baseURL}/users/${userId}`, {
        headers: this.getHeaders(),
        timeout: 5000
      });
      console.log('User deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 404) {
          throw new Error('User not found');
        } else if (status === 403) {
          throw new Error('You do not have permission to delete this user');
        } else {
          throw new Error(`Server error: ${status} - ${errorData?.detail || 'Unknown error'}`);
        }
      } else if (error.request) {
        throw new Error('No response from server. Check if your backend is running.');
      } else {
        throw new Error(`Request failed: ${error.message}`);
      }
    }
  },

  // NEW: Bulk delete users by role
  async deleteAllUsersByRole(role) {
    try {
      const response = await axios.get(`${this.baseURL}/users/`, {
        headers: this.getHeaders(),
        timeout: 5000
      });

      const allUsers = Array.isArray(response.data) ? response.data : [];
      const usersToDelete = allUsers.filter(user => user.role === role);

      let deletedCount = 0;
      const errors = [];

      for (const user of usersToDelete) {
        try {
          await this.deleteUser(user.id);
          deletedCount++;
        } catch (error) {
          errors.push({ userId: user.id, email: user.email, error: error.message });
        }
      }

      return {
        success: true,
        deletedCount,
        totalCount: usersToDelete.length,
        errors
      };
    } catch (error) {
      console.error(`Error bulk deleting ${role} users:`, error);
      throw new Error(`Failed to delete ${role} users: ${error.message}`);
    }
  },

  // Bulk user creation with duplicate checking
  async createBulkUsers(users) {
    const results = [];
    const errors = [];

    console.log(`Starting bulk creation of ${users.length} student users...`);

    for (let i = 0; i < users.length; i++) {
      try {
        console.log(`Creating student ${i + 1}/${users.length}: ${users[i].email}`);
        const result = await this.createUser(users[i], "student");
        results.push(result.data);
      } catch (error) {
        console.error(`Failed to create student ${users[i].email}:`, error.message);
        errors.push({ user: users[i], error: error.message });
      }
    }

    console.log(`Bulk creation completed. Success: ${results.length}, Errors: ${errors.length}`);

    return {
      data: {
        created: results.length,
        users: results,
        errors: errors
      }
    };
  },

  // Get specific user by ID
  async getUser(userId) {
    try {
      console.log('Fetching user details for ID:', userId);
      const response = await axios.get(`${this.baseURL}/users/${userId}`, {
        headers: this.getHeaders(),
        timeout: 5000
      });
      console.log('User details fetched:', response.data);
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching user details:', error);
      throw error;
    }
  },

  // Get all users (filtered by role)
  async getAllUsers() {
    try {
      const response = await axios.get(`${this.baseURL}/users/`, {
        headers: this.getHeaders(),
        timeout: 5000
      });

      const allUsers = Array.isArray(response.data) ? response.data : [];
      console.log(`Fetched ${allUsers.length} total users`);
      return { data: allUsers };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Create student profile after user creation
  async createStudentProfile(userId, profileData) {
    try {
      const payload = {
        user_id: userId,
        first_name: profileData.first_name || "Student",
        last_name: profileData.last_name || "User",
        batch_year: profileData.batch_year,
        department: profileData.department,
        extra_data: {}
      };

      const response = await axios.post(`${this.baseURL}/student-profiles/`, payload, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      console.log('Student profile created:', response.data);
      return { data: response.data, success: true };
    } catch (error) {
      console.error('Error creating student profile:', error);
      throw new Error(`Failed to create student profile: ${error.message}`);
    }
  },
  // Add this method to your apiClient object in AdminDashboard.jsx
  // Create teacher profile after user creation
  async createTeacherProfile(userId, profileData) {
    try {
      const payload = {
        user_id: userId,
        employee_id: profileData.employee_id,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        department: profileData.department,
        designation: profileData.designation,
        courses: profileData.courses || [],
        extra_data: profileData.extra_data || {}
      };

      const response = await axios.post(`${this.baseURL}/teacher-profiles/`, payload, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      console.log('Teacher profile created:', response.data);
      return { data: response.data, success: true };
    } catch (error) {
      console.error('Error creating teacher profile:', error);
      throw new Error(`Failed to create teacher profile: ${error.message}`);
    }
  },

  // Get student profile by user ID
  async getStudentProfile(userId) {
    try {
      console.log('Fetching student profile for user ID:', userId);
      const response = await axios.get(`${this.baseURL}/student-profiles/by-user/${userId}`, {
        headers: this.getHeaders(),
        timeout: 5000
      });
      console.log('Student profile fetched:', response.data);
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching student profile:', error);
      if (error.response?.status === 404) {
        return { data: null, notFound: true };
      }
      throw error;
    }
  },

  // Get teacher profile by user ID
  async getTeacherProfile(userId) {
    try {
      console.log('Fetching teacher profile for user ID:', userId);
      const response = await axios.get(`${this.baseURL}/teacher-profiles/by-user/${userId}`, {
        headers: this.getHeaders(),
        timeout: 5000
      });
      console.log('Teacher profile fetched:', response.data);
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching teacher profile:', error);
      if (error.response?.status === 404) {
        return { data: null, notFound: true };
      }
      throw error;
    }
  },

  // Add this to your apiClient object
  async updateStudentProfileByUserId(userId, profileData) {
    try {
      console.log('Updating student profile for user ID:', userId);
      const response = await axios.put(`${this.baseURL}/student-profiles/by-user/${userId}`, profileData, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      console.log('Student profile updated:', response.data);
      return { data: response.data };
    } catch (error) {
      console.error('Error updating student profile:', error);
      throw error;
    }
  },

  // Update teacher profile by user ID
  async updateTeacherProfileByUserId(userId, profileData) {
    try {
      console.log('Updating teacher profile for user ID:', userId);
      const response = await axios.put(`${this.baseURL}/teacher-profiles/by-user/${userId}`, profileData, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      console.log('Teacher profile updated:', response.data);
      return { data: response.data };
    } catch (error) {
      console.error('Error updating teacher profile:', error);
      throw error;
    }
  },

  async getAllCourses() {
    try {
      const response = await axios.get(`${this.baseURL}/courses/`, {
        headers: this.getHeaders(),
        timeout: 5000
      });
      console.log(`Fetched ${response.data?.length || 0} courses`);
      return { data: Array.isArray(response.data) ? response.data : [] };
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  },

  async createCourse(courseData) {
    try {
      const response = await axios.post(`${this.baseURL}/courses/`, courseData, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      console.log('Course created successfully:', response.data);
      return { data: response.data };
    } catch (error) {
      console.error('Error creating course:', error);
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.detail || 'Course with this code already exists');
      }
      throw new Error(`Failed to create course: ${error.message}`);
    }
  },

  async updateCourse(courseId, courseData) {
    try {
      const response = await axios.put(`${this.baseURL}/courses/${courseId}`, courseData, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      console.log('Course updated successfully:', response.data);
      return { data: response.data };
    } catch (error) {
      console.error('Error updating course:', error);
      throw new Error(`Failed to update course: ${error.message}`);
    }
  },

  async deleteCourse(courseId) {
    try {
      await axios.delete(`${this.baseURL}/courses/${courseId}`, {
        headers: this.getHeaders(),
        timeout: 5000
      });
      console.log('Course deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting course:', error);
      throw new Error(`Failed to delete course: ${error.message}`);
    }
  },

  async enrollStudentInCourse(courseId, studentId) {
    try {
      const response = await axios.post(`${this.baseURL}/courses/${courseId}/enroll`, null, {
        params: { student_id: studentId },
        headers: this.getHeaders(),
        timeout: 10000
      });
      console.log('Student enrolled successfully:', response.data);
      return { data: response.data };
    } catch (error) {
      console.error('Error enrolling student:', error);
      throw new Error(`Failed to enroll student: ${error.message}`);
    }
  },

  async getStudentCourses(studentId) {
    try {
      const response = await axios.get(`${this.baseURL}/students/${studentId}/courses`, {
        headers: this.getHeaders(),
        timeout: 5000
      });
      return { data: Array.isArray(response.data) ? response.data : [] };
    } catch (error) {
      console.error('Error fetching student courses:', error);
      throw error;
    }
  },

  async bulkEnrollStudents(courseId, studentIds) {
    const results = [];
    const errors = [];

    for (const studentId of studentIds) {
      try {
        const result = await this.enrollStudentInCourse(courseId, studentId);
        results.push({ studentId, success: true, data: result.data });
      } catch (error) {
        errors.push({ studentId, error: error.message });
      }
    }

    return { results, errors };
  }
};
// Updated Sample Excel file generation utility
const generateSampleExcelFile = () => {
  const sampleData = [
    {
      email: 'ch.sc.u4cse24004@ch.students.amrita.edu',
      password: 'Advaith_Sathish_Kumar',
      first_name: 'Advaith',
      last_name: 'Sathish Kumar',
      batch_year: 2028,
      department: 'cse_a'
    },
    {
      email: 'ch.sc.u4cse24028@ch.students.amrita.edu',
      password: 'Advaith_Balaji',
      first_name: 'Advaith',
      last_name: 'Balaji',
      batch_year: 2028,
      department: 'cse_a'
    },
    {
      email: 'ch.sc.u4cse24035@ch.students.amrita.edu',
      password: '24035',
      first_name: 'Sanjay',
      last_name: 'Lakshamanan',
      batch_year: 2028,
      department: 'cse_a'
    },
    {
      email: 'ch.en.u4cse24039@ch.students.amrita.edu',
      password: '24039',
      first_name: 'Sahil',
      last_name: 'Pareek',
      batch_year: 2028,
      department: 'cse_a'
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  // Auto-size columns for better readability
  const maxWidths = Object.keys(sampleData[0]).map(key => {
    const maxLength = Math.max(
      key.length,
      ...sampleData.map(row => String(row[key]).length)
    );
    return Math.max(maxLength, 15);
  });

  worksheet['!cols'] = maxWidths.map(width => ({ wch: width }));

  XLSX.writeFile(workbook, 'sample_students_with_profiles.xlsx');
};

// Course Creation Dialog Component (CORRECTED)
const CourseCreationDialog = ({ isOpen, onClose, onCourseCreated }) => {
  const [formData, setFormData] = useState({
    course_code: '',
    course_name: '',
    description: '',
    credits: 3 // Changed back to 3
  });
  const [isCreating, setIsCreating] = useState(false); // Remove isUpdating
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const errorTimeoutRef = useRef(null);
  const successTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  const setErrorWithAutoClose = (message) => {
    setError(message);
    errorTimeoutRef.current = setTimeout(() => setError(''), 4000);
  };

  const setSuccessWithAutoClose = (message) => {
    setSuccess(message);
    successTimeoutRef.current = setTimeout(() => {
      setSuccess('');
      onClose();
    }, 2000);
  };

  // Keep ONLY the create function, remove update function
  const handleCreateCourse = async () => {
    if (!formData.course_code || !formData.course_name || !formData.credits) {
      setErrorWithAutoClose('Please fill in all required fields');
      return;
    }

    if (formData.credits < 1 || formData.credits > 10) {
      setErrorWithAutoClose('Credits must be between 1 and 10');
      return;
    }

    setIsCreating(true);
    try {
      const result = await apiClient.createCourse(formData);
      setSuccessWithAutoClose('Course created successfully!');
      onCourseCreated(result.data);
      // Reset form after successful creation
      setFormData({ course_code: '', course_name: '', description: '', credits: 3 });
    } catch (error) {
      setErrorWithAutoClose(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle> {/* CHANGED from "Edit Course" */}
          <DialogDescription>
            Add a new course to the system {/* CHANGED from "Update course information" */}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="course_code">Course Code *</Label> {/* CHANGED ID */}
            <Input
              id="course_code"
              value={formData.course_code}
              onChange={(e) => handleInputChange('course_code', e.target.value.toUpperCase())}
              placeholder="CS101"
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="credits">Credits *</Label> {/* CHANGED ID */}
            <Input
              id="credits"
              type="number"
              value={formData.credits}
              onChange={(e) => handleInputChange('credits', parseInt(e.target.value))}
              min="1"
              max="10"
              disabled={isCreating}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="course_name">Course Name *</Label> {/* CHANGED ID */}
            <Input
              id="course_name"
              value={formData.course_name}
              onChange={(e) => handleInputChange('course_name', e.target.value)}
              placeholder="Introduction to Computer Science"
              disabled={isCreating}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="description">Description</Label> {/* CHANGED ID */}
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Course description (optional)"
              disabled={isCreating}
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleCreateCourse}
            disabled={isCreating}
            className="flex-1"
          >
            {isCreating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Course'
            )}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


const CourseEditDialog = ({ course, isOpen, onClose, onCourseUpdated }) => {
  const [formData, setFormData] = useState({
    course_code: '',
    course_name: '',
    description: '',
    credits: 3
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const errorTimeoutRef = useRef(null);
  const successTimeoutRef = useRef(null);

  useEffect(() => {
    if (course) {
      setFormData({
        course_code: course.course_code,
        course_name: course.course_name,
        description: course.description || '',
        credits: course.credits
      });
    }
  }, [course]);

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  const setErrorWithAutoClose = (message) => {
    setError(message);
    errorTimeoutRef.current = setTimeout(() => setError(''), 4000);
  };

  const setSuccessWithAutoClose = (message) => {
    setSuccess(message);
    successTimeoutRef.current = setTimeout(() => {
      setSuccess('');
      onClose();
    }, 2000);
  };

  const handleUpdateCourse = async () => {
    if (!formData.course_code || !formData.course_name || !formData.credits) {
      setErrorWithAutoClose('Please fill in all required fields');
      return;
    }

    if (formData.credits < 1 || formData.credits > 10) {
      setErrorWithAutoClose('Credits must be between 1 and 10');
      return;
    }

    setIsUpdating(true);
    try {
      const result = await apiClient.updateCourse(course.id, formData);
      setSuccessWithAutoClose('Course updated successfully!');
      onCourseUpdated(result.data);
    } catch (error) {
      setErrorWithAutoClose(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update course information
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit_course_code">Course Code *</Label>
            <Input
              id="edit_course_code"
              value={formData.course_code}
              onChange={(e) => handleInputChange('course_code', e.target.value.toUpperCase())}
              placeholder="CS101"
              disabled={isUpdating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_credits">Credits *</Label>
            <Input
              id="edit_credits"
              type="number"
              value={formData.credits}
              onChange={(e) => handleInputChange('credits', parseInt(e.target.value))}
              min="1"
              max="10"
              disabled={isUpdating}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="edit_course_name">Course Name *</Label>
            <Input
              id="edit_course_name"
              value={formData.course_name}
              onChange={(e) => handleInputChange('course_name', e.target.value)}
              placeholder="Introduction to Computer Science"
              disabled={isUpdating}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="edit_description">Description</Label>
            <Input
              id="edit_description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Course description (optional)"
              disabled={isUpdating}
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleUpdateCourse}
            disabled={isUpdating}
            className="flex-1"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Course'
            )}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


// Mass Enrollment Wizard Component
const MassEnrollmentWizard = ({ isOpen, onClose, courses, users, onEnrollmentComplete }) => {
  // ✅ ALL useState declarations at the top
  const [step, setStep] = useState(1);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [filters, setFilters] = useState({ department: 'all', batchYear: 'all' });
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [enrollmentStatus, setEnrollmentStatus] = useState({});
  const [studentProfiles, setStudentProfiles] = useState({});
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState(null);
  const [operation, setOperation] = useState('enroll');

  // ✅ Constants after state declarations
  const departmentOptions = [
    { value: 'cse_a', label: 'CSE A' },
    { value: 'cse_b', label: 'CSE B' },
    { value: 'cse_c', label: 'CSE C' },
    { value: 'ai', label: 'AI' },
    { value: 'rai', label: 'RAI' },
    { value: 'cys', label: 'CYS' },
    { value: 'cce', label: 'CCE' },
    { value: 'ece', label: 'ECE' }
  ];

  // ✅ Helper functions declared before they're used
  const isStudentEnrolled = (studentId) => {
    if (!selectedCourse) return false;
    return enrollmentStatus[studentId]?.some(enrollment => 
      enrollment.course_id === selectedCourse.id && enrollment.status === 'enrolled'
    );
  };

  // ✅ Now filteredStudents can safely use isStudentEnrolled
  const filteredStudents = users.filter(user => {
    if (user.role !== 'student') return false;
    const profile = studentProfiles[user.id];
    
    const departmentMatch = filters.department === 'all' || profile?.department === filters.department;
    const batchYearMatch = filters.batchYear === 'all' || profile?.batch_year?.toString() === filters.batchYear;
    
    const enrollmentMatch = operation === 'enroll' 
      ? !isStudentEnrolled(user.id)
      : isStudentEnrolled(user.id);
    
    return departmentMatch && batchYearMatch && enrollmentMatch;
  });

  // ✅ Get unique batch years (after studentProfiles is available)
  const availableBatchYears = [...new Set(
    Object.values(studentProfiles)
      .filter(profile => profile?.batch_year)
      .map(profile => profile.batch_year.toString())
  )].sort((a, b) => b - a);

  // ✅ useEffect hooks
  useEffect(() => {
    if (isOpen) {
      fetchStudentProfiles();
      setStep(1);
      setSelectedCourse(null);
      setSelectedStudents(new Set());
      setProcessingResults(null);
    }
  }, [isOpen]);

  // ✅ Function declarations
  const fetchStudentProfiles = async () => {
    const studentUsers = users.filter(user => user.role === 'student');
    if (studentUsers.length === 0) return;

    setLoadingProfiles(true);
    const profiles = {};
    const enrollmentMap = {};

    for (const student of studentUsers) {
      try {
        const profileResponse = await apiClient.getStudentProfile(student.id);
        if (profileResponse.data) {
          profiles[student.id] = profileResponse.data;
        }

        const coursesResponse = await apiClient.getStudentCourses(student.id);
        enrollmentMap[student.id] = coursesResponse.data || [];
      } catch (error) {
        console.error(`Failed to fetch data for ${student.email}:`, error);
        profiles[student.id] = null;
        enrollmentMap[student.id] = [];
      }
    }

    setStudentProfiles(profiles);
    setEnrollmentStatus(enrollmentMap);
    setLoadingProfiles(false);
  };

  const handleBulkOperation = async () => {
    if (!selectedCourse || selectedStudents.size === 0) return;

    setIsProcessing(true);
    const results = [];
    const errors = [];

    try {
      if (operation === 'enroll') {
        const result = await apiClient.bulkEnrollStudents(selectedCourse.id, Array.from(selectedStudents));
        setProcessingResults(result);
      } else {
        for (const studentId of selectedStudents) {
          try {
            const host_ip = import.meta.env.VITE_HOST_IP;
            const response = await fetch(`http://${host_ip}:8000/courses/${selectedCourse.id}/enrollments?student_id=${studentId}`, {
              method: 'DELETE',
              headers: {
                'accept': 'application/json', // ✅ Use 'accept' instead of 'Content-Type'
                // Remove 'Content-Type': 'application/json' for DELETE requests
              },
            });
  
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
  
            results.push({ studentId, success: true });
          } catch (error) {
            console.error(`Failed to unenroll student ${studentId}:`, error);
            errors.push({ 
              studentId, 
              error: error.message || 'Unenrollment failed' 
            });
          }
        }
        setProcessingResults({ results, errors });
      }
      onEnrollmentComplete();
      setStep(4);
    } catch (error) {
      console.error(`${operation} operation failed:`, error);
      setProcessingResults({ 
        results: [], 
        errors: [{ error: `Bulk ${operation} operation failed` }] 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStudentToggle = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
        <DialogTitle>
          Mass Student {operation === 'enroll' ? 'Enrollment' : 'Unenrollment'}
        </DialogTitle>
          <DialogDescription>
            Step {step} of 4: {
              step === 1 ? 'Select Course & Operation' :
              step === 2 ? 'Filter Students' :
              step === 3 ? `Confirm ${operation === 'enroll' ? 'Enrollment' : 'Unenrollment'}` :
              'Operation Results'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Course Selection */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Operation Selection */}
              <div className="space-y-3">
                <h3 className="font-medium">Select operation:</h3>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="enroll"
                      checked={operation === 'enroll'}
                      onChange={(e) => setOperation(e.target.value)}
                    />
                    <span>Enroll Students</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="unenroll"
                      checked={operation === 'unenroll'}
                      onChange={(e) => setOperation(e.target.value)}
                    />
                    <span>Unenroll Students</span>
                  </label>
                </div>
              </div>
            <h3 className="font-medium">Select a course for enrollment:</h3>
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {courses.map(course => (
                <div
                  key={course.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedCourse?.id === course.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedCourse(course)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{course.course_name}</h4>
                      <p className="text-sm text-gray-600">{course.course_code} • {course.credits} credits</p>
                      {course.description && (
                        <p className="text-sm text-gray-500 mt-1">{course.description}</p>
                      )}
                    </div>
                    {selectedCourse?.id === course.id && (
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button 
                onClick={() => setStep(2)} 
                disabled={!selectedCourse}
              >
                Next: Filter Students
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Student Filtering */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Selected Course:</p>
              <p className="text-sm text-blue-700">{selectedCourse.course_name} ({selectedCourse.course_code})</p>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Filter by Department:</Label>
                <Select value={filters.department} onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, department: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departmentOptions.map(dept => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Label>Filter by Batch Year:</Label>
                <Select value={filters.batchYear} onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, batchYear: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableBatchYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedStudents.size === filteredStudents.length ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-sm text-gray-600">
                  {selectedStudents.size} of {filteredStudents.length} students selected
                </span>
              </div>
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 w-12">Select</th>
                    <th className="text-left py-2 px-3">Name</th>
                    <th className="text-left py-2 px-3">Department</th>
                    <th className="text-left py-2 px-3">Batch</th>
                    <th className="text-left py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.map(student => {
                    const profile = studentProfiles[student.id];
                    const isEnrolled = isStudentEnrolled(student.id);
                    const isSelected = selectedStudents.has(student.id);

                    return (
                      <tr key={student.id} className={`hover:bg-gray-50 ${isEnrolled ? 'bg-gray-100' : ''}`}>
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleStudentToggle(student.id)}
                            disabled={operation === 'enroll' ? isStudentEnrolled(student.id) : false} // ✅ Only disable for enrollment
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="py-2 px-3 text-sm">
                          {profile ? `${profile.first_name} ${profile.last_name}` : 'Loading...'}
                        </td>
                        <td className="py-2 px-3 text-sm">
                          {profile?.department?.toUpperCase() || 'Loading...'}
                        </td>
                        <td className="py-2 px-3 text-sm">
                          {profile?.batch_year || 'Loading...'}
                        </td>
                        <td className="py-2 px-3">
                          {operation === 'enroll' ? (
                            isStudentEnrolled(student.id) ? (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                Already Enrolled
                              </span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                Available for Enrollment
                              </span>
                            )
                          ) : (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                              Currently Enrolled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button 
                  onClick={() => setStep(3)} 
                  disabled={selectedStudents.size === 0}
                >
                  Next: Confirm Enrollment ({selectedStudents.size})
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">
                {operation === 'enroll' ? 'Enrollment' : 'Unenrollment'} Summary
              </h3>
              <p className="text-sm text-blue-700">
                <strong>Course:</strong> {selectedCourse.course_name} ({selectedCourse.course_code})
              </p>
              <p className="text-sm text-blue-700">
                <strong>Students to {operation}:</strong> {selectedStudents.size}
              </p>
            </div>

            <div className={`${operation === 'enroll' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'} border rounded-lg p-3`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className={`h-4 w-4 ${operation === 'enroll' ? 'text-yellow-600' : 'text-red-600'} mt-0.5`} />
                <div>
                  <p className={`text-sm font-medium ${operation === 'enroll' ? 'text-yellow-800' : 'text-red-800'}`}>
                    Confirmation Required
                  </p>
                  <p className={`text-sm ${operation === 'enroll' ? 'text-yellow-700' : 'text-red-700'}`}>
                    You are about to {operation} {selectedStudents.size} students 
                    {operation === 'enroll' ? 'in' : 'from'} {selectedCourse.course_name}. 
                    This action cannot be easily undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button 
                  onClick={handleBulkOperation}
                  disabled={isProcessing}
                  className={operation === 'enroll' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {operation === 'enroll' ? 'Enrolling...' : 'Unenrolling...'}
                    </>
                  ) : (
                    `${operation === 'enroll' ? 'Enroll' : 'Unenroll'} ${selectedStudents.size} Students`
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && enrollmentResults && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Enrollment Complete!</h3>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800">Success Summary:</p>
              <p className="text-sm text-green-700">
                {enrollmentResults.results.length} students successfully enrolled
              </p>
              {enrollmentResults.errors.length > 0 && (
                <p className="text-sm text-red-700 mt-1">
                  {enrollmentResults.errors.length} enrollments failed
                </p>
              )}
            </div>

            {enrollmentResults.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800">Errors:</p>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {enrollmentResults.errors.map((error, index) => (
                    <p key={index} className="text-xs text-red-700">
                      Student ID {error.studentId}: {error.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Course Management Component
// Updated Course Management Component
const CourseManagement = ({ courses, onRefresh, onCourseDeleted, users }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(null);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [courseToEdit, setCourseToEdit] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);

  // Calculate enrollment counts from existing data
  const [enrollmentCounts, setEnrollmentCounts] = useState({});

  useEffect(() => {
    calculateEnrollmentCounts();
  }, [courses, users]);

  const calculateEnrollmentCounts = async () => {
    const counts = {};
    
    for (const course of courses) {
      let count = 0;
      // Calculate from student enrollment data
      for (const user of users.filter(u => u.role === 'student')) {
        try {
          const studentCourses = await apiClient.getStudentCourses(user.id);
          if (studentCourses.data.some(enrollment => 
            enrollment.course_id === course.id && enrollment.status === 'enrolled'
          )) {
            count++;
          }
        } catch (error) {
          // Ignore errors for individual students
        }
      }
      counts[course.id] = count;
    }
    setEnrollmentCounts(counts);
  };

  const filteredCourses = courses.filter(course =>
    course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.course_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateClick = () => {
    setOpenDialog('create');
  };

  const handleEditClick = (course) => {
    setCourseToEdit(course);
    setOpenDialog('edit');
  };

  const handleEnrollmentClick = () => {
    setOpenDialog('enrollment');
  };

  const closeAllDialogs = () => {
    setOpenDialog(null);
    setCourseToEdit(null);
  };

  const handleDeleteClick = (course) => {
    setCourseToDelete(course);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;

    setDeletingCourse(true);
    try {
      await apiClient.deleteCourse(courseToDelete.id);
      onCourseDeleted(courseToDelete.id);
      calculateEnrollmentCounts(); // Refresh counts after delete
    } catch (error) {
      console.error('Failed to delete course:', error);
    } finally {
      setDeletingCourse(false);
      setShowDeleteConfirm(false);
      setCourseToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Course Management
              </CardTitle>
              <CardDescription>Create and manage courses, handle enrollments</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                  onClick={handleEnrollmentClick}
                  className="bg-green-600 hover:bg-green-700"
                >
                <UserCheck className="h-4 w-4 mr-2" />
                Mass Enrollment
              </Button>
              <Button onClick={handleCreateClick}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Course
              </Button>
              <Button onClick={onRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Course Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Course Code</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Course Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Credits</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Enrolled Students</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCourses.length > 0 ? (
                    filteredCourses.map((course) => (
                      <tr key={course.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {course.course_code}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{course.course_name}</p>
                            {course.description && (
                              <p className="text-sm text-gray-500">{course.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-900">{course.credits}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {enrollmentCounts[course.id] || 0} students
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClick(course)}
                              className="h-8 w-8 p-0"
                              title="Edit Course"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(course)}
                              className="h-8 w-8 p-0"
                              title="Delete Course"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <GraduationCap className="h-8 w-8 text-gray-300" />
                          <p>No courses found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conditional Dialog Rendering - Only ONE can be open */}
      {openDialog === 'create' && (
        <CourseCreationDialog
          isOpen={true}
          onClose={closeAllDialogs}
          onCourseCreated={(course) => {
            onRefresh();
            closeAllDialogs();
          }}
        />
      )}

{openDialog === 'edit' && courseToEdit && (
        <CourseEditDialog
          course={courseToEdit}
          isOpen={true}
          onClose={closeAllDialogs}
          onCourseUpdated={(updatedCourse) => {
            onRefresh();
            closeAllDialogs();
          }}
        />
      )}

      {openDialog === 'enrollment' && (
        <MassEnrollmentWizard
          isOpen={true}
          onClose={closeAllDialogs}
          courses={courses}
          users={users}
          onEnrollmentComplete={() => {
            onRefresh();
            closeAllDialogs();
          }}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Delete Course
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All enrollments for this course will also be deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>Course to delete:</strong> {courseToDelete?.course_name} ({courseToDelete?.course_code})
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingCourse}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deletingCourse}
              >
                {deletingCourse ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Course
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};



// Delete Confirmation Dialog Component (unchanged)
const DeleteConfirmDialog = ({ user, isOpen, onClose, onConfirm, isDeleting }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirm Delete Student
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The student account will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              <strong>Student to delete:</strong> {user?.email}
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Student
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// NEW: Bulk Delete Confirmation Dialog
const BulkDeleteConfirmDialog = ({ role, isOpen, onClose, onConfirm, isDeleting, userCount }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirm Delete All {role}s
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. All {role} accounts will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              <strong>Users to delete:</strong> {userCount} {role}(s)
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All {role}s
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Delete Success/Error Dialog Component (unchanged)
const DeleteResultDialog = ({ isOpen, onClose, success, message, userEmail }) => {
  const statusTimeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Auto-close after 4 seconds
      statusTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 3000);
    }

    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${success ? 'text-green-600' : 'text-red-600'}`}>
            {success ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            {success ? 'Operation Successful' : 'Operation Failed'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className={success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
            {success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={success ? 'text-green-800' : 'text-red-800'}>
              {userEmail ? (
                success ? (
                  <>User <strong>{userEmail}</strong> has been successfully deleted.</>
                ) : (
                  <>Failed to delete user: {message}</>
                )
              ) : (
                message
              )}
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            This dialog will auto-close in 4 seconds
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Enhanced ManualTeacherCreation with Teacher Profile
const ManualTeacherCreation = ({ onTeacherCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    // User data
    email: '', 
    password: '',
    // Profile data
    employee_id: '',
    first_name: '',
    last_name: '',
    department: '',
    designation: '',
    courses: [],
    extra_data: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [availableCourses, setAvailableCourses] = useState([]); 
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Department options
  const departmentOptions = [
    { value: 'Computer Science', label: 'Computer Science' },
    { value: 'Mechanical', label: 'Mechanical' },
    { value: 'Electrical', label: 'Electrical' },
    { value: 'AI', label: 'AI' },
  ];

  // Ref to store timeout IDs for cleanup
  const errorTimeoutRef = useRef(null);
  const successTimeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadCourses();
    }
  }, [isOpen]);

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const response = await apiClient.getAllCourses();
      setAvailableCourses(response.data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
      setErrorWithAutoClose('Failed to load courses');
    } finally {
      setLoadingCourses(false);
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear existing messages and timeouts when user starts typing
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setError('');
    setSuccess('');
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleCourseSelection = (courseId) => {
    setFormData(prev => {
      const currentCourses = prev.courses || [];
      const isSelected = currentCourses.includes(courseId);
      
      if (isSelected) {
        // Remove course
        return {
          ...prev,
          courses: currentCourses.filter(id => id !== courseId)
        };
      } else {
        // Add course
        return {
          ...prev,
          courses: [...currentCourses, courseId]
        };
      }
    });
  };

  const validateForm = () => {
    const errors = {};
    
    // Basic user validation
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.password.trim()) errors.password = 'Password is required';
    
    // Profile validation
    if (!formData.employee_id.trim()) errors.employee_id = 'Employee ID is required';
    if (!formData.first_name.trim()) errors.first_name = 'First name is required';
    if (!formData.last_name.trim()) errors.last_name = 'Last name is required';
    if (!formData.department) errors.department = 'Department is required';
    if (!formData.designation.trim()) errors.designation = 'Designation is required';
    
    // Validate extra_data if provided
    if (formData.extra_data.trim()) {
      try {
        JSON.parse(formData.extra_data);
      } catch (e) {
        errors.extra_data = 'Invalid JSON format';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const setErrorWithAutoClose = (message) => {
    setError(message);
    errorTimeoutRef.current = setTimeout(() => {
      setError('');
    }, 4000);
  };

  const setSuccessWithAutoClose = (message) => {
    setSuccess(message);
    successTimeoutRef.current = setTimeout(() => {
      setSuccess('');
      setIsOpen(false);
    }, 3000);
  };

  const handleCreateTeacher = async () => {
    if (!validateForm()) {
      setErrorWithAutoClose('Please fill in all required fields');
      return;
    }

    if (!formData.email.includes('@')) {
      setErrorWithAutoClose('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 3) {
      setErrorWithAutoClose('Password must be at least 3 characters long');
      return;
    }

    setIsCreating(true);
    try {
      // Prepare user data with profile data
      const userData = {
        email: formData.email,
        password: formData.password,
        profileData: {
          employee_id: formData.employee_id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          department: formData.department,
          designation: formData.designation,
          courses: formData.courses,
          extra_data: formData.extra_data ? JSON.parse(formData.extra_data) : {}
        }
      };

      const result = await apiClient.createUser(userData, "teacher");
      setSuccessWithAutoClose(`Teacher ${formData.email} with profile created successfully!`);
      onTeacherCreated(result.data);
      
      // Reset form
      setFormData({ 
        email: '', 
        password: '',
        employee_id: '',
        first_name: '',
        last_name: '',
        department: '',
        designation: '',
        courses: [],
        extra_data: ''
      });
      setValidationErrors({});

    } catch (error) {
      setErrorWithAutoClose(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setFormData({ 
      email: '', 
      password: '',
      employee_id: '',
      first_name: '',
      last_name: '',
      department: '',
      designation: '',
      courses: [],
      extra_data: ''
    });
    setError('');
    setSuccess('');
    setValidationErrors({});
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
          <GraduationCap className="h-4 w-4 mr-2" />
          Add Teacher
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Teacher</DialogTitle>
          <DialogDescription>
            Create a teacher account with profile information and course assignments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Account Information Section - Keep as is */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teacher-email">Email Address *</Label>
                <Input
                  id="teacher-email"
                  type="email"
                  placeholder="teacher@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={isCreating}
                  className={validationErrors.email ? 'border-red-500' : ''}
                />
                {validationErrors.email && (
                  <p className="text-red-500 text-sm">{validationErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="teacher-password">Password *</Label>
                <Input
                  id="teacher-password"
                  type="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={isCreating}
                  className={validationErrors.password ? 'border-red-500' : ''}
                />
                {validationErrors.password && (
                  <p className="text-red-500 text-sm">{validationErrors.password}</p>
                )}
              </div>
            </div>
          </div>

          {/* Profile Information Section */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Profile Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee-id">Employee ID *</Label>
                <Input
                  id="employee-id"
                  type="text"
                  placeholder="e.g., EMP001"
                  value={formData.employee_id}
                  onChange={(e) => handleInputChange('employee_id', e.target.value)}
                  disabled={isCreating}
                  className={validationErrors.employee_id ? 'border-red-500' : ''}
                />
                {validationErrors.employee_id && (
                  <p className="text-red-500 text-sm">{validationErrors.employee_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <select
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  disabled={isCreating}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.department ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Department</option>
                  {departmentOptions.map(dept => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
                {validationErrors.department && (
                  <p className="text-red-500 text-sm">{validationErrors.department}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="first-name">First Name *</Label>
                <Input
                  id="first-name"
                  type="text"
                  placeholder="First name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  disabled={isCreating}
                  className={validationErrors.first_name ? 'border-red-500' : ''}
                />
                {validationErrors.first_name && (
                  <p className="text-red-500 text-sm">{validationErrors.first_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name *</Label>
                <Input
                  id="last-name"
                  type="text"
                  placeholder="Last name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  disabled={isCreating}
                  className={validationErrors.last_name ? 'border-red-500' : ''}
                />
                {validationErrors.last_name && (
                  <p className="text-red-500 text-sm">{validationErrors.last_name}</p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="designation">Designation *</Label>
                <Input
                  id="designation"
                  type="text"
                  placeholder="e.g., Assistant Professor, Associate Professor, etc."
                  value={formData.designation}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  disabled={isCreating}
                  className={validationErrors.designation ? 'border-red-500' : ''}
                />
                {validationErrors.designation && (
                  <p className="text-red-500 text-sm">{validationErrors.designation}</p>
                )}
              </div>
            </div>
          </div>

          {/* ADD: Course Assignment Section */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Course Assignments</h3>
            {loadingCourses ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading courses...
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select Courses (Optional)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {availableCourses.length > 0 ? (
                    availableCourses.map(course => (
                      <div key={course.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`course-${course.id}`}
                          checked={formData.courses.includes(course.id)}
                          onChange={() => handleCourseSelection(course.id)}
                          disabled={isCreating}
                          className="h-4 w-4"
                        />
                        <label 
                          htmlFor={`course-${course.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          <span className="font-medium">{course.course_code}</span> - {course.course_name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No courses available</p>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Selected {formData.courses.length} course(s)
                </p>
              </div>
            )}
          </div>

          {/* Extra Data Section - Keep as is */}
          <div>
            <div className="space-y-2">
              <Label htmlFor="extra-data">Extra Data (Optional)</Label>
              <textarea
                id="extra-data"
                rows="3"
                placeholder='{"phone": "123-456-7890", "office": "Room 101"}'
                value={formData.extra_data}
                onChange={(e) => handleInputChange('extra_data', e.target.value)}
                disabled={isCreating}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.extra_data ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <p className="text-sm text-gray-500">Enter valid JSON format for additional information</p>
              {validationErrors.extra_data && (
                <p className="text-red-500 text-sm">{validationErrors.extra_data}</p>
              )}
            </div>
          </div>

          {/* Error and Success messages - Keep as is */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Action buttons - Keep as is */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleCreateTeacher}
              disabled={isCreating}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Create Teacher & Profile
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Enhanced Manual Student Creation with Profile - Complete error handling and timeout management
const ManualStudentCreation = ({ onStudentCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    batch_year: new Date().getFullYear(),
    department: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Ref to store timeout IDs for cleanup
  const errorTimeoutRef = useRef(null);
  const successTimeoutRef = useRef(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const departmentOptions = [
    { value: 'cse_a', label: 'CSE A' },
    { value: 'cse_b', label: 'CSE B' },
    { value: 'cse_c', label: 'CSE C' },
    { value: 'ai', label: 'AI' },
    { value: 'rai', label: 'RAI' },
    { value: 'cys', label: 'CYS' },
    { value: 'cce', label: 'CCE' },
    { value: 'ece', label: 'ECE' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear existing messages and timeouts when user starts typing
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setError('');
    setSuccess('');
  };

  const setErrorWithAutoClose = (message) => {
    setError(message);
    // Auto-close error after 4 seconds
    errorTimeoutRef.current = setTimeout(() => {
      setError('');
    }, 4000);
  };

  const setSuccessWithAutoClose = (message) => {
    setSuccess(message);
    // Auto-close success after 3 seconds
    successTimeoutRef.current = setTimeout(() => {
      setSuccess('');
      setIsOpen(false);
    }, 3000);
  };

  const handleCreateStudent = async () => {
    // Comprehensive validation
    if (!formData.email || !formData.password || !formData.first_name ||
      !formData.last_name || !formData.department) {
      setErrorWithAutoClose('Please fill in all required fields');
      return;
    }

    if (!formData.email.includes('@')) {
      setErrorWithAutoClose('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 3) {
      setErrorWithAutoClose('Password must be at least 3 characters long');
      return;
    }

    if (formData.first_name.trim().length < 2) {
      setErrorWithAutoClose('First name must be at least 2 characters long');
      return;
    }

    if (formData.batch_year < 2020 || formData.batch_year > 2030) {
      setErrorWithAutoClose('Please enter a valid batch year between 2020 and 2030');
      return;
    }

    setIsCreating(true);
    try {
      const studentData = {
        email: formData.email,
        password: formData.password,
        profileData: {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          batch_year: formData.batch_year,
          department: formData.department
        }
      };

      const result = await apiClient.createUser(studentData, "student");
      setSuccessWithAutoClose(`Student ${formData.email} created successfully!`);
      onStudentCreated(result.data);

      // Reset form
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        batch_year: new Date().getFullYear(),
        department: ''
      });

    } catch (error) {
      setErrorWithAutoClose(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <UserPlus className="h-4 w-4 mr-2" />
          Create Student with Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Student with Profile</DialogTitle>
          <DialogDescription>
            Create a new student account with complete profile information
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Account Information */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="student@example.com"
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Enter password"
              disabled={isCreating}
            />
          </div>

          {/* Personal Information */}
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              placeholder="Enter first name"
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name *</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              placeholder="Enter last name"
              disabled={isCreating}
            />
          </div>

          {/* Academic Information */}
          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Select
              value={formData.department}
              onValueChange={(value) => handleInputChange('department', value)}
              disabled={isCreating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map(dept => (
                  <SelectItem key={dept.value} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch_year">Batch Year *</Label>
            <Input
              id="batch_year"
              type="number"
              value={formData.batch_year}
              onChange={(e) => handleInputChange('batch_year', parseInt(e.target.value))}
              min="2020"
              max="2030"
              disabled={isCreating}
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleCreateStudent}
            disabled={isCreating}
            className="flex-1"
          >
            {isCreating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating Student...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Student
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Excel Upload Component - WITH DUPLICATE CHECK (unchanged)
const ExcelUpload = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);

  // Refs for timeout management
  const statusTimeoutRef = useRef(null);
  const resultsTimeoutRef = useRef(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      if (resultsTimeoutRef.current) clearTimeout(resultsTimeoutRef.current);
    };
  }, []);

  // Auto-close message helpers
  const setStatusWithAutoClose = (status, closeDelay = 5000) => {
    // Clear existing timeout
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    setUploadStatus(status);
    // Set new timeout
    statusTimeoutRef.current = setTimeout(() => {
      setUploadStatus(null);
    }, closeDelay);
  };

  const setResultsWithAutoClose = (results, closeDelay = 8000) => {
    // Clear existing timeout
    if (resultsTimeoutRef.current) {
      clearTimeout(resultsTimeoutRef.current);
    }
    setUploadResults(results);
    // Auto-close results after delay
    resultsTimeoutRef.current = setTimeout(() => {
      setUploadResults(null);
    }, closeDelay);
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      setFile(selectedFile);
      // Clear any existing messages
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      if (resultsTimeoutRef.current) clearTimeout(resultsTimeoutRef.current);
      setUploadStatus(null);
      setUploadProgress(0);
      setUploadResults(null);
    } else {
      // Auto-close file error after 4 seconds
      setStatusWithAutoClose({
        type: 'error',
        message: 'Please select a valid .xlsx file'
      }, 4000);
    }
  };

  const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            reject(new Error('Excel file is empty'));
            return;
          }

          // Updated required columns to include profile fields
          const requiredColumns = ['email', 'password', 'first_name', 'last_name', 'batch_year', 'department'];
          const firstRow = jsonData[0];
          const hasRequiredColumns = requiredColumns.every(col =>
            Object.keys(firstRow).some(key => key.toLowerCase().includes(col.toLowerCase()))
          );

          if (!hasRequiredColumns) {
            reject(new Error('Excel file must contain all required columns: email, password, first_name, last_name, batch_year, department. Download the sample file for reference.'));
            return;
          }

          // Department validation mapping
          const validDepartments = {
            'cse_a': 'cse_a', 'cse a': 'cse_a', 'csea': 'cse_a',
            'cse_b': 'cse_b', 'cse b': 'cse_b', 'cseb': 'cse_b',
            'cse_c': 'cse_c', 'cse c': 'cse_c', 'csec': 'cse_c',
            'ai': 'ai', 'artificial intelligence': 'ai',
            'rai': 'rai', 'robotics and ai': 'rai',
            'cys': 'cys', 'cyber security': 'cys', 'cybersecurity': 'cys',
            'cce': 'cce', 'computer communication engineering': 'cce',
            'ece': 'ece', 'electronics and communication': 'ece'
          };

          const users = jsonData.map((row, index) => {
            try {
              const emailKey = Object.keys(row).find(key => key.toLowerCase().includes('email'));
              const passwordKey = Object.keys(row).find(key => key.toLowerCase().includes('password'));
              const firstNameKey = Object.keys(row).find(key => key.toLowerCase().includes('first_name') || key.toLowerCase().includes('firstname'));
              const lastNameKey = Object.keys(row).find(key => key.toLowerCase().includes('last_name') || key.toLowerCase().includes('lastname'));
              const batchYearKey = Object.keys(row).find(key => key.toLowerCase().includes('batch_year') || key.toLowerCase().includes('batchyear'));
              const departmentKey = Object.keys(row).find(key => key.toLowerCase().includes('department'));

              const email = String(row[emailKey] || '').trim();
              const password = String(row[passwordKey] || '').trim();
              const first_name = String(row[firstNameKey] || '').trim();
              const last_name = String(row[lastNameKey] || '').trim();
              const batch_year = parseInt(String(row[batchYearKey] || '').trim());
              const department_raw = String(row[departmentKey] || '').trim().toLowerCase();

              // Validate department
              const department = validDepartments[department_raw];
              if (!department) {
                throw new Error(`Row ${index + 1}: Invalid department "${row[departmentKey]}". Valid options: CSE_A, CSE_B, CSE_C, AI, RAI, CYS, CCE, ECE`);
              }

              // Validate required fields
              if (!email || !password || !first_name || !last_name) {
                throw new Error(`Row ${index + 1}: Missing required fields (email, password, first_name, last_name)`);
              }

              // Validate batch_year
              if (isNaN(batch_year) || batch_year < 2020 || batch_year > 3000) {
                throw new Error(`Row ${index + 1}: Invalid batch_year "${row[batchYearKey]}". Must be between 2020-2030`);
              }

              return {
                email,
                password,
                profileData: {
                  first_name,
                  last_name,
                  batch_year,
                  department
                }
              };
            } catch (error) {
              throw new Error(`Row ${index + 1}: ${error.message}`);
            }
          }).filter(user => user.email && user.password);

          if (users.length === 0) {
            reject(new Error('No valid student records found. Please ensure all required fields are filled correctly.'));
            return;
          }

          console.log('Parsed student users from Excel:', users);
          resolve(users);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);

    // Clear any existing timeouts
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    if (resultsTimeoutRef.current) clearTimeout(resultsTimeoutRef.current);

    setUploadStatus({ type: 'info', message: 'Processing Excel file...' });

    try {
      const users = await parseExcelFile(file);
      console.log(`Parsed ${users.length} student users from Excel file`);
      setUploadStatus({ type: 'info', message: 'Creating student users with profiles in database...' });

      const results = [];
      const errors = [];

      for (let i = 0; i < users.length; i++) {
        try {
          setUploadStatus({
            type: 'info',
            message: `Creating student ${i + 1}/${users.length}: ${users[i].email}`
          });

          // Create user with profile data
          const result = await apiClient.createUser(users[i], "student");
          results.push(result.data);
          setUploadProgress(Math.round(((i + 1) / users.length) * 100));
        } catch (error) {
          console.error(`Failed to create student ${users[i].email}:`, error.message);
          errors.push({ user: users[i], error: error.message });
        }
      }

      const successCount = results.length;
      const errorCount = errors.length;

      // Set results with auto-close (longer delay if there are errors)
      if (errorCount > 0) {
        setResultsWithAutoClose({
          success: successCount,
          errors: errorCount,
          errorDetails: errors
        }, 10000); // 10 seconds for errors
      }

      if (successCount > 0) {
        // Success message with auto-close after 5 seconds
        setStatusWithAutoClose({
          type: 'success',
          message: `Successfully created ${successCount} student users${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
        }, 5000);
        onUploadComplete(results);
      } else {
        // Error message with auto-close after 8 seconds
        setStatusWithAutoClose({
          type: 'error',
          message: 'Failed to create any student users. Check details below.'
        }, 8000);
      }

      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      // Parse error with auto-close after 6 seconds
      setStatusWithAutoClose({
        type: 'error',
        message: error.message
      }, 6000);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Bulk Student Creation with Profiles
        </CardTitle>
        <CardDescription>
          Upload an Excel file to create multiple student accounts with complete profiles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sample File Download */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Need a template?</p>
              <p className="text-xs text-blue-700">Download sample Excel file with correct format</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateSampleExcelFile}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Sample
            </Button>
          </div>
        </div>

        {/* File Upload */}
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="flex-1"
            disabled={isUploading}
          />
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="min-w-[120px]"
          >
            {isUploading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {uploadProgress > 0 ? `${uploadProgress}%` : 'Processing'}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload to Database
              </>
            )}
          </Button>
        </div>

        {/* Progress Bar */}
        {isUploading && uploadProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}

        {/* Status Messages - AUTO-CLOSE ENABLED */}
        {uploadStatus && (
          <Alert className={
            uploadStatus.type === 'error' ? 'border-red-500 bg-red-50' :
              uploadStatus.type === 'success' ? 'border-green-500 bg-green-50' :
                'border-blue-500 bg-blue-50'
          }>
            {uploadStatus.type === 'error' ? (
              <XCircle className="h-4 w-4 text-red-600" />
            ) : uploadStatus.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Clock className="h-4 w-4 text-blue-600" />
            )}
            <AlertDescription className={
              uploadStatus.type === 'error' ? 'text-red-800' :
                uploadStatus.type === 'success' ? 'text-green-800' :
                  'text-blue-800'
            }>
              {uploadStatus.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Results Details - AUTO-CLOSE ENABLED */}
        {uploadResults && uploadResults.errors > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900">Upload Issues Found</p>
                <div className="mt-2 space-y-1">
                  {uploadResults.errorDetails.slice(0, 5).map((error, index) => (
                    <p key={index} className="text-xs text-orange-800">
                      {error.user.email}: {error.error}
                    </p>
                  ))}
                  {uploadResults.errorDetails.length > 5 && (
                    <p className="text-xs text-orange-700 italic">
                      ...and {uploadResults.errorDetails.length - 5} more errors
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Requirements */}
        <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
          <p className="font-medium mb-2">Excel Format Requirements:</p>
          <ul className="space-y-1">
            <li>• File must be .xlsx format</li>
            <li>• Required columns: <strong>email, password, first_name, last_name, batch_year, department</strong></li>
            <li>• Email format: user@domain.com</li>
            <li>• Batch Year: 2020-2030</li>
            <li>• Department: CSE_A, CSE_B, CSE_C, AI, RAI, CYS, CCE, ECE</li>
            <li>• All users will be created with role: "student" and complete profiles</li>
            <li>• <strong>Duplicate emails will be automatically detected and skipped</strong></li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

const EditTeacherModal = ({ isOpen, onClose, onTeacherUpdated, teacherData }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '', // Optional - only update if provided
    employee_id: '',
    first_name: '',
    last_name: '',
    department: '',
    designation: '',
    courses: [],
    extra_data: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const departmentOptions = [
    { value: 'Computer Science', label: 'Computer Science' },
    { value: 'Mechanical', label: 'Mechanical' },
    { value: 'Electrical', label: 'Electrical' },
    { value: 'AI', label: 'AI' },
  ];

  const errorTimeoutRef = useRef(null);
  const successTimeoutRef = useRef(null);

  // Load courses when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCourses();
    }
  }, [isOpen]);

  // Populate form when teacherData changes
  useEffect(() => {
    if (teacherData) {
      setFormData({
        email: teacherData.email || '',
        password: '', // Always empty for security
        employee_id: teacherData.employee_id || '',
        first_name: teacherData.first_name || '',
        last_name: teacherData.last_name || '',
        department: teacherData.department || '',
        designation: teacherData.designation || '',
        courses: teacherData.courses || [],
        extra_data: teacherData.extra_data || ''
      });
    }
  }, [teacherData]);

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const response = await apiClient.getAllCourses();
      setAvailableCourses(response.data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
      setErrorWithAutoClose('Failed to load courses');
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setError('');
    setSuccess('');
    
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleCourseSelection = (courseId) => {
  setFormData(prev => {
    const currentCourses = prev.courses || [];
    const isSelected = currentCourses.includes(courseId);
    
    let newCourses;
    if (isSelected) {
      // Remove course
      newCourses = currentCourses.filter(id => id !== courseId);
    } else {
      // Add course
      newCourses = [...currentCourses, courseId];
    }
    
    console.log('Course selection changed:', {
      courseId,
      isSelected,
      oldCourses: currentCourses,
      newCourses: newCourses
    }); // ✅ Debug output
    
    return {
      ...prev,
      courses: newCourses
    };
  });
};

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.employee_id.trim()) errors.employee_id = 'Employee ID is required';
    if (!formData.first_name.trim()) errors.first_name = 'First name is required';
    if (!formData.last_name.trim()) errors.last_name = 'Last name is required';
    if (!formData.department) errors.department = 'Department is required';
    if (!formData.designation.trim()) errors.designation = 'Designation is required';
    
    // Password is optional for updates - only validate if provided
    if (formData.password && formData.password.length < 3) {
      errors.password = 'Password must be at least 3 characters long';
    }
    
    if (formData.extra_data.trim()) {
      try {
        JSON.parse(formData.extra_data);
      } catch (e) {
        errors.extra_data = 'Invalid JSON format';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const setErrorWithAutoClose = (message) => {
    setError(message);
    errorTimeoutRef.current = setTimeout(() => {
      setError('');
    }, 4000);
  };

  const setSuccessWithAutoClose = (message) => {
    setSuccess(message);
    successTimeoutRef.current = setTimeout(() => {
      setSuccess('');
      onClose();
    }, 3000);
  };

  const handleUpdateTeacher = async () => {
    if (!validateForm()) {
      setErrorWithAutoClose('Please fill in all required fields');
      return;
    }

    if (!formData.email.includes('@')) {
      setErrorWithAutoClose('Please enter a valid email address');
      return;
    }

    setIsUpdating(true);
    try {
      // Update user data (email and password if provided)
      const userUpdateData = {
        email: formData.email,
        ...(formData.password && { password: formData.password }) // Only include password if provided
      };

      await axios.put(`${apiClient.baseURL}/users/${teacherData.id}`, userUpdateData, {
        headers: apiClient.getHeaders(),
        timeout: 10000
      });

      // Update teacher profile
      const profileData = {
        employee_id: formData.employee_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        department: formData.department,
        designation: formData.designation,
        courses: formData.courses,
        extra_data: formData.extra_data ? JSON.parse(formData.extra_data) : {}
      };

      await apiClient.updateTeacherProfileByUserId(teacherData.id, profileData);

      setSuccessWithAutoClose(`Teacher ${formData.email} updated successfully!`);
      onTeacherUpdated();

    } catch (error) {
      setErrorWithAutoClose(error.response?.data?.detail || error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setFormData({
      email: '',
      password: '',
      employee_id: '',
      first_name: '',
      last_name: '',
      department: '',
      designation: '',
      courses: [],
      extra_data: ''
    });
    setError('');
    setSuccess('');
    setValidationErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Teacher</DialogTitle>
          <DialogDescription>
            Update teacher account and profile information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Account Information Section */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-teacher-email">Email Address *</Label>
                <Input
                  id="edit-teacher-email"
                  type="email"
                  placeholder="teacher@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={isUpdating}
                  className={validationErrors.email ? 'border-red-500' : ''}
                />
                {validationErrors.email && (
                  <p className="text-red-500 text-sm">{validationErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-teacher-password">New Password (Optional)</Label>
                <Input
                  id="edit-teacher-password"
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={isUpdating}
                  className={validationErrors.password ? 'border-red-500' : ''}
                />
                {validationErrors.password && (
                  <p className="text-red-500 text-sm">{validationErrors.password}</p>
                )}
                <p className="text-xs text-gray-500">Leave blank to keep current password</p>
              </div>
            </div>
          </div>

          {/* Profile Information Section */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Profile Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-employee-id">Employee ID *</Label>
                <Input
                  id="edit-employee-id"
                  type="text"
                  placeholder="e.g., EMP001"
                  value={formData.employee_id}
                  onChange={(e) => handleInputChange('employee_id', e.target.value)}
                  disabled={isUpdating}
                  className={validationErrors.employee_id ? 'border-red-500' : ''}
                />
                {validationErrors.employee_id && (
                  <p className="text-red-500 text-sm">{validationErrors.employee_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-department">Department *</Label>
                <select
                  id="edit-department"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  disabled={isUpdating}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.department ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Department</option>
                  {departmentOptions.map(dept => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
                {validationErrors.department && (
                  <p className="text-red-500 text-sm">{validationErrors.department}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-first-name">First Name *</Label>
                <Input
                  id="edit-first-name"
                  type="text"
                  placeholder="First name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  disabled={isUpdating}
                  className={validationErrors.first_name ? 'border-red-500' : ''}
                />
                {validationErrors.first_name && (
                  <p className="text-red-500 text-sm">{validationErrors.first_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-last-name">Last Name *</Label>
                <Input
                  id="edit-last-name"
                  type="text"
                  placeholder="Last name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  disabled={isUpdating}
                  className={validationErrors.last_name ? 'border-red-500' : ''}
                />
                {validationErrors.last_name && (
                  <p className="text-red-500 text-sm">{validationErrors.last_name}</p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="edit-designation">Designation *</Label>
                <Input
                  id="edit-designation"
                  type="text"
                  placeholder="e.g., Assistant Professor, Associate Professor, etc."
                  value={formData.designation}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  disabled={isUpdating}
                  className={validationErrors.designation ? 'border-red-500' : ''}
                />
                {validationErrors.designation && (
                  <p className="text-red-500 text-sm">{validationErrors.designation}</p>
                )}
              </div>
            </div>
          </div>

          {/* Course Assignment Section */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Course Assignments</h3>
            {loadingCourses ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading courses...
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select Courses (Optional)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {availableCourses.length > 0 ? (
                    availableCourses.map(course => (
                      <div key={course.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`edit-course-${course.id}`}
                          checked={formData.courses.includes(course.id)}
                          onChange={() => handleCourseSelection(course.id)}
                          disabled={isUpdating}
                          className="h-4 w-4"
                        />
                        <label 
                          htmlFor={`edit-course-${course.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          <span className="font-medium">{course.course_code}</span> - {course.course_name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No courses available</p>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Selected {formData.courses.length} course(s)
                </p>
              </div>
            )}
          </div>

          {/* Extra Data Section */}
          <div>
            <div className="space-y-2">
              <Label htmlFor="edit-extra-data">Extra Data (Optional)</Label>
              <textarea
                id="edit-extra-data"
                rows="3"
                placeholder='{"phone": "123-456-7890", "office": "Room 101"}'
                value={formData.extra_data}
                onChange={(e) => handleInputChange('extra_data', e.target.value)}
                disabled={isUpdating}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.extra_data ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <p className="text-sm text-gray-500">Enter valid JSON format for additional information</p>
              {validationErrors.extra_data && (
                <p className="text-red-500 text-sm">{validationErrors.extra_data}</p>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleUpdateTeacher}
              disabled={isUpdating}
              className="flex-1"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4 mr-2" />
                  Update Teacher
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUpdating}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Add this new component before the UserManagement component
const StudentProfileEditDialog = ({ user, studentProfile, isOpen, onClose, onProfileUpdated }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    batch_year: new Date().getFullYear(),
    department: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const errorTimeoutRef = useRef(null);
  const successTimeoutRef = useRef(null);

  const departmentOptions = [
    { value: 'cse_a', label: 'CSE A' },
    { value: 'cse_b', label: 'CSE B' },
    { value: 'cse_c', label: 'CSE C' },
    { value: 'ai', label: 'AI' },
    { value: 'rai', label: 'RAI' },
    { value: 'cys', label: 'CYS' },
    { value: 'cce', label: 'CCE' },
    { value: 'ece', label: 'ECE' }
  ];

  useEffect(() => {
    if (studentProfile) {
      setFormData({
        first_name: studentProfile.first_name || '',
        last_name: studentProfile.last_name || '',
        batch_year: studentProfile.batch_year || new Date().getFullYear(),
        department: studentProfile.department || ''
      });
    }
  }, [studentProfile]);

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  const setErrorWithAutoClose = (message) => {
    setError(message);
    errorTimeoutRef.current = setTimeout(() => setError(''), 4000);
  };

  const setSuccessWithAutoClose = (message) => {
    setSuccess(message);
    successTimeoutRef.current = setTimeout(() => {
      setSuccess('');
      onClose();
    }, 2000);
  };

  const handleUpdateProfile = async () => {
    if (!formData.first_name || !formData.last_name || !formData.department) {
      setErrorWithAutoClose('Please fill in all required fields');
      return;
    }

    if (formData.batch_year < 2020 || formData.batch_year > 2030) {
      setErrorWithAutoClose('Please enter a valid batch year between 2020 and 2030');
      return;
    }

    setIsUpdating(true);
    try {
      await apiClient.updateStudentProfileByUserId(user.id, formData);
      setSuccessWithAutoClose('Student profile updated successfully!');
      onProfileUpdated();
    } catch (error) {
      setErrorWithAutoClose(error.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Student Profile</DialogTitle>
          <DialogDescription>
            Update student profile information for {user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-first-name">First Name *</Label>
            <Input
              id="edit-first-name"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              placeholder="Enter first name"
              disabled={isUpdating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-last-name">Last Name *</Label>
            <Input
              id="edit-last-name"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              placeholder="Enter last name"
              disabled={isUpdating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-department">Department *</Label>
            <Select
              value={formData.department}
              onValueChange={(value) => handleInputChange('department', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map(dept => (
                  <SelectItem key={dept.value} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-batch-year">Batch Year *</Label>
            <Input
              id="edit-batch-year"
              type="number"
              value={formData.batch_year}
              onChange={(e) => handleInputChange('batch_year', parseInt(e.target.value))}
              min="2020"
              max="2030"
              disabled={isUpdating}
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleUpdateProfile}
            disabled={isUpdating}
            className="flex-1"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Profile
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isUpdating}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// NEW: Enhanced User Management with Tabs
// Enhanced User Management with Student Profiles and Filtering - COMPLETE CORRECT VERSION
const UserManagement = ({ users, onRefresh, onUserDeleted, renderTeacherTable }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteResult, setDeleteResult] = useState(null);
  const [showDeleteResult, setShowDeleteResult] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleteRole, setBulkDeleteRole] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // New states for view and edit dialogs
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);

  // Student profile and filtering states - FIXED: Use 'all' instead of empty strings
  const [studentProfiles, setStudentProfiles] = useState({});
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedBatchYear, setSelectedBatchYear] = useState('all');

  const usersPerPage = 8;

  const departmentOptions = [
    { value: 'cse_a', label: 'CSE A' },
    { value: 'cse_b', label: 'CSE B' },
    { value: 'cse_c', label: 'CSE C' },
    { value: 'ai', label: 'AI' },
    { value: 'rai', label: 'RAI' },
    { value: 'cys', label: 'CYS' },
    { value: 'cce', label: 'CCE' },
    { value: 'ece', label: 'ECE' }
  ];

  // Fetch student profiles for all students
  const fetchStudentProfiles = useCallback(async () => {
    const studentUsers = users.filter(user => user.role === 'student');
    if (studentUsers.length === 0) return;

    setLoadingProfiles(true);
    const profiles = {};

    for (const student of studentUsers) {
      try {
        const profileResponse = await apiClient.getStudentProfile(student.id);
        if (profileResponse.data) {
          profiles[student.id] = profileResponse.data;
        }
      } catch (error) {
        console.error(`Failed to fetch profile for ${student.email}:`, error);
        profiles[student.id] = null;
      }
    }

    setStudentProfiles(profiles);
    setLoadingProfiles(false);
  }, [users]);

  // Fetch profiles when users change
  useEffect(() => {
    fetchStudentProfiles();
  }, [fetchStudentProfiles]);

  // Enhanced filtering for students - FIXED: Handle 'all' values properly
  const studentUsers = users.filter(user => {
    if (user.role !== 'student') return false;

    const profile = studentProfiles[user.id];

    // Search term filter (email, first name, last name)
    const searchMatch = !searchTerm ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()));

    // Department filter - FIXED: Handle 'all' value
    const departmentMatch = selectedDepartment === 'all' || profile?.department === selectedDepartment;

    // Batch year filter - FIXED: Handle 'all' value
    const batchYearMatch = selectedBatchYear === 'all' || profile?.batch_year?.toString() === selectedBatchYear;

    return searchMatch && departmentMatch && batchYearMatch;
  });

  const teacherUsers = users.filter(user =>
    user.role === 'teacher' &&
    user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get unique batch years for filter
  const availableBatchYears = [...new Set(
    Object.values(studentProfiles)
      .filter(profile => profile?.batch_year)
      .map(profile => profile.batch_year.toString())
  )].sort((a, b) => b - a);

  const handleUserClick = async (userId, userRole) => {
    try {
      const userResponse = await apiClient.getUser(userId);
      setSelectedUser(userResponse.data);

      if (userRole === 'student') {
        try {
          const profileResponse = await apiClient.getStudentProfile(userId);
          setSelectedUser(prev => ({
            ...prev,
            studentProfile: profileResponse.data
          }));
        } catch (error) {
          console.error('Failed to fetch student profile:', error);
          setSelectedUser(prev => ({
            ...prev,
            studentProfile: null,
            profileError: 'Profile not found or not created yet'
          }));
        }
      }
      setShowViewDialog(true);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    }
  };

  const handleEditClick = async (userId) => {
    try {
      const userResponse = await apiClient.getUser(userId);
      const profileResponse = await apiClient.getStudentProfile(userId);

      setSelectedUserForEdit({
        ...userResponse.data,
        studentProfile: profileResponse.data
      });
      setShowEditDialog(true);
    } catch (error) {
      console.error('Failed to fetch user/profile for editing:', error);
    }
  };

  const handleProfileUpdated = () => {
    setShowEditDialog(false);
    setSelectedUserForEdit(null);
    onRefresh();
    fetchStudentProfiles(); // Refresh profiles
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setDeletingUser(true);
    try {
      await apiClient.deleteUser(userToDelete.id);
      onUserDeleted(userToDelete.id);

      setDeleteResult({
        success: true,
        message: `${userToDelete.role} deleted successfully`,
        userEmail: userToDelete.email
      });
      setShowDeleteResult(true);

    } catch (error) {
      setDeleteResult({
        success: false,
        message: error.message,
        userEmail: userToDelete.email
      });
      setShowDeleteResult(true);
    } finally {
      setDeletingUser(false);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const handleDeleteResultClose = () => {
    setShowDeleteResult(false);
    setDeleteResult(null);
  };

  const handleBulkDeleteClick = (role) => {
    setBulkDeleteRole(role);
    setShowBulkDeleteConfirm(true);
  };

  const handleBulkDeleteConfirm = async () => {
    setBulkDeleting(true);
    try {
      const result = await apiClient.deleteAllUsersByRole(bulkDeleteRole);
      onRefresh();
      fetchStudentProfiles(); // Refresh profiles

      setDeleteResult({
        success: true,
        message: `Successfully deleted ${result.deletedCount} out of ${result.totalCount} ${bulkDeleteRole}(s)${result.errors.length > 0 ? `. ${result.errors.length} errors occurred.` : ''}`
      });
      setShowDeleteResult(true);

    } catch (error) {
      setDeleteResult({
        success: false,
        message: error.message
      });
      setShowDeleteResult(true);
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
      setBulkDeleteRole('');
    }
  };

  const renderStudentTable = (userList) => {
    const totalPages = Math.ceil(userList.length / usersPerPage);
    const startIndex = (currentPage - 1) * usersPerPage;
    const paginatedUsers = userList.slice(startIndex, startIndex + usersPerPage);

    return (
      <div className="space-y-4">
        {/* Enhanced Filter Controls - FIXED: Use 'all' for SelectItem values */}
        <div className="bg-white border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="min-w-[150px]">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departmentOptions.map(dept => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[130px]">
              <Select value={selectedBatchYear} onValueChange={setSelectedBatchYear}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableBatchYears.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {userList.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleBulkDeleteClick('student')}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{userList.length} student{userList.length !== 1 ? 's' : ''} found</span>
            {loadingProfiles && (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading profiles...</span>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Student Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">First Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Last Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Department</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Batch Year</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => {
                  const profile = studentProfiles[user.id];
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {profile?.first_name || (
                          <span className="text-gray-400 italic">Loading...</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {profile?.last_name || (
                          <span className="text-gray-400 italic">Loading...</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {profile?.department ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 uppercase">
                            {profile.department.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Loading...</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {profile?.batch_year || (
                          <span className="text-gray-400 italic">Loading...</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 break-all">
                        {user.email}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUserClick(user.id, 'student')}
                            className="h-8 w-8 p-0"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(user.id)}
                            className="h-8 w-8 p-0"
                            title="Edit Profile"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(user)}
                            className="h-8 w-8 p-0"
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-gray-300" />
                      <p>No students found</p>
                      {(searchTerm || selectedDepartment !== 'all' || selectedBatchYear !== 'all') && (
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-sm">Try adjusting your filters:</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchTerm('');
                              setSelectedDepartment('all');
                              setSelectedBatchYear('all');
                            }}
                          >
                            Clear Filters
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(startIndex + usersPerPage, userList.length)} of {userList.length} students
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="px-3 py-1 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>View and manage student and teacher accounts</CardDescription>
            </div>
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="students" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="students" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Students ({studentUsers.length})
              </TabsTrigger>
              <TabsTrigger value="teachers" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Teachers ({teacherUsers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="mt-4">
              {renderStudentTable(studentUsers)}
            </TabsContent>

            <TabsContent value="teachers" className="mt-4">
              {renderTeacherTable(teacherUsers)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedUser?.role?.charAt(0).toUpperCase() + selectedUser?.role?.slice(1)} Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected {selectedUser?.role}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              {/* User Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">User Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium">ID:</Label>
                    <p className="text-sm text-gray-600 font-mono">{selectedUser.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email:</Label>
                    <p className="text-sm text-gray-600">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Role:</Label>
                    <p className="text-sm text-gray-600">{selectedUser.role}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status:</Label>
                    <p className="text-sm text-gray-600">
                      {(selectedUser.is_active !== false) ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created At:</Label>
                    <p className="text-sm text-gray-600">
                      {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Updated At:</Label>
                    <p className="text-sm text-gray-600">
                      {selectedUser.updated_at ? new Date(selectedUser.updated_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Student Profile Information */}
              {selectedUser.role === 'student' && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Student Profile
                  </h3>
                  {selectedUser.studentProfile ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium">First Name:</Label>
                        <p className="text-sm text-gray-600">{selectedUser.studentProfile.first_name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Last Name:</Label>
                        <p className="text-sm text-gray-600">{selectedUser.studentProfile.last_name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Department:</Label>
                        <p className="text-sm text-gray-600 uppercase">{selectedUser.studentProfile.department}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Batch Year:</Label>
                        <p className="text-sm text-gray-600">{selectedUser.studentProfile.batch_year}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Profile Created:</Label>
                        <p className="text-sm text-gray-600">
                          {selectedUser.studentProfile.created_at ? new Date(selectedUser.studentProfile.created_at).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ) : selectedUser.profileError ? (
                    <div className="text-center py-4">
                      <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                      <p className="text-sm text-orange-600">{selectedUser.profileError}</p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
                      <p className="text-sm text-gray-500">Loading profile...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Extra Data */}
              {selectedUser.extra_data && Object.keys(selectedUser.extra_data).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Extra Data</h3>
                  <pre className="text-xs text-gray-600 bg-white p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedUser.extra_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {selectedUserForEdit && (
        <StudentProfileEditDialog
          user={selectedUserForEdit}
          studentProfile={selectedUserForEdit.studentProfile}
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setSelectedUserForEdit(null);
          }}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        user={userToDelete}
        isOpen={showDeleteConfirm}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isDeleting={deletingUser}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <BulkDeleteConfirmDialog
        role={bulkDeleteRole}
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDeleteConfirm}
        isDeleting={bulkDeleting}
        userCount={bulkDeleteRole === 'student' ? studentUsers.length : teacherUsers.length}
      />

      {/* Delete Result Dialog */}
      <DeleteResultDialog
        isOpen={showDeleteResult}
        onClose={handleDeleteResultClose}
        success={deleteResult?.success}
        message={deleteResult?.message}
        userEmail={deleteResult?.userEmail}
      />
    </>
  );
};


// Main Admin Dashboard - UPDATED WITH TEACHER SUPPORT
const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalStudents: 0, activeStudents: 0, inactiveStudents: 0, totalTeachers: 0, totalCourses: 0 });

  // Add these to your existing state variables
  const [showEditTeacherModal, setShowEditTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [usersPerPage] = useState(10); // or whatever number you want

  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleteRole, setBulkDeleteRole] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteResult, setBulkDeleteResult] = useState(null);

  const [selectedUser, setSelectedUser] = useState(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  const handleUserClick = async (userId, role) => {
    try {
      console.log('User clicked:', userId, 'Role:', role);

      // Find the user in your current users array
      const user = users.find(u => u.id === userId);
      
      if (!user) {
        console.error('User not found:', userId);
        alert('User not found');
        return;
      }

      // Fetch fresh user details from the backend
      const userResponse = await apiClient.getUser(userId);
      const userData = userResponse.data;

      // If it's a student, try to fetch their profile
      if (role === 'student') {
        try {
          const studentProfileResponse = await apiClient.getStudentProfile(userId);
          userData.studentProfile = studentProfileResponse.data;
        } catch (error) {
          console.log('Student profile not found or error:', error);
          userData.profileError = 'Profile not found or error loading profile';
        }
      }

      // If it's a teacher, try to fetch their profile
      if (role === 'teacher') {
        try {
          const teacherProfileResponse = await apiClient.getTeacherProfile(userId);
          userData.teacherProfile = teacherProfileResponse.data;
        } catch (error) {
          console.log('Teacher profile not found or error:', error);
          userData.profileError = 'Profile not found or error loading profile';
        }
      }

      // Set the selected user and show the view dialog
      setSelectedUser(userData);
      setShowViewDialog(true);

    } catch (error) {
      console.error('Error fetching user details:', error);
      alert('Failed to load user details');
    }
  };

  const deleteUser = async (userId) => {
    try {
      await apiClient.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      // Refresh stats after deletion
      refreshUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const handleDeleteClick = (user) => {
    console.log('Delete user clicked:', user);
    // Add your delete logic here - probably show a confirmation dialog
    // For now, you can use existing delete logic or create a new one
    
    // Example: Simple confirm and delete
    if (window.confirm(`Are you sure you want to delete user ${user.email}?`)) {
      // Call your delete API
      deleteUser(user.id);
    }
  };

  const handleBulkDeleteClick = (role) => {
    const usersToDelete = users.filter(u => u.role === role);
    
    if (usersToDelete.length === 0) {
      alert(`No ${role}s found to delete.`);
      return;
    }

    // Show confirmation dialog
    setBulkDeleteRole(role);
    setShowBulkDeleteConfirm(true);
  };

  // Confirm bulk delete function
  const handleBulkDeleteConfirm = async () => {
    setBulkDeleting(true);
    setShowBulkDeleteConfirm(false);
    
    const usersToDelete = users.filter(u => u.role === bulkDeleteRole);
    const successfulDeletes = [];
    const failedDeletes = [];

    try {
      // Delete users one by one
      for (const user of usersToDelete) {
        try {
          await apiClient.deleteUser(user.id);
          successfulDeletes.push(user);
        } catch (error) {
          console.error(`Failed to delete user ${user.email}:`, error);
          failedDeletes.push({ user, error: error.message });
        }
      }

      // Update local state by removing successfully deleted users
      if (successfulDeletes.length > 0) {
        const deletedIds = successfulDeletes.map(u => u.id);
        setUsers(prev => prev.filter(u => !deletedIds.includes(u.id)));
      }

      // Show result
      setBulkDeleteResult({
        success: failedDeletes.length === 0,
        total: usersToDelete.length,
        successful: successfulDeletes.length,
        failed: failedDeletes.length,
        failedUsers: failedDeletes,
        role: bulkDeleteRole
      });

      // Refresh stats
      await refreshUsers();

    } catch (error) {
      console.error('Bulk delete error:', error);
      setBulkDeleteResult({
        success: false,
        message: 'An unexpected error occurred during bulk deletion.',
        role: bulkDeleteRole
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  // Cancel bulk delete
  const handleBulkDeleteCancel = () => {
    setShowBulkDeleteConfirm(false);
    setBulkDeleteRole('');
  };

  // Close bulk delete result dialog
  const handleBulkDeleteResultClose = () => {
    setBulkDeleteResult(null);
    setBulkDeleteRole('');
  };

  const handleEditTeacher = async (teacherId) => {
      try {
        // Fetch user details
        const userResponse = await apiClient.getUser(teacherId);
        const userData = userResponse.data;

        let profileData = {};
        let hasProfile = false;
        
        try {
          // Try to fetch teacher profile
          const profileResponse = await apiClient.getTeacherProfile(teacherId);
          if (profileResponse.data && !profileResponse.data.error) {
            profileData = profileResponse.data;
            hasProfile = true;
          }
        } catch (error) {
          console.log('Teacher profile not found, using empty profile');
        }

        // Combine user and profile data for editing
        const teacherData = {
          id: userData.id,
          email: userData.email,
          employee_id: profileData.employee_id || '',
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          department: profileData.department || '',
          designation: profileData.designation || '',
          courses: profileData.courses || [],
          extra_data: JSON.stringify(profileData.extra_data || {}, null, 2),
          hasProfile: hasProfile
        };

        setEditingTeacher(teacherData);
        setShowEditTeacherModal(true);
      } catch (error) {
        console.error('Error preparing teacher edit:', error);
        alert('Failed to prepare teacher for editing');
      }
    };

    const renderTeacherTable = (userList) => {
    const totalPages = Math.ceil(userList.length / usersPerPage);
    const startIndex = (currentPage - 1) * usersPerPage;
    const paginatedUsers = userList.slice(startIndex, startIndex + usersPerPage);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-700">
              {userList.length} teacher(s) found
            </p>
            {userList.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleBulkDeleteClick('teacher')}
                className="ml-4"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Teachers
              </Button>
            )}
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search teachers by email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-3 font-medium text-gray-900 text-sm w-20">ID</th>
                <th className="text-left py-3 px-3 font-medium text-gray-900 text-sm">Email</th>
                <th className="text-left py-3 px-3 font-medium text-gray-900 text-sm w-20">Role</th>
                <th className="text-left py-3 px-3 font-medium text-gray-900 text-sm w-20">Status</th>
                <th className="text-left py-3 px-3 font-medium text-gray-900 text-sm w-32">Created At</th>
                <th className="text-left py-3 px-3 font-medium text-gray-900 text-sm w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs text-gray-900">{user.id.substring(0, 8)}...</td>
                    <td className="py-3 px-3 text-sm text-gray-900 break-all">{user.email}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        teacher
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${(user.is_active !== false) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {(user.is_active !== false) ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-900">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUserClick(user.id, 'teacher')}
                          className="h-8 w-8 p-0"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* ✅ This will now work because handleEditTeacher is in scope */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTeacher(user.id)}
                          className="h-8 w-8 p-0"
                          title="Edit Teacher"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
                          className="h-8 w-8 p-0"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <GraduationCap className="h-8 w-8 text-gray-300" />
                      <p>No teachers found</p>
                      {searchTerm && (
                        <p className="text-sm">Try adjusting your search terms</p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(startIndex + usersPerPage, userList.length)} of {userList.length} teachers
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="px-3 py-1 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const refreshUsers = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await apiClient.getAllUsers();
      if (response.data) {
        const userData = Array.isArray(response.data) ? response.data : [];
        setUsers(userData);

        const students = userData.filter(u => u.role === 'student');
        const teachers = userData.filter(u => u.role === 'teacher');
        const activeStudents = students.filter(u => u.is_active !== false).length;
        const inactiveStudents = students.length - activeStudents;

        setStats({
          totalStudents: students.length,
          activeStudents,
          inactiveStudents,
          totalTeachers: teachers.length
        });

        const response_courses = await apiClient.getAllCourses();
        if (response_courses.data) {
          setCourses(response_courses.data);
          setStats(prev => ({
            ...prev,
            totalCourses: response_courses.data.length
          }));
        }
      }
    } catch (error) {
      console.error('Failed to refresh users:', error);
    }
    setIsRefreshing(false);
  }, []);

  const refreshCourses = useCallback(async () => {
    try {
      const response = await apiClient.getAllCourses();
      if (response.data) {
        setCourses(response.data);
        setStats(prev => ({
          ...prev,
          totalCourses: response.data.length
        }));
      }
    } catch (error) {
      console.error('Failed to refresh courses:', error);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshUsers(), refreshCourses()]);
  }, [refreshUsers, refreshCourses]);

  useEffect(() => {
    refreshUsers();
    const interval = setInterval(refreshUsers, 30000);
    return () => clearInterval(interval);
  }, [refreshUsers]);

  const handleUploadComplete = (newUsers) => {
    setUsers(prevUsers => [...prevUsers, ...newUsers]);
    refreshUsers(); // Refresh to get updated stats
  };

  const handleUserCreated = (newUser) => {
    setUsers(prevUsers => [...prevUsers, newUser]);
    refreshUsers(); // Refresh to get updated stats
  };

  const handleTeacherCreated = (newTeacher) => {
    setUsers(prevUsers => [...prevUsers, newTeacher]);
    refreshUsers(); // Refresh to get updated stats
  };

  const handleUserDeleted = (userId) => {
    setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
    refreshUsers(); // Refresh to get updated stats
  };

  const handleCourseDeleted = (courseId) => {
    setCourses(prevCourses => prevCourses.filter(c => c.id !== courseId));
    setStats(prev => ({
      ...prev,
      totalCourses: prev.totalCourses - 1
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header - unchanged */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage students, teachers, courses and system settings</p>
          </div>
          <LogoutButton />
        </div>

        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.role?.charAt(0).toUpperCase() + selectedUser?.role?.slice(1)} Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about the selected {selectedUser?.role}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              {/* User Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">User Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium">ID:</Label>
                    <p className="text-sm text-gray-600 font-mono">{selectedUser.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email:</Label>
                    <p className="text-sm text-gray-600">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Role:</Label>
                    <p className="text-sm text-gray-600">{selectedUser.role}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status:</Label>
                    <p className="text-sm text-gray-600">
                      {selectedUser.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created At:</Label>
                    <p className="text-sm text-gray-600">
                      {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Updated At:</Label>
                    <p className="text-sm text-gray-600">
                      {selectedUser.updated_at ? new Date(selectedUser.updated_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Student Profile Information */}
              {selectedUser.role === 'student' && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Student Profile
                  </h3>
                  {selectedUser.studentProfile ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium">First Name:</Label>
                        <p className="text-sm text-gray-600">{selectedUser.studentProfile.first_name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Last Name:</Label>
                        <p className="text-sm text-gray-600">{selectedUser.studentProfile.last_name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Department:</Label>
                        <p className="text-sm text-gray-600 uppercase">{selectedUser.studentProfile.department}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Batch Year:</Label>
                        <p className="text-sm text-gray-600">{selectedUser.studentProfile.batch_year}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                      <p className="text-sm text-orange-600">
                        {selectedUser.profileError || 'No profile found'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Teacher Profile Information */}
              {selectedUser.role === 'teacher' && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Teacher Profile
                  </h3>
                  {selectedUser.teacherProfile ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium">Employee ID:</Label>
                        <p className="text-sm text-gray-600">{selectedUser.teacherProfile.employee_id}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">First Name:</Label>
                        <p className="text-sm text-gray-600">{selectedUser.teacherProfile.first_name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Last Name:</Label>
                        <p className="text-sm text-gray-600">{selectedUser.teacherProfile.last_name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Department:</Label>
                        <p className="text-sm text-gray-600">{selectedUser.teacherProfile.department}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Designation:</Label>
                        <p className="text-sm text-gray-600">{selectedUser.teacherProfile.designation}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Courses:</Label>
                        <p className="text-sm text-gray-600">
                          {selectedUser.teacherProfile.courses?.length ? 
                            selectedUser.teacherProfile.courses.join(', ') : 'No courses assigned'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                      <p className="text-sm text-orange-600">
                        {selectedUser.profileError || 'No profile found'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Extra Data */}
              {selectedUser.extra_data && Object.keys(selectedUser.extra_data).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Extra Data</h3>
                  <pre className="text-xs text-gray-600 bg-white p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedUser.extra_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

        {/* Updated Stats Cards - Add Course Card */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalStudents}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Students</p>
                  <p className="text-3xl font-bold text-green-600">{stats.activeStudents}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Teachers</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.totalTeachers}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          {/* New Course Stats Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Courses</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.totalCourses}</p>
                </div>
                <FileSpreadsheet className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inactive Students</p>
                  <p className="text-3xl font-bold text-gray-600">{stats.inactiveStudents}</p>
                </div>
                <XCircle className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Updated Main Content Grid - Add Course Management Tab */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Course Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="space-y-6">
                <ExcelUpload onUploadComplete={handleUploadComplete} />
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      User Creation Options
                    </CardTitle>
                    <CardDescription>
                      Create individual accounts or generate users automatically
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ManualTeacherCreation onTeacherCreated={handleTeacherCreated} />
                    <EditTeacherModal
                      isOpen={showEditTeacherModal}
                      onClose={() => {
                        setShowEditTeacherModal(false);
                        setEditingTeacher(null);
                      }}
                      onTeacherUpdated={() => {
                        refreshUsers();
                        setShowEditTeacherModal(false);
                        setEditingTeacher(null);
                      }}
                      teacherData={editingTeacher}
                    />
                    <ManualStudentCreation onStudentCreated={handleUserCreated} />
                  </CardContent>
                </Card>
              </div>

              <div className="xl:col-span-2">
                <UserManagement
                  users={users}
                  onRefresh={refreshUsers}
                  onUserDeleted={handleUserDeleted}
                  renderTeacherTable={renderTeacherTable}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="courses" className="mt-6">
            <CourseManagement
              courses={courses}
              users={users}
              onRefresh={refreshCourses}
              onCourseDeleted={handleCourseDeleted}
            />
          </TabsContent>
        </Tabs>

        {/* Footer - unchanged */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>Last Refresh: {new Date().toLocaleTimeString()}</span>
                <span>System Status: Connected</span>
              </div>
              <div className="flex items-center gap-2">
                {isRefreshing && <RefreshCw className="h-4 w-4 animate-spin" />}
                <span className={isRefreshing ? 'text-blue-600' : 'text-green-600'}>
                  {isRefreshing ? 'Refreshing...' : 'Online'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Bulk Delete
            </DialogTitle>
            <DialogDescription>
              This action will permanently delete all {bulkDeleteRole}s from the system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-red-800 mb-1">Warning: This action cannot be undone</h3>
                  <p className="text-sm text-red-700">
                    You are about to delete <strong>{users.filter(u => u.role === bulkDeleteRole).length}</strong> {bulkDeleteRole}(s).
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Users to be deleted:</Label>
              <div className="max-h-32 overflow-y-auto border rounded p-2 bg-gray-50">
                {users.filter(u => u.role === bulkDeleteRole).map(user => (
                  <div key={user.id} className="text-sm py-1">
                    • {user.email}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="destructive"
              onClick={handleBulkDeleteConfirm}
              disabled={bulkDeleting}
              className="flex-1"
            >
              {bulkDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Yes, Delete All {bulkDeleteRole}s
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleBulkDeleteCancel}
              disabled={bulkDeleting}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Result Dialog */}
      {bulkDeleteResult && (
        <Dialog open={!!bulkDeleteResult} onOpenChange={handleBulkDeleteResultClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className={`flex items-center gap-2 ${bulkDeleteResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {bulkDeleteResult.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                Bulk Delete {bulkDeleteResult.success ? 'Completed' : 'Results'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              {bulkDeleteResult.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800">
                    Successfully deleted <strong>{bulkDeleteResult.successful}</strong> {bulkDeleteResult.role}(s).
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 mb-2">Bulk delete partially completed:</p>
                    <ul className="text-sm space-y-1">
                      <li>• <span className="text-green-600">Successfully deleted: {bulkDeleteResult.successful}</span></li>
                      <li>• <span className="text-red-600">Failed to delete: {bulkDeleteResult.failed}</span></li>
                    </ul>
                  </div>

                  {bulkDeleteResult.failedUsers?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <Label className="text-sm font-medium text-red-800 mb-2 block">Failed deletions:</Label>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {bulkDeleteResult.failedUsers.map((failed, index) => (
                          <div key={index} className="text-sm text-red-700">
                            • {failed.user.email}: {failed.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleBulkDeleteResultClose}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </div>
  );
};

export default AdminDashboard;
