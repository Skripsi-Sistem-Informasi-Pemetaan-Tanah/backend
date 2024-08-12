import { utilMessage, utilData, utilError } from "../utils/message.js";
import { pool } from "../config/db.js";

export const validasiOnProgress = async (req, res) => {
  const client = await pool.connect();
  const { mapId } = req.body;
  try {
    const editValidasi = await client.query(
      "UPDATE maps SET status = 1, komentar = 'Data masih dalam progress', updated_at = NOW() WHERE map_id = $1",
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

export const validasiKoordinatBerhasil = async (req, res) => {
  const client = await pool.connect();
  const { mapId } = req.body;
  try {
    const editValidasi = await client.query(
      "UPDATE koordinat SET status = 'Data Tervalidasi', komentar = 'Data Tervalidasi', progress = 100, updated_at = NOW() WHERE map_id = $1",
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
  const { mapId } = req.body;
  try {
    const editValidasi = await client.query(
      "UPDATE maps SET komentar = 'Lahan ditolak silahkan submit ulang', updated_at = NOW() WHERE map_id = $2",
      [ mapId]
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
      await addKomentars(mapId, "Ada koordinat yang belum diklaim oleh orang lain");
    }

    res.status(200).send("Validation completed successfully.");
  } catch (error) {
    console.error("Error during validation:", error);
    res.status(500).send("Internal server error.");
  }
};

export const cekKoordinatIDtoVerif = async (req, res) => {
  const client = await pool.connect();
  const { jumlahLahanBersinggungan, perkiraanLahanBersinggungan, koordinatId, koordinatVerif } = req.body;
  const lahanBelumDiisi = perkiraanLahanBersinggungan - jumlahLahanBersinggungan
  //1. tambahkan koordinat_verif dari koordinat tsb kemudian cari koordinat lain yg memliki koordinat_verif tsb 
  //untuk diinputkan koordinatID ke koordinat_id_need_verif
  //2. buat sistem di mobile ketika status lahan menjadi 1 maka akan mentrigger fungsi untuk mengubah status lahan ketika 
  //percent of agree semua koordinat di lahan tsb 1
  try {
    const fixedKoordinatResult = await client.query(
      "SELECT koordinat, map_id FROM koordinat WHERE koordinat_id = $1",
      [koordinatId]
    );
    if (fixedKoordinatResult.rows.length === 0) {  
      return utilData(res, 404, { message: "Koordinat tidak ditemukan" });
    }
    const fixedKoordinat = {
      longitude: fixedKoordinatResult.rows[0].koordinat[0],
      latitude: fixedKoordinatResult.rows[0].koordinat[1],
      mapId: fixedKoordinatResult.rows[0].map_id
    };
    // Query untuk mengambil semua koordinat yang akan dibandingkan jaraknya
    const findKoordinatResult = await client.query(
      "SELECT map_id,koordinat, koordinat_id FROM koordinat WHERE map_id != $1",
      [fixedKoordinat.mapId]
    );
    const findKoordinat = findKoordinatResult.rows.map(row => ({
      map_id: row.map_id,
      koordinat_id: row.koordinat_id,
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
      distances.push({ koordinat_id: koordinat.koordinat_id, distance });
    }

    // Urutkan jarak dan ambil sejumlah lahan terdekat yang diminta
    distances.sort((a, b) => a.distance - b.distance);
    const closestLands = distances.slice(0, jumlahLahanBersinggungan);
  
    const closestKoordinatIds = [];

    closestKoordinatIds.push(koordinatId);
    
    closestLands.forEach(land => {
      closestKoordinatIds.push(land.koordinat_id);
    });
    
    // Tambahkan null sebanyak lahanBelumDiisi
    for (let i = 0; i < lahanBelumDiisi; i++) {
      closestKoordinatIds.push(null);
    }

    // Update tabel koordinat dengan closestMapIds
    await client.query(
      "UPDATE koordinat SET koordinat_id_need_verif = $1 WHERE koordinat_id = $2",
      [closestKoordinatIds, koordinatId]
    );
        // Memisahkan latitude dan longitude dari string koor
    const [latitude, longitude] = koordinatVerif.split(',');
    
    // Membuat format koordinat yang diinginkan {latitude,longitude}
    const formattedKoor = `{${latitude},${longitude}}`;
    // const findKoordinatWithaSameVerif = await client.query(
    //   "SELECT koordinat_id_need_verif FROM koordinat WHERE koordinat_verif = $1",
    //   [formattedKoor]
    // );
    const findKoordinatWithaSameVerif = await client.query(
      "SELECT koordinat_id_need_verif, koordinat_id FROM koordinat WHERE koordinat_verif = $1 and koordinat_id != $2",
      [formattedKoor, koordinatId]
    );
    
    console.log(findKoordinatWithaSameVerif.rows);
    
    if (findKoordinatWithaSameVerif.rows.length > 0) {
      for (const koordinatidneedverif of findKoordinatWithaSameVerif.rows) {
        let koordinatIdFound = false;
        console.log('koordinatidneedverif',koordinatidneedverif)
        console.log('koordinatidneedverif.koordinat_id_need_verif',koordinatidneedverif.koordinat_id_need_verif)
        // Cek apakah koordinatId sudah ada di array
        for (const datakoorid of koordinatidneedverif.koordinat_id_need_verif) {
          if (datakoorid === koordinatId) {
            koordinatIdFound = true;
            break;
          }
        }
    
        if (koordinatIdFound) {
          continue; // Lanjutkan ke koordinatidneedverif berikutnya jika koordinatId sudah ada
        }
    
        // Cari indeks pertama yang nilainya null
        const index = koordinatidneedverif.koordinat_id_need_verif.indexOf(null);
        if (index !== -1) {
          // Ganti nilai null pada indeks tersebut dengan koordinatId
          koordinatidneedverif.koordinat_id_need_verif[index] = koordinatId.toString();
    
          const cek = await client.query(
            "UPDATE koordinat SET koordinat_id_need_verif = $1 WHERE koordinat_id = $2",
            [koordinatidneedverif.koordinat_id_need_verif, koordinatidneedverif.koordinat_id]
          );
    
          if (cek) {
            console.log(koordinatidneedverif.koordinat_id_need_verif);
            return utilData(res, 200, { message: "Koordinat berhasil" });
          }
        }
      }
    }
    return utilData(res, 200, { closestKoordinatIds });
  } catch (error) {
    console.error("Error:", error.message);
    return utilData(res, 500, { message: "Internal Server Error" });
  } finally {
    client.release();
  }
};
export const cekMapIDtoVerif = async (req, res) => {
  const client = await pool.connect();
  const { jumlahLahanBersinggungan, perkiraanLahanBersinggungan, koordinatId } = req.body;
  const lahanBelumDiisi = perkiraanLahanBersinggungan - jumlahLahanBersinggungan
  try {
    const fixedKoordinatResult = await client.query(
      "SELECT koordinat, map_id FROM koordinat WHERE koordinat_id = $1",
      [koordinatId]
    );
    
    if (fixedKoordinatResult.rows.length === 0) {
      
      return utilData(res, 404, { message: "Koordinat tidak ditemukan" });
    }

    const fixedKoordinat = {
      longitude: fixedKoordinatResult.rows[0].koordinat[0],
      latitude: fixedKoordinatResult.rows[0].koordinat[1],
      mapId: fixedKoordinatResult.rows[0].map_id
    };
    // Query untuk mengambil semua koordinat yang akan dibandingkan jaraknya
    const findKoordinatResult = await client.query(
      "SELECT map_id,koordinat FROM koordinat WHERE map_id != $1",
      [fixedKoordinat.mapId]
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
    for (let i = 0; i < lahanBelumDiisi; i++) {
      closestMapIds.push(null);
    }
    // Update tabel koordinat dengan closestMapIds
    await client.query(
      "UPDATE koordinat SET map_id_need_verif = $1 WHERE koordinat_id = $2",
      [closestMapIds, koordinatId]
    );
  
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

const addKomentars = async (mapId, Komentar) => {
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
export const countPercentOfAgree = async (req,res) => {
  try {
    const client = await pool.connect();
    const {mapId} = req.body;
    // Query untuk mengupdate komentar pada tabel maps
    const dataKoor = await client.query("SELECT koordinat.status,koordinat.koordinat_id_need_verif FROM koordinat WHERE map_id = $1", 
      [mapId]);
    let totalAgree = []
    for(const dataKoord of dataKoor.rows){
      // Filter out null or undefined elements
      const dataArray = dataKoord.koordinat_id_need_verif
      const filteredArray = dataArray.filter(item => item !== null && item !== undefined);
      let agreeArray = []
      for(const koordinatId of filteredArray){
        const dataKoorID = await client.query("SELECT koordinat.status FROM koordinat WHERE koordinat_id = $1", 
          [koordinatId]);
      agreeArray.push(dataKoorID.rows[0].status)
      }
      // Menghitung jumlah semua elemen di dalam array
      const sum = agreeArray.reduce((accumulator, currentValue) => accumulator + currentValue, 0);

      // Membagi jumlah elemen dengan panjang array
      const percentOfAgree = sum / agreeArray.length *100;
      if(percentOfAgree == 100){
        totalAgree++
      }
    }
    if (totalAgree == dataKoor.rows.length){
      await client.query("UPDATE maps SET status=2 WHERE map_id = $1", 
          [mapId]);
    }
    
    client.release();
    return utilMessage(res, 200, "Status Lahan berhasil diperbarui");
  } catch (error) {
    // Tangani kesalahan jika terjadi saat menjalankan query
    console.error("Error while updating comment:", error);
    throw error;
  }
};
export const addKomentarKoordinat = async (req,res) => {
  try {
    const client = await pool.connect();
    const { koordinatId, Komentar } = req.body;
    // Query untuk mengupdate komentar pada tabel koordinat
    const addKomentar = await client.query("UPDATE koordinat SET komentar = $1 WHERE koordinat_id = $2", [
      Komentar,
      koordinatId,
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

const addKomentarKoordinats = async (mapId, Komentar) => {
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