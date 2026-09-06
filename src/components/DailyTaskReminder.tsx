import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  Clock,
  Plus,
  Edit3,
  Trash2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Tag,
  Filter,
  ArrowUpRight,
  Bell,
  BellRing,
  MoreVertical,
  X,
  Check,
  ChevronDown,
  Layers,
  FileText,
  Timer,
  Zap,
} from 'lucide-react';
import { UserProfile, DailyTaskItem } from '../types';

interface DailyTaskReminderProps {
  currentUser: UserProfile;
  onUpdateTasks: (tasks: DailyTaskItem[]) => Promise<void> | void;
  onOpenStandupModal?: () => void;
  lang: 'ar' | 'en';
}

const PRESET_DUE_TIMES = [
  { labelAr: '10:00 صباحاً', labelEn: '10:00 AM', value: '10:00 AM' },
  { labelAr: '11:30 صباحاً', labelEn: '11:30 AM', value: '11:30 AM' },
  { labelAr: '01:00 ظهراً', labelEn: '01:00 PM', value: '01:00 PM' },
  { labelAr: '02:30 ظهراً', labelEn: '02:30 PM', value: '02:30 PM' },
  { labelAr: '04:00 عصراً', labelEn: '04:00 PM', value: '04:00 PM' },
  { labelAr: '05:00 مساءً (نهاية الدوام)', labelEn: '05:00 PM (EOD)', value: '05:00 PM' },
];

const CATEGORIES = [
  { ar: 'برمجة وتطوير', en: 'Development', color: 'bg-[#E9EDD9] text-[#2D3628] border-[#D9E0D2]' },
  { ar: 'اجتماعات ومواءمة', en: 'Meetings', color: 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]' },
  { ar: 'تقارير ومتابعة', en: 'Reports & Sync', color: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]' },
  { ar: 'اعتمادات وإشراف', en: 'Approvals & Review', color: 'bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]' },
  { ar: 'بنية تحتية ودعم', en: 'DevOps & Infra', color: 'bg-[#E0E7FF] text-[#3730A3] border-[#C7D2FE]' },
  { ar: 'مهام عامة', en: 'General Task', color: 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]' },
];

