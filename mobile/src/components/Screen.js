import React from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { LogoMark } from './Logo';
import { Icon, IconButton } from './ui';
import { font, MAX_WIDTH, space } from '../theme/tokens';

/**
 * Encabezado principal (según el boceto): menú hamburguesa a la izquierda, título de la
 * sección y el logo de MOVA a la derecha. Es igual en los tres perfiles.
 */
export function Header({ title, subtitle, back, right }) {
  const { colors: c } = useTheme();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.sm, backgroundColor: c.bg, borderBottomColor: c.border }]}>
      <View style={styles.headerInner}>
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
        <Pressable
          accessibilityLabel="MOVA - inicio"
          onPress={() => (back ? nav.popToTop?.() : null)}
          style={[styles.logoBox, { backgroundColor: c.surfaceAlt }]}
        >
          <LogoMark size={34} />
        </Pressable>
      </View>
    </View>
  );
}

/** Contenedor de pantalla: scroll, pull-to-refresh, ancho máximo responsive y teclado. */
export function Screen({ children, header, refreshing, onRefresh, scroll = true, footer, contentStyle, padded = true }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const inner = (
    <View style={[styles.content, padded && { paddingHorizontal: space.lg }, contentStyle]}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
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
          <View style={[styles.footer, { backgroundColor: c.bg, borderTopColor: c.border, paddingBottom: insets.bottom + space.md }]}>
            <View style={styles.content}>{footer}</View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

export function HeaderAction({ icon, onPress, label, badge }) {
  return <IconButton icon={icon} onPress={onPress} label={label} badge={badge} />;
}

export { Icon };

const styles = StyleSheet.create({
  header: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: space.md },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  logoBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', flexGrow: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, paddingHorizontal: space.lg },
});
