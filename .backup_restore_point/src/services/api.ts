export interface GenerateReasonPayload {
  type: string;
  keywords?: string;
  tone?: string;
  role?: string;
  department?: string;
  language?: 'ar' | 'en';
}

export interface PolicyAdvisorPayload {
  question: string;
  userContext?: {
    name?: string;
    department?: string;
    role?: string;
  };
  language?: 'ar' | 'en';
}

export interface TeamImpactPayload {
  requestDetails: {
    employeeName: string;
    type: string;
    dateStart: string;
    dateEnd?: string;
    reason: string;
    plan?: string;
  };
  teamStats: {
    totalMembers: number;
    inOffice: number;
    remote: number;
    onLeave: number;
    inOfficePercent: number;
  };
  department?: string;
  language?: 'ar' | 'en';
}

export interface StandupSummaryPayload {
  tasks: string;
  employeeName: string;
  department: string;
  language?: 'ar' | 'en';
}

export const api = {
  async checkHealth() {
    try {
      const res = await fetch('/api/health');
      return await res.json();
    } catch {
      return { status: 'offline' };
    }
  },

  async generateReason(payload: GenerateReasonPayload): Promise<{ success: boolean; reason: string; fallback?: boolean }> {
    try {
      const res = await fetch('/api/gemini/generate-reason', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('API request failed');
      return await res.json();
    } catch {
      // Offline fallback
      return {
        success: true,
        reason: payload.language === 'en'
          ? 'Requesting flexible remote schedule to maintain sprint velocity on critical technical deliverables.'
          : 'طلب عمل عن بعد للتركيز المكثف على تسليم المهام الحرجة المحددة في خطة العمل مع الالتزام الكامل بساعات التواصل.',
        fallback: true,
      };
    }
  },

  async askPolicyAdvisor(payload: PolicyAdvisorPayload): Promise<{ success: boolean; answer: string; fallback?: boolean }> {
    try {
      const res = await fetch('/api/gemini/policy-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('API request failed');
      return await res.json();
    } catch {
      return {
        success: true,
        answer: payload.language === 'en'
          ? 'Company Policy: Up to 2 remote work days weekly upon manager approval. Core availability hours are 10:00 AM to 4:00 PM.'
          : 'سياسة الدوام: مسموح بحد أقصى يومين عمل عن بعد أسبوعياً بموافقة المدير المباشر. ساعات التواجد الأساسية من 10 ص حتى 4 م.',
        fallback: true,
      };
    }
  },

  async evaluateTeamImpact(payload: TeamImpactPayload): Promise<{ success: boolean; analysis?: string; impactScore?: string; recommendation?: string; fallback?: boolean }> {
    try {
      const res = await fetch('/api/gemini/team-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('API request failed');
      return await res.json();
    } catch {
      const safe = payload.teamStats.inOfficePercent >= 50;
      return {
        success: true,
        analysis: payload.language === 'en'
          ? `Team presence remains at ${payload.teamStats.inOfficePercent}%. ${safe ? 'Low impact on scheduled deliverables.' : 'Moderate coverage concern.'}`
          : `نسبة حضور الفريق في المكتب ${payload.teamStats.inOfficePercent}%. ${safe ? 'تأثير منخفض على سير المهام وسير العمل آمن.' : 'يُرجى التأكد من تغطية المهام الحرجة.'}`,
        impactScore: safe ? (payload.language === 'en' ? 'Safe' : 'آمن') : (payload.language === 'en' ? 'Moderate' : 'متوسط'),
        fallback: true,
      };
    }
  },

  async generateStandup(payload: StandupSummaryPayload): Promise<{ success: boolean; summary: string; fallback?: boolean }> {
    try {
      const res = await fetch('/api/gemini/standup-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('API request failed');
      return await res.json();
    } catch {
      return {
        success: true,
        summary: payload.language === 'en'
          ? `📋 Remote Standup - ${payload.employeeName}:\n• Tasks: ${payload.tasks}\n• Hours: 9:00 AM - 5:00 PM\n• Available on Slack & Email.`
          : `📋 تقرير ستاند-أب دوامي - ${payload.employeeName}:\n• المهام المنجزة والمستهدفة: ${payload.tasks}\n• ساعات التواجد: 09:00 ص إلى 05:00 م\n• قنوات التواصل: سلاك والبريد الإلكتروني والهاتف.`,
        fallback: true,
      };
    }
  },

  // --------------------------------------------------------------------------
  // PostgreSQL Database & Backend API Layer
  // --------------------------------------------------------------------------
  async login(email: string, passwordPlain: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password: passwordPlain }),
    });
    return await res.json();
  },

  async logout() {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      return await res.json();
    } catch {
      return { success: true };
    }
  },

  async getMe() {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  },

  async getEmployees() {
    try {
      const res = await fetch('/api/employees', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch employees');
      const data = await res.json();
      return data.employees || [];
    } catch (e) {
      console.warn('Backend employees fetch warning:', e);
      return [];
    }
  },

  async createEmployee(employeeData: any) {
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(employeeData),
    });
    return await res.json();
  },

  async getAttendance(filter?: { employeeId?: string; date?: string }) {
    try {
      const query = new URLSearchParams(filter as any).toString();
      const res = await fetch(`/api/attendance?${query}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch attendance');
      const data = await res.json();
      return data.records || [];
    } catch {
      return [];
    }
  },

  async checkIn(method: string = 'web', notes?: string) {
    const res = await fetch('/api/attendance/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ method, notes }),
    });
    return await res.json();
  },

  async checkOut(notes?: string) {
    const res = await fetch('/api/attendance/check-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ notes }),
    });
    return await res.json();
  },

  async getRemoteWorkRequests() {
    try {
      const res = await fetch('/api/remote-work', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch remote requests');
      const data = await res.json();
      return data.requests || [];
    } catch {
      return [];
    }
  },

  async createRemoteWorkRequest(data: { date: string; reason: string; tasksPlan?: string; managerId?: string }) {
    const res = await fetch('/api/remote-work', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return await res.json();
  },

  async approveRemoteWorkRequest(id: string) {
    const res = await fetch(`/api/remote-work/${id}/approve`, {
      method: 'PUT',
      credentials: 'include',
    });
    return await res.json();
  },

  async rejectRemoteWorkRequest(id: string, reason?: string) {
    const res = await fetch(`/api/remote-work/${id}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });
    return await res.json();
  },

  async getLeaveRequests() {
    try {
      const res = await fetch('/api/leaves', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch leaves');
      const data = await res.json();
      return data.leaves || [];
    } catch {
      return [];
    }
  },

  async createLeaveRequest(data: { leaveType: string; startDate: string; endDate: string; reason: string }) {
    const res = await fetch('/api/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return await res.json();
  },

  async approveLeaveRequest(id: string) {
    const res = await fetch(`/api/leaves/${id}/approve`, {
      method: 'PUT',
      credentials: 'include',
    });
    return await res.json();
  },

  async rejectLeaveRequest(id: string, reason?: string) {
    const res = await fetch(`/api/leaves/${id}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });
    return await res.json();
  },

  async getDashboard() {
    try {
      const res = await fetch('/api/dashboard', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return await res.json();
    } catch {
      return null;
    }
  },
};
