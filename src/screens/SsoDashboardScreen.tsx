import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  useWindowDimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Ticket, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  MapPin,
  PlusCircle,
  Bell,
  Navigation,
  BarChart2,
  History,
  LogOut
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/Theme';
import { useAuth } from '../context/AuthContext';
import { ssoService, CcrTicket } from '../services/ssoService';

export default function SsoDashboardScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0 });
  const [recentTickets, setRecentTickets] = useState<CcrTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const tickets = await ssoService.getTickets(true);
      setStats({
        total: tickets.length,
        pending: tickets.filter(t => t.status === 'pending').length,
        resolved: tickets.filter(t => t.status === 'resolved').length
      });
      setRecentTickets(tickets.slice(0, 3));
    } catch (error) {
      console.error('Failed to load SSO data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (e) {
            console.error('Logout failed:', e);
          }
        }
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>Hello, {user?.name?.split(' ')[0]}</Text>
          <View style={styles.zoneWrapper}>
            <MapPin size={12} color={Colors.primary} />
            <Text style={styles.zoneText}>{user?.zone || 'Zone Officer'}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1 }]} onPress={handleLogout}>
          <LogOut size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Welcome Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <Text style={[styles.heroTitle, { fontSize: width > 600 ? 32 : 24 }]}>Safety First, Always.</Text>
            <Text style={[styles.heroSubtitle, { 
              fontSize: width > 600 ? 18 : 14, 
              lineHeight: width > 600 ? 26 : 20 
            }]}>Monitor your zone and manage safety tickets efficiently.</Text>
            <TouchableOpacity 
              style={styles.heroButton}
              onPress={() => navigation.navigate('SsoCreateCcr')}
            >
              <Text style={styles.heroButtonText}>Start New Ticket</Text>
              <ArrowRight size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <ShieldCheck size={80} color="rgba(255,255,255,0.2)" style={styles.heroIcon} />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard 
            label="Total" 
            value={stats.total} 
            icon={Ticket} 
            color="#4f46e5" 
            cardWidth={(width - Spacing.lg * 2 - Spacing.md * 2) / 3}
          />
          <StatCard 
            label="Pending" 
            value={stats.pending} 
            icon={Clock} 
            color="#f59e0b" 
            cardWidth={(width - Spacing.lg * 2 - Spacing.md * 2) / 3}
          />
          <StatCard 
            label="Resolved" 
            value={stats.resolved} 
            icon={CheckCircle2} 
            color="#10b981" 
            cardWidth={(width - Spacing.lg * 2 - Spacing.md * 2) / 3}
          />
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate('SsoLiveMap')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Navigation size={22} color="#4F46E5" />
            </View>
            <Text style={styles.actionLabel}>Tracking</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate('SsoAnalytics')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
              <BarChart2 size={22} color="#10B981" />
            </View>
            <Text style={styles.actionLabel}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate('SsoHistory')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFF7ED' }]}>
              <History size={22} color="#F59E0B" />
            </View>
            <Text style={styles.actionLabel}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Tickets */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Tickets</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SsoCcrList')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentTickets.length > 0 ? (
          recentTickets.map((ticket) => (
            <TouchableOpacity 
              key={ticket._id} 
              style={styles.ticketCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('SsoCcrDetail', { ticket })}
            >
              <View style={styles.ticketInfo}>
                <Text style={styles.ticketTitle} numberOfLines={1}>{ticket.title}</Text>
                <Text style={styles.ticketType}>{ticket.type} • {new Date(ticket.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: ticket.status === 'resolved' ? '#ecfdf5' : '#fff7ed' }]}>
                <Text style={[styles.statusText, { color: ticket.status === 'resolved' ? '#059669' : '#d97706' }]}>
                  {ticket.status.toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No tickets found in your zone.</Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('SsoCreateCcr')}
      >
        <PlusCircle size={32} color={Colors.surface} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon: Icon, color, cardWidth }: any) {
  return (
    <View style={[styles.statCard, { width: cardWidth }]}>
      <View style={[styles.statIconWrapper, { backgroundColor: `${color}15` }]}>
        <Icon size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadows.card,
  },
  greetingText: {
    fontSize: Typography.header,
    fontWeight: '800',
    color: Colors.text,
  },
  zoneWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  zoneText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Shadows.button,
  },
  heroContent: {
    flex: 1,
    zIndex: 1,
  },
  heroTitle: {
    fontWeight: '900',
    color: Colors.surface,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  heroButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    color: Colors.primary,
    fontWeight: '800',
    marginRight: 8,
    fontSize: 14,
  },
  heroIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  statCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.card,
  },
  statIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
  },
  ticketCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  ticketType: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  bottomSpacer: {
    height: 80,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: Colors.primary,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.button,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginHorizontal: 4,
    alignItems: 'center',
    ...Shadows.card,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
});
