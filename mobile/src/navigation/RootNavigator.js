/**
 * Navegación (React Navigation):
 *  - Stack raíz: pantallas de acceso o la app + pantallas de detalle.
 *  - Drawer (menú desplegable con el logo): secciones generales.
 *  - Tabs inferiores: secciones principales, distintas para cada rol.
 */
import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Icon, Loading } from '../components/ui';
import { font } from '../theme/tokens';
import DrawerContent from './DrawerContent';

// Acceso
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import VerifyScreen from '../screens/auth/VerifyScreen';
import ForgotScreen from '../screens/auth/ForgotScreen';
import BlockedScreen from '../screens/auth/BlockedScreen';
// Alumno
import StudentHome from '../screens/alumno/StudentHome';
import MyRoutines from '../screens/alumno/MyRoutines';
import WorkoutScreen from '../screens/alumno/WorkoutScreen';
import LoansScreen from '../screens/alumno/LoansScreen';
// Entrenador
import TrainerHome from '../screens/entrenador/TrainerHome';
import StudentsScreen from '../screens/entrenador/StudentsScreen';
import RoutinesManage from '../screens/entrenador/RoutinesManage';
import RoutineForm from '../screens/entrenador/RoutineForm';
import ExerciseForm from '../screens/entrenador/ExerciseForm';
import AssignRoutine from '../screens/entrenador/AssignRoutine';
// Administrador
import AdminHome from '../screens/admin/AdminHome';
import UsersPanel from '../screens/admin/UsersPanel';
import UserForm from '../screens/admin/UserForm';
import EquipmentScreen from '../screens/admin/EquipmentScreen';
import ActivityScreen from '../screens/admin/ActivityScreen';
import MembershipsScreen from '../screens/admin/MembershipsScreen';
// Comunes
import CatalogScreen from '../screens/common/CatalogScreen';
import ExerciseDetail from '../screens/common/ExerciseDetail';
import RoutineDetail from '../screens/common/RoutineDetail';
import ProgressScreen from '../screens/common/ProgressScreen';
import UserDetail from '../screens/common/UserDetail';
import MessagesScreen from '../screens/common/MessagesScreen';
import ChatScreen from '../screens/common/ChatScreen';
import NewChatScreen from '../screens/common/NewChatScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import NotificationsScreen from '../screens/common/NotificationsScreen';
import ManualScreen from '../screens/common/ManualScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

const TABS = {
  Alumno: [
    { name: 'Inicio', component: StudentHome, icon: 'home-variant' },
    { name: 'Rutinas', component: MyRoutines, icon: 'clipboard-list' },
    { name: 'Ejercicios', component: CatalogScreen, icon: 'dumbbell' },
    { name: 'Progreso', component: ProgressScreen, icon: 'chart-line' },
    { name: 'Mensajes', component: MessagesScreen, icon: 'message-text' },
  ],
  Entrenador: [
    { name: 'Inicio', component: TrainerHome, icon: 'home-variant' },
    { name: 'Alumnos', component: StudentsScreen, icon: 'account-group' },
    { name: 'Rutinas', component: RoutinesManage, icon: 'clipboard-list' },
    { name: 'Ejercicios', component: CatalogScreen, icon: 'dumbbell' },
    { name: 'Mensajes', component: MessagesScreen, icon: 'message-text' },
  ],
  Administrador: [
    { name: 'Inicio', component: AdminHome, icon: 'view-dashboard' },
    { name: 'Usuarios', component: UsersPanel, icon: 'account-cog' },
    { name: 'Stock', component: EquipmentScreen, icon: 'package-variant' },
    { name: 'Actividad', component: ActivityScreen, icon: 'clipboard-pulse' },
    { name: 'Mensajes', component: MessagesScreen, icon: 'message-text' },
  ],
};

function RoleTabs() {
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const tabs = TABS[user?.rol] || TABS.Alumno;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textSoft,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          height: 64 + Math.max(insets.bottom, 8),
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarItemStyle: { height: 56 },
        tabBarLabelStyle: { fontFamily: font.bold, fontSize: 11, lineHeight: 14 },
        tabBarIcon: ({ color }) => {
          const t = tabs.find((x) => x.name === route.name);
          return <Icon name={t.icon} size={24} color={color} />;
        },
      })}
    >
      {tabs.map((t) => (
        <Tab.Screen key={t.name} name={t.name} component={t.component} />
      ))}
    </Tab.Navigator>
  );
}

function AppDrawer() {
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const role = user?.rol;
  return (
    <Drawer.Navigator
      drawerContent={(p) => <DrawerContent {...p} />}
      screenOptions={{ headerShown: false, drawerStyle: { backgroundColor: c.surface, width: 300 }, overlayColor: c.overlay, drawerType: Platform.OS === 'web' ? 'front' : 'slide' }}
    >
      <Drawer.Screen name="Main" component={RoleTabs} options={{ title: 'Inicio', drawerIconName: 'home-variant-outline' }} />
      {role === 'Alumno' && <Drawer.Screen name="Prestamos" component={LoansScreen} options={{ title: 'Préstamo de material', drawerIconName: 'basket-outline' }} />}
      {role === 'Administrador' && <Drawer.Screen name="Cuotas" component={MembershipsScreen} options={{ title: 'Cuotas y membresías', drawerIconName: 'card-account-details-outline' }} />}
      <Drawer.Screen name="Notificaciones" component={NotificationsScreen} options={{ title: 'Avisos', drawerIconName: 'bell-outline' }} />
      <Drawer.Screen name="Perfil" component={ProfileScreen} options={{ title: 'Mi perfil', drawerIconName: 'account-circle-outline' }} />
      <Drawer.Screen name="Manual" component={ManualScreen} options={{ title: 'Manual de usuario', drawerIconName: 'book-open-variant' }} />
    </Drawer.Navigator>
  );
}

export default function RootNavigator() {
  const { status, blocked } = useAuth();
  const { colors: c, isDark } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: { ...(isDark ? DarkTheme : DefaultTheme).colors, background: c.bg, card: c.surface, text: c.text, border: c.border, primary: c.primary },
  };

  if (status === 'loading') return <Loading label="Preparando MOVA…" />;

  return (
    <NavigationContainer theme={navTheme} documentTitle={{ formatter: (o, r) => `MOVA · ${o?.title || r?.name || ''}` }}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: c.bg } }}>
        {status === 'authed' ? (
          <>
            <Stack.Screen name="App" component={AppDrawer} />
            <Stack.Screen name="RoutineDetail" component={RoutineDetail} />
            <Stack.Screen name="ExerciseDetail" component={ExerciseDetail} />
            <Stack.Screen name="Workout" component={WorkoutScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="StudentProgress" component={ProgressScreen} />
            <Stack.Screen name="UserDetail" component={UserDetail} />
            <Stack.Screen name="RoutineForm" component={RoutineForm} />
            <Stack.Screen name="ExerciseForm" component={ExerciseForm} />
            <Stack.Screen name="AssignRoutine" component={AssignRoutine} />
            <Stack.Screen name="UserForm" component={UserForm} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="NewChat" component={NewChatScreen} />
            <Stack.Screen name="CatalogAdmin" component={CatalogScreen} initialParams={{ back: true }} />
          </>
        ) : (
          <>
            {blocked && <Stack.Screen name="BlockedStart" component={BlockedScreen} />}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Verify" component={VerifyScreen} />
            <Stack.Screen name="Forgot" component={ForgotScreen} />
            <Stack.Screen name="Blocked" component={BlockedScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
