import React from 'react';
import { View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useApi, useAction } from '../../hooks/useApi';
import { Header, Screen } from '../../components/Screen';
import { Badge, Button, Card, ErrorState, Icon, Loading, Row, T } from '../../components/ui';
import ExerciseArt from '../../components/ExerciseArt';
import { groupIcon } from '../../theme/colors';
import { space } from '../../theme/tokens';

export default function ExerciseDetail({ route, navigation }) {
  const { id_ejercicio } = route.params;
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const { confirm, toast } = useFeedback();
  const { data: e, error, loading, reload } = useApi('/exercises/detail', { id_ejercicio });
  const { run, busy } = useAction();
  const canEdit = e && (user.rol === 'Administrador' || (user.rol === 'Entrenador' && e.creado_por === user.id_usuario));

  const remove = async () => {
    const yes = await confirm({ title: '¿Eliminar ejercicio?', message: `"${e.nombre}" dejará de estar en el catálogo. Esta acción no se puede deshacer desde la app.`, confirmText: 'Eliminar', danger: true });
    if (!yes) return;
    try {
      await run('/exercises/manage', { accion: 'eliminar', id_ejercicio, confirmacion: true });
      toast('Ejercicio eliminado');
      navigation.goBack();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <Screen
      header={<Header back title={e?.nombre || 'Ejercicio'} subtitle={e?.categoria} />}
      footer={
        canEdit ? (
          <Row>
            <Button title="Editar" icon="pencil" style={{ flex: 1 }} onPress={() => navigation.navigate('ExerciseForm', { exercise: e })} />
            <Button title="Eliminar" icon="delete-outline" variant="outline" style={{ flex: 1 }} onPress={remove} loading={busy} />
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
          <ExerciseArt url={e.fotografia_url} categoria={e.categoria} size="100%" height={220} radius={22} iconScale={0.4} />
          <T v="display" style={{ marginTop: space.lg }}>{e.nombre}</T>
          <Row gap={space.sm} style={{ flexWrap: 'wrap', marginTop: space.sm }}>
            <Badge label={e.categoria} kind="primary" icon="tag" />
            <Badge label={e.grupo_muscular} kind="info" icon={groupIcon[e.grupo_muscular] || 'human'} />
            <Badge label={e.dificultad} kind={e.dificultad === 'Avanzado' ? 'danger' : e.dificultad === 'Intermedio' ? 'warning' : 'success'} icon="signal-cellular-2" />
          </Row>
          <Card style={{ marginTop: space.lg }}>
            <T v="caption" color={c.textMuted}>Descripción</T>
            <T v="body" style={{ marginTop: 6 }}>{e.descripcion}</T>
          </Card>
          {!!e.recomendacion && (
            <Card style={{ marginTop: space.md, backgroundColor: c.goldSoft, borderColor: c.gold + '44' }}>
              <Row gap={8}>
                <Icon name="lightbulb-on" size={20} color={c.gold} />
                <T v="caption" color={c.text}>Recomendación de ejecución</T>
              </Row>
              <T v="body" style={{ marginTop: 6 }}>{e.recomendacion}</T>
            </Card>
          )}
          {!!e.autor && (
            <View style={{ marginTop: space.lg }}>
              <T v="small" color={c.textSoft}>Cargado por {e.autor}</T>
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
