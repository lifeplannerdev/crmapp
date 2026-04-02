import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

// ─── Constants (from leadConstants.js) ───────────────────────────────────────
const STATUS_OPTIONS    = ['ENQUIRY','QUALIFIED','CONVERTED','NOT_INTERESTED','CNR'];
const SOURCE_OPTIONS    = ['WHATSAPP','INSTAGRAM','WEBSITE','WALK_IN','AUTOMATION','ADS','OTHER'];
const PRIORITY_OPTIONS  = ['HIGH','MEDIUM','LOW'];
const PROGRAM_OPTIONS   = [
  'A1','A2','B1','B2','A1 ONLINE','A2 ONLINE','B1 ONLINE','B2 ONLINE',
  'A1 EXAM PREPERATION','A2 EXAM PREPERATION','B1 EXAM PREPERATION','B2 EXAM PREPERATION',
  'PVP','AUSBILDUNG','GCC','FLAG','NURSING RECRUITMENT','STUDY',
];

const ROLE_DISPLAY: Record<string, string> = {
  ADMIN:'General Manager', OPS:'Operations Manager', ADM_MANAGER:'Admission Manager',
  ADM_EXEC:'Admission Executive', CM:'Center Manager', BDM:'Business Development Manager', FOE:'FOE Cum TC',
};

// ─── Picker Modal ─────────────────────────────────────────────────────────────
function PickerModal({ visible, title, options, selected, onSelect, onClose, renderLabel }: any) {
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
              const val = typeof o === 'string' ? o : o.value;
              const label = renderLabel ? renderLabel(o) : (typeof o === 'string' ? o : o.label);
              const sel = selected === val;
              return (
                <TouchableOpacity
                  key={val}
                  onPress={() => { onSelect(val); onClose(); }}
                  className={`flex-row items-center justify-between py-3.5 border-b border-gray-50 ${sel ? 'opacity-100' : 'opacity-90'}`}
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

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, required, error, children }: any) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-gray-700 mb-1.5">
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

// ─── Text input ───────────────────────────────────────────────────────────────
function StyledInput({ value, onChangeText, placeholder, keyboardType, multiline, error, ...rest }: any) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
      textAlignVertical={multiline ? 'top' : 'center'}
      className={`bg-white border-2 rounded-xl px-4 py-3 text-sm text-gray-800 font-medium ${
        error ? 'border-red-300' : 'border-gray-200'
      } ${multiline ? 'min-h-[90px]' : 'h-12'}`}
      {...rest}
    />
  );
}

