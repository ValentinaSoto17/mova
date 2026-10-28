/**
 * Requisito: NO usar alerts nativos. Este proveedor ofrece:
 *  - toast(): avisos integrados en la UI (éxito, error, info)
 *  - confirm(): diálogo de confirmación propio para eliminar / acciones críticas
 */
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { font, radius, space, type, shadow } from '../theme/tokens';

const FeedbackContext = createContext(null);

const KIND = {
  success: { icon: 'check-circle', key: 'success' },
  error: { icon: 'alert-circle', key: 'danger' },
  info: { icon: 'information', key: 'info' },
  warning: { icon: 'alert', key: 'warning' },
};

export function FeedbackProvider({ children }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [toastState, setToastState] = useState(null);
  const [dialog, setDialog] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const toast = useCallback(
    (message, kind = 'success') => {
      clearTimeout(timer.current);
      setToastState({ message, kind });
      Animated.spring(anim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', friction: 8 }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start(() => setToastState(null));
      }, 3200);
    },
    [anim]
  );

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setDialog({ ...opts, resolve });
      }),
    []
  );

  const close = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  const k = toastState ? KIND[toastState.kind] || KIND.info : KIND.info;

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      {toastState && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastWrap,
            { top: insets.top + 8, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] },
          ]}
        >
          <Pressable
            onPress={() => setToastState(null)}
            accessibilityRole="alert"
            style={[styles.toast, { backgroundColor: c.elevated, borderColor: c.border }, shadow(c, 2)]}
          >
            <View style={[styles.toastIcon, { backgroundColor: c[`${k.key}Soft`] }]}>
              <MaterialCommunityIcons name={k.icon} size={20} color={c[k.key]} />
            </View>
            <Text style={[type.small, { color: c.text, flex: 1, fontFamily: font.semibold }]}>{toastState.message}</Text>
          </Pressable>
        </Animated.View>
      )}

      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => close(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={() => close(false)}>
          <Pressable style={[styles.dialog, { backgroundColor: c.surface }, shadow(c, 3)]} onPress={() => {}}>
            <View style={[styles.dialogIcon, { backgroundColor: dialog?.danger ? c.dangerSoft : c.primarySoft }]}>
              <MaterialCommunityIcons
                name={dialog?.icon || (dialog?.danger ? 'delete-alert' : 'help-circle')}
                size={28}
                color={dialog?.danger ? c.danger : c.primary}
              />
            </View>
            <Text style={[type.h2, { color: c.text, textAlign: 'center' }]}>{dialog?.title}</Text>
            {!!dialog?.message && (
              <Text style={[type.body, { color: c.textMuted, textAlign: 'center', marginTop: space.sm }]}>{dialog.message}</Text>
            )}
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => close(false)}
                style={({ pressed }) => [styles.dialogBtn, { backgroundColor: c.surfaceAlt, opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={[styles.dialogBtnText, { color: c.text }]}>{dialog?.cancelText || 'Cancelar'}</Text>
              </Pressable>
              <Pressable
                onPress={() => close(true)}
                style={({ pressed }) => [styles.dialogBtn, { backgroundColor: dialog?.danger ? c.danger : c.primary, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={[styles.dialogBtnText, { color: '#fff' }]}>{dialog?.confirmText || 'Confirmar'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </FeedbackContext.Provider>
  );
}

export const useFeedback = () => useContext(FeedbackContext);

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.lg, zIndex: 1000 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    width: '100%',
    maxWidth: 520,
  },
  toastIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  dialog: { width: '100%', maxWidth: 400, borderRadius: radius.xl, padding: space.xl, alignItems: 'center' },
  dialogIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  dialogActions: { flexDirection: 'row', gap: space.md, marginTop: space.xl, alignSelf: 'stretch' },
  dialogBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  dialogBtnText: { fontFamily: font.bold, fontSize: 15 },
});
