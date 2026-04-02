import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar, Modal, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../services/api';

// ─── Constants (from staffConstants) ─────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: 'OPS',         label: 'Operations Manager' },
  { value: 'ADM_MANAGER', label: 'Admission Manager' },
  { value: 'ADM_EXEC',    label: 'Admission Executive' },
  { value: 'CM',          label: 'Center Manager' },
  { value: 'BDM',         label: 'Business Development Manager' },
  { value: 'FOE',         label: 'FOE Cum TC' },
  { value: 'TRAINER',     label: 'Trainer' },
  { value: 'ACCOUNTS',    label: 'Accounts' },
  { value: 'HR',          label: 'HR' },
  { value: 'MEDIA',       label: 'Media' },
  { value: 'DOCUMENTATION', label: 'Documentation' },
  { value: 'PROCESSING',  label: 'Processing' },
];

const TEAM_OPTIONS = [
  'Sales', 'Operations', 'Admission', 'Training',
  'HR', 'Accounts', 'Media', 'Management',
];

const INITIAL_FORM = {
  firstName: '', lastName: '', username: '', email: '',
  phone: '', location: '', role: '', team: '',
  salary: '', password: '', confirmPassword: '', isActive: true,
};

// ─── Shared UI ────────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, gradient }: any) {
  return (
    <View className="flex-row items-center gap-3 mb-5">
      <View className={`w-10 h-10 rounded-xl ${gradient} items-center justify-center shadow`}>
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
      <View>
        <Text className="text-lg font-bold text-gray-900">{title}</Text>
        <Text className="text-xs text-gray-500">{subtitle}</Text>
      </View>
    </View>
  );
}

function Field({ label, required, error, children }: any) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-slate-700 mb-1.5">
        {label}{required && <Text className="text-red-500"> *</Text>}
      </Text>
      {children}
      {error ? (
        <View className="flex-row items-center gap-1 mt-1">
          <Ionicons name="alert-circle" size={13} color="#DC2626" />
          <Text className="text-xs text-red-600">{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

function StyledInput({ value, onChangeText, placeholder, keyboardType, secureTextEntry, error, autoCapitalize, ...rest }: any) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize ?? 'words'}
      className={`bg-white border-2 rounded-xl px-4 py-3 text-sm text-gray-800 font-medium h-12 ${error ? 'border-red-300' : 'border-slate-200'}`}
      {...rest}
    />
  );
}

