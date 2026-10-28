import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// En el teléfono los tokens se guardan cifrados (SecureStore); en web, en el almacenamiento local.
const isWeb = Platform.OS === 'web';

export const secure = {
  get: async (k) => {
    try {
      return isWeb ? await AsyncStorage.getItem(k) : await SecureStore.getItemAsync(k);
    } catch {
      return null;
    }
  },
  set: async (k, v) => {
    try {
      if (isWeb) await AsyncStorage.setItem(k, v);
      else await SecureStore.setItemAsync(k, v);
    } catch {
      /* sin almacenamiento disponible */
    }
  },
  del: async (k) => {
    try {
      if (isWeb) await AsyncStorage.removeItem(k);
      else await SecureStore.deleteItemAsync(k);
    } catch {
      /* noop */
    }
  },
};
