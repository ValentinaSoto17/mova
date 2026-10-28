import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useApi, useAction } from '../../hooks/useApi';
import { Header, Screen } from '../../components/Screen';
import { Banner, Button, Chip, Input, Row, SectionTitle, T } from '../../components/ui';
import { space } from '../../theme/tokens';

/** Crear o modificar una cuenta (administrador). */
export default function UserForm({ route, navigation }) {
  const u = route.params?.user;
  const { colors: c } = useTheme();
  const { toast, confirm } = useFeedback();
  const trainers = useApi('/admin/trainers');
  const { run, busy, fieldErrors, formError } = useAction();
  const [f, setF] = useState({
    nombre: u?.nombre || '',
    apellido: u?.apellido || '',
    email: u?.email || '',
    telefono: u?.telefono || '',
    rol: u?.rol || 'Alumno',
    id_entrenador: u?.id_entrenador || null,
    password: '',
  });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (u && !(await confirm({ title: '¿Guardar cambios?', message: `Se modificará la cuenta de ${u.nombre}.`, confirmText: 'Guardar' }))) return;
    try {
      const body = { accion: u ? 'editar' : 'crear', ...f, telefono: f.telefono || null };
      if (u) {
        body.id_usuario = u.id_usuario;
        body.confirmacion = true;
        delete body.password;
      }
      await run('/admin/users/manage', body);
      toast(u ? 'Cuenta actualizada' : 'Cuenta creada');
      navigation.goBack();
    } catch {
      /* errores visibles */
    }
  };

  return (
    <Screen header={<Header back title={u ? 'Editar usuario' : 'Nuevo usuario'} />} footer={<Button title={u ? 'Guardar cambios' : 'Crear cuenta'} icon="content-save" onPress={save} loading={busy} />}>
      {formError && !Object.keys(fieldErrors).length && <Banner message={formError.message} />}
      <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
        <Input style={{ flex: 1 }} label="Nombre" value={f.nombre} onChangeText={set('nombre')} error={fieldErrors.nombre} />
        <Input style={{ flex: 1 }} label="Apellido" value={f.apellido} onChangeText={set('apellido')} error={fieldErrors.apellido} />
      </Row>
      <Input label="Email" icon="email-outline" value={f.email} onChangeText={set('email')} error={fieldErrors.email} autoCapitalize="none" keyboardType="email-address" />
      <Input label="Teléfono" icon="phone-outline" value={f.telefono} onChangeText={set('telefono')} error={fieldErrors.telefono} keyboardType="phone-pad" />
      {!u && <Input label="Contraseña inicial" icon="lock-outline" secure value={f.password} onChangeText={set('password')} error={fieldErrors.password} hint="Mín. 8 caracteres, con mayúscula, minúscula y número" />}
      <SectionTitle title="Rol" style={{ marginTop: space.sm }} />
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        {['Alumno', 'Entrenador', 'Administrador'].map((r) => (
          <Chip key={r} label={r} active={f.rol === r} onPress={() => set('rol')(r)} />
        ))}
      </Row>
      {f.rol === 'Alumno' && (
        <>
          <SectionTitle title="Entrenador asignado" />
          <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
            <Chip label="Sin asignar" active={!f.id_entrenador} onPress={() => set('id_entrenador')(null)} />
            {(trainers.data || []).map((t) => (
              <Chip key={t.id_usuario} label={`${t.nombre} ${t.apellido} (${t.alumnos})`} active={f.id_entrenador === t.id_usuario} onPress={() => set('id_entrenador')(t.id_usuario)} />
            ))}
          </Row>
        </>
      )}
      <T v="small" color={c.textSoft} style={{ marginTop: space.xl }}>Las cuentas creadas por el administrador quedan con el email verificado.</T>
    </Screen>
  );
}
