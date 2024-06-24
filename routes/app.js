import express from "express";
import { register, login, logout, getUser } from "../controllers/user.js";
import {
  editMap,
  addMap,
  deleteMap,
  getAllMaps,
  getMapById,
} from "../controllers/map.js";
import { validasiBerhasil, validasiDitolak, cekValidasi } from "../controllers/validasi.js";
import { runValidation, validationRegister } from "../utils/validation.js";
import {
  totalRequest,
  pendingRequest,
  requestPerDay,
} from "../controllers/dashboard.js";
import { taskTable } from "../controllers/request.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { refreshToken } from "../controllers/refreshToken.js";

const router = express.Router();

router.get("/users", getUser);
router.post("/register", register);
router.post("/login", login);
router.delete("/logout", logout);
router.get("/token", refreshToken);
// router.put('/forgotPassword', forgotPassword)
// router.put('/resetPassword/', resetPassword)

router.post("/editMap", editMap);
router.post("/addMap", addMap);
router.delete("/deleteMap", deleteMap);
router.get("/getMapById/:mapId", getMapById);

router.post("/validasiBerhasil", validasiBerhasil);
router.post("/validasiDitolak", validasiDitolak);
router.post("/cekValidasi/:mapId", cekValidasi);
router.get("/getAllMaps", getAllMaps);

router.get("/totalRequest", totalRequest);
router.get("/pendingRequest", pendingRequest);
router.get("/requestPerDay", requestPerDay);

router.get("/taskTable", taskTable);

// //verified
// router.get("/users", verifyToken, getUser);
// router.post("/register", register);
// router.post("/login", login);
// router.delete("/logout", logout);
// router.get("/token", refreshToken);
// // router.put('/forgotPassword', forgotPassword)
// // router.put('/resetPassword/', resetPassword)
//
// router.post("/editMap", verifyToken, editMap);
// router.post("/addMap", verifyToken, addMap);
// router.delete("/deleteMap", verifyToken, deleteMap);
// router.get("/getMapById/:gid", verifyToken, getMapById);
//
// router.post("/validasiBerhasil", verifyToken, validasiBerhasil);
// router.post("/validasiDitolak", verifyToken, validasiDitolak);
// router.get("/getAllMaps", verifyToken, getAllMaps);
//
// router.get("/totalRequest", verifyToken, totalRequest);
// router.get("/requestPending", verifyToken, pendingRequest);
// router.get("/requestPerDay", verifyToken, requestPerDay);

export default router;
