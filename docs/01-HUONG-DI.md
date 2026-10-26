# 01. Hướng đi và các quyết định đã chốt

Game 2D pixel thế giới mở MMORPG tu tiên cho Google Play, cảm giác đánh như My Heroes: Dungeon Raid và Soul Knight Prequel. Game tu chân cũ Auralora đã bỏ hẳn (2026-10-26); game này có dự án Supabase riêng `Pixel2DTuTien`, tài khoản người chơi bắt đầu lại từ đầu.

Bản cốt truyện đầy đủ (Claude Docs): https://claude.ai/artifact/NsmdqZZLEhUn1rfkXXTN9K

## Cốt truyện (chủ dự án chọn, 26/10/2026)

1. Không khí: tươi sáng, có lúc sâu lắng.
2. Ma tộc từ giới khác làm nứt Thiên Mạch (mạch linh khí); đại lục vỡ thành các đảo nổi trên biển mây. Ma tộc ở Ma Vân (mây đen bên dưới).
3. Người chơi là thiếu niên làng Thanh Khê; đúng ngày thức tỉnh linh căn thì ma tộc đánh tới, Kiếm tông cứu và nhận làm đệ tử. Bạn thân Tiểu Hỏa bị kéo xuống Ma Vân, là động lực chương 1.
4. Thế giới: đảo nổi theo tầng mây, ngự kiếm bay giữa các đảo. Cảnh giới càng cao bay càng cao.
5. Tông môn đầu: Kiếm tông ở Thiên Kiếm Phong (đảo cao nhất tầng Mây Thấp), cũng là thành chính.
6. Đủ 9 cảnh giới: Luyện Khí, Trúc Cơ, Kim Đan, Nguyên Anh, Hóa Thần, Luyện Hư, Hợp Thể, Đại Thừa, Độ Kiếp; mỗi cảnh giới 9 tầng, cuối cảnh giới độ thiên kiếp.
7. Mỗi ngày: săn quái và nhiệm vụ ngoài đảo, bí cảnh nhóm đánh boss, đả tọa ở động phủ.

## Yên bình, tự tại (chủ dự án chốt tối 26/10/2026)

Game là nơi người ta muốn vào để tu tiên yên bình mà tự tại. Các quyết định:

1. Tự hành trước, cày tay sau. Tự hành là nhân vật tự đi làm (đi bộ, bay qua cổng, đánh, nói chuyện), không phải bấm là xong ngay. Dòng "Tự hành: ..." dưới mục tiêu cho biết đang làm gì.
2. Gặp boss truyện khi đang tự hành thì nhân vật tự đánh; thua thì tự hành dừng.
3. Đạo lữ hay khen người chơi: việc lớn (lên cảnh giới, qua kiếp, xong chương, bày đồ mới...) luôn khen, việc nhỏ (thu hoạch, luyện đan, câu cá) thỉnh thoảng (`data/praise.json`).
4. Nhạc êm: đàn tranh, sáo trúc, tiếng gió; đêm có tiếng dế; mưa có tiếng mưa (`data/sounds.json` → music).
5. Dược viên: khai thêm luống và nâng cấp từng luống riêng.
6. Tốc độ tu luyện sau Kim Đan: mỗi tầng chỉ thêm 3% linh khí (chốt 26/10/2026).
7. Khuya về động phủ từ 22 giờ tới 5 giờ sáng; bế quan khi vắng mặt giữ tối đa 8 tiếng.
8. Online làm trước: thấy người chơi khác trên đảo. Sau Chương 6 làm thêm đời sống yên bình, chưa viết truyện mới.

Tự hành hiện làm được khi truyện đang chờ tu luyện (`src/game/chores.js`, thứ tự ưu tiên): việc phụ đang nhận, việc hằng ngày (đánh quái, câu cá, luyện đan), treo thưởng (tự nhận, tự trả), tự nhận việc phụ mới, về nhà nhận quà của đạo lữ và khách, hoàng hôn ra đá ngắm cảnh, vuốt ve linh thú, thu hoạch dược viên. Việc hằng ngày về bí cảnh tài nguyên, leo tháp, luận võ cũng tự đi đánh (gục trong tháp thì hôm đó thôi leo). Đầy linh khí thì tự gọi thiên kiếp. Dư Tinh Thiết thì tự cường hóa đồ đang mặc tới mức chưa thể tụt cấp, có ngọc thì tự khảm và ghép. Dư Linh Thạch thì tự nâng động phủ, tiến hóa linh thú, khai thêm luống và nâng đất dược viên (luôn chừa lại một ít, động phủ được ưu tiên). Thành tựu xong thì tự nhận thưởng. Tắt tự hành thì hiện một dòng tóm tắt đã làm được gì. Xong việc hằng ngày thì tự nhận thưởng và mở rương. Hết việc thì đả tọa; đạo lữ ở nhà hoặc đã khuya thì về động phủ ngồi song tu. Ngắm hoàng hôn, thả hoa đăng, quà và trà ở nhà được làm trước treo thưởng; từ 22 giờ tới 5 giờ sáng (bật "Khuya về động phủ", chủ dự án chọn 26/10/2026) không nhận việc mới, làm nốt việc dở rồi về nhà; 19 tới 22 giờ vẫn đi làm việc và thả hoa đăng. Ngoài ra tự mặc món mới mạnh hơn, túi đầy thì phân giải đồ Phàm/Linh cũ để nhặt món mới, máu thấp tự uống Hồi Xuân Đan và sắp hết thì về luyện thêm. Người chơi bật tắt từng việc ở bảng Việc → tab Tự hành (`data/config.json` → pilot.opts).

