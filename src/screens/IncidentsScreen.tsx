import React from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Filter, Search, MapPin, Clock, ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/Theme';

const INCIDENTS = [
  { id: '1', title: 'Smart Bin Overflow', location: 'Zone A - Market Central', status: 'Priority', time: '5 mins ago', category: 'Waste' },
  { id: '2', title: 'Unauthorized Dumping', location: 'Zone B - Residential St', status: 'Active', time: '1 hour ago', category: 'Waste' },
  { id: '3', title: 'Pipe Leakage Reported', location: 'Zone C - Park View', status: 'Pending', time: '2 hours ago', category: 'Water' },
  { id: '4', title: 'Street Light Failure', location: 'Zone A - Bypass Rd', status: 'Resolved', time: 'Yesterday', category: 'Electrical' },
  { id: '5', title: 'Garbage Truck Delay', location: 'Zone D - Industrial', status: 'Active', time: '3 hours ago', category: 'Logistics' },
];

const Tag = ({ label, type }: any) => {
  const getColors = () => {
    switch (type) {
      case 'Priority': return { bg: '#fee2e2', text: '#ef4444' };
      case 'Active': return { bg: '#fff7ed', text: '#f97316' };
      case 'Resolved': return { bg: '#f0fdf4', text: '#10b981' };
      default: return { bg: '#f1f5f9', text: '#64748b' };
    }
  };
  const colors = getColors();
  return (
    <View style={[styles.tag, { backgroundColor: colors.bg }]}>
      <Text style={[styles.tagText, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

export default function IncidentsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color={Colors.textSecondary} />
          <Text style={styles.searchPlaceholder}>Search incidents or locations</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={INCIDENTS}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.category}>{item.category}</Text>
              <Tag label={item.status} type={item.status} />
            </View>
            
            <Text style={styles.title}>{item.title}</Text>
            
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <MapPin size={14} color={Colors.textSecondary} />
                <Text style={styles.detailText}>{item.location}</Text>
              </View>
              <View style={styles.detailItem}>
                <Clock size={14} color={Colors.textSecondary} />
                <Text style={styles.detailText}>{item.time}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.avatarGroup}>
                <View style={[styles.avatar, { backgroundColor: Colors.primaryLight }]} />
                <Text style={styles.assignedText}>Assigned to Ravi K.</Text>
              </View>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={false} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    height: 48,
    marginRight: Spacing.md,
  },
  searchPlaceholder: {
    marginLeft: Spacing.sm,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: `${Colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  category: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  assignedText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
});
