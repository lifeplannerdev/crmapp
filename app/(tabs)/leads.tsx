import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Modal,
  Alert, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string;
  location: string;
  status: string;
  source: string;
  program: string;
  priority: string;
  assigned_to?: { first_name: string; last_name: string };
  sub_assigned_to?: { first_name: string; last_name: string };
  current_handler?: { first_name: string };
  date: string;
}

interface Stats { new: number; qualified: number; converted: number }
interface StaffMember { id: number; username: string; first_name?: string; last_name?: string; role?: string }

// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;
const EXCLUDED_ROLES = ['TRAINER', 'ACCOUNTS', 'HR', 'MEDIA', 'ADMIN'];

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  enquiry:    { bg: 'bg-blue-100',   text: 'text-blue-700' },
  contacted:  { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  qualified:  { bg: 'bg-purple-100', text: 'text-purple-700' },
  converted:  { bg: 'bg-green-100',  text: 'text-green-700' },
  registered: { bg: 'bg-teal-100',   text: 'text-teal-700' },
  lost:       { bg: 'bg-red-100',    text: 'text-red-700' },
};

const PRIORITY_STYLE: Record<string, { bg: string; text: string }> = {
  HIGH:   { bg: 'bg-red-100',    text: 'text-red-700' },
  MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  LOW:    { bg: 'bg-green-100',  text: 'text-green-700' },
};

// ─── Filter Sheet (bottom modal) ─────────────────────────────────────────────
function FilterSheet({
  visible, onClose,
  filterStatus, setFilterStatus,
  filterPriority, setFilterPriority,
  filterSource, setFilterSource,
  filterStaff, setFilterStaff,
  staffMembers, onClear,
}: any) {
  const Section = ({ label, options, value, onChange }: any) => (
    <View className="mb-5">
      <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {options.map((o: any) => {
            const sel = value === o.value;
            return (
              <TouchableOpacity
                key={o.value}
                onPress={() => onChange(o.value)}
                className={`px-4 py-2 rounded-full border ${sel ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}
              >
                <Text className={`text-xs font-semibold ${sel ? 'text-white' : 'text-gray-700'}`}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-3xl px-5 pt-4 pb-10">
          <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-5" />
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-lg font-bold text-gray-900">Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Section label="Status" value={filterStatus} onChange={setFilterStatus}
            options={[
              { label: 'All', value: 'all' }, { label: 'Enquiry', value: 'enquiry' },
              { label: 'Contacted', value: 'contacted' }, { label: 'Qualified', value: 'qualified' },
              { label: 'Converted', value: 'converted' }, { label: 'Registered', value: 'registered' },
              { label: 'Lost', value: 'lost' },
            ]}
          />
          <Section label="Priority" value={filterPriority} onChange={setFilterPriority}
            options={[
              { label: 'All', value: 'all' }, { label: 'High', value: 'high' },
              { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' },
            ]}
          />
          <Section label="Source" value={filterSource} onChange={setFilterSource}
            options={[
              { label: 'All', value: 'all' }, { label: 'WhatsApp', value: 'whatsapp' },
              { label: 'Instagram', value: 'instagram' }, { label: 'Website', value: 'website' },
              { label: 'Walk-in', value: 'walk_in' }, { label: 'Automation', value: 'automation' },
              { label: 'Other', value: 'other' },
            ]}
          />
          {staffMembers.length > 0 && (
            <Section label="Assigned To" value={filterStaff} onChange={setFilterStaff}
              options={[
                { label: 'All Staff', value: 'all' },
                { label: 'Unassigned', value: 'unassigned' },
                ...staffMembers.map((s: StaffMember) => ({
                  label: s.username || `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim(),
                  value: String(s.id),
                })),
              ]}
            />
          )}

          <View className="flex-row gap-3 mt-2">
            <TouchableOpacity onPress={() => { onClear(); }} className="flex-1 py-3 border-2 border-gray-200 rounded-xl items-center">
              <Text className="text-sm font-semibold text-gray-700">Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} className="flex-1 py-3 bg-indigo-600 rounded-xl items-center">
              <Text className="text-sm font-bold text-white">Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Lead Card ───────────────────────────────────────────────────────────────
