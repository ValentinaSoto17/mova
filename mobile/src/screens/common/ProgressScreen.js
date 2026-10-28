import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useApi } from '../../hooks/useApi';
import { Header, Screen } from '../../components/Screen';
import { Badge, Card, Empty, ErrorState, Icon, Loading, Row, SectionTitle, Segmented, StatTile, T } from '../../components/ui';
import { BarChart, LineChart } from '../../components/Charts';
import { space } from '../../theme/tokens';
import { bpStatus, fDate, fDay, fTime } from '../../utils/format';

/**
 * Historial y evolución del alumno (también lo usa el entrenador/admin para ver a un alumno).
 * Muestra la semana a semana: sesiones, minutos, frecuencia cardíaca, presión y peso.
 */
export default function ProgressScreen({ route }) {
  const idAlumno = route?.params?.id_alumno;
  const nombre = route?.params?.nombre;
  const { colors: c } = useTheme();
  const [metric, setMetric] = useState('minutos');
  const { data, error, loading, refreshing, refresh, reload } = useApi('/progress/history', idAlumno ? { id_alumno: idAlumno } : {});

  const weeks = data?.semanal || [];
  const labels = weeks.map((w) => fDate(w.semana));
  const carga = data?.cargas?.find((x) => x.puntos.length > 2);

  return (
    <Screen
      header={<Header back={!!idAlumno} title={idAlumno ? nombre : 'Mi progreso'} subtitle="Historial y evolución semanal" />}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data.sesiones.length ? (
        <Empty icon="chart-line" title="Todavía no hay entrenamientos" message="Cuando registres tu primer entrenamiento vas a ver acá tu evolución." />
      ) : (
        <>
          <Row gap={space.md} style={{ flexWrap: 'wrap' }}>
            <StatTile icon="calendar-check" label="Sesiones" value={data.totales.sesiones} color={c.primary} />
            <StatTile icon="timer-outline" label="Minutos" value={data.totales.minutos} color={c.success} />
          </Row>
          <Row gap={space.md} style={{ flexWrap: 'wrap', marginTop: space.md }}>
            <StatTile icon="fire" label="Calorías" value={data.totales.calorias} unit="kcal" color={c.coral} />
            <StatTile icon="heart-pulse" label="FC promedio" value={data.totales.fc_promedio} unit="ppm" color={c.danger} />
          </Row>

          <SectionTitle title="Semana a semana" />
          <Segmented
            value={metric}
            onChange={setMetric}
            options={[
              { value: 'minutos', label: 'Minutos' },
              { value: 'corazon', label: 'Corazón' },
              { value: 'presion', label: 'Presión' },
              { value: 'peso', label: 'Peso' },
            ]}
          />
          <Card style={{ marginTop: space.md }}>
            {metric === 'minutos' && (
              <>
                <T v="small" color={c.textMuted} style={{ marginBottom: space.md }}>Minutos entrenados y sesiones por semana</T>
                <BarChart data={weeks.map((w, i) => ({ label: labels[i], value: Number(w.minutos) }))} height={170} />
                <Row style={{ justifyContent: 'space-around', marginTop: space.md }}>
                  {weeks.slice(-4).map((w) => (
                    <View key={w.semana} style={{ alignItems: 'center' }}>
                      <T v="h3">{w.sesiones}</T>
                      <T v="small" color={c.textMuted} style={{ fontSize: 11 }}>sesiones</T>
                    </View>
                  ))}
                </Row>
              </>
            )}
            {metric === 'corazon' && (
              <>
                <T v="small" color={c.textMuted} style={{ marginBottom: space.md }}>Frecuencia cardíaca (ppm)</T>
                <LineChart labels={labels} series={[{ label: 'Promedio', color: c.coral, values: weeks.map((w) => w.fc_promedio) }, { label: 'Máxima', color: c.danger, values: weeks.map((w) => w.fc_maxima) }]} />
              </>
            )}
            {metric === 'presion' && (
              <>
                <T v="small" color={c.textMuted} style={{ marginBottom: space.md }}>Presión arterial promedio (mmHg)</T>
                <LineChart labels={labels} series={[{ label: 'Sistólica', color: c.info, values: weeks.map((w) => w.sistolica) }, { label: 'Diastólica', color: c.primary, values: weeks.map((w) => w.diastolica) }]} />
              </>
            )}
            {metric === 'peso' && (
              <>
                <T v="small" color={c.textMuted} style={{ marginBottom: space.md }}>Peso corporal promedio (kg)</T>
                <LineChart labels={labels} series={[{ label: 'Peso', color: c.gold, values: weeks.map((w) => (w.peso != null ? Number(w.peso) : null)) }]} />
              </>
            )}
          </Card>

          {carga && (
            <>
              <SectionTitle title="Evolución de carga" />
              <Card>
                <T v="h3">{carga.nombre}</T>
                <T v="small" color={c.textMuted} style={{ marginBottom: space.md }}>Peso máximo por sesión (kg)</T>
                <LineChart labels={carga.puntos.map((p) => fDate(p.fecha))} series={[{ label: 'kg', color: c.success, values: carga.puntos.map((p) => Number(p.peso_kg)) }]} height={150} />
              </Card>
            </>
          )}

          <SectionTitle title="Historial" />
          {data.sesiones.map((s) => {
            const bp = bpStatus(s.presion_sistolica, s.presion_diastolica);
            return (
              <Card key={s.id_progreso} style={{ marginBottom: space.sm }}>
                <Row style={{ alignItems: 'flex-start' }}>
                  <View style={{ alignItems: 'center', width: 46 }}>
                    <T v="caption" color={c.primary}>{fDay(s.fecha)}</T>
                    <T v="h2">{fDate(s.fecha).split(' ')[0]}</T>
                    <T v="small" color={c.textMuted} style={{ fontSize: 11 }}>{fDate(s.fecha).split(' ')[1]}</T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <T v="h3" style={{ flex: 1 }}>{s.nombre_rutina}</T>
                      {bp && <Badge label={bp.label} kind={bp.kind} />}
                    </Row>
                    <T v="small" color={c.textMuted}>
                      {fTime(s.fecha)} h · {s.duracion_min} min · {s.ejercicios_completados}/{s.ejercicios_totales} ejercicios
                    </T>
                    <Row gap={space.md} style={{ marginTop: space.sm, flexWrap: 'wrap' }}>
                      {s.frecuencia_cardiaca_prom != null && <Metric icon="heart-pulse" color={c.coral} text={`${s.frecuencia_cardiaca_prom}/${s.frecuencia_cardiaca_max} ppm`} />}
                      {s.presion_sistolica != null && <Metric icon="water" color={c.info} text={`${s.presion_sistolica}/${s.presion_diastolica}`} />}
                      {s.calorias != null && <Metric icon="fire" color={c.gold} text={`${s.calorias} kcal`} />}
                      {s.esfuerzo_percibido != null && <Metric icon="speedometer" color={c.primary} text={`RPE ${s.esfuerzo_percibido}`} />}
                    </Row>
                    {!!s.observaciones && (
                      <T v="small" color={c.textMuted} style={{ marginTop: space.sm, fontStyle: 'italic' }}>
                        “{s.observaciones}”
                      </T>
                    )}
                  </View>
                </Row>
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}

function Metric({ icon, color, text }) {
  const { colors: c } = useTheme();
  return (
    <Row gap={4}>
      <Icon name={icon} size={15} color={color} />
      <T v="small" color={c.text} style={{ fontSize: 12.5 }}>{text}</T>
    </Row>
  );
}
