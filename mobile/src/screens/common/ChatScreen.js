import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Header } from '../../components/Screen';
import { Banner, ErrorState, Icon, Loading, T } from '../../components/ui';
import { font, MAX_WIDTH, radius, space } from '../../theme/tokens';
import { fDateLong, fTime } from '../../utils/format';

export default function ChatScreen({ route }) {
  const { tipo, id, nombre } = route.params;
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, setData, error, loading, reload } = useApi('/messages/thread', { tipo, id });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const list = useRef(null);

  // Actualiza la conversación cada 8 segundos
  useEffect(() => {
    const t = setInterval(() => reload(), 8000);
    return () => clearInterval(t);
  }, [reload]);

  const send = async () => {
    const contenido = text.trim();
    if (!contenido) return;
    setSending(true);
    setSendError(null);
    try {
      const msg = await api('/messages/send', { tipo, id, contenido });
      setData((d) => ({ ...d, mensajes: [...(d?.mensajes || []), msg] }));
      setText('');
    } catch (e) {
      setSendError(e);
    } finally {
      setSending(false);
    }
  };

  const msgs = data?.mensajes || [];
  const titulo = data?.titulo?.nombre || nombre || (tipo === 'gimnasio' ? 'Gimnasio MOVA' : 'Chat');

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header back title={titulo} subtitle={data?.titulo?.rol || (tipo === 'proveedor' ? 'Distribuidora · se envía por email' : '')} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <FlatList
            ref={list}
            data={msgs}
            keyExtractor={(m) => String(m.id_mensaje)}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
            contentContainerStyle={{ padding: space.lg, gap: 6, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', flexGrow: 1 }}
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl }}>
                <Icon name="chat-outline" size={40} color={c.textSoft} />
                <T v="small" color={c.textMuted} style={{ textAlign: 'center', marginTop: space.sm }}>
                  {tipo === 'gimnasio' ? 'Escribí tu consulta: la responde el dueño o un entrenador.' : 'Todavía no hay mensajes. ¡Saludá!'}
                </T>
              </View>
            }
            renderItem={({ item: m, index }) => {
              const prev = msgs[index - 1];
              const newDay = !prev || String(prev.fecha_envio).slice(0, 10) !== String(m.fecha_envio).slice(0, 10);
              const showName = !m.mio && (tipo === 'gimnasio' || tipo === 'proveedor') && (!prev || prev.id_emisor !== m.id_emisor);
              return (
                <>
                  {newDay && (
                    <T v="caption" color={c.textSoft} style={{ textAlign: 'center', marginVertical: space.md }}>
                      {fDateLong(m.fecha_envio)}
                    </T>
                  )}
                  <View style={[styles.bubble, m.mio ? [styles.mine, { backgroundColor: c.primary }] : [styles.theirs, { backgroundColor: c.surface, borderColor: c.border }]]}>
                    {showName && (
                      <T v="small" color={c.primary} style={{ fontFamily: font.bold, fontSize: 12 }}>
                        {m.emisor}{m.rol_emisor ? ` · ${m.rol_emisor}` : ''}
                      </T>
                    )}
                    <T v="body" color={m.mio ? c.primaryText : c.text}>{m.contenido}</T>
                    <T v="small" color={m.mio ? c.primaryText : c.textSoft} style={{ fontSize: 10.5, alignSelf: 'flex-end', opacity: 0.8 }}>
                      {fTime(m.fecha_envio)}
                      {m.mio && tipo === 'usuario' ? (m.leido ? '  ✓✓' : '  ✓') : ''}
                    </T>
                  </View>
                </>
              );
            }}
          />
        )}
        <View style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: insets.bottom + space.sm }]}>
          <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
            {sendError && <Banner message={`${sendError.message}${sendError.status ? ` (${sendError.status})` : ''}`} />}
            <View style={styles.row}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Escribí un mensaje…"
                placeholderTextColor={c.textSoft}
                multiline
                maxLength={1000}
                style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.text }]}
                accessibilityLabel="Mensaje"
              />
              <Pressable
                onPress={send}
                disabled={sending || !text.trim()}
                accessibilityRole="button"
                accessibilityLabel="Enviar"
                style={({ pressed }) => [styles.send, { backgroundColor: c.primary, opacity: sending || !text.trim() ? 0.5 : pressed ? 0.8 : 1 }]}
              >
                <Icon name="send" size={20} color={c.primaryText} />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.lg, gap: 2 },
  mine: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', borderBottomLeftRadius: 6, borderWidth: 1 },
  bar: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.sm, paddingHorizontal: space.md },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, fontFamily: font.medium, fontSize: 15, outlineStyle: 'none' },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
