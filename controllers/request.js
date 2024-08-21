import Map from "../models/mapModel.js";

import { utilMessage, utilData, utilError } from "../utils/message.js";
import { pool } from "../config/db.js";
import { Op, Sequelize } from "sequelize";

export const taskTable = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT TRIM(users.nama_lengkap) as nama_pemilik, 
      maps.map_id, 
      TRIM(maps.nama_lahan) as nama_lahan, 
      maps.progress as progress, 
      maps.status as status, 
      to_char(maps.updated_at, 'HH24:MI/DD/MM/YYYY') as updated_at,
      to_char(maps.created_at, 'HH24:MI/DD/MM/YYYY') as requested 
      FROM maps 
      JOIN users ON maps.user_id = users.user_id`,
    );
    //const result2 = await client.query("SELECT users.nama_lengkap, koordinat.map_id, TRIM(maps.nama_lahan) AS nama_lahan, maps.progress AS progress,maps.status AS status, to_char(maps.created_at, 'DD/MM/YYYY') as requested FROM maps JOIN users ON maps.user_id = users.user_id JOIN koordinat ON koordinat.map_id = maps.map_id ");

    const updateResult = result.rows.map((row) => ({
      mapId: row.map_id,
      name: row.nama_pemilik,
      nama_lahan: row.nama_lahan,
      progress: row.progress,
      status: row.status,
      requested: row.requested,
    }));

    const results = result.rows.map((row) => ({
      mapId: row.map_id,
      name: row.nama_pemilik,
      nama_lahan: row.nama_lahan,
      progress: row.progress,
      status: row.status,
      requested: row.requested,
      updated_at: row.updated_at
    }));
    console.log("Hit api task table");
    return utilData(res, 200, { results });
  } catch (error) {
    return utilError(res, error);
  } finally {
    client.release();
  }
};

