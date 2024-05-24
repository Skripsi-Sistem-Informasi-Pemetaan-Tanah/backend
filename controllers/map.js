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
    const result = await client.query("SELECT koordinat.map_id AS map_id, TRIM(maps.name) AS name, maps.progress AS status, ARRAY_AGG(koordinat.koordinat) AS koordinat FROM koordinat JOIN maps ON maps.map_id = koordinat.map_id GROUP BY 1,2,3 ORDER BY 1");
    const results = await Promise.all(result.rows.map(async (row) => {
      if (row.koordinat) {
        const coordinates = row.koordinat.map(coord => coord.map(parseFloat));
//         SELECT
//     MAX(id) AS id,
//     MAX(status) AS status,
//     map_id,
//     STRING_AGG(koordinat, ',') AS koordinat
// FROM
//     your_table_name
// WHERE
//     map_id = row.map_id
// GROUP BY
//     map_id;
        //return result.rows
        return {
          type: "Feature",
          properties: {
            map_id: row.map_id,
            name: row.name.trim(),
            status: row.status,
            //fieldtype: row.fieldtype.trim(),
          },
          geometry: {
            coordinates: coordinates
          },
          // geometry: {
          //   koordinat: row.koordinat.map((koordinat) => [
          //     parseFloat(koordinat[0]),
          //     parseFloat(koordinat[1]),
          //   ]),
          // },
        };
      } else {
        return null; // or handle the case where koor is null in a way that makes sense for your application
      }
    }));

    // Filter out the null values before creating the GeoJSON response
    //const filteredResults = results.filter((result) => result !== null);
    // Filter unique map_id
    // const uniqueMapIds = new Set();
    // const uniqueResults = [];
    // for (const result of results) {
    //   if (result && !uniqueMapIds.has(result.properties.map_id)) {
    //     uniqueMapIds.add(result.properties.map_id);
    //     uniqueResults.push(result);
    //   }
    // }
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
        "SELECT TRIM(maps.name) AS name, maps.progress AS status, ARRAY_AGG(koordinat.koordinat) AS coordinates FROM koordinat JOIN maps ON maps.map_id = koordinat.map_id WHERE koordinat.map_id = $1 GROUP BY 1,2 ORDER BY 1",
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
            name: data.name.trim(), 
            status: data.status 
          },
          geometry: {
            coordinates: data.coordinates
          }
        };
    // const { name, status, koordinat } = data[0];
    //const features = results[0]
    // const features = {
    //   type: "Feature",
    //   properties: {
    //     name: name, 
    //     status: status 
    //   },
    //   geometry: {
    //     coordinates: koordinat
    //   }
    // };
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

export const editMap = async (req, res) => {
  const client = await pool.connect();
  const { mapId, koor } = req.body;
  try {
    const editGeom = await client.query(
      "UPDATE " + db + " SET koor=$1, updatedAt = NOW() WHERE map_id=$2",
      [koor, mapId]
    );
    const addHistory = await client.query(
      "insert into history (history_id,status,updatedAt,progress) values($1,'Data peta diubah',NOW(),1)",
      [mapId]
    );
    client.release();
    if (editGeom && addHistory)
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
// function coordinatesToWKT(coordinates) {
//   // Check if there are enough points to form a polygon
//   if (coordinates.length < 3) return utilMessage(res, 404, "A polygon must have at least 3 coordinates.");

//   // Convert the list of coordinates to WKT format
//   let wkt = "MULTIPOLYGON(((";
//   for (let i = 0; i < coordinates.length; i++) {
//       const [x, y] = coordinates[i];
//       wkt += `${x} ${y}`;
//       if (i < coordinates.length - 1) {
//           wkt += ",";
//       }
//   }
//   wkt += ")))";

//   return wkt;
// }

export const addMap = async (req, res) => {
  const client = await pool.connect();
  const { name, koordinat } = req.body;
  try {
    //const convertWKT = coordinatesToWKT(koor);
    // console.log(convertWKT);
    // console.log(koor[1])

    //sequalize;
    // const addMap = await Map.create({
    //   name: name,
    //   koordinat: koordinat,
    //   defaults: {
    //     status: "belum tervalidasi",
    //   },
    // });
    //query
    const addMap = await client.query(
      "insert into " + db + "(name,koordinat) values($1,$2)",
      [name, koordinat]
    );
    const getmap_id = await client.query(
      "SELECT MAX(map_id) AS max_map_id FROM " + db
    );
    const mapId = getmap_id.rows[0].max_map_id;
    const addHistory = await client.query(
      "INSERT INTO histories (history_id, status) VALUES ($1, 1)",
      [mapId]
    );

    client.release();

    if (addMap || addHistory) {
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
    const deleteMap = await client.query(
      "DELETE FROM " + db + " WHERE map_id = $1",
      [mapId]
    );
    client.release();
    if (deleteMap)
      return utilMessage(
        res,
        200,
        "Data dengan id " + mapId + " berhasil diubah"
      );
    return utilMessage(res, 403, "Data gagal diubah");
  } catch (error) {
    return utilError(res, error);
  }
};
//     try {
//         const { map_id, name, geom } = req.body

//         const addGeom = pool.query('INSERT INTO test (map_id,name,geom) values($1,$2,ST_GeomFromText($3, 4326)))', [map_id, name, geom])
//         if (addGeom) return utilMessage(res, 200, 'Data berhasil ditambahkan')
//         return utilMessage(res, 403, 'Data gagal ditambahkan')
//     } catch (error) {
//         return utilError(res, error)
//     }
//   }
