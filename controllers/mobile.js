import { utilMessage, utilData, utilError } from "../utils/message.js";
import { pool } from "../config/db.js";

export const checkConnectionDatabase = async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Successfully connected to the database');
    return utilData(res, 200, {
      connected: true,
      message: 'Database connection successful',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    console.error('Error connecting to the database:', error);
    return utilError(res, error, 'Failed to connect to the database');
  }
};

export const saveUser = async (req, res) => {
  const user = req.body;

  try {
    const query = `
      INSERT INTO users (user_id, nama_lengkap)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        nama_lengkap = EXCLUDED.nama_lengkap
    `;
    const currentTime = new Date();
    const values = [
      user.user_id, 
      user.nama_lengkap, 
    ];

    await pool.query(query, values);
    return utilMessage(res, 200, 'User saved successfully');
  } catch (error) {
    console.error('Error saving user:', error);
    return utilError(res, error, 'Error saving user');
  }
};

export const deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    // Start a transaction
    await pool.query('BEGIN');

    // Get all map_ids for the given user_id
    const getMapIdsQuery = 'SELECT map_id FROM maps WHERE user_id = $1';
    const mapIdsResult = await pool.query(getMapIdsQuery, [userId]);
    const mapIds = mapIdsResult.rows.map(row => row.map_id);

    // Delete from verifikasi, history, and koordinat tables
    if (mapIds.length > 0) {
      const deleteVerifikasiQuery = 'DELETE FROM verifikasi WHERE map_id = ANY($1)';
      const deleteHistoryQuery = 'DELETE FROM history WHERE map_id = ANY($1)';
      const deleteKoordinatQuery = 'DELETE FROM koordinat WHERE map_id = ANY($1)';

      await pool.query(deleteVerifikasiQuery, [mapIds]);
      await pool.query(deleteHistoryQuery, [mapIds]);
      await pool.query(deleteKoordinatQuery, [mapIds]);
    }

    // Delete from maps table
    const deleteMapsQuery = 'DELETE FROM maps WHERE user_id = $1';
    await pool.query(deleteMapsQuery, [userId]);

    const deleteUserQuery = 'DELETE FROM users WHERE user_id = $1';
    await pool.query(deleteUserQuery, [userId]);

    // Commit the transaction
    await pool.query('COMMIT');

    return utilMessage(res, 200, 'User and related data deleted successfully');
  } catch (error) {
    // Rollback the transaction in case of error
    await pool.query('ROLLBACK');
    console.error('Error deleting user and related data:', error);
    return utilError(res, error, 'Error deleting user and related data');
  }
};



export const saveLahan = async (req, res) => {
  const lahan = req.body;

  try {
    if (!lahan.map_id) {
      throw new Error('map_id is required');
    }

    if (!lahan.map_id) {
      throw new Error('map_id is required');
    }

    const currentTime = new Date();

    const userQuery = `
      INSERT INTO users (user_id, nama_lengkap)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        nama_lengkap = EXCLUDED.nama_lengkap
    `;
    const userValues = [
      lahan.user_id,
      lahan.nama_pemilik
    ];
    await pool.query(userQuery, userValues);

    const mapsQuery = `
      INSERT INTO maps (map_id, user_id, nama_pemilik, nama_lahan, jenis_lahan, deskripsi_lahan, koordinat, status, progress, updated_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (map_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        nama_pemilik = EXCLUDED.nama_pemilik,
        nama_lahan = EXCLUDED.nama_lahan,
        jenis_lahan = EXCLUDED.jenis_lahan,
        deskripsi_lahan = EXCLUDED.deskripsi_lahan,
        koordinat = EXCLUDED.koordinat,
        status = EXCLUDED.status,
        progress = EXCLUDED.progress,
        updated_at = EXCLUDED.updated_at
    `;
    const mapsValues = [
      lahan.map_id,
      lahan.user_id,
      lahan.nama_pemilik,
      lahan.nama_lahan,
      lahan.jenis_lahan,
      lahan.deskripsi_lahan,
      JSON.stringify(lahan.koordinat),
      0,
      0,
      currentTime,
      currentTime
    ];
    await pool.query(mapsQuery, mapsValues);

    for (const coord of lahan.koordinat) {
      const koordinatQuery = `
        INSERT INTO koordinat (map_id, koordinat, image, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (map_id, koordinat) DO UPDATE SET
          image = EXCLUDED.image,
          updated_at = EXCLUDED.updated_at
      `;
      const koordinatValues = [
        lahan.map_id,
        coord.koordinat.split(',').map(parseFloat),
        coord.image,
        currentTime,
        currentTime
      ];
      await pool.query(koordinatQuery, koordinatValues);
    }

    return utilMessage(res, 200, 'Lahan saved successfully');
  } catch (error) {
    console.error('Error saving lahan:', error);
    return utilError(res, error, 'Error saving lahan');
  }
};


