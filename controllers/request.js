import Map from "../models/mapModel.js";

import { utilMessage, utilData, utilError } from "../utils/message.js";
import { pool } from "../config/db.js";
import { Op, Sequelize } from "sequelize";

export const taskTable = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(

      "SELECT map_id, TRIM(name) as name, progress, status, to_char(created_at, 'DD/MM/YYYY') as requested FROM maps",

    );
    const updateResult = result.rows.map((row) => ({
      mapId: row.map_id,
      name: row.name,
      progress: row.progress,
      status: row.status,
      requested: row.requested,
    }));

    // updateResult.forEach(async (row) => {
    //   if (row.progress === 0 && await checkCoordinateCount(row.mapId) >= 3) {
    //     await updateProgress(row.mapId, 1); //Mengubah progress menjadi 1 jika memenuhi kondisi
    //   }
    //   if (row.progress === 1 && await checkPhoto(row.mapId)) {
    //     await updateProgress(row.mapId, 2); //Mengubah progress menjadi 2 jika memenuhi kondisi
    //   }
    //   if (row.progress === 2 && await checkArround(row.mapId)) {
    //     await updateProgress(row.mapId, 3); //Mengubah progress menjadi 3 jika memenuhi kondisi
    //   }
    // });
    //
    const results = result.rows.map((row) => ({
      mapId: row.map_id,
      name: row.name,
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
// Fungsi untuk memeriksa jumlah row koordinat pada setiap mapId
const checkCoordinateCount = async (mapId) => {
  try {
    const client = await pool.connect();

    // Query untuk menghitung jumlah koordinat berdasarkan mapId
    const coordinateCountQuery = await client.query(
      "SELECT COUNT(*) FROM koordinat WHERE map_id = $1",
      [mapId],
    );
    // Mengembalikan jumlah baris koordinat
    const results = parseInt(coordinateCountQuery.rows[0].count);
    return results;
  } catch (error) {
    // Tangani kesalahan jika terjadi saat menjalankan query
    console.error("Error while checking coordinate count:", error);
    throw error;
  }
};

const checkPhoto = async (mapId) => {
  try {
    const client = await pool.connect();
    // Query untuk menghitung jumlah baris dengan foto tidak null dan jumlah total baris dengan map_id tertentu
    const photoCheckQuery = await client.query(
      "SELECT COUNT(*) AS total_rows, COUNT(photo) AS photo_not_null_count FROM koordinat WHERE map_id = $1",
      [mapId]
    );

    // Mendapatkan hasil query
    const { total_rows, photo_not_null_count } = photoCheckQuery.rows[0];

    // Memeriksa apakah semua foto tidak bernilai null
    const allPhotosNotNull = total_rows === photo_not_null_count;

    return allPhotosNotNull;
  } catch (error) {
    // Tangani kesalahan jika terjadi saat menjalankan query
    console.error("Error while checking photo:", error);
    throw error;
  }
};


const checkArround = async (mapId) => {
  try {
    const client = await pool.connect();

    // Query untuk mengambil koordinat dari titik yang akan diperiksa
    const fixedKoordinatResult = await client.query(
      "SELECT koordinat FROM koordinat WHERE map_id = $1",
      [mapId],
    );
    const fixedKoordinat = fixedKoordinatResult.rows.map(
      (row) => row.koordinat,
    );
    // Query untuk mengambil semua koordinat yang akan dibandingkan jaraknya
    const findKoordinatResult = await client.query(
      "SELECT koordinat FROM koordinat WHERE map_id != $1",
      [mapId],
    );
    const findKoordinat = findKoordinatResult.rows.map((row) => row.koordinat);
    // Lakukan iterasi pada setiap titik koordinat yang akan diperiksa
    for (const koordinat1 of fixedKoordinat) {
      const [lat1, lon1] = koordinat1;

      // Lakukan iterasi pada setiap titik koordinat yang akan dibandingkan jaraknya
      for (const koordinat2 of findKoordinat) {
        const [lat2, lon2] = koordinat2;

        // Hitung jarak antara kedua titik koordinat
        const distance = calculateDistance(lat1, lon1, lat2, lon2);

        if (distance.toFixed(2) < 1 && distance.toFixed(2) > 0) {
          isValidated = true;
          break; // Keluar dari loop saat sudah ditemukan satu titik yang berdekatan
        }
      }
      // Jika tidak ada titik yang berdekatan dengan titik saat ini, kembalikan false
      if (!isValidated) {
        return false;
      }
    }
    // Jika semua titik telah divalidasi, kembalikan true
    return true;
  } catch (error) {
    // Tangani kesalahan jika terjadi saat menjalankan query
    console.error("Error while checking arround:", error);
    throw error;
  }
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius bumi dalam kilometer
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c * 1000; // Jarak dalam meter
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

const updateProgress = async (mapId, newProgress) => {
  try {
    const client = await pool.connect();

    // Query untuk mengupdate nilai progress pada tabel maps
    await client.query("UPDATE maps SET progress = $1 WHERE map_id = $2", [
      newProgress,
      mapId,
    ]);
  } catch (error) {
    // Tangani kesalahan jika terjadi saat menjalankan query
    console.error("Error while updating progress:", error);
    throw error;
  }
};
