import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useApi, useAction } from '../../hooks/useApi';
import { Header, Screen } from '../../components/Screen';
import { Avatar, Banner, Button, Card, Chip, Empty, ErrorState, Icon, ListItem, Loading, Row, SectionTitle, T } from '../../components/ui';
import { space } from '../../theme/tokens';
import { addDays, fDateLong } from '../../utils/format';

/** Asignar una rutina a un alumno (o una rutina a un alumno preseleccionado). */
export default function AssignRoutine({ route, navigation }) {
  const { routine, alumno } = route.params || {};
  const { colors: c } = useTheme();
  const { toast } = useFeedback();
  const students = useApi('/users/list', { rol: 'Alumno', estado: 'activo' }, { auto: !alumno });
  const routines = useApi('/routines/list', {}, { auto: !routine });
  const { run, busy, formError, fieldErrors } = useAction();
  const [sel, setSel] = useState(alumno || null);
  const [rut, setRut] = useState(routine || null);
  const [weeks, setWeeks] = useState(4);

  const assign = async () => {
    try {
      await run('/routines/manage', { accion: 'asignar', id_rutina: rut.id_rutina, id_alumno: sel.id_usuario, fecha_revision: addDays(weeks * 7) });
      toast(`Rutina asignada a ${sel.nombre}`);
      navigation.goBack();
    } catch {
      /* banner */
    }
  };

  return (
    <Screen header={<Header back title="Asignar rutina" subtitle={rut?.nombre_rutina || sel?.nombre} />} footer={<Button title="Asignar" icon="check" onPress={assign} loading={busy} disabled={!sel || !rut} />}>
      {formError && <Banner message={fieldErrors.fecha_revision || formError.message} />}
      {!routine && (
        <>
          <SectionTitle title="Rutina" style={{ marginTop: 0 }} />
          {routines.loading ? <Loading /> : routines.error ? <ErrorState error={routines.error} onRetry={routines.reload} /> : routines.data.map((r) => (
            <ListItem key={r.id_rutina} onPress={() => setRut(r)} title={r.nombre_rutina} subtitle={`${r.cantidad_ejercicios} ejercicios · ${r.entrenador}`} right={<Icon name={rut?.id_rutina === r.id_rutina ? 'radiobox-marked' : 'radiobox-blank'} size={24} color={c.primary} />} />
          ))}
        </>
      )}
      {!alumno && (
        <>
          <SectionTitle title="Alumno" style={{ marginTop: routine ? 0 : undefined }} />
          {students.loading ? <Loading /> : students.error ? <ErrorState error={students.error} onRetry={students.reload} /> : !students.data.length ? (
            <Empty icon="account-off" title="No tenés alumnos activos" />
          ) : (
            students.data.map((u) => (
              <ListItem key={u.id_usuario} onPress={() => setSel(u)} left={<Avatar name={`${u.nombre} ${u.apellido}`} size={40} />} title={`${u.nombre} ${u.apellido}`} subtitle={u.email} right={<Icon name={sel?.id_usuario === u.id_usuario ? 'radiobox-marked' : 'radiobox-blank'} size={24} color={c.primary} />} />
            ))
          )}
        </>
      )}
      <SectionTitle title="Fecha de revisión" />
      <Card>
        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          {[2, 4, 6, 8].map((w) => (
            <Chip key={w} label={`${w} semanas`} active={weeks === w} onPress={() => setWeeks(w)} />
          ))}
        </Row>
        <T v="small" color={c.textMuted} style={{ marginTop: space.md }}>
          Revisión: {fDateLong(addDays(weeks * 7))}. Dos días antes, vos y el alumno reciben un aviso.
        </T>
      </Card>
    </Screen>
  );
}
