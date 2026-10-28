import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { LogoMark } from '../../components/Logo';
import { IconButton, T } from '../../components/ui';
import { radius, space, shadow } from '../../theme/tokens';

/** Marco común de las pantallas de registro / verificación / recuperación. */
export default function AuthShell({ title, subtitle, children, back = true, icon }) {
  const { colors: c } = useTheme();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xxl, paddingHorizontal: space.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.wrap}>
            <View style={styles.top}>
              {back ? <IconButton icon="arrow-left" label="Volver" onPress={() => nav.goBack()} /> : <View />}
              <LogoMark size={44} />
            </View>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, shadow(c, 2)]}>
              {icon}
              <T v="h1">{title}</T>
              {!!subtitle && (
                <T v="small" color={c.textMuted} style={{ marginTop: 4, marginBottom: space.lg }}>
                  {subtitle}
                </T>
              )}
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xl },
  card: { borderRadius: radius.xl, padding: space.xl, borderWidth: 1 },
});
