import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useApi, useAction } from '../../hooks/useApi';
import { Header, Screen } from '../../components/Screen';
import { Banner, Button, Card, Chip, Icon, IconButton, Input, ListItem, Loading, Row, SectionTitle, T } from '../../components/ui';
import ExerciseArt from '../../components/ExerciseArt';
import { radius, space } from '../../theme/tokens';

/** Crear / editar rutina con sus ejercicios (series, repeticiones, peso, descanso y orden). */
export default function RoutineForm({ route, navigation }) {
  const editing = route.params?.routine;
  const { colors: c } = useTheme();
  const { toast, confirm } = useFeedback();
  const catalog = useApi('/exercises/list');
  const { run, busy, fieldErrors, formError } = useAction();
  const [f, setF] = useState({
    nombre_rutina: editing?.nombre_rutina || '',
    descripcion: editing?.descripcion || '',
    duracion_estimada_min: String(editing?.duracion_estimada_min || 45),
  });
  const [items, setItems] = useState(
    (editing?.ejercicios || []).map((e) => ({
      id_ejercicio: e.id_ejercicio,
      nombre: e.nombre,
      categoria: e.categoria,
      fotografia_url: e.fotografia_url,
      series: String(e.series),
      repeticiones: e.repeticiones,
      peso_sugerido_kg: e.peso_sugerido_kg != null ? String(e.peso_sugerido_kg) : '',
      descanso_segundos: String(e.descanso_segundos),
    }))
  );
  const [picker, setPicker] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(null);

  const options = useMemo(
    () => (catalog.data?.ejercicios || []).filter((e) => (!cat || e.id_categoria === cat) && e.nombre.toLowerCase().includes(q.toLowerCase())),
    [catalog.data, q, cat]
  );

  const add = (e) => {
    setItems((x) => [...x, { id_ejercicio: e.id_ejercicio, nombre: e.nombre, categoria: e.categoria, fotografia_url: e.fotografia_url, series: '3', repeticiones: '12', peso_sugerido_kg: '', descanso_segundos: '60' }]);
    setPicker(false);
    toast(`${e.nombre} agregado`, 'info');
  };
  const update = (i, k, v) => setItems((x) => x.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const move = (i, d) =>
    setItems((x) => {
      const n = [...x];
      const j = i + d;
      if (j < 0 || j >= n.length) return x;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const removeItem = async (i) => {
    if (await confirm({ title: '¿Quitar ejercicio?', message: items[i].nombre, confirmText: 'Quitar', danger: true })) setItems((x) => x.filter((_, j) => j !== i));
  };

  const save = async () => {
    const body = {
      accion: editing ? 'editar' : 'crear',
      ...(editing ? { id_rutina: editing.id_rutina } : {}),
      nombre_rutina: f.nombre_rutina,
      descripcion: f.descripcion || null,
      duracion_estimada_min: Number(f.duracion_estimada_min),
      ejercicios: items.map((it) => ({
        id_ejercicio: it.id_ejercicio,
        series: Number(it.series),
        repeticiones: it.repeticiones,
        peso_sugerido_kg: it.peso_sugerido_kg === '' ? null : Number(it.peso_sugerido_kg),
        descanso_segundos: Number(it.descanso_segundos),
      })),
    };
    if (editing && !(await confirm({ title: '¿Guardar cambios?', message: 'Los alumnos que tienen esta rutina verán la nueva versión.', confirmText: 'Guardar' }))) return;
    try {
      await run('/routines/manage', body);
      toast(editing ? 'Rutina actualizada' : 'Rutina creada');
      navigation.goBack();
    } catch {
      /* errores visibles */
    }
  };

  return (
    <Screen header={<Header back title={editing ? 'Editar rutina' : 'Nueva rutina'} />} footer={<Button title={editing ? 'Guardar cambios' : 'Crear rutina'} icon="content-save" onPress={save} loading={busy} />}>
      {formError && <Banner title="Revisá la rutina" message={fieldErrors.ejercicios || formError.message} />}
      <Input label="Nombre" value={f.nombre_rutina} onChangeText={(v) => setF({ ...f, nombre_rutina: v })} error={fieldErrors.nombre_rutina} placeholder="Ej.: Fuerza Total – Nivel Inicial" />
      <Input label="Descripción" multiline value={f.descripcion} onChangeText={(v) => setF({ ...f, descripcion: v })} error={fieldErrors.descripcion} />
      <Input label="Duración estimada (min)" icon="clock-outline" keyboardType="number-pad" value={f.duracion_estimada_min} onChangeText={(v) => setF({ ...f, duracion_estimada_min: v.replace(/\D/g, '') })} error={fieldErrors.duracion_estimada_min} />

      <SectionTitle title={`Ejercicios (${items.length})`} action="+ Agregar" onAction={() => setPicker(true)} />
      {!items.length && (
        <Pressable onPress={() => setPicker(true)} style={[styles.addBox, { borderColor: c.border }]}>
          <Icon name="plus-circle-outline" size={30} color={c.primary} />
          <T v="small" color={c.textMuted}>Agregá ejercicios del catálogo</T>
        </Pressable>
      )}
      {items.map((it, i) => (
        <Card key={`${it.id_ejercicio}-${i}`} style={{ marginBottom: space.sm }}>
          <Row>
            <ExerciseArt url={it.fotografia_url} categoria={it.categoria} size={44} radius={12} />
            <View style={{ flex: 1 }}>
              <T v="h3" style={{ fontSize: 15 }}>{i + 1}. {it.nombre}</T>
              <T v="small" color={c.textMuted}>{it.categoria}</T>
            </View>
            <IconButton icon="arrow-up" size={18} label="Subir" onPress={() => move(i, -1)} />
            <IconButton icon="arrow-down" size={18} label="Bajar" onPress={() => move(i, 1)} />
            <IconButton icon="close" size={18} label="Quitar" color={c.danger} onPress={() => removeItem(i)} />
          </Row>
          <Row gap={space.sm} style={{ marginTop: space.md, alignItems: 'flex-start' }}>
            <Input style={{ flex: 1, marginBottom: 0 }} label="Series" keyboardType="number-pad" value={it.series} onChangeText={(v) => update(i, 'series', v.replace(/\D/g, ''))} error={fieldErrors[`ejercicios.${i}.series`]} />
            <Input style={{ flex: 1.2, marginBottom: 0 }} label="Reps" value={it.repeticiones} onChangeText={(v) => update(i, 'repeticiones', v)} error={fieldErrors[`ejercicios.${i}.repeticiones`]} />
            <Input style={{ flex: 1, marginBottom: 0 }} label="Kg" keyboardType="numeric" value={it.peso_sugerido_kg} onChangeText={(v) => update(i, 'peso_sugerido_kg', v.replace(/[^0-9.]/g, ''))} />
            <Input style={{ flex: 1.1, marginBottom: 0 }} label="Desc. (s)" keyboardType="number-pad" value={it.descanso_segundos} onChangeText={(v) => update(i, 'descanso_segundos', v.replace(/\D/g, ''))} />
          </Row>
        </Card>
      ))}

      <Modal visible={picker} animationType="slide" onRequestClose={() => setPicker(false)}>
        <Screen header={<View style={{ backgroundColor: c.bg }}><Row style={{ padding: space.lg, paddingTop: space.xxl }}><IconButton icon="close" label="Cerrar" onPress={() => setPicker(false)} /><T v="h2">Agregar ejercicio</T></Row></View>}>
          <Input icon="magnify" placeholder="Buscar" value={q} onChangeText={setQ} />
          <Row gap={space.sm} style={{ flexWrap: 'wrap', marginBottom: space.md }}>
            {(catalog.data?.categorias || []).map((k) => (
              <Chip key={k.id_categoria} label={k.nombre_categoria} active={cat === k.id_categoria} onPress={() => setCat(cat === k.id_categoria ? null : k.id_categoria)} />
            ))}
          </Row>
          {catalog.loading ? <Loading /> : options.map((e) => (
            <ListItem key={e.id_ejercicio} onPress={() => add(e)} left={<ExerciseArt url={e.fotografia_url} categoria={e.categoria} size={44} radius={12} />} title={e.nombre} subtitle={`${e.categoria} · ${e.grupo_muscular} · ${e.dificultad}`} right={<Icon name="plus-circle" size={24} color={c.primary} />} />
          ))}
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  addBox: { borderWidth: 2, borderStyle: 'dashed', borderRadius: radius.lg, padding: space.xl, alignItems: 'center', gap: space.sm },
});
