import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useApi } from '../../hooks/useApi';
import { Header, Screen } from '../../components/Screen';
import { Avatar, Badge, Banner, ErrorState, ListItem, Loading, Segmented, T } from '../../components/ui';
import { space } from '../../theme/tokens';
import { fDate } from '../../utils/format';

/** Vencimientos de cuotas (administrador). */
export default function MembershipsScreen({ navigation }) {
  const { colors: c } = useTheme();
  const [filter, setFilter] = useState('todas');
  const { data, error, loading, refreshing, refresh, reload } = useApi('/admin/memberships', { accion: 'listar' });

  const list = (data || []).filter((m) => (filter === 'vencidas' ? m.dias_restantes < 0 : filter === 'proximas' ? m.dias_restantes >= 0 && m.dias_restantes <= 7 : true));
  const vencidas = (data || []).filter((m) => m.dias_restantes < 0).length;

  return (
    <Screen header={<Header title="Cuotas" subtitle="Membresías y vencimientos" />} refreshing={refreshing} onRefresh={refresh}>
      <Banner kind="info" message="Tocá un alumno para registrar un pago. Si estaba bloqueado por cuota, se reactiva solo." />
      <Segmented value={filter} onChange={setFilter} options={[{ value: 'todas', label: 'Todas' }, { value: 'proximas', label: 'Próximas' }, { value: 'vencidas', label: 'Vencidas', count: vencidas || null }]} />
      <T v="small" color={c.textMuted} style={{ marginVertical: space.md }}>{list.length} alumno(s)</T>
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : list.map((m) => (
        <ListItem
          key={m.id_usuario}
          onPress={() => navigation.navigate('UserDetail', { id_usuario: m.id_usuario })}
          left={<Avatar name={`${m.nombre} ${m.apellido}`} size={42} />}
          title={`${m.nombre} ${m.apellido}`}
          subtitle={`Plan ${m.plan} · vence ${fDate(m.fecha_vencimiento)}${m.estado === 'bloqueado' ? ' · bloqueado' : ''}`}
          right={<Badge label={m.dias_restantes < 0 ? `Vencida ${-m.dias_restantes} d` : `${m.dias_restantes} d`} kind={m.dias_restantes < 0 ? 'danger' : m.dias_restantes <= 3 ? 'warning' : 'success'} />}
        />
      ))}
    </Screen>
  );
}
