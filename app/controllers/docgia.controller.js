const DocgiaService = require('../services/docgia.service'); 
const MongoDB = require('../utils/mongodb.util');
const ApiError = require('../api-error');

exports.create = async (req, res, next) => {
    if (!req.body?.HOLOT){
        return next(new ApiError(400, 'Họ lót không được để trống'));
    }

    if (!req.body?.TEN){
        return next(new ApiError(400, 'Tên không được để trống'));
    }

    try {
        const docgiaService = new DocgiaService(MongoDB.client);        
        const document = await docgiaService.create(req.body);
        return res.send(document);
    } catch (error) {
        return next(
            new ApiError(500, 'Đã xảy ra lỗi khi tạo độc giả')
        );
    }
};

exports.findAll = async (req, res, next) => {
    try {
        const docgiaService = new DocgiaService(MongoDB.client);
        const { name, taikhoanDG } = req.query;
        let documents;

        if (name) {
            documents = await docgiaService.findByName(name);
        } else if (taikhoanDG) {
            documents = await docgiaService.findByTaiKhoan(taikhoanDG);
        } else {
            documents = await docgiaService.find({});
        }

        return res.send(documents); 
    } catch (error) {
        return next(
            new ApiError(500, 'Đã xảy ra lỗi khi truy xuất danh sách độc giả')
        );
    }
};

exports.findOne = async (req, res, next) => {
    try {
        const docgiaService = new DocgiaService(MongoDB.client);
        const document = await docgiaService.findById(req.params.id);
        return res.send(document);
    } catch (error) {
        return next(new ApiError(404, error.message));
    }
};

exports.update = async (req, res, next) => {
    if (Object.keys(req.body).length === 0) {
        return next(new ApiError(400, 'Dữ liệu cập nhật không được để trống'));
    }

    try {
        const docgiaService = new DocgiaService(MongoDB.client);
        const document = await docgiaService.update(req.params.id, req.body);
        return res.send({ message: 'Độc giả đã được cập nhật thành công', document });    
    } catch (error) {
        console.error('Lỗi khi cập nhật độc giả:', error);
        return next(new ApiError(404, error.message));
    }
};

exports.delete = async (req, res, next) => {
    try {
        const docgiaService = new DocgiaService(MongoDB.client);
        await docgiaService.delete(req.params.id);
        return res.send({ message: 'Độc giả đã được xoá thành công' });
    } catch (error) {
        return next(new ApiError(404, error.message));
    }
};

exports.deleteAll = async (req, res, next) => {
    try {
        const docgiaService = new DocgiaService(MongoDB.client);
        const deletedCount = await docgiaService.deleteAll();
        return res.send({ message: `${deletedCount} độc giả đã được xoá thành công` });
    } catch (error) {
        return next (new ApiError(500, 'Đã xảy ra lỗi khi xoá danh sách độc giả'));
    }
};

exports.login = async (req, res, next) => {
    try {
        const docgiaService = new DocgiaService(MongoDB.client);
        const { DIENTHOAI, MATKHAUDOCGIA } = req.body;
        const result = await docgiaService.loginDocGia(DIENTHOAI, MATKHAUDOCGIA);
        return res.send(result);
    } catch (error) {
        return next(new ApiError(401, error.message || 'Đăng nhập thất bại'));
    }
};

exports.register = async (req, res, next) => {
    try {
        const docgiaService = new DocgiaService(MongoDB.client);
        const result = await docgiaService.registerDocGia(
            req.body
        );
        return res.send(result);
    } catch (error) {
        return next(new ApiError(400, error.message || 'Đăng ký độc giả thất bại'));
    }
};

