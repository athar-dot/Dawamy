import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Laptop,
  Palmtree,
  Stethoscope,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Users,
  Filter,
  ArrowUpDown,
  Layers,
  AlertTriangle,
  Info,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { LeaveOrWfhRequest, UserProfile } from '../types';
import { INITIAL_USERS } from '../mockData';

interface AnalyticsViewProps {
  requests: LeaveOrWfhRequest[];
  users?: UserProfile[];
  currentUser: UserProfile;
  lang: 'ar' | 'en';
}

interface EmployeeLeaveData {
  id: string;
  name: string;
  department: string;
  role: string;
  avatar: string;
  used: number;
  remaining: number;
  total: number;
  usedPct: number;
  wfhUsed: number;
  wfhRemaining: number;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  requests,
  users = INITIAL_USERS,
  currentUser,
  lang,
}) => {
  const isAr = lang === 'ar';

  // Filters & State
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [chartMode, setChartMode] = useState<'stacked' | 'grouped'>('stacked');
  const [sortBy, setSortBy] = useState<'used_desc' | 'remaining_desc' | 'name'>('used_desc');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeLeaveData | null>(null);

  // Departments list for dropdown
  const departments = useMemo(() => {
    const depts = new Set<string>();
    users.forEach((u) => {
      if (u.department) depts.add(u.department);
    });
    return Array.from(depts);
  }, [users]);

  // Transform employee data for Recharts
  const employeeLeaveData: EmployeeLeaveData[] = useMemo(() => {
    return users.map((user) => {
      const total = user.balances?.annualLeaveTotal ?? 21;
      const used = user.balances?.annualLeaveUsed ?? 0;
      const remaining = Math.max(0, total - used);
      const usedPct = total > 0 ? Math.round((used / total) * 100) : 0;
      const wfhTotal = user.balances?.wfhMonthlyTotal ?? 4;
      const wfhUsed = user.balances?.wfhMonthlyUsed ?? 0;
      const wfhRemaining = Math.max(0, wfhTotal - wfhUsed);

      return {
        id: user.id,
        name: isAr ? user.name : user.nameEn || user.name,
        department: isAr ? user.department : user.departmentEn || user.department,
        role: user.title || user.role,
        avatar: user.avatar,
        used,
        remaining,
        total,
        usedPct,
        wfhUsed,
        wfhRemaining,
      };
    });
  }, [users, isAr]);

  // Filtered & Sorted Data for Recharts
  const filteredData = useMemo(() => {
    let list = employeeLeaveData;
    if (selectedDept !== 'all') {
      list = list.filter((item) => item.department === selectedDept);
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'used_desc') return b.used - a.used;
      if (sortBy === 'remaining_desc') return b.remaining - a.remaining;
      return a.name.localeCompare(b.name);
    });
  }, [employeeLeaveData, selectedDept, sortBy]);

  // Aggregated Overall Stats
  const overallStats = useMemo(() => {
    const totalPool = employeeLeaveData.reduce((sum, e) => sum + e.total, 0);
    const totalUsed = employeeLeaveData.reduce((sum, e) => sum + e.used, 0);
    const totalRemaining = employeeLeaveData.reduce((sum, e) => sum + e.remaining, 0);
    const avgUtilization = totalPool > 0 ? Math.round((totalUsed / totalPool) * 100) : 0;

    // Highest consumer
    const highestConsumer = [...employeeLeaveData].sort((a, b) => b.used - a.used)[0];
    // Highest remaining
    const highestRemaining = [...employeeLeaveData].sort((a, b) => b.remaining - a.remaining)[0];

    return {
      totalPool,
      totalUsed,
      totalRemaining,
      avgUtilization,
      highestConsumer,
      highestRemaining,
    };
  }, [employeeLeaveData]);

  // Donut chart data for company-wide balance
  const pieData = useMemo(() => {
    return [
      {
        name: isAr ? 'أيام الإجازات المستهلكة' : 'Leaves Consumed',
        value: overallStats.totalUsed,
        color: '#C87A5B', // Warm terracotta
      },
      {
        name: isAr ? 'أيام الإجازات المتبقية' : 'Leaves Remaining',
        value: overallStats.totalRemaining,
        color: '#5E7153', // Brand Sage green
      },
    ];
  }, [overallStats, isAr]);

  // Requests breakdown
  const remoteCount = requests.filter((r) => r.type === 'remote' && r.status === 'approved').length;
  const annualCount = requests.filter((r) => r.type === 'annual_leave' && r.status === 'approved').length;
  const sickCount = requests.filter((r) => r.type === 'sick_leave' && r.status === 'approved').length;
  const approvedTotal = requests.filter((r) => r.status === 'approved').length;

  // Weekdays distribution
  const daysDist = [
    { dayAr: 'الأحد', dayEn: 'Sun', count: 4, percent: 40 },
    { dayAr: 'الإثنين', dayEn: 'Mon', count: 2, percent: 20 },
    { dayAr: 'الثلاثاء', dayEn: 'Tue', count: 3, percent: 30 },
    { dayAr: 'الأربعاء', dayEn: 'Wed', count: 5, percent: 50 },
    { dayAr: 'الخميس', dayEn: 'Thu', count: 8, percent: 80 },
  ];

  const handleExportCSV = () => {
    const headers = isAr
      ? 'اسم الموظف,القسم,المسمى الوظيفي,إجمالي رصيد الإجازات,الأيام المستهلكة,الأيام المتبقية,نسبة الاستهلاك%\n'
      : 'Employee,Department,Role,Total Balance,Used Days,Remaining Days,Utilization%\n';

    const rows = employeeLeaveData
      .map(
        (e) =>
          `"${e.name}","${e.department}","${e.role}",${e.total},${e.used},${e.remaining},${e.usedPct}%`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dawamy-leaves-distribution-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom Recharts Tooltip for Employee Leave Chart
  const CustomEmployeeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as EmployeeLeaveData;
      return (
        <div className="bg-[#2D3628] text-white p-3.5 rounded-2xl shadow-xl border border-[#5E7153] text-xs space-y-2 min-w-[220px]">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#5E7153]/40">
            <img
              src={data.avatar}
              alt={data.name}
              className="w-8 h-8 rounded-full border border-white/20 object-cover"
            />
            <div>
              <div className="font-bold text-sm text-white">{data.name}</div>
              <div className="text-[11px] text-[#D9E0D2]">{data.department} • {data.role}</div>
            </div>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#E5AA70]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#C87A5B]" />
                <span>{isAr ? 'الإجازات المستهلكة:' : 'Used Leaves:'}</span>
              </span>
              <span className="font-bold font-mono">{data.used} {isAr ? 'يوم' : 'days'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#D9E0D2]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#5E7153]" />
                <span>{isAr ? 'الرصيد المتبقي:' : 'Remaining Balance:'}</span>
              </span>
              <span className="font-bold font-mono text-[#E9EDD9]">{data.remaining} {isAr ? 'يوم' : 'days'}</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px]">
              <span className="text-[#C8C4B7]">{isAr ? 'إجمالي الرصيد السنوي:' : 'Total Annual:'}</span>
              <span className="font-bold">{data.total} {isAr ? 'يوم' : 'days'} ({data.usedPct}% {isAr ? 'مستهلك' : 'used'})</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      
      {/* 1. Header Banner */}
      <div className="bg-white border border-[#E5E2D9] rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#5E7153] to-[#45553C] text-white flex items-center justify-center shadow-md shadow-[#5E7153]/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#2D3628]">
                {isAr ? 'التقارير التحليلية ورصد أرصدة الإجازات' : 'Analytics & Leave Balance Monitoring'}
              </h3>
              <p className="text-xs text-[#65635E] mt-0.5">
                {isAr
                  ? 'متابعة تفاعلية لتوزيع الإجازات المستهلكة مقابل المتبقية لكل موظف ومؤشرات الالتزام'
                  : 'Interactive Recharts dashboard tracking used vs. remaining leaves per employee'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          id="btn-export-analytics-csv"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#2D3628] border border-[#E5E2D9] text-xs sm:text-sm font-bold shadow-xs transition"
        >
          <Download className="w-4 h-4 text-[#5E7153]" />
          <span>{isAr ? 'تصدير جدول الإجازات (CSV)' : 'Export CSV Report'}</span>
        </button>
      </div>

      {/* 2. Management KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leaves in Pool */}
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9] text-[#2D3628] flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 text-[#5E7153]" />
          </div>
          <div>
            <span className="text-xs text-[#65635E] font-medium block">
              {isAr ? 'إجمالي الرصيد السنوي للفريق' : 'Total Company Leave Pool'}
            </span>
            <div className="text-2xl font-black text-[#2D3628] font-mono mt-0.5">
              {overallStats.totalPool} <span className="text-xs font-normal text-[#65635E]">{isAr ? 'يوم' : 'days'}</span>
            </div>
            <span className="text-[11px] text-[#5E7153] font-semibold mt-0.5 block">
              {users.length} {isAr ? 'موظفين مسجلين' : 'registered staff'}
            </span>
          </div>
        </div>

        {/* Total Leaves Consumed */}
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FDF3E7] border border-[#E5AA70] text-[#8C5A28] flex items-center justify-center shrink-0">
            <Palmtree className="w-6 h-6 text-[#C87A5B]" />
          </div>
          <div>
            <span className="text-xs text-[#65635E] font-medium block">
              {isAr ? 'الأيام المستهلكة (المأخوذة)' : 'Total Leaves Consumed'}
            </span>
            <div className="text-2xl font-black text-[#C87A5B] font-mono mt-0.5">
              {overallStats.totalUsed} <span className="text-xs font-normal text-[#65635E]">{isAr ? 'يوم' : 'days'}</span>
            </div>
            <span className="text-[11px] text-[#C87A5B] font-semibold mt-0.5 block">
              {overallStats.avgUtilization}% {isAr ? 'متوسط استهلاك المنظمة' : 'average utilization'}
            </span>
          </div>
        </div>

        {/* Total Leaves Remaining */}
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#E9EDD9] border border-[#D9E0D2] text-[#2D3628] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#5E7153]" />
          </div>
          <div>
            <span className="text-xs text-[#65635E] font-medium block">
              {isAr ? 'الأيام المتبقية المتاحة' : 'Total Leaves Remaining'}
            </span>
            <div className="text-2xl font-black text-[#5E7153] font-mono mt-0.5">
              {overallStats.totalRemaining} <span className="text-xs font-normal text-[#65635E]">{isAr ? 'يوم' : 'days'}</span>
            </div>
            <span className="text-[11px] text-[#5E7153] font-semibold mt-0.5 block">
              {100 - overallStats.avgUtilization}% {isAr ? 'رصيد متاح للاستخدام' : 'balance available'}
            </span>
          </div>
        </div>

        {/* Highest Consumption Indicator */}
        <div className="bg-white border border-[#E5E2D9] rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9] text-[#2D3628] flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-[#5E7153]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-[#65635E] font-medium block truncate">
              {isAr ? 'الأعلى استهلاكاً للإجازات' : 'Top Leave Consumer'}
            </span>
            <div className="text-base font-bold text-[#2D3628] truncate mt-0.5">
              {overallStats.highestConsumer?.name || '-'}
            </div>
            <span className="text-[11px] text-[#65635E] block truncate">
              {overallStats.highestConsumer?.used} {isAr ? 'يوم مستهلك' : 'days used'} ({overallStats.highestConsumer?.remaining} {isAr ? 'متبقي' : 'left'})
            </span>
          </div>
        </div>
      </div>

      {/* 3. CORE FEATURE: Interactive Recharts Bar Chart (Used vs. Remaining per Employee) */}
      <div className="bg-white border border-[#E5E2D9] rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
        
        {/* Controls Toolbar: Title, Department Filter, Mode Toggle, Sorting */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#E5E2D9]">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base sm:text-lg font-bold text-[#2D3628]">
                {isAr ? 'توزيع أيام الإجازات المستهلكة مقابل المتبقية لكل موظف' : 'Leave Balance Distribution: Consumed vs Remaining'}
              </h4>
              <span className="text-xs font-bold bg-[#E9EDD9] text-[#2D3628] px-2.5 py-0.5 rounded-full border border-[#D9E0D2]">
                {filteredData.length} {isAr ? 'موظف' : 'staff'}
              </span>
            </div>
            <p className="text-xs text-[#65635E] mt-0.5">
              {isAr
                ? 'رسم بياني تفاعلي يتيح لإدارة الموارد البشرية والمديرين مراقبة استهلاك الأرصدة بدقة وتفادي استنزاف الإجازات'
                : 'Interactive chart enabling HR & leadership to monitor annual leave usage and prevent balance depletion'}
            </p>
          </div>

          {/* Controls Group */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* Department Filter */}
            <div className="flex items-center gap-1.5 text-xs bg-[#FAF9F6] border border-[#E5E2D9] px-2.5 py-1.5 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-[#5E7153]" />
              <select
                id="select-analytics-department"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-transparent font-semibold text-[#2D3628] focus:outline-none cursor-pointer"
              >
                <option value="all">{isAr ? 'جميع الأقسام' : 'All Departments'}</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Sorting Filter */}
            <div className="flex items-center gap-1.5 text-xs bg-[#FAF9F6] border border-[#E5E2D9] px-2.5 py-1.5 rounded-xl">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#5E7153]" />
              <select
                id="select-analytics-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent font-semibold text-[#2D3628] focus:outline-none cursor-pointer"
              >
                <option value="used_desc">{isAr ? 'الأعلى استهلاكاً' : 'Most Used'}</option>
                <option value="remaining_desc">{isAr ? 'الأعلى رصيداً متبقياً' : 'Highest Remaining'}</option>
                <option value="name">{isAr ? 'أبجدياً' : 'Alphabetical'}</option>
              </select>
            </div>

            {/* Chart Mode Toggle (Stacked vs Grouped) */}
            <div className="flex items-center bg-[#FAF9F6] border border-[#E5E2D9] p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                id="btn-chart-mode-stacked"
                onClick={() => setChartMode('stacked')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  chartMode === 'stacked'
                    ? 'bg-[#2D3628] text-white shadow-xs'
                    : 'text-[#65635E] hover:text-[#2D3628]'
                }`}
              >
                {isAr ? 'مكدس (Stacked)' : 'Stacked'}
              </button>
              <button
                type="button"
                id="btn-chart-mode-grouped"
                onClick={() => setChartMode('grouped')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  chartMode === 'grouped'
                    ? 'bg-[#2D3628] text-white shadow-xs'
                    : 'text-[#65635E] hover:text-[#2D3628]'
                }`}
              >
                {isAr ? 'متجاور (Grouped)' : 'Grouped'}
              </button>
            </div>

          </div>
        </div>

        {/* Legend Indicator */}
        <div className="flex items-center justify-between text-xs flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-[#C87A5B]" />
              <span className="font-semibold text-[#2D3628]">{isAr ? 'الأيام المستهلكة (Used)' : 'Consumed Days'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-[#5E7153]" />
              <span className="font-semibold text-[#2D3628]">{isAr ? 'الأيام المتبقية (Remaining)' : 'Remaining Days'}</span>
            </div>
          </div>

          <div className="text-[11px] text-[#65635E]">
            {isAr ? '💡 حرك مؤشر الفأرة فوق أي عمود لعرض تفاصيل الموظف ومعدل الاستهلاك' : '💡 Hover over any bar to view employee details & utilization rate'}
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-80 sm:h-96 w-full pt-2" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredData}
              margin={{ top: 15, right: 20, left: 0, bottom: 25 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E2D9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#43423E', fontSize: 11, fontWeight: 600 }}
                axisLine={{ stroke: '#E5E2D9' }}
                tickLine={false}
                interval={0}
                angle={filteredData.length > 5 ? -15 : 0}
                textAnchor={filteredData.length > 5 ? 'end' : 'middle'}
              />
              <YAxis
                tick={{ fill: '#65635E', fontSize: 11 }}
                axisLine={{ stroke: '#E5E2D9' }}
                tickLine={false}
                unit=" d"
              />
              <Tooltip content={<CustomEmployeeTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
                formatter={(value) => (
                  <span className="text-[#2D3628] font-semibold text-xs">
                    {value === 'used'
                      ? (isAr ? 'الأيام المستهلكة' : 'Consumed Days')
                      : (isAr ? 'الأيام المتبقية' : 'Remaining Days')}
                  </span>
                )}
              />
              
              <Bar
                dataKey="used"
                name="used"
                stackId={chartMode === 'stacked' ? 'a' : undefined}
                fill="#C87A5B"
                radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                maxBarSize={45}
              />
              <Bar
                dataKey="remaining"
                name="remaining"
                stackId={chartMode === 'stacked' ? 'a' : undefined}
                fill="#5E7153"
                radius={[6, 6, 0, 0]}
                maxBarSize={45}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* 4. Secondary Analytics Grid: Donut Ratio & Approved Requests Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Donut Chart: Company-wide Leave Balance (Consumed vs. Remaining) */}
        <div className="bg-white border border-[#E5E2D9] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9]">
            <div>
              <h4 className="font-bold text-sm sm:text-base text-[#2D3628] flex items-center gap-2">
                <Palmtree className="w-4 h-4 text-[#5E7153]" />
                <span>{isAr ? 'نسبة استهلاك الإجازات الكلية في المنظمة' : 'Company Leave Pool Allocation'}</span>
              </h4>
              <p className="text-[11px] text-[#65635E] mt-0.5">
                {isAr ? 'مقارنة إجمالي الأيام المستهلكة مقابل الرصيد المتبقي لكافة الموظفين' : 'Total leaves consumed vs remaining across entire staff'}
              </p>
            </div>
            <span className="text-xs font-bold text-[#2D3628] bg-[#E9EDD9] px-2.5 py-1 rounded-lg border border-[#D9E0D2] font-mono">
              {overallStats.avgUtilization}% {isAr ? 'مستهلك' : 'used'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
            
            {/* Recharts PieChart */}
            <div className="w-44 h-44 shrink-0" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} ${isAr ? 'يوم' : 'days'}`]}
                    contentStyle={{
                      backgroundColor: '#2D3628',
                      borderColor: '#5E7153',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Explanatory Legend */}
            <div className="space-y-3 flex-1 min-w-[200px]">
              <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#2D3628] flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-[#C87A5B]" />
                    <span>{isAr ? 'إجمالي الإجازات المستهلكة:' : 'Total Consumed:'}</span>
                  </span>
                  <span className="font-bold text-[#C87A5B] font-mono">{overallStats.totalUsed} {isAr ? 'يوم' : 'days'}</span>
                </div>
                <div className="text-[11px] text-[#65635E]">
                  {isAr ? `يمثل ${overallStats.avgUtilization}% من إجمالي رصيد المنظمة السنوي` : `${overallStats.avgUtilization}% of annual organization pool`}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#E9EDD9]/40 border border-[#D9E0D2] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#2D3628] flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-[#5E7153]" />
                    <span>{isAr ? 'إجمالي الرصيد المتبقي:' : 'Total Remaining:'}</span>
                  </span>
                  <span className="font-bold text-[#5E7153] font-mono">{overallStats.totalRemaining} {isAr ? 'يوم' : 'days'}</span>
                </div>
                <div className="text-[11px] text-[#65635E]">
                  {isAr ? `يمثل ${100 - overallStats.avgUtilization}% رصيد جاهز للتخطيط والإجازات القادمة` : `${100 - overallStats.avgUtilization}% available for future scheduling`}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Requests & Compliance Breakdown */}
        <div className="bg-white border border-[#E5E2D9] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9]">
            <div>
              <h4 className="font-bold text-sm sm:text-base text-[#2D3628] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#5E7153]" />
                <span>{isAr ? 'توزيع الطلبات المعتمدة حسب النوع' : 'Approved Requests by Category'}</span>
              </h4>
              <p className="text-[11px] text-[#65635E] mt-0.5">
                {isAr ? 'حجم الطلبات السارية والمعتمدة في سجلات المنظومة' : 'Active and approved requests in system records'}
              </p>
            </div>
            <span className="text-xs font-bold text-[#43423E] bg-[#FAF9F6] px-2.5 py-1 rounded-lg border border-[#E5E2D9]">
              {approvedTotal} {isAr ? 'طلب معتمد' : 'Approved Total'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-4 rounded-2xl bg-[#E9EDD9]/40 border border-[#D9E0D2]">
              <span className="text-xs text-[#5E7153] font-semibold block mb-1">
                {isAr ? 'العمل عن بُعد WFH' : 'Remote Work WFH'}
              </span>
              <span className="text-2xl font-black text-[#2D3628]">{remoteCount}</span>
              <span className="text-[10px] text-[#65635E] block mt-1">
                {isAr ? 'أيام عمل مرنة مسجلة' : 'Logged flexible days'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#E2EDF8]/60 border border-[#BFDBFE]">
              <span className="text-xs text-[#1E40AF] font-semibold block mb-1">
                {isAr ? 'الإجازات السنوية' : 'Annual Leaves'}
              </span>
              <span className="text-2xl font-black text-[#2D3628]">{annualCount}</span>
              <span className="text-[10px] text-[#65635E] block mt-1">
                {isAr ? 'تغطية المهام معتمدة' : 'Coverage confirmed'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FDF3E7] border border-[#E5AA70]">
              <span className="text-xs text-[#8C5A28] font-semibold block mb-1">
                {isAr ? 'الإجازات المرضية' : 'Sick Leaves'}
              </span>
              <span className="text-2xl font-black text-[#2D3628]">{sickCount}</span>
              <span className="text-[10px] text-[#65635E] block mt-1">
                {isAr ? 'تقارير طبية معتمدة' : 'Verified certificates'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9]">
              <span className="text-xs text-[#5E7153] font-semibold block mb-1">
                {isAr ? 'معدل الامتثال للائحة' : 'Compliance Rate'}
              </span>
              <span className="text-2xl font-black text-[#5E7153]">99.4%</span>
              <span className="text-[10px] text-[#65635E] block mt-1">
                {isAr ? 'وفق ضوابط الحضور والغياب' : 'Aligned with labor policy'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 5. Detailed Employee Table with Progress Bars */}
      <div className="bg-white border border-[#E5E2D9] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9]">
          <div>
            <h4 className="font-bold text-sm sm:text-base text-[#2D3628] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#5E7153]" />
              <span>{isAr ? 'جدول المتابعة التفصيلي لأرصدة موظفي الفريق' : 'Detailed Employee Leave Balance Sheet'}</span>
            </h4>
            <p className="text-[11px] text-[#65635E] mt-0.5">
              {isAr ? 'عرض مباشر لأيام الإجازة المستهلكة، الأيام المتبقية، ورصيد العمل عن بُعد' : 'Direct breakdown of consumed leave, remaining balance, and WFH allowance'}
            </p>
          </div>
          <span className="text-xs text-[#65635E]">
            {isAr ? `إجمالي ${filteredData.length} موظف` : `Total ${filteredData.length} employees`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#FAF9F6] text-[#65635E] border-b border-[#E5E2D9]">
                <th className="py-3 px-4 font-bold">{isAr ? 'الموظف' : 'Employee'}</th>
                <th className="py-3 px-4 font-bold">{isAr ? 'القسم والمسمى' : 'Dept & Role'}</th>
                <th className="py-3 px-4 font-bold">{isAr ? 'المستهلك' : 'Consumed'}</th>
                <th className="py-3 px-4 font-bold">{isAr ? 'المتبقي' : 'Remaining'}</th>
                <th className="py-3 px-4 font-bold">{isAr ? 'معدل الاستهلاك' : 'Utilization'}</th>
                <th className="py-3 px-4 font-bold">{isAr ? 'عن بُعد الشهري' : 'WFH Monthly'}</th>
                <th className="py-3 px-4 font-bold text-center">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2D9]">
              {filteredData.map((emp) => {
                const isHighConsumption = emp.usedPct >= 70;
                const isLowBalance = emp.remaining <= 3;

                return (
                  <tr
                    key={emp.id}
                    className="hover:bg-[#FAF9F6] transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={emp.avatar}
                          alt={emp.name}
                          className="w-9 h-9 rounded-xl border border-[#E5E2D9] object-cover shrink-0"
                        />
                        <div>
                          <div className="font-bold text-[#2D3628] text-sm">{emp.name}</div>
                          <div className="text-[11px] text-[#65635E]">{emp.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#2D3628]">{emp.department}</div>
                      <div className="text-[11px] text-[#65635E]">{emp.role}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#C87A5B]">
                      {emp.used} <span className="text-[10px] text-[#65635E] font-normal">{isAr ? 'يوم' : 'd'}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#5E7153]">
                      {emp.remaining} <span className="text-[10px] text-[#65635E] font-normal">{isAr ? 'يوم' : 'd'}</span>
                    </td>

                    <td className="py-3.5 px-4 w-44">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-semibold text-[#2D3628] font-mono">{emp.usedPct}%</span>
                          <span className="text-[#65635E] font-mono">{emp.used}/{emp.total}</span>
                        </div>
                        <div className="w-full h-2 bg-[#EFECE4] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isHighConsumption ? 'bg-[#C87A5B]' : 'bg-[#5E7153]'
                            }`}
                            style={{ width: `${emp.usedPct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 bg-[#FAF9F6] border border-[#E5E2D9] px-2.5 py-1 rounded-lg text-xs font-mono">
                        <span className="font-bold text-[#2D3628]">{emp.wfhUsed}</span>
                        <span className="text-[#65635E]">/ {emp.wfhUsed + emp.wfhRemaining} {isAr ? 'يوم' : 'd'}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {isLowBalance ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{isAr ? 'رصيد منخفض' : 'Low Balance'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]">
                          <CheckCircle2 className="w-3 h-3 text-[#5E7153]" />
                          <span>{isAr ? 'رصيد متزن' : 'Balanced'}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
