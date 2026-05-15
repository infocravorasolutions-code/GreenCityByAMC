import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Calendar, 
  Tag, 
  AlertTriangle, 
  CheckCircle, 
  Truck,
  MapPin,
  Clock,
  User
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/Theme';
import { ssoService, CcrTicket } from '../services/ssoService';

export default function SsoCcrDetailScreen({ route, navigation }: any) {
  const { ticket: initialTicket } = route.params;
  const { width } = useWindowDimensions();
  const [ticket, setTicket] = useState<CcrTicket>(initialTicket);


  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticket Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Header */}
        <View style={[styles.statusBanner, { backgroundColor: ticket.status === 'resolved' ? '#ecfdf5' : '#fff7ed' }]}>
          <View style={styles.statusInfo}>
            {ticket.status === 'resolved' ? (
              <CheckCircle size={20} color="#059669" />
            ) : (
              <Clock size={20} color="#d97706" />
            )}
            <Text style={[styles.statusLabel, { color: ticket.status === 'resolved' ? '#059669' : '#d97706' }]}>
              {ticket.status.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(ticket.priority) }]}>
            <Text style={styles.priorityText}>{ticket.priority.toUpperCase()} PRIORITY</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.contentCard}>
          <Text style={[styles.title, { fontSize: width > 600 ? 28 : 22 }]}>{ticket.title}</Text>
          
          <View style={styles.metaRow}>
            <Tag size={16} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{ticket.type}</Text>
            <View style={styles.dot} />
            <Calendar size={16} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{new Date(ticket.createdAt).toLocaleDateString()}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>{ticket.description}</Text>

          <View style={styles.infoGrid}>
            <InfoItem 
              icon={MapPin} 
              label="Zone" 
              value={ticket.zone} 
              width={width > 600 ? '48%' : '100%'}
            />
            {ticket.vehicleId && (
              <InfoItem 
                icon={Truck} 
                label="Vehicle" 
                value={typeof ticket.vehicleId === 'object' ? ticket.vehicleId.name : 'Associated Vehicle'} 
                width={width > 600 ? '48%' : '100%'}
              />
            )}
            <InfoItem 
              icon={User} 
              label="Officer" 
              value="Safety Officer" 
              width={width > 600 ? '48%' : '100%'}
            />
          </View>
        </View>


      </ScrollView>
    </SafeAreaView>
  );
}

function InfoItem({ icon: Icon, label, value, width }: any) {
  return (
    <View style={[styles.infoItem, { width }]}>
      <View style={styles.infoIconWrapper}>
        <Icon size={18} color={Colors.primary} />
      </View>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 8,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.surface,
  },
  contentCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  title: {
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  metaText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 6,
    fontWeight: '600',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 24,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '700',
  },
  resolveButton: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    ...Shadows.button,
  },
  disabledButton: {
    opacity: 0.7,
  },
  resolveButtonText: {
    color: Colors.surface,
    fontSize: 18,
    fontWeight: '800',
  },
});
