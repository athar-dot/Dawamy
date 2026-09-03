import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Laptop,
  Palmtree,
  Stethoscope,
  Users,
  MapPin,
  Clock,
  Sparkles,
  Building,
} from 'lucide-react';
import { LeaveOrWfhRequest, TeamMemberStatus } from '../types';

interface TeamCalendarViewProps {
  requests: LeaveOrWfhRequest[];
  teamMembers: TeamMemberStatus[];
  lang: 'ar' | 'en';
}

export const TeamCalendarView: React.FC<TeamCalendarViewProps> = ({
  requests,
  teamMembers,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 8, 1)); // Sept 2026

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const monthName = currentMonth.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Day name headers
  const weekDaysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const weekDaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekDays = isAr ? weekDaysAr : weekDaysEn;

  // Find requests matching a specific day (yyyy-mm-dd)
  const getDayEvents = (dayNum: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = `${year}-${month}-${String(dayNum).padStart(2, '0')}`;

    return requests.filter((r) => {
      if (r.status === 'rejected' || r.status === 'cancelled') return false;
      return dayStr >= r.startDate && dayStr <= r.endDate;
    });
  };

  const [selectedDay, setSelectedDay] = useState<number | null>(3); // default Sept 3

  const selectedDayEvents = selectedDay ? getDayEvents(selectedDay) : [];

  return (
    <div className="bg-white border border-[#E5E2D9] rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
      
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-[#2D3628] flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#5E7153]" />
            <span>{isAr ? 'تقويم وتغطية الفريق التفاعلي' : 'Interactive Team Presence Calendar'}</span>
          </h3>
          <p className="text-xs text-[#65635E] mt-0.5">
            {isAr
              ? 'متابعة توزيع أيام العمل عن بعد والإجازات المعتمدة لمنع تعارض مواعيد الفريق'
              : 'Track team hybrid presence and leaves to avoid scheduling overlap'}
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 bg-[#FAF9F6] p-1.5 rounded-2xl border border-[#E5E2D9]">
          <button
            onClick={isAr ? handleNextMonth : handlePrevMonth}
            className="p-1.5 rounded-xl hover:bg-[#EFECE4] text-[#65635E] hover:text-[#2D3628] transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-xs sm:text-sm font-bold text-[#2D3628] px-3 min-w-[130px] text-center">
            {monthName}
          </span>
          <button
            onClick={isAr ? handlePrevMonth : handleNextMonth}
            className="p-1.5 rounded-xl hover:bg-[#EFECE4] text-[#65635E] hover:text-[#2D3628] transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-[#65635E] pt-1 pb-2 border-b border-[#E5E2D9]">
        <span className="font-semibold text-[#2D3628]">{isAr ? 'دلالات الألوان:' : 'Legend:'}</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#5E7153]" />
          <span>{isAr ? 'عمل عن بعد (WFH)' : 'Remote (WFH)'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
          <span>{isAr ? 'إجازة سنوية' : 'Annual Leave'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E5AA70]" />
          <span>{isAr ? 'إجازة مرضية/اضطرارية' : 'Sick/Emergency'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C8C4B7]" />
          <span>{isAr ? 'عطلة أسبوعية' : 'Weekend'}</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Day name headers */}
        {weekDays.map((d, i) => {
          const isWeekend = i === 5 || i === 6; // Fri / Sat
          return (
            <div
              key={d}
              className={`p-2 text-center text-xs font-bold rounded-xl ${
                isWeekend ? 'text-[#9A9890] bg-[#F5F3ED]' : 'text-[#2D3628] bg-[#EFECE4]'
              }`}
            >
              {d}
            </div>
          );
        })}

        {/* Empty slots for month start */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[75px] sm:min-h-[90px] rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9]/60" />
        ))}

        {/* Days cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const events = getDayEvents(dayNum);
          const isSelected = selectedDay === dayNum;
          const dayOfWeek = (firstDayIndex + i) % 7;
          const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

          return (
            <div
              key={`day-${dayNum}`}
              onClick={() => setSelectedDay(dayNum)}
              className={`min-h-[75px] sm:min-h-[95px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-white border-[#5E7153] ring-2 ring-[#5E7153]/30 shadow-md'
                  : isWeekend
                  ? 'bg-[#FAF9F6]/80 border-[#E5E2D9]/80 hover:border-[#D5D0C5]'
                  : 'bg-[#FAF9F6] hover:bg-white border-[#E5E2D9]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isSelected ? 'text-[#5E7153]' : isWeekend ? 'text-[#9A9890]' : 'text-[#2D3628]'}`}>
                  {dayNum}
                </span>
                {events.length > 0 && (
                  <span className="text-[10px] px-1.5 rounded-full bg-[#E9EDD9] text-[#2D3628] font-bold border border-[#D9E0D2]">
                    {events.length}
                  </span>
                )}
              </div>

              {/* Event indicators */}
              <div className="space-y-1 my-1 overflow-hidden">
                {events.slice(0, 2).map((ev) => {
                  const isRemote = ev.type === 'remote';
                  const isAnnual = ev.type === 'annual_leave';
                  return (
                    <div
                      key={ev.id}
                      className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium flex items-center gap-1 ${
                        isRemote
                          ? 'bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]'
                          : isAnnual
                          ? 'bg-[#E2EDF8] text-[#1E40AF] border border-[#BFDBFE]'
                          : 'bg-[#FDF3E7] text-[#8C5A28] border border-[#E5AA70]'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                      <span className="truncate">{ev.userName}</span>
                    </div>
                  );
                })}
                {events.length > 2 && (
                  <div className="text-[9px] text-[#65635E] text-center font-bold">
                    +{events.length - 2} {isAr ? 'آخرين' : 'more'}
                  </div>
                )}
              </div>

              <div className="h-1" />
            </div>
          );
        })}
      </div>

      {/* Selected Day Detailed Coverage Breakdown */}
      {selectedDay && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9] space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#E5E2D9]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#5E7153]" />
              <h4 className="text-xs sm:text-sm font-bold text-[#2D3628]">
                {isAr
                  ? `تفاصيل حضور وتغطية الفريق ليوم: ${selectedDay} ${monthName}`
                  : `Team Presence on ${selectedDay} ${monthName}`}
              </h4>
            </div>
            <span className="text-xs text-[#65635E]">
              {selectedDayEvents.length} {isAr ? 'مسجلين عن بُعد / إجازة' : 'remote/leave records'}
            </span>
          </div>

          {selectedDayEvents.length === 0 ? (
            <p className="text-xs text-[#65635E] py-3 text-center">
              {isAr
                ? 'جميع أعضاء الفريق متواجدون في المكتب الرئيسي في هذا اليوم ولا توجد إجازات مجدولة.'
                : 'All team members are scheduled in-office. Full coverage available.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedDayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-white border border-[#E5E2D9] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={ev.avatar}
                      alt={ev.userName}
                      className="w-8 h-8 rounded-lg object-cover border border-[#E5E2D9]"
                    />
                    <div>
                      <div className="font-bold text-[#2D3628]">{ev.userName}</div>
                      <div className="text-[10px] text-[#65635E]">{ev.department}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ev.type === 'remote'
                      ? 'bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]'
                      : 'bg-[#E2EDF8] text-[#1E40AF] border border-[#BFDBFE]'
                  }`}>
                    {ev.type === 'remote' ? (isAr ? 'عن بُعد WFH' : 'Remote WFH') : (isAr ? 'إجازة' : 'Leave')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
