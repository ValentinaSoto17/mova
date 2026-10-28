import React, { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useApi } from '../../hooks/useApi';
import { api } from '../../api/client';
import { useFeedback } from '../../context/FeedbackContext';
import { Header, Screen } from '../../components/Screen';
import { Avatar, Badge, Button, Card, ErrorState, Icon, Input, ListItem, Loading, SectionTitle, T } from '../../components/ui';
import { space } from '../../theme/tokens';

export default function NewChatScreen({ navigation }) {
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const { toast } = useFeedback();
  const contacts = useApi('/users/contacts');
  const isAdmin = user.rol === 'Administrador';
  const suppliers = useApi('/messages/suppliers', { accion: 'listar' }, { auto: isAdmin });
  const [q, setQ] = useState('');
  const [newSup, setNewSup] = useState(null);
  const [errors, setErrors] = useState({});

  const go = (params) => navigation.replace('Chat', params);
  const filtered = (contacts.data || []).filter((u) => `${u.nombre} ${u.apellido}`.toLowerCase().includes(q.toLowerCase()));

  const createSupplier = async () => {
    try {
      await api('/messages/suppliers', { accion: 'crear', ...newSup });
      toast('Distribuidora agregada');
      setNewSup(null);
      suppliers.reload();
    } catch (e) {
      setErrors(e.fields || {});
      toast(e.message, 'error');
    }
  };

  return (
    <Screen header={<Header back title="Nuevo mensaje" />}>
      {user.rol === 'Alumno' && (
        <ListItem
          onPress={() => go({ tipo: 'gimnasio' })}
          left={<View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="office-building" size={22} color={c.primary} /></View>}
          title="Consulta al gimnasio"
          subtitle="La responde el dueño o cualquier entrenador"
        />
      )}
      <Input icon="magnify" placeholder="Buscar persona" value={q} onChangeText={setQ} style={{ marginTop: space.md }} />
      {contacts.loading ? (
        <Loading />
      ) : contacts.error ? (
        <ErrorState error={contacts.error} onRetry={contacts.reload} />
      ) : (
        filtered.map((u) => (
          <ListItem
            key={u.id_usuario}
            onPress={() => go({ tipo: 'usuario', id: u.id_usuario, nombre: `${u.nombre} ${u.apellido}` })}
            left={<Avatar name={`${u.nombre} ${u.apellido}`} url={u.avatar_url} size={42} />}
            title={`${u.nombre} ${u.apellido}`}
            right={<Badge label={u.rol} kind={u.rol === 'Administrador' ? 'warning' : u.rol === 'Entrenador' ? 'success' : 'info'} />}
          />
        ))
      )}

      {isAdmin && (
        <>
          <SectionTitle title="Distribuidoras" action={newSup ? null : 'Agregar'} onAction={() => setNewSup({ nombre: '', rubro: '', email: '', telefono: '' })} />
          {newSup && (
            <Card style={{ marginBottom: space.md }}>
              <Input label="Nombre" value={newSup.nombre} onChangeText={(v) => setNewSup({ ...newSup, nombre: v })} error={errors.nombre} />
              <Input label="Rubro" value={newSup.rubro} onChangeText={(v) => setNewSup({ ...newSup, rubro: v })} error={errors.rubro} placeholder="Equipamiento, indumentaria…" />
              <Input label="Email" value={newSup.email} onChangeText={(v) => setNewSup({ ...newSup, email: v })} error={errors.email} autoCapitalize="none" keyboardType="email-address" />
              <Button title="Guardar distribuidora" onPress={createSupplier} />
              <Button title="Cancelar" variant="ghost" onPress={() => setNewSup(null)} />
            </Card>
          )}
          {(suppliers.data || []).map((s) => (
            <ListItem
              key={s.id_proveedor}
              onPress={() => go({ tipo: 'proveedor', id: s.id_proveedor, nombre: s.nombre })}
              left={<View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.goldSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="truck-delivery" size={20} color={c.gold} /></View>}
              title={s.nombre}
              subtitle={`${s.rubro} · ${s.email}`}
            />
          ))}
          <T v="small" color={c.textSoft} style={{ marginTop: space.sm }}>Los mensajes a distribuidoras también se envían a su email.</T>
        </>
      )}
    </Screen>
  );
}
