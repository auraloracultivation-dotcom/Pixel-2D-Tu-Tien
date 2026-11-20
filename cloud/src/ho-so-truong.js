// TỆP SINH RA, KHÔNG SỬA TAY. Nguồn: data/dong-bo.json → ho_so. Sinh lại: node tools/dong-bo.mjs --ghi (tools/check.mjs so khớp).
// Máy chủ phòng chỉ giữ đúng các trường này trong hồ sơ người chơi gửi lên (proto.js cleanProf); máy người xem lọc lại theo data/.
export const TEN = { name: [24, "Đạo hữu"], realm: [24, ""] };   // chữ tự do: [dài tối đa, giá trị khi trống]
export const CHU = { element: 48, look: 48, outfit: 48, mount: 48, pt: 2, vk: 48, vkl: 48, pet: 48, comp: 48, comp2: 48, st: 3, ri: 2, title: 48 };   // mã chữ, số, gạch: dài tối đa
