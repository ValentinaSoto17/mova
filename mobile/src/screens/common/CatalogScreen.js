import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useApi } from '../../hooks/useApi';
import { Header, Screen, HeaderAction } from '../../components/Screen';
import { Badge, Card, Chip, Empty, ErrorState, Icon, Input, Loading, Row, SectionTitle, T } from '../../components/ui';
import ExerciseArt from '../../components/ExerciseArt';
import { catStyle } from '../../theme/colors';
import { font, radius, space } from '../../theme/tokens';

const NIVELES = ['Principiante', 'Intermedio', 'Avanzado'];

/** Catálogo de ejercicios organizado en tarjetas por categoría (nombres completos). */
export default function CatalogScreen({ navigation, route }) {
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const { width } = useWindowDimensions();
  const { data, error, loading, refreshing, refresh, reload } = useApi('/exercises/list');
  const [cat, setCat] = useState(null);
  const [nivel, setNivel] = useState(null);
  const [q, setQ] = useState('');
  const staff = user.rol !== 'Alumno';
  const cols = width >= 640 ? 3 : 2;

  const list = useMemo(() => {
    if (!data) return [];
    return data.ejercicios.filter(
      (e) =>
        (!cat || e.id_categoria === cat) &&
        (!nivel || e.dificultad === nivel) &&
        (!q || e.nombre.toLowerCase().includes(q.toLowerCase()) || e.grupo_muscular.toLowerCase().includes(q.toLowerCase()))
    );
  }, [data, cat, nivel, q]);

  const catName = data?.categorias.find((x) => x.id_categoria === cat)?.nombre_categoria;

  return (
    <Screen
      header={
        <Header
          back={!!route?.params?.back}
          title="Ejercicios"
          subtitle={staff ? 'Catálogo y stock de ejercicios' : 'Explorá el catálogo'}
          right={staff ? <HeaderAction icon="plus" label="Nuevo ejercicio" onPress={() => navigation.navigate('ExerciseForm', { categorias: data?.categorias, grupos: data?.grupos })} /> : null}
        />
      }
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <Input icon="magnify" placeholder="Buscar por nombre o grupo muscular" value={q} onChangeText={setQ} />
          <View style={styles.grid}>
            {data.categorias.map((k) => {
              const st = catStyle(k.nombre_categoria);
              const active = cat === k.id_categoria;
              return (
                <Pressable
                  key={k.id_categoria}
                  onPress={() => setCat(active ? null : k.id_categoria)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [{ width: `${100 / cols}%`, padding: 5, opacity: pressed ? 0.85 : 1 }]}
                >
                  <LinearGradient colors={[st.color, st.color + 'CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.catCard, active && { borderColor: c.text, borderWidth: 3 }]}>
                    <View style={styles.catBlob} />
                    <Icon name={st.icon} size={30} color="#fff" />
                    <Text style={styles.catName}>{k.nombre_categoria}</Text>
                    <Text style={styles.catCount}>{k.cantidad} ejercicios</Text>
                    {active && (
                      <View style={styles.catCheck}>
                        <Icon name="check" size={14} color={st.color} />
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>

          <Row gap={space.sm} style={{ flexWrap: 'wrap', marginTop: space.md }}>
            {NIVELES.map((n) => (
              <Chip key={n} label={n} active={nivel === n} onPress={() => setNivel(nivel === n ? null : n)} />
            ))}
          </Row>

          <SectionTitle title={catName || 'Todos los ejercicios'} action={cat || nivel || q ? 'Limpiar filtros' : null} onAction={() => { setCat(null); setNivel(null); setQ(''); }} />
          {!list.length ? (
            <Empty icon="magnify-close" title="Sin resultados" message="Probá con otro filtro o búsqueda." />
          ) : (
            list.map((e) => (
              <Card key={e.id_ejercicio} padded={false} style={{ marginBottom: space.sm }} onPress={() => navigation.navigate('ExerciseDetail', { id_ejercicio: e.id_ejercicio })}>
                <Row style={{ padding: space.md }}>
                  <ExerciseArt url={e.fotografia_url} categoria={e.categoria} size={72} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <T v="h3">{e.nombre}</T>
                    <T v="small" color={c.textMuted} numberOfLines={2}>{e.descripcion}</T>
                    <Row gap={6} style={{ flexWrap: 'wrap' }}>
                      <Badge label={e.grupo_muscular} kind="muted" />
                      <Badge label={e.dificultad} kind={e.dificultad === 'Avanzado' ? 'danger' : e.dificultad === 'Intermedio' ? 'warning' : 'success'} />
                    </Row>
                  </View>
                </Row>
              </Card>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  catCard: { borderRadius: radius.lg, padding: space.lg, minHeight: 118, overflow: 'hidden', justifyContent: 'flex-end', borderWidth: 3, borderColor: 'transparent' },
  catBlob: { position: 'absolute', width: 110, height: 110, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.14)', top: -30, right: -30 },
  catName: { color: '#fff', fontFamily: font.extrabold, fontSize: 15, marginTop: space.sm },
  catCount: { color: 'rgba(255,255,255,0.85)', fontFamily: font.semibold, fontSize: 12 },
  catCheck: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
