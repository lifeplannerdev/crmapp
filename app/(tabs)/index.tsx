import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  total_leads: number;
  active_staff: number;
  total_students: number;
  leads_change: number;
  staff_change: number;
  students_change: number;
}

interface Activity {
  id?: number;
  activity_type?: string;
  title?: string;
  user_name?: string;
  description?: string;
  created_at?: string;
  timestamp?: string;
}

interface Task {
  id?: number;
  title?: string;
  name?: string;
  priority?: string;
  due_date?: string;
  deadline?: string;
  completed?: boolean;
  status?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const formatTimeAgo = (dateStr?: string) => {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const formatTaskTime = (dateStr?: string) => {
  if (!dateStr) return 'No due date';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const isOverdue = (dateStr?: string) => {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
};

const getDaysUntil = (dateStr?: string) => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
};

// ─── Priority Badge ────────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority?: string }) {
  const p = priority?.toUpperCase();
  const styles: Record<string, { bg: string; text: string }> = {
    HIGH:   { bg: 'bg-red-100',    text: 'text-red-700' },
    MEDIUM: { bg: 'bg-orange-100', text: 'text-orange-700' },
    LOW:    { bg: 'bg-green-100',  text: 'text-green-700' },
  };
  const s = styles[p ?? ''] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <View className={`px-2 py-0.5 rounded-full ${s.bg}`}>
      <Text className={`text-xs font-bold ${s.text}`}>{p}</Text>
    </View>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({
  title, value, icon, bgColor, iconColor, change,
}: {
  title: string; value: string | number; icon: any;
  bgColor: string; iconColor: string; change?: number;
}) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <View className={`w-10 h-10 rounded-xl ${bgColor} items-center justify-center mb-3`}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text className="text-2xl font-extrabold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-500 mt-1 font-medium">{title}</Text>
      {change !== undefined && (
        <View className="flex-row items-center mt-2">
          <Ionicons
            name={change >= 0 ? 'trending-up' : 'trending-down'}
            size={12}
            color={change >= 0 ? '#10B981' : '#EF4444'}
          />
          <Text className={`text-xs ml-1 font-semibold ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {change >= 0 ? '+' : ''}{change}%
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, onPress }: { title: string; onPress?: () => void }) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <Text className="text-base font-bold text-gray-900">{title}</Text>
      {onPress && (
        <TouchableOpacity onPress={onPress}>
          <Text className="text-xs text-indigo-600 font-semibold">View all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Activity Item ────────────────────────────────────────────────────────────
function ActivityItem({ activity }: { activity: Activity }) {
  return (
    <View className="flex-row items-start gap-3 py-3 border-b border-gray-50">
      <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mt-0.5">
        <Ionicons name="calendar-outline" size={15} color="#4F46E5" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>
          {activity.activity_type || activity.title || 'Activity'}
        </Text>
        <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
          {activity.user_name || activity.description || '—'}
        </Text>
      </View>
      <Text className="text-xs text-gray-400 font-medium mt-0.5">
        {formatTimeAgo(activity.created_at || activity.timestamp)}
      </Text>
    </View>
  );
}

// ─── Task Item ────────────────────────────────────────────────────────────────
function TaskItem({ task, accent = 'indigo' }: { task: Task; accent?: 'indigo' | 'purple' }) {
  const due = task.due_date || task.deadline;
  const overdue = isOverdue(due);
  const daysUntil = getDaysUntil(due);
  const soon = daysUntil !== null && daysUntil <= 3 && daysUntil >= 0;

  const borderColor = overdue
    ? 'border-red-200 bg-red-50'
    : accent === 'purple'
    ? 'border-gray-100 bg-white'
    : 'border-gray-100 bg-white';

  return (
    <View className={`flex-row items-center gap-3 p-3 rounded-xl border mb-2 ${borderColor}`}>
      <View className={`w-5 h-5 rounded-md border-2 items-center justify-center ${
        overdue ? 'border-red-400' : accent === 'purple' ? 'border-purple-400' : 'border-indigo-400'
      }`}>
        {(task.completed || task.status === 'COMPLETED') && (
          <Ionicons name="checkmark" size={12} color={overdue ? '#EF4444' : '#4F46E5'} />
        )}
      </View>
      <View className="flex-1">
        <Text
          className={`text-sm font-semibold ${overdue ? 'text-red-800' : 'text-gray-800'}`}
          numberOfLines={1}
        >
          {task.title || task.name || 'Untitled Task'}
        </Text>
        <View className="flex-row items-center mt-1 gap-1">
          <Ionicons
            name="time-outline"
            size={11}
            color={overdue ? '#EF4444' : '#9CA3AF'}
          />
          <Text className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
            {formatTaskTime(due)}
          </Text>
        </View>
      </View>
      <View className="items-end gap-1">
        {task.priority && <PriorityBadge priority={task.priority} />}
        {overdue && (
          <View className="bg-red-100 px-2 py-0.5 rounded-full">
            <Text className="text-xs font-bold text-red-700">OVERDUE</Text>
          </View>
        )}
        {soon && !overdue && (
          <View className="bg-orange-100 px-2 py-0.5 rounded-full">
            <Text className="text-xs font-bold text-orange-700">SOON</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <View className="items-center py-8">
      <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mb-3">
        <Ionicons name={icon} size={22} color="#9CA3AF" />
      </View>
      <Text className="text-sm font-semibold text-gray-500">{title}</Text>
      <Text className="text-xs text-gray-400 mt-1 text-center">{subtitle}</Text>
    </View>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuthStore();

  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const userName = user?.first_name || user?.username || 'User';
  const userRole = user?.role || 'STAFF';

  const [stats, setStats] = useState<Stats>({
    total_leads: 0, active_staff: 0, total_students: 0,
    leads_change: 0, staff_change: 0, students_change: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const requests: Promise<any>[] = [
        api.get('/activities/').catch(() => ({ data: [] })),
        api.get('/tasks/pending/').catch(() => ({ data: [] })),
        api.get('/upcoming/').catch(() => ({ data: [] })),
      ];
      if (isAdmin) {
        requests.push(api.get('/stats/').catch(() => ({ data: {} })));
      }

      const results = await Promise.all(requests);

      const toArray = (d: any) =>
        Array.isArray(d?.data) ? d.data : d?.data?.results ?? [];

      setActivities(toArray(results[0]));
      setTasks(toArray(results[1]));
      setUpcomingTasks(toArray(results[2]));

      if (isAdmin && results[3]) {
        const d = results[3].data ?? {};
        setStats({
          total_leads: d.total_leads ?? 0,
          active_staff: d.active_staff ?? 0,
          total_students: d.total_students ?? 0,
          leads_change: d.leads_change ?? 0,
          staff_change: d.staff_change ?? 0,
          students_change: d.students_change ?? 0,
        });
      }
    } catch {
      setError('Failed to load some dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const roleBadgeColor: Record<string, { bg: string; text: string }> = {
    ADMIN:   { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    MANAGER: { bg: 'bg-purple-100', text: 'text-purple-700' },
    STAFF:   { bg: 'bg-green-100',  text: 'text-green-700' },
  };
  const badge = roleBadgeColor[userRole.toUpperCase()] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };

  if (loading) {
    return (
      <View className="flex-1 bg-indigo-50 items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-gray-500 font-medium">Loading dashboard…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#EEF2FF" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        {/* ── Header ── */}
        <View className="bg-indigo-50 px-5 pt-14 pb-6">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="text-2xl font-extrabold text-indigo-600 tracking-tight">
                  {isAdmin ? 'Admin Dashboard' : 'Dashboard'}
                </Text>
                <View className={`px-2.5 py-1 rounded-full ${badge.bg}`}>
                  <Text className={`text-xs font-bold ${badge.text}`}>
                    {userRole.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1.5 mt-1">
                <Ionicons name="sparkles" size={14} color="#EAB308" />
                <Text className="text-sm text-gray-600">
                  {getGreeting()},{' '}
                  <Text className="font-bold text-gray-800">{userName}</Text>!
                </Text>
              </View>
            </View>
          </View>

          {/* Date chip */}
          <View className="flex-row items-center self-start gap-1.5 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm mt-1">
            <Ionicons name="calendar-outline" size={13} color="#4F46E5" />
            <Text className="text-xs font-medium text-gray-700">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        <View className="px-4 pt-5 pb-8">

          {/* ── Error ── */}
          {error && (
            <View className="flex-row items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
              <Ionicons name="alert-circle" size={17} color="#DC2626" />
              <Text className="text-red-700 text-sm font-medium flex-1">{error}</Text>
            </View>
          )}

          {/* ── Admin Stats ── */}
          {isAdmin ? (
            <>
              <View className="flex-row gap-3 mb-3">
                <MetricCard
                  title="Total Leads"
                  value={stats.total_leads}
                  icon="people-outline"
                  bgColor="bg-blue-100"
                  iconColor="#3B82F6"
                  change={stats.leads_change}
                />
                <MetricCard
                  title="Active Staff"
                  value={stats.active_staff}
                  icon="person-add-outline"
                  bgColor="bg-emerald-100"
                  iconColor="#10B981"
                  change={stats.staff_change}
                />
              </View>
              <View className="flex-row gap-3 mb-6">
                <MetricCard
                  title="Total Students"
                  value={stats.total_students}
                  icon="school-outline"
                  bgColor="bg-purple-100"
                  iconColor="#8B5CF6"
                  change={stats.students_change}
                />
                <View className="flex-1" />
              </View>
            </>
          ) : (
            /* ── User Quick Actions ── */
            <View className="flex-row gap-3 mb-6">
              <MetricCard
                title="Today"
                value={new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                icon="calendar-outline"
                bgColor="bg-blue-100"
                iconColor="#3B82F6"
              />
              <MetricCard
                title="Pending Tasks"
                value={tasks.length}
                icon="checkbox-outline"
                bgColor="bg-indigo-100"
                iconColor="#6366F1"
              />
              <MetricCard
                title="Upcoming"
                value={upcomingTasks.length}
                icon="time-outline"
                bgColor="bg-orange-100"
                iconColor="#F97316"
              />
            </View>
          )}

          {/* ── Pending Tasks ── */}
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
            <SectionHeader title="Pending Tasks" />
            {tasks.length === 0 ? (
              <EmptyState
                icon="checkmark-circle-outline"
                title="No pending tasks"
                subtitle="You're all caught up! Great job!"
              />
            ) : (
              tasks.slice(0, 5).map((t, i) => (
                <TaskItem key={t.id ?? i} task={t} accent="indigo" />
              ))
            )}
          </View>

          {/* ── Upcoming Tasks ── */}
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
            <SectionHeader title="Upcoming Tasks" />
            {upcomingTasks.length === 0 ? (
              <EmptyState
                icon="calendar-clear-outline"
                title="No upcoming tasks"
                subtitle="Your schedule is clear ahead!"
              />
            ) : (
              upcomingTasks.slice(0, 5).map((t, i) => (
                <TaskItem key={t.id ?? i} task={t} accent="purple" />
              ))
            )}
          </View>

          {/* ── Recent Activities ── */}
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <SectionHeader title="Recent Activities" />
            {activities.length === 0 ? (
              <EmptyState
                icon="pulse-outline"
                title="No recent activities"
                subtitle="Activities will appear here as they happen"
              />
            ) : (
              activities.slice(0, 5).map((a, i) => (
                <ActivityItem key={a.id ?? i} activity={a} />
              ))
            )}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}