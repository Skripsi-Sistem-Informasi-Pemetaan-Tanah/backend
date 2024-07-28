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
    const coordinatesAreValid = await checkArround(mapId);
    if (coordinatesAreValid) {
      // Update progress to 1 if condition is met
      await updateProgress(mapId, 25);
    } else {
      await addKomentar(mapId, "Ada koordinat yang belum diklaim oleh orang lain");
    }

    res.status(200).send("Validation completed successfully.");
  } catch (error) {
    console.error("Error during validation:", error);
    res.status(500).send("Internal server error.");
  }
};

export const cekMapIDtoVerif = async (req, res) => {
  const client = await pool.connect();
  const { jumlahLahanBersinggungan, koordinat_id } = req.body;

  try {
    const fixedKoordinatResult = await client.query(
      "SELECT koordinat FROM koordinat WHERE koordinat_id = $1",
      [koordinat_id]
    );
    
    if (fixedKoordinatResult.rows.length === 0) {
      client.release();
      return utilData(res, 404, { message: "Koordinat tidak ditemukan" });
    }

    const fixedKoordinat = {
      longitude: fixedKoordinatResult.rows[0].koordinat[0],
      latitude: fixedKoordinatResult.rows[0].koordinat[1]
    };
    // Query untuk mengambil semua koordinat yang akan dibandingkan jaraknya
    const findKoordinatResult = await client.query(
      "SELECT map_id,koordinat FROM koordinat WHERE map_id != $1",
      [mapId]
    );
    const findKoordinat = findKoordinatResult.rows.map(row => ({
      map_id: row.map_id,
      longitude: row.koordinat[0],
      latitude: row.koordinat[1]
    }));
    let distances = [];
    // Hitung jarak dari koordinat yang diberikan ke setiap koordinat dari lahan lain
    for (const koordinat of findKoordinat) {
      const distance = calculateDistance(
        fixedKoordinat.latitude,
        fixedKoordinat.longitude,
        koordinat.latitude,
        koordinat.longitude
      );
      distances.push({ map_id: koordinat.map_id, distance });
    }

    // Urutkan jarak dan ambil sejumlah lahan terdekat yang diminta
    distances.sort((a, b) => a.distance - b.distance);
    const closestLands = distances.slice(0, jumlahLahanBersinggungan);

    // Ambil map_id dari lahan terdekat
    const closestMapIds = closestLands.map(land => land.map_id);
    // Update tabel koordinat dengan closestMapIds
    await client.query(
      "UPDATE koordinat SET map_id_need_verif = $1 WHERE koordinat_id = $2",
      [closestMapIds, koordinat_id]
    );
    
    client.release();
    return utilData(res, 200, { closestMapIds });
  } catch (error) {
    console.error("Error:", error.message);
    return utilData(res, 500, { message: "Internal Server Error" });
  } finally {
    client.release();
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
    const fixedKoordinat = fixedKoordinatResult.rows.map(row => ({
      longitude: row.koordinat[0],
      latitude: row.koordinat[1]
    }));

    // Query untuk mengambil semua koordinat yang akan dibandingkan jaraknya
    const findKoordinatResult = await client.query(
      "SELECT koordinat FROM koordinat WHERE map_id != $1",
      [mapId]
    );
    const findKoordinat = findKoordinatResult.rows.map(row => ({
      longitude: row.koordinat[0],
      latitude: row.koordinat[1]
    }));

    let validatedCount = 0;

    // Lakukan iterasi pada setiap titik koordinat yang akan diperiksa
    for (const koordinat1 of fixedKoordinat) {
      const lon1 = koordinat1.longitude;
      const lat1 = koordinat1.latitude;

      // Lakukan iterasi pada setiap titik koordinat yang akan dibandingkan jaraknya
      for (const koordinat2 of findKoordinat) {
        const lon2 = koordinat2.longitude;
        const lat2 = koordinat2.latitude;

        // Hitung jarak antara kedua titik koordinat
        const distance = calculateDistance(lat1, lon1, lat2, lon2);
        if (distance < 1) {
          validatedCount++;
          console.log("Titik", koordinat2, "tervalidasi oleh titik lain");
          break; // Keluar dari loop saat sudah ditemukan satu titik yang berdekatan
        }
      }

      // Jika telah ditemukan dua titik yang valid, kembalikan true
      if (validatedCount >= 2) {
        client.release();
        return true;
      }
    }

    // Jika tidak ada dua titik yang berdekatan dengan titik lain, kembalikan false
    client.release();
    return false;
  } catch (error) {
    // Tangani kesalahan jika terjadi saat menjalankan query
    console.error("Error while checking around:", error);
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

export const addKomentar = async (req,res) => {
  try {
    const client = await pool.connect();
    const { mapId, Komentar } = req.body;
    // Query untuk mengupdate komentar pada tabel maps
    const addKomentar = await client.query("UPDATE maps SET komentar = $1 WHERE map_id = $2", [
      Komentar,
      mapId,
    ]);
    client.release();
    if(addKomentar){
      return utilMessage(res, 200, "Komentar berhasil ditambahkan");
    }else{
      return utilMessage(res, 403, "Komentar gagal ditambahkan");
    }
  } catch (error) {
    // Tangani kesalahan jika terjadi saat menjalankan query
    utilError(res, error)
  }
};

const addKomentar = async (mapId, Komentar) => {
  try {
    const client = await pool.connect();

    // Query untuk mengupdate komentar pada tabel maps
    await client.query("UPDATE maps SET komentar = $1 WHERE map_id = $2", [
      Komentar,
      mapId,
    ]);
    client.release();
  } catch (error) {
    // Tangani kesalahan jika terjadi saat menjalankan query
    console.error("Error while updating comment:", error);
    throw error;
  }
};

export const addKomentarKoordinat = async (req,res) => {
  try {
    const client = await pool.connect();
    const { mapId, Komentar } = req.body;
    // Query untuk mengupdate komentar pada tabel maps
    const addKomentar = await client.query("UPDATE koordinat SET komentar = $1 WHERE map_id = $2", [
      Komentar,
      mapId,
    ]);
    client.release();
    if(addKomentar){
      return utilMessage(res, 200, "Komentar berhasil ditambahkan");
    }else{
      return utilMessage(res, 403, "Komentar gagal ditambahkan");
    }
  } catch (error) {
    // Tangani kesalahan jika terjadi saat menjalankan query
    utilError(res, error)
  }
};

const addKomentarKoordinat = async (mapId, Komentar) => {
  try {
    const client = await pool.connect();

    // Query untuk mengupdate komentar pada tabel maps
    await client.query("UPDATE koordinat SET komentar = $1 WHERE map_id = $2", [
      Komentar,
      mapId,
    ]);
    client.release();
  } catch (error) {
    // Tangani kesalahan jika terjadi saat menjalankan query
    console.error("Error while updating comment:", error);
    throw error;
  }
};

