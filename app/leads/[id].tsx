import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (d?: string) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  ENQUIRY:    { bg: 'bg-blue-100',   text: 'text-blue-700' },
  CONTACTED:  { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  QUALIFIED:  { bg: 'bg-purple-100', text: 'text-purple-700' },
  CONVERTED:  { bg: 'bg-green-100',  text: 'text-green-700' },
  REGISTERED: { bg: 'bg-teal-100',   text: 'text-teal-700' },
  LOST:       { bg: 'bg-red-100',    text: 'text-red-700' },
};

const PRIORITY_STYLE: Record<string, { bg: string; text: string }> = {
  HIGH:   { bg: 'bg-red-100',    text: 'text-red-700' },
  MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  LOW:    { bg: 'bg-green-100',  text: 'text-green-700' },
};

const PROCESSING_STYLE: Record<string, { bg: string; text: string }> = {
  PENDING:    { bg: 'bg-gray-100',    text: 'text-gray-700' },
  FORWARDED:  { bg: 'bg-blue-100',    text: 'text-blue-700' },
  ACCEPTED:   { bg: 'bg-green-100',   text: 'text-green-700' },
  PROCESSING: { bg: 'bg-yellow-100',  text: 'text-yellow-700' },
  COMPLETED:  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  REJECTED:   { bg: 'bg-red-100',     text: 'text-red-700' },
};

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, iconBg = 'bg-indigo-100', iconColor = '#4F46E5' }: any) {
  return (
    <View className="flex-row items-center gap-3 py-2.5 border-b border-gray-50">
      <View className={`w-8 h-8 rounded-xl ${iconBg} items-center justify-center`}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-xs text-gray-400 font-medium">{label}</Text>
        <Text className="text-sm font-semibold text-gray-800 mt-0.5">{value || 'N/A'}</Text>
      </View>
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, color = 'bg-indigo-600' }: { name?: string; color?: string }) {
  const initials = name?.charAt(0)?.toUpperCase() ?? '?';
  return (
    <View className={`w-10 h-10 rounded-full ${color} items-center justify-center`}>
      <Text className="text-white font-bold text-base">{initials}</Text>
    </View>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
function TabBtn({ label, active, onPress }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 py-2.5 rounded-xl items-center ${active ? 'bg-indigo-600' : 'bg-transparent'}`}
    >
      <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-gray-500'}`}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children }: any) {
  return (
    <View className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
      <View className="flex-row items-center gap-2 px-4 py-3 border-b border-gray-50">
        <Ionicons name={icon} size={16} color="#4F46E5" />
        <Text className="text-sm font-bold text-gray-800">{title}</Text>
      </View>
      <View className="px-4 py-2">{children}</View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [lead, setLead]                       = useState<any>(null);
  const [assignmentHistory, setAssignHistory] = useState<any[]>([]);
  const [processingTimeline, setTimeline]     = useState<any[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [activeTab, setActiveTab]             = useState<'details' | 'assignment' | 'history'>('details');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [leadRes, histRes, tlRes] = await Promise.all([
        api.get(`/leads/${id}/`),
        api.get(`/leads/${id}/assignment-history/`).catch(() => null),
        api.get(`/leads/${id}/timeline/`).catch(() => null),
      ]);
      setLead(leadRes.data);
      if (histRes) setAssignHistory(Array.isArray(histRes.data) ? histRes.data : []);
      if (tlRes)   setTimeline(Array.isArray(tlRes.data) ? tlRes.data : []);
    } catch {
      Alert.alert('Error', 'Failed to load lead details.', [
        { text: 'Go Back', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = () => {
    Alert.alert('Delete Lead', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/leads/${id}/`);
            router.replace('/(tabs)/leads');
          } catch {
            Alert.alert('Error', 'Failed to delete lead.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-3 text-sm text-gray-500 font-medium">Loading lead details…</Text>
      </View>
    );
  }

  if (!lead) return null;

  const statusStyle   = STATUS_STYLE[lead.status?.toUpperCase()]   ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
  const priorityStyle = PRIORITY_STYLE[lead.priority?.toUpperCase()] ?? { bg: 'bg-gray-100', text: 'text-gray-500' };

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#EEF2FF" />

      {/* ── Top bar ── */}
      <View className="bg-indigo-50 px-4 pt-14 pb-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 bg-white rounded-xl items-center justify-center border border-gray-200">
          <Ionicons name="arrow-back" size={18} color="#374151" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-gray-900 flex-1 ml-3" numberOfLines={1}>{lead.name}</Text>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => router.push(`/leads/${id}/edit` as any)}
            className="w-9 h-9 bg-blue-100 rounded-xl items-center justify-center"
          >
            <Ionicons name="create-outline" size={18} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} className="w-9 h-9 bg-red-100 rounded-xl items-center justify-center">
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Hero badges ── */}
      <View className="flex-row gap-2 px-4 py-3">
        <View className={`px-3 py-1.5 rounded-full ${statusStyle.bg}`}>
          <Text className={`text-xs font-bold capitalize ${statusStyle.text}`}>{lead.status?.toLowerCase()}</Text>
        </View>
        <View className={`px-3 py-1.5 rounded-full ${priorityStyle.bg}`}>
          <Text className={`text-xs font-bold ${priorityStyle.text}`}>{lead.priority}</Text>
        </View>
        {lead.source && (
          <View className="px-3 py-1.5 rounded-full bg-gray-100">
            <Text className="text-xs font-semibold text-gray-600">{lead.source}</Text>
          </View>
        )}
      </View>

      {/* ── Tabs ── */}
      <View className="flex-row bg-gray-100 mx-4 rounded-xl p-1 mb-3">
        <TabBtn label="Details"    active={activeTab === 'details'}    onPress={() => setActiveTab('details')} />
        <TabBtn label="Assignment" active={activeTab === 'assignment'} onPress={() => setActiveTab('assignment')} />
        <TabBtn label="History"    active={activeTab === 'history'}    onPress={() => setActiveTab('history')} />
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ══ DETAILS TAB ══════════════════════════════════════════════════════ */}
        {activeTab === 'details' && (
          <>
            <SectionCard title="Contact Information" icon="person-outline">
              <InfoRow icon="call-outline"     iconBg="bg-green-100"  iconColor="#16A34A" label="Phone"    value={lead.phone} />
              <InfoRow icon="mail-outline"     iconBg="bg-blue-100"   iconColor="#2563EB" label="Email"    value={lead.email} />
              <InfoRow icon="location-outline" iconBg="bg-purple-100" iconColor="#7C3AED" label="Location" value={lead.location} />
            </SectionCard>

            <SectionCard title="Lead Details" icon="document-text-outline">
              <InfoRow icon="school-outline"   iconBg="bg-indigo-100" iconColor="#4F46E5" label="Program"  value={lead.program} />
              <InfoRow icon="flash-outline"    iconBg="bg-orange-100" iconColor="#EA580C" label="Source"   value={lead.source} />
              <InfoRow icon="calendar-outline" iconBg="bg-teal-100"   iconColor="#0D9488" label="Created"  value={formatDate(lead.created_at)} />
              <InfoRow icon="time-outline"     iconBg="bg-gray-100"   iconColor="#6B7280" label="Updated"  value={formatDate(lead.updated_at)} />
            </SectionCard>

            {lead.remarks ? (
              <SectionCard title="Remarks / Notes" icon="chatbubble-outline">
                <Text className="text-sm text-gray-700 leading-5 py-2">{lead.remarks}</Text>
              </SectionCard>
            ) : null}
          </>
        )}

        {/* ══ ASSIGNMENT TAB ═══════════════════════════════════════════════════ */}
        {activeTab === 'assignment' && (
          <>
            {/* Primary assignment */}
            <View className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-4">
              <Text className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Primary Assignment</Text>
              {lead.assigned_to ? (
                <>
                  <View className="flex-row items-center gap-3 mb-3">
                    <Avatar name={lead.assigned_to.first_name} color="bg-indigo-600" />
                    <View>
                      <Text className="text-sm font-bold text-gray-900">
                        {lead.assigned_to.first_name} {lead.assigned_to.last_name}
                      </Text>
                      <Text className="text-xs text-gray-500">{lead.assigned_to.role}</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-4">
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500">Assigned By</Text>
                      <Text className="text-sm font-semibold text-gray-800">
                        {lead.assigned_by ? `${lead.assigned_by.first_name} ${lead.assigned_by.last_name}` : 'System'}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500">Assigned On</Text>
                      <Text className="text-sm font-semibold text-gray-800">{formatDate(lead.assigned_date)}</Text>
                    </View>
                  </View>
                </>
              ) : (
                <Text className="text-sm text-gray-500 text-center py-2">Not assigned to anyone</Text>
              )}
            </View>

            {/* Sub assignment */}
            <View className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 mb-4">
              <Text className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-3">Sub Assignment</Text>
              {lead.sub_assigned_to ? (
                <>
                  <View className="flex-row items-center gap-3 mb-3">
                    <Avatar name={lead.sub_assigned_to.first_name} color="bg-purple-600" />
                    <View>
                      <Text className="text-sm font-bold text-gray-900">
                        {lead.sub_assigned_to.first_name} {lead.sub_assigned_to.last_name}
                      </Text>
                      <Text className="text-xs text-gray-500">{lead.sub_assigned_to.role}</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-4">
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500">Sub-Assigned By</Text>
                      <Text className="text-sm font-semibold text-gray-800">
                        {lead.sub_assigned_by ? `${lead.sub_assigned_by.first_name} ${lead.sub_assigned_by.last_name}` : 'System'}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500">Sub-Assigned On</Text>
                      <Text className="text-sm font-semibold text-gray-800">{formatDate(lead.sub_assigned_date)}</Text>
                    </View>
                  </View>
                </>
              ) : (
                <Text className="text-sm text-gray-500 text-center py-2">No sub-assignment</Text>
              )}
            </View>

            {/* Current handler */}
            {lead.current_handler && (
              <View className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 flex-row items-center gap-3">
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                <View>
                  <Text className="text-xs text-gray-500">Current Handler</Text>
                  <Text className="text-sm font-bold text-gray-900">
                    {lead.current_handler.first_name} {lead.current_handler.last_name}
                  </Text>
                </View>
              </View>
            )}

            {/* Assignment history */}
            {assignmentHistory.length > 0 && (
              <SectionCard title="Assignment History" icon="time-outline">
                {assignmentHistory.map((a: any, i: number) => {
                  const isP = a.assignment_type === 'PRIMARY';
                  return (
                    <View key={a.id ?? i} className="py-3 border-b border-gray-50">
                      <View className="flex-row items-center gap-2 mb-1">
                        <View className={`px-2 py-0.5 rounded-full ${isP ? 'bg-blue-100' : 'bg-purple-100'}`}>
                          <Text className={`text-xs font-bold ${isP ? 'text-blue-700' : 'text-purple-700'}`}>
                            {a.assignment_type}
                          </Text>
                        </View>
                        <Text className="text-xs text-gray-400">{formatDate(a.timestamp)}</Text>
                      </View>
                      <Text className="text-sm text-gray-700">
                        <Text className="font-semibold">{a.assigned_to?.first_name} {a.assigned_to?.last_name}</Text>
                        {' '}was assigned by{' '}
                        <Text className="font-semibold">{a.assigned_by?.first_name} {a.assigned_by?.last_name}</Text>
                      </Text>
                      {a.notes ? <Text className="text-xs text-gray-500 italic mt-1">"{a.notes}"</Text> : null}
                    </View>
                  );
                })}
              </SectionCard>
            )}
          </>
        )}

        {/* ══ HISTORY TAB ══════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <>
            <SectionCard title="Processing Timeline" icon="git-branch-outline">
              {processingTimeline.length === 0 ? (
                <View className="items-center py-8">
                  <Ionicons name="time-outline" size={32} color="#9CA3AF" />
                  <Text className="text-sm text-gray-400 mt-2">No processing history available</Text>
                </View>
              ) : (
                processingTimeline.map((t: any, i: number) => {
                  const ps = PROCESSING_STYLE[t.status?.toUpperCase()] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };
                  return (
                    <View key={t.id ?? i} className="py-3 border-l-2 border-indigo-300 pl-3 mb-2">
                      <View className="flex-row items-center gap-2 mb-1">
                        <View className={`px-2 py-0.5 rounded-full ${ps.bg}`}>
                          <Text className={`text-xs font-bold ${ps.text}`}>{t.status?.replace('_', ' ')}</Text>
                        </View>
                        <Text className="text-xs text-gray-400">{formatDate(t.timestamp)}</Text>
                      </View>
                      {t.changed_by && (
                        <Text className="text-xs text-gray-600">
                          Changed by: <Text className="font-semibold">{t.changed_by.first_name} {t.changed_by.last_name}</Text>
                        </Text>
                      )}
                      {t.notes ? <Text className="text-xs text-gray-500 mt-1">{t.notes}</Text> : null}
                    </View>
                  );
                })
              )}
            </SectionCard>

            <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <Text className="text-xs text-gray-500 mb-1">Last Updated</Text>
              <Text className="text-sm font-bold text-gray-900">{formatDate(lead.updated_at)}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}