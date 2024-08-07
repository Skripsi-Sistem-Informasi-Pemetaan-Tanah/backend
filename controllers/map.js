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

    const result = await client.query(`WITH sorted_koordinat AS (
    SELECT 
        maps.nama_pemilik AS name, 
        koordinat.map_id AS map_id, 
        TRIM(maps.nama_lahan) AS nama_lahan, 
        maps.progress AS progress,
        maps.status AS status, 
        koordinat.koordinat AS koordinat,
        koordinat.koordinat_id AS koordinat_id
    FROM koordinat 
    JOIN maps ON maps.map_id = koordinat.map_id 
    JOIN users ON maps.user_id = users.user_id 
    ORDER BY name, map_id, koordinat_id
)
SELECT 
    name, 
    map_id, 
    nama_lahan, 
    progress,
    status, 
    ARRAY_AGG(koordinat) AS koordinat 
FROM sorted_koordinat
GROUP BY name, map_id, nama_lahan, progress, status
ORDER BY name;
`);

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
        `WITH sorted_koordinat AS (
    SELECT 
        maps.nama_lahan, 
        maps.progress, 
        maps.status, 
        koordinat.koordinat_id, 
        koordinat.koordinat_verif,
        koordinat.koordinat, 
        translate(koordinat.image, CHR(255), '') AS image,
        maps.nama_pemilik, 
        maps.updated_at
    FROM koordinat 
    JOIN maps ON maps.map_id = koordinat.map_id 
    JOIN users ON maps.user_id = users.user_id 
    WHERE koordinat.map_id = $1 
    ORDER BY maps.nama_lahan, koordinat.koordinat_id
)
SELECT 
    nama_lahan,
    progress,
    status,
    ARRAY_AGG(koordinat_id) AS koordinat_id,
    ARRAY_AGG(koordinat_verif) AS koordinat_verif,
    ARRAY_AGG(koordinat) AS coordinates,
    ARRAY_AGG(image) AS image,
    nama_pemilik,
    updated_at AS date
FROM sorted_koordinat
GROUP BY nama_lahan, progress, status, nama_pemilik, updated_at
ORDER BY nama_lahan;
`,
        [mapId]
    );

    const data = result.rows[0];

    if (data.length === 0) {
      // Handle case where map data is not found
      return utilData(res, 404, { message: "Map not found" });
    }

    // const coordinates = data.map(row => ({
    //     coordinates: row.coordinates,
    //     koordinat_id: row.koordinat_id,
    //     image: row.image
    // }));

    // const geom = {
    //   geometry: {
    //     type: "Polygon",
    //     coordinates: [coordinates.find(coord => coord.geometry.koordinat_id === row.koordinat_id).geometry.coordinates]
    //   }
    // };
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
        koordinat_id: data.koordinat_id,
        koordinat_verif: data.koordinat_verif,
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


// export const getMapById = async (req, res) => {
//   const client = await pool.connect();
//   const { mapId } = req.params;
//   try {
//     const result = await client.query(
//         `SELECT 
//         TRIM(maps.nama_lahan) AS nama_lahan, 
//         maps.progress AS progress, 
//         maps.status AS status, 
//         ARRAY_AGG(koordinat.koordinat) AS coordinates,
//         ARRAY_AGG(translate(koordinat.image, CHR(255), '')) AS image,
//         maps.nama_pemilik AS nama_pemilik, 
//         maps.updated_at AS date
//       FROM koordinat 
//       JOIN maps ON maps.map_id = koordinat.map_id 
//       JOIN users ON maps.user_id = users.user_id 
//       WHERE koordinat.map_id = $1 
//       GROUP BY maps.nama_lahan, maps.progress, maps.status, maps.nama_pemilik, maps.updated_at
//       ORDER BY maps.nama_lahan`,
//         [mapId]
//     );

//     const data = result.rows[0];

//     if (!data) {
//       // Handle case where map data is not found
//       return utilData(res, 404, { message: "Map not found" });
//     }

//     const features = {
//       type: "Feature",
//       properties: {
//         nama_lahan: data.nama_lahan.trim(), 
//         status: data.status,
//         progress: data.progress,
//         nama_pemilik: data.nama_pemilik,
//         date: data.date
//       },
//       geometry: {
//         coordinates: data.coordinates,
//         image: data.image
//       }
//     };

//     console.log("hit API ID");
//     return utilData(res, 200, { features });
//   } catch (error) {
//     // Handle errors
//     console.error("Error:", error.message);
//     return utilData(res, 500, { message: "Internal Server Error" });
//   } finally {
//     client.release();
//   }
// };