export const updateFotoPatokan = async (req, res) => {
  const lahan = req.body;

  try {
    if (!lahan.map_id) {
      throw new Error('map_id is required');
    }

    const currentTime = new Date();

    const updateMapsQuery = `
      UPDATE maps
      SET koordinat = $1, updated_at = $2
      WHERE map_id = $3
    `;
    const mapsValues = [JSON.stringify(lahan.koordinat), currentTime, lahan.map_id];
    await pool.query(updateMapsQuery, mapsValues);

    for (const coord of lahan.koordinat) {
      const updateKoordinatQuery = `
        UPDATE koordinat
        SET image = $1, updated_at = $2
        WHERE map_id = $3 AND koordinat = $4
      `;
      const koordinatValues = [
        coord.image,
        currentTime,
        lahan.map_id,
        coord.koordinat.split(',').map(parseFloat)
      ];
      await pool.query(updateKoordinatQuery, koordinatValues);
    }

    return utilMessage(res, 200, 'Foto patokan updated successfully');
  } catch (error) {
    console.error('Error updating foto patokan:', error);
    return utilError(res, error, 'Error updating foto patokan');
  }
};

export const verifikasiKoordinat = async (req, res) => {
  const lahan = req.body;

  try {
    if (!lahan.map_id) {
      throw new Error('map_id is required');
    }

    const currentTime = new Date();

    const updateMapsQuery = `
      UPDATE maps
      SET koordinat = $1, updated_at = $2
      WHERE map_id = $3
    `;
    const mapsValues = [JSON.stringify(lahan.koordinat), currentTime, lahan.map_id];
    await pool.query(updateMapsQuery, mapsValues);

    for (const coord of lahan.koordinat) {
      const koordinatValue = coord.status === 1
        ? coord.koordinat_verif.split(',').map(parseFloat) : coord.koordinat.split(',').map(parseFloat);

      const updateKoordinatQuery = `
        UPDATE koordinat
        SET status = $1, updated_at = $2, komentar = $3, koordinat = $4
        WHERE map_id = $5 AND koordinat_verif = $6
      `;
      const koordinatValues = [
        coord.status,
        currentTime,
        coord.komentar,
        koordinatValue,
        lahan.map_id,
        coord.koordinat_verif.split(',').map(parseFloat)
      ];
      await pool.query(updateKoordinatQuery, koordinatValues);

            // Check if all statuses are 1
            if (coord.status !== 1) {
              allStatusOne = false;
            }
//       const updateKoordinatQuery = `
//   INSERT INTO koordinat (status, updated_at, komentar, koordinat, map_id, koordinat_verif)
//   VALUES ($1, $2, $3, $4, $5, $6)
//   ON CONFLICT (map_id, koordinat_verif)
//   DO UPDATE SET 
//     status = EXCLUDED.status, 
//     updated_at = EXCLUDED.updated_at, 
//     komentar = EXCLUDED.komentar, 
//     koordinat = EXCLUDED.koordinat
// `;
// const koordinatValues = [
//   coord.status,
//   currentTime,
//   coord.komentar,
//   koordinatValue,
//   lahan.map_id,
//   coord.koordinat_verif.split(',').map(parseFloat)
// ];
// await pool.query(updateKoordinatQuery, koordinatValues);
    }

    // If all statuses are 1, update the komentar in the maps table
    if (allStatusOne) {
      const updateKomentarQuery = `
        UPDATE maps
        SET komentar = 'silakan tunggu validasi titik koordinat dari pemilik lahan yang bersinggungan dengan lahan Anda', updated_at = $1
        WHERE map_id = $2
      `;
      await pool.query(updateKomentarQuery, [currentTime, lahan.map_id]);
    }

    return utilMessage(res, 200, 'Koordinat berhasil divalidasi');
  } catch (error) {
    console.error('Error checking coordinates:', error);
    return utilError(res, error, 'Error checking coordinates');
  }
};

