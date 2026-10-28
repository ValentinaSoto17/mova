import React, { useState, forwardRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { font, radius, space, type, shadow } from '../theme/tokens';

export const Icon = MaterialCommunityIcons;

export function T({ v = 'body', color, style, children, ...p }) {
  const { colors: c } = useTheme();
  return (
    <Text style={[type[v], { color: color || c.text }, style]} {...p}>
      {children}
    </Text>
  );
}

export function Card({ children, style, onPress, padded = true, ...p }) {
  const { colors: c } = useTheme();
  const base = [styles.card, { backgroundColor: c.surface, borderColor: c.border }, shadow(c, 1), padded && { padding: space.lg }, style];
  if (!onPress) return <View style={base} {...p}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]} accessibilityRole="button" {...p}>
      {children}
    </Pressable>
  );
}

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, small, style, full = true }) {
  const { colors: c } = useTheme();
  const v = {
    primary: { bg: c.primary, fg: c.primaryText, border: c.primary },
    secondary: { bg: c.primarySoft, fg: c.mode === 'dark' ? c.primaryDeep : c.primary, border: c.primarySoft },
    outline: { bg: 'transparent', fg: c.text, border: c.border },
    danger: { bg: c.danger, fg: '#fff', border: c.danger },
    ghost: { bg: 'transparent', fg: c.primary, border: 'transparent' },
    success: { bg: c.success, fg: '#fff', border: c.success },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: off }}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: v.bg, borderColor: v.border, alignSelf: full ? 'stretch' : 'flex-start', opacity: off ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={small ? 16 : 20} color={v.fg} />}
          <Text style={[styles.btnText, small && { fontSize: 13 }, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, color, bg, size = 22, label, style, badge }) {
  const { colors: c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.iconBtn, { backgroundColor: bg || c.surfaceAlt, opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Icon name={icon} size={size} color={color || c.text} />
      {!!badge && (
        <View style={[styles.badgeDot, { backgroundColor: c.coral, borderColor: c.bg }]}>
          <Text style={styles.badgeDotText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Input con etiqueta, ícono y mensaje de error debajo (validación integrada, sin alerts). */
export const Input = forwardRef(function Input({ label, error, icon, secure, hint, style, multiline, ...p }, ref) {
  const { colors: c } = useTheme();
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  const borderColor = error ? c.danger : focus ? c.primary : c.border;
  return (
    <View style={[{ marginBottom: space.md }, style]}>
      {!!label && <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>}
      <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor }, multiline && { alignItems: 'flex-start', paddingVertical: space.sm }]}>
        {icon && <Icon name={icon} size={20} color={error ? c.danger : focus ? c.primary : c.textSoft} style={multiline && { marginTop: 4 }} />}
        <TextInput
          ref={ref}
          placeholderTextColor={c.textSoft}
          secureTextEntry={secure && !show}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          multiline={multiline}
          style={[styles.input, { color: c.text }, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
          accessibilityLabel={label}
          {...p}
        />
        {secure && (
          <Pressable onPress={() => setShow(!show)} hitSlop={10} accessibilityLabel={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            <Icon name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.textSoft} />
          </Pressable>
        )}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Icon name="alert-circle" size={14} color={c.danger} />
          <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[styles.errorText, { color: c.textSoft, marginTop: 4 }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

/** Banner de mensaje dentro de la pantalla (errores de servidor, avisos). */
export function Banner({ kind = 'danger', title, message, action, onAction, icon }) {
  const { colors: c } = useTheme();
  const map = { danger: 'alert-circle', warning: 'alert', info: 'information', success: 'check-circle' };
  return (
    <View style={[styles.banner, { backgroundColor: c[`${kind}Soft`], borderColor: c[kind] + '33' }]} accessibilityRole="alert">
      <Icon name={icon || map[kind]} size={20} color={c[kind]} />
      <View style={{ flex: 1 }}>
        {!!title && <Text style={[type.h3, { color: c.text, fontSize: 14 }]}>{title}</Text>}
        {!!message && <Text style={[type.small, { color: c.text, opacity: 0.85 }]}>{message}</Text>}
      </View>
      {!!action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ fontFamily: font.bold, color: c[kind], fontSize: 13 }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Chip({ label, active, onPress, icon, color }) {
  const { colors: c } = useTheme();
  const tint = color || c.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: active ? tint : c.surface, borderColor: active ? tint : c.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {icon && <Icon name={icon} size={16} color={active ? '#fff' : c.textMuted} />}
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: active ? '#fff' : c.text }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, kind = 'primary', icon }) {
  const { colors: c } = useTheme();
  const fg = kind === 'muted' ? c.textMuted : c[kind];
  const bg = kind === 'muted' ? c.surfaceAlt : c[`${kind}Soft`];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon && <Icon name={icon} size={12} color={fg} />}
      <Text style={{ fontFamily: font.bold, fontSize: 11, color: fg }}>{label}</Text>
    </View>
  );
}

export function Avatar({ name = '', url, size = 44, color }) {
  const { colors: c } = useTheme();
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <LinearGradient
      colors={color ? [color, color] : [c.heroFrom, c.heroTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: '#fff', fontFamily: font.bold, fontSize: size * 0.38 }}>{initials || '?'}</Text>
    </LinearGradient>
  );
}

export function SectionTitle({ title, action, onAction, style }) {
  const { colors: c } = useTheme();
  return (
    <View style={[styles.sectionTitle, style]}>
      <Text style={[type.h2, { color: c.text }]}>{title}</Text>
      {!!action && (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={{ fontFamily: font.bold, fontSize: 13, color: c.primary }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function StatTile({ icon, label, value, unit, color, style }) {
  const { colors: c } = useTheme();
  const tint = color || c.primary;
  return (
    <Card style={[{ flex: 1, minWidth: 140, gap: space.sm }, style]}>
      <View style={[styles.statIcon, { backgroundColor: tint + '1F' }]}>
        <Icon name={icon} size={20} color={tint} />
      </View>
      <Text style={[type.caption, { color: c.textMuted }]}>{label}</Text>
      <Text style={[type.number, { color: c.text }]}>
        {value ?? '—'}
        {!!unit && <Text style={{ fontSize: 14, fontFamily: font.semibold, color: c.textMuted }}> {unit}</Text>}
      </Text>
    </Card>
  );
}

export function Empty({ icon = 'emoticon-happy-outline', title, message, action, onAction }) {
  const { colors: c } = useTheme();
  return (
    <View style={styles.center}>
      <View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }]}>
        <Icon name={icon} size={34} color={c.primary} />
      </View>
      <Text style={[type.h3, { color: c.text, textAlign: 'center' }]}>{title}</Text>
      {!!message && <Text style={[type.small, { color: c.textMuted, textAlign: 'center', marginTop: 4, maxWidth: 300 }]}>{message}</Text>}
      {!!action && <Button title={action} onPress={onAction} small full={false} style={{ marginTop: space.lg, alignSelf: 'center' }} />}
    </View>
  );
}

/** Estado de error de carga con botón de reintento. */
export function ErrorState({ error, onRetry }) {
  const { colors: c } = useTheme();
  const offline = error?.code === 'NETWORK' || error?.code === 'TIMEOUT';
  return (
    <View style={styles.center}>
      <View style={[styles.emptyIcon, { backgroundColor: c.dangerSoft }]}>
        <Icon name={offline ? 'wifi-off' : 'alert-octagon-outline'} size={34} color={c.danger} />
      </View>
      <Text style={[type.h3, { color: c.text, textAlign: 'center' }]}>{offline ? 'Sin conexión' : 'No pudimos cargar los datos'}</Text>
      <Text style={[type.small, { color: c.textMuted, textAlign: 'center', marginTop: 4, maxWidth: 300 }]}>
        {error?.message}
        {error?.status ? ` (código ${error.status})` : ''}
      </Text>
      {onRetry && <Button title="Reintentar" icon="refresh" onPress={onRetry} small full={false} variant="secondary" style={{ marginTop: space.lg, alignSelf: 'center' }} />}
    </View>
  );
}

export function Loading({ label = 'Cargando…' }) {
  const { colors: c } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={c.primary} size="large" />
      <Text style={[type.small, { color: c.textMuted, marginTop: space.md }]}>{label}</Text>
    </View>
  );
}

export function Row({ children, style, gap = space.md }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider() {
  const { colors: c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.border, marginVertical: space.md }} />;
}

/** Control segmentado (pestañas internas). */
export function Segmented({ options, value, onChange }) {
  const { colors: c } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: c.surfaceAlt }]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && [{ backgroundColor: c.surface }, shadow(c, 1)]]}
          >
            <Text numberOfLines={1} style={{ fontFamily: font.bold, fontSize: 13, color: active ? c.text : c.textMuted }}>
              {o.label}
              {o.count != null ? ` · ${o.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ListItem({ title, subtitle, left, right, onPress, style }) {
  const { colors: c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.listItem, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 }, style]}
    >
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[type.h3, { color: c.text, fontSize: 15 }]}>{title}</Text>
        {!!subtitle && <Text numberOfLines={2} style={[type.small, { color: c.textMuted }]}>{subtitle}</Text>}
      </View>
      {right ?? (onPress ? <Icon name="chevron-right" size={22} color={c.textSoft} /> : null)}
    </Pressable>
  );
}

export function Pill({ icon, text, color }) {
  const { colors: c } = useTheme();
  return (
    <View style={styles.pill}>
      <Icon name={icon} size={15} color={color || c.textMuted} />
      <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: c.textMuted }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1 },
  btn: { minHeight: 50, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.xl, borderWidth: 1 },
  btnSmall: { minHeight: 38, paddingHorizontal: space.lg, borderRadius: radius.sm },
  btnText: { fontFamily: font.bold, fontSize: 15 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  badgeDot: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2 },
  badgeDotText: { color: '#fff', fontSize: 9, fontFamily: font.extrabold },
  label: { fontFamily: font.semibold, fontSize: 13, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 50 },
  input: { flex: 1, fontFamily: font.medium, fontSize: 15, paddingVertical: 12, outlineStyle: 'none' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  errorText: { fontFamily: font.medium, fontSize: 12.5 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1, marginBottom: space.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xl, marginBottom: space.md },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, minHeight: 260 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: radius.md, gap: 4 },
  segment: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.sm },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1, marginBottom: space.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
