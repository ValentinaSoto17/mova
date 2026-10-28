import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useApi, useAction } from '../../hooks/useApi';
import { api } from '../../api/client';
import { Header, Screen } from '../../components/Screen';
import { Avatar, Badge, Banner, Button, Card, Chip, Divider, ErrorState, Icon, Input, ListItem, Loading, Row, SectionTitle, T } from '../../components/ui';
import { radius, space } from '../../theme/tokens';
import { fDate, fullName } from '../../utils/format';
import { LOAN_STATE } from '../alumno/LoansScreen';

const ROLES = ['Alumno', 'Entrenador', 'Administrador'];

/** Ficha de un usuario: el entrenador ve a sus alumnos; el administrador gestiona cualquier cuenta. */
export default function UserDetail({ route, navigation }) {
  const { id_usuario } = route.params;
  const { user: me } = useAuth();
  const { colors: c } = useTheme();
  const { confirm, toast } = useFeedback();
  const { data: u, error, loading, reload } = useApi('/users/detail', { id_usuario });
  const { run, busy } = useAction();
  const isAdmin = me.rol === 'Administrador';
  const [blockModal, setBlockModal] = useState(false);
  const [reasons, setReasons] = useState([]);
  const [motivo, setMotivo] = useState(null);
  const [detalle, setDetalle] = useState('');
  const [payModal, setPayModal] = useState(false);
  const [plans, setPlans] = useState([]);

  const openBlock = async () => {
    setMotivo(null);
    setDetalle('');
    setBlockModal(true);
    if (!reasons.length) setReasons(await api('/users/block-reasons').catch(() => []));
  };

  const doBlock = async () => {
    if (!motivo) return toast('Elegí el motivo del bloqueo', 'warning');
    const yes = await confirm({ title: `¿Bloquear a ${u.nombre}?`, message: 'No podrá ingresar hasta que lo desbloquees. Verá en pantalla cómo regularizar su situación. La cuenta NO se elimina.', confirmText: 'Bloquear', danger: true, icon: 'account-lock' });
    if (!yes) return;
    try {
      await run('/users/status', { id_usuario, estado: 'bloqueado', id_motivo: motivo, detalle: detalle || undefined, confirmacion: true });
      setBlockModal(false);
      toast('Usuario bloqueado', 'info');
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const doUnblock = async () => {
    if (!(await confirm({ title: `¿Desbloquear a ${u.nombre}?`, message: 'Va a poder volver a ingresar a MOVA.', confirmText: 'Desbloquear', icon: 'lock-open-variant' }))) return;
    try {
      await run('/users/status', { id_usuario, estado: 'activo', confirmacion: true });
      toast('Cuenta reactivada');
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const changeRole = async (rol) => {
    if (rol === u.rol) return;
    if (!(await confirm({ title: `¿Cambiar rol a ${rol}?`, message: `${fullName(u)} pasará de ${u.rol} a ${rol} y tendrá otros permisos.`, confirmText: 'Cambiar rol' }))) return;
    try {
      await run('/admin/roles', { accion: 'cambiar', id_usuario, rol, confirmacion: true });
      toast(`Ahora es ${rol}`);
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const openPay = async () => {
    setPayModal(true);
    if (!plans.length) setPlans(await api('/admin/memberships', { accion: 'planes' }).catch(() => []));
  };
  const pay = async (plan) => {
    if (!(await confirm({ title: `¿Registrar pago del plan ${plan.nombre}?`, message: `$${Number(plan.precio).toLocaleString('es-AR')} · ${plan.duracion_dias} días`, confirmText: 'Registrar pago', icon: 'cash-check' }))) return;
    try {
      const r = await run('/admin/memberships', { accion: 'renovar', id_usuario, id_plan: plan.id_plan });
      setPayModal(false);
      toast(r.reactivado ? 'Pago registrado y cuenta reactivada' : 'Pago registrado');
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const unassign = async (a) => {
    if (!(await confirm({ title: '¿Quitar rutina?', message: `"${a.nombre_rutina}" dejará de estar asignada a ${u.nombre}. El historial se conserva.`, confirmText: 'Quitar', danger: true }))) return;
    try {
      await run('/routines/manage', { accion: 'desasignar', id_asignacion: a.id_asignacion, estado: 'finalizada', confirmacion: true });
      toast('Rutina quitada', 'info');
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <Screen header={<Header back title={u ? fullName(u) : 'Usuario'} subtitle={u?.rol} />}>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <Card>
            <Row>
              <Avatar name={fullName(u)} url={u.avatar_url} size={64} />
              <View style={{ flex: 1 }}>
                <T v="h2">{fullName(u)}</T>
                <T v="small" color={c.textMuted}>{u.email}</T>
                <Row gap={6} style={{ marginTop: 6 }}>
                  <Badge label={u.rol} kind={u.rol === 'Administrador' ? 'warning' : u.rol === 'Entrenador' ? 'success' : 'info'} />
                  <Badge label={u.estado === 'activo' ? 'Activo' : 'Bloqueado'} kind={u.estado === 'activo' ? 'success' : 'danger'} icon={u.estado === 'activo' ? 'check' : 'lock'} />
                </Row>
              </View>
            </Row>
            {(u.telefono || u.objetivo) && <Divider />}
            {!!u.telefono && <T v="small" color={c.textMuted}>📞 {u.telefono}</T>}
            {!!u.objetivo && <T v="small" color={c.textMuted}>🎯 {u.objetivo}</T>}
          </Card>

          {u.bloqueo && (
            <View style={{ marginTop: space.md }}>
              <Banner kind="danger" title={`Bloqueado: ${u.bloqueo.motivo}`} message={`${u.bloqueo.detalle || ''} · desde ${fDate(u.bloqueo.fecha_bloqueo)}`} icon="account-lock" />
            </View>
          )}

          {u.rol === 'Alumno' && (
            <Row style={{ marginTop: space.md }}>
              <Button title="Ver progreso" icon="chart-line" variant="secondary" style={{ flex: 1 }} onPress={() => navigation.navigate('StudentProgress', { id_alumno: id_usuario, nombre: fullName(u) })} />
              <Button title="Mensaje" icon="message-text-outline" variant="outline" style={{ flex: 1 }} onPress={() => navigation.navigate('Chat', { tipo: 'usuario', id: id_usuario, nombre: fullName(u) })} />
            </Row>
          )}

          {u.membresia && (
            <>
              <SectionTitle title="Cuota" action={isAdmin ? 'Registrar pago' : null} onAction={openPay} />
              <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View>
                    <T v="h3">Plan {u.membresia.plan}</T>
                    <T v="small" color={c.textMuted}>Vence el {fDate(u.membresia.fecha_vencimiento)}</T>
                  </View>
                  <Badge
                    label={u.membresia.dias_restantes < 0 ? `Vencida hace ${-u.membresia.dias_restantes} d` : `${u.membresia.dias_restantes} días`}
                    kind={u.membresia.dias_restantes < 0 ? 'danger' : u.membresia.dias_restantes <= 3 ? 'warning' : 'success'}
                  />
                </Row>
              </Card>
            </>
          )}

          {u.rol === 'Alumno' && (
            <>
              <SectionTitle title="Rutinas asignadas" action="+ Asignar" onAction={() => navigation.navigate('AssignRoutine', { alumno: u })} />
              {!u.asignaciones.length ? (
                <Card><T v="small" color={c.textMuted}>Sin rutinas asignadas.</T></Card>
              ) : (
                u.asignaciones.map((a) => (
                  <ListItem
                    key={a.id_asignacion}
                    onPress={() => navigation.navigate('RoutineDetail', { id_rutina: a.id_rutina })}
                    title={a.nombre_rutina}
                    subtitle={`${a.sesiones} sesiones · revisión ${fDate(a.fecha_revision)} · ${a.entrenador}`}
                    right={
                      a.estado === 'activa' ? (
                        <Pressable onPress={() => unassign(a)} hitSlop={10} accessibilityLabel="Quitar rutina">
                          <Icon name="close-circle-outline" size={24} color={c.danger} />
                        </Pressable>
                      ) : (
                        <Badge label={a.estado} kind="muted" />
                      )
                    }
                  />
                ))
              )}
              {!!u.prestamos.length && (
                <>
                  <SectionTitle title="Préstamos" />
                  {u.prestamos.map((l) => (
                    <ListItem key={l.id_prestamo} title={`${l.cantidad} × ${l.equipo}`} subtitle={`Devolver: ${fDate(l.fecha_devolucion_prevista)}`} right={<Badge label={LOAN_STATE[l.estado].label} kind={LOAN_STATE[l.estado].kind} />} />
                  ))}
                </>
              )}
            </>
          )}

          {isAdmin && u.id_usuario !== me.id_usuario && (
            <>
              <SectionTitle title="Administración" />
              <Card>
                <T v="caption" color={c.textMuted} style={{ marginBottom: space.sm }}>Rol</T>
                <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
                  {ROLES.map((r) => (
                    <Chip key={r} label={r} active={u.rol === r} onPress={() => changeRole(r)} />
                  ))}
                </Row>
                <Divider />
                <Button title="Editar datos" icon="pencil" variant="outline" onPress={() => navigation.navigate('UserForm', { user: u })} />
                <View style={{ height: space.sm }} />
                {u.estado === 'activo' ? (
                  <Button title="Bloquear cuenta" icon="account-lock" variant="danger" onPress={openBlock} loading={busy} />
                ) : (
                  <Button title="Desbloquear cuenta" icon="lock-open-variant" variant="success" onPress={doUnblock} loading={busy} />
                )}
                <T v="small" color={c.textSoft} style={{ marginTop: space.sm, textAlign: 'center' }}>Las cuentas nunca se eliminan: se bloquean y conservan su historial.</T>
              </Card>
            </>
          )}
        </>
      )}

      <Modal visible={blockModal} transparent animationType="slide" onRequestClose={() => setBlockModal(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={() => setBlockModal(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
            <T v="h2">Bloquear cuenta</T>
            <T v="small" color={c.textMuted} style={{ marginBottom: space.lg }}>El usuario verá el motivo y las instrucciones para regularizar.</T>
            {reasons.map((r) => (
              <Pressable key={r.id_motivo} onPress={() => setMotivo(r.id_motivo)} style={[styles.reason, { borderColor: motivo === r.id_motivo ? c.primary : c.border, backgroundColor: motivo === r.id_motivo ? c.primarySoft : c.surface }]}>
                <Icon name={motivo === r.id_motivo ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={c.primary} />
                <View style={{ flex: 1 }}>
                  <T v="h3" style={{ fontSize: 14.5 }}>{r.nombre}</T>
                  <T v="small" color={c.textMuted} numberOfLines={2}>{r.instrucciones}</T>
                </View>
              </Pressable>
            ))}
            <Input label="Detalle (opcional)" value={detalle} onChangeText={setDetalle} placeholder="Ej.: cuota de octubre impaga" />
            <Button title="Bloquear" icon="account-lock" variant="danger" onPress={doBlock} loading={busy} />
            <Button title="Cancelar" variant="ghost" onPress={() => setBlockModal(false)} style={{ marginTop: space.sm }} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={payModal} transparent animationType="slide" onRequestClose={() => setPayModal(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={() => setPayModal(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
            <T v="h2" style={{ marginBottom: space.lg }}>Registrar pago</T>
            {plans.map((p) => (
              <ListItem key={p.id_plan} onPress={() => pay(p)} title={`Plan ${p.nombre}`} subtitle={`${p.duracion_dias} días`} right={<T v="h3">${Number(p.precio).toLocaleString('es-AR')}</T>} />
            ))}
            <Button title="Cancelar" variant="ghost" onPress={() => setPayModal(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, width: '100%', maxWidth: 720, alignSelf: 'center' },
  reason: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1.5, marginBottom: space.sm },
});
