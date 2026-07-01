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
  getSessionConfig: () => api.get('/auth/session-config'),
  heartbeat: () => api.post('/auth/heartbeat'),
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    api.put('/auth/password', data),
  logout: (reason: 'manual' | 'inactivity' = 'manual') => api.post('/auth/logout', { reason }),
};

// Admin
export const adminApi = {
  // Users
  getUsers: (search?: string) => api.get('/admin/users', { params: search ? { search } : undefined }),
  createUser: (data: object) => api.post('/admin/users', data),
  updateUser: (id: string, data: object) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  getTeachers: () => api.get('/admin/teachers'),
  // Courses
  getCourses: () => api.get('/admin/courses'),
  createCourse: (data: object) => api.post('/admin/courses', data),
  updateCourse: (id: string, data: object) => api.put(`/admin/courses/${id}`, data),
  deleteCourse: (id: string) => api.delete(`/admin/courses/${id}`),
  // Stats
  getStats: () => api.get('/admin/stats'),
  getActivity: () => api.get('/admin/activity'),
};

export const superAdminApi = {
  getStats: () => api.get('/superadmin/stats'),
  getTeachers: () => api.get('/superadmin/teachers'),
  createTeacher: (data: object) => api.post('/superadmin/teachers', data),
  updateTeacher: (id: string, data: object) => api.put(`/superadmin/teachers/${id}`, data),
  deleteTeacher: (id: string) => api.delete(`/superadmin/teachers/${id}`),
};

// Live Classes
export const liveClassApi = {
  getAll: () => api.get('/live-classes'),
  getByBatch: (batchId: string) => api.get(`/live-classes/batch/${batchId}`),
  getMine: () => api.get('/live-classes/me'),
  create: (data: object) => api.post('/live-classes', data),
  update: (id: string, data: object) => api.put(`/live-classes/${id}`, data),
  start: (id: string) => api.patch(`/live-classes/${id}/start`),
  end: (id: string) => api.patch(`/live-classes/${id}/end`),
  delete: (id: string) => api.delete(`/live-classes/${id}`),
  attend: (id: string) => api.post(`/live-classes/${id}/attend`),
  getClassAttendance: (classId: string) => api.get(`/live-classes/attendance/class/${classId}`),
};

// Recorded Lectures
export const recordedApi = {
  getAll: () => api.get('/recorded'),
  getByBatch: (batchId: string) => api.get(`/recorded/batch/${batchId}`),
  getMine: () => api.get('/recorded/me'),
  getStreamToken: (id: string) => api.post(`/recorded/${id}/stream-token`),
  create: (data: object) => api.post('/recorded', data),
  update: (id: string, data: object) => api.put(`/recorded/${id}`, data),
  delete: (id: string) => api.delete(`/recorded/${id}`),
  syncZoom: () => api.post('/recorded/sync-zoom'),
  updateProgress: (id: string, data: { watchDuration: number, isCompleted: boolean, playbackPosition?: number }) =>
    api.post(`/recorded/${id}/progress`, data),
};

export const foundationApi = {
  getAll: () => api.get('/foundation'),
  create: (data: object) => api.post('/foundation', data),
  update: (id: string, data: object) => api.put(`/foundation/${id}`, data),
  delete: (id: string) => api.delete(`/foundation/${id}`),
};

// Assignments
export const assignmentApi = {
  getAll: (batch?: string) => api.get('/assignments', { params: batch ? { batch } : undefined }),
  getByBatch: (batchId: string) => api.get(`/assignments/batch/${batchId}`),
  getMine: () => api.get('/assignments/me'),
  create: (data: object) => api.post('/assignments', data),
  update: (id: string, data: object) => api.put(`/assignments/${id}`, data),
  delete: (id: string) => api.delete(`/assignments/${id}`),
  submit: (id: string, data: object) => api.post(`/assignments/${id}/submit`, data),
  getSubmissions: (id: string, search?: string) => api.get(`/assignments/${id}/submissions`, { params: search ? { search } : undefined }),
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
  getAvailability: (mentorId: string, date: string) =>
    api.get(`/sessions/mentors/${mentorId}/availability`, { params: { date } }),
  create: (data: object) => api.post('/sessions', data),
  reschedule: (id: string, data: object) => api.patch(`/sessions/${id}/reschedule`, data),
  cancel: (id: string) => api.patch(`/sessions/${id}/cancel`),
  // Admin methods
  adminGetAll: () => api.get('/sessions/admin'),
  adminUpdate: (id: string, data: object) => api.patch(`/sessions/admin/${id}`, data),
};

export const curriculumApi = {
  getDefaults: (includeArchived = false) => api.get('/curriculums/defaults', { params: includeArchived ? { includeArchived: true } : undefined }),
  createDefault: (data: object) => api.post('/curriculums/defaults', data),
  updateDefault: (id: string, data: object) => api.put(`/curriculums/defaults/${id}`, data),
  duplicateDefault: (id: string) => api.post(`/curriculums/defaults/${id}/duplicate`),
  archiveDefault: (id: string) => api.patch(`/curriculums/defaults/${id}/archive`),
  deleteDefault: (id: string) => api.delete(`/curriculums/defaults/${id}`),
  getByBatch: (batchId: string) => api.get(`/curriculums/batch/${batchId}`),
  assignTemplate: (batchId: string, data: object) => api.put(`/curriculums/batch/${batchId}/assign-template`, data),
  updateByBatch: (batchId: string, data: object) => api.put(`/curriculums/batch/${batchId}`, data),
  getMine: () => api.get('/curriculums/me'),
};

export const studentPortalApi = {
  getSummary: () => api.get('/student-portal/summary'),
  createStudyPlan: (data: { prompt: string }) => api.post('/student-portal/study-plan', data),
  requestCertificate: () => api.post('/student-portal/certificate-request'),
};

export default api;
