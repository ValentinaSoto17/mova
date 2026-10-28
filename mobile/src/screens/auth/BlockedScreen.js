import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button, Icon, T } from '../../components/ui';
import AuthShell from './AuthShell';
import { radius, space } from '../../theme/tokens';
import { fDateLong } from '../../utils/format';

/**
 * Política de usuarios: la cuenta no se elimina, se bloquea y se muestra en pantalla
 * el procedimiento para regularizar la situación.
 */
export default function BlockedScreen({ navigation }) {
  const { blocked, clearBlocked } = useAuth();
  const { colors: c } = useTheme();
  const b = blocked || { motivo: 'Cuenta bloqueada', instrucciones: 'Comunicate con la administración del gimnasio.' };

  return (
    <AuthShell
      back={false}
      title="Tu cuenta está pausada"
      subtitle="No te preocupes: tus datos y tu progreso siguen guardados."
      icon={
        <View style={[styles.icon, { backgroundColor: c.warningSoft }]}>
          <Icon name="account-lock" size={32} color={c.warning} />
        </View>
      }
    >
      <View style={[styles.box, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
        <T v="caption" color={c.textMuted}>Motivo</T>
        <T v="h3" style={{ marginBottom: space.sm }}>{b.motivo}</T>
        {!!b.detalle && <T v="small" color={c.textMuted}>{b.detalle}</T>}
        {!!b.fecha_bloqueo && <T v="small" color={c.textMuted}>Desde el {fDateLong(b.fecha_bloqueo)}</T>}
      </View>
      <View style={[styles.box, { backgroundColor: c.primarySoft, borderColor: c.primary + '33' }]}>
        <T v="caption" color={c.primary}>¿Cómo reactivarla?</T>
        <T v="body" style={{ marginTop: 4 }}>{b.instrucciones}</T>
      </View>
      <Button title="Escribir a administración" icon="email-outline" variant="secondary" onPress={() => Linking.openURL('mailto:administracion@mova.app?subject=Reactivar%20mi%20cuenta%20MOVA')} />
      <Button
        title="Volver al inicio"
        variant="ghost"
        style={{ marginTop: space.sm }}
        onPress={() => {
          clearBlocked();
          navigation.popToTop();
        }}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  box: { borderRadius: radius.md, padding: space.lg, borderWidth: 1, marginBottom: space.md },
});
