const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

class NhanvienService {
    constructor(client) {
        this.Nhanvien = client.db().collection('NhanVien');
    }

    async extractNhanvienData(payload) {
        const nhanvien = {
            _id: payload._id,
            MSNV: payload.MSNV,
            HoTenNV: payload.HoTenNV,
            ChucVu: payload.ChucVu,
            DiaChi: payload.DiaChi,
            SoDienThoai: payload.SoDienThoai,
            Password: payload.Password ? await bcrypt.hash(payload.Password, 10) : undefined,
        };
        Object.keys(nhanvien).forEach(
            (key) => nhanvien[key] === undefined && delete nhanvien[key]
        );
        return nhanvien;
    }

    async create(payload) {       
        const nhanvien = await this.extractNhanvienData(payload);
        const result = await this.Nhanvien.findOneAndUpdate(
            { MSNV: nhanvien.MSNV },
            { $set: nhanvien },
            { returnDocument: 'after', upsert: true }
        );
        return result.value;
    }

    async find(filter = {}) {
        const cursor = this.Nhanvien.find(filter);
        return await cursor.toArray();
    }

    async findByName(name) {
        return await this.find({
            HoTenNV: { $regex: new RegExp(name, 'i') }
        });
    }

    async findByTaiKhoan(SoDienThoai) {
        return await this.Nhanvien.findOne({ SoDienThoai });
    }

    async findById(id) {        
        try {
            const nhanvien = await this.Nhanvien.findOne({ _id: new ObjectId(id) });
            if (!nhanvien) {
                throw new Error(`Không tìm thấy tài liệu nhân viên với ID: ${id}`);
            }
            return nhanvien;
        } catch (error) {
            console.error('Lỗi khi tìm nhân viên:', error);
            throw error;
        }
    }

    async update(id, payload) {
        const filter = { _id: new ObjectId(id) };
        const update = await this.extractNhanvienData(payload);
        const result = await this.Nhanvien.findOneAndUpdate(
            filter,
            { $set: update },
            { returnDocument: 'after' }
        );
        return result.value;
    }

    async delete(id) {
        const result = await this.Nhanvien.findOneAndDelete({ _id: new ObjectId(id) });
        return result;
    }

    async deleteAll() {
        const result = await this.Nhanvien.deleteMany({});
        return result.deletedCount;
    }

    async loginNhanVien(SoDienThoai, Password) {
        if (!SoDienThoai || !Password) {
            throw new Error("Số điện thoại và mật khẩu là bắt buộc");
        }

        const nhanVien = await this.Nhanvien.findOne({ SoDienThoai });
        if (!nhanVien) {
            throw new Error("Số điện thoại hoặc mật khẩu không chính xác");
        }

        const isMatch = await bcrypt.compare(Password, nhanVien.Password);
        if (!isMatch) {
            throw new Error("Số điện thoại hoặc mật khẩu không chính xác");
        }

        return { role: "nhanvien", user: nhanVien };
    }

    async registerNhanVien(data) {
        if (!data.SoDienThoai || !data.Password || !data.HoTenNV) {
            throw new Error("Số điện thoại, mật khẩu, họ tên là bắt buộc");
        }

        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(data.SoDienThoai)) {
            throw new Error("Số điện thoại không hợp lệ, phải gồm 10 số và bắt đầu bằng số 0");
        }

        const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
        if (!passwordRegex.test(data.Password)) {
            throw new Error("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ cái và số");
        }

        if (data.Password !== data.confirmmatkhauNV) {
            throw new Error("Mật khẩu xác nhận không khớp");
        }

        try {
            const SoDienThoai = data.SoDienThoai;
            const existingNhanVien = await this.Nhanvien.findOne({ SoDienThoai });
            if (existingNhanVien) {
                throw new Error('Số điện thoại đã được đăng ký');
            }

            const hashedPassword = bcrypt.hashSync(data.Password, 10);
            const count = await this.Nhanvien.countDocuments();
            const maNhanVien = `NV${String(count + 1).padStart(3, '0')}`;
            const newNhanVien = {
                _id: new ObjectId(),
                MSNV: maNhanVien,
                HoTenNV: data.HoTenNV || 'Chưa cập nhật',
                ChucVu: data.ChucVu || 'Chưa cập nhật',
                DiaChi: data.DiaChi || 'Chưa cập nhật',
                SoDienThoai: data.SoDienThoai,
                Password: hashedPassword,
            };

            await this.Nhanvien.insertOne(newNhanVien);
            return { message: 'Đăng ký thành công', user: newNhanVien };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}

module.exports = NhanvienService;