import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  HelpCircle,
  Bot,
  User,
  Loader2,
  BookOpen,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { UserProfile, PolicyFaqItem } from '../types';
import { POLICY_FAQS } from '../mockData';
import { api } from '../services/api';

interface AiPolicyAdvisorProps {
  currentUser: UserProfile;
  lang: 'ar' | 'en';
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

export const AiPolicyAdvisor: React.FC<AiPolicyAdvisorProps> = ({
  currentUser,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: isAr
        ? `مرحباً بك يا ${currentUser.name}! أنا مستشارك الذكي لسياسات العمل عن بعد والإجازات في "دوامي". كيف يمكنني مساعدتك في استفسارات لائحة العمل والدوام المرن اليوم؟`
        : `Hello ${currentUser.nameEn}! I am your AI HR Policy Advisor for Dawamy. How can I assist you with remote work guidelines and leave bylaws today?`,
      time: 'الآن',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAskQuestion = async (queryText: string) => {
    const q = queryText.trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      time: new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await api.askPolicyAdvisor({
        question: q,
        userContext: {
          name: currentUser.name,
          department: currentUser.department,
          role: currentUser.title,
        },
        language: lang,
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.answer || (isAr ? 'تم استلام استفسارك وسيتم تزويدك بالتفاصيل.' : 'Query processed.'),
        time: new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: isAr
          ? 'وفقاً لسياسة دوامي المعتمدة: يحق للموظف يومين عمل عن بعد أسبوعياً بموافقة المدير، وتعتبر ساعات 10:00 ص - 4:00 م ساعات تواجد إلزامية.'
          : 'According to company policy: up to 2 WFH days per week upon manager approval. Core hours: 10:00 AM - 4:00 PM.',
        time: new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left / Main Chat Box */}
      <div className="lg:col-span-2 bg-white border border-[#E5E2D9] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col h-[600px]">
        
        {/* Chat Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E2D9]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]">
              <Sparkles className="w-5 h-5 text-[#5E7153]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2D3628] flex items-center gap-2">
                <span>{isAr ? 'المستشار الذكي للوائح وسياسات العمل (Gemini AI)' : 'AI HR Policy Advisor (Gemini)'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]">
                  {isAr ? 'محدث وفوري' : 'Live Policy'}
                </span>
              </h3>
              <p className="text-xs text-[#65635E]">
                {isAr ? 'إجابات دقيقة ومباشرة حول سياسات العمل عن بعد، الإجازات، وساعات الدوام' : 'Instant answers regarding hybrid work policies & HR bylaws'}
              </p>
            </div>
          </div>
        </div>

        {/* Chat messages list */}
        <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isUser ? 'bg-[#5E7153] text-white' : 'bg-[#FAF9F6] border border-[#E5E2D9] text-[#5E7153]'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#5E7153] text-white rounded-tr-none'
                      : 'bg-[#FAF9F6] border border-[#E5E2D9] text-[#43423E] rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                  <span
                    className={`block text-[10px] mt-1.5 ${
                      isUser ? 'text-[#D9E0D2] text-left' : 'text-[#65635E] text-right'
                    }`}
                  >
                    {m.time}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9] text-[#5E7153] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9] text-[#43423E] rounded-tl-none text-xs flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-[#5E7153] animate-spin" />
                <span>{isAr ? 'جاري البحث في لوائح العمل وسياسات الشركة...' : 'Consulting HR policies...'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskQuestion(inputQuery);
          }}
          className="pt-3 border-t border-[#E5E2D9] flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={
              isAr
                ? 'اسأل المستشار الذكي عن أي بند في لائحة العمل والإجازات...'
                : 'Ask any question about company work & leave policies...'
            }
            className="flex-1 px-4 py-2.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs sm:text-sm text-[#43423E] placeholder-[#9A9890] focus:outline-none focus:border-[#5E7153]"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="p-2.5 sm:px-4 sm:py-2.5 bg-[#5E7153] hover:bg-[#4E5F44] disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{isAr ? 'إرسال' : 'Ask'}</span>
          </button>
        </form>

      </div>

      {/* Right / Frequently Asked Policy Cards */}
      <div className="bg-white border border-[#E5E2D9] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D9]">
          <BookOpen className="w-5 h-5 text-[#5E7153]" />
          <h4 className="font-bold text-sm text-[#2D3628]">
            {isAr ? 'أهم الأسئلة الشائعة في اللائحة' : 'Common HR Policy FAQs'}
          </h4>
        </div>

        <p className="text-xs text-[#65635E] leading-relaxed">
          {isAr
            ? 'اضغط على أي استفسار أدناه لتوجيهه للمستشار الذكي مباشرة:'
            : 'Click any quick prompt to ask the advisor directly:'}
        </p>

        <div className="space-y-2.5">
          {POLICY_FAQS.map((faq, idx) => (
            <button
              key={idx}
              onClick={() => handleAskQuestion(isAr ? faq.questionAr : faq.questionEn)}
              className="w-full text-right p-3 rounded-2xl bg-[#FAF9F6] hover:bg-[#F5F3ED] border border-[#E5E2D9] hover:border-[#5E7153]/40 text-xs transition group flex flex-col gap-1"
            >
              <div className="flex items-center justify-between text-[#2D3628] font-semibold group-hover:text-[#5E7153]">
                <span>{isAr ? faq.questionAr : faq.questionEn}</span>
                <ChevronRight className="w-4 h-4 text-[#65635E] group-hover:text-[#5E7153] group-hover:translate-x-0.5 transition-transform" />
              </div>
              <span className="text-[11px] text-[#65635E] line-clamp-2 leading-relaxed">
                {isAr ? faq.summaryAr : faq.summaryEn}
              </span>
              <span className="text-[10px] text-[#5E7153] font-medium mt-1 inline-block">
                #{faq.tag}
              </span>
            </button>
          ))}
        </div>

      </div>

    </div>
  );
};
