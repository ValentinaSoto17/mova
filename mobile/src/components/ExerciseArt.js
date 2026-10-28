import React, { useState } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { catStyle } from '../theme/colors';

/**
 * Imagen del ejercicio. Si tiene fotografía (URL) se muestra; si no, o si falla la carga,
 * se dibuja una ilustración con el color e ícono de su categoría.
 */
export default function ExerciseArt({ url, categoria, size = 64, height, radius = 16, iconScale = 0.5 }) {
  const [failed, setFailed] = useState(false);
  const h = height || size;
  const st = catStyle(categoria);
  if (url && !failed) {
    return (
      <Image
        source={{ uri: url }}
        onError={() => setFailed(true)}
        style={{ width: size === '100%' ? '100%' : size, height: h, borderRadius: radius }}
        resizeMode="cover"
        accessibilityLabel="Fotografía del ejercicio"
      />
    );
  }
  const iconSize = Math.min(typeof size === 'number' ? size : 400, h) * iconScale;
  return (
    <LinearGradient
      colors={[st.color, shade(st.color)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: h, borderRadius: radius, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      <View style={[styles.blob, { width: h * 0.9, height: h * 0.9, borderRadius: h, top: -h * 0.3, right: -h * 0.25 }]} />
      <View style={[styles.blob, { width: h * 0.6, height: h * 0.6, borderRadius: h, bottom: -h * 0.25, left: -h * 0.1, opacity: 0.08 }]} />
      <MaterialCommunityIcons name={st.icon} size={iconSize} color="#FFFFFF" />
    </LinearGradient>
  );
}

// Oscurece un color hex para el degradé
function shade(hex, amt = -40) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt);
  const b = clamp((n & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', backgroundColor: '#FFFFFF', opacity: 0.12 },
});
