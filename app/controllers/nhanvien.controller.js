const NhanvienService = require('../services/nhanvien.service');
const MongoDB = require('../utils/mongodb.util');
const ApiError = require('../api-error');

exports.create = async (req, res, next) => {
    try {
        const nhanvienService = new NhanvienService(MongoDB.client);
        const document = await nhanvienService.create(req.body);
        return res.send(document);
    } catch (error) {
        return next(new ApiError(500, error.message || 'Có lỗi xảy ra khi tạo nhân viên'));
    }
};

exports.findAll = async (req, res, next) => {
    try {
        const nhanvienService = new NhanvienService(MongoDB.client);
        const documents = req.query.name 
            ? await nhanvienService.findByName(req.query.name) 
            : await nhanvienService.find({});
        return res.send(documents);
    } catch (error) {
        return next(new ApiError(500, error.message || 'Có lỗi xảy ra khi tìm nhân viên'));
    }
};

exports.findOne = async (req, res, next) => {
    try {
        const nhanvienService = new NhanvienService(MongoDB.client);
        const document = await nhanvienService.findById(req.params.id);
        if (!document) {
            return next(new ApiError(404, 'Nhân viên không tồn tại'));
        }
        return res.send(document);
    } catch (error) {
        return next(new ApiError(500, error.message || `Có lỗi xảy ra khi tìm nhân viên id=${req.params.id}`));
    }
};

exports.update = async (req, res, next) => {
    try {
        const nhanvienService = new NhanvienService(MongoDB.client);
        const document = await nhanvienService.update(req.params.id, req.body);
        if (!document) {
            return next(new ApiError(404, 'Nhân viên không tồn tại'));
        }
        return res.send({ message: 'Nhân viên được cập nhật thành công' });
    } catch (error) {
        return next(new ApiError(500, error.message || `Có lỗi xảy ra khi cập nhật nhân viên id=${req.params.id}`));
    }
};

exports.delete = async (req, res, next) => {
    try {
        const nhanvienService = new NhanvienService(MongoDB.client);
        const document = await nhanvienService.delete(req.params.id);
        if (!document) {
            return next(new ApiError(404, 'Nhân viên không tồn tại'));
        }
        return res.send({ message: 'Nhân viên đã được xoá thành công' });
    } catch (error) {
        return next(new ApiError(500, error.message || `Có lỗi xảy ra khi xoá nhân viên id=${req.params.id}`));
    }
};

exports.deleteAll = async (req, res, next) => {
    try {
        const nhanvienService = new NhanvienService(MongoDB.client);
        const deletedCount = await nhanvienService.deleteAll();
        return res.send({ message: `${deletedCount} nhân viên đã được xoá thành công` });
    } catch (error) {
        return next(new ApiError(500, error.message || 'Có lỗi xảy ra khi xoá tất cả nhân viên'));
    }
};

exports.login = async (req, res, next) => {
    try {
        const nhanvienService = new NhanvienService(MongoDB.client);
        const { SoDienThoai, Password } = req.body;
        const result = await nhanvienService.loginNhanVien(SoDienThoai, Password);
        return res.send(result);
    } catch (error) {
        return next(new ApiError(401, error.message || 'Đăng nhập thất bại'));
    }
};

exports.register = async (req, res, next) => {
    try {
        const nhanvienService = new NhanvienService(MongoDB.client);
        const result = await nhanvienService.registerNhanVien(
            req.body    
        );
        return res.send(result);
    } catch (error) {
        return next(new ApiError(400, error.message || 'Đăng ký nhân viên thất bại'));
    }
};