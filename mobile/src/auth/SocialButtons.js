/**
 * Inicio de sesión con redes sociales: Google (obligatorio), GitHub y Discord.
 * La app obtiene el token del proveedor y el BACKEND lo valida antes de crear la sesión.
 * Cada proveedor se activa cuando su ID de cliente está configurado (ver README).
 */
import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { FontAwesome, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Banner, Button, Icon, T } from '../components/ui';
import { font, radius, space } from '../theme/tokens';

WebBrowser.maybeCompleteAuthSession();

const CFG = {
  googleWeb: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  googleAndroid: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  googleIos: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  github: process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID,
  discord: process.env.EXPO_PUBLIC_DISCORD_CLIENT_ID,
};
// Si un proveedor no tiene credenciales, se ofrece el modo demostración (desactivable con EXPO_PUBLIC_SOCIAL_DEMO=false)
const DEMO = process.env.EXPO_PUBLIC_SOCIAL_DEMO !== 'false';
const NOMBRES = { google: 'Google', github: 'GitHub', discord: 'Discord' };
const COLORES = { google: '#EA4335', github: '#6E5494', discord: '#5865F2' };
const ICONOS = { google: 'google', github: 'github', discord: 'discord' };
const googleReady = Platform.select({ android: !!CFG.googleAndroid, ios: !!CFG.googleIos, default: !!CFG.googleWeb });

const notReady = (name) => `El inicio con ${name} todavía no está activado: falta cargar su ID de cliente en mobile/.env (ver CONFIGURAR_REDES.md).`;

/** Abre la ventana del proveedor; si el navegador la bloquea o falla, lo informa en el formulario. */
async function openProvider(promptAsync, request, name, onError) {
  if (!request) return onError(`Preparando ${name}… esperá un segundo y volvé a tocar el botón.`, 'info');
  try {
    const res = await promptAsync();
    if (res?.type === 'error') {
      onError(`${name} devolvió un error: ${res.params?.error_description || res.error?.message || res.params?.error || 'desconocido'}`, 'danger');
    } else if (res?.type === 'dismiss' || res?.type === 'cancel') {
      onError(`Se cerró la ventana de ${name} antes de terminar. Si no la viste abrirse, permití las ventanas emergentes para localhost (ícono 🚫 en la barra de direcciones).`, 'warning');
    }
  } catch (e) {
    onError(`No se pudo abrir ${name}: ${e?.message || e}. Recargá la página (Ctrl+F5) y permití las ventanas emergentes para localhost.`, 'danger');
  }
}

function SocialBtn({ label, icon, iconSet = 'fa', color, onPress, loading, wide }) {
  const { colors: c } = useTheme();
  const I = iconSet === 'fa5' ? FontAwesome5 : iconSet === 'fa' ? FontAwesome : MaterialCommunityIcons;
  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={`Continuar con ${label}`}
      style={({ pressed }) => [
        styles.btn,
        wide ? styles.wide : styles.square,
        { backgroundColor: c.surface, borderColor: c.border, opacity: pressed || loading ? 0.7 : 1 },
      ]}
    >
      <I name={icon} size={wide ? 20 : 22} color={color} />
      <Text style={[styles.text, !wide && styles.textSmall, { color: c.text }]} numberOfLines={1}>
        {wide ? `Continuar con ${label}` : label}
      </Text>
    </Pressable>
  );
}

function GoogleButton({ onToken, busy, onError }) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: CFG.googleWeb,
    androidClientId: CFG.googleAndroid,
    iosClientId: CFG.googleIos,
    scopes: ['openid', 'profile', 'email'],
  });
  useEffect(() => {
    if (response?.type === 'success') {
      onToken({
        provider: 'google',
        idToken: response.params?.id_token || response.authentication?.idToken,
        accessToken: response.authentication?.accessToken,
      });
    } else if (response?.type === 'error') onError('Google', response);
  }, [response]);
  return <SocialBtn wide label="Google" icon="google" color="#EA4335" loading={busy === 'google'} onPress={() => openProvider(promptAsync, request, 'Google', onError)} />;
}

// GitHub y Discord exigen que la dirección de regreso coincida EXACTAMENTE con la registrada.
// En la web se usa la dirección principal de la página, sin barra final (ej.: https://mova-mobile.vercel.app).
function webOrNativeRedirect() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return AuthSession.makeRedirectUri({ scheme: 'mova', path: 'oauth' });
}

const githubDiscovery = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
};
function GitHubButton({ onToken, busy, onError }) {
  const redirectUri = webOrNativeRedirect();
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    { clientId: CFG.github, scopes: ['read:user', 'user:email'], redirectUri, usePKCE: true },
    githubDiscovery
  );
  const { colors: c } = useTheme();
  useEffect(() => {
    if (response?.type === 'success') {
      onToken({ provider: 'github', code: response.params.code, codeVerifier: request?.codeVerifier, redirectUri });
    } else if (response?.type === 'error') onError('GitHub', response);
  }, [response]);
  return <SocialBtn label="GitHub" icon="github" color={c.text} loading={busy === 'github'} onPress={() => openProvider(promptAsync, request, 'GitHub', onError)} />;
}

const discordDiscovery = {
  authorizationEndpoint: 'https://discord.com/oauth2/authorize',
  tokenEndpoint: 'https://discord.com/api/oauth2/token',
};
function DiscordButton({ onToken, busy, onError }) {
  const redirectUri = webOrNativeRedirect();
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    { clientId: CFG.discord, scopes: ['identify', 'email'], redirectUri, usePKCE: false },
    discordDiscovery
  );
  useEffect(() => {
    if (response?.type === 'success') {
      onToken({ provider: 'discord', code: response.params.code, redirectUri });
    } else if (response?.type === 'error') onError('Discord', response);
  }, [response]);
  return <SocialBtn label="Discord" icon="discord" iconSet="fa5" color="#5865F2" loading={busy === 'discord'} onPress={() => openProvider(promptAsync, request, 'Discord', onError)} />;
}

