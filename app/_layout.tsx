import '../global.css';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const { user, loadUser } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadUser();   // reads stored user + tokens from SecureStore
      setIsReady(true);
    };
    init();
  }, []);

  // Navigate once we know auth state
  useEffect(() => {
    if (!isReady) return;
    if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/login');
    }
  }, [isReady, user]);

  // Show splash/loading while checking stored session
  if (!isReady) {
    return (
      <View className="flex-1 bg-indigo-50 items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="staff/index" />
      <Stack.Screen name="staff/add" />
      <Stack.Screen name="staff/edit/[id]" />
    </Stack>
  );
}