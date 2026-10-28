import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useApi } from '../../hooks/useApi';
import { Header, Screen, HeaderAction } from '../../components/Screen';
import { Avatar, Badge, Card, ErrorState, ListItem, Loading, Row, SectionTitle, StatTile, T } from '../../components/ui';
import { BarChart } from '../../components/Charts';
import { font, radius, space } from '../../theme/tokens';
import { fDate, fDay, greeting, isoDate } from '../../utils/format';

const EQ_LABEL = { operativo: 'Operativo', mantenimiento: 'Mantenimiento', fuera_de_servicio: 'Fuera de servicio' };

/** Estadísticas globales del gimnasio. */
export default function AdminHome({ navigation }) {
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const { data: s, error, loading, refreshing, refresh, reload } = useApi('/admin/stats');
  const sum = useApi('/progress/summary');

  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = isoDate(d);
    const f = s?.asistencias.find((a) => String(a.dia).slice(0, 10) === key);
    return { label: i % 2 ? '' : fDay(key).slice(0, 2), value: f ? Number(f.cantidad) : 0 };
  });

  const delta = s ? Number(s.entrenamientos.esta_semana || 0) - Number(s.entrenamientos.semana_anterior || 0) : 0;
  const maxRut = Math.max(1, ...(s?.rutinasTop || []).map((r) => r.completadas));

  return (
    <Screen
      header={<Header title="Panel del gimnasio" subtitle={`${greeting()}, ${user.nombre} · Administrador`} right={<HeaderAction icon="bell-outline" label="Avisos" badge={sum.data?.notificaciones_sin_leer} onPress={() => navigation.navigate('Notificaciones')} />} />}
      refreshing={refreshing}
      onRefresh={() => { refresh(); sum.refresh(); }}
    >
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <LinearGradient colors={[c.heroFrom, c.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: space.xl }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: font.bold, fontSize: 12, letterSpacing: 1 }}>ENTRENAMIENTOS · 7 DÍAS</Text>
                <Text style={{ color: '#fff', fontFamily: font.extrabold, fontSize: 40 }}>{s.entrenamientos.esta_semana || 0}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: font.semibold, fontSize: 13 }}>
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} vs. semana anterior · {s.entrenamientos.duracion_promedio || 0} min promedio
                </Text>
              </View>
            </Row>
          </LinearGradient>

          <Row gap={space.md} style={{ marginTop: space.md, flexWrap: 'wrap' }}>
            <StatTile icon="account-group" label="Alumnos" value={s.usuarios.alumnos} color={c.primary} />
            <StatTile icon="whistle" label="Entrenadores" value={s.usuarios.entrenadores} color={c.success} />
          </Row>
          <Row gap={space.md} style={{ marginTop: space.md, flexWrap: 'wrap' }}>
            <StatTile icon="account-lock" label="Bloqueados" value={s.usuarios.bloqueados} color={c.danger} />
            <StatTile icon="account-plus" label="Nuevos (30 d)" value={s.usuarios.nuevos_mes} color={c.gold} />
          </Row>

          <SectionTitle title="Asistencias (14 días)" />
          <Card>
            <BarChart data={days} color={c.primary} height={160} />
          </Card>

          <Row gap={space.md} style={{ marginTop: space.md, flexWrap: 'wrap' }}>
            <Card style={{ flex: 1, minWidth: 150 }} onPress={() => navigation.navigate('Stock')}>
              <T v="caption" color={c.textMuted}>Préstamos</T>
              <T v="number">{s.prestamos.pendientes || 0}</T>
              <T v="small" color={c.textMuted}>pendientes · {s.prestamos.atrasados || 0} atrasados</T>
            </Card>
            <Card style={{ flex: 1, minWidth: 150 }} onPress={() => navigation.navigate('Mensajes')}>
              <T v="caption" color={c.textMuted}>Consultas</T>
              <T v="number">{s.mensajes.sin_responder || 0}</T>
              <T v="small" color={c.textMuted}>sin leer en el gimnasio</T>
            </Card>
          </Row>

          <SectionTitle title="Rutinas más completadas (30 d)" action="Ver actividad" onAction={() => navigation.navigate('Actividad')} />
          <Card>
            {s.rutinasTop.length ? s.rutinasTop.map((r) => (
              <View key={r.nombre_rutina} style={{ marginBottom: space.md }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="small" style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>{r.nombre_rutina}</T>
                  <T v="small" color={c.textMuted}>{r.completadas}</T>
                </Row>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, marginTop: 6 }}>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: c.primary, width: `${(r.completadas / maxRut) * 100}%` }} />
                </View>
              </View>
            )) : <T v="small" color={c.textMuted}>Sin datos todavía.</T>}
          </Card>

          <SectionTitle title="Sesiones por entrenador (30 d)" />
          <Card>
            {s.entrenadores.map((e) => (
              <Row key={e.entrenador} style={{ paddingVertical: 6 }}>
                <Avatar name={e.entrenador} size={34} />
                <T v="body" style={{ flex: 1 }}>{e.entrenador}</T>
                <Badge label={`${e.sesiones} sesiones`} kind="success" />
              </Row>
            ))}
          </Card>

          <SectionTitle title="Cuotas por vencer (7 días)" action="Ver cuotas" onAction={() => navigation.navigate('Cuotas')} />
          {s.vencimientos.length ? s.vencimientos.map((v) => (
            <ListItem key={v.id_usuario} onPress={() => navigation.navigate('UserDetail', { id_usuario: v.id_usuario })} left={<Avatar name={`${v.nombre} ${v.apellido}`} size={40} />} title={`${v.nombre} ${v.apellido}`} subtitle={`Vence el ${fDate(v.fecha_vencimiento)}`} right={<Badge label={v.dias === 0 ? 'Hoy' : `${v.dias} d`} kind={v.dias <= 2 ? 'warning' : 'info'} />} />
          )) : <Card><T v="small" color={c.textMuted}>Ninguna cuota vence esta semana.</T></Card>}

          <SectionTitle title="Equipamiento" action="Ver stock" onAction={() => navigation.navigate('Stock')} />
          <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
            {s.equipos.map((e) => (
              <Badge key={e.estado} label={`${EQ_LABEL[e.estado]}: ${e.cantidad}`} kind={e.estado === 'operativo' ? 'success' : e.estado === 'mantenimiento' ? 'warning' : 'danger'} />
            ))}
          </Row>
        </>
      )}
    </Screen>
  );
}
