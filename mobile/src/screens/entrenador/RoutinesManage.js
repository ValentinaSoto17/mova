import React, { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useApi } from '../../hooks/useApi';
import { Header, Screen, HeaderAction } from '../../components/Screen';
import { Badge, Card, Empty, ErrorState, Icon, Loading, Pill, Row, Segmented, T } from '../../components/ui';
import { catStyle } from '../../theme/colors';
import { space } from '../../theme/tokens';

/** Listado de rutinas para entrenador (y administrador, desde Actividad). */
export function RoutinesList({ navigation, onlyMine }) {
  const { colors: c } = useTheme();
  const { data, error, loading, reload } = useApi('/routines/list', { solo_mias: !!onlyMine });
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data.length) return <Empty icon="clipboard-plus-outline" title="No hay rutinas" message="Creá tu primera rutina con el botón +." action="Crear rutina" onAction={() => navigation.navigate('RoutineForm')} />;
  return data.map((r) => {
    const st = catStyle((r.categorias || '').split(', ')[0]);
    return (
      <Card key={r.id_rutina} style={{ marginBottom: space.sm }} onPress={() => navigation.navigate('RoutineDetail', { id_rutina: r.id_rutina })}>
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: st.color + '1F', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={st.icon} size={24} color={st.color} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="h3">{r.nombre_rutina}</T>
            <T v="small" color={c.textMuted}>{r.categorias || 'Sin ejercicios'}</T>
          </View>
          {r.es_mia && <Badge label="Mía" kind="primary" />}
        </Row>
        <Row style={{ marginTop: space.md, flexWrap: 'wrap' }} gap={space.lg}>
          <Pill icon="format-list-numbered" text={`${r.cantidad_ejercicios} ejercicios`} />
          <Pill icon="clock-outline" text={`${r.duracion_estimada_min} min`} />
          <Pill icon="account-multiple-check" text={`${r.asignaciones_activas} asignada(s)`} />
          {!r.es_mia && <Pill icon="account-tie" text={r.entrenador} />}
        </Row>
      </Card>
    );
  });
}

export default function RoutinesManage({ navigation }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('mias');
  return (
    <Screen header={<Header title="Rutinas" subtitle="Creá, editá y asigná" right={<HeaderAction icon="plus" label="Nueva rutina" onPress={() => navigation.navigate('RoutineForm')} />} />}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'mias', label: 'Mis rutinas' }, { value: 'todas', label: 'Todas' }]} />
      <View style={{ height: space.lg }} />
      <RoutinesList key={tab + user.id_usuario} navigation={navigation} onlyMine={tab === 'mias'} />
    </Screen>
  );
}