Những thứ cho cảm giác yên bình: ngày đêm theo giờ thật, bốn mùa, mưa, đom đóm, ngắm cảnh (đạo lữ ngồi cạnh), động phủ trang trí được (Tiểu Linh bán đồ, mỗi món tăng tốc đả tọa ở nhà), khách quen ghé chơi mỗi ngày, chuông gió, thư đạo lữ khi vắng lâu, bế quan khi vắng mặt (ở nhà nhanh hơn), nhật ký tu tiên, uống trà với đạo lữ mỗi ngày (đả tọa nhanh hơn một lúc), NPC và bạn đồng hành nói nhỏ thành bong bóng, vài NPC đi dạo, câu thơ tĩnh tâm khi đả tọa lâu (`data/chatter.json`), đạo lữ đón khi về nhà sau lúc đi xa, kỳ ngộ nhỏ khi đi ngoài trời như nhặt linh thảo, gặp tiên hạc, giọt sương sớm (`data/kyngo.json`). Đạo lữ câu cá cùng và ngồi đả tọa cạnh bên; mỗi tối ra đá ngắm cảnh thả hoa đăng (`data/scenic.json` → lantern); đả tọa lâu thì linh thú tha đồ về (`data/pets.json` → fetch). Khi vắng mặt, linh thú cũng tha đồ về và đạo lữ ở nhà câu cá giùm (`data/fishing.json` → away). Đêm trời quang ngồi ngắm cảnh thì có sao băng, sao đầu mỗi đêm là một điều ước (`data/scenic.json` → star). Đêm song tu ở nhà thì đạo lữ gảy đàn tranh (`data/home.json` → zither). Dòng báo xếp hàng hiện lần lượt, không che mất nhau.

## Trang bị và kiếm tiền

- Max cấp sớm, sau đó người chơi tập trung làm sao mạnh hơn.
- Nhịp tu luyện (`data/realms.json`): tới hết Kim Đan mỗi tầng cần thêm 30% linh khí (đầu game nhanh), sau đó chỉ thêm 3% mỗi tầng. Ở tốc độ đả tọa tốt (động phủ, song tu, ban đêm, khoảng 38 linh khí/giây) thì Chương 5 sau khoảng 15 giờ đả tọa, đỉnh Độ Kiếp khoảng 47 giờ, chưa tính đánh quái, đan, bế quan.
- Đa số đồ ra chỉ số ngẫu nhiên (có hồn); tẩy luyện lại được; cày quái lấy ngọc để khảm.
- Nạp để nhanh hơn: ai cũng cùng mức tối đa, người cày lâu vẫn đuổi kịp.

## Chiến đấu và giao diện

- Vũ khí cho đòn đánh thường + 1 chiêu; hệ linh căn cho 2 chiêu. 5 hệ: Mộc, Hỏa, Thủy, Kim, Thổ.
- Tên người chơi khác và NPC chỉ hiện khi chạm vào.
- Hiệu ứng theo cỡ: chiêu lớn mượt kiểu anime; đạn, tia lửa, đòn nhỏ là pixel + quầng sáng mềm.
- Claude tự vẽ toàn bộ hình bằng code.

## Lộ trình

1. Cốt truyện và nội dung: xong.
2. Bản chơi tạm hình khối đơn giản: mở đầu ở làng, Thiên Kiếm Phong, bí cảnh 3 phòng với boss Huyết Nha, đả tọa. Sau đó: đăng nhập chung tài khoản, thấy người chơi khác.
3. Làm hình pixel và hiệu ứng mượt (chuẩn ở `02-CHUAN-PIXEL.md`).
