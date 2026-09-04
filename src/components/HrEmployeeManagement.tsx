import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Building2,
  Mail,
  Briefcase,
  ChevronRight,
  Search,
  Filter,
  Trash2,
  Edit3,
  CheckCircle2,
  X,
  Sparkles,
  Database,
  ArrowRightLeft,
  Calendar,
  Layers,
  Phone,
  Clock,
  LogIn,
  AlertTriangle,
  Network,
  Check,
  Award,
  FileSpreadsheet,
  Fingerprint,
} from 'lucide-react';
import { UserProfile, UserRole, WorkStatus } from '../types';
import { BulkBalanceImportModal } from './BulkBalanceImportModal';

interface HrEmployeeManagementProps {
  users: UserProfile[];
  currentUser: UserProfile;
  onAddEmployee: (employee: UserProfile) => Promise<boolean | void>;
  onUpdateEmployee: (userId: string, data: Partial<UserProfile>) => Promise<boolean | void>;
  onDeleteEmployee: (userId: string) => Promise<boolean | void>;
  onBatchUpdateBalances?: (updates: { userId: string; balances: UserProfile['balances'] }[]) => Promise<void>;
  onSelectUser: (user: UserProfile) => void;
  lang: 'ar' | 'en';
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
];

const DEPARTMENTS = [
  { ar: 'الهندسة والتطوير', en: 'Engineering' },
  { ar: 'الموارد البشرية والعمليات', en: 'People & HR' },
  { ar: 'المنتج والتصميم', en: 'Product & Design' },
  { ar: 'التسويق والتواصل', en: 'Marketing & Comms' },
  { ar: 'المالية والمحاسبة', en: 'Finance & Accounting' },
  { ar: 'خدمة العملاء والنجاح', en: 'Customer Success' },
  { ar: 'المبيعات وتطوير الأعمال', en: 'Sales & BD' },
];

