import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Banner, Button, Icon, Input, Row, T } from '../../components/ui';
import { useFeedback } from '../../context/FeedbackContext';
import SocialButtons from '../../auth/SocialButtons';
import type { SocialPayload } from '../../types';
import AuthShell from './AuthShell';
import { font, space } from '../../theme/tokens';

export interface RegisterScreenProps {
  navigation?: any;
}

const RULES = [
  { test: (p) => p.length >= 8, label: '8 caracteres o más' },
  { test: (p) => /[A-Z]/.test(p), label: 'Una mayúscula' },
  { test: (p) => /[a-z]/.test(p), label: 'Una minúscula' },
  { test: (p) => /\d/.test(p), label: 'Un número' },
];

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { register, social } = useAuth();
  const { toast } = useFeedback();
  const { colors: c } = useTheme();
  const [f, setF] = useState({ nombre: '', apellido: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, any>>({});
  const [serverError, setServerError] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState<string | null>(null);
  const set = (k) => (v) => {
    setF((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: null }));
  };

  const submit = async () => {
    const e: Record<string, string> = {};
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

  // Registro con Google, GitHub o Discord: si el email no existe, el servidor crea la cuenta de Alumno
  const onSocial = async (payload: SocialPayload) => {
    setSocialBusy(payload.provider);
    setServerError(null);
    try {
      const res = await social(payload);
      if (res?.step) navigation.replace('Verify', res);
      if (res?.done) toast('¡Bienvenido/a a MOVA!');
    } catch (err) {
      if (err.code === 'ACCOUNT_BLOCKED') return navigation.navigate('Blocked');
      setServerError(err);
    } finally {
      setSocialBusy(null);
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

      <Row style={{ marginVertical: space.lg }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        <T v="small" color={c.textSoft} style={{ marginHorizontal: space.md }}>o registrate con</T>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      </Row>
      <SocialButtons onToken={onSocial} busy={socialBusy} />
      <Row style={{ justifyContent: 'center', marginTop: space.lg }} gap={6}>
        <T v="small" color={c.textMuted}>¿Ya tenés cuenta?</T>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={{ fontFamily: font.extrabold, color: c.primary, fontSize: 13 }}>Iniciá sesión</Text>
        </Pressable>
      </Row>
    </AuthShell>
  );
}