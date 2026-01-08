import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bell, X, Clock, MapPin, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../../api/apiClient';

const NotificationSystem = () => {
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Check for upcoming schedules every minute
    const interval = setInterval(() => {
      fetchUpcomingSchedules();
    }, 60000); // 60 seconds

    // Initial check
    fetchUpcomingSchedules();

    return () => clearInterval(interval);
  }, []);

  const fetchUpcomingSchedules = async () => {
    try {
      const response = await api.get('/upcoming-schedules');
      const schedules = response.data;
      
      // Create notifications for new upcoming schedules
      schedules.forEach(schedule => {
        if (!notifications.find(n => n.id === schedule.id)) {
          const notification = {
            id: schedule.id,
            title: schedule.title,
            start_time: schedule.start_time,
            department: schedule.department,
            batch_year: schedule.batch_year,
            location: schedule.location,
            timestamp: new Date()
          };
          
          setNotifications(prev => [...prev, notification]);
          
          // Show toast notification
          toast.info(`${schedule.title} starts in 15 minutes`);
        }
      });
  
      setUpcomingSchedules(schedules);
    } catch (error) {
      console.error('Error fetching upcoming schedules:', error);
    }
  };

  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getDepartmentLabel = (deptValue) => {
    const departments = {
      'cse_a': 'CSE A',
      'cse_b': 'CSE B',
      'cse_c': 'CSE C',
      'rai': 'RAI',
      'ai': 'AI',
      'cys': 'CYS',
      'cce': 'CCE',
      'ece': 'ECE'
    };
    return departments[deptValue] || deptValue;
  };

  // Auto-dismiss notifications after 10 seconds
  useEffect(() => {
    const timeouts = notifications.map(notification => {
      return setTimeout(() => {
        dismissNotification(notification.id);
      }, 10000); // 10 seconds
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [notifications]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <Card key={notification.id} className="border-orange-200 bg-orange-50 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4 text-orange-600" />
                <CardTitle className="text-sm text-orange-900">Upcoming Class</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissNotification(notification.id)}
                className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-orange-900">
                {notification.title}
              </h4>
              
              <div className="flex items-center text-xs text-orange-700">
                <Clock className="h-3 w-3 mr-1" />
                <span>
                  Starts at {format(parseISO(notification.start_time), 'HH:mm')}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {getDepartmentLabel(notification.department)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {notification.batch_year}
                  </Badge>
                </div>
              </div>
              
              {notification.location && (
                <div className="flex items-center text-xs text-orange-700">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span>{notification.location}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default NotificationSystem;
