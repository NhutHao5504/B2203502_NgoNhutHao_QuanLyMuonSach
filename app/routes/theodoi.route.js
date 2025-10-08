const express = require('express');
const theodoi = require('../controllers/theodoi.controller');

const router = express.Router();

router.route('/')
    .get(theodoi.findAll)
    .post(theodoi.create)
    .delete(theodoi.deleteAll);

router.route('/:id')
    .get(theodoi.findOne)
    .put(theodoi.update)
    .delete(theodoi.delete);

router.route('/dangKyMuonSach')
    .post(theodoi.dangKyMuonSach);

router.route('/duyetMuonSach/:id')
    .put(theodoi.duyetMuonSach);

router.route('/xacNhanTraSach/:id')
    .put(theodoi.xacNhanTraSach);

module.exports = router;
