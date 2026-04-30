import React from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/Theme';
import { UpdateDecision } from '../services/appSettingsService';

function PrimaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Text onPress={onPress} style={styles.primaryButton}>
      {title}
    </Text>
  );
}

function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Text onPress={onPress} style={styles.secondaryButton}>
      {title}
    </Text>
  );
}

export default function UpdateScreen({
  decision,
  onSkip,
}: {
  decision: Exclude<UpdateDecision, { kind: 'ok' }>;
  onSkip?: () => void;
}) {
  const openStore = async () => {
    if (!decision.storeUrl) {
      Alert.alert('Update', 'Store link is not configured yet.');
      return;
    }
    const can = await Linking.canOpenURL(decision.storeUrl);
    if (!can) {
      Alert.alert('Update', 'Unable to open store link.');
      return;
    }
    Linking.openURL(decision.storeUrl);
  };

  const title = decision.kind === 'force' ? 'Update required' : 'Update available';
  const body =
    decision.notes?.trim() ||
    `Current: ${decision.currentVersion}\nLatest: ${decision.latestVersion}`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>

      <View style={styles.buttons}>
        <PrimaryButton title="Update" onPress={openStore} />
        {decision.kind === 'optional' && onSkip ? (
          <SecondaryButton title="Not now" onPress={onSkip} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  title: {
    color: Colors.surface,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  body: {
    color: Colors.surface,
    opacity: 0.92,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttons: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.surface,
    color: Colors.primary,
    paddingVertical: 14,
    textAlign: 'center',
    borderRadius: 12,
    fontWeight: '800',
    overflow: 'hidden',
  },
  secondaryButton: {
    borderColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    color: Colors.surface,
    paddingVertical: 14,
    textAlign: 'center',
    borderRadius: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
});

