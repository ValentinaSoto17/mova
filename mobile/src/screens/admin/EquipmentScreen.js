import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useApi, useAction } from '../../hooks/useApi';
import { Header, Screen, HeaderAction } from '../../components/Screen';
import { Badge, Banner, Button, Card, Chip, Empty, ErrorState, Icon, IconButton, Input, Loading, Row, Segmented, T } from '../../components/ui';
import { radius, space } from '../../theme/tokens';
import { fDate } from '../../utils/format';
import { LOAN_STATE } from '../alumno/LoansScreen';

const ESTADOS = { operativo: { label: 'Operativo', kind: 'success' }, mantenimiento: { label: 'Mantenimiento', kind: 'warning' }, fuera_de_servicio: { label: 'Fuera de servicio', kind: 'danger' } };
const EMPTY = { nombre: '', descripcion: '', cantidad_total: '1', estado: 'operativo', prestable: false };

/** Stock de equipamiento y gestión de préstamos (administrador). */
export default function EquipmentScreen() {
  const { colors: c } = useTheme();
  const { toast, confirm } = useFeedback();
  const [tab, setTab] = useState('stock');
  const eq = useApi('/equipment/list');
  const loans = useApi('/equipment/loans', { accion: 'listar' });
  const { run, busy, fieldErrors, formError, setFieldErrors, setFormError } = useAction();
  const [form, setForm] = useState(null);

  const pending = loans.data?.filter((l) => l.estado === 'pendiente').length || 0;

  const open = (item) => {
    setFieldErrors({});
    setFormError(null);
    setForm(item ? { ...item, cantidad_total: String(item.cantidad_total), descripcion: item.descripcion || '' } : { ...EMPTY });
  };

  const save = async () => {
    try {
      await run('/equipment/manage', { accion: form.id_equipo ? 'editar' : 'crear', ...form, cantidad_total: Number(form.cantidad_total) });
      setForm(null);
      toast(form.id_equipo ? 'Equipo actualizado' : 'Equipo agregado');
      eq.reload();
    } catch {
      /* visible */
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: '¿Eliminar equipo?', message: `"${form.nombre}" se quitará del inventario.`, confirmText: 'Eliminar', danger: true }))) return;
    try {
      await run('/equipment/manage', { accion: 'eliminar', id_equipo: form.id_equipo, confirmacion: true });
      setForm(null);
      toast('Equipo eliminado');
      eq.reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const loanAction = async (l, accion) => {
    const textos = { aprobar: ['¿Aprobar préstamo?', 'Aprobar'], rechazar: ['¿Rechazar préstamo?', 'Rechazar'], devolver: ['¿Marcar como devuelto?', 'Devuelto'] };
    if (!(await confirm({ title: textos[accion][0], message: `${l.alumno}: ${l.cantidad} × ${l.equipo}`, confirmText: textos[accion][1], danger: accion === 'rechazar' }))) return;
    try {
      await run('/equipment/loans', { accion, id_prestamo: l.id_prestamo });
      toast('Préstamo actualizado');
      loans.reload();
      eq.reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <Screen header={<Header title="Stock" subtitle="Equipamiento y préstamos" right={tab === 'stock' ? <HeaderAction icon="plus" label="Agregar equipo" onPress={() => open(null)} /> : null} />} refreshing={eq.refreshing} onRefresh={() => { eq.refresh(); loans.refresh(); }}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'stock', label: 'Equipamiento' }, { value: 'prestamos', label: 'Préstamos', count: pending || null }]} />
      <View style={{ height: space.lg }} />
      {tab === 'stock' ? (
        eq.loading ? <Loading /> : eq.error ? <ErrorState error={eq.error} onRetry={eq.reload} /> : eq.data.map((e) => (
          <Card key={e.id_equipo} style={{ marginBottom: space.sm }} onPress={() => open(e)}>
            <Row>
              <View style={[styles.icon, { backgroundColor: c[`${ESTADOS[e.estado].kind}Soft`] }]}>
                <Icon name={e.prestable ? 'weight-lifter' : 'cog-outline'} size={22} color={c[ESTADOS[e.estado].kind]} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="h3">{e.nombre}</T>
                <T v="small" color={c.textMuted}>{e.disponibles}/{e.cantidad_total} disponibles{e.prestable ? ' · se presta' : ''}</T>
              </View>
              <Badge label={ESTADOS[e.estado].label} kind={ESTADOS[e.estado].kind} />
            </Row>
          </Card>
        ))
      ) : loans.loading ? <Loading /> : loans.error ? <ErrorState error={loans.error} onRetry={loans.reload} /> : !loans.data.length ? (
        <Empty icon="basket-outline" title="Sin préstamos" />
      ) : (
        loans.data.map((l) => {
          const st = LOAN_STATE[l.estado];
          return (
            <Card key={l.id_prestamo} style={{ marginBottom: space.sm }}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <T v="h3">{l.cantidad} × {l.equipo}</T>
                  <T v="small" color={c.textMuted}>{l.alumno} · pedido {fDate(l.fecha_solicitud)} · devolver {fDate(l.fecha_devolucion_prevista)}</T>
                </View>
                <Badge label={l.atrasado ? 'Atrasado' : st.label} kind={l.atrasado ? 'danger' : st.kind} />
              </Row>
              {l.estado === 'pendiente' && (
                <Row style={{ marginTop: space.md }}>
                  <Button title="Aprobar" icon="check" small variant="success" style={{ flex: 1 }} onPress={() => loanAction(l, 'aprobar')} />
                  <Button title="Rechazar" icon="close" small variant="outline" style={{ flex: 1 }} onPress={() => loanAction(l, 'rechazar')} />
                </Row>
              )}
              {l.estado === 'aprobado' && <Button title="Marcar devuelto" icon="keyboard-return" small variant="secondary" style={{ marginTop: space.md }} onPress={() => loanAction(l, 'devolver')} />}
            </Card>
          );
        })
      )}

      <Modal visible={!!form} transparent animationType="slide" onRequestClose={() => setForm(null)}>
        <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={() => setForm(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
            {form && (
              <>
                <Row style={{ justifyContent: 'space-between', marginBottom: space.lg }}>
                  <T v="h2">{form.id_equipo ? 'Editar equipo' : 'Nuevo equipo'}</T>
                  {form.id_equipo && <IconButton icon="delete-outline" color={c.danger} label="Eliminar" onPress={remove} />}
                </Row>
                {formError && !Object.keys(fieldErrors).length && <Banner message={formError.message} />}
                <Input label="Nombre" value={form.nombre} onChangeText={(v) => setForm({ ...form, nombre: v })} error={fieldErrors.nombre} />
                <Input label="Descripción" value={form.descripcion} onChangeText={(v) => setForm({ ...form, descripcion: v })} />
                <Input label="Cantidad total" keyboardType="number-pad" value={form.cantidad_total} onChangeText={(v) => setForm({ ...form, cantidad_total: v.replace(/\D/g, '') })} error={fieldErrors.cantidad_total} />
                <Row gap={space.sm} style={{ flexWrap: 'wrap', marginBottom: space.md }}>
                  {Object.entries(ESTADOS).map(([k, v]) => (
                    <Chip key={k} label={v.label} active={form.estado === k} onPress={() => setForm({ ...form, estado: k })} />
                  ))}
                </Row>
                <Row style={{ justifyContent: 'space-between', marginBottom: space.lg }}>
                  <T v="body">Los alumnos pueden pedirlo prestado</T>
                  <Switch value={!!form.prestable} onValueChange={(v) => setForm({ ...form, prestable: v })} trackColor={{ true: c.primary, false: c.border }} thumbColor="#fff" />
                </Row>
                <Button title="Guardar" icon="content-save" onPress={save} loading={busy} />
                <Button title="Cancelar" variant="ghost" onPress={() => setForm(null)} style={{ marginTop: space.sm }} />
              </>
            )}
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
