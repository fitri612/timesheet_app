'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Project {
  id: number;
  name: string;
  location: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

export default function TimesheetPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [worklogs, setWorklogs] = useState<any[]>([]);
  const [worklogsCalculated, setWorklogsCalculated] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalWork, setTotalWork] = useState("");

  const [formData, setFormData] = useState({
    projectId: '',
    userId: '',
    workDate: new Date().toISOString().split('T')[0],
    hoursWorked: '',
  });

  const [selectDate, setSelectDate] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const handleCalculateClick = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    fetchUsers();
    fetchProjects();
    fetchWorklogs();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      setError('Failed to fetch projects');
    }
  };

  const fetchWorklogs = async () => {
    try {
      const response = await fetch(`/api/worklogs?userId=`);

      if (!response.ok) {
        throw new Error(`Failed to fetch worklogs: ${response.statusText}`);
      }

      const data = await response.json();

      const groupedWorklogs: any = [];

      data.forEach((worklog: any) => {
        const workDate = new Date(worklog.workDate).toLocaleDateString();
        const existingEntry = groupedWorklogs.find(
          (entry: any) => entry.userId === worklog.userId && entry.date === workDate
        );

        const completedProject = {
          userId: worklog.userId,
          projectName: worklog.project.name,
          projectId: worklog.projectId,
          totalHours: worklog.hoursWorked,
        };

        if (existingEntry) {
          existingEntry.totalHours += worklog.hoursWorked;
          existingEntry.completedProjects.push(completedProject);
        } else {
          groupedWorklogs.push({
            userId: worklog.userId,
            date: workDate,
            totalHours: worklog.hoursWorked,
            completedProjects: [completedProject],
            userInfo: worklog.user,
          });
        }
      });

      setWorklogs(groupedWorklogs);

    } catch (error) {
      console.error('Failed to fetch worklogs:', error);
      setError('Failed to fetch worklogs');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      setError('Failed to fetch users');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/worklogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit worklog');
      }

      setFormData({
        projectId: '',
        workDate: new Date().toISOString().split('T')[0],
        hoursWorked: '',
        userId: '',
      });
      fetchWorklogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit worklog');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/worklogs?userId=`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit worklog');
      }

      const selectedMonth = new Date(selectDate).getMonth();
      const selectedYear = new Date(selectDate).getFullYear();
      const totalMonthPerHour = Number(totalWork) * 8;

      const filteredWorklogs = data.filter((worklog: any) => {
        const worklogDate = new Date(worklog.workDate);
        return (
          worklogDate.getFullYear() === selectedYear &&
          worklogDate.getMonth() === selectedMonth
        );
      });

      const worklogByUser: { [key: string]: any[] } = {};

      filteredWorklogs.forEach((worklog: any) => {
        const workDate = new Date(worklog.workDate).toLocaleDateString();

        if (!worklogByUser[worklog.userId]) {
          worklogByUser[worklog.userId] = [];
        }

        worklogByUser[worklog.userId].push({
          date: workDate,
          totalHours: worklog.hoursWorked,
          projectName: worklog.project.name,
          projectId: worklog.projectId,
        });
      });

      const worklogCompletion = Object.entries(worklogByUser).map(([userId, worklogsOnUser]) => {
        const worklogsByDate = worklogsOnUser.reduce<any>((acc, worklog) => {
          if (!acc[worklog.date]) {
            acc[worklog.date] = [];
          }
          acc[worklog.date].push(worklog);
          return acc;
        }, {});

        const completedProjectsByDate = Object.entries((worklogsByDate as any)).map(([date, worklogsOnDate]: any) => {
          const totalHoursPerDay = worklogsOnDate.reduce(
            (total: number, worklog: any) => total + Math.min(worklog.totalHours, 8),
            0
          );

          const completedProjects = worklogsOnDate.map((worklog: any) => {
            return {
              userId: parseInt(userId),
              projectName: worklog.projectName,
              projectId: worklog.projectId,
              isCompleted: totalHoursPerDay >= 8 ? 1 : 0,
            };
          });

          return {
            userId: parseInt(userId),
            date,
            totalHours: totalHoursPerDay,
            completedProjects,
          };
        });

        return {
          userId: parseInt(userId),
          userInfo: users.find((user) => user.id === parseInt(userId)),
          worklogs: completedProjectsByDate,
          statusWorkPerMonth: parseInt(_calculateWorkDays(completedProjectsByDate) >= totalMonthPerHour ? '1' : '0'),
        };
      });

      setWorklogsCalculated(worklogCompletion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit worklog');
    }
    // closeModal();
  };

  const _calculateWorkDays = (worklogs: any[]) => {
    return worklogs.reduce((total, day) => total + day.totalHours, 0);
  };


  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add Worklog</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Select
                value={formData.projectId}
                onValueChange={(value) => setFormData({ ...formData, projectId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.name} - {project.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={formData.userId}
                onValueChange={(value) => setFormData({ ...formData, userId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name} - {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


            <div>
              <Input
                type="date"
                value={formData.workDate}
                onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
              />
            </div>

            <div>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="8"
                placeholder="Hours Worked (max 8)"
                value={formData.hoursWorked}
                onChange={(e) => setFormData({ ...formData, hoursWorked: e.target.value })}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Worklog'}
            </Button>

            <div className="bg-yellow-100 text-left text-gray-800 p-4 rounded-lg shadow-lg w-full">
              <p className="text-lg font-medium">
                If you not absence not detected in system or auto 0
              </p>
            </div>

          </form>
        </CardContent>
      </Card>

      <Card>
        <div className="flex justify-between items-center py-4 px-6">
          <CardTitle>Show Worklogs</CardTitle>
          <Button onClick={handleCalculateClick}>Calculate (Month)</Button>
        </div>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Employee</th>
                  <th className="text-center p-2">Project</th>
                  <th className="text-center p-2">Total Hours (day)</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {worklogs.map((log, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-2">
                      {new Date(log.date).toLocaleDateString()}
                    </td>
                    <td className="p-2">{log.userInfo.name}</td>
                    <td className="p-2">
                      <ul className="list-disc pl-5">
                        {log.completedProjects.map((project: any) => (
                          <li key={project.projectId}>
                            {project.projectName} - {project.totalHours} hours
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-2 text-center">{log.totalHours}</td>
                    <td className="p-2 text-right">
                      {log.totalHours >= 8 ? 'Full Day (1)' : 'Not Full Day (0)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="h-96 overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Please Fill out the form</DialogTitle>
              <DialogDescription>
                <form onSubmit={handleSubmitModal} className="space-y-4">
                  <div>
                    <Input
                      type="month"
                      value={selectDate}
                      onChange={(e) => setSelectDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Hours Worked per month (max 30)"
                      value={totalWork}
                      onChange={(e) => setTotalWork(e.target.value)}
                    />
                  </div>

                  {totalWork && totalWork !== ""
                    ? <p className="text-sm text-gray-500">Total Work Month: {parseInt(totalWork) * 8}</p>
                    : null
                  }

                  <Button type="submit" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit'}
                  </Button>
                </form>
              </DialogDescription>

              {/* body perhitungan per user */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-2">Employee</th>
                      <th className="text-left p-2">Total Work Days</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {worklogsCalculated.map((log, index) => (
                      <tr key={index} className="border-t" >
                        <td className="p-2">{log?.userInfo?.name}</td>
                        <td className="p-2">{_calculateWorkDays(log.worklogs)}</td>
                        <td className="p-2">
                          {log.statusWorkPerMonth === 1 ? 'Full (1)' : 'Not Full (0)'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}