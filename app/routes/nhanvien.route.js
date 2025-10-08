const express = require('express');
const nhanvien = require('../controllers/nhanvien.controller');

const router = express.Router();

router.route('/')
    .get(nhanvien.findAll)
    .post(nhanvien.create)
    .delete(nhanvien.deleteAll);

router.route('/:id')
    .get(nhanvien.findOne)
    .put(nhanvien.update)
    .delete(nhanvien.delete);

router.route('/login')
    .post(nhanvien.login);

router.route('/register')
    .post(nhanvien.register);

module.exports = router;