import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFeedback } from '../context/FeedbackContext';
import { Logo } from '../components/Logo';
import { Avatar, Badge, Icon, Segmented, T } from '../components/ui';
import { font, radius, space } from '../theme/tokens';
import { fullName } from '../utils/format';

const ROLE_BADGE = {
  Alumno: { kind: 'info', icon: 'account' },
  Entrenador: { kind: 'success', icon: 'whistle' },
  Administrador: { kind: 'warning', icon: 'shield-crown' },
};

/** Menú desplegable con el nombre y logotipo de MOVA (requisito de branding). */
export default function DrawerContent({ state, descriptors, navigation }) {
  const { user, logout } = useAuth();
  const { colors: c, preference, setPreference } = useTheme();
  const { confirm, toast } = useFeedback();
  const insets = useSafeAreaInsets();
  const rb = ROLE_BADGE[user?.rol] || ROLE_BADGE.Alumno;

  const onLogout = async () => {
    const okLogout = await confirm({ title: '¿Cerrar sesión?', message: 'Vas a tener que volver a ingresar con tu cuenta.', confirmText: 'Cerrar sesión', icon: 'logout' });
    if (okLogout) {
      await logout();
      toast('Sesión cerrada', 'info');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <DrawerContentScrollView contentContainerStyle={{ paddingTop: 0 }}>
        <LinearGradient colors={[c.heroFrom, c.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.head, { paddingTop: insets.top + space.lg }]}>
          <View style={styles.logoPill}>
            <Logo size={34} color="#fff" />
          </View>
          <View style={styles.userRow}>
            <Avatar name={fullName(user)} url={user?.avatar_url} size={52} color="rgba(255,255,255,0.25)" />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{fullName(user)}</Text>
              <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ padding: space.md }}>
          <View style={{ marginBottom: space.md, marginLeft: space.sm }}>
            <Badge label={user?.rol} kind={rb.kind} icon={rb.icon} />
          </View>
          {state.routes.map((route, i) => {
            const { options } = descriptors[route.key];
            const focused = state.index === i;
            return (
              <Pressable
                key={route.key}
                onPress={() => navigation.navigate(route.name)}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                style={({ pressed }) => [styles.item, { backgroundColor: focused ? c.primarySoft : pressed ? c.surfaceAlt : 'transparent' }]}
              >
                <Icon name={options.drawerIconName} size={22} color={focused ? c.primary : c.textMuted} />
                <Text style={[styles.itemText, { color: focused ? c.primary : c.text }]}>{options.title}</Text>
              </Pressable>
            );
          })}
        </View>
      </DrawerContentScrollView>

      <View style={[styles.foot, { borderTopColor: c.border, paddingBottom: insets.bottom + space.md }]}>
        <T v="caption" color={c.textMuted} style={{ marginBottom: space.sm }}>Apariencia</T>
        <Segmented
          value={preference}
          onChange={setPreference}
          options={[
            { value: 'system', label: 'Auto' },
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Oscuro' },
          ]}
        />
        <Pressable onPress={onLogout} style={({ pressed }) => [styles.item, { marginTop: space.md, opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button">
          <Icon name="logout" size={22} color={c.danger} />
          <Text style={[styles.itemText, { color: c.danger }]}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.lg },
  logoPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.lg, paddingVertical: 6, paddingHorizontal: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { color: '#fff', fontFamily: font.extrabold, fontSize: 17 },
  email: { color: 'rgba(255,255,255,0.8)', fontFamily: font.medium, fontSize: 12.5 },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12, paddingHorizontal: space.md, borderRadius: radius.md },
  itemText: { fontFamily: font.bold, fontSize: 15 },
  foot: { borderTopWidth: StyleSheet.hairlineWidth, padding: space.lg },
});