export const getAllLahanbyUserId = async (req, res) => {
  const userId = req.params.user_id;

  try {
    const mapsQuery = 'SELECT user_id, map_id, nama_pemilik, nama_lahan, jenis_lahan, deskripsi_lahan, updated_at, koordinat FROM maps WHERE user_id = $1';
    const mapsResult = await pool.query(mapsQuery, [userId]);

    const patokanQuery = 'SELECT koordinat_id, map_id, koordinat, image, status, koordinat_verif, komentar, koordinat_id_need_verif FROM koordinat';
    const patokanResult = await pool.query(patokanQuery);

    const verifikasiQuery = 'SELECT map_id, komentar, progress, new_status, updated_at FROM verifikasi';
    const verifikasiResult = await pool.query(verifikasiQuery);

    const usersQuery = 'SELECT user_id, nama_lengkap FROM users';
    const usersResult = await pool.query(usersQuery);

    const usersMap = new Map(usersResult.rows.map(user => [user.user_id, user.nama_lengkap]));

    const lahanData = mapsResult.rows.map(map => {
      const patokanData = patokanResult.rows
        .filter(p => p.map_id === map.map_id)
        .map(p => {
          const totalNeedVerif = patokanResult.rows.filter(pk => pk.koordinat_id_need_verif === p.koordinat_id).length;
          const agreedCount = patokanResult.rows.filter(pk => 
            pk.koordinat_id_need_verif === p.koordinat_id && 
            pk.status === 1 && 
            pk.koordinat && 
            pk.koordinat_verif && 
            `${pk.koordinat[0] ?? 0}, ${pk.koordinat[1] ?? 0}` === `${pk.koordinat_verif[0] ?? 0}, ${pk.koordinat_verif[1] ?? 0}`
          ).length;
          const percentAgree = totalNeedVerif ? (agreedCount / totalNeedVerif) * 100 : 0;
          return {
            map_id: p.map_id,
            koordinat: p.koordinat ? `${p.koordinat[0] ?? 0}, ${p.koordinat[1] ?? 0}` : '0, 0',
            image: p.image,
            status: p.status,
            koordinat_verif: p.koordinat_verif ? `${p.koordinat_verif[0] ?? 0}, ${p.koordinat_verif[1] ?? 0}` : '0, 0',
            komentar: p.komentar,
            percent_agree: percentAgree
          };
        });

      const verifikasiData = verifikasiResult.rows.filter(v => v.map_id === map.map_id);
      
      return {
        user_id: map.user_id,
        map_id: map.map_id,
        nama_pemilik: usersMap.get(map.user_id),
        nama_lahan: map.nama_lahan,
        jenis_lahan: map.jenis_lahan,
        deskripsi_lahan: map.deskripsi_lahan,
        updated_at: map.updated_at,
        koordinat: patokanData,
        verifikasi: verifikasiData
      };
    });

    return utilData(res, 200, { lahan: lahanData });
  } catch (error) {
    console.error('Error fetching lahan data for user:', error);
    return utilError(res, error, 'Error fetching lahan data for user');
  }
};


