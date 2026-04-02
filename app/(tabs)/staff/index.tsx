import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-blue-500',
  'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-slate-600',
];
const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, iconName, bgColor, iconColor }: any) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</Text>
          <Text className="text-3xl font-bold text-slate-900 mt-1">{value}</Text>
        </View>
        <View className={`w-12 h-12 ${bgColor} rounded-xl items-center justify-center`}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>
      </View>
    </View>
  );
}

// ─── Staff Card ───────────────────────────────────────────────────────────────
function StaffCard({ staff, onEdit, onDelete }: any) {
  const avatarColor = getAvatarColor(staff.name);
  return (
    <View className="bg-white rounded-xl border border-slate-200 shadow-sm mb-3 overflow-hidden">
      <View className="p-4">
        {/* Top row */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-row items-center gap-3 flex-1">
            <View className={`w-14 h-14 rounded-full ${avatarColor} items-center justify-center`}>
              <Text className="text-white text-lg font-bold">{getInitials(staff.name)}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-bold text-gray-900 text-base" numberOfLines={1}>{staff.name}</Text>
              <View className="mt-1 self-start px-2 py-0.5 bg-purple-100 rounded-full">
                <Text className="text-xs font-semibold text-purple-700">{staff.role}</Text>
              </View>
            </View>
          </View>
          <View className={`px-2 py-1 rounded-full flex-row items-center gap-1 ${staff.status === 'active' ? 'bg-green-100' : 'bg-red-100'}`}>
            <Ionicons
              name={staff.status === 'active' ? 'checkmark-circle' : 'close-circle'}
              size={12}
              color={staff.status === 'active' ? '#15803d' : '#dc2626'}
            />
            <Text className={`text-xs font-medium ${staff.status === 'active' ? 'text-green-700' : 'text-red-700'}`}>
              {staff.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Department */}
        <View className="self-start px-3 py-1 bg-indigo-100 rounded-full mb-3">
          <Text className="text-xs font-medium text-indigo-700">{staff.department}</Text>
        </View>

        {/* Info rows */}
        <View className="gap-1.5 mb-3">
          <View className="flex-row items-center gap-2">
            <Ionicons name="mail-outline" size={14} color="#9CA3AF" />
            <Text className="text-sm text-gray-600 flex-1" numberOfLines={1}>{staff.email || 'N/A'}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Ionicons name="call-outline" size={14} color="#9CA3AF" />
            <Text className="text-sm text-gray-600">{staff.phone || 'N/A'}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Ionicons name="location-outline" size={14} color="#9CA3AF" />
            <Text className="text-sm text-gray-600 flex-1" numberOfLines={1}>{staff.location || 'N/A'}</Text>
          </View>
        </View>

        <Text className="text-xs text-gray-400 mb-3">Joined: {staff.joinDate}</Text>

        {/* Actions */}
        <View className="flex-row gap-2 pt-3 border-t border-gray-100">
          <TouchableOpacity
            onPress={() => onEdit(staff.id)}
            className="flex-1 py-2 bg-blue-50 rounded-lg flex-row items-center justify-center gap-1.5"
          >
            <Ionicons name="create-outline" size={15} color="#2563EB" />
            <Text className="text-sm font-semibold text-blue-600">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(staff.id, staff.name)}
            className="px-4 py-2 bg-red-50 rounded-lg items-center justify-center"
          >
            <Ionicons name="trash-outline" size={15} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StaffScreen() {
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [loading, setLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [pagination, setPagination] = useState({ count: 0, currentPage: 1 });

  const fetchStaff = useCallback(async (page = 1, search = '', team = '') => {
    setLoading(true);
    try {
      const params: any = { page, page_size: 50 };
      if (search) params.search = search;
      if (team && team !== 'all') params.team = team;

      const res = await api.get('/staff/', { params });
      const data = res.data;

      const mapped = (data.results || [])
        .map((s: any) => ({
          id: s.id,
          name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.username,
          role: s.role?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()),
          department: s.team || 'Unassigned',
          email: s.email,
          phone: s.phone,
          location: s.location,
          status: s.is_active ? 'active' : 'inactive',
          joinDate: new Date(s.date_joined).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        }))
        .filter((s: any) => {
          const r = s.role?.toLowerCase();
          return r !== 'admin' && r !== 'managing director';
        });

      setStaffMembers(mapped);
      setPagination({ count: data.count, currentPage: page });
    } catch {
      Alert.alert('Error', 'Failed to load staff members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(1, searchTerm, filterDept); }, [filterDept]);

  useEffect(() => {
    const t = setTimeout(() => fetchStaff(1, searchTerm, filterDept), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const handleDelete = (staffId: number, name: string) => {
    Alert.alert('Delete Staff', `Are you sure you want to delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/staff/${staffId}/delete/`);
            fetchStaff(pagination.currentPage, searchTerm, filterDept);
          } catch {
            Alert.alert('Error', 'Failed to delete staff member.');
          }
        },
      },
    ]);
  };

  const departments = useMemo(() => {
    const depts = new Set(staffMembers.map(s => s.department));
    return ['all', ...Array.from(depts).filter(d => d !== 'Unassigned')];
  }, [staffMembers]);

  const activeCount   = staffMembers.filter(s => s.status === 'active').length;
  const inactiveCount = staffMembers.filter(s => s.status === 'inactive').length;

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#EEF2FF" />

      {/* ── Header ── */}
      <View className="bg-indigo-50 px-4 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-extrabold text-indigo-600">Staff Management</Text>
            <Text className="text-sm text-slate-500 mt-0.5">Manage your team members</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/staff/add' as any)}
            className="bg-indigo-600 px-4 py-2.5 rounded-xl flex-row items-center gap-2"
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-white font-bold text-sm">Add Staff</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Stats ── */}
        <View className="px-4 pt-4 gap-3">
          <View className="flex-row gap-3">
            <StatCard label="Total Staff" value={pagination.count.toString()} iconName="people" bgColor="bg-violet-100" iconColor="#7C3AED" />
            <StatCard label="Active" value={activeCount.toString()} iconName="checkmark-circle" bgColor="bg-emerald-100" iconColor="#059669" />
          </View>
          <View className="flex-row gap-3">
            <StatCard label="On Leave" value="0" iconName="time" bgColor="bg-amber-100" iconColor="#D97706" />
            <StatCard label="Inactive" value={inactiveCount.toString()} iconName="close-circle" bgColor="bg-rose-100" iconColor="#E11D48" />
          </View>
        </View>

        {/* ── Search & Filter ── */}
        <View className="mx-4 mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <View className="flex-row items-center border-2 border-slate-200 rounded-xl px-3 h-12 bg-white mb-3">
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              className="flex-1 ml-2 text-slate-700 text-sm"
              placeholder="Search by name, role, or email..."
              placeholderTextColor="#94A3B8"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm ? (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() => setShowFilter(true)}
            className="flex-row items-center justify-between border-2 border-slate-200 rounded-xl px-3 h-12 bg-white"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="filter-outline" size={18} color="#94A3B8" />
              <Text className="text-sm font-medium text-slate-700">
                {filterDept === 'all' ? 'All Departments' : filterDept}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* ── Staff List ── */}
        <View className="px-4 mt-4">
          {loading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text className="text-slate-500 mt-3">Loading staff members…</Text>
            </View>
          ) : staffMembers.length === 0 ? (
            <View className="items-center py-16 bg-white rounded-2xl border border-slate-200">
              <Ionicons name="people-outline" size={56} color="#CBD5E1" />
              <Text className="text-slate-500 mt-3 font-medium">No staff members found</Text>
            </View>
          ) : (
            staffMembers.map(staff => (
              <StaffCard
                key={staff.id}
                staff={staff}
                onEdit={(id: number) => router.push(`/(tabs)/staff/edit/${id}` as any)}
                onDelete={handleDelete}
              />
            ))
          )}
        </View>

        {/* Pagination */}
        {pagination.count > 50 && (
          <View className="flex-row items-center justify-center gap-3 mt-4 px-4">
            <TouchableOpacity
              disabled={pagination.currentPage === 1}
              onPress={() => fetchStaff(pagination.currentPage - 1, searchTerm, filterDept)}
              className={`flex-row items-center gap-1 px-4 py-2.5 rounded-xl border-2 ${pagination.currentPage === 1 ? 'border-gray-200 opacity-40' : 'border-gray-300'}`}
            >
              <Ionicons name="chevron-back" size={16} color="#374151" />
              <Text className="text-sm font-semibold text-gray-700">Prev</Text>
            </TouchableOpacity>
            <Text className="text-sm text-gray-600 font-medium">
              Page {pagination.currentPage} of {Math.ceil(pagination.count / 50)}
            </Text>
            <TouchableOpacity
              disabled={pagination.currentPage === Math.ceil(pagination.count / 50)}
              onPress={() => fetchStaff(pagination.currentPage + 1, searchTerm, filterDept)}
              className={`flex-row items-center gap-1 px-4 py-2.5 rounded-xl border-2 ${pagination.currentPage === Math.ceil(pagination.count / 50) ? 'border-gray-200 opacity-40' : 'border-gray-300'}`}
            >
              <Text className="text-sm font-semibold text-gray-700">Next</Text>
              <Ionicons name="chevron-forward" size={16} color="#374151" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Department Filter Modal ── */}
      <Modal visible={showFilter} animationType="slide" transparent onRequestClose={() => setShowFilter(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl px-5 pt-4 pb-10">
            <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-bold text-gray-900">Filter by Department</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {departments.map(dept => (
                <TouchableOpacity
                  key={dept}
                  onPress={() => { setFilterDept(dept); setShowFilter(false); }}
                  className="flex-row items-center justify-between py-3.5 border-b border-gray-50"
                >
                  <Text className={`text-sm ${filterDept === dept ? 'font-bold text-indigo-600' : 'font-medium text-gray-800'}`}>
                    {dept === 'all' ? 'All Departments' : dept}
                  </Text>
                  {filterDept === dept && <Ionicons name="checkmark-circle" size={18} color="#4F46E5" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}