function SelectBtn({ value, placeholder, onPress, error }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center justify-between bg-white border-2 rounded-xl px-4 h-12 ${error ? 'border-red-300' : 'border-slate-200'}`}
    >
      <Text className={`text-sm font-medium ${value ? 'text-gray-800' : 'text-gray-400'}`} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

function PickerModal({ visible, title, options, selected, onSelect, onClose }: any) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-3xl px-5 pt-4 pb-10 max-h-[70%]">
          <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-bold text-gray-900">{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#6B7280" /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((o: any) => {
              const val   = typeof o === 'string' ? o : o.value;
              const label = typeof o === 'string' ? o : o.label;
              const sel   = selected === val;
              return (
                <TouchableOpacity
                  key={val}
                  onPress={() => { onSelect(val); onClose(); }}
                  className="flex-row items-center justify-between py-3.5 border-b border-gray-50"
                >
                  <Text className={`text-sm ${sel ? 'font-bold text-indigo-600' : 'font-medium text-gray-800'}`}>{label}</Text>
                  {sel && <Ionicons name="checkmark-circle" size={18} color="#4F46E5" />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AddStaffScreen() {
  const [form, setForm]           = useState(INITIAL_FORM);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [picker, setPicker]       = useState<string | null>(null);
  const [showPass, setShowPass]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const setField = (field: string) => (val: any) => {
    setForm(p => ({ ...p, [field]: val }));
    setErrors(p => ({ ...p, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim())    e.firstName = 'First name is required';
    if (!form.lastName.trim())     e.lastName  = 'Last name is required';
    if (!form.username.trim())     e.username  = 'Username is required';
    if (!form.email.trim())        e.email     = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email is invalid';
    if (!form.phone.trim())        e.phone     = 'Phone number is required';
    if (!form.role)                e.role      = 'Role is required';
    if (!form.password)            e.password  = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post('/staff/create/', {
        first_name:  form.firstName,
        last_name:   form.lastName,
        username:    form.username,
        email:       form.email,
        phone:       form.phone,
        location:    form.location || '',
        role:        form.role,
        team:        form.team || '',
        is_active:   form.isActive,
        salary:      form.salary ? parseFloat(form.salary) : null,
        password:    form.password,
      });
      setSubmitted(true);
      setTimeout(() => router.replace('/(tabs)/staff'), 1500);
    } catch (err: any) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const fieldErrors: Record<string, string> = {};
        Object.keys(data).forEach(k => {
          fieldErrors[k] = Array.isArray(data[k]) ? data[k][0] : data[k];
        });
        if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }
      }
      Alert.alert('Error', data?.detail || data?.message || 'Failed to create staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    Alert.alert('Discard Changes?', 'Any unsaved changes will be lost.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const selectedRole = ROLE_OPTIONS.find(r => r.value === form.role)?.label ?? '';

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pt-14 pb-4 flex-row items-center gap-3 shadow-sm">
        <TouchableOpacity onPress={handleBack} className="w-9 h-9 bg-gray-100 rounded-xl items-center justify-center">
          <Ionicons name="arrow-back" size={18} color="#374151" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-gray-900">Add New Staff Member</Text>
          <Text className="text-xs text-gray-500">Fill in the details to add a new team member</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {/* Success */}
        {submitted && (
          <View className="flex-row items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text className="text-green-700 font-semibold text-sm">Staff member added successfully! Redirecting…</Text>
          </View>
        )}

        {/* ── Personal Info ── */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <SectionHeader icon="person-outline" title="Personal Information" subtitle="Basic details about the staff member" gradient="bg-blue-500" />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label="First Name" required error={errors.firstName}>
                <StyledInput value={form.firstName} onChangeText={setField('firstName')} placeholder="First name" error={errors.firstName} />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="Last Name" required error={errors.lastName}>
                <StyledInput value={form.lastName} onChangeText={setField('lastName')} placeholder="Last name" error={errors.lastName} />
              </Field>
            </View>
          </View>
          <Field label="Username" required error={errors.username}>
            <StyledInput value={form.username} onChangeText={setField('username')} placeholder="Enter username" autoCapitalize="none" error={errors.username} />
          </Field>
          <Field label="Email Address" required error={errors.email}>
            <StyledInput value={form.email} onChangeText={setField('email')} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" error={errors.email} />
          </Field>
          <Field label="Phone Number" required error={errors.phone}>
            <StyledInput value={form.phone} onChangeText={setField('phone')} placeholder="Enter phone number" keyboardType="phone-pad" autoCapitalize="none" error={errors.phone} />
          </Field>
          <Field label="Location">
            <StyledInput value={form.location} onChangeText={setField('location')} placeholder="Enter location" />
          </Field>
        </View>

        {/* ── Professional Info ── */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <SectionHeader icon="briefcase-outline" title="Professional Information" subtitle="Role and team details" gradient="bg-indigo-500" />
          <Field label="Role" required error={errors.role}>
            <SelectBtn value={selectedRole} placeholder="Select a role" onPress={() => setPicker('role')} error={errors.role} />
          </Field>
          <Field label="Team / Department">
            <SelectBtn value={form.team} placeholder="Select a team" onPress={() => setPicker('team')} />
          </Field>
          <Field label="Salary">
            <StyledInput value={form.salary} onChangeText={setField('salary')} placeholder="Enter salary" keyboardType="numeric" autoCapitalize="none" />
          </Field>
          <View className="flex-row items-center justify-between py-2">
            <Text className="text-sm font-semibold text-slate-700">Active Status</Text>
            <Switch
              value={form.isActive}
              onValueChange={setField('isActive')}
              trackColor={{ true: '#4F46E5', false: '#D1D5DB' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── Security ── */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <SectionHeader icon="shield-outline" title="Security Information" subtitle="Account credentials and access" gradient="bg-rose-500" />
          <Field label="Password" required error={errors.password}>
            <View className={`flex-row items-center bg-white border-2 rounded-xl px-4 h-12 ${errors.password ? 'border-red-300' : 'border-slate-200'}`}>
              <TextInput
                value={form.password}
                onChangeText={setField('password')}
                placeholder="Enter password (min 8 chars)"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPass}
                autoCapitalize="none"
                className="flex-1 text-sm text-gray-800"
              />
              <TouchableOpacity onPress={() => setShowPass(p => !p)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </Field>
          <Field label="Confirm Password" required error={errors.confirmPassword}>
            <View className={`flex-row items-center bg-white border-2 rounded-xl px-4 h-12 ${errors.confirmPassword ? 'border-red-300' : 'border-slate-200'}`}>
              <TextInput
                value={form.confirmPassword}
                onChangeText={setField('confirmPassword')}
                placeholder="Confirm password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                className="flex-1 text-sm text-gray-800"
              />
              <TouchableOpacity onPress={() => setShowConfirm(p => !p)}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </Field>
        </View>

        {/* Info note */}
        <View className="flex-row items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6">
          <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
          <Text className="text-xs text-blue-700 flex-1">
            Fields marked with * are required. The staff member will receive login credentials via email once their account is created.
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3">
          <TouchableOpacity onPress={handleBack} disabled={submitting} className="flex-1 py-3.5 border-2 border-gray-200 rounded-xl items-center">
            <Text className="text-sm font-semibold text-gray-700">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || submitted}
            className={`flex-1 py-3.5 rounded-xl items-center flex-row justify-center gap-2 ${submitting || submitted ? 'bg-blue-400' : 'bg-blue-600'}`}
          >
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="save-outline" size={17} color="#fff" />}
            <Text className="text-sm font-bold text-white">{submitting ? 'Saving…' : 'Save Staff Member'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Pickers */}
      <PickerModal visible={picker === 'role'} title="Select Role" options={ROLE_OPTIONS} selected={form.role} onSelect={setField('role')} onClose={() => setPicker(null)} />
      <PickerModal visible={picker === 'team'} title="Select Team" options={TEAM_OPTIONS} selected={form.team} onSelect={setField('team')} onClose={() => setPicker(null)} />
    </View>
  );
}