// TỆP SINH RA, KHÔNG SỬA TAY. Nguồn: data/config.json → quai_chung, bãi quái trong data/maps/, máu quái, data/planets.json → farm,
// data/pets.json (dị chủng). Sinh lại: node tools/quai-chung.mjs --ghi (tools/check.mjs so khớp).
// maps.<bản đồ>.s: [[bãi, số con, giờ hồi (ms), máu, x, y, có thể dị chủng]]; v: chữ ký bảng, máy khách so với bảng nó tự tính.
export const QUAI = {"tam":480,"dps_k":5,"bud_s":10,"own_ms":1500,"dong":[3,5],"hiem":[0.04,3],"maps":{"dao-xich-dien":{"v":"yf5dh5","s":[[0,4,5000,60,1336,568,1],[1,3,7000,66,1048,1288,1],[3,5,2500,60,392,1256,1],[4,5,2500,60,200,392,1],[5,5,2500,60,1048,184,1],[6,5,2500,60,1272,1064,1],[7,5,2500,120,472,1304,1],[8,5,2500,120,104,680,1],[9,5,2500,120,584,120,1],[10,5,2500,120,1272,408,1],[11,5,2500,120,1208,1144,1]]}}};
