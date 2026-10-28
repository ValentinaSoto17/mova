import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useApi } from '../../hooks/useApi';
import { Header, Screen, HeaderAction } from '../../components/Screen';
import { Avatar, Badge, Chip, Empty, ErrorState, Input, ListItem, Loading, Row, T } from '../../components/ui';
import { space } from '../../theme/tokens';

const ROLES = [null, 'Alumno', 'Entrenador', 'Administrador'];

/** Panel de administración de usuarios y entrenadores. */
export default function UsersPanel({ navigation }) {
  const { colors: c } = useTheme();
  const [rol, setRol] = useState(null);
  const [estado, setEstado] = useState(null);
  const [q, setQ] = useState('');
  const { data, error, loading, refreshing, refresh, reload } = useApi('/users/list', { ...(rol ? { rol } : {}), ...(estado ? { estado } : {}) });
  const list = (data || []).filter((u) => `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Screen header={<Header title="Usuarios" subtitle="Cuentas, roles y estados" right={<HeaderAction icon="account-plus" label="Nuevo usuario" onPress={() => navigation.navigate('UserForm')} />} />} refreshing={refreshing} onRefresh={refresh}>
      <Input icon="magnify" placeholder="Buscar por nombre o email" value={q} onChangeText={setQ} />
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        {ROLES.map((r) => (
          <Chip key={r || 'todos'} label={r || 'Todos'} active={rol === r} onPress={() => setRol(r)} />
        ))}
      </Row>
      <Row gap={space.sm} style={{ flexWrap: 'wrap', marginTop: space.sm, marginBottom: space.lg }}>
        <Chip label="Activos" icon="check-circle-outline" active={estado === 'activo'} onPress={() => setEstado(estado === 'activo' ? null : 'activo')} color={c.success} />
        <Chip label="Bloqueados" icon="lock-outline" active={estado === 'bloqueado'} onPress={() => setEstado(estado === 'bloqueado' ? null : 'bloqueado')} color={c.danger} />
      </Row>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !list.length ? (
        <Empty icon="account-search" title="Sin resultados" />
      ) : (
        <>
          <T v="small" color={c.textMuted} style={{ marginBottom: space.sm }}>{list.length} usuario(s)</T>
          {list.map((u) => (
            <ListItem
              key={u.id_usuario}
              onPress={() => navigation.navigate('UserDetail', { id_usuario: u.id_usuario })}
              left={<Avatar name={`${u.nombre} ${u.apellido}`} url={u.avatar_url} size={44} />}
              title={`${u.nombre} ${u.apellido}`}
              subtitle={u.rol === 'Alumno' ? `${u.email}${u.entrenador ? ` · ${u.entrenador}` : ''}` : u.email}
              right={
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Badge label={u.rol} kind={u.rol === 'Administrador' ? 'warning' : u.rol === 'Entrenador' ? 'success' : 'info'} />
                  {u.estado === 'bloqueado' && <Badge label="Bloqueado" kind="danger" icon="lock" />}
                </View>
              }
            />
          ))}
        </>
      )}
    </Screen>
  );
}
