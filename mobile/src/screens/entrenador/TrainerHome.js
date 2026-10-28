import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useApi } from '../../hooks/useApi';
import { Header, Screen, HeaderAction } from '../../components/Screen';
import { Avatar, Badge, Card, Empty, ErrorState, Icon, ListItem, Loading, Row, SectionTitle, StatTile, T } from '../../components/ui';
import { font, radius, space } from '../../theme/tokens';
import { bpStatus, fDate, fRelative, greeting } from '../../utils/format';

export default function TrainerHome({ navigation }) {
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const { data: s, error, loading, refreshing, refresh, reload } = useApi('/progress/summary');

  return (
    <Screen
      header={<Header title={`Hola, ${user.nombre}`} subtitle={`${greeting()} · Entrenador`} right={<HeaderAction icon="bell-outline" label="Avisos" badge={s?.notificaciones_sin_leer} onPress={() => navigation.navigate('Notificaciones')} />} />}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <LinearGradient colors={[c.heroFrom, c.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: space.xl }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: font.bold, fontSize: 12, letterSpacing: 1 }}>ESTA SEMANA</Text>
            <Text style={{ color: '#fff', fontFamily: font.extrabold, fontSize: 30, marginTop: 4 }}>{s.sesiones_semana} entrenamientos</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: font.medium, fontSize: 14 }}>registrados por tus alumnos</Text>
          </LinearGradient>
          <Row gap={space.md} style={{ marginTop: space.md, flexWrap: 'wrap' }}>
            <StatTile icon="account-group" label="Alumnos" value={s.alumnos.total} color={c.primary} />
            <StatTile icon="clipboard-list" label="Mis rutinas" value={s.rutinas} color={c.gold} />
            <StatTile icon="message-badge" label="Sin leer" value={s.mensajes_sin_leer} color={c.coral} />
          </Row>

          <SectionTitle title="Revisiones próximas" />
          {!s.revisiones.length ? (
            <Card><T v="small" color={c.textMuted}>No hay revisiones de rutina en los próximos 7 días.</T></Card>
          ) : (
            s.revisiones.map((r) => (
              <ListItem
                key={r.id_asignacion}
                onPress={() => navigation.navigate('UserDetail', { id_usuario: r.id_alumno })}
                left={<Avatar name={r.alumno} size={42} />}
                title={r.alumno}
                subtitle={r.nombre_rutina}
                right={<Badge label={r.dias === 0 ? 'Hoy' : `${fDate(r.fecha_revision)} · ${r.dias} d`} kind={r.dias <= 2 ? 'warning' : 'info'} icon="calendar-clock" />}
              />
            ))
          )}

          <SectionTitle title="Actividad reciente" action="Ver alumnos" onAction={() => navigation.navigate('Alumnos')} />
          {!s.actividad.length ? (
            <Empty icon="run" title="Sin actividad" message="Cuando tus alumnos registren entrenamientos aparecerán acá." />
          ) : (
            s.actividad.map((a) => {
              const bp = bpStatus(a.presion_sistolica, a.presion_diastolica);
              return (
                <Card key={a.id_progreso} style={{ marginBottom: space.sm }} onPress={() => navigation.navigate('StudentProgress', { id_alumno: a.id_alumno, nombre: a.alumno })}>
                  <Row>
                    <Avatar name={a.alumno} size={42} />
                    <View style={{ flex: 1 }}>
                      <T v="h3" style={{ fontSize: 15 }}>{a.alumno}</T>
                      <T v="small" color={c.textMuted}>{a.nombre_rutina} · {a.duracion_min} min · {fRelative(a.fecha)}</T>
                      <Row gap={space.md} style={{ marginTop: 4 }}>
                        {a.frecuencia_cardiaca_prom != null && (
                          <Row gap={4}><Icon name="heart-pulse" size={14} color={c.coral} /><T v="small">{a.frecuencia_cardiaca_prom} ppm</T></Row>
                        )}
                        {a.presion_sistolica != null && (
                          <Row gap={4}><Icon name="water" size={14} color={c.info} /><T v="small">{a.presion_sistolica}/{a.presion_diastolica}</T></Row>
                        )}
                      </Row>
                    </View>
                    {bp && bp.kind !== 'success' && <Badge label={bp.label} kind={bp.kind} />}
                  </Row>
                </Card>
              );
            })
          )}
        </>
      )}
    </Screen>
  );
}
