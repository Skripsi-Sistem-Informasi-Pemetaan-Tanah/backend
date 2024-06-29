import jwt from 'jsonwebtoken';
import User from "../models/userModel.js";
import { utilMessage, utilData, utilError } from '../utils/message.js';

// Middleware to verify token and check role
export const verifyToken = (requiredRole = null) => {
  return async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return utilMessage(res, 401, 'Token not found');

    jwt.verify(token, process.env.PRIVATE_KEY, async (err, decoded) => {
      if (err) return utilMessage(res, 403, 'Token is not valid');

      try {
        // Fetch the user from the database
        const dataUser = await User.findOne({ where: { username: decoded.username } });
        if (!dataUser) return utilMessage(res, 404, 'User not found');

        req.username = dataUser.username;
        req.role = dataUser.role;

        // Check if the user's role matches the required role
        if (req.role !== 2) {
          return utilMessage(res, 403, 'Access denied');
        }

        next();
      } catch (error) {
        return utilError(res, error);
      }
    });
  };
};
