import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useApi } from '../../hooks/useApi';
import { Header, Screen } from '../../components/Screen';
import { Badge, Button, Card, Empty, ErrorState, Icon, Loading, Pill, Row, T } from '../../components/ui';
import { catStyle } from '../../theme/colors';
import { space } from '../../theme/tokens';
import { fDate, fRelative } from '../../utils/format';

/** Rutinas asignadas al alumno. */
export default function MyRoutines({ navigation }) {
  const { colors: c } = useTheme();
  const { data, error, loading, refreshing, refresh, reload } = useApi('/routines/list');

  return (
    <Screen header={<Header title="Mis rutinas" subtitle="Asignadas por tu entrenador" />} refreshing={refreshing} onRefresh={refresh}>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data.length ? (
        <Empty icon="clipboard-text-outline" title="No tenés rutinas asignadas" message="Cuando tu entrenador te asigne una rutina, aparecerá acá." />
      ) : (
        data.map((r) => {
          const cat = (r.categorias || '').split(', ')[0];
          const st = catStyle(cat);
          return (
            <Card key={r.id_asignacion} style={{ marginBottom: space.md, overflow: 'hidden' }} onPress={() => navigation.navigate('RoutineDetail', { id_rutina: r.id_rutina })}>
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: st.color }} />
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: st.color + '1F', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={st.icon} size={26} color={st.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <T v="h3">{r.nombre_rutina}</T>
                  <T v="small" color={c.textMuted}>{r.categorias}</T>
                </View>
                {r.dias_revision != null && r.dias_revision >= 0 && r.dias_revision <= 3 && <Badge label="Revisión pronto" kind="warning" />}
              </Row>
              {!!r.descripcion && (
                <T v="small" color={c.textMuted} style={{ marginTop: space.md }} numberOfLines={2}>
                  {r.descripcion}
                </T>
              )}
              <Row style={{ marginTop: space.md, flexWrap: 'wrap' }} gap={space.lg}>
                <Pill icon="format-list-numbered" text={`${r.cantidad_ejercicios} ejercicios`} />
                <Pill icon="clock-outline" text={`${r.duracion_estimada_min} min`} />
                <Pill icon="account-tie" text={r.entrenador} />
              </Row>
              <Row style={{ marginTop: space.md, justifyContent: 'space-between' }}>
                <T v="small" color={c.textSoft}>
                  {r.sesiones} sesiones · {r.ultima_sesion ? `última ${fRelative(r.ultima_sesion)}` : 'sin sesiones aún'}
                </T>
                <T v="small" color={c.textSoft}>Revisión: {fDate(r.fecha_revision)}</T>
              </Row>
              <Button title="Empezar" icon="play" small style={{ marginTop: space.md }} onPress={() => navigation.navigate('RoutineDetail', { id_rutina: r.id_rutina, start: true })} />
            </Card>
          );
        })
      )}
    </Screen>
  );
}
