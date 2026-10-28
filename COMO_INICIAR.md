# Cómo hacer funcionar MOVA (paso a paso)

El aviso **"El servidor no responde / No hay conexión con el servidor"** aparece cuando la app
está abierta pero el **backend** (el servidor) no está encendido o no puede llegar a la base de datos.
La app sola no alcanza: necesita las 3 partes funcionando:

```
App (pantallas)  →  Backend (Node.js, puerto 4000)  →  Base MySQL en la nube (Aiven)
```

## 1. Crear la base de datos en la nube (una sola vez)
1. Entrá a https://aiven.io y creá una cuenta gratis.
2. **Create service → MySQL → plan Free** → elegí una región → Create.
3. Esperá a que diga **Running** (1–3 minutos).
4. En "Connection information" vas a ver **Host, Port, User y Password**. Dejalos a mano.

## 2. Instalar todo (una sola vez)
Abrí una terminal en la carpeta `mova` (la que tiene este archivo) y ejecutá:
```
npm run instalar
npm run verificar
```
`verificar` crea los archivos `backend/.env` y `mobile/.env` automáticamente y te dice qué falta.

## 3. Pegar los datos de Aiven
Abrí `backend/.env` con VS Code y completá:
```
DB_HOST=   (el Host de Aiven, ej. mysql-mova-xxxx.aivencloud.com)
DB_PORT=   (el Port de Aiven, ej. 21345)
DB_USER=avnadmin
DB_PASSWORD=   (la Password de Aiven)
```
Guardá y volvé a ejecutar `npm run verificar`. Cuando diga que la conexión es correcta:
```
npm run base
```
Esto crea las tablas y los usuarios de prueba.

## 4. Encender MOVA (cada vez que la quieras usar)
```
npm start
```
Se encienden el backend y la app juntos y se abre el navegador. **No cierres esa terminal.**
Para el celular con Expo Go usá `npm run celular` y en `mobile/.env` poné la IP de tu PC
(ej. `EXPO_PUBLIC_API_URL=http://192.168.0.10:4000`, la ves con `ipconfig`).

## Si sigue apareciendo el aviso
| Lo que dice | Qué hacer |
|---|---|
| "El servidor no responde" | El backend no está encendido: usá `npm start` y no cierres la terminal. |
| "La base de datos no responde" | Revisá los datos DB_* de `backend/.env` con `npm run verificar`. En Aiven el servicio tiene que estar *Running* (si estuvo sin uso, se pausa: tocá *Power on*). |
| "Email o contraseña incorrectos" | Usá las cuentas de `docs/CREDENCIALES.md` o los botones "Cuentas de prueba". |
