import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Check, 
  X, 
  Layers, 
  Filter, 
  CheckSquare, 
  Square, 
  Building2, 
  Radio, 
  Sparkles, 
  Info,
  GraduationCap,
  School,
  Shuffle,
  Tag,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { TelegramGroupItem } from '../types';

interface TelegramGroupSelectorProps {
  groups: TelegramGroupItem[];
  selectedGroupIds: string[];
  onChange: (selectedIds: string[]) => void;
  sendToAll: boolean;
  onSendToAllChange: (sendToAll: boolean) => void;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export const TelegramGroupSelector: React.FC<TelegramGroupSelectorProps> = ({
  groups,
  selectedGroupIds,
  onChange,
  sendToAll,
  onSendToAllChange,
  title = 'الجروبات المستهدفة للبث',
  subtitle = 'اختر الجروبات والقنوات المدرسية التي تريد إرسال المسابقة إليها',
  compact = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    groups.forEach(g => {
      if (g.category && g.category.trim()) {
        set.add(g.category.trim());
      }
    });
    return Array.from(set);
  }, [groups]);

  // Helper for category styling and icons
  const getCategoryMeta = (cat?: string) => {
    const clean = (cat || 'عام').trim();
    if (clean.includes('ثانوي')) {
      return {
        badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        icon: <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
      };
    }
    if (clean.includes('متوسط')) {
      return {
        badge: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        icon: <School className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
      };
    }
    if (clean.includes('ابتدائي')) {
      return {
        badge: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        icon: <School className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
      };
    }
    if (clean.includes('موهب') || clean.includes('تفوق')) {
      return {
        badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        icon: <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
      };
    }
    if (clean.includes('قناة')) {
      return {
        badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        icon: <Radio className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
      };
    }
    return {
      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      icon: <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
    };
  };

  // Filter groups by search query and category
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (g.name && g.name.toLowerCase().includes(q)) ||
        (g.id && g.id.toLowerCase().includes(q)) ||
        (g.category && g.category.toLowerCase().includes(q));

      const matchesCategory = 
        selectedCategory === 'all' || 
        g.category === selectedCategory ||
        (!g.category && selectedCategory === 'عام');

