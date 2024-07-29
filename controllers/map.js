import { utilMessage, utilData, utilError } from "../utils/message.js";
import { pool } from "../config/db.js";
import { featureCollection } from "@turf/helpers";
import Map from "../models/mapModel.js";
import bodyParser from "body-parser";
// progress:
// 1 = belum divalidasi/data peta diubah
// 2 = sedang divalidasi
// 3 = sudah divalidasi
// export const maps = (req, res) => {

const db = "maps";

export const getAllMaps = async (req, res) => {
  const client = await pool.connect();
  try {
    //const result = await client.query("SELECT * FROM maps");

    const result = await client.query(`SELECT 
      maps.nama_pemilik AS name, 
      koordinat.map_id AS map_id, 
      TRIM(maps.nama_lahan) AS nama_lahan, 
      maps.progress AS progress,
      maps.status AS status, 
      ARRAY_AGG(koordinat.koordinat) AS koordinat 
      FROM koordinat 
      JOIN maps ON maps.map_id = koordinat.map_id 
      JOIN users ON maps.user_id = users.user_id 
      GROUP BY 1,2,3,4,5 ORDER BY 1`);

    const results = await Promise.all(result.rows.map(async (row) => {
      if (row.koordinat) {
        const coordinates = row.koordinat.map(coord => coord.map(parseFloat));
        return {
          type: "Feature",
          properties: {
            nama: row.name,
            map_id: row.map_id,
            nama_lahan: row.nama_lahan.trim(),
            status: row.status,
            progress: row.progress,
          },
          geometry: {
            coordinates: coordinates
          },
        };
      } else {
        return null;
      }
    }));

    const geoJsonResponse = featureCollection(results);
    console.log("hit API all")

    return utilData(res, 200, geoJsonResponse);
  } catch (error) {
    // Handle errors
    console.error("Error:", error.message);
    return utilData(res, 500, { message: "Internal Server Error" });
  } finally {
    client.release();
  }
};

export const getMapById = async (req, res) => {
  const client = await pool.connect();
  const { mapId } = req.params;
  try {
    const result = await client.query(
        `SELECT 
        TRIM(maps.nama_lahan) AS nama_lahan, 
        maps.progress AS progress, 
        maps.status AS status, 
        koordinat.koordinat_id AS koordinat_id,
        ARRAY_AGG(koordinat.koordinat) AS coordinates,
        ARRAY_AGG(translate(koordinat.image, CHR(255), '')) AS image,
        maps.nama_pemilik AS nama_pemilik, 
        maps.updated_at AS date
      FROM koordinat 
      JOIN maps ON maps.map_id = koordinat.map_id 
      JOIN users ON maps.user_id = users.user_id 
      WHERE koordinat.map_id = $1 
      GROUP BY maps.nama_lahan, maps.progress, maps.status, maps.nama_pemilik, maps.updated_at
      ORDER BY maps.nama_lahan`,
        [mapId]
    );

    const data = result.rows[0];

    if (!data) {
      // Handle case where map data is not found
      return utilData(res, 404, { message: "Map not found" });
    }

    const features = {
      type: "Feature",
      properties: {
        nama_lahan: data.nama_lahan.trim(), 
        status: data.status,
        progress: data.progress,
        nama_pemilik: data.nama_pemilik,
        date: data.date
      },
      geometry: {
        coordinates: data.coordinates,
        koordinat_id: koordinat_id,
        image: data.image
      }
    };

    console.log("hit API ID");
    return utilData(res, 200, { features });
  } catch (error) {
    // Handle errors
    console.error("Error:", error.message);
    return utilData(res, 500, { message: "Internal Server Error" });
  } finally {
    client.release();
  }
};

export const getValidator = async (req, res) => {
  const client = await pool.connect();
  const { mapId } = req.params;
  try {
    const result = await client.query(
        `SELECT 
        TRIM(maps.nama_lahan) AS nama_lahan, 
        maps.progress AS progress, 
        maps.status AS status, 
        ARRAY_AGG(koordinat.koordinat_verif) AS coordinates,
        ARRAY_AGG(translate(koordinat.image, CHR(255), '')) AS image,
        maps.nama_pemilik AS nama_pemilik, 
        maps.updated_at AS date
      FROM koordinat 
      JOIN maps ON maps.map_id = koordinat.map_id 
      JOIN users ON maps.user_id = users.user_id 
      WHERE koordinat.map_id = $1 
      GROUP BY maps.nama_lahan, maps.progress, maps.status, maps.nama_pemilik, maps.updated_at 
      ORDER BY maps.nama_lahan`,
        [mapId]
    );

    const data = result.rows[0];
    if (!result.coordinates){
      return utilData(res, 404, { message: "Koordinat_verif not found" });
    }
    if (!data) {
      // Handle case where map data is not found
      return utilData(res, 404, { message: "Map not found" });
    }

    const features = {
      type: "Feature",
      properties: {
        nama_lahan: data.nama_lahan.trim(), 
        status: data.status,
        progress: data.progress,
        nama_pemilik: data.nama_pemilik,
        date: data.date
      },
      geometry: {
        coordinates: data.coordinates,
        image: data.image
      }
    };

    console.log("hit API val ID");
    return utilData(res, 200, { features });
  } catch (error) {
    // Handle errors
    console.error("Error:", error.message);
    return utilData(res, 500, { message: "Internal Server Error" });
  } finally {
    client.release();
  }
};

