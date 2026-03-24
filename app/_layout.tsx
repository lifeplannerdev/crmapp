import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from './store/authStore';

export default function RootLayout() {
  const { user, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="(tabs)" />
      ) : (
        <Stack.Screen name="login" />
      )}
    </Stack>
  );
}