import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useApi, useAction } from '../../hooks/useApi';
import { Header, Screen } from '../../components/Screen';
import { Badge, Button, Card, ErrorState, Icon, IconButton, Loading, Pill, Row, T } from '../../components/ui';
import ExerciseArt from '../../components/ExerciseArt';
import { space } from '../../theme/tokens';

export default function RoutineDetail({ route, navigation }) {
  const { id_rutina, start } = route.params;
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const { confirm, toast } = useFeedback();
  const { data: r, error, loading, reload } = useApi('/routines/detail', { id_rutina });
  const { run } = useAction();
  const isStudent = user.rol === 'Alumno';
  const canEdit = !isStudent && r && (user.rol === 'Administrador' || r.id_entrenador === user.id_usuario);

  useEffect(() => {
    if (start && r?.asignacion) navigation.replace('Workout', { routine: r });
  }, [start, r]);

  const remove = async () => {
    const yes = await confirm({
      title: '¿Eliminar rutina?',
      message: `"${r.nombre_rutina}" se dará de baja${r.asignaciones_activas ? ` y se quitará a ${r.asignaciones_activas} alumno(s)` : ''}. El historial se conserva.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!yes) return;
    try {
      await run('/routines/manage', { accion: 'eliminar', id_rutina, confirmacion: true });
      toast('Rutina eliminada');
      navigation.goBack();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <Screen
      header={
        <Header
          back
          title={r?.nombre_rutina || 'Rutina'}
          subtitle={r ? `por ${r.entrenador}` : ''}
          right={canEdit ? <IconButton icon="pencil" label="Editar" onPress={() => navigation.navigate('RoutineForm', { routine: r })} /> : null}
        />
      }
      footer={
        r && isStudent ? (
          <Button title="Empezar entrenamiento" icon="play" onPress={() => navigation.navigate('Workout', { routine: r })} />
        ) : r && !isStudent ? (
          <Row>
            <Button title="Asignar" icon="account-plus" onPress={() => navigation.navigate('AssignRoutine', { routine: r })} style={{ flex: 1 }} />
            {canEdit && <Button title="Eliminar" icon="delete-outline" variant="outline" onPress={remove} style={{ flex: 1 }} />}
          </Row>
        ) : null
      }
    >
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <Card style={{ marginBottom: space.lg }}>
            {!!r.descripcion && <T v="body" color={c.textMuted}>{r.descripcion}</T>}
            <Row style={{ marginTop: space.md, flexWrap: 'wrap' }} gap={space.lg}>
              <Pill icon="format-list-numbered" text={`${r.ejercicios.length} ejercicios`} />
              <Pill icon="clock-outline" text={`${r.duracion_estimada_min} min aprox.`} />
              {!!r.categorias && <Pill icon="tag-outline" text={r.categorias} />}
            </Row>
          </Card>
          {r.ejercicios.map((e, i) => (
            <Card key={e.id_detalle} style={{ marginBottom: space.sm }} padded={false} onPress={() => navigation.navigate('ExerciseDetail', { id_ejercicio: e.id_ejercicio })}>
              <Row style={{ padding: space.md }}>
                <View>
                  <ExerciseArt url={e.fotografia_url} categoria={e.categoria} size={64} />
                  <View style={{ position: 'absolute', top: -6, left: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center' }}>
                    <T v="small" color={c.bg} style={{ fontSize: 11 }}>{i + 1}</T>
                  </View>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <T v="h3">{e.nombre}</T>
                  <T v="small" color={c.textMuted}>{e.grupo_muscular} · {e.dificultad}</T>
                  <Row gap={6} style={{ flexWrap: 'wrap', marginTop: 2 }}>
                    <Badge label={`${e.series} × ${e.repeticiones}`} kind="primary" icon="repeat" />
                    {e.peso_sugerido_kg != null && <Badge label={`${e.peso_sugerido_kg} kg`} kind="warning" icon="weight-kilogram" />}
                    <Badge label={`${e.descanso_segundos}s descanso`} kind="muted" icon="timer-sand" />
                  </Row>
                </View>
                <Icon name="chevron-right" size={22} color={c.textSoft} />
              </Row>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
