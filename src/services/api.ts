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
};
