import type { StyleProp, ViewStyle } from 'react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { LogoMark } from './Logo';
import { Icon, IconButton } from './ui';
import { font, MAX_WIDTH, radius, shadow, space } from '../theme/tokens';

export interface HeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: boolean;
  right?: React.ReactNode;
}
export interface ScreenProps {
  children?: React.ReactNode;
  header?: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
}
export interface HeaderActionProps {
  icon?: any;
  onPress?: () => void;
  label?: React.ReactNode;
  badge?: number;
}

/**
 * Encabezado principal (según el boceto): menú hamburguesa a la izquierda, título de la
 * sección y el logo de MOVA a la derecha. Es igual en los tres perfiles.
 */
export function Header({ title, subtitle, back, right }: HeaderProps) {
  const { colors: c } = useTheme();
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pad = width >= 900 ? space.xxl : space.lg;
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.sm, backgroundColor: c.mode === 'dark' ? 'rgba(13,12,23,0.72)' : 'rgba(246,245,251,0.78)', borderBottomColor: c.border }]}>
      <View style={[styles.headerInner, { paddingHorizontal: pad }]}>
        {back ? (
          <IconButton icon="arrow-left" label="Volver" onPress={() => nav.goBack()} />
        ) : (
          <IconButton icon="menu" label="Abrir menú" onPress={() => nav.dispatch(DrawerActions.openDrawer())} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: font.extrabold, fontSize: 21, color: c.text, letterSpacing: -0.3 }}>
            {title}
          </Text>
          {!!subtitle && (
            <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 12.5, color: c.textMuted }}>
              {subtitle}
            </Text>
          )}
        </View>
        {right}
        <QuickMenu />
      </View>
    </View>
  );
}

interface MenuItem {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

/**
 * Logo de MOVA (arriba a la derecha): al tocarlo abre un menú rápido con
 * Inicio, Mi perfil, Avisos, Manual, modo claro/oscuro y Cerrar sesión. Igual en los 3 roles.
 */
function QuickMenu() {
  const { colors: c, isDark, toggle } = useTheme();
  const { user, logout } = useAuth();
  const { confirm } = useFeedback();
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  // Navega dentro de la app aunque la pantalla actual esté apilada (detalle, formulario, etc.)
  const go = (screen: string, params?: any) => {
    setOpen(false);
    nav.navigate('App', { screen, params });
  };

  const items: MenuItem[] = user
    ? [
        { icon: 'home-variant-outline', label: 'Inicio', onPress: () => go('Main', { screen: 'Inicio' }) },
        { icon: 'account-circle-outline', label: 'Mi perfil', onPress: () => go('Perfil') },
        { icon: 'bell-outline', label: 'Avisos', onPress: () => go('Notificaciones') },
        { icon: 'book-open-variant', label: 'Manual de usuario', onPress: () => go('Manual') },
        { icon: isDark ? 'white-balance-sunny' : 'weather-night', label: isDark ? 'Modo claro' : 'Modo oscuro', onPress: () => toggle() },
        {
          icon: 'logout',
          label: 'Cerrar sesión',
          danger: true,
          onPress: async () => {
            setOpen(false);
            const yes = await confirm({ title: '¿Cerrar sesión?', message: 'Vas a tener que volver a ingresar.', confirmText: 'Cerrar sesión', icon: 'logout' });
            if (yes) logout();
          },
        },
      ]
    : [{ icon: isDark ? 'white-balance-sunny' : 'weather-night', label: isDark ? 'Modo claro' : 'Modo oscuro', onPress: () => toggle() }];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Menú rápido de MOVA"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.logoBox, { backgroundColor: c.surfaceAlt, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
      >
        <LogoMark size={34} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.menuBackdrop, { backgroundColor: c.overlay || 'rgba(0,0,0,0.35)' }]} onPress={() => setOpen(false)}>
          <Pressable
            onPress={() => {}}
            style={[styles.menu, shadow(c, 3), { top: insets.top + 64, backgroundColor: c.surface, borderColor: c.border }]}
          >
            <LinearGradient colors={[c.heroFrom, c.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.menuHead}>
              <View style={styles.menuLogo}>
                <LogoMark size={38} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: '#fff', fontFamily: font.extrabold, fontSize: 16 }} numberOfLines={1}>
                  {user ? `${user.nombre} ${user.apellido}` : 'MOVA'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: font.semibold, fontSize: 12 }} numberOfLines={1}>
                  {user ? user.rol : 'Entrena. Progresa. Evoluciona.'}
                </Text>
              </View>
            </LinearGradient>
            {items.map((it) => (
              <Pressable
                key={it.label}
                accessibilityRole="button"
                onPress={it.onPress}
                style={({ pressed, hovered }: any) => [styles.menuItem, (pressed || hovered) && { backgroundColor: c.surfaceAlt }]}
              >
                <Icon name={it.icon as any} size={20} color={it.danger ? c.danger : c.primary} />
                <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 14.5, color: it.danger ? c.danger : c.text }}>{it.label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/** Fondo con la identidad de MOVA: brillo violeta arriba y círculos suaves (coral y dorado). */
function BrandBackground() {
  const { colors: c } = useTheme();
  const dark = c.mode === 'dark';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={dark ? ['rgba(139,124,255,0.20)', 'rgba(139,124,255,0)'] : ['rgba(91,75,255,0.13)', 'rgba(91,75,255,0)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 340 }}
      />
      <View style={[styles.blob, { width: 380, height: 380, top: -150, right: -120, backgroundColor: dark ? 'rgba(139,124,255,0.12)' : 'rgba(91,75,255,0.08)' }]} />
      <View style={[styles.blob, { width: 260, height: 260, top: 160, left: -140, backgroundColor: dark ? 'rgba(247,115,123,0.08)' : 'rgba(247,115,123,0.07)' }]} />
      <View style={[styles.blob, { width: 300, height: 300, bottom: -140, right: -90, backgroundColor: dark ? 'rgba(255,192,70,0.06)' : 'rgba(255,192,70,0.09)' }]} />
    </View>
  );
}

/** Contenedor de pantalla: scroll, pull-to-refresh, ancho máximo responsive y teclado. */
export function Screen({ children, header, refreshing, onRefresh, scroll = true, footer, contentStyle, padded = true }: ScreenProps) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // En el celular margen chico; en computadora/tablet un margen mayor, pero usando todo el ancho
  const pad = width >= 900 ? space.xxl : space.lg;
  const inner = (
    <View style={[styles.content, padded && { paddingHorizontal: pad }, contentStyle]}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BrandBackground />
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={{ paddingBottom: (footer ? 100 : 32) + insets.bottom, paddingTop: space.md }}
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} /> : undefined}
          >
            {inner}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingTop: space.md }}>{inner}</View>
        )}
        {footer && (
          <View style={[styles.footer, { backgroundColor: c.bg, borderTopColor: c.border, paddingBottom: insets.bottom + space.md, paddingHorizontal: pad }]}>
            <View style={styles.content}>{footer}</View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

export function HeaderAction({ icon, onPress, label, badge }: HeaderActionProps) {
  return <IconButton icon={icon} onPress={onPress} label={label} badge={badge} />;
}

export { Icon };

const styles = StyleSheet.create({
  header: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: space.md },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  logoBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', flexGrow: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, paddingHorizontal: space.lg },
  blob: { position: 'absolute', borderRadius: 999 },
  menuBackdrop: { flex: 1 },
  menu: { position: 'absolute', right: space.lg, width: 280, maxWidth: '92%', borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', paddingBottom: space.sm },
  menuHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, marginBottom: space.sm },
  menuLogo: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 12 },
});