export default function SocialButtons({ onToken, busy }) {
  const { colors: c } = useTheme();
  // Requisito: sin alerts ni ventanas flotantes → el aviso se muestra dentro del formulario
  const [msg, setMsg] = useState(null);
  const toast = (message, kind = 'info') => setMsg({ message, kind: kind === 'error' ? 'danger' : kind });
  const [demo, setDemo] = useState(null); // proveedor en modo demostración

  const notConfigured = (provider) => {
    if (DEMO) return setDemo(provider);
    toast(notReady(NOMBRES[provider]), 'info');
  };
  const onError = (name, response) => {
    // openProvider() manda (mensaje, tipo); los useEffect mandan (proveedor, respuesta)
    if (typeof response === 'string') return toast(name, response);
    const detail = response?.error?.message || response?.params?.error_description || response?.params?.error || 'error desconocido';
    toast(`${name} no completó el inicio de sesión: ${detail}`, 'error');
  };
  const pickDemo = (demoAccount) => {
    const provider = demo;
    setDemo(null);
    setMsg(null);
    onToken({ provider, demo: true, demoAccount });
  };

  return (
    <View style={{ gap: space.sm }}>
      {msg && <Banner kind={msg.kind} message={msg.message} action="Entendido" onAction={() => setMsg(null)} />}
      {googleReady ? (
        <GoogleButton onToken={onToken} busy={busy} onError={onError} />
      ) : (
        <SocialBtn wide label="Google" icon="google" color="#EA4335" loading={busy === 'google'} onPress={() => notConfigured('google')} />
      )}
      <View style={styles.row}>
        {CFG.github ? (
          <GitHubButton onToken={onToken} busy={busy} onError={onError} />
        ) : (
          <SocialBtn label="GitHub" icon="github" color={c.text} loading={busy === 'github'} onPress={() => notConfigured('github')} />
        )}
        {CFG.discord ? (
          <DiscordButton onToken={onToken} busy={busy} onError={onError} />
        ) : (
          <SocialBtn label="Discord" icon="discord" iconSet="fa5" color="#5865F2" loading={busy === 'discord'} onPress={() => notConfigured('discord')} />
        )}
      </View>

      {/* Modo demostración: ventana propia de MOVA (no imita la del proveedor y no pide contraseñas) */}
      <Modal visible={!!demo} transparent animationType="fade" onRequestClose={() => setDemo(null)}>
        <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={() => setDemo(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
            {demo && (
              <>
                <View style={[styles.demoIcon, { backgroundColor: COLORES[demo] + '1F' }]}>
                  {demo === 'discord' ? (
                    <FontAwesome5 name="discord" size={28} color={COLORES[demo]} />
                  ) : (
                    <FontAwesome name={ICONOS[demo]} size={28} color={COLORES[demo]} />
                  )}
                </View>
                <T v="h2" style={{ textAlign: 'center' }}>Ingresar con {NOMBRES[demo]}</T>
                <View style={[styles.demoTag, { backgroundColor: c.warningSoft }]}>
                  <Icon name="flask-outline" size={14} color={c.warning} />
                  <Text style={{ color: c.warning, fontFamily: font.bold, fontSize: 12 }}>MODO DEMOSTRACIÓN</Text>
                </View>
                <T v="small" color={c.textMuted} style={{ textAlign: 'center', marginBottom: space.lg }}>
                  {NOMBRES[demo]} todavía no tiene credenciales cargadas, así que se simula su respuesta. El resto del proceso es real: se vincula la cuenta social en la base de datos y se inicia sesión con JWT.
                </T>
                <Pressable onPress={() => pickDemo('existente')} style={[styles.demoOpt, { borderColor: c.border }]}>
                  <Icon name="account-check" size={24} color={c.primary} />
                  <View style={{ flex: 1 }}>
                    <T v="h3" style={{ fontSize: 15 }}>Vincular a una cuenta existente</T>
                    <T v="small" color={c.textMuted}>Sofía Gómez · alumno@mova.app</T>
                  </View>
                </Pressable>
                <Pressable onPress={() => pickDemo('nuevo')} style={[styles.demoOpt, { borderColor: c.border }]}>
                  <Icon name="account-plus" size={24} color={c.success} />
                  <View style={{ flex: 1 }}>
                    <T v="h3" style={{ fontSize: 15 }}>Crear una cuenta nueva</T>
                    <T v="small" color={c.textMuted}>demo.{demo}@mova.app · se registra como Alumno</T>
                  </View>
                </Pressable>
                <Button title="Cancelar" variant="ghost" onPress={() => setDemo(null)} style={{ marginTop: space.sm }} />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  sheet: { width: '100%', maxWidth: 420, borderRadius: radius.xl, padding: space.xl, alignItems: 'stretch' },
  demoIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: space.md },
  demoTag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginVertical: space.sm },
  demoOpt: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderWidth: 1.5, borderRadius: radius.md, marginBottom: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.md, minHeight: 50 },
  wide: { paddingHorizontal: space.lg },
  square: { flex: 1, minWidth: 0, paddingHorizontal: space.sm },
  text: { fontFamily: font.bold, fontSize: 14 },
  textSmall: { fontSize: 14 },
});