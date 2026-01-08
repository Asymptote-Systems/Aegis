import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';
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

const ClassScheduler = () => {
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    department: '',
    batch_year: '',
    location: ''
  });

  useEffect(() => {
    fetchSchedules();
  }, [selectedDate]);

  const fetchSchedules = async () => {
    try {
      const startDate = startOfWeek(selectedDate);
      const endDate = endOfWeek(selectedDate);
      
      const params = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      };
      
      const response = await api.get('/class-schedules', { params });
      setSchedules(response.data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error("Failed to load schedules");
    }
  };

  const handleSaveSchedule = async () => {
    try {
      if (!editingSchedule.start_time || !editingSchedule.end_time) {
        toast.error("Please select start and end times");
        return;
      }
  
      const url = `/class-schedules${selectedSchedule ? `/${selectedSchedule.id}` : ''}`;
      const method = selectedSchedule ? 'put' : 'post';
  
      const scheduleData = {
        ...editingSchedule,
        start_time: new Date(editingSchedule.start_time).toISOString(),
        end_time: new Date(editingSchedule.end_time).toISOString(),
        batch_year: parseInt(editingSchedule.batch_year)
      };
  
      const response = await api[method](url, scheduleData);
      const savedSchedule = response.data;
      
      if (selectedSchedule) {
        setSchedules(prev => 
          prev.map(schedule => 
            schedule.id === selectedSchedule.id ? savedSchedule : schedule
          )
        );
      } else {
        setSchedules(prev => [...prev, savedSchedule]);
      }
  
      setIsDialogOpen(false);
      toast.success(`Schedule ${selectedSchedule ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error("Failed to save schedule");
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await api.delete(`/class-schedules/${scheduleId}`);
      setSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId));
      toast.success("Schedule deleted successfully");
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error("Failed to delete schedule");
    }
  };

  const openCreateDialog = () => {
    const defaultStart = new Date(selectedDate);
    defaultStart.setHours(9, 0, 0, 0);
    const defaultEnd = new Date(selectedDate);
    defaultEnd.setHours(10, 0, 0, 0);

    setEditingSchedule({
      title: '',
      description: '',
      start_time: defaultStart.toISOString().slice(0, 16),
      end_time: defaultEnd.toISOString().slice(0, 16),
      department: '',
      batch_year: '',
      location: ''
    });
    setSelectedSchedule(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (schedule) => {
    setEditingSchedule({
      title: schedule.title,
      description: schedule.description || '',
      start_time: new Date(schedule.start_time).toISOString().slice(0, 16),
      end_time: new Date(schedule.end_time).toISOString().slice(0, 16),
      department: schedule.department,
      batch_year: schedule.batch_year.toString(),
      location: schedule.location || ''
    });
    setSelectedSchedule(schedule);
    setIsDialogOpen(true);
  };

  const getSchedulesForDate = (date) => {
    return schedules.filter(schedule => 
      isSameDay(parseISO(schedule.start_time), date)
    ).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  };

  const getDepartmentLabel = (deptValue) => {
    const dept = DEPARTMENTS.find(d => d.value === deptValue);
    return dept ? dept.label : deptValue;
  };

  const weekDays = [];
  const startDate = startOfWeek(selectedDate);
  for (let i = 0; i < 7; i++) {
    weekDays.push(addDays(startDate, i));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">
            Week of {format(startOfWeek(selectedDate), 'MMM dd, yyyy')}
          </h3>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Change Week
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedSchedule ? 'Edit' : 'Create'} Class Schedule
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editingSchedule.title}
                  onChange={(e) => setEditingSchedule(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter class title"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editingSchedule.description}
                  onChange={(e) => setEditingSchedule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Time</label>
                  <Input
                    type="datetime-local"
                    value={editingSchedule.start_time}
                    onChange={(e) => setEditingSchedule(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">End Time</label>
                  <Input
                    type="datetime-local"
                    value={editingSchedule.end_time}
                    onChange={(e) => setEditingSchedule(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Department</label>
                  <Select
                    value={editingSchedule.department}
                    onValueChange={(value) => setEditingSchedule(prev => ({ ...prev, department: value }))}
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
                    value={editingSchedule.batch_year}
                    onValueChange={(value) => setEditingSchedule(prev => ({ ...prev, batch_year: value }))}
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
              
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={editingSchedule.location}
                  onChange={(e) => setEditingSchedule(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location"
                />
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleSaveSchedule}>
                  {selectedSchedule ? 'Update' : 'Create'} Schedule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const daySchedules = getSchedulesForDate(day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <Card key={day.toISOString()} className={isToday ? 'border-primary' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">
                      {format(day, 'EEE')}
                    </span>
                    <span className={`text-lg ${isToday ? 'text-primary font-bold' : ''}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 min-h-[200px]">
                  {daySchedules.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No classes
                    </p>
                  ) : (
                    daySchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="p-2 border rounded-md bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
                        onClick={() => openEditDialog(schedule)}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <h5 className="text-xs font-medium truncate">{schedule.title}</h5>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(schedule);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSchedule(schedule.id);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center text-xs text-muted-foreground mb-1">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>
                            {format(parseISO(schedule.start_time), 'HH:mm')} - 
                            {format(parseISO(schedule.end_time), 'HH:mm')}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              {getDepartmentLabel(schedule.department)}
                            </Badge>
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {schedule.batch_year}
                            </Badge>
                          </div>
                        </div>
                        
                        {schedule.location && (
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="truncate">{schedule.location}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ClassScheduler;
