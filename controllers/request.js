import Map from "../models/mapModel.js";

import { utilMessage, utilData, utilError } from "../utils/message.js";
import { pool } from "../config/db.js";
import { Op, Sequelize } from "sequelize";

export const taskTable = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT users.nama_lengkap, maps.map_id, TRIM(maps.nama_lahan) as nama_lahan, maps.progress, maps.status, to_char(maps.created_at, 'DD/MM/YYYY') as requested FROM maps JOIN users ON maps.user_id = users.user_id",
    );
    const updateResult = result.rows.map((row) => ({
      mapId: row.map_id,
      name: row.nama_lengkap,
      nama_lahan: row.nama_lahan,
      progress: row.progress,
      status: row.status,
      requested: row.requested,
    }));


    
    const results = result.rows.map((row) => ({
      mapId: row.map_id,
      name: row.nama_lengkap,
      nama_lahan: row.nama_lahan,
      progress: row.progress,
      status: row.status,
      requested: row.requested,
    }));
    console.log("Hit api task table");
    return utilData(res, 200, { results });
  } catch (error) {
    return utilError(res, error);
  } finally {
    client.release();
  }
};

