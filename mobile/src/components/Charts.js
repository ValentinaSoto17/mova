/** Gráficos livianos dibujados con react-native-svg (barras, líneas y anillo de progreso). */
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect, Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { font } from '../theme/tokens';

export function BarChart({ data, height = 150, color, valueSuffix = '', highlightLast = true }) {
  const { colors: c } = useTheme();
  const [w, setW] = useState(0);
  const max = Math.max(1, ...data.map((d) => d.value || 0));
  const gap = 10;
  const barW = data.length ? Math.max(8, (w - gap * (data.length - 1)) / data.length) : 0;
  const chartH = height - 34;
  const tint = color || c.primary;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityLabel={`Gráfico de barras: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Line x1={0} x2={w} y1={chartH} y2={chartH} stroke={c.border} strokeWidth={1} />
          {data.map((d, i) => {
            const h = d.value ? Math.max(4, (d.value / max) * (chartH - 18)) : 0;
            const x = i * (barW + gap);
            const strong = highlightLast ? i === data.length - 1 : true;
            return (
              <React.Fragment key={i}>
                <Rect x={x} y={0} width={barW} height={chartH} rx={Math.min(8, barW / 2)} fill={c.surfaceAlt} />
                {h > 0 && <Rect x={x} y={chartH - h} width={barW} height={h} rx={Math.min(8, barW / 2)} fill={tint} opacity={strong ? 1 : 0.55} />}
                {!!d.value && (
                  <SvgText x={x + barW / 2} y={chartH - h - 5} fontSize={10} fontFamily={font.bold} fill={c.textMuted} textAnchor="middle">
                    {`${d.value}${valueSuffix}`}
                  </SvgText>
                )}
                <SvgText x={x + barW / 2} y={height - 10} fontSize={11} fontFamily={font.semibold} fill={c.textMuted} textAnchor="middle">
                  {d.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

/** Líneas (una o más series). series: [{ values:[], color, label }] */
export function LineChart({ labels, series, height = 170, unit = '' }) {
  const { colors: c } = useTheme();
  const [w, setW] = useState(0);
  const all = series.flatMap((s) => s.values.filter((v) => v != null));
  const min = all.length ? Math.min(...all) : 0;
  const max = all.length ? Math.max(...all) : 1;
  const pad = (max - min) * 0.15 || 5;
  const lo = Math.floor(min - pad);
  const hi = Math.ceil(max + pad);
  const left = 34;
  const chartW = w - left - 8;
  const chartH = height - 28;
  const X = (i) => left + (labels.length <= 1 ? chartW / 2 : (i / (labels.length - 1)) * chartW);
  const Y = (v) => 8 + (1 - (v - lo) / (hi - lo || 1)) * (chartH - 8);
  const ticks = [lo, Math.round((lo + hi) / 2), hi];

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            {series.map((s, si) => (
              <LinearGradient key={si} id={`g${si}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={s.color} stopOpacity={0.25} />
                <Stop offset="1" stopColor={s.color} stopOpacity={0} />
              </LinearGradient>
            ))}
          </Defs>
          {ticks.map((t, i) => (
            <React.Fragment key={i}>
              <Line x1={left} x2={w - 8} y1={Y(t)} y2={Y(t)} stroke={c.border} strokeDasharray="3 5" />
              <SvgText x={left - 6} y={Y(t) + 4} fontSize={10} fontFamily={font.semibold} fill={c.textSoft} textAnchor="end">
                {t}
              </SvgText>
            </React.Fragment>
          ))}
          {series.map((s, si) => {
            const pts = s.values.map((v, i) => (v == null ? null : [X(i), Y(v)])).filter(Boolean);
            if (!pts.length) return null;
            const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
            const area = `${d} L${pts[pts.length - 1][0]},${chartH} L${pts[0][0]},${chartH} Z`;
            return (
              <React.Fragment key={si}>
                {series.length === 1 && <Path d={area} fill={`url(#g${si})`} />}
                <Path d={d} stroke={s.color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                {pts.map((p, i) => (
                  <Circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill={c.surface} stroke={s.color} strokeWidth={2} />
                ))}
              </React.Fragment>
            );
          })}
          {labels.map((l, i) =>
            labels.length > 8 && i % 2 ? null : (
              <SvgText key={i} x={X(i)} y={height - 6} fontSize={10} fontFamily={font.semibold} fill={c.textMuted} textAnchor="middle">
                {l}
              </SvgText>
            )
          )}
        </Svg>
      )}
      {series.length > 1 && (
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
          {series.map((s) => (
            <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
              <Text style={{ fontFamily: font.semibold, fontSize: 12, color: c.textMuted }}>
                {s.label}
                {unit ? ` (${unit})` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function Ring({ size = 110, stroke = 11, progress = 0, color, track, children }) {
  const { colors: c } = useTheme();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track || 'rgba(255,255,255,0.25)'} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color || c.primary}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - p)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
