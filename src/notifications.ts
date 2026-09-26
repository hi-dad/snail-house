import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { gameToReal } from './clock';
import { WARNINGS } from './game/constants';
import { GameState, catchTime } from './game/simulation';

const CHANNEL = 'snail';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false, // they're already looking at the snail
    shouldShowList: true,
  }),
});

let permission: Promise<boolean> | null = null;

export function ensureNotificationPermission(): Promise<boolean> {
  permission ??= (async () => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL, {
          name: 'Snail warnings',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return true;
      const asked = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      });
      return asked.granted;
    } catch {
      return false;
    }
  })();
  return permission;
}

/** Cancel every warning and schedule fresh ones for the current catch time. */
export async function rescheduleWarnings(state: GameState | null): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!state?.alive || !(await ensureNotificationPermission())) return;
    const caught = catchTime(state);
    for (const w of WARNINGS) {
      const at = gameToReal(caught - w.beforeMs);
      if (at <= Date.now() + 5000) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Snail House', body: w.body, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(at),
          channelId: CHANNEL,
        },
      });
    }
  } catch {
    // Notifications are a nicety; the game works without them.
  }
}
