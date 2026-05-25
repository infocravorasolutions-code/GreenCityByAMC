import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Volume2,
  MapPin,
  Car,
  Clock,
  Search
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/Theme';
import { managerService } from '../services/managerService';
import { ttsService } from '../services/ttsService';
import { useTranslation } from '../context/LanguageContext';

export default function ManagerCcrListScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTickets = useCallback(async () => {
    try {
      const data = await managerService.getTickets();
      setTickets(data || []);
    } catch (error) {
      console.error('Failed to load manager tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    
    // Stop TTS when leaving the screen
    const unsubscribe = navigation.addListener('blur', () => {
      ttsService.stop();
    });
    return unsubscribe;
  }, [fetchTickets, navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const handleTTS = (lang: string, title: string, description: string) => {
    const textToSpeak = `${title}. ${description}`;
    
    if (lang === 'Gujarati') {
      ttsService.speak(textToSpeak, 'gu-IN');
    } else if (lang === 'Hindi') {
      ttsService.speak(textToSpeak, 'hi-IN');
    }
  };

  const filteredTickets = tickets.filter(item => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    const titleMatch = item.title?.toLowerCase().includes(lowerQuery);
    const descMatch = item.description?.toLowerCase().includes(lowerQuery);
    const vehicleMatch = item.vehicleId?.name?.toLowerCase().includes(lowerQuery);
    return titleMatch || descMatch || vehicleMatch;
  });

  const renderTicketItem = ({ item }: { item: any }) => {
    const isComplaint = item.type?.toLowerCase() === 'complaint';
    const accentColor = isComplaint ? '#ef4444' : '#3b82f6';
    const typeLabel = isComplaint ? '⚠️ COMPLAINT / ફરિયાદ' : '📋 TASK / કામ';

    return (
      <View style={[styles.card, { borderTopColor: accentColor }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.typeBadge, { color: accentColor, backgroundColor: `${accentColor}15` }]}>
            {typeLabel}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'resolved' ? '#ecfdf5' : '#fff7ed' }]}>
            <Text style={[styles.statusText, { color: item.status === 'resolved' ? '#059669' : '#d97706' }]}>
              {item.status === 'resolved' ? '✅ DONE' : '⏳ PENDING'}
            </Text>
          </View>
        </View>

        <Text style={styles.titleText}>{item.title}</Text>
        <Text style={styles.descText}>{item.description}</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoBadge}>
            <Car size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{item.vehicleId?.name || 'No Vehicle'}</Text>
          </View>
          <View style={styles.infoBadge}>
            <MapPin size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>
              {item.zone ? item.zone.charAt(0).toUpperCase() + item.zone.slice(1) : 'No Zone'}
            </Text>
          </View>
        </View>

        <View style={styles.audioSection}>
          <Text style={styles.listenLabel}>🔊 સાંભળો (Listen):</Text>
          <View style={styles.audioButtonsRow}>
            <TouchableOpacity style={[styles.audioButton, { borderColor: '#059669', backgroundColor: '#ecfdf5' }]} onPress={() => handleTTS('Gujarati', item.title, item.description)}>
              <Volume2 size={18} color="#059669" />
              <Text style={[styles.audioButtonText, { color: '#059669' }]}>ગુજરાતી</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.audioButton, { borderColor: '#d97706', backgroundColor: '#fff7ed' }]} onPress={() => handleTTS('Hindi', item.title, item.description)}>
              <Volume2 size={18} color="#d97706" />
              <Text style={[styles.audioButtonText, { color: '#d97706' }]}>हिंदी</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('dashboard.wardTasks')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks, vehicles..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={(item) => item._id}
          renderItem={renderTicketItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Clock size={64} color={Colors.border} />
              <Text style={styles.emptyTitle}>No Tasks Today</Text>
              <Text style={styles.emptySubtitle}>આજે કોઈ કામ નથી</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    ...Shadows.soft,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.text,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
    color: Colors.text,
  },
  centerContent: {
    flex: 1,
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
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderTopWidth: 6,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  typeBadge: {
    fontSize: 14,
    fontWeight: '900',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '900',
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  descText: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  audioSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  listenLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  audioButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  audioButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  audioButtonText: {
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 8,
  },
});
