import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar, Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import UpdateScreen from './src/screens/UpdateScreen';
import { checkForUpdate, UpdateDecision } from './src/services/appSettingsService';
import SplashScreen from './src/screens/SplashScreen';
import { notificationService } from './src/services/notificationService';

function App(): React.JSX.Element {
  const [updateDecision, setUpdateDecision] = React.useState<UpdateDecision | null>(null);
  const [updateChecked, setUpdateChecked] = React.useState(false);
  const [optionalPromptShown, setOptionalPromptShown] = React.useState(false);
  React.useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        try {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]);
        } catch (err) {
          console.warn(err);
        }
      }
      
      // Notification setup
      const hasPermission = await notificationService.requestUserPermission();
      if (hasPermission) {
        await notificationService.getFCMToken();
        await notificationService.createDefaultChannel();
      }
    };
    requestPermissions();

    const unsubscribe = notificationService.setupListeners();
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const decision = await checkForUpdate();
        if (mounted) setUpdateDecision(decision);
      } catch (e) {
        // If settings endpoint is down, don't block the app.
        if (mounted) setUpdateDecision({ kind: 'ok' });
      } finally {
        if (mounted) setUpdateChecked(true);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    const showOptionalUpdatePrompt = async (decision: Extract<UpdateDecision, { kind: 'optional' }>) => {
      setOptionalPromptShown(true);

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
        await Linking.openURL(decision.storeUrl);
      };

      const message =
        decision.notes?.trim() ||
        `Current: ${decision.currentVersion}\nLatest: ${decision.latestVersion}`;

      Alert.alert('Update available', message, [
        { text: 'Not now', style: 'cancel', onPress: () => setUpdateDecision({ kind: 'ok' }) },
        { text: 'Update', onPress: () => openStore().finally(() => setUpdateDecision({ kind: 'ok' })) },
      ]);
    };

    if (updateDecision?.kind === 'optional' && !optionalPromptShown) {
      showOptionalUpdatePrompt(updateDecision);
    }
  }, [optionalPromptShown, updateDecision]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar barStyle="dark-content" />
            {!updateChecked || !updateDecision ? (
              <SplashScreen />
            ) : updateDecision.kind === 'ok' ? (
              <AppNavigator />
            ) : updateDecision.kind === 'optional' ? (
              // Optional update uses a popup; keep app on splash until user picks.
              <SplashScreen />
            ) : (
              <UpdateScreen
                decision={updateDecision}
                onSkip={updateDecision.kind === 'optional' ? () => setUpdateDecision({ kind: 'ok' }) : undefined}
              />
            )}
          </NavigationContainer>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default App;
