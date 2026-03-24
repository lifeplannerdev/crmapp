// 📁 app/login.tsx

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen() {
  const { loginUser, isLoading, error } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  const validate = () => {
    const errs: typeof fieldErrors = {};
    if (!username.trim()) errs.username = 'Username is required';
    if (!password.trim()) errs.password = 'Password is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = useCallback(async () => {
    if (!validate()) return;
    await loginUser(username.trim(), password);
  }, [username, password]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-indigo-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#EEF2FF" />

      {/* ── Blob background ── */}
      <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
        <View className="absolute top-20 -left-10 w-56 h-56 rounded-full bg-indigo-200 opacity-35" />
        <View className="absolute top-40 -right-10 w-56 h-56 rounded-full bg-purple-200 opacity-35" />
        <View className="absolute bottom-20 left-1/3 w-56 h-56 rounded-full bg-pink-200 opacity-30" />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-5 pt-16 pb-8 justify-center">

          {/* ── Card ── */}
          <View className="bg-white/85 rounded-3xl p-7 border border-white/50 shadow-xl">

            {/* Logo */}
            <View className="flex-row items-center gap-3 mb-5">
              <View className="w-12 h-12 rounded-2xl bg-indigo-600 items-center justify-center shadow-lg">
                <Ionicons name="school" size={26} color="#fff" />
              </View>
              <Text className="text-2xl font-extrabold text-indigo-600 tracking-tight">
                LP CRM
              </Text>
            </View>

            {/* Heading */}
            <Text className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</Text>
            <Text className="text-sm text-gray-500 mb-5">Sign in to access your dashboard</Text>

            {/* General error */}
            {error ? (
              <View className="flex-row items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text className="text-red-600 text-sm flex-1">{error}</Text>
              </View>
            ) : null}

            {/* Username */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Username</Text>
              <View
                className={`flex-row items-center border-2 rounded-xl px-4 h-13 bg-white/60 ${fieldErrors.username ? 'border-red-300' : 'border-gray-300'
                  }`}
              >
                <Ionicons name="person-outline" size={20} color="#000" />
                <TextInput
                  className="flex-1 text-gray-900 text-base ml-3"
                  placeholder="Enter your username"
                  placeholderTextColor="#9CA3AF"
                  value={username}
                  onChangeText={(v) => {
                    setUsername(v);
                    if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: undefined }));
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
              {fieldErrors.username ? (
                <View className="flex-row items-center gap-1 mt-1 ml-1">
                  <Ionicons name="alert-circle" size={13} color="#DC2626" />
                  <Text className="text-red-600 text-xs">{fieldErrors.username}</Text>
                </View>
              ) : null}
            </View>

            {/* Password */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 mb-2">Password</Text>
              <View
                className={`flex-row items-center border-2 rounded-xl px-4 h-13 bg-white/60 ${fieldErrors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
              >
                <Ionicons name="lock-closed-outline" size={20} color="#000" />
                <TextInput
                  className="flex-1 text-gray-900 text-base ml-3"
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword((p) => !p)} activeOpacity={0.7}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
              {fieldErrors.password ? (
                <View className="flex-row items-center gap-1 mt-1 ml-1">
                  <Ionicons name="alert-circle" size={13} color="#DC2626" />
                  <Text className="text-red-600 text-xs">{fieldErrors.password}</Text>
                </View>
              ) : null}
            </View>

            {/* Submit button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
              className={`rounded-xl h-13 items-center justify-center flex-row gap-2 ${isLoading ? 'bg-indigo-400' : 'bg-indigo-600'
                }`}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text className="text-white font-bold text-base ml-2">Signing in...</Text>
                </>
              ) : (
                <>
                  <Text className="text-white font-bold text-base">Sign In</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}