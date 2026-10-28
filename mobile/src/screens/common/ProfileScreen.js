import React, { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useApi, useAction } from '../../hooks/useApi';
import { Header, Screen } from '../../components/Screen';
import { Avatar, Badge, Banner, Button, Card, Divider, ErrorState, Icon, Input, Loading, Row, SectionTitle, Segmented, T } from '../../components/ui';
import { space } from '../../theme/tokens';
import { fDate, fullName } from '../../utils/format';

/**
 * Perfil: el alumno ve solo su información personal; entrenador y administrador además ven
 * su rol. Cada usuario puede modificar determinados datos propios.
 */
export default function ProfileScreen() {
  const { refreshUser, setUser } = useAuth();
  const { colors: c, preference, setPreference } = useTheme();
  const { toast, confirm } = useFeedback();
  const { data: p, setData, error, loading, reload } = useApi('/users/profile');
  const save = useAction();
  const pass = useAction();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({});
  const [pw, setPw] = useState({ actual: '', nueva: '' });

  useEffect(() => {
    if (p) {
      setF({
        nombre: p.nombre,
        apellido: p.apellido,
        telefono: p.telefono || '',
        fecha_nacimiento: p.fecha_nacimiento || '',
        altura_cm: p.altura_cm ? String(p.altura_cm) : '',
        peso_kg: p.peso_kg ? String(p.peso_kg) : '',
        objetivo: p.objetivo || '',
      });
    }
  }, [p]);

  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    try {
      const body = {
        ...f,
        telefono: f.telefono || null,
        fecha_nacimiento: f.fecha_nacimiento || null,
        altura_cm: f.altura_cm ? Number(f.altura_cm) : null,
        peso_kg: f.peso_kg ? Number(f.peso_kg) : null,
        objetivo: f.objetivo || null,
      };
      const u = await save.run('/users/update-profile', body);
      setData((d) => ({ ...d, ...u }));
      setUser((x) => ({ ...x, ...u }));
      setEdit(false);
      toast('Perfil actualizado');
    } catch {
      /* errores debajo de cada campo */
    }
  };

  const changePassword = async () => {
    try {
      await pass.run('/users/change-password', pw);
      setPw({ actual: '', nueva: '' });
      toast('Contraseña actualizada');
    } catch {
      /* errores en el formulario */
    }
  };

  const toggle2fa = async (activo) => {
    if (!activo) {
      const yes = await confirm({ title: '¿Desactivar verificación en 2 pasos?', message: 'Tu cuenta quedará protegida solo con la contraseña.', confirmText: 'Desactivar', danger: true });
      if (!yes) return;
    }
    try {
      await save.run('/users/two-factor', { activo });
      setData((d) => ({ ...d, doble_factor: activo }));
      refreshUser().catch(() => {});
      toast(activo ? 'Verificación en 2 pasos activada' : 'Verificación en 2 pasos desactivada', activo ? 'success' : 'info');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <Screen
      header={<Header title="Mi perfil" right={p && !edit ? <Pressable onPress={() => setEdit(true)} hitSlop={8}><T v="small" color={c.primary} style={{ fontWeight: '700' }}>Editar</T></Pressable> : null} />}
      footer={edit ? <Row><Button title="Cancelar" variant="outline" style={{ flex: 1 }} onPress={() => { setEdit(false); reload(); }} /><Button title="Guardar" icon="content-save" style={{ flex: 1 }} loading={save.busy} onPress={submit} /></Row> : null}
    >
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
            <Avatar name={fullName(p)} url={p.avatar_url} size={84} />
            <T v="h1" style={{ marginTop: space.md, textAlign: 'center' }}>{fullName(p)}</T>
            <T v="small" color={c.textMuted}>{p.email}</T>
            {p.rol !== 'Alumno' && (
              <View style={{ marginTop: space.sm }}>
                <Badge label={p.rol} kind={p.rol === 'Administrador' ? 'warning' : 'success'} icon={p.rol === 'Administrador' ? 'shield-crown' : 'whistle'} />
              </View>
            )}
            <Row gap={6} style={{ marginTop: space.sm }}>
              <Icon name={p.email_verificado ? 'check-decagram' : 'alert-decagram'} size={16} color={p.email_verificado ? c.success : c.warning} />
              <T v="small" color={c.textMuted}>{p.email_verificado ? 'Email verificado' : 'Email sin verificar'}</T>
            </Row>
          </Card>

          {p.rol === 'Alumno' && p.membresia && (
            <Card style={{ marginTop: space.md }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View>
                  <T v="caption" color={c.textMuted}>Plan</T>
                  <T v="h3">{p.membresia.plan}</T>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T v="caption" color={c.textMuted}>Vence</T>
                  <T v="h3" color={p.membresia.dias_restantes <= 3 ? c.warning : c.text}>{fDate(p.membresia.fecha_vencimiento)}</T>
                </View>
              </Row>
              {p.entrenador && (
                <>
                  <Divider />
                  <Row>
                    <Icon name="account-tie" size={20} color={c.primary} />
                    <T v="small">Tu entrenador: <T v="small" style={{ fontWeight: '700' }}>{p.entrenador.nombre} {p.entrenador.apellido}</T></T>
                  </Row>
                </>
              )}
            </Card>
          )}

          <SectionTitle title="Datos personales" />
          <Card>
            {edit ? (
              <>
                {save.formError && !Object.keys(save.fieldErrors).length && <Banner message={save.formError.message} />}
                <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
                  <Input style={{ flex: 1 }} label="Nombre" value={f.nombre} onChangeText={set('nombre')} error={save.fieldErrors.nombre} />
                  <Input style={{ flex: 1 }} label="Apellido" value={f.apellido} onChangeText={set('apellido')} error={save.fieldErrors.apellido} />
                </Row>
                <Input label="Teléfono" icon="phone-outline" value={f.telefono} onChangeText={set('telefono')} keyboardType="phone-pad" error={save.fieldErrors.telefono} />
                <Input label="Fecha de nacimiento" icon="cake-variant-outline" value={f.fecha_nacimiento} onChangeText={set('fecha_nacimiento')} placeholder="AAAA-MM-DD" error={save.fieldErrors.fecha_nacimiento} />
                <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
                  <Input style={{ flex: 1 }} label="Altura (cm)" keyboardType="numeric" value={f.altura_cm} onChangeText={set('altura_cm')} error={save.fieldErrors.altura_cm} />
                  <Input style={{ flex: 1 }} label="Peso (kg)" keyboardType="numeric" value={f.peso_kg} onChangeText={set('peso_kg')} error={save.fieldErrors.peso_kg} />
                </Row>
                <Input label="Objetivo" icon="target" value={f.objetivo} onChangeText={set('objetivo')} error={save.fieldErrors.objetivo} />
              </>
            ) : (
              <>
                <Field icon="phone-outline" label="Teléfono" value={p.telefono} />
                <Field icon="cake-variant-outline" label="Nacimiento" value={p.fecha_nacimiento ? fDate(p.fecha_nacimiento) + ' ' + p.fecha_nacimiento.slice(0, 4) : null} />
                <Field icon="human-male-height" label="Altura" value={p.altura_cm ? `${p.altura_cm} cm` : null} />
                <Field icon="scale-bathroom" label="Peso" value={p.peso_kg ? `${p.peso_kg} kg` : null} />
                <Field icon="target" label="Objetivo" value={p.objetivo} last />
              </>
            )}
          </Card>

          <SectionTitle title="Apariencia" />
          <Card>
            <T v="small" color={c.textMuted} style={{ marginBottom: space.md }}>Elegí el modo claro u oscuro, o seguí la configuración del teléfono.</T>
            <Segmented value={preference} onChange={setPreference} options={[{ value: 'system', label: 'Automático' }, { value: 'light', label: '☀️ Claro' }, { value: 'dark', label: '🌙 Oscuro' }]} />
          </Card>

          <SectionTitle title="Seguridad" />
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T v="h3">Verificación en 2 pasos</T>
                <T v="small" color={c.textMuted}>Al ingresar te pediremos un código enviado a tu email.</T>
              </View>
              <Switch value={!!p.doble_factor} onValueChange={toggle2fa} trackColor={{ true: c.primary, false: c.border }} thumbColor="#fff" />
            </Row>
            <Divider />
            <T v="h3" style={{ marginBottom: space.md }}>{p.tiene_password ? 'Cambiar contraseña' : 'Crear contraseña'}</T>
            {pass.formError && !Object.keys(pass.fieldErrors).length && <Banner message={pass.formError.message} />}
            {p.tiene_password && <Input label="Contraseña actual" secure value={pw.actual} onChangeText={(v) => setPw({ ...pw, actual: v })} error={pass.fieldErrors.actual} />}
            <Input label="Nueva contraseña" secure value={pw.nueva} onChangeText={(v) => setPw({ ...pw, nueva: v })} error={pass.fieldErrors.nueva} hint="Mín. 8 caracteres, con mayúscula, minúscula y número" />
            <Button title="Actualizar contraseña" variant="secondary" icon="lock-reset" onPress={changePassword} loading={pass.busy} disabled={!pw.nueva} />
          </Card>
          <T v="small" color={c.textSoft} style={{ textAlign: 'center', marginTop: space.xl }}>Miembro desde {fDate(p.created_at)} {String(p.created_at).slice(0, 4)}</T>
        </>
      )}
    </Screen>
  );
}

function Field({ icon, label, value, last }) {
  const { colors: c } = useTheme();
  return (
    <Row style={{ paddingVertical: space.sm, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border }}>
      <Icon name={icon} size={20} color={c.textMuted} />
      <T v="small" color={c.textMuted} style={{ width: 90 }}>{label}</T>
      <T v="body" style={{ flex: 1 }} color={value ? c.text : c.textSoft}>{value || 'Sin cargar'}</T>
    </Row>
  );
}
