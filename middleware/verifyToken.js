import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { utilMessage, utilData, utilError } from '../utils/message.js';

export const verifyToken = (requiredRole) => {
  return async (req, res, next) => {
    const token = req.cookies.refreshToken;

    if (!token) return utilMessage(res, 401, 'Token not found');

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
      if (err) return utilMessage(res, 403, 'Token is not valid');

      try {
        const dataUser = await User.findOne({ where: { username: decoded.username } });
        if (!dataUser) return utilMessage(res, 404, 'User not found');

        req.username = dataUser.username;
        req.role = dataUser.role;

        if (req.role !== requiredRole) {
          return utilMessage(res, 403, 'Access denied');
        }

        next();
      } catch (error) {
        return utilError(res, error);
      }
    });
  };
};
