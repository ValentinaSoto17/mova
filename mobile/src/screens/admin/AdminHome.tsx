import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useApi } from '../../hooks/useApi';
import { Header, Screen, HeaderAction } from '../../components/Screen';
import { Avatar, Badge, Card, ErrorState, Icon, ListItem, Loading, Row, SectionTitle, StatTile, T } from '../../components/ui';
import { LogoMark } from '../../components/Logo';
import { BarChart } from '../../components/Charts';
import { font, radius, space } from '../../theme/tokens';
import { fDate, fDateLong, fDay, greeting, isoDate } from '../../utils/format';

export interface AdminHomeProps {
  navigation?: any;
}

const EQ_LABEL = { operativo: 'Operativo', mantenimiento: 'Mantenimiento', fuera_de_servicio: 'Fuera de servicio' };

interface Tarea {
  key: string;
  icon: string;
  title: string;
  count: number;
  done: string;
  color: string;
  go: () => void;
}

/** Inicio del administrador: primero lo que hay que atender hoy, después cómo va el gimnasio. */
export default function AdminHome({ navigation }: AdminHomeProps) {
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

  const tareas: Tarea[] = s
    ? [
        { key: 'prestamos', icon: 'basket-outline', title: 'Préstamos por aprobar', count: Number(s.prestamos.pendientes || 0), done: 'Ninguno pendiente', color: c.warning, go: () => navigation.navigate('Stock') },
        { key: 'atrasados', icon: 'clock-alert-outline', title: 'Material sin devolver', count: Number(s.prestamos.atrasados || 0), done: 'Todo devuelto', color: c.danger, go: () => navigation.navigate('Stock') },
        { key: 'consultas', icon: 'message-question-outline', title: 'Consultas sin responder', count: Number(s.mensajes.sin_responder || 0), done: 'Todas respondidas', color: c.primary, go: () => navigation.navigate('Mensajes') },
        { key: 'cuotas', icon: 'card-account-details-outline', title: 'Cuotas que vencen esta semana', count: (s.vencimientos || []).length, done: 'Sin vencimientos', color: c.gold, go: () => navigation.navigate('Cuotas') },
        { key: 'bloqueados', icon: 'account-lock-outline', title: 'Cuentas bloqueadas', count: Number(s.usuarios.bloqueados || 0), done: 'Ninguna bloqueada', color: c.danger, go: () => navigation.navigate('Usuarios', { estado: 'bloqueado' }) },
      ].sort((x, y) => Number(y.count > 0) - Number(x.count > 0))
    : [];
  const pendientes = tareas.reduce((n, t) => n + (t.count > 0 ? 1 : 0), 0);

  const accesos = [
    { icon: 'account-plus-outline', label: 'Nuevo usuario', go: () => navigation.navigate('UserForm') },
    { icon: 'cash-plus', label: 'Registrar un pago', go: () => navigation.navigate('Cuotas') },
    { icon: 'package-variant', label: 'Ver stock', go: () => navigation.navigate('Stock') },
    { icon: 'message-plus-outline', label: 'Nuevo mensaje', go: () => navigation.navigate('NewChat') },
  ];

  return (
    <Screen
      header={<Header title="Inicio" subtitle="Panel del gimnasio · Administrador" right={<HeaderAction icon="bell-outline" label="Avisos" badge={sum.data?.notificaciones_sin_leer} onPress={() => navigation.navigate('Notificaciones')} />} />}
      refreshing={refreshing}
      onRefresh={() => { refresh(); sum.refresh(); }}
    >
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          {/* Bienvenida con la identidad de MOVA */}
          <LinearGradient colors={[c.heroFrom, c.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: space.xl, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.08)', top: -90, right: -60 }} />
            <View style={{ position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -60, right: 120 }} />
            <Row gap={space.lg} style={{ alignItems: 'center' }}>
              <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                <LogoMark size={50} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: font.bold, fontSize: 12, letterSpacing: 1 }}>{fDateLong(isoDate(new Date())).toUpperCase()}</Text>
                <Text style={{ color: '#fff', fontFamily: font.extrabold, fontSize: 26, letterSpacing: -0.4 }}>{greeting()}, {user.nombre}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontFamily: font.semibold, fontSize: 14 }}>
                  {pendientes ? `Tenés ${pendientes} ${pendientes === 1 ? 'cosa' : 'cosas'} para atender hoy en MOVA.` : 'Todo al día en MOVA. ¡Buen trabajo!'}
                </Text>
              </View>
            </Row>
          </LinearGradient>

          {/* Para hoy: tarjetas que llevan directo a resolver cada cosa */}
          <SectionTitle title="Para hoy" />
          <Row gap={space.md} style={{ flexWrap: 'wrap', alignItems: 'stretch' }}>
            {tareas.map((t) => {
              const activa = t.count > 0;
              return (
                <Card key={t.key} onPress={t.go} style={{ flex: 1, minWidth: 150, borderColor: activa ? t.color : c.border, borderWidth: activa ? 1.5 : 1 }}>
                  <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: activa ? t.color + '22' : c.surfaceAlt }}>
                      <Icon name={(activa ? t.icon : 'check-circle-outline') as any} size={22} color={activa ? t.color : c.success} />
                    </View>
                    <Icon name="chevron-right" size={20} color={c.textSoft} />
                  </Row>
                  <T v="number" style={{ marginTop: space.sm, color: activa ? c.text : c.textSoft }}>{t.count}</T>
                  <T v="small" style={{ fontWeight: '700' }}>{t.title}</T>
                  <T v="small" color={activa ? t.color : c.success}>{activa ? 'Tocá para resolver' : t.done}</T>
                </Card>
              );
            })}
          </Row>

          {/* Accesos rápidos */}
          <SectionTitle title="Accesos rápidos" />
          <Row gap={space.md} style={{ flexWrap: 'wrap' }}>
            {accesos.map((a) => (
              <Pressable
                key={a.label}
                accessibilityRole="button"
                onPress={a.go}
                style={({ pressed }) => [{ flex: 1, minWidth: 150, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: c.primarySoft, opacity: pressed ? 0.8 : 1 }]}
              >
                <Icon name={a.icon as any} size={22} color={c.primary} />
                <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 14, color: c.primary }}>{a.label}</Text>
              </Pressable>
            ))}
          </Row>

          {/* Cómo va el gimnasio */}
          <SectionTitle title="Cómo va el gimnasio" />
          <Card>
            <T v="caption" color={c.textMuted}>Entrenamientos · 7 días</T>
            <Row style={{ alignItems: 'flex-end' }} gap={space.md}>
              <T v="number" style={{ fontSize: 34, lineHeight: 40 }}>{s.entrenamientos.esta_semana || 0}</T>
              <T v="small" color={delta >= 0 ? c.success : c.danger} style={{ marginBottom: 6, fontWeight: '700' }}>
                {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} vs. semana anterior
              </T>
            </Row>
            <T v="small" color={c.textMuted}>{s.entrenamientos.duracion_promedio || 0} min promedio por sesión</T>
          </Card>

          <Row gap={space.md} style={{ marginTop: space.md, flexWrap: 'wrap' }}>
            <StatTile icon="account-group" label="Alumnos" value={s.usuarios.alumnos} color={c.primary} />
            <StatTile icon="whistle" label="Entrenadores" value={s.usuarios.entrenadores} color={c.success} />
            <StatTile icon="account-lock" label="Bloqueados" value={s.usuarios.bloqueados} color={c.danger} />
            <StatTile icon="account-plus" label="Nuevos (30 d)" value={s.usuarios.nuevos_mes} color={c.gold} />
          </Row>

          <SectionTitle title="Asistencias (14 días)" />
          <Card>
            <BarChart data={days} color={c.primary} height={160} />
          </Card>

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