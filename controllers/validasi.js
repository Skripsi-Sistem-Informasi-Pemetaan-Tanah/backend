import { utilMessage, utilData, utilError } from "../utils/message.js";
import { pool } from "../config/db.js";

export const validasiBerhasil = async (req, res) => {
  const client = await pool.connect();
  const { mapId } = req.body;
  try {
    const editValidasi = await client.query(
      "UPDATE maps SET status = 'Data Tervalidasi', komentar = 'Data Tervalidasi', progress = 100, updated_at = NOW() WHERE map_id = $1",
      [mapId]
    );

    client.release();
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
  const { mapId, komentar } = req.body;
  try {
    const editValidasi = await client.query(
      "UPDATE maps SET status = 'Data ditolak', komentar = $1, updated_at = NOW() WHERE map_id = $2",
      [komentar, mapId]
    );
    client.release();
    if (editValidasi)
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

export const cekValidasi = async (req, res) => {
  try {
    const { mapId } = req.params;

    // Check if coordinate count is greater than or equal to 3
    const coordinateCount = await checkCoordinateCount(mapId);
    if (coordinateCount >= 3) {
      // Update progress to 1 if condition is met
      await updateProgress(mapId, 20);

      // Check if all coordinates have photos
      const allPhotosAvailable = await checkPhoto(mapId);
      if (allPhotosAvailable) {
        // Update progress to 2 if condition is met
        await updateProgress(mapId, 40);

        // Check if any coordinate is close to another coordinate
        const coordinatesAreValid = await checkArround(mapId);
        if (coordinatesAreValid) {
          // Update progress to 3 if condition is met
          await updateProgress(mapId, 60); 
          await addKomentar(mapId, "tervalidasi");
        } else {
          await addKomentar(mapId, "Ada koordinat yang belum diklaim oleh orang lain");
        }
      } else {
        await addKomentar(mapId, "Terdapat koordinat yang tidak memiliki foto patokan");
      }
    } else {
      await addKomentar(mapId, "Jumlah koordinat yang tersedia kurang dari 3");
    }

    res.status(200).send("Validation completed successfully.");
  } catch (error) {
    console.error("Error during validation:", error);
    res.status(500).send("Internal server error.");
  }
};

// Fungsi untuk memeriksa jumlah row koordinat pada setiap mapId
const checkCoordinateCount = async (mapId) => {
  try {
    const client = await pool.connect();

    // Query untuk menghitung jumlah koordinat berdasarkan mapId
    const coordinateCountQuery = await client.query(
      "SELECT COUNT(*) FROM koordinat WHERE map_id = $1",
      [mapId]
    );
    // Mengembalikan jumlah baris koordinat
    const results = parseInt(coordinateCountQuery.rows[0].count, 10);
    client.release();
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

    // Query untuk mengambil semua foto dari koordinat yang memiliki map_id tertentu
    const photoCheckQuery = await client.query(
      "SELECT image FROM koordinat WHERE map_id = $1",
      [mapId]
    );
    // Mendapatkan hasil query
    const images = photoCheckQuery.rows.map(row => row.image);
    // Memeriksa apakah ada foto yang mengandung 'https' dalam URL-nya
    const allPhotosValid = images.every(image => image && image.includes('https'));
    client.release();
    return allPhotosValid;
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
      [mapId]
    );
    const fixedKoordinat = fixedKoordinatResult.rows.map(row => ({ longitude: row.koordinat[0], latitude: row.koordinat[1], map_id: row.map_id }));

    // Query untuk mengambil semua koordinat yang akan dibandingkan jaraknya
    const findKoordinatResult = await client.query(
      "SELECT koordinat FROM koordinat WHERE map_id != $1",
      [mapId]
    );
    const findKoordinat = findKoordinatResult.rows.map(row => ({ longitude: row.koordinat[0], latitude: row.koordinat[1], map_id: row.map_id }));
    
    // Check if all findKoordinat have the same map_id as fixedKoordinat
    const allSameMapId = findKoordinat.every(koordinat => koordinat.map_id === mapId);
    if (allSameMapId) {
      client.release();
      return false;
    }
    
    let isValidated = false;

    // Lakukan iterasi pada setiap titik koordinat yang akan diperiksa
    for (const koordinat1 of fixedKoordinat) {
      const lon1 = koordinat1.longitude;
      const lat1 = koordinat1.latitude;
      console.log(lon1)
      console.log(lat1)
      console.log(fixedKoordinat)

      // Lakukan iterasi pada setiap titik koordinat yang akan dibandingkan jaraknya
      for (const koordinat2 of findKoordinat) {
        const lon2 = koordinat2.longitude;
        const lat2 = koordinat2.latitude;
        console.log(lon2)
        console.log(lat2)
        console.log(findKoordinat)

        // Hitung jarak antara kedua titik koordinat
        const distance = calculateDistance(lat1, lon1, lat2, lon2);
        console.log ('jarak = ', distance)
        if (distance < 1 && distance >= 0) {
          isValidated = true;
          console.log("titik", koordinat2, "tervalidasi oleh titik lain");
          break; // Keluar dari loop saat sudah ditemukan satu titik yang berdekatan
        }
      }
      // Jika tidak ada titik yang berdekatan dengan titik saat ini, kembalikan false
      if (!isValidated) {
        client.release();
        return false;
      }
    }
    // Jika semua titik telah divalidasi, kembalikan true
    client.release();
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
    client.release();
  } catch (error) {
    // Tangani kesalahan jika terjadi saat menjalankan query
    console.error("Error while updating progress:", error);
    throw error;
  }
};

const addKomentar = async (mapId, newKomentar) => {
  try {
    const client = await pool.connect();

    // Query untuk mengupdate komentar pada tabel maps
    await client.query("UPDATE maps SET komentar = $1 WHERE map_id = $2", [
      newKomentar,
      mapId,
    ]);
    client.release();
  } catch (error) {
    // Tangani kesalahan jika terjadi saat menjalankan query
    console.error("Error while updating comment:", error);
    throw error;
  }
};
