import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useApi } from '../../hooks/useApi';
import { Header, Screen } from '../../components/Screen';
import { Avatar, Badge, Empty, ErrorState, Input, ListItem, Loading, Row, T } from '../../components/ui';
import { fRelative } from '../../utils/format';

/** Miembros asignados al entrenador con su actividad. */
export default function StudentsScreen({ navigation }) {
  const { colors: c } = useTheme();
  const [q, setQ] = useState('');
  const { data, error, loading, refreshing, refresh, reload } = useApi('/users/list', { rol: 'Alumno' });
  const list = (data || []).filter((u) => `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Screen header={<Header title="Mis alumnos" subtitle={data ? `${data.length} asignados` : ''} />} refreshing={refreshing} onRefresh={refresh}>
      <Input icon="magnify" placeholder="Buscar alumno" value={q} onChangeText={setQ} />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !list.length ? (
        <Empty icon="account-search" title="Sin alumnos" message="Cuando el administrador te asigne alumnos aparecerán acá." />
      ) : (
        list.map((u) => (
          <ListItem
            key={u.id_usuario}
            onPress={() => navigation.navigate('UserDetail', { id_usuario: u.id_usuario })}
            left={<Avatar name={`${u.nombre} ${u.apellido}`} url={u.avatar_url} size={46} />}
            title={`${u.nombre} ${u.apellido}`}
            subtitle={u.ultimo_entreno ? `Último entreno ${fRelative(u.ultimo_entreno)}` : 'Sin entrenamientos registrados'}
            right={
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                {u.estado === 'bloqueado' ? <Badge label="Bloqueado" kind="danger" icon="lock" /> : <Badge label={`${u.entrenos_semana} esta semana`} kind={u.entrenos_semana > 0 ? 'success' : 'muted'} />}
              </View>
            }
          />
        ))
      )}
      <Row style={{ justifyContent: 'center', marginTop: 8 }}>
        <T v="small" color={c.textSoft}>Tocá un alumno para ver su ficha y progreso.</T>
      </Row>
    </Screen>
  );
}
