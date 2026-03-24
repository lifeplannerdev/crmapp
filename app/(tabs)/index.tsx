import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user?.first_name}!</Text>
      <Text style={styles.role}>{user?.role}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  role: { fontSize: 16, color: 'gray', marginTop: 8 },
});