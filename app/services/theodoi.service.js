const { ObjectId } = require('mongodb');
const Sach = require('../services/sach.service.js');

class TheodoiService {
    constructor(client) {
        this.Theodoi = client.db().collection('THEODOIMUONSACH');
        this.Docgia = client.db().collection('DOCGIA');
        this.Sach = client.db().collection('SACH');
    }

    async extractTheodoiData(payload) {
        const theodoi = {
            _id: payload._id,
            MADOCGIA: payload.MADOCGIA,
            MASACH: payload.MASACH,
            NGAYMUON: payload.NGAYMUON,
            NGAYTRA: payload.NGAYTRA,
            trangThai: payload.trangThai,
            SOQUYEN: payload.SOQUYEN,
        };
        Object.keys(theodoi).forEach(
            (key) => theodoi[key] === undefined && delete theodoi[key]
        );
        return theodoi;
    }

    async create(payload) {
        const docGia = await this.Docgia.findOne({ MADOCGIA: payload.MADOCGIA });
        if (!docGia) {
            throw new Error(`Không tìm thấy độc giả với mã ${payload.MADOCGIA}`);
        }

        const sach = await this.Sach.findOne({ MASACH: payload.MASACH });
        if (!sach) {
            throw new Error(`Không tìm thấy sách với mã ${payload.MASACH}`);
        }

        if (sach.SOQUYEN < payload.SOQUYEN) {
            throw new Error(`Số lượng sách không đủ. Hiện tại chỉ còn ${sach.SOQUYEN} quyển.`);
        }

        await this.Sach.updateOne(
            { MASACH: payload.MASACH },
            { $inc: { SOQUYEN: -payload.SOQUYEN } }
        );

        const theodoi = await this.extractTheodoiData(payload);
        const result = await this.Theodoi.insertOne(theodoi);

        return await this.Theodoi.findOne({ _id: result.insertedId });
    }

    async find(filter) {
        return await this.Theodoi.find(filter).toArray();
    }

    async findById(id) {
        return await this.Theodoi.findOne({ _id: new ObjectId(id) });
    }

    async update(id, payload) {
        const update = this.extractTheodoiData(payload);
        const result = await this.Theodoi.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: update },
            { returnDocument: 'after' }
        );
        return result?.value ? true : false;
    }

    async delete(id) {
        const result = await this.Theodoi.findOneAndDelete({ _id: new ObjectId(id) });
        return result;
    }

    async deleteAll() {
        const result = await this.Theodoi.deleteMany({});
        return result.deletedCount;
    }

    async dangKyMuonSach(docGiaID, MASACH, SOQUYEN, NGAYMUON) {
        if (!docGiaID || !MASACH || !SOQUYEN || !NGAYMUON) {
            throw new Error('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
        }

        const _id = new ObjectId(docGiaID);
        const docGia = await this.Docgia.findOne({ _id });
        if (!docGia) {
            throw new Error(`Không tìm thấy độc giả với mã: ${_id}`);
        }

        const sach = await this.Sach.findOne({ MASACH });
        if (!sach) {
            throw new Error(`Không tìm thấy sách với mã: ${MASACH}`);
        }

        if (sach.SOQUYEN < SOQUYEN) {
            throw new Error(`Sách ${sach.tenSach} chỉ còn ${sach.SOQUYEN} quyển, không đủ số lượng yêu cầu`);
        }

        const theodoi = await this.extractTheodoiData({
            MADOCGIA: docGiaID,
            MASACH,
            SOQUYEN,
            NGAYMUON,
            trangThai: 'Chờ duyệt'
        });

        await this.Theodoi.insertOne(theodoi);
        return { message: 'Đăng ký mượn sách thành công, vui lòng chờ duyệt', theodoi };
    }

    async duyetMuonSach(id) {
        const muonSach = await this.findById(id);
        if (!muonSach) {
            throw new Error('Không tìm thấy yêu cầu mượn sách');
        }
        if (muonSach.trangThai !== 'Chờ duyệt') {
            throw new Error('Yêu cầu này không thể duyệt');
        }

        const sach = await this.Sach.findOne({ MASACH: muonSach.MASACH });
        if (!sach || sach.SOQUYEN < muonSach.SOQUYEN) {
            throw new Error(`Sách không đủ số lượng để duyệt`);
        }

        await this.Sach.updateOne(
            { MASACH: muonSach.MASACH },
            { $inc: { SOQUYEN: -muonSach.SOQUYEN } }
        );

        await this.Theodoi.updateOne(
            { _id: new ObjectId(id) },
            { $set: { trangThai: 'Đang mượn' } }
        );

        return { message: 'Đã duyệt yêu cầu mượn sách', muonSach };
    }

    async xacNhanTraSach(id) {
        const muonSach = await this.findById(id);
        if (!muonSach) throw new Error('Không tìm thấy yêu cầu mượn sách');
        
        if (muonSach.trangThai !== 'Đang mượn') throw new Error('Chỉ có thể xác nhận trả sách khi đang trong trạng thái Đang mượn');
        
        await this.Sach.updateOne(
            { MASACH: muonSach.MASACH },
            { $inc: { SOQUYEN: muonSach.SOQUYEN } }
        );

        await this.Theodoi.updateOne(
            { _id: new ObjectId(id) },
            { $set: { trangThai: 'Đã trả', NGAYTRA: new Date() } }
        );

        return { message: 'Xác nhận trả sách thành công', muonSach };
    }
}

module.exports = TheodoiService;
