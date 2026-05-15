import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationService {
  async requestUserPermission() {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (res !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('User denied notification permissions');
        return false;
      }
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      return true;
    }
    return false;
  }

  async getFCMToken() {
    try {
      let fcmToken = await AsyncStorage.getItem('fcmToken');
      if (!fcmToken) {
        fcmToken = await messaging().getToken();
        if (fcmToken) {
          await AsyncStorage.setItem('fcmToken', fcmToken);
        }
      }
      return fcmToken;
    } catch (error) {
      console.log('Error getting FCM token:', error);
      return null;
    }
  }

  async getTokenOnly() {
    return await AsyncStorage.getItem('fcmToken') || await messaging().getToken();
  }

  async updateTokenOnBackend(token: string) {
    try {
      await api.post('/auth/device-token', { 
        token: token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android'
      });
      console.log('FCM Token updated on backend successfully');
    } catch (error) {
      console.log('Error updating FCM token on backend:', error);
    }
  }

  async createDefaultChannel() {
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });
    }
  }

  async onDisplayNotification(remoteMessage: any) {
    // Create a channel (required for Android)
    await this.createDefaultChannel();

    // Display a notification
    await notifee.displayNotification({
      title: remoteMessage.notification?.title || remoteMessage.data?.title || 'GreenCity AMC',
      body: remoteMessage.notification?.body || remoteMessage.data?.body || '',
      android: {
        channelId: 'default',
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        // If your backend sends an icon or image, you can use it here
        // smallIcon: 'ic_launcher', 
      },
    });
  }

  setupListeners() {
    // Foreground listener
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('Foreground FCM Message:', JSON.stringify(remoteMessage));
      
      // Display visual notification via notifee instead of an intrusive Alert popup
      await this.onDisplayNotification(remoteMessage);
    });

    // App opened from background state
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log(
        'Notification caused app to open from background state:',
        remoteMessage.notification,
      );
    });

    // App opened from quit state
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log(
            'Notification caused app to open from quit state:',
            remoteMessage.notification,
          );
        }
      });

    // Background handler (must be outside of any component)
    // messaging().setBackgroundMessageHandler(async remoteMessage => {
    //   console.log('Message handled in the background!', remoteMessage);
    // });

    return unsubscribe;
  }
}

export const notificationService = new NotificationService();
