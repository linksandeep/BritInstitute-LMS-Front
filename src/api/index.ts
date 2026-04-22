import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('brit_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  getMe: () => api.get('/auth/me'),
};

// Admin
export const adminApi = {
  // Users
  getUsers: () => api.get('/admin/users'),
  createUser: (data: object) => api.post('/admin/users', data),
  updateUser: (id: string, data: object) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  // Courses
  getCourses: () => api.get('/admin/courses'),
  createCourse: (data: object) => api.post('/admin/courses', data),
  updateCourse: (id: string, data: object) => api.put(`/admin/courses/${id}`, data),
  deleteCourse: (id: string) => api.delete(`/admin/courses/${id}`),
  // Stats
  getStats: () => api.get('/admin/stats'),
};

// Live Classes
export const liveClassApi = {
  getAll: () => api.get('/live-classes'),
  getByBatch: (batchId: string) => api.get(`/live-classes/batch/${batchId}`),
  getMine: () => api.get('/live-classes/me'),
  create: (data: object) => api.post('/live-classes', data),
  update: (id: string, data: object) => api.put(`/live-classes/${id}`, data),
  delete: (id: string) => api.delete(`/live-classes/${id}`),
  attend: (id: string) => api.post(`/live-classes/${id}/attend`),
  getClassAttendance: (classId: string) => api.get(`/live-classes/attendance/class/${classId}`),
};

// Recorded Lectures
export const recordedApi = {
  getAll: () => api.get('/recorded'),
  getByBatch: (batchId: string) => api.get(`/recorded/batch/${batchId}`),
  getMine: () => api.get('/recorded/me'),
  create: (data: object) => api.post('/recorded', data),
  update: (id: string, data: object) => api.put(`/recorded/${id}`, data),
  delete: (id: string) => api.delete(`/recorded/${id}`),
  updateProgress: (id: string, data: { watchDuration: number, isCompleted: boolean }) =>
    api.post(`/recorded/${id}/progress`, data),
};

// Assignments
export const assignmentApi = {
  getAll: () => api.get('/assignments'),
  getByBatch: (batchId: string) => api.get(`/assignments/batch/${batchId}`),
  getMine: () => api.get('/assignments/me'),
  create: (data: object) => api.post('/assignments', data),
  update: (id: string, data: object) => api.put(`/assignments/${id}`, data),
  delete: (id: string) => api.delete(`/assignments/${id}`),
};

// Batches
export const batchApi = {
  getAll: () => api.get('/admin/batches'),
  getOne: (id: string) => api.get(`/admin/batches/${id}`),
  create: (data: object) => api.post('/admin/batches', data),
  update: (id: string, data: object) => api.put(`/admin/batches/${id}`, data),
  delete: (id: string) => api.delete(`/admin/batches/${id}`),
  addStudent: (batchId: string, studentId: string) =>
    api.post(`/admin/batches/${batchId}/students`, { studentId }),
  removeStudent: (batchId: string, studentId: string) =>
    api.delete(`/admin/batches/${batchId}/students/${studentId}`),
  getStudentReport: (batchId: string, studentId: string) =>
    api.get(`/admin/batches/${batchId}/students/${studentId}/report`),
};

// Sessions (One-to-One)
export const sessionApi = {
  getAll: () => api.get('/sessions/me'),
  getMentors: () => api.get('/sessions/mentors'),
  create: (data: object) => api.post('/sessions', data),
  cancel: (id: string) => api.patch(`/sessions/${id}/cancel`),
  // Admin methods
  adminGetAll: () => api.get('/sessions/admin'),
  adminUpdate: (id: string, data: object) => api.patch(`/sessions/admin/${id}`, data),
};

export const curriculumApi = {
  getDefaults: () => api.get('/curriculums/defaults'),
  getByBatch: (batchId: string) => api.get(`/curriculums/batch/${batchId}`),
  assignTemplate: (batchId: string, data: object) => api.put(`/curriculums/batch/${batchId}/assign-template`, data),
  updateByBatch: (batchId: string, data: object) => api.put(`/curriculums/batch/${batchId}`, data),
  getMine: () => api.get('/curriculums/me'),
};

export default api;
