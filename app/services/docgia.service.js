const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

class DocgiaService {
    constructor(client) {
        this.Docgia = client.db().collection('DOCGIA');
    }

    async extractDocgiaData(payload) {
        const docgia = {
            _id: payload._id,
            MADOCGIA: payload.MADOCGIA,
            HOLOT: payload.HOLOT,
            TEN: payload.TEN,
            NGAYSINH: payload.NGAYSINH,
            PHAI: payload.PHAI,
            DIACHI: payload.DIACHI,
            DIENTHOAI: payload.DIENTHOAI,
            MATKHAUDOCGIA: payload.MATKHAUDOCGIA ? await bcrypt.hash(payload.MATKHAUDOCGIA, 10) : undefined,
        };
        Object.keys(docgia).forEach(
            (key) => docgia[key] === undefined && delete docgia[key]
        );
        return docgia;
    }

    async create(payload) {
        const docgia = await this.extractDocgiaData(payload);
        const result = await this.Docgia.findOneAndUpdate(
            { MADOCGIA: docgia.MADOCGIA },
            { $set: docgia },
            { returnDocument: 'after', upsert: true }
        );
        return result.value;
    }

    async find(filter = {}) {
        const cursor = this.Docgia.find(filter);
        return await cursor.toArray();
    }

    async findByName(name) {
        return await this.find({
            TEN: { $regex: new RegExp(name, 'i') }
        });
    }

    async findByTaiKhoan(DIENTHOAI) {
        return await this.Docgia.findOne({ DIENTHOAI });
    }

    async findById(id) {
        try {
            if (!ObjectId.isValid(id)) {
                throw new Error('ID không hợp lệ');
            }
            const docgia = await this.Docgia.findOne({ _id: new ObjectId(id) });
            if (!docgia) {
                throw new Error(`Không tìm thấy tài liệu độc giả với ID: ${id}`);
            }
            return docgia;
        } catch (error) {
            console.error('Lỗi khi tìm độc giả:', error);
            throw error;
        }
    }

    async update(id, payload) {
        const filter = { _id: new ObjectId(id) };
        const update = await this.extractDocgiaData(payload);
        const result = await this.Docgia.findOneAndUpdate(
            filter,
            { $set: update },
            { returnDocument: 'after' }
        );
        return result.value;
    }


    async delete(id) {
        const result = await this.Docgia.findOneAndDelete({ _id: new ObjectId(id) });
        return result.value;
    }

    async deleteAll() {
        const result = await this.Docgia.deleteMany({});
        return result.deletedCount;
    }

    async loginDocGia(DIENTHOAI, MATKHAUDOCGIA) {
        if (!DIENTHOAI || !MATKHAUDOCGIA) {
            throw new Error("Số điện thoại và mật khẩu là bắt buộc");
        }

        const docGia = await this.Docgia.findOne({ DIENTHOAI });
        if (!docGia) {
            throw new Error("Số điện thoại hoặc mật khẩu không chính xác");
        }

        const isMatch = await bcrypt.compare(MATKHAUDOCGIA, docGia.MATKHAUDOCGIA);
        if (!isMatch) {
            throw new Error("Số điện thoại hoặc mật khẩu không chính xác");
        }

        return { role: "DOCGIA", user: docGia };
    }

    async registerDocGia(data) {
        if (!data.DIENTHOAI || !data.MATKHAUDOCGIA || !data.confirmmatkhauDG) {
            throw new Error("Số điện thoại, mật khẩu, xác nhận mật khẩu là bắt buộc");
        }

        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(data.DIENTHOAI)) {
            throw new Error("Số điện thoại không hợp lệ, phải gồm 10 số và bắt đầu bằng số 0");
        }

        const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
        if (!passwordRegex.test(data.MATKHAUDOCGIA)) {
            throw new Error("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ cái và số");
        }
        
        if (data.MATKHAUDOCGIA !== data.confirmmatkhauDG) {
            throw new Error("Mật khẩu xác nhận không khớp");
        }
        try {
            const DIENTHOAI = data.DIENTHOAI;
            const existingDocGia = await this.Docgia.findOne({ DIENTHOAI });
            if (existingDocGia) {
                throw new Error("Số điện thoại đã được đăng ký");
            }

            const hashedPassword = bcrypt.hashSync(data.MATKHAUDOCGIA, 10);
            const count = await this.Docgia.countDocuments();
            const maDocGia = `DG${String(count + 1).padStart(3, '0')}`;
            const newDocGia = {
                _id: new ObjectId(),
                MADOCGIA: maDocGia,
                HOLOT: data.HOLOT || "Chưa cập nhật",
                TEN: data.TEN || "Chưa cập nhật",
                NGAYSINH: data.NGAYSINH || "Chưa cập nhật",
                PHAI: data.PHAI || "Chưa cập nhật",
                DIACHI: data.DIACHI || "Chưa cập nhật",
                DIENTHOAI: data.DIENTHOAI,
                MATKHAUDOCGIA: hashedPassword,
            };

            await this.Docgia.insertOne(newDocGia);
            return { message: "Đăng ký độc giả thành công", user: newDocGia };
        } catch (error) {
        console.error(error);
        throw error;
        }
    };
}

module.exports = DocgiaService;