export const DailyTaskReminder: React.FC<DailyTaskReminderProps> = ({
  currentUser,
  onUpdateTasks,
  onOpenStandupModal,
  lang,
}) => {
  const isAr = lang === 'ar';

  // Extract or fallback tasks
  const tasks: DailyTaskItem[] = useMemo(() => {
    if (currentUser.dailyTasks && currentUser.dailyTasks.length > 0) {
      return currentUser.dailyTasks;
    }
    // If not set yet, fallback to currentTasks or default tasks
    if (currentUser.currentTasks && currentUser.currentTasks.length > 0) {
      return currentUser.currentTasks.map((t, idx) => ({
        id: `task-${idx}-${Date.now()}`,
        title: t,
        dueTime: idx === 0 ? '11:30 AM' : idx === 1 ? '02:30 PM' : '05:00 PM',
        completed: false,
        priority: idx === 0 ? 'high' : 'medium',
        category: idx === 0 ? (isAr ? 'برمجة وتطوير' : 'Development') : (isAr ? 'تقارير ومتابعة' : 'Reports'),
      }));
    }
    return [];
  }, [currentUser.dailyTasks, currentUser.currentTasks, isAr]);

  // Filtering & Search State
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed' | 'high'>('all');
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  // Modal State for Add/Edit Task
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTaskItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDueDate, setFormDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formDueTime, setFormDueTime] = useState('02:00 PM');
  const [formPriority, setFormPriority] = useState<'high' | 'medium' | 'normal'>('medium');
  const [formCategory, setFormCategory] = useState(CATEGORIES[0].ar);
  const [formNotes, setFormNotes] = useState('');

  // Stats calculation
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = totalCount - completedCount;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Next upcoming pending task
  const nextTask = useMemo(() => {
    return tasks.find((t) => !t.completed);
  }, [tasks]);

  // Filtered list
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterMode === 'pending') return !t.completed;
      if (filterMode === 'completed') return t.completed;
      if (filterMode === 'high') return t.priority === 'high';
      return true;
    });
  }, [tasks, filterMode]);

  // Toggle completion
  const handleToggleComplete = async (task: DailyTaskItem) => {
    const nowStr = `${new Date().toISOString().split('T')[0]} • ${new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`;
    const updated = tasks.map((t) => {
      if (t.id === task.id) {
        const newCompleted = !t.completed;
        return {
          ...t,
          completed: newCompleted,
          completedAt: newCompleted ? nowStr : undefined,
        };
      }
      return t;
    });

    onUpdateTasks(updated);

    if (!task.completed) {
      showReminder(
        isAr
          ? `🎉 أحسنت! تم إنجاز المهمة: "${task.title}" في ${nowStr}`
          : `🎉 Great job! Completed: "${task.title}" at ${nowStr}`
      );
    }
  };

  // Open modal for new task
  const handleOpenAdd = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDueDate(new Date().toISOString().split('T')[0]);
    setFormDueTime('02:00 PM');
    setFormPriority('medium');
    setFormCategory(isAr ? CATEGORIES[0].ar : CATEGORIES[0].en);
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (task: DailyTaskItem) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDueDate(task.dueDate || new Date().toISOString().split('T')[0]);
    setFormDueTime(task.dueTime || '02:00 PM');
    setFormPriority(task.priority || 'medium');
    setFormCategory(task.category || (isAr ? CATEGORIES[0].ar : CATEGORIES[0].en));
    setFormNotes(task.notes || '');
    setIsModalOpen(true);
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    onUpdateTasks(updated);
    showReminder(isAr ? 'تم حذف المهمة من قائمة اليوم' : 'Task removed from today’s list');
  };

  // Save task from modal
  const handleSaveTaskForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    let updatedList: DailyTaskItem[];

    if (editingTask) {
      // Edit existing
      updatedList = tasks.map((t) => {
        if (t.id === editingTask.id) {
          return {
            ...t,
            title: formTitle.trim(),
            dueDate: formDueDate.trim(),
            dueTime: formDueTime.trim(),
            priority: formPriority,
            category: formCategory,
            notes: formNotes.trim() || undefined,
          };
        }
        return t;
      });
    } else {
      // Create new
      const newTask: DailyTaskItem = {
        id: `task-${Date.now()}`,
        title: formTitle.trim(),
        dueDate: formDueDate.trim() || new Date().toISOString().split('T')[0],
        dueTime: formDueTime.trim() || '05:00 PM',
        completed: false,
        priority: formPriority,
        category: formCategory,
        notes: formNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      updatedList = [...tasks, newTask];
    }

    onUpdateTasks(updatedList);
    setIsModalOpen(false);
    showReminder(
      editingTask
        ? (isAr ? 'تم تعديل تاريخ وزمن المهمة وموعد التسليم بنجاح' : 'Task date, deadline and details updated')
        : (isAr ? 'تمت إضافة المهمة مع تحديد تاريخ وزمن التسليم بنجاح' : 'New task scheduled with date & time')
    );
  };

  // Quick reminder trigger
  const handleTriggerReminder = () => {
    if (pendingCount === 0) {
      showReminder(
        isAr
          ? '🌟 رائع! لا توجد مهام معلقة لديك اليوم، كل المهام مكتملة.'
          : '🌟 Excellent! All daily tasks are completed.'
      );
      return;
    }

    if (nextTask) {
      showReminder(
        isAr
          ? `⏰ تذكير بموعد التسليم: "${nextTask.title}" موعد تسليمها اليوم الساعة ${nextTask.dueTime}`
          : `⏰ Deadline reminder: "${nextTask.title}" is due today at ${nextTask.dueTime}`
      );
    }
  };

  // Helper for notification toast
  const showReminder = (msg: string) => {
    setReminderToast(msg);
    setTimeout(() => {
      setReminderToast(null);
    }, 3500);
  };

  const getPriorityBadge = (priority: 'high' | 'medium' | 'normal') => {
    switch (priority) {
      case 'high':
        return {
          labelAr: 'أولوية عاجلة',
          labelEn: 'High Priority',
          style: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
          dot: 'bg-[#DC2626]',
        };
      case 'medium':
        return {
          labelAr: 'أولوية متوسطة',
          labelEn: 'Medium Priority',
          style: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
          dot: 'bg-[#D97706]',
        };
      default:
        return {
          labelAr: 'أولوية عادية',
          labelEn: 'Normal',
          style: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
          dot: 'bg-[#64748B]',
        };
    }
  };

  return (
    <div
      id="daily-task-reminder-section"
      className="bg-white border border-[#E5E2D9] rounded-3xl p-5 sm:p-7 shadow-xs space-y-6 relative overflow-hidden transition-all duration-200"
    >
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-[#5E7153]/5 rounded-full blur-2xl pointer-events-none" />

      {/* Floating reminder toast */}
      {reminderToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-[#2D3628] text-white px-4 py-3 rounded-2xl shadow-xl border border-[#5E7153] flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <BellRing className="w-5 h-5 text-[#E9EDD9] shrink-0 animate-bounce" />
          <p className="text-xs sm:text-sm font-medium leading-tight">{reminderToast}</p>
          <button
            onClick={() => setReminderToast(null)}
            className="text-white/60 hover:text-white mr-auto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E2D9]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#5E7153] to-[#45553C] text-white flex items-center justify-center shadow-md shadow-[#5E7153]/20 shrink-0">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-[#2D3628]">
                {isAr ? 'تذكير مهام اليوم ومواعيد التسليم' : 'Daily Tasks & Deadlines Reminder'}
              </h3>
              <span className="text-[11px] font-bold bg-[#E9EDD9] text-[#2D3628] px-2.5 py-0.5 rounded-full border border-[#D9E0D2] font-mono">
                {completedCount}/{totalCount} {isAr ? 'منجز' : 'done'}
              </span>
            </div>
            <p className="text-xs text-[#65635E] mt-0.5">
              {isAr
                ? `قائمة مهام الموظف (${currentUser.name}) المسجلة في تقرير العمل (Standup) لليوم الحالي ومواعيد تسليمها`
                : `Tasks registered for (${currentUser.nameEn}) in today’s standup with designated deadlines`}
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Quick Alarm / Reminder Button */}
          <button
            id="btn-trigger-task-reminder"
            onClick={handleTriggerReminder}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#43423E] border border-[#E5E2D9] text-xs font-semibold transition"
            title={isAr ? 'إرسال تذكير بأقرب موعد تسليم' : 'Send deadline reminder alert'}
          >
            <Bell className="w-3.5 h-3.5 text-[#5E7153]" />
            <span>{isAr ? 'تذكير التسليم' : 'Remind Me'}</span>
          </button>

          {/* AI Standup Sync Button */}
          {onOpenStandupModal && (
            <button
              id="btn-sync-standup-tasks"
              onClick={onOpenStandupModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E9EDD9] hover:bg-[#D9E0D2] text-[#2D3628] border border-[#D9E0D2] text-xs font-semibold transition"
              title={isAr ? 'مزامنة أو صياغة تقرير Standup الذكي' : 'Sync or generate with AI Standup'}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#5E7153]" />
              <span>{isAr ? 'الستاند-أب الذكي' : 'AI Standup'}</span>
            </button>
          )}

          {/* Add Task Button */}
          <button
            id="btn-add-daily-task"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5E7153] hover:bg-[#4E5F44] text-white text-xs font-bold shadow-sm shadow-[#5E7153]/25 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة مهمة' : 'Add Task'}</span>
          </button>
        </div>
      </div>

      {/* 2. Progress & Next Milestone Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 bg-[#FAF9F6] p-4 rounded-2xl border border-[#E5E2D9]">
        
        {/* Progress bar */}
        <div className="space-y-1.5 md:col-span-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#2D3628] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#5E7153]" />
              <span>{isAr ? 'معدل إنجاز خطة اليوم:' : 'Today’s Completion Progress:'}</span>
            </span>
            <span className="font-bold text-[#5E7153] font-mono">{completionPercentage}%</span>
          </div>
          <div className="w-full h-2.5 bg-[#EFECE4] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#5E7153] to-[#809675] rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#65635E]">
            <span>
              {isAr
                ? `${completedCount} مهام منجزة من أصل ${totalCount}`
                : `${completedCount} of ${totalCount} tasks completed`}
            </span>
            <span>
              {pendingCount === 0
                ? isAr
                  ? '✨ اكتملت جميع مهام اليوم بنجاح!'
                  : '✨ All tasks done!'
                : isAr
                ? `متبقي ${pendingCount} مهام للتسليم`
                : `${pendingCount} remaining`}
            </span>
          </div>
        </div>

        {/* Nearest Deadline Quick Pill */}
        <div className="bg-white p-3 rounded-xl border border-[#E5E2D9] flex flex-col justify-center">
          <div className="text-[10px] text-[#65635E] font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#5E7153]" />
            <span>{isAr ? 'أقرب موعد تسليم قادم:' : 'Next Milestone Due:'}</span>
          </div>
          {nextTask ? (
            <div className="mt-1">
              <div className="text-xs font-bold text-[#2D3628] truncate" title={nextTask.title}>
                {nextTask.title}
              </div>
              <div className="text-[11px] font-semibold text-[#5E7153] mt-0.5 flex items-center gap-1">
                <span>{isAr ? 'الموعد المحدد:' : 'Due at:'}</span>
                <span className="bg-[#E9EDD9] px-1.5 py-0.2 rounded text-[#2D3628] font-mono font-bold">
                  {nextTask.dueTime}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs font-bold text-[#5E7153] mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'لا توجد مهام متأخرة' : 'All clear for today'}</span>
            </div>
          )}
        </div>

      </div>

      {/* 3. Filter Pills Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-[#65635E] font-medium flex items-center gap-1 mr-1 ml-1">
            <Filter className="w-3.5 h-3.5" />
            <span>{isAr ? 'تصفية:' : 'Filter:'}</span>
          </span>

          {[
            { id: 'all', labelAr: `جميع المهام (${totalCount})`, labelEn: `All (${totalCount})` },
            { id: 'pending', labelAr: `قيد التنفيذ (${pendingCount})`, labelEn: `Pending (${pendingCount})` },
            { id: 'completed', labelAr: `المكتملة (${completedCount})`, labelEn: `Done (${completedCount})` },
            {
              id: 'high',
              labelAr: `عاجلة (${tasks.filter((t) => t.priority === 'high').length})`,
              labelEn: `High Priority (${tasks.filter((t) => t.priority === 'high').length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`filter-task-${tab.id}`}
              onClick={() => setFilterMode(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${
                filterMode === tab.id
                  ? 'bg-[#2D3628] text-white shadow-xs'
                  : 'bg-[#FAF9F6] text-[#5A5852] border border-[#E5E2D9] hover:bg-[#EFECE4]'
              }`}
            >
              {isAr ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>

        <div className="text-xs text-[#65635E]">
          {isAr
            ? `عرض ${filteredTasks.length} من إجمالي ${totalCount} مهام`
            : `Showing ${filteredTasks.length} of ${totalCount}`}
        </div>
      </div>

      {/* 4. Task Items List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-10 bg-[#FAF9F6] rounded-2xl border border-dashed border-[#E5E2D9] space-y-2">
            <CheckSquare className="w-8 h-8 text-[#65635E]/40 mx-auto" />
            <p className="text-sm font-bold text-[#2D3628]">
              {isAr ? 'لا توجد مهام في هذا التصنيف' : 'No tasks in this view'}
            </p>
            <p className="text-xs text-[#65635E]">
              {isAr
                ? 'يمكنك إضافة مهمة جديدة وتحديد موعد تسليمها لليوم'
                : 'You can add a new task and specify its delivery deadline'}
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-2 px-4 py-2 rounded-xl bg-[#5E7153] text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إضافة مهمة جديدة' : 'Add New Task'}</span>
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const pBadge = getPriorityBadge(task.priority);
            const isDone = task.completed;

            return (
              <div
                key={task.id}
                id={`task-item-${task.id}`}
                className={`group relative rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isDone
                    ? 'bg-[#FAF9F6]/80 border-[#E5E2D9] opacity-80'
                    : 'bg-white border-[#E5E2D9] hover:border-[#5E7153]/50 hover:shadow-xs'
                }`}
              >
                {/* Left: Checkbox + Content */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  
                  {/* Checkbox Button */}
                  <button
                    id={`btn-toggle-task-${task.id}`}
                    type="button"
                    onClick={() => handleToggleComplete(task)}
                    className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 ${
                      isDone
                        ? 'bg-[#5E7153] text-white shadow-xs'
                        : 'border-2 border-[#D9E0D2] bg-white hover:border-[#5E7153] text-transparent'
                    }`}
                    title={isDone ? (isAr ? 'إلغاء الإنجاز' : 'Mark incomplete') : (isAr ? 'تحديد كمنجز' : 'Mark as done')}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    
                    {/* Task Title & Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm sm:text-base font-bold transition ${
                          isDone
                            ? 'line-through text-[#65635E]'
                            : 'text-[#2D3628] group-hover:text-[#5E7153]'
                        }`}
                      >
                        {task.title}
                      </span>

                      {/* Category Tag */}
                      {task.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#EFECE4] text-[#5A5852] border border-[#E5E2D9] font-medium">
                          {task.category}
                        </span>
                      )}

                      {/* Priority Tag */}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border font-semibold ${pBadge.style}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${pBadge.dot}`} />
                        <span>{isAr ? pBadge.labelAr : pBadge.labelEn}</span>
                      </span>
                    </div>

                    {/* Task Notes / Description */}
                    {task.notes && (
                      <p className="text-xs text-[#65635E] leading-relaxed">
                        {task.notes}
                      </p>
                    )}

                    {/* Completion timestamp with date and time if done */}
                    {isDone && task.completedAt && (
                      <div className="text-[11px] text-[#5E7153] font-medium flex items-center gap-1.5 bg-[#E9EDD9]/60 px-2.5 py-1 rounded-lg w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#5E7153]" />
                        <span>{isAr ? `تاريخ ووقت الإنجاز: ${task.completedAt}` : `Completed at: ${task.completedAt}`}</span>
                      </div>
                    )}
                  </div>

                </div>

                {/* Right: Due Date & Time & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5E2D9]">
                  
                  {/* Due Date & Time Pill (تاريخ المهمة مع الزمن) */}
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                      isDone
                        ? 'bg-[#EFECE4] text-[#65635E] border-[#E5E2D9]'
                        : task.priority === 'high'
                        ? 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA] ring-1 ring-[#EF4444]/20'
                        : 'bg-[#E9EDD9] text-[#2D3628] border-[#D9E0D2]'
                    }`}
                    title={isAr ? 'تاريخ وزمن التسليم المحدد' : 'Target delivery date & time'}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#5E7153]" />
                      <span className="font-mono text-[11px]">{task.dueDate || new Date().toISOString().split('T')[0]}</span>
                    </div>
                    <span className="text-stone-400">|</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#5E7153]" />
                      <span className="font-mono text-[11px]">{task.dueTime || '05:00 PM'}</span>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      id={`btn-edit-task-${task.id}`}
                      type="button"
                      onClick={() => handleOpenEdit(task)}
                      className="p-1.5 rounded-lg text-[#65635E] hover:text-[#2D3628] hover:bg-[#EFECE4] transition"
                      title={isAr ? 'تعديل المهمة وموعد التسليم' : 'Edit task details & due time'}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      id={`btn-delete-task-${task.id}`}
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 rounded-lg text-[#65635E] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition"
                      title={isAr ? 'حذف المهمة' : 'Delete task'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>

              </div>
            );
          })
        )}
      </div>

      {/* 5. Modal for Add / Edit Task with Due Times */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D3628]/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white border border-[#E5E2D9] rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-[#43423E] space-y-5 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E2D9]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#5E7153] text-white flex items-center justify-center">
                  {editingTask ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2D3628]">
                    {editingTask
                      ? isAr
                        ? 'تعديل المهمة وموعد التسليم'
                        : 'Edit Task & Deadline'
                      : isAr
                      ? 'إضافة مهمة جديدة لليوم الحالي'
                      : 'Add New Daily Task'}
                  </h3>
                  <p className="text-xs text-[#65635E]">
                    {isAr
                      ? 'حدد تفاصيل المهمة ووقت التسليم المستهدف للموظف'
                      : 'Specify milestone description and target delivery time'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#65635E] hover:text-[#2D3628]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveTaskForm} className="space-y-4">
              
              {/* Task Title */}
              <div>
                <label className="block text-xs font-bold text-[#2D3628] mb-1.5">
                  {isAr ? 'اسم المهمة / المخرج المطلوب تسليمه *' : 'Task Title / Deliverable *'}
                </label>
                <input
                  type="text"
                  id="input-task-title"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={
                    isAr
                      ? 'مثال: إنهاء مراجعة الكود، تسليم مسودة التقرير، اعتماد الطلبات...'
                      : 'e.g. Finish code review, submit draft report...'
                  }
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs sm:text-sm text-[#2D3628] focus:ring-2 focus:ring-[#5E7153] focus:outline-none"
                />
              </div>

              {/* Due Date & Time (تاريخ المهمة وزمنها) */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#2D3628] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#5E7153]" />
                      {isAr ? 'تاريخ المهمة *' : 'Task Date *'}
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          setFormDueDate(today);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#E9EDD9] text-[#2D3628] font-semibold hover:bg-[#D9E0D2] transition"
                      >
                        {isAr ? 'اليوم' : 'Today'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          setFormDueDate(tomorrow.toISOString().split('T')[0]);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E5E2D9] text-[#65635E] font-semibold hover:bg-[#EFECE4] transition"
                      >
                        {isAr ? 'غداً' : 'Tomorrow'}
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    id="input-task-due-date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs sm:text-sm text-[#2D3628] font-mono focus:ring-2 focus:ring-[#5E7153] focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#2D3628] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#5E7153]" />
                      {isAr ? 'زمن الاستحقاق *' : 'Due Time *'}
                    </label>
                    <span className="text-[10px] text-[#65635E]">{isAr ? 'اختر من الأوقات السريعة أدناه' : 'Pick from presets'}</span>
                  </div>
                  <input
                    type="text"
                    id="input-task-due-time"
                    required
                    value={formDueTime}
                    onChange={(e) => setFormDueTime(e.target.value)}
                    placeholder="e.g. 02:30 PM"
                    className="w-full px-3.5 py-2 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs sm:text-sm text-[#2D3628] font-mono focus:ring-2 focus:ring-[#5E7153] focus:outline-none"
                  />
                </div>
              </div>

              {/* Preset Time Pills */}
              <div>
                <label className="block text-[11px] font-semibold text-[#65635E] mb-1">
                  {isAr ? 'أوقات تسليم مقترحة سريعة:' : 'Quick preset times:'}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PRESET_DUE_TIMES.map((time) => (
                    <button
                      type="button"
                      key={time.value}
                      onClick={() => setFormDueTime(time.value)}
                      className={`py-1 px-2 rounded-lg text-[11px] font-semibold border transition ${
                        formDueTime === time.value
                          ? 'bg-[#E9EDD9] border-[#5E7153] text-[#2D3628]'
                          : 'bg-[#FAF9F6] border-[#E5E2D9] text-[#65635E] hover:bg-[#EFECE4]'
                      }`}
                    >
                      {isAr ? time.labelAr : time.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Priority */}
                <div>
                  <label className="block text-xs font-bold text-[#2D3628] mb-1.5">
                    {isAr ? 'مستوى الأولوية' : 'Priority Level'}
                  </label>
                  <select
                    id="select-task-priority"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs sm:text-sm text-[#2D3628] focus:ring-2 focus:ring-[#5E7153] focus:outline-none"
                  >
                    <option value="high">{isAr ? '🔴 أولوية عاجلة (High)' : '🔴 High Priority'}</option>
                    <option value="medium">{isAr ? '🟡 أولوية متوسطة (Medium)' : '🟡 Medium Priority'}</option>
                    <option value="normal">{isAr ? '🟢 أولوية عادية (Normal)' : '🟢 Normal'}</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-[#2D3628] mb-1.5">
                    {isAr ? 'تصنيف المهمة' : 'Category'}
                  </label>
                  <select
                    id="select-task-category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs sm:text-sm text-[#2D3628] focus:ring-2 focus:ring-[#5E7153] focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.en} value={isAr ? cat.ar : cat.en}>
                        {isAr ? cat.ar : cat.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes / Details */}
              <div>
                <label className="block text-xs font-bold text-[#2D3628] mb-1">
                  {isAr ? 'ملاحظات إضافية أو روابط المخرجات (اختياري)' : 'Additional Notes / Deliverable link'}
                </label>
                <textarea
                  rows={2}
                  id="input-task-notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={isAr ? 'أي تفاصيل مساعدة أو روابط...' : 'Any details or deliverables links...'}
                  className="w-full px-3.5 py-2 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs text-[#2D3628] focus:ring-2 focus:ring-[#5E7153] focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E2D9]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#65635E] text-xs font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  id="btn-save-task-submit"
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[#5E7153] hover:bg-[#4E5F44] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#5E7153]/20"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingTask ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'إضافة المهمة' : 'Add Task')}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
