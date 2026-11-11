import type { StyleProp, ViewStyle } from 'react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { LogoMark } from './Logo';
import { Icon, IconButton } from './ui';
import { font, MAX_WIDTH, space } from '../theme/tokens';

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
 * Encabezado principal: logo de MOVA a la izquierda (abre el menú) y el título de la sección.
 * En pantallas internas aparece la flecha para volver. Es igual en los tres perfiles.
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
        {back && <IconButton icon="arrow-left" label="Volver" onPress={() => nav.goBack()} />}
        <LogoMenuButton inSubpage={!!back} />
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
      </View>
    </View>
  );
}

/**
 * Logo de MOVA (arriba a la izquierda, igual en los 3 perfiles).
 * - En las secciones principales abre el menú desplegable de MOVA (se despliega desde la izquierda).
 * - En las pantallas internas (detalle, formulario, chat) lleva de vuelta al Inicio.
 */
function LogoMenuButton({ inSubpage }: { inSubpage: boolean }) {
  const { colors: c } = useTheme();
  const nav = useNavigation<any>();
  const onPress = () => {
    if (inSubpage) nav.navigate('App', { screen: 'Main', params: { screen: 'Inicio' } });
    else nav.dispatch(DrawerActions.openDrawer());
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={inSubpage ? 'Ir al inicio' : 'Abrir el menú de MOVA'}
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        styles.logoBox,
        { backgroundColor: hovered ? c.primarySoft : c.surfaceAlt, transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <LogoMark size={34} />
    </Pressable>
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
});