export const getValidator = async (req, res) => {
  const client = await pool.connect();
  const { mapId } = req.params;
  try {
    const test = await client.query(
      `SELECT koordinat.koordinat_verif FROM koordinat WHERE map_id = $1`, [mapId]
    )

    if (test.rows.length === 0 || test.rows.every(row => row.koordinat_verif === null)) {
      return utilData(res, 404, { message: "Koordinat verif not found" });
    }

    const result = await client.query(
      `WITH sorted_koordinat AS (
        SELECT 
          maps.nama_lahan, 
          maps.progress, 
          maps.status, 
          koordinat.koordinat_verif, 
          koordinat.status AS status_coordinates,
          translate(koordinat.image, CHR(255), '') AS image,
          maps.nama_pemilik, 
          maps.updated_at,
          koordinat.koordinat_id
        FROM koordinat 
        JOIN maps ON maps.map_id = koordinat.map_id 
        JOIN users ON maps.user_id = users.user_id 
        WHERE koordinat.map_id = $1
        ORDER BY maps.nama_lahan, koordinat.koordinat_id
      )
      SELECT 
        TRIM(nama_lahan) AS nama_lahan, 
        progress, 
        status, 
        ARRAY_AGG(koordinat_verif ORDER BY koordinat_id) AS coordinates,
        ARRAY_AGG(status_coordinates ORDER BY koordinat_id) AS status_coordinates,
        ARRAY_AGG(image ORDER BY koordinat_id) AS image,
        nama_pemilik, 
        updated_at AS date
      FROM sorted_koordinat
      GROUP BY nama_lahan, progress, status, nama_pemilik, updated_at
      ORDER BY nama_lahan;`,
      [mapId]
    );

    // Jika tidak ada data
    if (result.rows.length === 0) {
      return utilData(res, 404, { message: "Map not found" });
    }

    const data = result.rows[0];

    // Jika coordinates berisi null, kembalikan pesan yang sesuai
    if (!data.coordinates) {
      return utilData(res, 404, { message: "Koordinat_verif not found" });
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
        image: data.image,
        status_coordinate: data.status_coordinates
      }
    };

    console.log("hit API val ID");
    return utilData(res, 200, { features });
  } catch (error) {
    console.error("Error:", error.message);
    return utilData(res, 500, { message: "Internal Server Error" });
  } finally {
    client.release();
  }
};


export const editMap = async (req, res) => {
  const client = await pool.connect();
  const { koordinatId, koor } = req.body;

  try {
    // Memisahkan latitude dan longitude dari string koor
    const [latitude, longitude] = koor.split(',');

    // Membuat format koordinat yang diinginkan {latitude,longitude}
    const formattedKoor = `{${latitude},${longitude}}`;

    const editGeom = await client.query(
      "UPDATE koordinat SET koordinat_verif=$1 WHERE koordinat_id=$2",
      [formattedKoor, koordinatId]
    );

    client.release();

    if (editGeom)
      return utilMessage(
        res,
        200,
        "Data dengan id " + koordinatId + " berhasil diubah"
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
  const { mapId } = req.params;

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
             history.koordinat_id AS koordinat_id, 
             TRIM(maps.nama_lahan) AS nama_lahan, 
             history.old_status AS old_status, 
             history.status AS status, 
             history.komentar AS komentar,
             history.old_koordinat_verif AS old_koordinat_verif,
             history.new_koordinat_verif AS new_koordinat_verif,
             history.old_coordinate AS old_coordinate, 
             history.new_coordinate AS new_coordinate,
             history.updated_at AS updated_at
      FROM history 
      JOIN maps ON maps.map_id = history.map_id 
      JOIN users ON maps.user_id = users.user_id 
      WHERE history.old_coordinate IS NOT NULL
      GROUP BY maps.nama_pemilik, history.komentar, history.old_koordinat_verif, history.new_koordinat_verif, history.koordinat_id, maps.nama_lahan, history.status, history.old_status, history.old_coordinate, history.new_coordinate, history.updated_at
      ORDER BY history.koordinat_id DESC
    `);

    const results = result.rows.map((row) => {
      return {
        koordinat_id: row.koordinat_id,
        name: row.name_pemilik,
        nama_lahan: row.nama_lahan,
        old_coordinate: row.old_coordinate,
        new_coordinate: row.new_coordinate,
        old_koordinat_verif: row.old_koordinat_verif,
        new_koordinat_verif: row.new_koordinat_verif,
        old_status: row.old_status,
        status: row.status,
        komentar: row.komentar,
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

export const getKomentarKoordinat = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT maps.nama_pemilik AS nama_pemilik, 
             history.history_id AS history_id,
             koordinat.koordinat_id AS koordinat_id, 
             TRIM(maps.nama_lahan) AS nama_lahan, 
             history.komentar AS komentar, 
             history.updated_at AS updated_at
      FROM history 
      JOIN koordinat ON history.koordinat_id = koordinat.koordinat_id
      JOIN maps ON maps.map_id = koordinat.map_id 
      JOIN users ON maps.user_id = users.user_id 
      GROUP BY maps.nama_pemilik,maps.progress,users.username, history.history_id, history.komentar, koordinat.koordinat_id, maps.nama_lahan, maps.status, history.komentar,history.updated_at
      ORDER BY history.history_id DESC
    `);

    const results = result.rows.map((row) => {
      return {
        history_id: row.history_id,
        koordinat_id: row.koordinat_id,
        name: row.nama_pemilik,
        nama_lahan: row.nama_lahan,
        komentar: row.komentar,
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

export const getKomentarLahan = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT maps.nama_pemilik AS nama_pemilik, 
             verifikasi.map_id AS map_id, 
             TRIM(maps.nama_lahan) AS nama_lahan, 
             TRIM(verifikasi.komentar) AS komentar, 
             verifikasi.updated_at AS updated_at
      FROM maps 
      JOIN verifikasi ON maps.map_id = verifikasi.map_id 
      JOIN users ON maps.user_id = users.user_id 
      GROUP BY maps.nama_pemilik,maps.progress,users.username, verifikasi.map_id, maps.nama_lahan, maps.status, verifikasi.komentar, verifikasi.new_status,verifikasi.updated_at
      ORDER BY verifikasi.map_id DESC
    `);

    const results = result.rows.map((row) => {
      return {
        map_id: row.map_id,
        name: row.nama_pemilik,
        nama_lahan: row.nama_lahan,
        komentar: row.komentar,
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