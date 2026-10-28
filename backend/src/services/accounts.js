/**
 * Política de usuarios: nunca se eliminan. Ante morosidad, material no devuelto o
 * inactividad prolongada se BLOQUEAN y la app muestra las instrucciones para regularizar.
 */
const { query, one } = require('../config/db');

async function notify(idUsuario, tipo, titulo, mensaje, claveUnica = null) {
  // INSERT IGNORE + clave única => el proceso automático no duplica avisos
  await query(
    `INSERT IGNORE INTO notifications (id_usuario, tipo, titulo, mensaje, clave_unica) VALUES (?, ?, ?, ?, ?)`,
    [idUsuario, tipo, titulo, mensaje, claveUnica]
  );
}

async function blockUser(idUsuario, idMotivo, detalle = null, adminId = null) {
  const user = await one('SELECT estado FROM users WHERE id_usuario = ?', [idUsuario]);
  if (!user || user.estado === 'bloqueado') return false;
  await query(`UPDATE users SET estado = 'bloqueado' WHERE id_usuario = ?`, [idUsuario]);
  await query(
    `INSERT INTO user_blocks (id_usuario, id_motivo, detalle, bloqueado_por) VALUES (?, ?, ?, ?)`,
    [idUsuario, idMotivo, detalle, adminId]
  );
  // Cierra las sesiones abiertas
  await query('UPDATE refresh_tokens SET revocado = TRUE WHERE id_usuario = ?', [idUsuario]);
  const motivo = await one('SELECT nombre FROM block_reasons WHERE id_motivo = ?', [idMotivo]);
  await notify(idUsuario, 'bloqueo', 'Cuenta bloqueada', `Motivo: ${motivo?.nombre || 'administrativo'}.`);
  return true;
}

async function unblockUser(idUsuario) {
  await query(`UPDATE users SET estado = 'activo' WHERE id_usuario = ?`, [idUsuario]);
  await query(
    `UPDATE user_blocks SET fecha_desbloqueo = NOW() WHERE id_usuario = ? AND fecha_desbloqueo IS NULL`,
    [idUsuario]
  );
  await notify(idUsuario, 'sistema', 'Cuenta reactivada', '¡Ya podés volver a entrenar con MOVA!');
}

/** Datos del bloqueo vigente para mostrar en pantalla. */
async function activeBlock(idUsuario) {
  return one(
    `SELECT br.nombre AS motivo, br.instrucciones, ub.detalle, ub.fecha_bloqueo
       FROM user_blocks ub JOIN block_reasons br ON br.id_motivo = ub.id_motivo
      WHERE ub.id_usuario = ? AND ub.fecha_desbloqueo IS NULL
      ORDER BY ub.id_bloqueo DESC LIMIT 1`,
    [idUsuario]
  );
}

module.exports = { notify, blockUser, unblockUser, activeBlock };
