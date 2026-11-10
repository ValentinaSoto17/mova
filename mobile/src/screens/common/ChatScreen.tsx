import React, { useCallback, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Header } from '../../components/Screen';
import { Banner, ErrorState, Icon, Loading, T } from '../../components/ui';
import { font, MAX_WIDTH, radius, space } from '../../theme/tokens';
import { fDateLong, fTime } from '../../utils/format';

export interface ChatScreenProps {
  route?: any;
}

export default function ChatScreen({ route }: ChatScreenProps) {
  const { tipo, id, nombre } = route.params;
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, setData, error, loading, reload } = useApi('/messages/thread', { tipo, id });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<any>(null);
  const list = useRef(null);
  const lastCount = useRef(0);
  const [emailNote, setEmailNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [editMail, setEditMail] = useState(false);
  const [newMail, setNewMail] = useState('');
  const [mailError, setMailError] = useState<string | null>(null);

  // Chat en tiempo real: mientras la conversación está abierta se actualiza cada 3 segundos
  // (se pausa si la pestaña del navegador no está visible, para no gastar datos).
  useFocusEffect(
    useCallback(() => {
      const t = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        reload('poll');
      }, 3000);
      return () => clearInterval(t);
    }, [reload])
  );

  // Baja al último mensaje solo cuando llega uno nuevo (no mientras se leen mensajes viejos)
  const scrollIfNew = () => {
    const n = data?.mensajes?.length || 0;
    if (n !== lastCount.current) {
      lastCount.current = n;
      list.current?.scrollToEnd({ animated: true });
    }
  };

  // Cambiar el email de la distribuidora (solo administrador)
  const saveMail = async () => {
    setMailError(null);
    try {
      const t = data?.titulo || {};
      await api('/messages/suppliers', { accion: 'editar', id_proveedor: id, nombre: t.nombre, rubro: t.rol, email: newMail.trim(), telefono: t.telefono || null });
      setData((d) => ({ ...d, titulo: { ...d.titulo, email: newMail.trim() } }));
      setEditMail(false);
      setEmailNote({ ok: true, text: `Listo: los próximos mensajes se envían a ${newMail.trim()}` });
    } catch (e) {
      setMailError(e.fields?.email || e.message);
    }
  };

  const send = async () => {
    const contenido = text.trim();
    if (!contenido) return;
    setSending(true);
    setSendError(null);
    try {
      const msg = await api('/messages/send', { tipo, id, contenido });
      setData((d) => ({ ...d, mensajes: [...(d?.mensajes || []), msg] }));
      setText('');
      if (msg?.email) {
        setEmailNote(
          msg.email.enviado
            ? { ok: true, text: `Enviado por email a ${msg.email.destino}` }
            : { ok: false, text: msg.email.error || `No se envió el email (el servidor no tiene configurado el envío de correos). El mensaje quedó guardado en MOVA.` }
        );
      }
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
      <Header
        back
        title={titulo}
        subtitle={tipo === 'proveedor' ? `Distribuidora · ${data?.titulo?.email || 'se envía por email'}` : data?.titulo?.rol || ''}
      />
      {tipo === 'proveedor' && data?.titulo && (
        <View style={[styles.mailBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
          <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', gap: space.sm }}>
            {editMail ? (
              <View style={styles.row}>
                <TextInput
                  value={newMail}
                  onChangeText={setNewMail}
                  placeholder="email@distribuidora.com"
                  placeholderTextColor={c.textSoft}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.text }]}
                  accessibilityLabel="Email de la distribuidora"
                />
                <Pressable onPress={saveMail} accessibilityRole="button" style={[styles.mailBtn, { backgroundColor: c.primary }]}>
                  <T v="small" color={c.primaryText} style={{ fontFamily: font.bold }}>Guardar</T>
                </Pressable>
                <Pressable onPress={() => { setEditMail(false); setMailError(null); }} accessibilityRole="button" style={styles.mailBtn}>
                  <T v="small" color={c.textMuted} style={{ fontFamily: font.bold }}>Cancelar</T>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.row, { alignItems: 'center' }]}>
                <Icon name="email-fast-outline" size={18} color={c.primary} />
                <T v="small" color={c.textMuted} style={{ flex: 1 }}>
                  Cada mensaje se envía por email a <T v="small" color={c.text} style={{ fontFamily: font.bold }}>{data.titulo.email}</T>. Las respuestas llegan al Gmail del gimnasio.
                </T>
                <Pressable onPress={() => { setNewMail(data.titulo.email || ''); setEditMail(true); }} accessibilityRole="button">
                  <T v="small" color={c.primary} style={{ fontFamily: font.bold }}>Cambiar email</T>
                </Pressable>
              </View>
            )}
            {mailError && <Banner message={mailError} />}
          </View>
        </View>
      )}
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
            onContentSizeChange={scrollIfNew}
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
            {emailNote && <Banner kind={emailNote.ok ? 'success' : 'warning'} message={emailNote.text} />}
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
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, fontFamily: font.medium, fontSize: 15, outlineStyle: 'none' as any },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  mailBar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: space.sm, paddingHorizontal: space.lg },
  mailBtn: { height: 44, paddingHorizontal: space.md, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});