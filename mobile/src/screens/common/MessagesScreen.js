import React, { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useApi } from '../../hooks/useApi';
import { Header, Screen, HeaderAction } from '../../components/Screen';
import { Avatar, Badge, Empty, ErrorState, Icon, ListItem, Loading, Row, Segmented, T } from '../../components/ui';
import { space } from '../../theme/tokens';
import { fRelative } from '../../utils/format';

const TYPE_ICON = { gimnasio: 'office-building', proveedor: 'truck-delivery' };

export default function MessagesScreen({ navigation }) {
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const { data, error, loading, refreshing, refresh, reload } = useApi('/messages/conversations');
  const [filter, setFilter] = useState('todos');
  const staff = user.rol !== 'Alumno';

  const items = (data || []).filter((x) => filter === 'todos' || x.tipo === filter || (filter === 'usuario' && x.tipo === 'usuario'));
  const unreadGym = (data || []).filter((x) => x.tipo === 'gimnasio').reduce((a, b) => a + Number(b.sin_leer || 0), 0);

  const options = [
    { value: 'todos', label: 'Todos' },
    { value: 'usuario', label: 'Directos' },
    ...(staff ? [{ value: 'gimnasio', label: 'Consultas', count: unreadGym || null }] : []),
    ...(user.rol === 'Administrador' ? [{ value: 'proveedor', label: 'Proveedores' }] : []),
  ];

  return (
    <Screen
      header={<Header title="Mensajes" subtitle={staff ? 'Alumnos, equipo y consultas' : 'Tu entrenador y el gimnasio'} right={<HeaderAction icon="square-edit-outline" label="Nuevo mensaje" onPress={() => navigation.navigate('NewChat')} />} />}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {options.length > 2 && (
        <View style={{ marginBottom: space.lg }}>
          <Segmented value={filter} onChange={setFilter} options={options} />
        </View>
      )}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !items.length ? (
        <Empty icon="message-text-outline" title="Sin conversaciones" message="Empezá una conversación nueva con el botón de arriba." action="Nuevo mensaje" onAction={() => navigation.navigate('NewChat')} />
      ) : (
        items.map((m) => (
          <ListItem
            key={`${m.tipo}-${m.id}`}
            onPress={() => navigation.navigate('Chat', { tipo: m.tipo, id: m.id, nombre: m.nombre })}
            left={
              TYPE_ICON[m.tipo] && (m.tipo !== 'gimnasio' || !staff) ? (
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: m.tipo === 'gimnasio' ? c.primarySoft : c.goldSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={TYPE_ICON[m.tipo]} size={22} color={m.tipo === 'gimnasio' ? c.primary : c.gold} />
                </View>
              ) : (
                <Avatar name={m.nombre} url={m.avatar_url} size={46} />
              )
            }
            title={m.nombre}
            subtitle={`${m.enviado_por_mi ? 'Vos: ' : ''}${m.ultimo_mensaje}`}
            right={
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <T v="small" color={c.textSoft} style={{ fontSize: 11 }}>{m.fecha ? fRelative(m.fecha) : ''}</T>
                <Row gap={4}>
                  {staff && m.tipo === 'gimnasio' && <Badge label="Consulta" kind="primary" />}
                  {Number(m.sin_leer) > 0 && <Badge label={String(m.sin_leer)} kind="coral" />}
                </Row>
              </View>
            }
          />
        ))
      )}
    </Screen>
  );
}
