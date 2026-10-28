import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { Banner, Button, Icon, T } from '../../components/ui';
import AuthShell from './AuthShell';
import { font, radius, space } from '../../theme/tokens';

/** Verificación por código de 6 dígitos: email (registro) y doble factor (login). */
export default function VerifyScreen({ route, navigation }) {
  const { step, email } = route.params;
  const [pendingToken, setPendingToken] = useState(route.params.pendingToken);
  const [devCode, setDevCode] = useState(route.params.devCode);
  const { verify, resend } = useAuth();
  const { colors: c } = useTheme();
  const { toast } = useFeedback();
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(45);
  const input = useRef(null);
  const isTwoFactor = step === 'two_factor';

  useEffect(() => {
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const submit = async (value = code) => {
    if (!/^\d{6}$/.test(value)) return setError({ message: 'Ingresá los 6 números del código' });
    setBusy(true);
    setError(null);
    try {
      const res = await verify(step, pendingToken, value);
      if (res?.step) navigation.replace('Verify', res);
      else toast(isTwoFactor ? '¡Identidad verificada!' : '¡Email verificado! Bienvenido/a a MOVA');
    } catch (err) {
      if (err.code === 'ACCOUNT_BLOCKED') return navigation.navigate('Blocked');
      setError(err);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const doResend = async () => {
    try {
      const r = await resend(step, pendingToken);
      if (r.devCode) setDevCode(r.devCode);
      setCooldown(45);
      toast('Te enviamos un código nuevo', 'info');
    } catch (err) {
      if (err.code === 'PENDING_EXPIRED') navigation.popToTop();
      setError(err);
    }
  };

  return (
    <AuthShell
      title={isTwoFactor ? 'Verificación en 2 pasos' : 'Verificá tu email'}
      subtitle={`Ingresá el código de 6 dígitos que enviamos a ${email}.`}
      icon={
        <View style={[styles.icon, { backgroundColor: c.primarySoft }]}>
          <Icon name={isTwoFactor ? 'shield-key' : 'email-check'} size={30} color={c.primary} />
        </View>
      }
    >
      {error && <Banner title="Código no válido" message={error.message} />}
      {!!devCode && (
        <Banner kind="info" title="Modo desarrollo" message={`El servidor no tiene email configurado. Tu código es ${devCode}`} action="Usar" onAction={() => { setCode(devCode); submit(devCode); }} />
      )}
      <Pressable onPress={() => input.current?.focus()} style={styles.boxes} accessibilityLabel="Código de verificación">
        {Array.from({ length: 6 }).map((_, i) => {
          const filled = code[i];
          const active = i === code.length;
          return (
            <View key={i} style={[styles.box, { borderColor: error ? c.danger : active ? c.primary : c.border, backgroundColor: c.surfaceAlt }]}>
              <Text style={{ fontFamily: font.extrabold, fontSize: 24, color: c.text }}>{filled || ''}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={input}
        value={code}
        onChangeText={(v) => {
          const clean = v.replace(/\D/g, '').slice(0, 6);
          setCode(clean);
          setError(null);
          if (clean.length === 6) submit(clean);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        style={styles.hidden}
      />
      <Button title="Verificar" icon="check" onPress={() => submit()} loading={busy} />
      <Pressable onPress={cooldown ? undefined : doResend} style={{ alignSelf: 'center', marginTop: space.lg }} hitSlop={8}>
        <T v="small" color={cooldown ? c.textSoft : c.primary} style={{ fontFamily: font.bold }}>
          {cooldown ? `Reenviar código en ${cooldown} s` : 'Reenviar código'}
        </T>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  icon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  boxes: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginBottom: space.xl },
  box: { flex: 1, aspectRatio: 0.85, maxWidth: 56, borderWidth: 2, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});
