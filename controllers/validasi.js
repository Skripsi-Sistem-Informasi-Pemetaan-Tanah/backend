import { utilMessage, utilData, utilError } from "../utils/message.js";
import { pool } from "../config/db.js";

export const validasiBerhasil = async (req, res) => {
  const client = await pool.connect();
  const { mapId } = req.body;
  try {
    const editValidasi = await client.query(
      "UPDATE maps SET status = 'Data Tervalidasi', updated_at = NOW() where map_id = $1",
      [mapId]
    );
    // const addHistory = await client.query(
    //   "insert into history (history_id,status,updatedAt,progress) values($1,'Data tervalidasi',NOW(),1)",
    //   [mapId]
    // );
    client.release();
    // if (editValidasi && addHistory)
    //   return utilMessage(
    //     res,
    //     200,
    //     "Data dengan id " + mapId + " berhasil divalidasi"
    //   );
    if (editValidasi)
      return utilMessage(
        res,
        200,
        "Data dengan id " + mapId + " berhasil divalidasi"
      );
    return utilMessage(res, 403, "Data gagal divalidasi");
  } catch (error) {
    return utilError(res, error);
  }
};

export const validasiDitolak = async (req, res) => {
  const client = await pool.connect();
  const { mapId } = req.body;
  try {
    const editValidasi = await client.query(
      "UPDATE maps SET status = 'Data ditolak', updated_at = NOW() where map_id = $1",
      [mapId]
    );
    const addHistory = await client.query(
      "insert into history (map_id,status,updatedAt,progress) values($1,'Data tidak bisa divalidasi/gagal',NOW(),1)",
      [mapId]
    );
    client.release();
    if (editValidasi && addHistory)
      return utilMessage(
        res,
        200,
        "Data dengan id " + mapId + " berhasil ditolak"
      );
    return utilMessage(res, 403, "Data gagal ditolak");
  } catch (error) {
    return utilError(res, error);
  }
};

