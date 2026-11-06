/**
 * Tipos compartidos de MOVA (TypeScript).
 * Describen los datos que llegan de la API y las props comunes de los componentes.
 */
export type Rol = 'Administrador' | 'Entrenador' | 'Alumno';
export type EstadoUsuario = 'activo' | 'bloqueado';

export interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  estado: EstadoUsuario;
  telefono?: string | null;
  fecha_nacimiento?: string | null;
  altura_cm?: number | null;
  peso_kg?: number | null;
  objetivo?: string | null;
  avatar_url?: string | null;
  id_entrenador?: number | null;
  email_verificado?: boolean | number;
  doble_factor?: boolean | number;
  [key: string]: any;
}

/** Respuesta estándar de la API: { ok, data } o { ok: false, error } */
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; fields?: Record<string, string>; [key: string]: any };
}

/** Datos que el login social le pasa al servidor */
export interface SocialPayload {
  provider: 'google' | 'github' | 'discord' | 'facebook' | 'apple';
  idToken?: string;
  accessToken?: string;
  code?: string;
  codeVerifier?: string;
  redirectUri?: string;
  demo?: boolean;
  demoAccount?: 'nuevo' | 'existente';
}

/** Paso siguiente del login (verificación de email o doble factor) */
export interface AuthStep {
  step?: 'verify_email' | 'two_factor';
  pendingToken?: string;
  email?: string;
  devCode?: string;
  done?: boolean;
  [key: string]: any;
}

export interface BarDatum {
  label: string;
  value: number;
  [key: string]: any;
}

export interface LineSeries {
  name?: string;
  color?: string;
  values: (number | null)[];
  [key: string]: any;
}

export interface SegmentOption {
  value: any;
  label: string;
  [key: string]: any;
}

/** Props que React Navigation le pasa a cada pantalla */
export interface ScreenProps {
  navigation: any;
  route: { key?: string; name?: string; params?: any };
}
