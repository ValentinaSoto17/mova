/**
 * Avisos preventivos locales: programa notificaciones en el teléfono un par de días
 * antes del vencimiento de la cuota y de la revisión de rutina. (El servidor además
 * genera los avisos dentro de la app con su proceso diario.)
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { api } from '../api/client';

const DIAS_ANTES = 2;
const isWeb = Platform.OS === 'web';

if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function triggerDate(isoDate) {
  const d = new Date(`${String(isoDate).slice(0, 10)}T10:00:00`);
  d.setDate(d.getDate() - DIAS_ANTES);
  return d;
}

export async function scheduleReminders() {
  if (isWeb) return;
  const perm = await Notifications.getPermissionsAsync();
  let granted = perm.granted;
  if (!granted && perm.canAskAgain) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('avisos', {
      name: 'Avisos de MOVA',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
  const data = await api('/notifications/upcoming');
  const items = [];
  if (data.cuota) {
    items.push({ date: triggerDate(data.cuota.fecha_vencimiento), title: 'Tu cuota vence pronto', body: `Tu plan ${data.cuota.plan} vence en ${DIAS_ANTES} días. ¡Renovalo para seguir entrenando!` });
  }
  data.revisiones.forEach((r) =>
    items.push({ date: triggerDate(r.fecha_revision), title: 'Revisión de rutina', body: `"${r.nombre_rutina}" se revisa en ${DIAS_ANTES} días.` })
  );
  const now = Date.now();
  for (const it of items) {
    if (it.date.getTime() <= now) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: it.title, body: it.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: it.date, channelId: 'avisos' },
    });
  }
}

export async function clearReminders() {
  if (isWeb) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
