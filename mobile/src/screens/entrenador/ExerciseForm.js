import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useApi, useAction } from '../../hooks/useApi';
import { Header, Screen } from '../../components/Screen';
import { Banner, Button, Chip, Input, Loading, Row, SectionTitle, T } from '../../components/ui';
import ExerciseArt from '../../components/ExerciseArt';
import { catStyle } from '../../theme/colors';
import { space } from '../../theme/tokens';

const NIVELES = ['Principiante', 'Intermedio', 'Avanzado'];

/** Alta y modificación de ejercicios del catálogo. */
export default function ExerciseForm({ route, navigation }) {
  const ex = route.params?.exercise;
  const { colors: c } = useTheme();
  const { toast, confirm } = useFeedback();
  const meta = useApi('/exercises/list');
  const { run, busy, fieldErrors, formError } = useAction();
  const [f, setF] = useState({
    nombre: ex?.nombre || '',
    descripcion: ex?.descripcion || '',
    recomendacion: ex?.recomendacion || '',
    fotografia_url: ex?.fotografia_url || '',
    id_categoria: ex?.id_categoria || null,
    id_grupo: ex?.id_grupo || null,
    dificultad: ex?.dificultad || null,
  });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const catName = meta.data?.categorias.find((k) => k.id_categoria === f.id_categoria)?.nombre_categoria;

  const save = async () => {
    if (ex && !(await confirm({ title: '¿Guardar cambios?', message: `Se actualizará "${ex.nombre}" en todas las rutinas que lo usan.`, confirmText: 'Guardar' }))) return;
    try {
      await run('/exercises/manage', { accion: ex ? 'editar' : 'crear', ...(ex ? { id_ejercicio: ex.id_ejercicio } : {}), ...f, recomendacion: f.recomendacion || null, fotografia_url: f.fotografia_url || null });
      toast(ex ? 'Ejercicio actualizado' : 'Ejercicio creado');
      navigation.goBack();
    } catch {
      /* errores visibles debajo de cada campo */
    }
  };

  return (
    <Screen header={<Header back title={ex ? 'Editar ejercicio' : 'Nuevo ejercicio'} />} footer={<Button title={ex ? 'Guardar cambios' : 'Crear ejercicio'} icon="content-save" onPress={save} loading={busy} />}>
      {meta.loading ? (
        <Loading />
      ) : (
        <>
          {formError && !Object.keys(fieldErrors).length && <Banner message={formError.message} />}
          <View style={{ alignItems: 'center', marginBottom: space.lg }}>
            <ExerciseArt url={f.fotografia_url} categoria={catName} size="100%" height={150} radius={18} iconScale={0.4} />
            <T v="small" color={c.textSoft} style={{ marginTop: 6 }}>Vista previa</T>
          </View>
          <Input label="Nombre" value={f.nombre} onChangeText={set('nombre')} error={fieldErrors.nombre} placeholder="Ej.: Sentadilla goblet" />
          <SectionTitle title="Categoría" style={{ marginTop: 0 }} />
          <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
            {meta.data.categorias.map((k) => (
              <Chip key={k.id_categoria} label={k.nombre_categoria} icon={catStyle(k.nombre_categoria).icon} color={catStyle(k.nombre_categoria).color} active={f.id_categoria === k.id_categoria} onPress={() => set('id_categoria')(k.id_categoria)} />
            ))}
          </Row>
          {fieldErrors.id_categoria && <T v="small" color={c.danger} style={{ marginTop: 4 }}>Elegí una categoría</T>}
          <SectionTitle title="Grupo muscular" />
          <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
            {meta.data.grupos.map((g) => (
              <Chip key={g.id_grupo} label={g.nombre} active={f.id_grupo === g.id_grupo} onPress={() => set('id_grupo')(g.id_grupo)} />
            ))}
          </Row>
          {fieldErrors.id_grupo && <T v="small" color={c.danger} style={{ marginTop: 4 }}>Elegí un grupo muscular</T>}
          <SectionTitle title="Nivel de dificultad" />
          <Row gap={space.sm} style={{ flexWrap: 'wrap', marginBottom: space.lg }}>
            {NIVELES.map((n) => (
              <Chip key={n} label={n} active={f.dificultad === n} onPress={() => set('dificultad')(n)} />
            ))}
          </Row>
          {fieldErrors.dificultad && <T v="small" color={c.danger} style={{ marginTop: -8, marginBottom: 8 }}>{fieldErrors.dificultad}</T>}
          <Input label="Descripción" multiline value={f.descripcion} onChangeText={set('descripcion')} error={fieldErrors.descripcion} />
          <Input label="Recomendación de ejecución" multiline value={f.recomendacion} onChangeText={set('recomendacion')} error={fieldErrors.recomendacion} placeholder="Técnica, postura, respiración…" />
          <Input label="Fotografía (URL)" icon="image-outline" value={f.fotografia_url} onChangeText={set('fotografia_url')} error={fieldErrors.fotografia_url} autoCapitalize="none" keyboardType="url" placeholder="https://…/foto.jpg" hint="Si la dejás vacía se muestra una ilustración de la categoría." />
        </>
      )}
    </Screen>
  );
}