export const getAllLahan = async (req, res) => {
  try {
    const mapsQuery = 'SELECT user_id, map_id, nama_pemilik, nama_lahan, jenis_lahan, deskripsi_lahan, updated_at FROM maps';
    const mapsResult = await pool.query(mapsQuery);

    const patokanQuery = 'SELECT koordinat_id, map_id, koordinat, image, status, koordinat_verif, komentar, koordinat_id_need_verif FROM koordinat';
    const patokanResult = await pool.query(patokanQuery);

    const verifikasiQuery = 'SELECT map_id, komentar, progress, new_status, updated_at FROM verifikasi';
    const verifikasiResult = await pool.query(verifikasiQuery);

    const usersQuery = 'SELECT user_id, nama_lengkap FROM users';
    const usersResult = await pool.query(usersQuery);

    const usersMap = new Map(usersResult.rows.map(user => [user.user_id, user.nama_lengkap]));

    const lahanData = mapsResult.rows.map(map => {
      const patokanData = patokanResult.rows
        .filter(p => p.map_id === map.map_id)
        .map(p => {
          const totalNeedVerif = patokanResult.rows.filter(pk => pk.koordinat_id_need_verif === p.koordinat_id).length;
          const agreedCount = patokanResult.rows.filter(pk => 
            pk.koordinat_id_need_verif === p.koordinat_id && 
            pk.status === 1 && 
            pk.koordinat && 
            pk.koordinat_verif && 
            `${pk.koordinat[0] ?? 0}, ${pk.koordinat[1] ?? 0}` === `${pk.koordinat_verif[0] ?? 0}, ${pk.koordinat_verif[1] ?? 0}`
          ).length;
          const percentAgree = totalNeedVerif ? (agreedCount / totalNeedVerif) * 100 : 0;
          return {
            map_id: p.map_id,
            koordinat: p.koordinat ? `${p.koordinat[0] ?? 0}, ${p.koordinat[1] ?? 0}` : '0, 0',
            image: p.image,
            status: p.status,
            koordinat_verif: p.koordinat_verif ? `${p.koordinat_verif[0] ?? 0}, ${p.koordinat_verif[1] ?? 0}` : '0, 0',
            komentar: p.komentar,
            percent_agree: percentAgree
          };
        });

      const verifikasiData = verifikasiResult.rows.filter(v => v.map_id === map.map_id);

      return {
        user_id: map.user_id,
        map_id: map.map_id,
        nama_pemilik: usersMap.get(map.user_id),
        nama_lahan: map.nama_lahan,
        jenis_lahan: map.jenis_lahan,
        deskripsi_lahan: map.deskripsi_lahan,
        updated_at: map.updated_at,
        koordinat: patokanData,
        verifikasi: verifikasiData
      };
    });

    return utilData(res, 200, { lahan: lahanData });
  } catch (error) {
    console.error('Error fetching lahan data:', error);
    return utilError(res, error, 'Error fetching lahan data');
  }
};



// export const getAllLahan = async (req, res) => {
//   try {
//     const mapsQuery = 'SELECT user_id, map_id, nama_pemilik, nama_lahan, jenis_lahan, deskripsi_lahan, updated_at FROM maps';
//     const mapsResult = await pool.query(mapsQuery);

//     const patokanQuery = 'SELECT map_id, koordinat, image, status, koordinat_verif, komentar, koordinat_id_need_verif FROM koordinat';
//     const patokanResult = await pool.query(patokanQuery);

//     const verifikasiQuery = 'SELECT map_id, komentar, progress, new_status, updated_at FROM verifikasi';
//     const verifikasiResult = await pool.query(verifikasiQuery);

//     const usersQuery = 'SELECT user_id, nama_lengkap FROM users';
//     const usersResult = await pool.query(usersQuery);

//     const usersMap = new Map(usersResult.rows.map(user => [user.user_id, user.nama_lengkap]));

//     const lahanData = mapsResult.rows.map(map => {
//       const patokanData = patokanResult.rows
//         .filter(p => p.map_id === map.map_id)
//         .map(p => {
//           const totalNeedVerif = patokanResult.rows.filter(pk => pk.koordinat_id_need_verif === p.map_id).length;
//           const agreedCount = patokanResult.rows.filter(pk => pk.koordinat_id_need_verif === p.map_id && pk.status === 1 && `${pk.koordinat[0]}, ${pk.koordinat[1]}` === `${p.koordinat_verif[0]}, ${p.koordinat_verif[1]}`).length;
//           const percentAgree = totalNeedVerif ? (agreedCount / totalNeedVerif) * 100 : 0;
//           return {
//             map_id: p.map_id,
//             koordinat: `${p.koordinat[0]}, ${p.koordinat[1]}`,
//             image: p.image,
//             status: p.status,
//             koordinat_verif: `${p.koordinat_verif[0]}, ${p.koordinat_verif[1]}`,
//             komentar: p.komentar,
//             percent_agree: percentAgree
//           };
//         });

//       const verifikasiData = verifikasiResult.rows.filter(v => v.map_id === map.map_id);

//       return {
//         user_id: map.user_id,
//         map_id: map.map_id,
//         nama_pemilik: usersMap.get(map.user_id),
//         nama_lahan: map.nama_lahan,
//         jenis_lahan: map.jenis_lahan,
//         deskripsi_lahan: map.deskripsi_lahan,
//         updated_at: map.updated_at,
//         koordinat: patokanData,
//         verifikasi: verifikasiData
//       };
//     });

//     return utilData(res, 200, { lahan: lahanData });
//   } catch (error) {
//     console.error('Error fetching lahan data:', error);
//     return utilError(res, error, 'Error fetching lahan data');
//   }
// };

