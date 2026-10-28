import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useApi, useAction } from '../../hooks/useApi';
import { Header, Screen } from '../../components/Screen';
import { Badge, Banner, Button, Card, Chip, Empty, ErrorState, Icon, Input, Loading, Row, SectionTitle, Segmented, T } from '../../components/ui';
import { radius, space } from '../../theme/tokens';
import { addDays, fDate } from '../../utils/format';

export const LOAN_STATE = {
  pendiente: { kind: 'warning', icon: 'clock-outline', label: 'Pendiente' },
  aprobado: { kind: 'success', icon: 'check-circle', label: 'Aprobado' },
  rechazado: { kind: 'muted', icon: 'close-circle', label: 'Rechazado' },
  devuelto: { kind: 'info', icon: 'keyboard-return', label: 'Devuelto' },
};

/** El alumno solicita / reserva elementos del gimnasio. */
export default function LoansScreen() {
  const { colors: c } = useTheme();
  const { toast, confirm } = useFeedback();
  const [tab, setTab] = useState('pedir');
  const eq = useApi('/equipment/list');
  const loans = useApi('/equipment/loans', { accion: 'listar' });
  const { run, busy, fieldErrors, formError, setFieldErrors, setFormError } = useAction();
  const [sel, setSel] = useState(null);
  const [qty, setQty] = useState('1');
  const [days, setDays] = useState(3);

  const open = (item) => {
    setSel(item);
    setQty('1');
    setDays(3);
    setFieldErrors({});
    setFormError(null);
  };

  const request = async () => {
    try {
      await run('/equipment/loans', { accion: 'solicitar', id_equipo: sel.id_equipo, cantidad: Number(qty), fecha_devolucion_prevista: addDays(days) });
      setSel(null);
      toast('Solicitud enviada. Te avisamos cuando se apruebe.');
      eq.reload();
      loans.reload();
      setTab('mis');
    } catch {
      /* errores visibles en el formulario */
    }
  };

  const cancel = async (l) => {
    if (!(await confirm({ title: '¿Cancelar la solicitud?', message: `${l.cantidad} × ${l.equipo}`, confirmText: 'Cancelar solicitud', danger: true }))) return;
    try {
      await run('/equipment/loans', { accion: 'cancelar', id_prestamo: l.id_prestamo });
      toast('Solicitud cancelada', 'info');
      loans.reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const active = loans.data?.filter((l) => ['pendiente', 'aprobado'].includes(l.estado)).length || 0;

  return (
    <Screen header={<Header title="Préstamo de material" subtitle="Reservá elementos del gimnasio" />} refreshing={eq.refreshing} onRefresh={() => { eq.refresh(); loans.refresh(); }}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'pedir', label: 'Disponibles' }, { value: 'mis', label: 'Mis préstamos', count: active }]} />
      <View style={{ height: space.lg }} />
      {tab === 'pedir' ? (
        eq.loading ? <Loading /> : eq.error ? <ErrorState error={eq.error} onRetry={eq.reload} /> : (
          <>
            <Banner kind="info" message="Devolvé el material en la fecha indicada. Los atrasos pueden pausar tu cuenta." />
            {eq.data.map((e) => (
              <Card key={e.id_equipo} style={{ marginBottom: space.sm }}>
                <Row>
                  <View style={[styles.icon, { backgroundColor: c.goldSoft }]}>
                    <Icon name="dumbbell" size={22} color={c.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T v="h3">{e.nombre}</T>
                    <T v="small" color={c.textMuted}>{e.descripcion}</T>
                    <T v="small" color={e.disponibles > 0 ? c.success : c.danger} style={{ marginTop: 2 }}>
                      {e.disponibles > 0 ? `${e.disponibles} disponibles` : 'Sin stock por ahora'}
                    </T>
                  </View>
                  <Button title="Pedir" small full={false} disabled={e.disponibles < 1} onPress={() => open(e)} />
                </Row>
              </Card>
            ))}
          </>
        )
      ) : loans.loading ? <Loading /> : loans.error ? <ErrorState error={loans.error} onRetry={loans.reload} /> : !loans.data.length ? (
        <Empty icon="basket-outline" title="Sin préstamos" message="Pedí material desde la pestaña Disponibles." />
      ) : (
        loans.data.map((l) => {
          const st = LOAN_STATE[l.estado];
          return (
            <Card key={l.id_prestamo} style={{ marginBottom: space.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="h3" style={{ flex: 1 }}>{l.cantidad} × {l.equipo}</T>
                <Badge label={l.atrasado ? 'Atrasado' : st.label} kind={l.atrasado ? 'danger' : st.kind} icon={l.atrasado ? 'alert' : st.icon} />
              </Row>
              <T v="small" color={c.textMuted} style={{ marginTop: 4 }}>
                Pedido el {fDate(l.fecha_solicitud)} · devolver el {fDate(l.fecha_devolucion_prevista)}
              </T>
              {l.estado === 'pendiente' && <Button title="Cancelar solicitud" variant="ghost" small full={false} onPress={() => cancel(l)} style={{ marginTop: space.sm, paddingHorizontal: 0 }} />}
            </Card>
          );
        })
      )}

      <Modal visible={!!sel} transparent animationType="slide" onRequestClose={() => setSel(null)}>
        <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={() => setSel(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
            <T v="h2">Pedir {sel?.nombre}</T>
            <T v="small" color={c.textMuted} style={{ marginBottom: space.lg }}>Quedan {sel?.disponibles} disponibles.</T>
            {formError && !Object.keys(fieldErrors).length && <Banner message={formError.message} />}
            <Input label="Cantidad" icon="counter" keyboardType="number-pad" value={qty} onChangeText={(v) => setQty(v.replace(/\D/g, ''))} error={fieldErrors.cantidad} />
            <SectionTitle title="¿Cuándo lo devolvés?" style={{ marginTop: 0 }} />
            <Row gap={space.sm} style={{ flexWrap: 'wrap', marginBottom: space.md }}>
              {[1, 3, 7, 14].map((d) => (
                <Chip key={d} label={d === 1 ? 'Mañana' : `En ${d} días`} active={days === d} onPress={() => setDays(d)} />
              ))}
            </Row>
            {fieldErrors.fecha_devolucion_prevista && <T v="small" color={c.danger}>{fieldErrors.fecha_devolucion_prevista}</T>}
            <T v="small" color={c.textMuted} style={{ marginBottom: space.lg }}>Fecha de devolución: {fDate(addDays(days))}</T>
            <Button title="Enviar solicitud" icon="send" onPress={request} loading={busy} />
            <Button title="Cancelar" variant="ghost" onPress={() => setSel(null)} style={{ marginTop: space.sm }} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, width: '100%', maxWidth: 720, alignSelf: 'center' },
});
