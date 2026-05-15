/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

// Register background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background FCM Message Received');
  
  // Create a channel (required for Android)
  await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });

  // Display the notification
  await notifee.displayNotification({
    title: remoteMessage.notification?.title || remoteMessage.data?.title || 'GreenCity AMC',
    body: remoteMessage.notification?.body || remoteMessage.data?.body || 'New update available',
    android: {
      channelId: 'default',
      importance: AndroidImportance.HIGH,
      pressAction: {
        id: 'default',
      },
    },
  });
});

AppRegistry.registerComponent(appName, () => App);