// ─── Select button ────────────────────────────────────────────────────────────
function SelectBtn({ value, placeholder, onPress, error }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center justify-between bg-white border-2 rounded-xl px-4 h-12 ${
        error ? 'border-red-300' : 'border-gray-200'
      }`}
    >
      <Text className={`text-sm font-medium ${value ? 'text-gray-800' : 'text-gray-400'}`}>
        {value || placeholder}
      </Text>
      <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

// ─── Priority radio ───────────────────────────────────────────────────────────
function PriorityRadio({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const styles: Record<string, string> = {
    HIGH: 'bg-red-100 border-red-400 text-red-700',
    MEDIUM: 'bg-yellow-100 border-yellow-400 text-yellow-700',
    LOW: 'bg-green-100 border-green-400 text-green-700',
  };
  return (
    <View className="flex-row gap-2">
      {PRIORITY_OPTIONS.map(p => {
        const sel = value === p;
        return (
          <TouchableOpacity
            key={p}
            onPress={() => onChange(p)}
            className={`flex-1 py-2.5 rounded-xl border-2 items-center ${sel ? styles[p] : 'bg-white border-gray-200'}`}
          >
            <Text className={`text-xs font-bold ${sel ? '' : 'text-gray-500'}`}>{p}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function AddLeadScreen() {
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', location: '',
    priority: 'MEDIUM', status: 'ENQUIRY', program: '',
    source: '', customSource: '', remarks: '', assignedTo: '',
  });
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [availableUsers, setUsers]    = useState<any[]>([]);
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);

  // Picker modals
  const [picker, setPicker] = useState<string | null>(null);

  const set = (field: string) => (val: string) => {
    setFormData(p => ({ ...p, [field]: val }));
    setErrors(p => ({ ...p, [field]: '' }));
  };

  // Fetch available users
  useEffect(() => {
    api.get('/leads/available-users/').then(res => {
      let users = Array.isArray(res.data) ? res.data : [];
      const role = user?.role;
      if (role === 'ADM_MANAGER') {
        users = users.filter((u: any) => ['ADM_MANAGER','ADM_EXEC','FOE'].includes(u.role));
      } else if (role === 'FOE' || role === 'ADM_EXEC') {
        users = users.filter((u: any) => u.id === user?.id);
      }
      setUsers(users);
    }).catch(() => {});
  }, [user]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim())       e.name = 'Name is required';
    else if (formData.name.trim().length < 3) e.name = 'Name must be at least 3 characters';
    if (!formData.phone.trim())      e.phone = 'Phone number is required';
    else if (!/^\d{10,}$/.test(formData.phone.trim())) e.phone = 'Must be at least 10 digits';
    if (!formData.source)            e.source = 'Source is required';
    if (formData.source === 'OTHER' && !formData.customSource.trim()) e.customSource = 'Please specify source';
    if (!formData.assignedTo)        e.assignedTo = 'Please assign this lead to a staff member';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post('/leads/create/', {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        source: formData.source,
        custom_source: formData.source === 'OTHER' ? formData.customSource.trim() : '',
        email: formData.email?.trim() || null,
        program: formData.program || null,
        location: formData.location?.trim() || null,
        priority: formData.priority,
        status: formData.status,
        remarks: formData.remarks?.trim() || '',
        assigned_to: parseInt(formData.assignedTo),
      });
      setSubmitted(true);
      setTimeout(() => router.replace('/(tabs)/leads'), 1500);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to create lead';
      Alert.alert('Error', msg);
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

  const selectedUser = availableUsers.find(u => String(u.id) === formData.assignedTo);
  const selectedUserLabel = selectedUser
    ? `${selectedUser.first_name} ${selectedUser.last_name} — ${ROLE_DISPLAY[selectedUser.role] ?? selectedUser.role}`
    : '';

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-indigo-50 px-4 pt-14 pb-4 flex-row items-center gap-3">
        <TouchableOpacity onPress={handleBack} className="w-9 h-9 bg-white rounded-xl items-center justify-center border border-gray-200">
          <Ionicons name="arrow-back" size={18} color="#374151" />
        </TouchableOpacity>
        <View>
          <Text className="text-lg font-extrabold text-indigo-600">Add New Lead</Text>
          <Text className="text-xs text-gray-500">Fill in the details to add a lead</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {/* Success */}
        {submitted && (
          <View className="flex-row items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text className="text-green-700 font-semibold text-sm">Lead added successfully! Redirecting…</Text>
          </View>
        )}

        {/* ── Contact Information ── */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <Text className="text-sm font-bold text-gray-800 mb-4">Contact Information</Text>
          <Field label="Full Name" required error={errors.name}>
            <StyledInput value={formData.name} onChangeText={set('name')} placeholder="Enter lead's full name" error={errors.name} />
          </Field>
          <Field label="Phone Number" required error={errors.phone}>
            <StyledInput value={formData.phone} onChangeText={set('phone')} placeholder="Enter phone number" keyboardType="phone-pad" error={errors.phone} />
          </Field>
          <Field label="Email Address" error={errors.email}>
            <StyledInput value={formData.email} onChangeText={set('email')} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" error={errors.email} />
          </Field>
          <Field label="Location">
            <StyledInput value={formData.location} onChangeText={set('location')} placeholder="Enter location" />
          </Field>
        </View>

        {/* ── Lead Details ── */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <Text className="text-sm font-bold text-gray-800 mb-4">Lead Details</Text>
          <Field label="Program / Course">
            <SelectBtn value={formData.program} placeholder="Select a program" onPress={() => setPicker('program')} />
          </Field>
          <Field label="Status">
            <SelectBtn value={formData.status} placeholder="Select status" onPress={() => setPicker('status')} />
          </Field>
          <Field label="Priority Level">
            <PriorityRadio value={formData.priority} onChange={set('priority')} />
          </Field>
          <Field label="Lead Source" required error={errors.source}>
            <SelectBtn value={formData.source} placeholder="Select source" onPress={() => setPicker('source')} error={errors.source} />
          </Field>
          {formData.source === 'OTHER' && (
            <Field label="Custom Source" required error={errors.customSource}>
              <StyledInput value={formData.customSource} onChangeText={set('customSource')} placeholder="Specify custom source" error={errors.customSource} />
            </Field>
          )}
        </View>

        {/* ── Assignment ── */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <Text className="text-sm font-bold text-gray-800 mb-4">Assignment</Text>
          <Field label="Assign To" required error={errors.assignedTo}>
            <SelectBtn
              value={selectedUserLabel}
              placeholder="Select a staff member"
              onPress={() => setPicker('assignedTo')}
              error={errors.assignedTo}
            />
          </Field>
        </View>

        {/* ── Remarks ── */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <Text className="text-sm font-bold text-gray-800 mb-4">Additional Information</Text>
          <Field label="Remarks / Notes">
            <StyledInput
              value={formData.remarks}
              onChangeText={set('remarks')}
              placeholder="Add any additional notes…"
              multiline
            />
          </Field>
        </View>

        {/* Info note */}
        <View className="flex-row items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6">
          <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
          <Text className="text-xs text-blue-700 flex-1">Fields marked with * are required. Make sure to fill them before saving.</Text>
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-3">
          <TouchableOpacity onPress={handleBack} className="flex-1 py-3.5 border-2 border-gray-200 rounded-xl items-center" disabled={submitting}>
            <Text className="text-sm font-semibold text-gray-700">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || submitted}
            className={`flex-1 py-3.5 rounded-xl items-center flex-row justify-center gap-2 ${submitting || submitted ? 'bg-indigo-300' : 'bg-indigo-600'}`}
          >
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="save-outline" size={17} color="#fff" />}
            <Text className="text-sm font-bold text-white">{submitting ? 'Saving…' : 'Save Lead'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Picker modals ── */}
      <PickerModal
        visible={picker === 'program'} title="Select Program"
        options={PROGRAM_OPTIONS} selected={formData.program}
        onSelect={set('program')} onClose={() => setPicker(null)}
      />
      <PickerModal
        visible={picker === 'status'} title="Select Status"
        options={STATUS_OPTIONS} selected={formData.status}
        onSelect={set('status')} onClose={() => setPicker(null)}
      />
      <PickerModal
        visible={picker === 'source'} title="Select Source"
        options={SOURCE_OPTIONS} selected={formData.source}
        onSelect={set('source')} onClose={() => setPicker(null)}
      />
      <PickerModal
        visible={picker === 'assignedTo'} title="Assign To"
        options={availableUsers}
        selected={formData.assignedTo}
        renderLabel={(u: any) => `${u.first_name} ${u.last_name} — ${ROLE_DISPLAY[u.role] ?? u.role}`}
        onSelect={(val: string) => { set('assignedTo')(val); }}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}