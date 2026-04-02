import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';


type TabItem = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
};

const ALL_TABS: Record<string, TabItem> = {
  overview: {
    name: 'index',
    label: 'Overview',
    icon: 'home-outline',
    iconFocused: 'home',
  },
  leads: {
    name: 'leads',
    label: 'Leads',
    icon: 'people-outline',
    iconFocused: 'people',
  },
  staff: {
    name: 'staff',
    label: 'Staff',
    icon: 'person-add-outline',
    iconFocused: 'person-add',
  },
  tasks: {
    name: 'tasks',
    label: 'Tasks',
    icon: 'checkbox-outline',
    iconFocused: 'checkbox',
  },
  myTasks: {
    name: 'tasks',     // same screen, filtered by user
    label: 'My Tasks',
    icon: 'checkbox-outline',
    iconFocused: 'checkbox',
  },
  students: {
    name: 'students',
    label: 'Students',
    icon: 'school-outline',
    iconFocused: 'school',
  },
  myReports: {
    name: 'myreports',
    label: 'My Reports',
    icon: 'document-text-outline',
    iconFocused: 'document-text',
  },
  reports: {
    name: 'reports',
    label: 'Reports',
    icon: 'bar-chart-outline',
    iconFocused: 'bar-chart',
  },
  penalties: {
    name: 'penalties',
    label: 'Penalties',
    icon: 'warning-outline',
    iconFocused: 'warning',
  },
  markAttendance: {
    name: 'attendance',
    label: 'Attendance',
    icon: 'calendar-outline',
    iconFocused: 'calendar',
  },
  call: {
    name: 'calls',
    label: 'Voxbay',
    icon: 'call-outline',
    iconFocused: 'call',
  },
};

// Role nav — mirrors roleNavigation from your web roles.js
// Keep only unique screen names per role (myTasks and tasks both → tasks screen)
const ROLE_TABS: Record<string, (keyof typeof ALL_TABS)[]> = {
  ADMIN:         ['overview', 'leads', 'staff', 'tasks', 'students', 'reports', 'call'],
  CEO:           ['overview', 'leads', 'staff', 'tasks', 'students', 'myReports', 'reports', 'call'],
  CM:            ['overview', 'staff', 'leads', 'tasks', 'myReports', 'reports'],
  BUSINESS_HEAD: ['overview', 'leads', 'staff', 'myTasks', 'myReports'],
  OPS:           ['overview', 'leads', 'staff', 'tasks', 'myReports'],
  TRAINER:       ['overview', 'students', 'markAttendance', 'tasks', 'myReports'],
  ADM_MANAGER:   ['overview', 'leads', 'tasks', 'myReports'],
  ADM_EXEC:      ['overview', 'leads', 'tasks', 'myReports'],
  BDM:           ['overview', 'leads', 'tasks', 'myReports'],
  FOE:           ['overview', 'leads', 'tasks', 'myReports'],

  ACCOUNTS:      ['overview', 'penalties', 'tasks', 'myReports'],
  HR:            ['overview', 'staff', 'penalties', 'tasks', 'myReports'],

  MEDIA:         ['overview', 'tasks', 'myReports'],
  DOCUMENTATION: ['overview', 'tasks', 'myReports'],
  PROCESSING:    ['overview', 'tasks', 'myReports'],
};

// Deduplicate by screen name (e.g. myTasks + tasks both point to "tasks")
function getTabsForRole(role?: string): TabItem[] {
  const roleKey = role?.toUpperCase() ?? 'PROCESSING';
  const keys = ROLE_TABS[roleKey] ?? ROLE_TABS['PROCESSING'];
  const seen = new Set<string>();
  const result: TabItem[] = [];
  for (const key of keys) {
    const tab = ALL_TABS[key];
    if (tab && !seen.has(tab.name)) {
      seen.add(tab.name);
      result.push(tab);
    }
  }
  return result;
}

// ALL possible screen names — used to hide screens not in current role's tabs
const ALL_SCREEN_NAMES = [
  'index', 'leads', 'staff', 'tasks', 'students',
  'myreports', 'reports', 'penalties', 'attendance', 'calls',
];

export default function TabLayout() {
  const { user } = useAuthStore();

  if (!user) return <Redirect href="/login" />;

  const visibleTabs = getTabsForRole(user.role);
  const visibleNames = new Set(visibleTabs.map((t) => t.name));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      {ALL_SCREEN_NAMES.map((screenName) => {
        const tabConfig = visibleTabs.find((t) => t.name === screenName);
        const isVisible = visibleNames.has(screenName);

        return (
          <Tabs.Screen
            key={screenName}
            name={screenName}
            options={
              isVisible && tabConfig
                ? {
                    title: tabConfig.label,
                    tabBarIcon: ({ color, focused }) => (
                      <Ionicons
                        name={focused ? tabConfig.iconFocused : tabConfig.icon}
                        size={22}
                        color={color}
                      />
                    ),
                  }
                : {
                    // Hide screens the role doesn't have access to
                    href: null,
                  }
            }
          />
        );
      })}
    </Tabs>
  );
}