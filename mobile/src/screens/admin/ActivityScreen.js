import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useApi } from '../../hooks/useApi';
import { Header, Screen, HeaderAction } from '../../components/Screen';
import { Avatar, Badge, Button, Empty, ErrorState, ListItem, Loading, Segmented, T } from '../../components/ui';
import { RoutinesList } from '../entrenador/RoutinesManage';
import { space } from '../../theme/tokens';
import { fDate, fRelative } from '../../utils/format';

/** Supervisión de rutinas, asignaciones y planes realizados (administrador). */
export default function ActivityScreen({ navigation }) {
  const { colors: c } = useTheme();
  const [tab, setTab] = useState('asignaciones');
  const asg = useApi('/routines/assignments');

  return (
    <Screen
      header={<Header title="Actividad" subtitle="Rutinas y planes realizados" right={tab === 'rutinas' ? <HeaderAction icon="plus" label="Nueva rutina" onPress={() => navigation.navigate('RoutineForm')} /> : null} />}
      refreshing={asg.refreshing}
      onRefresh={asg.refresh}
    >
      <Segmented value={tab} onChange={setTab} options={[{ value: 'asignaciones', label: 'Asignaciones', count: asg.data?.length }, { value: 'rutinas', label: 'Rutinas' }, { value: 'ejercicios', label: 'Ejercicios' }]} />
      <View style={{ height: space.lg }} />
      {tab === 'asignaciones' &&
        (asg.loading ? <Loading /> : asg.error ? <ErrorState error={asg.error} onRetry={asg.reload} /> : !asg.data.length ? <Empty title="Sin asignaciones activas" /> : (
          asg.data.map((a) => (
            <ListItem
              key={a.id_asignacion}
              onPress={() => navigation.navigate('StudentProgress', { id_alumno: a.id_alumno, nombre: a.alumno })}
              left={<Avatar name={a.alumno} size={42} />}
              title={a.alumno}
              subtitle={`${a.nombre_rutina} · ${a.entrenador}\n${a.sesiones} sesiones · ${a.ultima_sesion ? `última ${fRelative(a.ultima_sesion)}` : 'sin sesiones'}`}
              right={
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Badge label={`Rev. ${fDate(a.fecha_revision)}`} kind={a.dias_revision < 0 ? 'danger' : a.dias_revision <= 2 ? 'warning' : 'muted'} />
                  {a.estado_alumno === 'bloqueado' && <Badge label="Bloqueado" kind="danger" />}
                </View>
              }
            />
          ))
        ))}
      {tab === 'rutinas' && <RoutinesList navigation={navigation} />}
      {tab === 'ejercicios' && (
        <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }}>
          <T v="body" color={c.textMuted} style={{ textAlign: 'center' }}>Gestioná el catálogo completo de ejercicios: crear, modificar y eliminar.</T>
          <Button title="Abrir catálogo de ejercicios" icon="dumbbell" full={false} onPress={() => navigation.navigate('CatalogAdmin')} />
          <Button title="Nuevo ejercicio" icon="plus" variant="secondary" full={false} onPress={() => navigation.navigate('ExerciseForm')} />
        </View>
      )}
    </Screen>
  );
}
