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

export const saveUser = async (req, res) => {
  const user = req.body;

  try {
    const query = `
      INSERT INTO users (user_id, username, nama_lengkap, email, password, role, refresh_token, updated_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        username = EXCLUDED.username,
        nama_lengkap = EXCLUDED.nama_lengkap,
        email = EXCLUDED.email,
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        refresh_token = EXCLUDED.refresh_token,
        updated_at = EXCLUDED.updated_at
    `;
    const currentTime = new Date();
    const values = [
      user.user_id, 
      user.username, 
      user.nama_lengkap, 
      user.email, 
      null, 
      2, 
      null, 
      currentTime, 
      currentTime
    ];

    await pool.query(query, values);
    return utilMessage(res, 200, 'User saved successfully');
  } catch (error) {
    console.error('Error saving user:', error);
    return utilError(res, error, 'Error saving user');
  }
};

export const updateUserField = async (req, res) => {
  const { user_id, username, nama_lengkap, email } = req.body;

  try {
    const fieldsToUpdate = {};
    if (username) fieldsToUpdate.username = username;
    if (nama_lengkap) fieldsToUpdate.nama_lengkap = nama_lengkap;
    if (email) fieldsToUpdate.email = email;

    fieldsToUpdate.updated_at = new Date();

    const setString = Object.keys(fieldsToUpdate).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [user_id, ...Object.values(fieldsToUpdate)];

    const query = `UPDATE users SET ${setString} WHERE user_id = $1`;

    await pool.query(query, values);
    return utilMessage(res, 200, 'User updated successfully');
  } catch (error) {
    console.error('Error updating user:', error);
    return utilError(res, error, 'Error updating user');
  }
};

export const deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const query = 'DELETE FROM users WHERE user_id = $1';
    await pool.query(query, [userId]);
    return utilMessage(res, 200, 'User deleted successfully');
  } catch (error) {
    console.error('Error deleting user:', error);
    return utilError(res, error, 'Error deleting user');
  }
};

export const saveLahan = async (req, res) => {
  const lahan = req.body;

  try {
    if (!lahan.map_id) {
      throw new Error('map_id is required');
    }

    const currentTime = new Date();

    const mapsQuery = `
      INSERT INTO maps (map_id, user_id, nama_lahan, koordinat, status, progress, updated_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (map_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        nama_lahan = EXCLUDED.nama_lahan,
        koordinat = EXCLUDED.koordinat,
        status = EXCLUDED.status,
        progress = EXCLUDED.progress,
        updated_at = EXCLUDED.updated_at
    `;
    const mapsValues = [
      lahan.map_id, 
      lahan.user_id, 
      lahan.nama_lahan, 
      JSON.stringify(lahan.koordinat), 
      'belum tervalidasi', 
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
        coord.coordinates.split(',').map(parseFloat), 
        coord.foto_patokan, 
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
        coord.foto_patokan,
        currentTime,
        lahan.map_id,
        coord.coordinates.split(',').map(parseFloat)
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
    const mapsQuery = 'SELECT user_id, map_id, updated_at, koordinat FROM maps WHERE user_id = $1';
    const mapsResult = await pool.query(mapsQuery, [userId]);

    const verifikasiQuery = 'SELECT map_id, komentar, progress, status, updated_at FROM verifikasi';
    const verifikasiResult = await pool.query(verifikasiQuery);

    const lahanData = mapsResult.rows.map(map => {
      const verifikasiData = verifikasiResult.rows.filter(v => v.map_id === map.map_id);
      return {
        user_id: map.user_id,
        map_id: map.map_id,
        updated_at: map.updated_at,
        koordinat: map.koordinat,
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
    const mapsQuery = 'SELECT user_id, map_id, updated_at, koordinat FROM maps';
    const mapsResult = await pool.query(mapsQuery);

    const verifikasiQuery = 'SELECT map_id, komentar, progress, status, updated_at FROM verifikasi';
    const verifikasiResult = await pool.query(verifikasiQuery);

    const lahanData = mapsResult.rows.map(map => {
      const verifikasiData = verifikasiResult.rows.filter(v => v.map_id === map.map_id);
      return {
        user_id: map.user_id,
        map_id: map.map_id,
        updated_at: map.updated_at,
        koordinat: map.koordinat,
        verifikasi: verifikasiData
      };
    });

    return utilData(res, 200, { lahan: lahanData });
  } catch (error) {
    console.error('Error fetching lahan data:', error);
    return utilError(res, error, 'Error fetching lahan data');
  }
};