export const editMap = async (req, res) => {
  const client = await pool.connect();
  const { mapId, koor } = req.body;
  try {
    const editGeom = await client.query(
      "UPDATE koordinat SET koordinat_verif=$1 WHERE map_id=$2",
      [koor, mapId]
    );
    client.release();
    if (editGeom)
      return utilMessage(
        res,
        200,
        "Data dengan id " + mapId + " berhasil diubah"
      );
    return utilMessage(res, 403, "Data gagal diubah");
  } catch (err) {
    return utilError(res, err);
  }
};

export const addMap = async (req, res) => {
  const client = await pool.connect();
  const { name, koordinat } = req.body;
  try {
    const addMap = await client.query(
      "insert into " + db + " (name) values($1)",
      [name]
    );
    const getmap_id = await client.query(
      "SELECT MAX(map_id) AS max_map_id FROM " + db
    );
    for (const coordinate of koordinat) {
      const x = 0
      await client.query(
          "INSERT INTO koordinat (map_id, koordinat) VALUES ($1, $2)",
          [getmap_id+x, coordinate]
      );
      x++;
  }
    client.release();
    if (addMap) {
      return utilMessage(res, 200, "Data berhasil ditambahkan");
    } else {
      return utilMessage(res, 403, "Data gagal ditambahkan");
    }
  } catch (err) {
    return utilError(res, err);
  }
};

export const deleteMap = async (req, res) => {
  const client = await pool.connect();
  const { mapId } = req.body;

  try {
    // Start the transaction
    await client.query('BEGIN');
    // Delete from 'koordinat' table
    const deleteKoordinat = await client.query(
      "DELETE FROM koordinat WHERE map_id = $1",
      [mapId]
    );
    const deleteMap = await client.query(
      "DELETE FROM maps WHERE map_id = $1",
      [mapId]
    );
    await client.query('COMMIT');
    client.release();

    if (deleteMap.rowCount > 0 && deleteKoordinat.rowCount > 0) {
      return utilMessage(res,200,"Data dengan id " + mapId + " berhasil dihapus");
    } else {
      return utilMessage(res, 403, "Data gagal dihapus");
    }
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    return utilError(res, error);
  }
};

export const getHistory = async (req, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT maps.nama_pemilik AS nama_pemilik, 
             history.map_id AS map_id, 
             TRIM(maps.nama_lahan) AS nama_lahan, 
             maps.status AS status, 
             history.old_coordinate AS old_coordinate, 
             history.new_coordinate AS new_coordinate,
             history.updated_at AS updated_at
      FROM history 
      JOIN maps ON maps.map_id = history.map_id 
      JOIN users ON maps.user_id = users.user_id 
      WHERE history.old_coordinate IS NOT NULL 
        AND history.new_coordinate IS NOT NULL
      GROUP BY maps.nama_pemilik, history.map_id, maps.nama_lahan, maps.status, history.old_coordinate, history.new_coordinate, history.updated_at
      ORDER BY history.map_id DESC
    `);

    const results = result.rows.map((row) => {
      return {
        map_id: row.map_id,
        name: row.name_pemilik,
        nama_lahan: row.nama_lahan,
        old_coordinate: row.old_coordinate,
        new_coordinate: row.new_coordinate,
        status: row.status,
        updated_at: row.updated_at
      };
    });

    return utilData(res, 200, results);
  } catch (error) {
    console.error("Error:", error.message);
    return utilData(res, 500, { message: "Internal Server Error" });
  } finally {
    client.release();
  }
};

export const getStatus = async (req, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT maps.nama_pemilik AS nama_pemilik, 
             verifikasi.map_id AS map_id, 
             TRIM(maps.nama_lahan) AS nama_lahan, 
             maps.progress AS progress, 
             verifikasi.old_status AS old_status, 
             verifikasi.new_status AS new_status,
             verifikasi.updated_at AS updated_at
      FROM verifikasi 
      JOIN maps ON maps.map_id = verifikasi.map_id 
      JOIN users ON maps.user_id = users.user_id 
      GROUP BY maps.nama_pemilik,maps.progress,users.username, verifikasi.map_id, maps.nama_lahan, maps.status, verifikasi.old_status, verifikasi.new_status,verifikasi.updated_at
      ORDER BY verifikasi.map_id DESC
    `);

    const results = result.rows.map((row) => {
      return {
        map_id: row.map_id,
        name: row.nama_pemilik,
        nama_lahan: row.nama_lahan,
        old_status: row.old_status,
        new_status: row.new_status,
        updated_at: row.updated_at,
      };
    });

    return utilData(res, 200, results);
  } catch (error) {
    console.error("Error:", error.message);
    return utilData(res, 500, { message: "Internal Server Error" });
  } finally {
    client.release();
  }
};