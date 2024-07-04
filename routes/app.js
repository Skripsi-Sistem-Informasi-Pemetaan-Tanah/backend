import express from "express";
import { register, login, logout, getUser } from "../controllers/user.js";
import {
  editMap,
  addMap,
  deleteMap,
  getAllMaps,
  getMapById,
  getHistory
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
//Mobile

import {
  checkConnectionDatabase, saveUser, updateUserField, deleteUser, saveLahan, updateFotoPatokan, getAllLahan, getAllLahanbyUserId} from "../controllers/mobile.js"

const router = express.Router();

router.get("/users", getUser);
router.post("/register", register);
router.post("/login", login);
router.delete("/logout", logout);
router.get("/token", refreshToken);
// router.put('/forgotPassword', forgotPassword)
// router.put('/resetPassword/', resetPassword)

router.post('/editMap', verifyToken(2), editMap);
router.post('/addMap', verifyToken(2), addMap);
router.delete('/deleteMap', verifyToken(2), deleteMap);
router.get('/getMapById/:mapId', verifyToken(2), getMapById);

router.post('/validasiBerhasil', verifyToken(2), validasiBerhasil);
router.post('/validasiDitolak', verifyToken(2), validasiDitolak);
router.post('/cekValidasi/:mapId', verifyToken(2), cekValidasi);
router.get('/getAllMaps', verifyToken(2), getAllMaps);
router.get('/getHistory', verifyToken(2), getHistory);

router.get('/totalRequest', verifyToken(2), totalRequest);
router.get('/pendingRequest', verifyToken(2), pendingRequest);
router.get('/requestPerDay', verifyToken(2), requestPerDay);

router.get("/taskTable", verifyToken(2), taskTable);


//Mobile
router.get('/checkConnectionDatabase', checkConnectionDatabase);
router.post('/saveUser', saveUser);
router.put('/updateField', updateUserField);
router.delete('/deleteUser/:id', deleteUser);
router.post('/saveLahan', saveLahan);
router.post('/updateFotoPatokan', updateFotoPatokan);
router.get('/getAllLahan', getAllLahan);
router.get('/getAllLahanbyUserId/:user_id', getAllLahanbyUserId);

export default router;

