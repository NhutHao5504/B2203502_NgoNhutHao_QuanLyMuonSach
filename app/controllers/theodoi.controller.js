const TheodoiService = require('../services/theodoi.service');
const MongoDB = require('../utils/mongodb.util');
const ApiError = require('../api-error');

exports.create = async (req, res, next) => {
    if (!req.body?.maDG || !req.body?.maSach) {
        return next(new ApiError(400, 'Mã đọc giả và mã sách không được bỏ trống'));
    }
    try {
        const theodoiService = new TheodoiService(MongoDB.client);
        const document = await theodoiService.create(req.body);
        return res.send(document);
    } catch (error) {
        return next(new ApiError(500, 'Có lỗi trong khi tạo theo dõi mới'));
    }
};

exports.findAll = async (req, res, next) => {
    try {
        const theodoiService = new TheodoiService(MongoDB.client);
        const { maDG, maSach, ngayMuon, trangThai } = req.query;

        let documents = [];
        if (maDG) {
            documents = await theodoiService.findByMaDG(maDG);
        } else if (maSach) {
            documents = await theodoiService.findByMaSach(maSach);
        } else if (ngayMuon) {
            documents = await theodoiService.findByNgayMuon(ngayMuon);
        } else if (trangThai) {
            documents = await theodoiService.findByTrangthai(trangThai);
        } else {
            documents = await theodoiService.find({});
        }

        return res.send(documents);
    } catch (error) {
        return next(new ApiError(500, 'Có lỗi xảy ra khi tìm theo dõi'));
    }
};

exports.findOne = async (req, res, next) => {
    try {
        const theodoiService = new TheodoiService(MongoDB.client);
        const document = await theodoiService.findById(req.params.id);
        if (!document) {
            return next(new ApiError(404, 'Lịch sử không tồn tại'));
        }
        return res.send(document);
    } catch (error) {
        return next(new ApiError(500, `Có lỗi xảy ra trong khi tìm kiếm id=${req.params.id}`));
    }
};

exports.update = async (req, res, next) => {
    if (Object.keys(req.body).length === 0) {
        return next(new ApiError(400, 'Dữ liệu cập nhật không được để trống'));
    }

    try {
        const theodoiService = new TheodoiService(MongoDB.client);
        const result = await theodoiService.update(req.params.id, req.body);

        if (!result) {
            return next(new ApiError(404, 'Lịch sử mượn không tồn tại'));
        }

        return res.send({ message: 'Sổ mượn được cập nhật thành công' });
    } catch (error) {
        return next(new ApiError(500, `Có lỗi xảy ra trong khi cập nhật id=${req.params.id}`));
    }
};

exports.delete = async (req, res, next) => {
    try {
        const theodoiService = new TheodoiService(MongoDB.client);
        const document = await theodoiService.delete(req.params.id);

        if (!document) {
            return next(new ApiError(404, 'Lịch sử mượn không tồn tại'));
        }

        return res.send({ message: 'Xóa thành công' });
    } catch (error) {
        return next(new ApiError(500, `Có lỗi xảy ra trong khi xóa id=${req.params.id}`));
    }
};

exports.deleteAll = async (req, res, next) => {
    try {
        const theodoiService = new TheodoiService(MongoDB.client);
        const deletedCount = await theodoiService.deleteAll();

        return res.send({ message: `${deletedCount} theo dõi đã được xóa thành công` });
    } catch (error) {
        return next(new ApiError(500, 'Có lỗi xảy ra trong khi xóa tất cả theo dõi'));
    }
};

exports.dangKyMuonSach = async (req, res, next) => {
    try {
        const { docGiaID, maSach, soQuyen, ngayMuon } = req.body;
        const theodoiService = new TheodoiService(MongoDB.client);
        const result = await theodoiService.dangKyMuonSach(docGiaID, maSach, soQuyen, ngayMuon);
        return res.send(result);
    } catch (error) {
        return next(new ApiError(400, error.message));
    }
};


exports.duyetMuonSach = async (req, res, next) => {
    try {
        const theodoiService = new TheodoiService(MongoDB.client);
        const result = await theodoiService.duyetMuonSach(req.params.id);
        return res.send(result);
    } catch (error) {
        return next(new ApiError(400, error.message));
    }
};

exports.xacNhanTraSach = async (req, res, next) => {
    try {
        const theodoiService = new TheodoiService(MongoDB.client);
        const result = await theodoiService.xacNhanTraSach(req.params.id);
        return res.send(result);
    } catch (error) {
        return next(new ApiError(400, error.message));
    }
};