      return matchesSearch && matchesCategory;
    });
  }, [groups, searchQuery, selectedCategory]);

  const handleToggleGroup = (groupId: string) => {
    if (selectedGroupIds.includes(groupId)) {
      onChange(selectedGroupIds.filter(id => id !== groupId));
    } else {
      onChange([...selectedGroupIds, groupId]);
    }
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredGroups.map(g => g.id);
    const newSet = new Set([...selectedGroupIds, ...filteredIds]);
    onChange(Array.from(newSet));
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  const handleInvertFiltered = () => {
    const currentSet = new Set(selectedGroupIds);
    filteredGroups.forEach(g => {
      if (currentSet.has(g.id)) {
        currentSet.delete(g.id);
      } else {
        currentSet.add(g.id);
      }
    });
    onChange(Array.from(currentSet));
  };

  const handleAddCategoryGroups = (cat: string) => {
    const catGroupIds = groups
      .filter(g => cat === 'all' ? true : (g.category === cat || (!g.category && cat === 'عام')))
      .map(g => g.id);
    const newSet = new Set([...selectedGroupIds, ...catGroupIds]);
    onChange(Array.from(newSet));
  };

  const handleRemoveCategoryGroups = (cat: string) => {
    const catGroupIds = new Set(
      groups
        .filter(g => cat === 'all' ? true : (g.category === cat || (!g.category && cat === 'عام')))
        .map(g => g.id)
    );
    onChange(selectedGroupIds.filter(id => !catGroupIds.has(id)));
  };

  if (groups.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs sm:text-sm text-amber-800 dark:text-amber-300 space-y-2">
        <div className="flex items-center gap-2 font-black">
          <Info className="w-4 h-4 text-amber-600" />
          <span>لم يتم تسجيل أي جروبات تليجرام في إعدادات المنصة بعد.</span>
        </div>
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          يمكن للمشرف العام إضافة الجروبات من تبويب <strong>«بوت تليجرام»</strong> في لوحة الإدارة لإتاحة استهدافها وإرسال المسابقات إليها مباشرة.
        </p>
      </div>
    );
  }

  // Count how many in current active category are selected
  const activeCategoryTotal = filteredGroups.length;
  const activeCategorySelectedCount = filteredGroups.filter(g => selectedGroupIds.includes(g.id)).length;

  return (
    <div className="space-y-3.5">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700/80">
        <div>
          <h4 className="text-xs sm:text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0EA5E9]" />
            <span>{title}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 dark:bg-sky-950 text-[#0284C7] dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60">
              {groups.length} جروب مسجل
            </span>
          </h4>
          {subtitle && (
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Mode Selector Tabs */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto shrink-0 shadow-xs">
          <button
            type="button"
            onClick={() => onSendToAllChange(true)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              sendToAll
                ? 'bg-white dark:bg-[#0EA5E9] text-[#0F172A] dark:text-white shadow-xs'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A]'
            }`}
          >
            <span>🌐 جميع الجروبات ({groups.length})</span>
          </button>
          <button
            type="button"
            onClick={() => onSendToAllChange(false)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              !sendToAll
                ? 'bg-[#0EA5E9] text-white shadow-xs'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A]'
            }`}
          >
            <span>🎯 تحديد جروبات معينة</span>
            {!sendToAll && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/25 text-white font-mono font-bold">
                {selectedGroupIds.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Target All Notice */}
      {sendToAll ? (
        <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60 flex items-center justify-between text-xs text-sky-900 dark:text-sky-300">
          <div className="flex items-center gap-2 font-bold">
            <Radio className="w-4 h-4 text-sky-600 animate-pulse shrink-0" />
            <span>سيتم الإرسال لجميع الجروبات والقنوات المسجلة بالمنصة ({groups.length} جروب).</span>
          </div>
          <button
            type="button"
            onClick={() => onSendToAllChange(false)}
            className="text-[11px] font-black text-[#0284C7] dark:text-sky-300 hover:underline cursor-pointer shrink-0"
          >
            تخصيص جروبات معينة؟
          </button>
        </div>
      ) : (
        /* Custom Selection Workspace */
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Search bar & Bulk Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الجروب، المدرسة، أو المعرف..."
                className="w-full h-10 pr-9 pl-8 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#0EA5E9] shadow-xs"
              />
              <Search className="w-4 h-4 text-[#64748B] absolute right-3 top-3 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="مسح البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Bulk Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-2.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 text-[11px] font-black text-[#0284C7] dark:text-sky-300 flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                title="تحديد كافة الجروبات المعروضة"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>تحديد الكل ({filteredGroups.length})</span>
              </button>

              <button
                type="button"
                onClick={handleInvertFiltered}
                className="px-2.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 text-[11px] font-black text-purple-700 dark:text-purple-300 flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                title="عكس تحديد الجروبات الحالية"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>عكس التحديد</span>
              </button>

              <button
                type="button"
                onClick={handleDeselectAll}
                disabled={selectedGroupIds.length === 0}
                className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-[11px] font-black text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40 shadow-xs"
                title="إلغاء تحديد كافة الجروبات"
              >
                <Square className="w-3.5 h-3.5" />
                <span>إلغاء التحديد</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills & Category Quick Add */}
          {categories.length > 0 && (
            <div className="flex flex-col gap-2 p-2.5 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] shrink-0 pl-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-[#0EA5E9]" />
                  <span>تصفية حسب:</span>
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 rounded-xl text-[11px] font-black shrink-0 transition-colors cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-[#0EA5E9] text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-[#64748B] hover:text-[#0F172A] border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  الكل ({groups.length})
                </button>

                {categories.map((cat) => {
                  const countInCat = groups.filter(g => g.category === cat).length;
                  const isSelected = selectedCategory === cat;
                  const meta = getCategoryMeta(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-black shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#0EA5E9] text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-[#64748B] hover:text-[#0F172A] border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {meta.icon}
                      <span>{cat}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                        {countInCat}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Fast Category One-Click Action */}
              {selectedCategory !== 'all' && (
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">
                    جروبات <strong>«{selectedCategory}»</strong>: {activeCategorySelectedCount} من أصل {activeCategoryTotal} محددة
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddCategoryGroups(selectedCategory)}
                      className="text-[#0284C7] dark:text-sky-300 font-black hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>تحديد كافة جروبات {selectedCategory}</span>
                    </button>
                    {activeCategorySelectedCount > 0 && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategoryGroups(selectedCategory)}
                          className="text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                        >
                          إلغاء هذا التصنيف
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Groups Selection Grid */}
          <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-2.5 max-h-72 overflow-y-auto p-2 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl bg-[#F8FAFC] dark:bg-[#0B1321]`}>
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => {
                const isChecked = selectedGroupIds.includes(group.id);
                const meta = getCategoryMeta(group.category);
                return (
                  <div
                    key={group.id}
                    onClick={() => handleToggleGroup(group.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-2.5 ${
                      isChecked
                        ? 'bg-sky-50 dark:bg-sky-950/50 border-[#0EA5E9] ring-2 ring-[#0EA5E9]/25 shadow-xs'
                        : 'bg-white dark:bg-[#1E293B] border-slate-200/90 dark:border-slate-700/90 hover:border-sky-300 dark:hover:border-sky-700 shadow-xs'
                    }`}
                  >
                    {/* Checkbox Icon */}
                    <div className={`size-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isChecked
                        ? 'bg-[#0EA5E9] border-[#0EA5E9] text-white shadow-xs'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}>
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    {/* Group Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] truncate" title={group.name}>
                          {group.name || `جروب (${group.id.slice(-6)})`}
                        </span>
                        {group.category && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${meta.badge}`}>
                            {meta.icon}
                            <span>{group.category}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                        <span className="font-mono" dir="ltr">
                          {group.id}
                        </span>
                        {group.memberCount !== undefined && group.memberCount > 0 && (
                          <span className="font-bold flex items-center gap-0.5">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>{group.memberCount} عضو</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-10 text-center space-y-2">
                <p className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                  لا توجد جروبات مطابقة لمعايير البحث الحالية «{searchQuery}»
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-[#0EA5E9] font-black hover:underline cursor-pointer"
                  >
                    إلغاء البحث وعرض كافة الجروبات
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Active Selection Tray (Scrollable chips with quick removal) */}
          {selectedGroupIds.length > 0 && (
            <div className="p-3 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>الجروبات المختارة حالياً للإرسال:</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {selectedGroupIds.length} جروب
                  </span>
                </span>

                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-[11px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>مسح التحديد</span>
                </button>
              </div>

              {/* Scrollable Chips Strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-h-24 flex-wrap">
                {groups
                  .filter(g => selectedGroupIds.includes(g.id))
                  .map(g => (
                    <span
                      key={g.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-[11px] font-bold text-sky-900 dark:text-sky-200 shrink-0"
                    >
                      <span className="truncate max-w-[140px]">{g.name || g.id}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleGroup(g.id);
                        }}
                        className="text-sky-500 hover:text-rose-600 p-0.5 rounded hover:bg-white/60 dark:hover:bg-black/40 cursor-pointer transition-colors"
                        title="إزالة من التحديد"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
