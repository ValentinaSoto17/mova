/**
 * Modo entrenamiento del alumno:
 *  1) Cronómetro + ejercicio actual + series + descanso.
 *  2) Al terminar registra cómo respondió el cuerpo: duración, frecuencia cardíaca,
 *     presión arterial, peso y esfuerzo percibido.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useAction } from '../../hooks/useApi';
import { Header, Screen } from '../../components/Screen';
import { Badge, Banner, Button, Card, Icon, IconButton, Input, Row, T } from '../../components/ui';
import ExerciseArt from '../../components/ExerciseArt';
import { font, radius, space } from '../../theme/tokens';
import { bpStatus, fDuration } from '../../utils/format';

export default function WorkoutScreen({ route, navigation }) {
  const { routine } = route.params;
  const { colors: c } = useTheme();
  const { confirm, toast } = useFeedback();
  const { run, busy, fieldErrors, formError } = useAction();
  const ex = routine.ejercicios;

  const [phase, setPhase] = useState('train');
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [idx, setIdx] = useState(0);
  const [sets, setSets] = useState(() => ex.map(() => 0));
  const [weights, setWeights] = useState(() => ex.map((e) => (e.peso_sugerido_kg != null ? String(e.peso_sugerido_kg) : '')));
  const [rest, setRest] = useState(0);
  const [form, setForm] = useState({ fcp: '', fcm: '', sis: '', dia: '', peso: '', esfuerzo: 7, obs: '' });
  const saved = useRef(false);

  useEffect(() => {
    if (phase !== 'train' || paused) return undefined;
    const t = setInterval(() => {
      setElapsed((s) => s + 1);
      setRest((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [phase, paused]);

  // Confirmación antes de salir con el entrenamiento a medias
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (saved.current) return;
      e.preventDefault();
      confirm({ title: '¿Salir del entrenamiento?', message: 'Lo que hiciste hasta ahora no se va a guardar.', confirmText: 'Salir', danger: true, icon: 'exit-run' }).then((yes) => {
        if (yes) {
          saved.current = true;
          navigation.dispatch(e.data.action);
        }
      });
    });
    return unsub;
  }, [navigation, confirm]);

  const cur = ex[idx];
  const done = sets.filter((s, i) => s >= ex[i].series).length;

  const completeSet = () => {
    const next = [...sets];
    next[idx] = Math.min(cur.series, next[idx] + 1);
    setSets(next);
    if (next[idx] >= cur.series) {
      if (idx < ex.length - 1) {
        toast(`¡${cur.nombre} completado!`);
        setIdx(idx + 1);
      }
      setRest(0);
    } else {
      setRest(cur.descanso_segundos);
    }
  };

  const finish = async () => {
    if (done < ex.length) {
      const yes = await confirm({ title: '¿Terminar ahora?', message: `Completaste ${done} de ${ex.length} ejercicios. Podés registrar el entrenamiento igual.`, confirmText: 'Terminar', icon: 'flag-checkered' });
      if (!yes) return;
    }
    setPhase('vitals');
  };

  const setF = (k) => (v) => setForm((f) => ({ ...f, [k]: v.replace(/[^0-9.]/g, '') }));
  const num = (v) => (v === '' ? null : Number(v));

  const save = async () => {
    try {
      const minutes = Math.max(1, Math.round(elapsed / 60));
      await run('/progress/create', {
        id_asignacion: routine.asignacion.id_asignacion,
        duracion_min: minutes,
        frecuencia_cardiaca_prom: num(form.fcp),
        frecuencia_cardiaca_max: num(form.fcm),
        presion_sistolica: num(form.sis),
        presion_diastolica: num(form.dia),
        peso_kg: num(form.peso),
        esfuerzo_percibido: form.esfuerzo,
        observaciones: form.obs || null,
        detalles: ex.map((e, i) => ({
          id_ejercicio: e.id_ejercicio,
          series_realizadas: sets[i],
          repeticiones_realizadas: parseInt(e.repeticiones, 10) || null,
          peso_kg: num(weights[i]),
          completado: sets[i] >= e.series,
        })),
      });
      saved.current = true;
      toast('¡Entrenamiento guardado! 💪');
      navigation.navigate('App', { screen: 'Main', params: { screen: 'Progreso' } });
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  if (phase === 'vitals') {
    const bp = bpStatus(num(form.sis), num(form.dia));
    return (
      <Screen header={<Header back title="¿Cómo respondió tu cuerpo?" subtitle={routine.nombre_rutina} />} footer={<Button title="Guardar entrenamiento" icon="content-save" onPress={save} loading={busy} />}>
        {formError && !Object.keys(fieldErrors).length && <Banner message={formError.message} />}
        <Card style={{ marginBottom: space.lg }}>
          <Row style={{ justifyContent: 'space-around' }}>
            <Summary icon="timer-outline" value={fDuration(elapsed)} label="Duración" />
            <Summary icon="check-all" value={`${done}/${ex.length}`} label="Ejercicios" />
            <Summary icon="repeat" value={sets.reduce((a, b) => a + b, 0)} label="Series" />
          </Row>
        </Card>
        <T v="h3" style={{ marginBottom: space.sm }}>Frecuencia cardíaca</T>
        <T v="small" color={c.textMuted} style={{ marginBottom: space.md }}>Medila con tu reloj o tomando el pulso 15 s × 4.</T>
        <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
          <Input style={{ flex: 1 }} label="Promedio (ppm)" icon="heart-pulse" keyboardType="numeric" value={form.fcp} onChangeText={setF('fcp')} error={fieldErrors.frecuencia_cardiaca_prom} placeholder="125" />
          <Input style={{ flex: 1 }} label="Máxima (ppm)" icon="heart-flash" keyboardType="numeric" value={form.fcm} onChangeText={setF('fcm')} error={fieldErrors.frecuencia_cardiaca_max} placeholder="155" />
        </Row>
        <Row style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
          <T v="h3">Presión arterial</T>
          {bp && <Badge label={bp.label} kind={bp.kind} />}
        </Row>
        <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
          <Input style={{ flex: 1 }} label="Sistólica (máx.)" icon="water" keyboardType="numeric" value={form.sis} onChangeText={setF('sis')} error={fieldErrors.presion_sistolica} placeholder="120" />
          <Input style={{ flex: 1 }} label="Diastólica (mín.)" icon="water-outline" keyboardType="numeric" value={form.dia} onChangeText={setF('dia')} error={fieldErrors.presion_diastolica} placeholder="80" />
        </Row>
        {bp?.kind === 'danger' && <Banner kind="danger" title="Presión alta" message="Descansá y volvé a medirla. Tu entrenador recibirá un aviso. Si tenés mareos o dolor de pecho, pedí ayuda." />}
        <Input label="Peso corporal (kg) — opcional" icon="scale-bathroom" keyboardType="numeric" value={form.peso} onChangeText={setF('peso')} error={fieldErrors.peso_kg} placeholder="64.5" />
        <T v="h3" style={{ marginBottom: space.sm }}>Esfuerzo percibido: {form.esfuerzo}/10</T>
        <View style={styles.effort}>
          {Array.from({ length: 10 }).map((_, i) => {
            const v = i + 1;
            const active = v <= form.esfuerzo;
            const col = v <= 4 ? c.success : v <= 7 ? c.gold : c.coral;
            return (
              <Pressable key={v} onPress={() => setForm((f) => ({ ...f, esfuerzo: v }))} accessibilityLabel={`Esfuerzo ${v}`} style={[styles.effortDot, { backgroundColor: active ? col : c.surfaceAlt }]}>
                <Text style={{ fontFamily: font.bold, color: active ? '#fff' : c.textMuted, fontSize: 13 }}>{v}</Text>
              </Pressable>
            );
          })}
        </View>
        <Input label="Observaciones" icon="note-text-outline" multiline value={form.obs} onChangeText={(v) => setForm((f) => ({ ...f, obs: v }))} placeholder="¿Cómo te sentiste? ¿Alguna molestia?" maxLength={500} />
      </Screen>
    );
  }

  return (
    <Screen header={<Header back title={routine.nombre_rutina} subtitle={`Ejercicio ${idx + 1} de ${ex.length}`} />} footer={<Button title="Finalizar entrenamiento" icon="flag-checkered" variant="success" onPress={finish} />}>
      <LinearGradient colors={[c.heroFrom, c.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.timer}>
        <View>
          <Text style={styles.timerLbl}>{rest > 0 ? 'Descanso' : 'Tiempo total'}</Text>
          <Text style={styles.timerVal}>{rest > 0 ? fDuration(rest) : fDuration(elapsed)}</Text>
          {rest > 0 && <Text style={styles.timerSub}>Total {fDuration(elapsed)}</Text>}
        </View>
        <Row gap={space.sm}>
          {rest > 0 && <IconButton icon="skip-next" label="Saltar descanso" bg="rgba(255,255,255,0.2)" color="#fff" onPress={() => setRest(0)} />}
          <IconButton icon={paused ? 'play' : 'pause'} label={paused ? 'Reanudar' : 'Pausar'} bg="rgba(255,255,255,0.2)" color="#fff" onPress={() => setPaused(!paused)} />
        </Row>
      </LinearGradient>

      <Card style={{ marginTop: space.lg }} padded={false}>
        <ExerciseArt url={cur.fotografia_url} categoria={cur.categoria} size="100%" height={170} radius={18} iconScale={0.45} />
        <View style={{ padding: space.lg }}>
          <T v="caption" color={c.primary}>{cur.categoria} · {cur.grupo_muscular}</T>
          <T v="h1" style={{ marginTop: 2 }}>{cur.nombre}</T>
          {!!cur.recomendacion && (
            <Row style={{ alignItems: 'flex-start', marginTop: space.sm }} gap={8}>
              <Icon name="lightbulb-on-outline" size={18} color={c.gold} />
              <T v="small" color={c.textMuted} style={{ flex: 1 }}>{cur.recomendacion}</T>
            </Row>
          )}
          <Row style={{ marginTop: space.lg, justifyContent: 'space-between' }}>
            <View>
              <T v="caption" color={c.textMuted}>Series</T>
              <Row gap={6} style={{ marginTop: 6 }}>
                {Array.from({ length: cur.series }).map((_, i) => (
                  <View key={i} style={[styles.setDot, { backgroundColor: i < sets[idx] ? c.success : c.surfaceAlt, borderColor: i === sets[idx] ? c.primary : 'transparent' }]}>
                    {i < sets[idx] && <Icon name="check" size={14} color="#fff" />}
                  </View>
                ))}
              </Row>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <T v="caption" color={c.textMuted}>Repeticiones</T>
              <T v="h1">{cur.repeticiones}</T>
            </View>
          </Row>
          <Input
            style={{ marginTop: space.lg }}
            label="Peso usado (kg)"
            icon="weight-kilogram"
            keyboardType="numeric"
            value={weights[idx]}
            onChangeText={(v) => setWeights((w) => w.map((x, i) => (i === idx ? v.replace(/[^0-9.]/g, '') : x)))}
            placeholder="Sin peso"
          />
          <Button
            title={sets[idx] >= cur.series ? 'Ejercicio completado ✓' : `Completar serie ${sets[idx] + 1} de ${cur.series}`}
            icon="check-circle-outline"
            onPress={completeSet}
            disabled={sets[idx] >= cur.series}
          />
          <Row style={{ marginTop: space.md }}>
            <Button title="Anterior" icon="chevron-left" variant="outline" small onPress={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} style={{ flex: 1 }} />
            <Button title="Siguiente" icon="chevron-right" variant="outline" small onPress={() => setIdx(Math.min(ex.length - 1, idx + 1))} disabled={idx === ex.length - 1} style={{ flex: 1 }} />
          </Row>
        </View>
      </Card>

      <T v="h3" style={{ marginTop: space.xl, marginBottom: space.md }}>Plan de hoy</T>
      {ex.map((e, i) => {
        const complete = sets[i] >= e.series;
        return (
          <Pressable key={e.id_detalle} onPress={() => setIdx(i)} style={[styles.step, { backgroundColor: i === idx ? c.primarySoft : c.surface, borderColor: i === idx ? c.primary : c.border }]}>
            <View style={[styles.stepNum, { backgroundColor: complete ? c.success : c.surfaceAlt }]}>
              {complete ? <Icon name="check" size={16} color="#fff" /> : <T v="small" style={{ fontSize: 12 }}>{i + 1}</T>}
            </View>
            <View style={{ flex: 1 }}>
              <T v="h3" style={{ fontSize: 14.5 }}>{e.nombre}</T>
              <T v="small" color={c.textMuted}>{e.series} × {e.repeticiones} · {sets[i]}/{e.series} hechas</T>
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}

function Summary({ icon, value, label }) {
  const { colors: c } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Icon name={icon} size={22} color={c.primary} />
      <T v="h2">{value}</T>
      <T v="small" color={c.textMuted}>{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  timer: { borderRadius: radius.xl, padding: space.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timerLbl: { color: 'rgba(255,255,255,0.8)', fontFamily: font.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  timerVal: { color: '#fff', fontFamily: font.extrabold, fontSize: 44, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  timerSub: { color: 'rgba(255,255,255,0.75)', fontFamily: font.semibold, fontSize: 12 },
  setDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1, marginBottom: space.sm },
  stepNum: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  effort: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.lg },
  effortDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
