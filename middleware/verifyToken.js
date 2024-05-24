import jwt from "jsonwebtoken";
import { utilMessage, utilData, utilError } from "../utils/message.js";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return utilMessage(res, 401);
  jwt.verify(token, process.env.PRIVATE_KEY, (err, decoded) => {
    if (err) return utilMessage(res, 403, err);
    req.username = decoded.username;
    next();
  });
};
