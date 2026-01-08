import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../api/apiClient';

const DEPARTMENTS = [
  { value: 'cse_a', label: 'CSE A' },
  { value: 'cse_b', label: 'CSE B' },
  { value: 'cse_c', label: 'CSE C' },
  { value: 'rai', label: 'RAI' },
  { value: 'ai', label: 'AI' },
  { value: 'cys', label: 'CYS' },
  { value: 'cce', label: 'CCE' },
  { value: 'ece', label: 'ECE' }
];

const BATCH_YEARS = Array.from({ length: 11 }, (_, i) => {
  const year = 2020 + i;
  return { value: year, label: year.toString() };
});

const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done'
};

const TaskCard = ({ task, onEdit, onDelete }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'task',
    item: { id: task.id, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`bg-white border rounded-lg p-3 cursor-move transition-opacity ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm">{task.title}</h4>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(task)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(task.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {task.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {task.description}
        </p>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <Badge variant="secondary" className="text-xs">
            {DEPARTMENTS.find(d => d.value === task.department)?.label}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {task.batch_year}
          </Badge>
        </div>
        
        {task.due_date && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 mr-1" />
            {format(new Date(task.due_date), 'MMM dd')}
          </div>
        )}
      </div>
    </div>
  );
};

const TaskColumn = ({ title, status, tasks, onTaskDrop, onEdit, onDelete }) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'task',
    drop: (item) => {
      if (item.status !== status) {
        onTaskDrop(item.id, status);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const getStatusColor = () => {
    switch (status) {
      case TASK_STATUS.TODO:
        return 'border-red-200 bg-red-50';
      case TASK_STATUS.IN_PROGRESS:
        return 'border-yellow-200 bg-yellow-50';
      case TASK_STATUS.DONE:
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div
      ref={drop}
      className={`min-h-[400px] p-4 rounded-lg border-2 transition-colors ${
        isOver ? 'border-primary bg-primary/5' : getStatusColor()
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">{title}</h3>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>
      
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};

const KanbanBoard = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedBatchYear, setSelectedBatchYear] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState({
    title: '',
    description: '',
    status: TASK_STATUS.TODO,
    department: '',
    batch_year: '',
    priority: 0,
    due_date: ''
  });

  useEffect(() => {
    fetchTasks();
  }, [selectedDepartment, selectedBatchYear]);

  const fetchTasks = async () => {
    try {
      const params = {};
      if (selectedDepartment && selectedDepartment !== 'all') params.department = selectedDepartment;
      if (selectedBatchYear && selectedBatchYear !== 'all') params.batch_year = selectedBatchYear;
      
      const response = await api.get('/kanban-tasks', { params });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error("Failed to load tasks");
    }
  };

  const handleSaveTask = async () => {
    try {
      const url = `/kanban-tasks${selectedTask ? `/${selectedTask.id}` : ''}`;
      const method = selectedTask ? 'put' : 'post';
  
      const taskData = {
        ...editingTask,
        due_date: editingTask.due_date ? new Date(editingTask.due_date + 'T23:59:59').toISOString() : null,
        batch_year: parseInt(editingTask.batch_year)
      };
  
      const response = await api[method](url, taskData);
      const savedTask = response.data;
      
      if (selectedTask) {
        setTasks(prev => 
          prev.map(task => 
            task.id === selectedTask.id ? savedTask : task
          )
        );
      } else {
        setTasks(prev => [...prev, savedTask]);
      }
  
      setIsDialogOpen(false);
      toast.success(`Task ${selectedTask ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error("Failed to save task");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/kanban-tasks/${taskId}`);
      setTasks(prev => prev.filter(task => task.id !== taskId));
      toast.success("Task deleted successfully");
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error("Failed to delete task");
    }
  };

  const handleTaskDrop = async (taskId, newStatus) => {
    try {
      const response = await api.put(`/kanban-tasks/${taskId}`, { status: newStatus });
      const updatedTask = response.data;
      setTasks(prev => 
        prev.map(task => 
          task.id === taskId ? updatedTask : task
        )
      );
      
      toast.success("Task status updated successfully");
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error("Failed to update task status");
    }
  };

const openCreateDialog = () => {
  setEditingTask({
    title: '',
    description: '',
    status: TASK_STATUS.TODO,
    department: selectedDepartment || '',
    batch_year: selectedBatchYear || '',
    priority: 0,
    due_date: ''
  });
  setSelectedTask(null);
  setIsDialogOpen(true);
};

const openEditDialog = (task) => {
  setEditingTask({
    title: task.title,
    description: task.description || '',
    status: task.status,
    department: task.department,
    batch_year: task.batch_year.toString(),
    priority: task.priority || 0,
    due_date: task.due_date ? task.due_date.split('T')[0] : ''
  });
  setSelectedTask(task);
  setIsDialogOpen(true);
};

const todoTasks = tasks.filter(task => task.status === TASK_STATUS.TODO);
const inProgressTasks = tasks.filter(task => task.status === TASK_STATUS.IN_PROGRESS);
const doneTasks = tasks.filter(task => task.status === TASK_STATUS.DONE);

return (
  <DndProvider backend={HTML5Backend}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
        <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by Department" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {DEPARTMENTS.map((dept) => (
            <SelectItem key={dept.value} value={dept.value}>
                {dept.label}
            </SelectItem>
            ))}
        </SelectContent>
        </Select>

        <Select value={selectedBatchYear} onValueChange={setSelectedBatchYear}>
        <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by Batch Year" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {BATCH_YEARS.map((year) => (
            <SelectItem key={year.value} value={year.value.toString()}>
                {year.label}
            </SelectItem>
            ))}
        </SelectContent>
        </Select>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedTask ? 'Edit' : 'Create'} Task
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editingTask.title}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter task title"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editingTask.description}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Department</label>
                  <Select
                    value={editingTask.department}
                    onValueChange={(value) => setEditingTask(prev => ({ ...prev, department: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept.value} value={dept.value}>
                          {dept.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Batch Year</label>
                  <Select
                    value={editingTask.batch_year}
                    onValueChange={(value) => setEditingTask(prev => ({ ...prev, batch_year: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {BATCH_YEARS.map((year) => (
                        <SelectItem key={year.value} value={year.value.toString()}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Input
                    type="number"
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Due Date</label>
                  <Input
                    type="date"
                    value={editingTask.due_date}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleSaveTask}>
                  {selectedTask ? 'Update' : 'Create'} Task
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TaskColumn
          title="To Do"
          status={TASK_STATUS.TODO}
          tasks={todoTasks}
          onTaskDrop={handleTaskDrop}
          onEdit={openEditDialog}
          onDelete={handleDeleteTask}
        />
        
        <TaskColumn
          title="In Progress"
          status={TASK_STATUS.IN_PROGRESS}
          tasks={inProgressTasks}
          onTaskDrop={handleTaskDrop}
          onEdit={openEditDialog}
          onDelete={handleDeleteTask}
        />
        
        <TaskColumn
          title="Done"
          status={TASK_STATUS.DONE}
          tasks={doneTasks}
          onTaskDrop={handleTaskDrop}
          onEdit={openEditDialog}
          onDelete={handleDeleteTask}
        />
      </div>
    </div>
  </DndProvider>
);
};

export default KanbanBoard;

