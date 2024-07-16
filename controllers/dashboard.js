import Map from "../models/mapModel.js";

import { utilMessage, utilData, utilError } from "../utils/message.js";
import { pool } from "../config/db.js";
import { Op, Sequelize } from "sequelize";

export const totalRequest = async (req, res) => {
  try {
    const result = await Map.count();
    return utilData(res, 200, { result });
  } catch (error) {
    return utilError(res, error);
  }
};

export const pendingRequest = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT COUNT(*) FROM maps WHERE created_at = updated_at;"
    );

    const results = parseInt(result.rows[0].count);

    return utilData(res, 200, { results });
  } finally {
    client.release();
  }
};

export const verifiedRequest = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT COUNT(*) FROM maps WHERE status = 2;"
    );

    const results = parseInt(result.rows[0].count);

    return utilData(res, 200, { results });
  } finally {
    client.release();
  }
};

export const weeklyRequestChange = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE date_trunc('month', updated_at) = date_trunc('month', CURRENT_DATE)) AS current_month_count,
        COUNT(*) FILTER (WHERE date_trunc('month', updated_at) = date_trunc('month', CURRENT_DATE - interval '1 month')) AS last_month_count
      FROM maps
    `);

    const currentMonthCount = result.rows[0].current_month_count;
    const lastMonthCount = result.rows[0].last_month_count;
    const results = currentMonthCount - lastMonthCount

    return utilData(res, 200, { results });
  } finally {
    client.release();
  }
};
// export const pendingRequest = async (req, res) => {
//   try {
//     const result = await Map.count({
//       where: {
//         [Op.and]: [
//           Sequelize.fn("DATE_TRUNC", "day", Sequelize.col("created_at")),
//           {
//             [Op.eq]: Sequelize.fn(
//               "DATE_TRUNC",
//               "day",
//               Sequelize.col("updated_at")
//             ),
//           },
//         ],
//       },
//     });
//     console.log(result);
//     return utilData(res, 200, { result });
//   } catch (error) {
//     return utilError(res, error);
//   }
// };

// export const requestPerDay = async (req, res) => {
//   const client = await pool.connect();
//   let results = [];
//   try {
//     for (const i = 0; i <= 7; i++) {
//       const result = await client.query(
//         "SELECT * FROM maps WHERE DATE(updated_at) = CURRENT_DATE - INTERVAL '" +
//           i +
//           " day'"
//       );
//       results.push(result.rows);
//     }
//     return utilData(res, 200, { results });
//   } finally {
//     client.release();
//   }
// };

export const requestPerDay = async (req, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT to_char(created_at, 'YYYY/MM/DD') as dates, to_char(created_at, 'DD Mon') as date, COUNT(*) as request FROM maps GROUP BY dates,date ORDER BY dates`
    );

    const results = result.rows.map((row) => ({
      Date: row.date,
      Request: row.request,
    }));

    return utilData(res, 200, { results });
  } catch (error) {
    console.error("Error executing query:", error);
    return utilMessage(res, 500, "Error");
  } finally {
    client.release();
  }
};

// export const requestPerDay = async (req, res) => {
//   const client = await pool.connect();
//   try {
//     let results = [];
//     for (let i = 0; i < 7; i++) {
//       const result = await client.query(
//         "SELECT TO_CHAR(DATE(updated_at), 'DD FMMonth') AS date, COUNT(*) AS request FROM maps WHERE DATE(updated_at AT TIME ZONE 'UTC') = (CURRENT_DATE - INTERVAL '" +
//           i +
//           " day')::date GROUP BY date"
//       );
//       results.push(
//         result.rows[0] || { date: new Date().toISOString(), request: 0 }
//       );
//     }
//     return utilData(res, 200, { results });
//   } finally {
//     client.release();
//   }
// };
