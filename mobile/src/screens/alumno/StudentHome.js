import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useApi } from '../../hooks/useApi';
import { api } from '../../api/client';
import { Header, Screen, HeaderAction } from '../../components/Screen';
import { Badge, Banner, Button, Card, ErrorState, Icon, Loading, Row, SectionTitle, T } from '../../components/ui';
import { BarChart, Ring } from '../../components/Charts';
import { font, radius, space, type } from '../../theme/tokens';
import { bpStatus, fDate, fDateLong, fRelative, greeting, isoDate } from '../../utils/format';

const META_SEMANAL = 3;
const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function StudentHome({ navigation }) {
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const { toast } = useFeedback();
  const sum = useApi('/progress/summary');
  const rut = useApi('/routines/list');
  const s = sum.data;

  const checkin = async () => {
    try {
      const r = await api('/progress/checkin');
      toast(r.mensaje, r.registrada ? 'success' : 'info');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  // Minutos de los últimos 7 días (incluye días sin entrenar)
  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = isoDate(d);
    const found = s?.ultimos_7_dias?.find((x) => String(x.dia).slice(0, 10) === key);
    return { label: DIAS[d.getDay()], value: found ? Number(found.minutos) : 0 };
  });

  const bp = bpStatus(s?.ultima?.presion_sistolica, s?.ultima?.presion_diastolica);
  const routine = rut.data?.[0];

  return (
    <Screen
      header={
        <Header
          title={`Hola, ${user?.nombre} 👋`}
          subtitle={`${greeting()} · ${fDateLong(isoDate(new Date()))}`}
          right={<HeaderAction icon="bell-outline" label="Avisos" badge={s?.notificaciones_sin_leer} onPress={() => navigation.navigate('Notificaciones')} />}
        />
      }
      refreshing={sum.refreshing}
      onRefresh={() => { sum.refresh(); rut.refresh(); }}
    >
      {sum.loading ? (
        <Loading />
      ) : sum.error ? (
        <ErrorState error={sum.error} onRetry={sum.reload} />
      ) : (
        <>
          {s.membresia && s.membresia.dias_restantes <= 3 && (
            <Banner
              kind={s.membresia.dias_restantes < 0 ? 'danger' : 'warning'}
              title={s.membresia.dias_restantes < 0 ? 'Tu cuota está vencida' : `Tu cuota vence ${s.membresia.dias_restantes === 0 ? 'hoy' : `en ${s.membresia.dias_restantes} día${s.membresia.dias_restantes > 1 ? 's' : ''}`}`}
              message={`Plan ${s.membresia.plan} · vence el ${fDate(s.membresia.fecha_vencimiento)}. Renovala en recepción.`}
              icon="card-account-details-outline"
            />
          )}

          {/* Resumen semanal */}
          <LinearGradient colors={[c.heroFrom, c.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroGlow} />
            <Row gap={space.lg}>
              <Ring progress={s.semana.sesiones / META_SEMANAL} color="#FFD36E" size={112}>
                <Text style={styles.ringNum}>{s.semana.sesiones}</Text>
                <Text style={styles.ringLbl}>de {META_SEMANAL}</Text>
              </Ring>
              <View style={{ flex: 1, gap: 10 }}>
                <Text style={styles.heroTitle}>Tus últimos 7 días</Text>
                <HeroStat icon="timer-outline" value={`${s.semana.minutos} min`} label="entrenados" />
                <HeroStat icon="fire" value={`${s.semana.calorias} kcal`} label="quemadas" />
                <HeroStat icon="heart-pulse" value={s.semana.fc_promedio ? `${s.semana.fc_promedio} ppm` : '—'} label="FC promedio" />
              </View>
            </Row>
            <View style={styles.heroFoot}>
              <Icon name="lightning-bolt" size={16} color="#FFD36E" />
              <Text style={styles.heroFootText}>
                {s.racha_semanas > 0 ? `Racha de ${s.racha_semanas} semana${s.racha_semanas > 1 ? 's' : ''} seguidas entrenando` : '¡Arrancá tu racha esta semana!'}
              </Text>
            </View>
          </LinearGradient>

          {/* Rutina para hoy */}
          <SectionTitle title="Tu rutina" action={rut.data?.length > 1 ? 'Ver todas' : null} onAction={() => navigation.navigate('Rutinas')} />
          {routine ? (
            <Card onPress={() => navigation.navigate('RoutineDetail', { id_rutina: routine.id_rutina })}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <T v="caption" color={c.primary}>{routine.categorias}</T>
                  <T v="h2" style={{ marginTop: 2 }}>{routine.nombre_rutina}</T>
                  <T v="small" color={c.textMuted}>con {routine.entrenador}</T>
                </View>
                {routine.dias_revision != null && routine.dias_revision <= 3 && routine.dias_revision >= 0 && <Badge label={`Revisión en ${routine.dias_revision} d`} kind="warning" icon="calendar-alert" />}
              </Row>
              <Row style={{ marginVertical: space.lg }} gap={space.xl}>
                <MiniStat icon="format-list-numbered" value={routine.cantidad_ejercicios} label="ejercicios" />
                <MiniStat icon="clock-outline" value={`${routine.duracion_estimada_min}'`} label="duración" />
                <MiniStat icon="check-decagram-outline" value={routine.sesiones} label="sesiones" />
              </Row>
              <Button title="Empezar entrenamiento" icon="play" onPress={() => navigation.navigate('RoutineDetail', { id_rutina: routine.id_rutina, start: true })} />
            </Card>
          ) : (
            <Card>
              <T v="h3">Todavía no tenés rutinas asignadas</T>
              <T v="small" color={c.textMuted}>Tu entrenador te asignará una pronto. Mientras tanto, explorá el catálogo.</T>
            </Card>
          )}

          {/* Últimos 7 días */}
          <SectionTitle title="Últimos 7 días" action="Ver historial" onAction={() => navigation.navigate('Progreso')} />
          <Card>
            <T v="small" color={c.textMuted} style={{ marginBottom: space.md }}>Minutos entrenados por día</T>
            <BarChart data={week} valueSuffix="'" />
          </Card>

          {/* Última sesión: cómo respondió el cuerpo */}
          {s.ultima && (
            <>
              <SectionTitle title="Tu cuerpo en la última sesión" />
              <Card>
                <Row style={{ justifyContent: 'space-between', marginBottom: space.md }}>
                  <View style={{ flex: 1 }}>
                    <T v="h3">{s.ultima.nombre_rutina}</T>
                    <T v="small" color={c.textMuted}>{fRelative(s.ultima.fecha)} · {s.ultima.duracion_min} min</T>
                  </View>
                  {bp && <Badge label={`Presión ${bp.label}`} kind={bp.kind} />}
                </Row>
                <View style={styles.vitals}>
                  <Vital icon="heart-pulse" color={c.coral} label="FC promedio" value={s.ultima.frecuencia_cardiaca_prom} unit="ppm" />
                  <Vital icon="heart-flash" color={c.danger} label="FC máxima" value={s.ultima.frecuencia_cardiaca_max} unit="ppm" />
                  <Vital icon="water" color={c.info} label="Presión" value={s.ultima.presion_sistolica ? `${s.ultima.presion_sistolica}/${s.ultima.presion_diastolica}` : null} unit="mmHg" />
                  <Vital icon="scale-bathroom" color={c.gold} label="Peso" value={s.ultima.peso_kg} unit="kg" />
                </View>
              </Card>
            </>
          )}

          {/* Accesos rápidos */}
          <SectionTitle title="Accesos rápidos" />
          <Row gap={space.md} style={{ flexWrap: 'wrap' }}>
            <Quick icon="map-marker-check" label="Registrar asistencia" color={c.success} onPress={checkin} />
            <Quick icon="basket-outline" label="Pedir material" color={c.gold} onPress={() => navigation.navigate('Prestamos')} />
            <Quick icon="message-text-outline" label="Escribir al gimnasio" color={c.primary} onPress={() => navigation.navigate('Chat', { tipo: 'gimnasio' })} />
          </Row>
          {s.proxima_revision && (
            <T v="small" color={c.textMuted} style={{ textAlign: 'center', marginTop: space.xl }}>
              Próxima revisión de rutina: {fDateLong(s.proxima_revision)}
            </T>
          )}
        </>
      )}
    </Screen>
  );
}

function HeroStat({ icon, value, label }) {
  return (
    <Row gap={8}>
      <Icon name={icon} size={18} color="rgba(255,255,255,0.85)" />
      <Text style={{ color: '#fff', fontFamily: font.extrabold, fontSize: 15 }}>{value}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: font.medium, fontSize: 12.5 }}>{label}</Text>
    </Row>
  );
}

