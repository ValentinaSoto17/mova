import React, { useMemo, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { Header, Screen } from '../../components/Screen';
import { Button, Card, Icon, Input, Row, SectionTitle, Segmented, T } from '../../components/ui';
import { radius, space } from '../../theme/tokens';
import { general, roles, buildManualHtml } from '../../manual/manualContent';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Manual de usuario interactivo + descarga en PDF. */
export default function ManualScreen() {
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const { toast } = useFeedback();
  const [role, setRole] = useState(user?.rol || 'Alumno');
  const [open, setOpen] = useState('Iniciar sesión');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  const filter = (arr) => (q ? arr.filter((s) => (s.title + s.steps.join(' ')).toLowerCase().includes(q.toLowerCase())) : arr);
  const gen = useMemo(() => filter(general), [q]);
  const rol = useMemo(() => filter(roles[role]), [q, role]);

  const toggle = (t) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(open === t ? null : t);
  };

  const download = async () => {
    setBusy(true);
    try {
      const html = buildManualHtml();
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Manual de usuario MOVA', UTI: 'com.adobe.pdf' });
        } else {
          toast(`PDF generado en: ${uri}`, 'info');
        }
      }
    } catch (e) {
      toast('No se pudo generar el PDF', 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderSection = (s) => {
    const isOpen = open === s.title || !!q;
    return (
      <Card key={s.title} padded={false} style={{ marginBottom: space.sm, overflow: 'hidden' }}>
        <Pressable onPress={() => toggle(s.title)} style={styles.head} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
          <View style={[styles.icon, { backgroundColor: c.primarySoft }]}>
            <Icon name={s.icon} size={20} color={c.primary} />
          </View>
          <T v="h3" style={{ flex: 1 }}>{s.title}</T>
          <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={22} color={c.textSoft} />
        </Pressable>
        {isOpen && (
          <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm }}>
            {s.steps.map((st, i) => (
              <Row key={i} style={{ alignItems: 'flex-start' }} gap={space.sm}>
                <View style={[styles.num, { backgroundColor: c.primary }]}>
                  <T v="small" color={c.primaryText} style={{ fontSize: 11 }}>{i + 1}</T>
                </View>
                <T v="body" style={{ flex: 1 }} color={c.text}>{st}</T>
              </Row>
            ))}
          </View>
        )}
      </Card>
    );
  };

  return (
    <Screen header={<Header title="Manual de usuario" subtitle="Cómo usar MOVA paso a paso" />}>
      <Card style={{ backgroundColor: c.primarySoft, borderColor: c.primary + '33', marginBottom: space.lg }}>
        <Row>
          <Icon name="file-pdf-box" size={34} color={c.coral} />
          <View style={{ flex: 1 }}>
            <T v="h3">Manual completo en PDF</T>
            <T v="small" color={c.textMuted}>Descargalo o compartilo con todos los perfiles.</T>
          </View>
        </Row>
        <Button title="Descargar PDF" icon="download" onPress={download} loading={busy} style={{ marginTop: space.md }} />
      </Card>
      <Input icon="magnify" placeholder="Buscar en el manual" value={q} onChangeText={setQ} />
      <SectionTitle title="Uso general" style={{ marginTop: space.sm }} />
      {gen.map(renderSection)}
      <SectionTitle title="Funciones por perfil" />
      <Segmented value={role} onChange={setRole} options={[{ value: 'Alumno', label: 'Alumno' }, { value: 'Entrenador', label: 'Entrenador' }, { value: 'Administrador', label: 'Admin' }]} />
      <View style={{ height: space.md }} />
      {rol.map(renderSection)}
      {!gen.length && !rol.length && <T v="small" color={c.textMuted} style={{ textAlign: 'center', marginTop: space.lg }}>No encontramos “{q}” en el manual.</T>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  icon: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  num: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
