import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Rect, G, Ellipse } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { font } from '../theme/tokens';

const STAR = 'M0,-52 C7,-13 13,-7 52,0 C13,7 7,13 0,52 C-7,13 -13,7 -52,0 C-13,-7 -7,-13 0,-52 Z';
const HEART = 'M0,62 C-84,12 -94,-50 -52,-67 C-26,-77 -6,-62 0,-46 C6,-62 26,-77 52,-67 C94,-50 84,12 0,62 Z';

/** Isotipo de MOVA: mancuerna + corazón con pulso + destellos (igual en los 3 perfiles). */
export function LogoMark({ size = 40 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Defs>
        <LinearGradient id="plate" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#A3A8FF" />
          <Stop offset="0.55" stopColor="#7B80F5" />
          <Stop offset="1" stopColor="#5A5ED8" />
        </LinearGradient>
        <LinearGradient id="plateDark" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5D61D9" />
          <Stop offset="1" stopColor="#3F42B0" />
        </LinearGradient>
        <LinearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFF4EE" />
          <Stop offset="1" stopColor="#F3C9BD" />
        </LinearGradient>
        <LinearGradient id="collar" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F7A39A" />
          <Stop offset="1" stopColor="#DE6F67" />
        </LinearGradient>
        <LinearGradient id="heart" x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="#FF9A9A" />
          <Stop offset="0.6" stopColor="#F7737B" />
          <Stop offset="1" stopColor="#E4505E" />
        </LinearGradient>
        <LinearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE08A" />
          <Stop offset="0.5" stopColor="#FFC046" />
          <Stop offset="1" stopColor="#F29A1F" />
        </LinearGradient>
      </Defs>
      <Path transform="translate(150 168) scale(1.05)" fill="url(#gold)" d={STAR} />
      <Path transform="translate(92 92) scale(0.5)" fill="url(#gold)" d={STAR} />
      <G transform="translate(346 150) scale(1.22)">
        <Path fill="url(#heart)" d={HEART} />
        <Ellipse cx="-38" cy="-44" rx="18" ry="10" fill="#FFFFFF" opacity={0.45} transform="rotate(-30 -38 -44)" />
        <Path fill="none" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" d="M-78,-4 L-30,-4 L-16,-30 L2,26 L18,-14 L28,-2 L78,-2" />
      </G>
      <G transform="translate(256 374) rotate(-16)">
        <Rect x={-196} y={-13} width={392} height={26} rx={13} fill="url(#bar)" />
        <Rect x={-100} y={-26} width={22} height={52} rx={8} fill="url(#collar)" />
        <Rect x={-152} y={-96} width={52} height={192} rx={24} fill="url(#plateDark)" />
        <Rect x={-146} y={-100} width={50} height={190} rx={24} fill="url(#plate)" />
        <Rect x={-184} y={-70} width={38} height={140} rx={18} fill="url(#plateDark)" />
        <Rect x={-180} y={-74} width={36} height={138} rx={18} fill="url(#plate)" />
        <Rect x={-138} y={-86} width={10} height={120} rx={5} fill="#FFFFFF" opacity={0.28} />
        <Rect x={78} y={-26} width={22} height={52} rx={8} fill="url(#collar)" />
        <Rect x={100} y={-96} width={52} height={192} rx={24} fill="url(#plateDark)" />
        <Rect x={96} y={-100} width={50} height={190} rx={24} fill="url(#plate)" />
        <Rect x={146} y={-70} width={38} height={140} rx={18} fill="url(#plateDark)" />
        <Rect x={144} y={-74} width={36} height={138} rx={18} fill="url(#plate)" />
        <Rect x={106} y={-86} width={10} height={120} rx={5} fill="#FFFFFF" opacity={0.28} />
      </G>
    </Svg>
  );
}

/** Logo completo: isotipo + "MOVA" (+ lema opcional). */
export function Logo({ size = 40, showText = true, tagline = false, color }) {
  const { colors: c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.2 }}>
      <LogoMark size={size} />
      {showText && (
        <View>
          <Text style={{ fontFamily: font.extrabold, fontSize: size * 0.55, letterSpacing: size * 0.04, color: color || c.text }}>MOVA</Text>
          {tagline && (
            <Text style={{ fontFamily: font.semibold, fontSize: Math.max(10, size * 0.22), color: c.textMuted, marginTop: -2 }}>
              Entrena. Progresa. Evoluciona.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