function MiniStat({ icon, value, label }) {
  const { colors: c } = useTheme();
  return (
    <View>
      <Row gap={6}>
        <Icon name={icon} size={18} color={c.primary} />
        <T v="h3">{value}</T>
      </Row>
      <T v="small" color={c.textMuted} style={{ fontSize: 12 }}>{label}</T>
    </View>
  );
}

function Vital({ icon, color, label, value, unit }) {
  const { colors: c } = useTheme();
  return (
    <View style={[styles.vital, { backgroundColor: c.surfaceAlt }]}>
      <Icon name={icon} size={20} color={color} />
      <T v="caption" color={c.textMuted} style={{ marginTop: 6 }}>{label}</T>
      <Text style={[type.h2, { color: c.text }]}>
        {value ?? '—'}
        {value != null && <Text style={{ fontSize: 12, color: c.textMuted, fontFamily: font.semibold }}> {unit}</Text>}
      </Text>
    </View>
  );
}

function Quick({ icon, label, color, onPress }) {
  const { colors: c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.quick, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={[styles.quickIcon, { backgroundColor: color + '1F' }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <T v="small" style={{ fontFamily: font.bold, textAlign: 'center' }}>{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: space.xl, overflow: 'hidden' },
  heroGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 200, backgroundColor: 'rgba(255,255,255,0.08)', top: -80, right: -60 },
  heroTitle: { color: '#fff', fontFamily: font.extrabold, fontSize: 20 },
  ringNum: { color: '#fff', fontFamily: font.extrabold, fontSize: 32, lineHeight: 36 },
  ringLbl: { color: 'rgba(255,255,255,0.8)', fontFamily: font.semibold, fontSize: 12 },
  heroFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: space.lg, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: radius.md, padding: space.md },
  heroFootText: { color: '#fff', fontFamily: font.semibold, fontSize: 13, flex: 1 },
  vitals: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  vital: { flexGrow: 1, flexBasis: '45%', padding: space.md, borderRadius: radius.md },
  quick: { flex: 1, minWidth: 100, alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
  quickIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

