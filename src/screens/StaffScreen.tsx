import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { Search, Plus, Trash2, Edit2, X, ChevronDown } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/Theme';
import { managerService } from '../services/managerService';

export default function StaffScreen({ navigation }: any) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');
  const [showDesignation, setShowDesignation] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    empCode: '',
    designation: '',
    category: 'semiSkilled',
    shift: 'morning',
    phone: '',
    email: '',
    department: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await managerService.getEmployees();
      let empArray = [];
      if (Array.isArray(data)) empArray = data;
      else if (data && Array.isArray(data.employees)) empArray = data.employees;
      else if (data && data.success && Array.isArray(data.data)) empArray = data.data;

      setEmployees(empArray);
      handleSearch(search, empArray);
    } catch (error) {
      console.error('[StaffScreen] Failed to fetch employees:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  const handleSearch = (text: string, dataToFilter = employees) => {
    setSearch(text);
    if (text) {
      const filtered = dataToFilter.filter(emp =>
        (emp.name && emp.name.toLowerCase().includes(text.toLowerCase())) ||
        (emp.empCode && emp.empCode.toLowerCase().includes(text.toLowerCase())) ||
        (emp.email && emp.email.toLowerCase().includes(text.toLowerCase()))
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(dataToFilter);
    }
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      empCode: '',
      designation: '',
      category: 'semiSkilled',
      shift: 'morning',
      phone: '',
      email: '',
      department: '',
    });
    setIsEditing(false);
    setModalVisible(true);
  };

  const openEditModal = (emp: any) => {
    setCurrentId(emp._id);
    setFormData({
      name: emp.name || '',
      empCode: emp.empCode || '',
      designation: emp.designation || '',
      category: emp.category || 'semiSkilled',
      shift: emp.shift || 'morning',
      phone: emp.phone || '',
      email: emp.email || '',
      department: emp.department || '',
    });
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await managerService.deleteEmployee(id);
              fetchEmployees();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete employee.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const saveEmployee = async () => {
    if (!formData.name || !formData.empCode) {
      Alert.alert('Required Fields', 'Please provide at least a Name and Code.');
      return;
    }

    setSaving(true);
    const apiData = new FormData();
    Object.keys(formData).forEach(key => {
      apiData.append(key, (formData as any)[key]);
    });

    try {
      if (isEditing) {
        await managerService.updateEmployee(currentId, apiData);
      } else {
        await managerService.createEmployee(apiData);
      }
      setModalVisible(false);
      fetchEmployees();
    } catch (err: any) {
      console.error('[StaffScreen] Save error:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save employee.');
    } finally {
      setSaving(false);
    }
  };

  const renderBadge = (text: string, type: 'category' | 'shift') => {
    if (!text) return <Text>-</Text>;

    let bgColor = Colors.background;
    let textColor = Colors.textSecondary;

    if (type === 'shift') {
      bgColor = '#f3e8ff'; // Light purple
      textColor = Colors.primary;
    } else {
      // Category
      if (text.toLowerCase().includes('semi')) {
        bgColor = '#fef3c7'; // Light amber
        textColor = '#d97706';
      } else if (text.toLowerCase().includes('unskilled')) {
        bgColor = '#f1f5f9'; // Ligh slate
        textColor = '#64748b';
      } else {
        bgColor = '#e0f2fe'; // Light blue
        textColor = '#0369a1';
      }
    }

    return (
      <View style={[styles.badge, { backgroundColor: bgColor }]}>
        <Text style={[styles.badgeText, { color: textColor }]}>
          {text.charAt(0).toUpperCase() + text.slice(1)}
        </Text>
      </View>
    );
  };

  if (loading && !refreshing && employees.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Area */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>My Employees</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Plus size={16} color={Colors.surface} />
            <Text style={styles.addButtonText}>Add Employee</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Total <Text style={{ color: Colors.error }}>{employees.length}</Text> employees</Text>

        <View style={styles.searchWrapper}>
          <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, code or email..."
            value={search}
            onChangeText={(t) => handleSearch(t)}
          />
        </View>
      </View>

      <FlatList
        data={search ? filteredEmployees : employees}
        keyExtractor={item => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            {/* Employee Profile */}
            <View style={styles.cellEmployee}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name ? item.name.charAt(0).toUpperCase() : 'U'}</Text>
              </View>
              <View>
                <Text style={styles.empNameText}>{item.name}</Text>
                <Text style={styles.empCodeText}>{item.empCode}</Text>
              </View>
            </View>

            {/* Designation */}
            <View style={styles.cellBasic}>
              <Text style={styles.cellText}>{item.designation || '-'}</Text>
            </View>

            {/* Badges and details in a scrollable block to mirror table behavior on small screens */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollableCells}>
              <View style={styles.cellScroll}>
                {renderBadge(item.category, 'category')}
              </View>
              <View style={styles.cellScroll}>
                <Text style={styles.cellText}>{item.phone || '-'}</Text>
              </View>
              <View style={styles.cellScroll}>
                {renderBadge(item.shift, 'shift')}
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.cellActions}>
              <TouchableOpacity style={styles.actionIconButton} onPress={() => openEditModal(item)}>
                <Edit2 size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIconButton} onPress={() => handleDelete(item._id, item.name)}>
                <Trash2 size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Form Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isEditing ? 'Edit Employee' : 'Add Employee'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Employee Name <Text style={{ color: Colors.error }}>*</Text></Text>
              <TextInput style={styles.input} value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} placeholder="John Doe" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Employee Code <Text style={{ color: Colors.error }}>*</Text></Text>
              <TextInput style={styles.input} value={formData.empCode} onChangeText={(t) => setFormData({ ...formData, empCode: t })} placeholder="EMP-001" autoCapitalize="none" />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput style={styles.input} value={formData.phone} onChangeText={(t) => setFormData({ ...formData, phone: t })} placeholder="1234567890" keyboardType="phone-pad" />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: Spacing.sm }]}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput style={styles.input} value={formData.email} onChangeText={(t) => setFormData({ ...formData, email: t })} placeholder="user@mail.com" keyboardType="email-address" autoCapitalize="none" />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                <Text style={styles.label}>Shift</Text>
                {/* Simulated Dropdown */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.radioGroup}>
                  {['morning', 'evening', 'night'].map(s => (
                    <TouchableOpacity key={s} onPress={() => setFormData({ ...formData, shift: s })} style={[styles.radioBtn, formData.shift === s && styles.radioBtnActive]}>
                      <Text style={[styles.radioText, formData.shift === s && styles.radioTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.radioGroup}>
                {['skilled', 'semiSkilled', 'unSkilled'].map(c => (
                  <TouchableOpacity key={c} onPress={() => setFormData({ ...formData, category: c })} style={[styles.radioBtn, formData.category === c && styles.radioBtnActive]}>
                    <Text style={[styles.radioText, formData.category === c && styles.radioTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Designation <Text style={{ color: Colors.error }}>*</Text></Text>
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowDesignation(!showDesignation)}>
                <Text style={formData.designation ? styles.dropdownBtnText : styles.dropdownPlaceholder}>
                  {formData.designation || 'Select Designation...'}
                </Text>
                <ChevronDown size={18} color={Colors.textSecondary} />
              </TouchableOpacity>

              {showDesignation && (
                <View style={styles.dropdownMenu}>
                  {['Security Officer', 'Ladies Guard', 'Security Guard', 'Supervisor', 'Other'].map(d => (
                    <TouchableOpacity 
                      key={d} 
                      style={styles.dropdownItem} 
                      onPress={() => {
                        setFormData({ ...formData, designation: d });
                        setShowDesignation(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, formData.designation === d && styles.dropdownItemTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.inputGroup, { marginBottom: 60 }]}>
              <Text style={styles.label}>Department</Text>
              <TextInput style={styles.input} value={formData.department} onChangeText={(t) => setFormData({ ...formData, department: t })} placeholder="Administration" />
            </View>

          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={saveEmployee} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={Colors.surface} /> : <Text style={styles.saveBtnText}>Save Employee</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    top: 30,
    backgroundColor: Colors.background,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  addButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  addButtonText: {
    color: Colors.surface,
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 14,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  listContent: {
    paddingBottom: 40,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  tableRow: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  cellEmployee: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    color: Colors.surface,
    fontWeight: '800',
    fontSize: 16,
  },
  empNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  empCodeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cellBasic: {
    marginBottom: Spacing.md,
  },
  cellText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  scrollableCells: {
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  cellScroll: {
    marginRight: Spacing.lg,
    paddingVertical: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cellActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  actionIconButton: {
    padding: 8,
    marginLeft: Spacing.sm,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  formScroll: {
    padding: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  radioGroup: {
    flexDirection: 'row',
  },
  radioBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginRight: Spacing.sm,
    backgroundColor: Colors.background,
  },
  radioBtnActive: {
    backgroundColor: '#f3e8ff',
    borderColor: Colors.primary,
  },
  radioText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  radioTextActive: {
    color: Colors.primary,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
  },
  dropdownBtnText: {
    fontSize: 15,
    color: Colors.text,
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  dropdownMenu: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    ...Shadows.soft,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
    borderRadius: BorderRadius.md,
    ...Shadows.soft,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.surface,
  },
});
