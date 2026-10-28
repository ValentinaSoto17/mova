import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { LogoMark } from '../../components/Logo';
import { Banner, Button, IconButton, Input, Row, T } from '../../components/ui';
import SocialButtons from '../../auth/SocialButtons';
import { font, radius, space, shadow } from '../../theme/tokens';

export default function LoginScreen({ navigation }) {
  const { login, social } = useAuth();
  const { colors: c, toggle, isDark } = useTheme();
  const { toast } = useFeedback();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState(null);
  const passRef = useRef(null);

  const next = (res) => {
    if (res?.step) navigation.navigate('Verify', res);
  };

  const handleError = (err) => {
    if (err.code === 'ACCOUNT_BLOCKED') return navigation.navigate('Blocked');
    setErrors(err.fields || {});
    setServerError(err);
  };

  const submit = async () => {
    const e = {};
    if (!email.trim()) e.email = 'Ingresá tu email';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'El email no es válido';
    if (!password) e.password = 'Ingresá tu contraseña';
    setErrors(e);
    setServerError(null);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      next(await login(email.trim().toLowerCase(), password));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const onSocial = async (payload) => {
    setSocialBusy(payload.provider);
    setServerError(null);
    try {
      const res = await social(payload);
      next(res);
      if (res?.done) toast('¡Bienvenido/a a MOVA!');
    } catch (err) {
      handleError(err);
    } finally {
      setSocialBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + space.xxl }} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={[c.heroFrom, c.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + space.lg }]}>
            <View style={[styles.glow, { top: -60, right: -40 }]} />
            <View style={[styles.glow, { bottom: -80, left: -60, width: 200, height: 200 }]} />
            <View style={styles.heroTop}>
              <IconButton icon={isDark ? 'white-balance-sunny' : 'weather-night'} onPress={toggle} bg="rgba(255,255,255,0.18)" color="#fff" label="Cambiar tema" />
            </View>
            <View style={styles.logoTile}>
              <LogoMark size={92} />
            </View>
            <Text style={styles.brand}>MOVA</Text>
            <Text style={styles.tagline}>Entrena. Progresa. Evoluciona.</Text>
          </LinearGradient>

          <View style={styles.sheetWrap}>
            <View style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.border }, shadow(c, 2)]}>
              <T v="h1">Iniciá sesión</T>
              <T v="small" color={c.textMuted} style={{ marginBottom: space.lg }}>
                Ingresá con tu cuenta y te llevamos a tu perfil.
              </T>

              {serverError && (
                <Banner
                  kind={serverError.code === 'NETWORK' || serverError.code === 'TIMEOUT' ? 'warning' : 'danger'}
                  title={serverError.code === 'INVALID_CREDENTIALS' ? 'No pudimos ingresar' : serverError.code === 'NETWORK' || serverError.code === 'TIMEOUT' ? 'El servidor no responde' : serverError.code === 'DB_UNAVAILABLE' ? 'La base de datos no responde' : 'Algo salió mal'}
                  message={`${serverError.message}${serverError.status ? ` (código ${serverError.status})` : ''}`}
                />
              )}

              <Input
                label="Email"
                icon="email-outline"
                placeholder="tu@email.com"
                value={email}
                onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: null })); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passRef.current?.focus()}
                error={errors.email}
              />
              <Input
                ref={passRef}
                label="Contraseña"
                icon="lock-outline"
                placeholder="••••••••"
                value={password}
                onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: null })); }}
                secure
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={submit}
                error={errors.password}
              />
              <Pressable onPress={() => navigation.navigate('Forgot')} style={{ alignSelf: 'flex-end', marginBottom: space.lg }} hitSlop={8}>
                <Text style={{ fontFamily: font.bold, color: c.primary, fontSize: 13 }}>¿Olvidaste tu contraseña?</Text>
              </Pressable>
              <Button title="Ingresar" icon="login" onPress={submit} loading={busy} />

              <Row style={{ marginVertical: space.lg }}>
                <View style={[styles.line, { backgroundColor: c.border }]} />
                <T v="small" color={c.textSoft}>o continuá con</T>
                <View style={[styles.line, { backgroundColor: c.border }]} />
              </Row>
              <SocialButtons onToken={onSocial} busy={socialBusy} />

              <Row style={{ justifyContent: 'center', marginTop: space.xl }} gap={6}>
                <T v="small" color={c.textMuted}>¿No tenés cuenta?</T>
                <Pressable onPress={() => navigation.navigate('Register')} hitSlop={8}>
                  <Text style={{ fontFamily: font.extrabold, color: c.primary, fontSize: 13 }}>Registrate</Text>
                </Pressable>
              </Row>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: 70, overflow: 'hidden' },
  heroTop: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space.lg },
  glow: { position: 'absolute', width: 240, height: 240, borderRadius: 200, backgroundColor: 'rgba(255,255,255,0.10)' },
  logoTile: { width: 124, height: 124, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  brand: { color: '#fff', fontFamily: font.extrabold, fontSize: 38, letterSpacing: 6, marginTop: space.md },
  tagline: { color: 'rgba(255,255,255,0.85)', fontFamily: font.semibold, fontSize: 14 },
  sheetWrap: { paddingHorizontal: space.lg, marginTop: -44, width: '100%', maxWidth: 520, alignSelf: 'center' },
  sheet: { borderRadius: radius.xl, padding: space.xl, borderWidth: 1 },
  line: { flex: 1, height: 1 },
});