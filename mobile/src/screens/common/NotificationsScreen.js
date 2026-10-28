import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useApi } from '../../hooks/useApi';
import { api } from '../../api/client';
import { Header, Screen, HeaderAction } from '../../components/Screen';
import { Card, Empty, ErrorState, Icon, Loading, Row, T } from '../../components/ui';
import { space } from '../../theme/tokens';
import { fRelative } from '../../utils/format';

const TIPO = {
  vencimiento_cuota: { icon: 'card-account-details-outline', key: 'warning' },
  revision_rutina: { icon: 'calendar-clock', key: 'info' },
  bloqueo: { icon: 'account-lock', key: 'danger' },
  mensaje: { icon: 'message-text', key: 'primary' },
  prestamo: { icon: 'basket', key: 'gold' },
  sistema: { icon: 'bell', key: 'success' },
};

/** Avisos automáticos: vencimiento de cuota, revisión de rutina, préstamos, mensajes. */
export default function NotificationsScreen() {
  const { colors: c } = useTheme();
  const { data, setData, error, loading, refreshing, refresh, reload } = useApi('/notifications/list');

  const readAll = async () => {
    await api('/notifications/read', {}).catch(() => {});
    setData((d) => d?.map((n) => ({ ...n, leida: true })));
  };
  const readOne = async (n) => {
    if (n.leida) return;
    setData((d) => d.map((x) => (x.id_notificacion === n.id_notificacion ? { ...x, leida: true } : x)));
    api('/notifications/read', { id_notificacion: n.id_notificacion }).catch(() => {});
  };

  return (
    <Screen header={<Header title="Avisos" subtitle="Recordatorios y novedades" right={<HeaderAction icon="check-all" label="Marcar todo como leído" onPress={readAll} />} />} refreshing={refreshing} onRefresh={refresh}>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data.length ? (
        <Empty icon="bell-sleep-outline" title="Sin avisos" message="Te vamos a avisar antes de que venza tu cuota o se revise tu rutina." />
      ) : (
        data.map((n) => {
          const t = TIPO[n.tipo] || TIPO.sistema;
          const col = c[t.key];
          return (
            <Card key={n.id_notificacion} onPress={() => readOne(n)} style={{ marginBottom: space.sm, opacity: n.leida ? 0.7 : 1 }}>
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: col + '1F', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={t.icon} size={21} color={col} />
                </View>
                <View style={{ flex: 1 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T v="h3" style={{ flex: 1, fontSize: 15 }}>{n.titulo}</T>
                    {!n.leida && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.coral }} />}
                  </Row>
                  <T v="small" color={c.textMuted}>{n.mensaje}</T>
                  <T v="small" color={c.textSoft} style={{ fontSize: 11, marginTop: 4 }}>{fRelative(n.fecha)}</T>
                </View>
              </Row>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
