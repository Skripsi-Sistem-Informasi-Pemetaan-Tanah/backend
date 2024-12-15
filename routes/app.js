import express from "express";
import {register, login, logout, getUser} from "../controllers/user.js";
import {
    editMap,
    addMap,
    deleteMap,
    getAllMaps,
    getMapById,
    getHistory,
    getHistoryById,
    getValidator,
    getCoordinateStatus,
    getLandStatus,
    getLandStatusById,
    getKomentarKoordinatById,
    getKomentarLahan,
    getKomentarLahanById,
    getDataMapID,
    getDataMapID1
} from "../controllers/map.js";
import {
    validasiOnProgress,
    validasiDitolak,
    cekValidasi,
    addKomentar,
    addKomentarKoordinat,
    cekKoordinatIDtoVerif,
    updateStatusLahan,
    cekSameKoorVerif
} from "../controllers/validasi.js";
import {runValidation, validationRegister} from "../utils/validation.js";
import {
    totalRequest, pendingRequest, requestPerDay, verifiedRequest, monthlyRequestChange
} from "../controllers/dashboard.js";
import {taskTable} from "../controllers/request.js";
import {verifyToken} from "../middleware/verifyToken.js";
import {refreshToken} from "../controllers/refreshToken.js";
//Mobile

import {
    checkConnectionDatabase,
    deleteUser,
    saveUser,
    saveLahan,
    updateFotoPatokan,
    verifikasiKoordinat,
    getAllLahan,
    getAllLahanbyUserId
} from "../controllers/mobile.js"

const router = express.Router();

router.get("/users", getUser);
router.post("/register", register);
router.post("/login", login);
router.delete("/logout", logout);
router.get("/token", refreshToken);
// router.put('/forgotPassword', forgotPassword)
// router.put('/resetPassword/', resetPassword)

// router.post('/editMap', verifyToken(2), editMap);
// router.post('/addMap', verifyToken(2), addMap);
// router.delete('/deleteMap', verifyToken(2), deleteMap);
// router.get('/getMapById/:mapId', verifyToken(2), getMapById);
//
// router.post('/validasiOnProgress', verifyToken(2), validasiOnProgress);
// router.post('/validasiDitolak', verifyToken(2), validasiDitolak);
// router.post('/cekValidasi/:mapId', verifyToken(2), cekValidasi);
// router.get('/getAllMaps', verifyToken(2), getAllMaps);
// router.get('/getHistory', verifyToken(2), getHistory);
// router.get('/getStatus', verifyToken(2), getStatus);
//
// router.get('/totalRequest', verifyToken(2), totalRequest);
// router.get('/pendingRequest', verifyToken(2), pendingRequest);
// router.get('/requestPerDay', verifyToken(2), requestPerDay);
// router.get('/verifiedRequest', verifyToken(2), verifiedRequest);
// router.get('/monthlyRequestChange', verifyToken(2), monthlyRequestChange);
//
// router.get("/taskTable", verifyToken(2), taskTable);

router.post('/editMap', editMap);
router.post('/addMap', addMap);
router.delete('/deleteMap/:mapId', deleteMap);
router.get('/getMapById/:mapId', getMapById);
router.get('/getValidator/', getValidator);
router.post('/validasiOnProgress', validasiOnProgress);
router.post('/validasiDitolak', validasiDitolak);
router.post('/cekValidasi/:mapId', cekValidasi);
router.get('/getAllMaps', getAllMaps);
router.get('/getHistory', getHistory);
router.get('/getHistoryById/:mapId', getHistoryById);
router.get('/getCoordinateStatus', getCoordinateStatus);
router.get('/getLandStatus', getLandStatus);
router.get('/getLandStatusById/:mapId', getLandStatusById);
router.post('/addKomentar', addKomentar);
router.get('/getDataMapID', getDataMapID);
router.get('/getDataMapID1/:mapId', getDataMapID1);
router.post('/addKomentarKoordinat', addKomentarKoordinat);
router.post('/cekSameKoorVerif', cekSameKoorVerif);
router.post('/cekKoordinatIDtoVerif', cekKoordinatIDtoVerif);
router.get('/getKomentarKoordinatById/:mapId', getKomentarKoordinatById)
router.get('/getKomentarLahan', getKomentarLahan);
router.get('/getKomentarLahanById/:mapId', getKomentarLahanById);
router.post('/updateStatusLahan', updateStatusLahan);
router.get('/totalRequest', totalRequest);
router.get('/pendingRequest', pendingRequest);
router.get('/requestPerDay', requestPerDay);
router.get('/verifiedRequest', verifiedRequest);
router.get('/monthlyRequestChange', monthlyRequestChange);
router.get("/taskTable", taskTable);
//Mobile
router.get('/checkConnectionDatabase', checkConnectionDatabase);
router.post('/saveUser', saveUser);
router.delete('/deleteUser/:id', deleteUser);
router.post('/saveLahan', saveLahan);
router.post('/updateFotoPatokan', updateFotoPatokan);
router.post('/verifikasiKoordinat', verifikasiKoordinat);
router.get('/getAllLahan', getAllLahan);
router.get('/getAllLahanbyUserId/:user_id', getAllLahanbyUserId);

export default router;

