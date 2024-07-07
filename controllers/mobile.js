import { utilMessage, utilData, utilError } from "../utils/message.js";
import { pool } from "../config/db.js";
import bodyParser from "body-parser";

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

// export const saveUser = async (req, res) => {
//   const user = req.body;

//   try {
//     const query = `
//       INSERT INTO users (user_id, username, nama_lengkap, email, password, role, refresh_token, updated_at, created_at)
//       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
//       ON CONFLICT (user_id) DO UPDATE SET
//         username = EXCLUDED.username,
//         nama_lengkap = EXCLUDED.nama_lengkap,
//         email = EXCLUDED.email,
//         password = EXCLUDED.password,
//         role = EXCLUDED.role,
//         refresh_token = EXCLUDED.refresh_token,
//         updated_at = EXCLUDED.updated_at
//     `;
//     const currentTime = new Date();
//     const values = [
//       user.user_id,
//       user.username,
//       user.nama_lengkap,
//       user.email,
//       null,
//       2,
//       null,
//       currentTime,
//       currentTime
//     ];

//     await pool.query(query, values);
//     return utilMessage(res, 200, 'User saved successfully');
//   } catch (error) {
//     console.error('Error saving user:', error);
//     return utilError(res, error, 'Error saving user');
//   }
// };

// export const updateUserField = async (req, res) => {
//   const { user_id, username, nama_lengkap, email } = req.body;

//   try {
//     const fieldsToUpdate = {};
//     if (username) fieldsToUpdate.username = username;
//     if (nama_lengkap) fieldsToUpdate.nama_lengkap = nama_lengkap;
//     if (email) fieldsToUpdate.email = email;

//     fieldsToUpdate.updated_at = new Date();

//     const setString = Object.keys(fieldsToUpdate).map((key, index) => ${key} = $${index + 2}).join(', ');
//     const values = [user_id, ...Object.values(fieldsToUpdate)];

//     const query = UPDATE users SET ${setString} WHERE user_id = $1;

//     await pool.query(query, values);
//     return utilMessage(res, 200, 'User updated successfully');
//   } catch (error) {
//     console.error('Error updating user:', error);
//     return utilError(res, error, 'Error updating user');
//   }
// };

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

        // Delete from users table
        // const deleteUserQuery = 'DELETE FROM users WHERE user_id = $1';
        // await pool.query(deleteUserQuery, [userId]);

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

        const currentTime = new Date();

        const userQuery = `
      INSERT INTO users (user_id, nama_lengkap)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET
        nama_lengkap = EXCLUDED.nama_lengkap
    `;
        const userValues = [
            lahan.user_id,
            lahan.nama_lengkap
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

export const getAllLahanbyUserId = async (req, res) => {
    const userId = req.params.user_id;

    try {
        const mapsQuery = 'SELECT user_id, map_id, nama_lahan, jenis_lahan, deskripsi_lahan, updated_at, koordinat FROM maps WHERE user_id = $1';
        const mapsResult = await pool.query(mapsQuery, [userId]);

        const patokanQuery = 'SELECT map_id, koordinat, image FROM koordinat';
        const patokanResult = await pool.query(patokanQuery);

        const verifikasiQuery = 'SELECT map_id, komentar, progress, status, updated_at FROM verifikasi';
        const verifikasiResult = await pool.query(verifikasiQuery);

        const lahanData = mapsResult.rows.map(map => {
            const patokanData = patokanResult.rows
                .filter(p => p.map_id === map.map_id)
                .map(p => ({
                    map_id: p.map_id,
                    koordinat: ${p.koordinat[0]}, ${p.koordinat[1]},
                    image: p.image
        }));
            const verifikasiData = verifikasiResult.rows.filter(v => v.map_id === map.map_id);

            return {
                user_id: map.user_id,
                map_id: map.map_id,
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

        const patokanQuery = 'SELECT map_id, koordinat, image FROM koordinat';
        const patokanResult = await pool.query(patokanQuery);

        const verifikasiQuery = 'SELECT map_id, komentar, progress, status, updated_at FROM verifikasi';
        const verifikasiResult = await pool.query(verifikasiQuery);

        const lahanData = mapsResult.rows.map(map => {
            const patokanData = patokanResult.rows
                .filter(p => p.map_id === map.map_id)
                .map(p => ({
                    map_id: p.map_id,
                    koordinat: ${p.koordinat[0]}, ${p.koordinat[1]},
                    image: p.image
        }));
            const verifikasiData = verifikasiResult.rows.filter(v => v.map_id === map.map_id);
            return {
                user_id: map.user_id,
                nama_pemilik: map.nama_pemilik,
                map_id: map.map_id,
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