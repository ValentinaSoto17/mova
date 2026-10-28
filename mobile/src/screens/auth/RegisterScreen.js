import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Banner, Button, Icon, Input, Row, T } from '../../components/ui';
import AuthShell from './AuthShell';
import { font, space } from '../../theme/tokens';

const RULES = [
  { test: (p) => p.length >= 8, label: '8 caracteres o más' },
  { test: (p) => /[A-Z]/.test(p), label: 'Una mayúscula' },
  { test: (p) => /[a-z]/.test(p), label: 'Una minúscula' },
  { test: (p) => /\d/.test(p), label: 'Un número' },
];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { colors: c } = useTheme();
  const [f, setF] = useState({ nombre: '', apellido: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => {
    setF((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: null }));
  };

  const submit = async () => {
    const e = {};
    if (f.nombre.trim().length < 2) e.nombre = 'Ingresá tu nombre';
    if (f.apellido.trim().length < 2) e.apellido = 'Ingresá tu apellido';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Ingresá un email válido';
    if (!RULES.every((r) => r.test(f.password))) e.password = 'La contraseña no cumple los requisitos';
    if (f.password !== f.confirm) e.confirm = 'Las contraseñas no coinciden';
    setErrors(e);
    setServerError(null);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const res = await register({ nombre: f.nombre.trim(), apellido: f.apellido.trim(), email: f.email.trim().toLowerCase(), password: f.password });
      if (res?.step) navigation.replace('Verify', res);
    } catch (err) {
      setErrors(err.fields || {});
      setServerError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Creá tu cuenta" subtitle="Te enviaremos un código para verificar tu email.">
      {serverError && <Banner title="No pudimos registrarte" message={`${serverError.message}${serverError.status ? ` (código ${serverError.status})` : ''}`} />}
      <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
        <Input style={{ flex: 1 }} label="Nombre" value={f.nombre} onChangeText={set('nombre')} error={errors.nombre} autoComplete="given-name" />
        <Input style={{ flex: 1 }} label="Apellido" value={f.apellido} onChangeText={set('apellido')} error={errors.apellido} autoComplete="family-name" />
      </Row>
      <Input label="Email" icon="email-outline" value={f.email} onChangeText={set('email')} error={errors.email} autoCapitalize="none" keyboardType="email-address" placeholder="tu@email.com" />
      <Input label="Contraseña" icon="lock-outline" value={f.password} onChangeText={set('password')} error={errors.password} secure />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4, marginBottom: space.md }}>
        {RULES.map((r) => {
          const okR = r.test(f.password);
          return (
            <Row key={r.label} gap={4}>
              <Icon name={okR ? 'check-circle' : 'circle-outline'} size={14} color={okR ? c.success : c.textSoft} />
              <T v="small" color={okR ? c.success : c.textMuted} style={{ fontSize: 12 }}>
                {r.label}
              </T>
            </Row>
          );
        })}
      </View>
      <Input label="Repetir contraseña" icon="lock-check-outline" value={f.confirm} onChangeText={set('confirm')} error={errors.confirm} secure onSubmitEditing={submit} />
      <Button title="Crear cuenta" icon="account-plus" onPress={submit} loading={busy} style={{ marginTop: space.sm }} />
      <Row style={{ justifyContent: 'center', marginTop: space.lg }} gap={6}>
        <T v="small" color={c.textMuted}>¿Ya tenés cuenta?</T>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={{ fontFamily: font.extrabold, color: c.primary, fontSize: 13 }}>Iniciá sesión</Text>
        </Pressable>
      </Row>
    </AuthShell>
  );
}