export const HrEmployeeManagement: React.FC<HrEmployeeManagementProps> = ({
  users,
  currentUser,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onBatchUpdateBalances,
  onSelectUser,
  lang,
}) => {
  const isAr = lang === 'ar';

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'hierarchy'>('cards');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    nameEn: string;
    email: string;
    phone: string;
    biometricEnrollId: string;
    role: UserRole;
    title: string;
    titleEn: string;
    department: string;
    departmentEn: string;
    managerName: string;
    managerId: string;
    wfhMonthlyTotal: number;
    annualLeaveTotal: number;
    avatar: string;
  }>({
    name: '',
    nameEn: '',
    email: '',
    phone: '',
    biometricEnrollId: '',
    role: 'employee',
    title: '',
    titleEn: '',
    department: DEPARTMENTS[0].ar,
    departmentEn: DEPARTMENTS[0].en,
    managerName: '',
    managerId: '',
    wfhMonthlyTotal: 8,
    annualLeaveTotal: 25,
    avatar: PRESET_AVATARS[0],
  });

  // Extract list of managers
  const availableManagers = useMemo(() => {
    return users.filter((u) => u.role === 'manager' || u.role === 'hr');
  }, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      // Department filter
      if (departmentFilter !== 'all' && !(u.department || '').includes(departmentFilter) && !(u.departmentEn || '').includes(departmentFilter)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = (u.name || '').toLowerCase().includes(query) || (u.nameEn || '').toLowerCase().includes(query);
        const matchesEmail = (u.email || '').toLowerCase().includes(query);
        const matchesTitle = (u.title || '').toLowerCase().includes(query) || (u.titleEn || '').toLowerCase().includes(query);
        const matchesManager = (u.managerName || '').toLowerCase().includes(query);
        const matchesDept = (u.department || '').toLowerCase().includes(query);
        return matchesName || matchesEmail || matchesTitle || matchesManager || matchesDept;
      }
      return true;
    });
  }, [users, roleFilter, departmentFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const managers = users.filter((u) => u.role === 'manager').length;
    const hrCount = users.filter((u) => u.role === 'hr').length;
    const employees = users.filter((u) => u.role === 'employee').length;
    return { total, managers, hrCount, employees };
  }, [users]);

  // Group by Direct Manager for Hierarchy View
  const hierarchyData = useMemo(() => {
    const managersMap: {
      [managerName: string]: {
        managerProfile?: UserProfile;
        reports: UserProfile[];
      };
    } = {};

    users.forEach((u) => {
      const mgr = u.managerName || (isAr ? 'الإدارة العامة' : 'General Management');
      if (!managersMap[mgr]) {
        const foundManager = users.find((m) => m.name === mgr || m.nameEn === mgr);
        managersMap[mgr] = {
          managerProfile: foundManager,
          reports: [],
        };
      }
      managersMap[mgr].reports.push(u);
    });

    return managersMap;
  }, [users, isAr]);

  // Open modal for new employee
  const handleOpenNewModal = () => {
    setEditingUserId(null);
    const defaultManager = availableManagers[0]?.name || 'م. طارق الخالدي';
    const defaultManagerId = availableManagers[0]?.id || '';

    setFormData({
      name: '',
      nameEn: '',
      email: '',
      phone: '',
      biometricEnrollId: '',
      role: 'employee',
      title: isAr ? 'مهندس برمجيات' : 'Software Engineer',
      titleEn: 'Software Engineer',
      department: DEPARTMENTS[0].ar,
      departmentEn: DEPARTMENTS[0].en,
      managerName: defaultManager,
      managerId: defaultManagerId,
      wfhMonthlyTotal: 8,
      annualLeaveTotal: 25,
      avatar: PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)],
    });
    setIsModalOpen(true);
  };

  // Open modal for editing employee
  const handleOpenEditModal = (user: UserProfile) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      nameEn: user.nameEn || user.name,
      email: user.email || '',
      phone: user.phone || '',
      biometricEnrollId: user.biometricEnrollId || '',
      role: user.role,
      title: user.title,
      titleEn: user.titleEn || user.title,
      department: user.department,
      departmentEn: user.departmentEn || 'Engineering',
      managerName: user.managerName || '',
      managerId: user.managerId || '',
      wfhMonthlyTotal: user.balances?.wfhMonthlyTotal || 8,
      annualLeaveTotal: user.balances?.annualLeaveTotal || 25,
      avatar: user.avatar,
    });
    setIsModalOpen(true);
  };

  // Submit employee form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUserId) {
        // Update existing user
        const existingUser = users.find((u) => u.id === editingUserId);
        await onUpdateEmployee(editingUserId, {
          name: formData.name.trim(),
          nameEn: formData.nameEn.trim() || formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          biometricEnrollId: formData.biometricEnrollId.trim() || undefined,
          role: formData.role,
          title: formData.title.trim(),
          titleEn: formData.titleEn.trim() || formData.title.trim(),
          department: formData.department,
          departmentEn: formData.departmentEn,
          managerName: formData.managerName,
          managerId: formData.managerId,
          avatar: formData.avatar,
          balances: {
            wfhMonthlyTotal: Number(formData.wfhMonthlyTotal) || 8,
            wfhMonthlyUsed: existingUser?.balances?.wfhMonthlyUsed || 0,
            annualLeaveTotal: Number(formData.annualLeaveTotal) || 25,
            annualLeaveUsed: existingUser?.balances?.annualLeaveUsed || 0,
            sickLeaveUsed: existingUser?.balances?.sickLeaveUsed || 0,
            emergencyLeaveUsed: existingUser?.balances?.emergencyLeaveUsed || 0,
          },
        });
      } else {
        // Create new user
        const newId = `emp-${Date.now()}`;
        const newEmployee: UserProfile = {
          id: newId,
          name: formData.name.trim(),
          nameEn: formData.nameEn.trim() || formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          biometricEnrollId: formData.biometricEnrollId.trim() || undefined,
          role: formData.role,
          title: formData.title.trim() || (isAr ? 'موظف' : 'Employee'),
          titleEn: formData.titleEn.trim() || 'Employee',
          department: formData.department,
          departmentEn: formData.departmentEn,
          managerName: formData.managerName || (isAr ? 'الإدارة المباشرة' : 'Direct Management'),
          managerId: formData.managerId,
          avatar: formData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=5E7153&color=fff&bold=true`,
          balances: {
            wfhMonthlyTotal: Number(formData.wfhMonthlyTotal) || 8,
            wfhMonthlyUsed: 0,
            annualLeaveTotal: Number(formData.annualLeaveTotal) || 25,
            annualLeaveUsed: 0,
            sickLeaveUsed: 0,
            emergencyLeaveUsed: 0,
          },
          todayStatus: 'in_office' as WorkStatus,
          createdAt: new Date().toISOString(),
        };

        await onAddEmployee(newEmployee);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving employee:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Role Toggle
  const handleQuickToggleRole = async (user: UserProfile) => {
    const newRole: UserRole = user.role === 'employee' ? 'manager' : 'employee';
    await onUpdateEmployee(user.id, {
      role: newRole,
      title:
        newRole === 'manager'
          ? (isAr ? `مدير فريق (${user.department})` : `Team Lead (${user.departmentEn || 'Dept'})`)
          : (isAr ? `أخصائي (${user.department})` : `Specialist (${user.departmentEn || 'Dept'})`),
    });
  };

  // Handle Delete Confirmation
  const handleDeleteUser = async (userId: string) => {
    setIsSubmitting(true);
    try {
      await onDeleteEmployee(userId);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* 1. Header & Overview Banner */}
      <div className="bg-gradient-to-r from-[#FAF9F6] via-[#E9EDD9]/40 to-[#FAF9F6] border border-[#D9E0D2] rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#5E7153] text-white">
                <Users className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold text-[#5E7153] uppercase tracking-wider bg-[#E9EDD9] px-2.5 py-1 rounded-full border border-[#D9E0D2]">
                {isAr ? 'لوحة تحكم مدير النظام والموارد البشرية (HR)' : 'HR & System Admin Portal'}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#2D3628] bg-white px-2 py-0.5 rounded-md border border-[#E5E2D9] font-mono">
                <Database className="w-3 h-3 text-[#5E7153]" />
                <span>Firestore: /users</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2D3628] tracking-tight">
              {isAr ? 'إدارة الموظفين وهيكل الإشراف' : 'Employee Directory & Hierarchy'}
            </h2>
            <p className="text-sm text-[#5A5852] max-w-2xl leading-relaxed">
              {isAr
                ? 'إضافة موظفين جدد، وتحديد عناوين البريد الإلكتروني، وتعيين الأدوار (موظف أو مدير)، وربط كل موظف بمديره المباشر مع الحفظ والمزامنة المباشرة في Firestore.'
                : 'Add new employees, configure emails, assign roles (employee or manager), and link direct reporting managers with real-time Firestore persistence.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-bulk-import-excel"
              onClick={() => setIsBulkImportOpen(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white hover:bg-[#FAF9F6] border border-[#D9E0D2] text-[#2D3628] font-bold text-sm shadow-xs transition-all transform active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#5E7153]" />
              <span>{isAr ? 'استيراد رصيد الإجازات من إكسيل' : 'Bulk Leave Import (Excel)'}</span>
            </button>

            <button
              id="btn-add-new-employee"
              onClick={handleOpenNewModal}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#5E7153] to-[#45553C] hover:from-[#4D5E44] hover:to-[#384532] text-white font-bold text-sm shadow-md shadow-[#5E7153]/25 transition-all transform active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isAr ? 'إضافة موظف جديد' : 'Add New Employee'}</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-[#E5E2D9]">
          <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-[#E5E2D9]">
            <div className="text-[11px] font-semibold text-[#65635E]">
              {isAr ? 'إجمالي الموظفين' : 'Total Employees'}
            </div>
            <div className="text-2xl font-extrabold text-[#2D3628] mt-1 flex items-baseline gap-1">
              <span>{stats.total}</span>
              <span className="text-xs font-normal text-[#65635E]">{isAr ? 'عضو' : 'members'}</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-[#E5E2D9]">
            <div className="text-[11px] font-semibold text-[#65635E]">
              {isAr ? 'المدراء المباشرون' : 'Direct Managers'}
            </div>
            <div className="text-2xl font-extrabold text-[#5E7153] mt-1 flex items-baseline gap-1">
              <span>{stats.managers}</span>
              <span className="text-xs font-normal text-[#65635E]">{isAr ? 'مدير' : 'leads'}</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-[#E5E2D9]">
            <div className="text-[11px] font-semibold text-[#65635E]">
              {isAr ? 'فريق الموارد البشرية' : 'HR Specialists'}
            </div>
            <div className="text-2xl font-extrabold text-[#1E40AF] mt-1 flex items-baseline gap-1">
              <span>{stats.hrCount}</span>
              <span className="text-xs font-normal text-[#65635E]">HR</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-[#E5E2D9]">
            <div className="text-[11px] font-semibold text-[#65635E]">
              {isAr ? 'مزامنة Firestore' : 'Firestore Sync'}
            </div>
            <div className="text-sm font-bold text-[#2D3628] mt-1.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5E7153] animate-pulse" />
              <span>{isAr ? 'نشط ولحظي' : 'Active Live'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Search, Filter & View Controls */}
      <div className="bg-[#FAF9F6] border border-[#E5E2D9] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-[#65635E]`} />
            <input
              type="text"
              id="input-search-employees"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isAr
                  ? 'البحث بالاسم، البريد الإلكتروني، المسمى، أو اسم المدير المباشر...'
                  : 'Search by name, email, title, or direct manager...'
              }
              className={`w-full ${
                isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'
              } py-2.5 text-xs sm:text-sm bg-white border border-[#E5E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E7153] focus:border-transparent transition text-[#2D3628]`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute ${isAr ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-xs text-[#65635E] hover:text-[#2D3628]`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#EFECE4] p-1 rounded-xl border border-[#E5E2D9] self-start md:self-auto">
            <button
              id="btn-view-cards"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'cards'
                  ? 'bg-[#5E7153] text-white shadow-sm'
                  : 'text-[#65635E] hover:text-[#2D3628]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isAr ? 'بطاقات الموظفين' : 'Cards'}</span>
            </button>
            <button
              id="btn-view-hierarchy"
              onClick={() => setViewMode('hierarchy')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'hierarchy'
                  ? 'bg-[#5E7153] text-white shadow-sm'
                  : 'text-[#65635E] hover:text-[#2D3628]'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>{isAr ? 'الهيكل الإداري' : 'Hierarchy Tree'}</span>
            </button>
          </div>

        </div>

        {/* Role & Department Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E2D9]/60 text-xs">
          <span className="text-[#65635E] font-medium flex items-center gap-1 ml-1 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>{isAr ? 'تصفية الدور:' : 'Role:'}</span>
          </span>

          {[
            { id: 'all', labelAr: 'جميع الأدوار', labelEn: 'All Roles' },
            { id: 'employee', labelAr: 'موظفون', labelEn: 'Employees', icon: UserCheck },
            { id: 'manager', labelAr: 'مدراء', labelEn: 'Managers', icon: ShieldCheck },
            { id: 'hr', labelAr: 'موارد بشرية (HR)', labelEn: 'HR', icon: Building2 },
          ].map((item) => (
            <button
              key={item.id}
              id={`filter-role-${item.id}`}
              onClick={() => setRoleFilter(item.id as any)}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${
                roleFilter === item.id
                  ? 'bg-[#2D3628] text-white shadow-sm'
                  : 'bg-white text-[#5A5852] border border-[#E5E2D9] hover:bg-[#EFECE4]'
              }`}
            >
              {isAr ? item.labelAr : item.labelEn}
            </button>
          ))}

          <div className="hidden sm:block h-4 w-px bg-[#E5E2D9] mx-1" />

          {/* Department dropdown filter */}
          <select
            id="filter-department"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label={isAr ? 'تصفية حسب القسم' : 'Filter by department'}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#E5E2D9] text-[#5A5852] font-medium text-xs focus:outline-none focus:ring-2 focus:ring-[#5E7153]"
          >
            <option value="all">{isAr ? 'جميع الأقسام' : 'All Departments'}</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept.en} value={dept.ar}>
                {isAr ? dept.ar : dept.en}
              </option>
            ))}
          </select>

          {(roleFilter !== 'all' || departmentFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setRoleFilter('all');
                setDepartmentFilter('all');
                setSearchQuery('');
              }}
              className="text-xs text-[#5E7153] hover:underline font-semibold mr-auto ml-auto sm:mr-auto sm:ml-0"
            >
              {isAr ? 'إعادة ضبط' : 'Reset filters'}
            </button>
          )}
        </div>
      </div>

      {/* 3. Cards View */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#65635E] px-1">
            <span>
              {isAr
                ? `عرض ${filteredUsers.length} من إجمالي ${users.length} موظف`
                : `Showing ${filteredUsers.length} of ${users.length} employees`}
            </span>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#E5E2D9]">
              <Users className="w-12 h-12 text-[#65635E]/40 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#2D3628]">
                {isAr ? 'لا توجد نتائج مطابقة' : 'No matching employees'}
              </h3>
              <p className="text-xs text-[#65635E] mt-1 max-w-sm mx-auto">
                {isAr
                  ? 'جرب البحث باسم أو بريد إلكتروني مختلف أو قم بإضافة موظف جديد'
                  : 'Try searching with different terms or add a new employee to Firestore.'}
              </p>
              <button
                onClick={handleOpenNewModal}
                className="mt-4 px-4 py-2 rounded-xl bg-[#5E7153] text-white text-xs font-bold shadow-sm"
              >
                {isAr ? '+ إضافة موظف جديد الآن' : '+ Add Employee Now'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredUsers.map((user) => {
                const isCurrentActive = currentUser.id === user.id;
                const reportsCount = users.filter((u) => u.managerName === user.name || u.managerId === user.id).length;

                return (
                  <div
                    key={user.id}
                    id={`employee-card-${user.id}`}
                    className={`relative bg-white rounded-3xl border transition-all duration-200 p-5 sm:p-6 flex flex-col justify-between hover:shadow-md ${
                      isCurrentActive
                        ? 'border-[#5E7153] ring-2 ring-[#5E7153]/20 bg-[#FAF9F6]'
                        : 'border-[#E5E2D9] hover:border-[#C8C4B7]'
                    }`}
                  >
                    {/* Top user row */}
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-12 h-12 rounded-2xl object-cover border border-[#E5E2D9] bg-[#EFECE4]"
                              onError={(e) => {
                                const target = e.currentTarget;
                                const initial = encodeURIComponent(user.name?.charAt(0) || 'U');
                                target.src = `https://ui-avatars.com/api/?name=${initial}&background=5E7153&color=fff&bold=true`;
                              }}
                            />
                            {user.role === 'manager' && (
                              <span
                                className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#5E7153] text-white rounded-full flex items-center justify-center text-[10px] border-2 border-white shadow-xs"
                                title="Manager / Team Lead"
                              >
                                ★
                              </span>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-sm font-bold text-[#2D3628] hover:text-[#5E7153] transition">
                                {isAr ? user.name : (user.nameEn || user.name)}
                              </h3>
                              {isCurrentActive && (
                                <span className="text-[9px] bg-[#E9EDD9] text-[#2D3628] px-1.5 py-0.5 rounded font-bold">
                                  {isAr ? 'أنت' : 'You'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#65635E] flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-[#5E7153]" />
                              <span className="truncate max-w-[170px]" title={user.email}>
                                {user.email || 'no-email@dawamy.app'}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Role Badge */}
                        <div className="shrink-0">
                          {user.role === 'manager' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-[#E9EDD9] text-[#2D3628] border border-[#D9E0D2]">
                              <ShieldCheck className="w-3 h-3 text-[#5E7153]" />
                              <span>{isAr ? 'مدير' : 'Manager'}</span>
                            </span>
                          ) : user.role === 'hr' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]">
                              <Building2 className="w-3 h-3" />
                              <span>HR</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium bg-[#EFECE4] text-[#5A5852] border border-[#E5E2D9]">
                              <UserCheck className="w-3 h-3 text-[#5E7153]" />
                              <span>{isAr ? 'موظف' : 'Employee'}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Job Title & Department */}
                      <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#E5E2D9]/80 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-[#2D3628] font-semibold truncate">
                          <Briefcase className="w-3.5 h-3.5 text-[#5E7153] shrink-0" />
                          <span className="truncate">{isAr ? user.title : (user.titleEn || user.title)}</span>
                        </div>
                        <div className="text-[11px] text-[#65635E] flex items-center justify-between">
                          <span>{isAr ? user.department : (user.departmentEn || user.department)}</span>
                        </div>
                      </div>

                      {/* Direct Manager Relationship */}
                      <div className="p-2.5 rounded-xl bg-[#E9EDD9]/30 border border-[#D9E0D2] flex items-center justify-between text-xs">
                        <span className="text-[#65635E] text-[11px] font-medium">
                          {isAr ? 'المدير المباشر:' : 'Direct Manager:'}
                        </span>
                        <span className="font-bold text-[#2D3628] flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#5E7153]" />
                          <span>{user.managerName || (isAr ? 'غير محدد' : 'Unassigned')}</span>
                        </span>
                      </div>

                      {/* If Manager, show Direct Reports count */}
                      {user.role === 'manager' && reportsCount > 0 && (
                        <div className="p-2 rounded-xl bg-white border border-[#E5E2D9] text-[11px] text-[#5E7153] font-semibold flex items-center justify-between">
                          <span>{isAr ? 'يقود فريقاً من:' : 'Direct Reports:'}</span>
                          <span className="bg-[#E9EDD9] text-[#2D3628] px-2 py-0.5 rounded-md">
                            {reportsCount} {isAr ? 'موظفين' : 'members'}
                          </span>
                        </div>
                      )}

                      {/* Leave & WFH Balances */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E2D9] text-center text-xs">
                        <div className="p-2 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9]">
                          <div className="text-[10px] text-[#65635E]">{isAr ? 'عمل عن بعد' : 'Monthly WFH'}</div>
                          <div className="font-bold text-[#2D3628] mt-0.5">
                            {user.balances?.wfhMonthlyTotal || 8} {isAr ? 'أيام/شهر' : 'd/mo'}
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9]">
                          <div className="text-[10px] text-[#65635E]">{isAr ? 'إجازة سنوية' : 'Annual Leave'}</div>
                          <div className="font-bold text-[#2D3628] mt-0.5">
                            {user.balances?.annualLeaveTotal || 25} {isAr ? 'يوماً' : 'days'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons row */}
                    <div className="pt-4 mt-4 border-t border-[#E5E2D9] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {/* Edit Button */}
                        <button
                          id={`btn-edit-employee-${user.id}`}
                          onClick={() => handleOpenEditModal(user)}
                          className="p-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#43423E] hover:text-[#2D3628] border border-[#E5E2D9] transition"
                          title={isAr ? 'تعديل بيانات الموظف' : 'Edit employee details'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick Role Toggle */}
                        <button
                          id={`btn-quick-toggle-role-${user.id}`}
                          onClick={() => handleQuickToggleRole(user)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#FAF9F6] hover:bg-[#E9EDD9] text-[#5E7153] border border-[#E5E2D9] text-[11px] font-bold transition flex items-center gap-1"
                          title={isAr ? 'تبديل الدور بين مدير وموظف' : 'Toggle role (Manager / Employee)'}
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>{user.role === 'employee' ? (isAr ? 'ترقية لمدير' : 'Make Lead') : (isAr ? 'جعله موظفاً' : 'Make Employee')}</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          id={`btn-delete-employee-${user.id}`}
                          onClick={() => setDeleteConfirmId(user.id)}
                          className="p-2 rounded-xl bg-[#FAF9F6] hover:bg-[#FDF0EE] text-[#9E3B30] border border-[#E5E2D9] transition"
                          title={isAr ? 'حذف من قاعدة البيانات' : 'Delete user from Firestore'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Impersonate / Switch Active User */}
                      <button
                        id={`btn-impersonate-${user.id}`}
                        onClick={() => onSelectUser(user)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          isCurrentActive
                            ? 'bg-[#5E7153] text-white'
                            : 'bg-[#2D3628] text-white hover:bg-[#43423E]'
                        }`}
                        title={isAr ? 'عرض المنصة بحساب هذا الموظف' : 'View platform as this user'}
                      >
                        <LogIn className="w-3 h-3" />
                        <span>{isCurrentActive ? (isAr ? 'الحالي' : 'Active') : (isAr ? 'دخول' : 'Switch')}</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Hierarchy Tree View (الهيكل الإداري للفرق والمدراء المباشرين) */}
      {viewMode === 'hierarchy' && (
        <div className="space-y-6">
          <div className="bg-[#FAF9F6] border border-[#E5E2D9] rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Network className="w-5 h-5 text-[#5E7153]" />
              <h3 className="text-base font-bold text-[#2D3628]">
                {isAr ? 'مخطط الهيكل التنظيمي والمدراء المباشرين' : 'Direct Reporting & Team Leads Organogram'}
              </h3>
            </div>
            <p className="text-xs text-[#65635E] mb-6">
              {isAr
                ? 'توزيع الموظفين حسب المدراء المباشرين المسؤولين عن اعتماد طلبات الإجازة والعمل عن بُعد.'
                : 'Team breakdown grouped under direct managers responsible for review and approvals.'}
            </p>

            <div className="space-y-6">
              {Object.entries(hierarchyData).map(([managerName, group]) => (
                <div
                  key={managerName}
                  className="bg-white rounded-2xl border border-[#E5E2D9] p-5 space-y-4 shadow-xs"
                >
                  {/* Manager Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E2D9]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#5E7153] text-white flex items-center justify-center font-bold">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#2D3628]">{managerName}</h4>
                          <span className="text-[10px] bg-[#E9EDD9] text-[#2D3628] px-2 py-0.5 rounded-md font-extrabold">
                            {isAr ? 'المدير المباشر' : 'Direct Manager'}
                          </span>
                        </div>
                        {group.managerProfile && (
                          <p className="text-xs text-[#65635E]">
                            {group.managerProfile.email} • {isAr ? group.managerProfile.department : group.managerProfile.departmentEn}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-[#5E7153] font-bold bg-[#E9EDD9] px-3 py-1 rounded-xl self-start sm:self-auto">
                      {group.reports.length} {isAr ? 'موظفين تحت إشرافه' : 'direct reports'}
                    </div>
                  </div>

                  {/* Reports List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.reports.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={emp.avatar}
                            alt={emp.name}
                            className="w-8 h-8 rounded-lg object-cover border border-[#E5E2D9]"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#2D3628] truncate">{isAr ? emp.name : (emp.nameEn || emp.name)}</div>
                            <div className="text-[10px] text-[#65635E] truncate">{emp.email}</div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenEditModal(emp)}
                          className="p-1.5 rounded-lg text-[#65635E] hover:text-[#5E7153] hover:bg-[#EFECE4]"
                          title={isAr ? 'تعديل' : 'Edit'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#FAF9F6] border border-[#E5E2D9] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E2D9]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#5E7153] text-white flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2D3628]">
                    {editingUserId
                      ? isAr
                        ? 'تعديل بيانات الموظف'
                        : 'Edit Employee'
                      : isAr
                      ? 'إضافة موظف جديد إلى Firestore'
                      : 'Add New Employee to Firestore'}
                  </h3>
                  <p className="text-xs text-[#65635E]">
                    {isAr
                      ? 'سيتم حفظ هذا الموظف مباشرة في جدول users في قاعدة بيانات Firestore'
                      : 'Saved directly to the users collection in Firestore'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-[#65635E] hover:text-[#2D3628] hover:bg-[#EFECE4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="space-y-6">
              
              {/* Basic Info Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#5E7153] uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{isAr ? '1. البيانات الشخصية وبيانات التواصل' : '1. Personal & Contact Info'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2D3628] mb-1">
                      {isAr ? 'الاسم الكامل (بالعربية) *' : 'Full Name (Arabic) *'}
                    </label>
                    <input
                      type="text"
                      id="input-emp-name-ar"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={isAr ? 'مثال: أحمد عبد الله' : 'e.g. Ahmed Abdullah'}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#E5E2D9] rounded-xl focus:ring-2 focus:ring-[#5E7153] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2D3628] mb-1">
                      {isAr ? 'الاسم بالإنجليزية (Name in English)' : 'Full Name (English)'}
                    </label>
                    <input
                      type="text"
                      id="input-emp-name-en"
                      value={formData.nameEn}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="e.g. Ahmed Abdullah"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#E5E2D9] rounded-xl focus:ring-2 focus:ring-[#5E7153] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2D3628] mb-1">
                      {isAr ? 'البريد الإلكتروني المهني *' : 'Work Email *'}
                    </label>
                    <input
                      type="email"
                      id="input-emp-email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="ahmed.abdullah@dawamy.app"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#E5E2D9] rounded-xl focus:ring-2 focus:ring-[#5E7153] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2D3628] mb-1">
                      {isAr ? 'رقم الجوال (اختياري)' : 'Phone (Optional)'}
                    </label>
                    <input
                      type="tel"
                      id="input-emp-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+966 50 123 4567"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#E5E2D9] rounded-xl focus:ring-2 focus:ring-[#5E7153] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2D3628] mb-1 flex items-center gap-1">
                      <Fingerprint className="w-3.5 h-3.5 text-[#5E7153]" />
                      <span>{isAr ? 'رقم البصمة بالجهاز' : 'Biometric Enroll ID'}</span>
                    </label>
                    <input
                      type="text"
                      id="input-emp-biometric-id"
                      value={formData.biometricEnrollId}
                      onChange={(e) => setFormData({ ...formData, biometricEnrollId: e.target.value })}
                      placeholder={isAr ? 'مثال: 105' : 'e.g. 105'}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#E5E2D9] rounded-xl focus:ring-2 focus:ring-[#5E7153] focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Role & Direct Manager Section */}
              <div className="space-y-4 pt-4 border-t border-[#E5E2D9]">
                <h4 className="text-xs font-bold text-[#5E7153] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isAr ? '2. الدور والصلاحية والمدير المباشر' : '2. Role & Direct Manager'}</span>
                </h4>

                {/* Role Selector Cards */}
                <div>
                  <label className="block text-xs font-bold text-[#2D3628] mb-2">
                    {isAr ? 'تحديد الدور والصلاحيات في المنظومة *' : 'System Role & Permissions *'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        role: 'employee' as UserRole,
                        titleAr: 'موظف (Employee)',
                        titleEn: 'Employee',
                        descAr: 'يرفع طلبات الإجازة والعمل عن بُعد لمديره المباشر',
                        icon: UserCheck,
                      },
                      {
                        role: 'manager' as UserRole,
                        titleAr: 'مدير مباشر (Manager)',
                        titleEn: 'Manager / Lead',
                        descAr: 'يعتمد ويرفض طلبات أعضاء فريقه ويتابع خطط التغطية',
                        icon: ShieldCheck,
                      },
                      {
                        role: 'hr' as UserRole,
                        titleAr: 'الموارد البشرية (HR)',
                        titleEn: 'HR Admin',
                        descAr: 'إشراف شامل، إدارة الموظفين، والاعتماد النهائي للوائح',
                        icon: Building2,
                      },
                    ].map((r) => {
                      const Icon = r.icon;
                      const isSelected = formData.role === r.role;
                      return (
                        <div
                          key={r.role}
                          onClick={() => setFormData({ ...formData, role: r.role })}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                            isSelected
                              ? 'bg-[#E9EDD9] border-[#5E7153] shadow-xs'
                              : 'bg-white border-[#E5E2D9] hover:bg-[#EFECE4]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <Icon className={`w-4 h-4 ${isSelected ? 'text-[#5E7153]' : 'text-[#65635E]'}`} />
                              {isSelected && <Check className="w-4 h-4 text-[#5E7153]" />}
                            </div>
                            <div className="text-xs font-bold text-[#2D3628]">
                              {isAr ? r.titleAr : r.titleEn}
                            </div>
                            <div className="text-[10px] text-[#65635E] mt-1 leading-snug">
                              {r.descAr}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Direct Manager Selector */}
                <div>
                  <label className="block text-xs font-bold text-[#2D3628] mb-1">
                    {isAr ? 'المدير المباشر المسؤول عن الاعتمادات *' : 'Direct Manager (Approver) *'}
                  </label>
                  <select
                    id="select-direct-manager"
                    value={formData.managerName}
                    onChange={(e) => {
                      const selectedMgr = availableManagers.find((m) => m.name === e.target.value);
                      setFormData({
                        ...formData,
                        managerName: e.target.value,
                        managerId: selectedMgr ? selectedMgr.id : '',
                      });
                    }}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#E5E2D9] rounded-xl focus:ring-2 focus:ring-[#5E7153] focus:outline-none text-[#2D3628]"
                  >
                    {availableManagers.map((mgr) => (
                      <option key={mgr.id} value={mgr.name}>
                        {mgr.name} — {isAr ? mgr.title : (mgr.titleEn || mgr.title)} ({mgr.role})
                      </option>
                    ))}
                    <option value="د. خالد الزهراني">{isAr ? 'د. خالد الزهراني (الرئيس التنفيذي)' : 'Dr. Khalid (CEO)'}</option>
                    <option value="أ. عبد الله السالم">{isAr ? 'أ. عبد الله السالم (مدير العمليات)' : 'Abdullah Al-Salem (COO)'}</option>
                  </select>
                  <p className="text-[11px] text-[#65635E] mt-1">
                    {isAr
                      ? 'عندما يقدم هذا الموظف طلباً، سيصل إشعار الاعتماد فوراً إلى هذا المدير.'
                      : 'Leave and WFH requests submitted by this employee will be routed to this manager.'}
                  </p>
                </div>

                {/* Job Title & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2D3628] mb-1">
                      {isAr ? 'المسمى الوظيفي *' : 'Job Title *'}
                    </label>
                    <input
                      type="text"
                      id="input-emp-title"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder={isAr ? 'مهندس واجهات أمامية' : 'Frontend Engineer'}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#E5E2D9] rounded-xl focus:ring-2 focus:ring-[#5E7153] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2D3628] mb-1">
                      {isAr ? 'القسم / الإدارة *' : 'Department *'}
                    </label>
                    <select
                      id="select-emp-dept"
                      value={formData.department}
                      onChange={(e) => {
                        const matched = DEPARTMENTS.find((d) => d.ar === e.target.value);
                        setFormData({
                          ...formData,
                          department: e.target.value,
                          departmentEn: matched?.en || 'Engineering',
                        });
                      }}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#E5E2D9] rounded-xl focus:ring-2 focus:ring-[#5E7153] focus:outline-none text-[#2D3628]"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept.en} value={dept.ar}>
                          {isAr ? dept.ar : dept.en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              {/* Balances & Avatar Section */}
              <div className="space-y-4 pt-4 border-t border-[#E5E2D9]">
                <h4 className="text-xs font-bold text-[#5E7153] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{isAr ? '3. أرصدة العمل عن بُعد والإجازات' : '3. Quotas & Balances'}</span>
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2D3628] mb-1">
                      {isAr ? 'رصيد العمل عن بعد الشهري (أيام)' : 'Monthly WFH Quota (Days)'}
                    </label>
                    <input
                      type="number"
                      id="input-wfh-balance"
                      min={0}
                      max={31}
                      value={formData.wfhMonthlyTotal}
                      onChange={(e) => setFormData({ ...formData, wfhMonthlyTotal: parseInt(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#E5E2D9] rounded-xl focus:ring-2 focus:ring-[#5E7153] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2D3628] mb-1">
                      {isAr ? 'رصيد الإجازة السنوية (أيام)' : 'Annual Leave Total (Days)'}
                    </label>
                    <input
                      type="number"
                      id="input-annual-balance"
                      min={0}
                      max={60}
                      value={formData.annualLeaveTotal}
                      onChange={(e) => setFormData({ ...formData, annualLeaveTotal: parseInt(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#E5E2D9] rounded-xl focus:ring-2 focus:ring-[#5E7153] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Avatar Picker */}
                <div>
                  <label className="block text-xs font-bold text-[#2D3628] mb-2">
                    {isAr ? 'اختيار الصورة الرمزية' : 'Select Avatar'}
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {PRESET_AVATARS.map((av, idx) => (
                      <img
                        key={idx}
                        src={av}
                        alt="Preset avatar"
                        onClick={() => setFormData({ ...formData, avatar: av })}
                        className={`w-10 h-10 rounded-xl object-cover cursor-pointer border-2 transition ${
                          formData.avatar === av ? 'border-[#5E7153] scale-105 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-[#E5E2D9] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E2D9] text-xs font-semibold text-[#65635E] hover:bg-[#EFECE4]"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  id="btn-submit-employee-form"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5E7153] to-[#45553C] hover:from-[#4D5E44] hover:to-[#384532] text-white text-xs font-bold shadow-md shadow-[#5E7153]/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>{isAr ? 'جارٍ الحفظ في Firestore...' : 'Saving to Firestore...'}</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {editingUserId
                          ? isAr
                            ? 'تحديث وحفظ في Firestore'
                            : 'Update in Firestore'
                          : isAr
                          ? 'حفظ الموظف في Firestore (users)'
                          : 'Save Employee to Firestore'}
                      </span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 6. Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#FAF9F6] border border-[#E5E2D9] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#FDF0EE] text-[#9E3B30] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-[#2D3628]">
                {isAr ? 'هل أنت متأكد من حذف الموظف؟' : 'Confirm Employee Deletion?'}
              </h3>
              <p className="text-xs text-[#65635E]">
                {isAr
                  ? 'سيتم حذف هذا الحساب نهائياً من جدول users في قاعدة بيانات Firestore.'
                  : 'This record will be permanently deleted from the users collection in Firestore.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-[#E5E2D9] text-xs font-semibold text-[#65635E] hover:bg-[#EFECE4]"
              >
                {isAr ? 'تراجع' : 'Cancel'}
              </button>
              <button
                id="btn-confirm-delete-employee"
                onClick={() => handleDeleteUser(deleteConfirmId)}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-[#9E3B30] hover:bg-[#832E24] text-white text-xs font-bold shadow-sm"
              >
                {isSubmitting ? (isAr ? 'جارٍ الحذف...' : 'Deleting...') : (isAr ? 'نعم، حذف نهائي' : 'Yes, Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Bulk Leave Balances Excel Import Modal */}
      <BulkBalanceImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        allUsers={users}
        onApplyBatch={async (updates) => {
          if (onBatchUpdateBalances) {
            await onBatchUpdateBalances(updates);
          }
        }}
        lang={lang}
      />

    </div>
  );
};