function LeadCard({ lead, onDelete }: { lead: Lead; onDelete: (id: number) => void }) {
  const ss = STATUS_STYLE[lead.status]   ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
  const ps = PRIORITY_STYLE[lead.priority] ?? { bg: 'bg-gray-100', text: 'text-gray-500' };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Lead',
      `Delete "${lead.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(lead.id) },
      ]
    );
  };

  return (
    <View className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-3 overflow-hidden">

      {/* Top: name + badges */}
      <View className="px-4 pt-4 pb-2 flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-base font-bold text-gray-900" numberOfLines={1}>{lead.name}</Text>
          {lead.program ? (
            <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{lead.program}</Text>
          ) : null}
        </View>
        <View className="flex-row gap-1.5 flex-shrink-0">
          <View className={`px-2.5 py-1 rounded-full ${ss.bg}`}>
            <Text className={`text-xs font-bold capitalize ${ss.text}`}>{lead.status}</Text>
          </View>
          <View className={`px-2.5 py-1 rounded-full ${ps.bg}`}>
            <Text className={`text-xs font-bold ${ps.text}`}>{lead.priority}</Text>
          </View>
        </View>
      </View>

      {/* Contact details */}
      <View className="px-4 pb-3 gap-1.5">
        <View className="flex-row items-center gap-2">
          <View className="w-6 h-6 bg-green-100 rounded-md items-center justify-center">
            <Ionicons name="call-outline" size={13} color="#16A34A" />
          </View>
          <Text className="text-sm text-gray-700 font-medium">{lead.phone}</Text>
        </View>
        {lead.email && lead.email !== 'No email provided' ? (
          <View className="flex-row items-center gap-2">
            <View className="w-6 h-6 bg-blue-100 rounded-md items-center justify-center">
              <Ionicons name="mail-outline" size={13} color="#2563EB" />
            </View>
            <Text className="text-sm text-gray-700 font-medium" numberOfLines={1}>{lead.email}</Text>
          </View>
        ) : null}
        {lead.location && lead.location !== 'No location' ? (
          <View className="flex-row items-center gap-2">
            <View className="w-6 h-6 bg-purple-100 rounded-md items-center justify-center">
              <Ionicons name="location-outline" size={13} color="#7C3AED" />
            </View>
            <Text className="text-sm text-gray-700 font-medium" numberOfLines={1}>{lead.location}</Text>
          </View>
        ) : null}
      </View>

      {/* Footer: source, assignment, date, actions */}
      <View className="border-t border-gray-50 px-4 py-2.5 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2 flex-1 min-w-0">
          <View className="bg-gray-100 px-2 py-0.5 rounded-md flex-shrink-0">
            <Text className="text-xs font-semibold text-gray-600">{lead.source}</Text>
          </View>
          {lead.assigned_to ? (
            <View className="flex-row items-center gap-1 min-w-0">
              <Ionicons name="person-outline" size={12} color="#6366F1" />
              <Text className="text-xs text-indigo-600 font-medium" numberOfLines={1}>
                {lead.assigned_to.first_name} {lead.assigned_to.last_name}
              </Text>
            </View>
          ) : (
            <Text className="text-xs text-gray-400 italic">Unassigned</Text>
          )}
        </View>

        <View className="flex-row items-center gap-1 flex-shrink-0">
          <Text className="text-xs text-gray-400 mr-1">{lead.date}</Text>
          <TouchableOpacity
            onPress={() => router.push(`/leads/${lead.id}` as any)}
            className="w-8 h-8 bg-blue-50 rounded-xl items-center justify-center"
          >
            <Ionicons name="create-outline" size={16} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={confirmDelete}
            className="w-8 h-8 bg-red-50 rounded-xl items-center justify-center"
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function LeadsScreen() {
  const { user } = useAuthStore();

  const [leads, setLeads]               = useState<Lead[]>([]);
  const [stats, setStats]               = useState<Stats>({ new: 0, qualified: 0, converted: 0 });
  const [totalCount, setTotalCount]     = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [page, setPage]                 = useState(1);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  const [searchTerm, setSearchTerm]         = useState('');
  const [debouncedSearch, setDebounced]     = useState('');
  const [filterStatus, setFilterStatus]     = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterSource, setFilterSource]     = useState('all');
  const [filterStaff, setFilterStaff]       = useState('all');

  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const debounceTimer = useRef<any>(null);

  const activeFilterCount = [
    filterStatus !== 'all', filterPriority !== 'all',
    filterSource !== 'all', filterStaff !== 'all',
  ].filter(Boolean).length;

  const handleSearchChange = (v: string) => {
    setSearchTerm(v);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setPage(1); setDebounced(v); }, 400);
  };

  // Fetch staff
  useEffect(() => {
    api.get('/employees/').then((res) => {
      const arr = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      setStaffMembers(arr.filter((u: any) => !EXCLUDED_ROLES.includes((u.role ?? '').toUpperCase())));
    }).catch(() => {});
  }, []);

  // Fetch leads
  const fetchLeads = useCallback(async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const params: Record<string, any> = { page: pageNum, page_size: PAGE_SIZE };
      if (debouncedSearch)          params.search   = debouncedSearch;
      if (filterStatus !== 'all')   params.status   = filterStatus.toUpperCase();
      if (filterPriority !== 'all') params.priority = filterPriority.toUpperCase();
      if (filterSource !== 'all')   params.source   = filterSource.toUpperCase();
      if (filterStaff === 'unassigned') params.assigned_to__isnull = 'true';
      else if (filterStaff !== 'all')   params.assigned_to = filterStaff;

      const res = await api.get('/leads/', { params });
      const data = res.data;
      const leadsData = data.results?.leads || data.results || [];
      const statsData = data.results?.stats || {};

      const mapped: Lead[] = leadsData.map((l: any) => ({
        id: l.id, name: l.name, phone: l.phone,
        email: l.email || 'No email provided',
        location: l.location || 'No location',
        status: l.status?.toLowerCase(),
        source: l.source, program: l.program, priority: l.priority,
        assigned_to: l.assigned_to, sub_assigned_to: l.sub_assigned_to,
        current_handler: l.current_handler,
        date: new Date(l.created_at).toLocaleDateString('en-IN'),
      }));

      setLeads(prev => append ? [...prev, ...mapped] : mapped);
      setStats(statsData);
      setTotalCount(data.count ?? 0);
      setTotalPages(Math.ceil((data.count ?? 0) / PAGE_SIZE));
    } catch {
      Alert.alert('Error', 'Failed to load leads. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, filterStatus, filterPriority, filterSource, filterStaff]);

  useEffect(() => { setPage(1); fetchLeads(1, false); }, [fetchLeads]);

  const onRefresh  = () => { setRefreshing(true); setPage(1); fetchLeads(1, false); };
  const onLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    const next = page + 1; setPage(next); fetchLeads(next, true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/leads/${id}/`);
      setLeads(prev => prev.filter(l => l.id !== id));
      setTotalCount(prev => prev - 1);
    } catch {
      Alert.alert('Error', 'Failed to delete lead.');
    }
  };

  const clearFilters = () => {
    setSearchTerm(''); setDebounced('');
    setFilterStatus('all'); setFilterPriority('all');
    setFilterSource('all'); setFilterStaff('all');
    setPage(1);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#EEF2FF" />

      {/* ── Header ── */}
      <View className="bg-indigo-50 px-5 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-extrabold text-indigo-600 tracking-tight">Leads</Text>
            <Text className="text-xs text-gray-500 font-medium mt-0.5">Manage and track all your leads</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/leads/add' as any)}
            className="flex-row items-center gap-1.5 bg-indigo-600 px-4 py-2.5 rounded-xl"
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-white text-sm font-bold">Add Lead</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Stats row ── */}
      <View className="flex-row gap-2 px-4 pt-4 pb-2">
        {[
          { label: 'Total',     value: totalCount,         bg: 'bg-blue-100',   icon: 'people-outline',          iconColor: '#2563EB' },
          { label: 'New',       value: stats.new ?? 0,     bg: 'bg-indigo-100', icon: 'person-add-outline',      iconColor: '#4F46E5' },
          { label: 'Qualified', value: stats.qualified ?? 0, bg: 'bg-purple-100', icon: 'checkmark-circle-outline', iconColor: '#7C3AED' },
          { label: 'Converted', value: stats.converted ?? 0, bg: 'bg-green-100',  icon: 'trending-up-outline',    iconColor: '#16A34A' },
        ].map((s) => (
          <View key={s.label} className="flex-1 bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm items-center">
            <View className={`w-7 h-7 rounded-lg ${s.bg} items-center justify-center mb-1`}>
              <Ionicons name={s.icon as any} size={14} color={s.iconColor} />
            </View>
            <Text className="text-base font-extrabold text-gray-900">{s.value}</Text>
            <Text className="text-xs text-gray-400 font-medium">{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Search + Filter ── */}
      <View className="flex-row items-center gap-2 px-4 py-2">
        <View className="flex-1 flex-row items-center bg-white border border-gray-200 rounded-xl px-3 h-11">
          <Ionicons name="search-outline" size={17} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-sm text-gray-800 font-medium"
            placeholder="Search by name, phone, email…"
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={17} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={() => setShowFilters(true)}
          className={`w-11 h-11 rounded-xl items-center justify-center border ${activeFilterCount > 0 ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}
        >
          <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? '#fff' : '#6B7280'} />
          {activeFilterCount > 0 && (
            <View className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full items-center justify-center">
              <Text className="text-white font-bold" style={{ fontSize: 9 }}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-1">
          <View className="flex-row gap-2 py-1">
            {filterStatus !== 'all' && (
              <TouchableOpacity onPress={() => setFilterStatus('all')} className="flex-row items-center gap-1 bg-indigo-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-semibold text-indigo-700 capitalize">{filterStatus}</Text>
                <Ionicons name="close" size={12} color="#4F46E5" />
              </TouchableOpacity>
            )}
            {filterPriority !== 'all' && (
              <TouchableOpacity onPress={() => setFilterPriority('all')} className="flex-row items-center gap-1 bg-indigo-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-semibold text-indigo-700 capitalize">{filterPriority}</Text>
                <Ionicons name="close" size={12} color="#4F46E5" />
              </TouchableOpacity>
            )}
            {filterSource !== 'all' && (
              <TouchableOpacity onPress={() => setFilterSource('all')} className="flex-row items-center gap-1 bg-indigo-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-semibold text-indigo-700 capitalize">{filterSource}</Text>
                <Ionicons name="close" size={12} color="#4F46E5" />
              </TouchableOpacity>
            )}
            {filterStaff !== 'all' && (
              <TouchableOpacity onPress={() => setFilterStaff('all')} className="flex-row items-center gap-1 bg-indigo-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-semibold text-indigo-700">
                  {filterStaff === 'unassigned' ? 'Unassigned' : staffMembers.find(s => String(s.id) === filterStaff)?.username ?? 'Staff'}
                </Text>
                <Ionicons name="close" size={12} color="#4F46E5" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={clearFilters} className="flex-row items-center gap-1 bg-red-100 px-3 py-1 rounded-full">
              <Text className="text-xs font-semibold text-red-600">Clear all</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── List ── */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="mt-3 text-gray-500 text-sm font-medium">Loading leads…</Text>
        </View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) => <LeadCard lead={item} onDelete={handleDelete} />}
          ListEmptyComponent={
            <View className="items-center py-16">
              <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="people-outline" size={28} color="#9CA3AF" />
              </View>
              <Text className="text-base font-bold text-gray-500">No leads found</Text>
              <Text className="text-xs text-gray-400 mt-1 text-center px-8">Try adjusting your filters or add a new lead</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4 items-center"><ActivityIndicator size="small" color="#4F46E5" /></View>
            ) : null
          }
        />
      )}

      {/* ── Filter sheet ── */}
      <FilterSheet
        visible={showFilters} onClose={() => setShowFilters(false)}
        filterStatus={filterStatus} setFilterStatus={(v: string) => { setPage(1); setFilterStatus(v); }}
        filterPriority={filterPriority} setFilterPriority={(v: string) => { setPage(1); setFilterPriority(v); }}
        filterSource={filterSource} setFilterSource={(v: string) => { setPage(1); setFilterSource(v); }}
        filterStaff={filterStaff} setFilterStaff={(v: string) => { setPage(1); setFilterStaff(v); }}
        staffMembers={staffMembers} onClear={() => { clearFilters(); setShowFilters(false); }}
      />
    </View>
  );
}