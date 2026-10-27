# 01. Hướng đi và các quyết định đã chốt

Game 2D pixel thế giới mở MMORPG tu tiên cho Google Play, cảm giác đánh như My Heroes: Dungeon Raid và Soul Knight Prequel. Game tu chân cũ Auralora đã bỏ hẳn (2026-10-26); game này có dự án Supabase riêng `Pixel2DTuTien`, tài khoản người chơi bắt đầu lại từ đầu.

Bản cốt truyện đầy đủ (Claude Docs): https://claude.ai/artifact/NsmdqZZLEhUn1rfkXXTN9K

## Cốt truyện (chủ dự án chọn, 26/10/2026)

1. Không khí: tươi sáng, có lúc sâu lắng.
2. Ma tộc từ giới khác làm nứt Thiên Mạch (mạch linh khí); đại lục vỡ thành các đảo nổi trên biển mây. Ma tộc ở Ma Vân (mây đen bên dưới). *(Thay bằng mục "Tinh hệ" sáng 28/10/2026: đảo thành tinh cầu, ma khí ăn mòn từ vòng ngoài vào.)*
3. Người chơi là thiếu niên làng Thanh Khê; đúng ngày thức tỉnh linh căn thì ma tộc đánh tới, Kiếm tông cứu và nhận làm đệ tử. Bạn thân Tiểu Hỏa bị kéo xuống Ma Vân, là động lực chương 1.
4. Thế giới: đảo nổi theo tầng mây, ngự kiếm bay giữa các đảo. Cảnh giới càng cao bay càng cao. *(Thay bằng mục "Tinh hệ": càng tu cao càng đi xa Linh Nhật, càng gần ma khí.)*
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
9. Gặp người chơi khác: thấy, chào và chat ngắn, có lọc từ bậy (`data/social.json`).
10. Bảng xếp hạng có cả 3 tab: lực chiến, cảnh giới, tầng tháp cao nhất. Top 10 mỗi tab mỗi tuần được danh hiệu, không có chỉ số.
11. Đời sống yên bình làm cả: nuôi linh cầm trước, rồi nấu ăn cùng đạo lữ, khách ghé chơi.

Tự hành hiện làm được khi truyện đang chờ tu luyện (`src/game/chores.js`, thứ tự ưu tiên): việc phụ đang nhận, việc hằng ngày (đánh quái, câu cá, luyện đan), treo thưởng (tự nhận, tự trả), tự nhận việc phụ mới, về nhà nhận quà của đạo lữ và khách (với khách còn nghe chuyện mới, đánh cờ, mua nguyên liệu khi dư Linh Thạch), nấu một bữa với đạo lữ, nhặt quà linh cầm, hoàng hôn ra đá ngắm cảnh, vuốt ve linh thú, thu hoạch dược viên. Việc hằng ngày về bí cảnh tài nguyên, leo tháp, luận võ cũng tự đi đánh (gục trong tháp thì hôm đó thôi leo). Dư Tinh Thiết thì tự cường hóa đồ đang mặc tới mức chưa thể tụt cấp, có ngọc thì tự khảm và ghép. Dư Linh Thạch thì tự nâng động phủ, tiến hóa linh thú, khai thêm luống và nâng đất dược viên (luôn chừa lại một ít, động phủ được ưu tiên). Thành tựu xong thì tự nhận thưởng. Đầy linh khí thì không tự gọi thiên kiếp: dòng tự hành báo "linh khí đã đầy, chờ bạn độ thiên kiếp" và làm việc khác chờ (chốt 28/10/2026). Gục khi đang làm việc vặt ngoài trời thì tạm tránh loài quái đó rồi làm tiếp; gục trong truyện, bí cảnh, thiên kiếp hoặc gục 3 lần trong 10 phút thì dừng. Tắt tự hành thì hiện một dòng tóm tắt đã làm được gì. Xong việc hằng ngày thì tự nhận thưởng và mở rương. Tối 19 tới 22 giờ có hội đèn ở tinh cầu đã tới thì ra sân xóm ngồi đả tọa (tùy chọn "Tối ra hội đèn"). Hết việc thì đào linh khoáng còn trên tinh cầu đang đứng, rồi treo máy ở bãi quái vừa sức nhất (mạnh nhất mà vẫn đánh được; tinh cầu không có bãi thì bay tới tinh cầu hợp cảnh giới), chủ dự án chốt 28/10/2026; tắt hai việc này hoặc đã khuya thì đả tọa, đạo lữ ở nhà hoặc đã khuya thì về động phủ ngồi song tu. Ngắm hoàng hôn, thả hoa đăng, quà và trà ở nhà được làm trước treo thưởng; từ 22 giờ tới 5 giờ sáng (bật "Khuya về động phủ", chủ dự án chọn 26/10/2026) không nhận việc mới, làm nốt việc dở rồi về nhà; 19 tới 22 giờ vẫn đi làm việc và thả hoa đăng. Ngoài ra tự mặc món mới mạnh hơn, túi đầy thì phân giải đồ Phàm/Linh cũ để nhặt món mới, máu thấp tự uống Hồi Xuân Đan và sắp hết thì về luyện thêm. Người chơi bật tắt từng việc ở bảng Việc → tab Tự hành (`data/config.json` → pilot.opts).

Những thứ cho cảm giác yên bình: ngày đêm theo giờ thật, bốn mùa, mưa, đom đóm, ngắm cảnh (đạo lữ ngồi cạnh), động phủ trang trí được (Tiểu Linh bán đồ, mỗi món tăng tốc đả tọa ở nhà), khách quen ghé chơi mỗi ngày, chuông gió, thư đạo lữ khi vắng lâu, bế quan khi vắng mặt (ở nhà nhanh hơn), nhật ký tu tiên, uống trà với đạo lữ mỗi ngày (đả tọa nhanh hơn một lúc), NPC và bạn đồng hành nói nhỏ thành bong bóng, vài NPC đi dạo, câu thơ tĩnh tâm khi đả tọa lâu (`data/chatter.json`), đạo lữ đón khi về nhà sau lúc đi xa, kỳ ngộ nhỏ khi đi ngoài trời như nhặt linh thảo, gặp tiên hạc, giọt sương sớm (`data/kyngo.json`). Đạo lữ câu cá cùng và ngồi đả tọa cạnh bên; mỗi tối ra đá ngắm cảnh thả hoa đăng (`data/scenic.json` → lantern); đả tọa lâu thì linh thú tha đồ về (`data/pets.json` → fetch). Khi vắng mặt, linh thú cũng tha đồ về và đạo lữ ở nhà câu cá giùm (`data/fishing.json` → away). Đêm trời quang ngồi ngắm cảnh thì có sao băng, sao đầu mỗi đêm là một điều ước (`data/scenic.json` → star). Đêm song tu ở nhà thì đạo lữ gảy đàn tranh (`data/home.json` → zither). Dòng báo xếp hàng hiện lần lượt, không che mất nhau. Chuồng linh cầm sau nhà (gà, thỏ ngọc, hạc con) đẻ quà theo giờ (`data/critters.json`). Mỗi ngày nấu một bữa cùng đạo lữ từ cá và thảo dược, ăn xong đả tọa nhanh hơn (`data/cooking.json`). Cứ vài ngày có khách phương xa ghé: kể chuyện, tặng quà, bán nguyên liệu; khách nào cũng đánh cờ được (`data/visitors.json`). Vắng lâu về nhà thì đạo lữ nấu sẵn cháo; khuya đạo lữ chúc ngủ ngon, sáng sớm chào buổi sáng (`data/home.json` → greet).

## Quyết định sáng 27/10/2026

1. Tiên ngọc, thẻ tháng, quầy đổi: làm khung trong game, chưa thu tiền thật. Gói nạp hiện "Sắp mở" tới khi lên CH Play bản chính thức (`data/topup.json`).
2. Chợ Phiên giữa người chơi, thuế 10%, tiền và đồ gửi qua hòm thư (`data/market.json`, bảng `p2d_cho`).
3. Bí cảnh nhóm 4 người làm ngay: lập tổ đội ở NPC Tổ Đội, chủ phòng điều khiển quái, máu quái tăng theo số người (`data/party.json`).
4. Tông môn người chơi: lập bang, chức vụ, chat bang, việc bang hằng tuần. Không có kho chung (`data/guild.json`).
5. Claude được tự áp bảng, cột, hàm mới lên Supabase không cần hỏi. Xoá hoặc sửa dữ liệu cũ vẫn phải hỏi.
6. Hình pixel thật bắt đầu sau khi xong các việc còn lại; làm trước nhân vật chính, nền đảo, cây, nhà, rồi tới quái.
7. CH Play: làm bản thử nội bộ ngay với hình khối, gói PWA thành TWA (`docs/06-CAI-DIEN-THOAI.md`).
8. Sự kiện mùa: Halloween, Giáng Sinh, Tết (`data/events.json`).
9. Có chat chung cả máy chủ bên cạnh chat đảo và chat bang.
10. Chưa viết Chương 7; làm đời sống yên bình thêm: sổ sưu tập cá, linh cầm thêm loài và đặt tên, tuyết và lá rơi theo mùa, cây nấu ăn ở dược viên.
11. Đổi hệ ở Kim Đan tốn 3000 Linh Thạch và 10 nguyên liệu, giữ như đang làm.
12. Việc tiếp theo là hình pixel và hiệu ứng chiêu, làm hiệu ứng chiêu trước. Vẽ đủ mọi chiêu còn thiếu một lượt. Độ rực vừa phải, dễ nhìn: sáng và rung nhẹ, không chớp mạnh.

## Trang bị và kiếm tiền

- Max cấp sớm, sau đó người chơi tập trung làm sao mạnh hơn.
- Nhịp tu luyện (`data/realms.json`): tới hết Kim Đan mỗi tầng cần thêm 30% linh khí (đầu game nhanh), sau đó chỉ thêm 3% mỗi tầng. Ở tốc độ đả tọa tốt (động phủ, song tu, ban đêm, khoảng 38 linh khí/giây) thì Chương 5 sau khoảng 15 giờ đả tọa, đỉnh Độ Kiếp khoảng 47 giờ, chưa tính đánh quái, đan, bế quan.
- Đa số đồ ra chỉ số ngẫu nhiên (có hồn); tẩy luyện lại được; cày quái lấy ngọc để khảm.
- ~~Nạp để nhanh hơn: ai cũng cùng mức tối đa.~~ Thay bằng mục "Chốt đêm 28/10/2026" bên dưới: cấp và bộ Đạo Vận max được, trang bị thì không bao giờ max; người nạp nặng nhất mạnh hơn tối đa khoảng 50%.

## Chiến đấu và giao diện

- Vũ khí cho đòn đánh thường + 1 chiêu; hệ linh căn cho 2 chiêu. 5 hệ: Mộc, Hỏa, Thủy, Kim, Thổ.
- Tên người chơi khác và NPC chỉ hiện khi chạm vào.
- Hiệu ứng theo cỡ: chiêu lớn mượt kiểu anime; đạn, tia lửa, đòn nhỏ là pixel + quầng sáng mềm.
- Claude tự vẽ toàn bộ hình bằng code. Ngoại lệ (chủ dự án chốt 27/10/2026): nhân vật chính dùng tạm hình chibi chủ dự án đưa và chuyển động làm bằng SpriteCook, có cả nam (kiếm tu tóc đen) và nữ (thương tu tóc trắng), chọn ở Thành tựu → Thời trang (`data/heroes.json`).

## Chốt đêm 28/10/2026

Chủ dự án giao Claude tự chốt theo các đề xuất. Bản đầy đủ: [Bản chốt hướng đi](https://claude.ai/artifact/ABkk83dhBjSQi5sXGiAbwY), chi tiết ở [Vũ trụ nhiều tầng](https://claude.ai/artifact/G47axYq1Gu5GaJQWC8ob6N) và [Tâm lý người chơi](https://claude.ai/artifact/YP9qFEWK4C5cjsPezkBsgi).

1. Ba trụ: trải nghiệm, chơi, chill. Người chơi không bao giờ chán, không bao giờ thiếu mục tiêu. Môi trường yên bình, ấm cúng như lễ hội (đèn, đuốc, trận pháp phát sáng, con vật hiền chạy quanh), đi dạo thôi cũng chill.
2. Luật 7 → 14 → 28: mỗi cấp khó quái mạnh gấp đôi, không hiện chỉ số quái, chỉ hiện màu xanh / vàng / đỏ so với lực chiến. Mỗi cấp 10 bậc (mỗi bậc khoảng +7%). Thưởng chỉ hơn 15% mỗi cấp. Áp cho phó bản, tháp, vòng ngoài tinh cầu, cấm địa, phương thiên địa.
3. Thế giới: vũ trụ nhiều tầng. Đảo thành tinh cầu hình đĩa tròn (đường kính 60–70 ô), cổng đổi tên truyền tống trận, đi qua là một đoạn bay có điều khiển, nhặt sao, không bao giờ thua. Làm bản thử một tinh cầu trước khi xây giao diện. Tên tinh vực, Ma Tổ, các tộc do Claude đặt, chủ dự án sửa sau.
4. 11 trọng điểm bồi dưỡng: cảnh giới, bộ Đạo Vận (6 món trang bị + pháp bảo + 2 chiêu + linh thú cùng hệ; món giống nhau, hệ ngẫu nhiên ghi sau tên; Con Đường Đạo Vận mở ở Kim Đan, đi song hành truyện chính, 1–2 tuần, không bán; đạt bộ rồi thì ép chỉ số hệ đó lên), dòng chỉ số 6 món, ngọc khảm tới cấp 10 (ghép 3 thành 1), cường hoá tới +20, pháp bảo (tách khỏi ô trang bị, thêm ô Mũ, nâng bằng mảnh), 3 chiêu có cấp, linh thú. Giá mỗi bậc nhân lên, sức mạnh cộng ít.
5. Tẩy luyện tăng giá ×1,3 mỗi lần tẩy cùng món, mỗi ngày giảm 2 bậc. Cường hoá hỏng chỉ tụt 1 cấp, không bao giờ mất đồ.
6. Chiêu mạnh hơn đánh thường: chiêu chiếm khoảng 50–60% sát thương (đang làm, sẽ nằm ở `data/config.json` → combat).
7. Kiếm tiền chỉ ở phần "tối ưu thêm" (ngọc, dòng đẹp, cường hoá cao, thời trang); không bán cảnh giới, Đạo Vận. Món ngẫu nhiên bán bằng tiền thật phải công bố tỉ lệ trước khi mua.

## Tinh hệ, làm từ vĩ mô đến vi mô (chủ dự án chốt sáng 28/10/2026)

1. Thế giới là **Thiên Kiếm Tinh Hệ** (`data/starmap.json`). Linh Nhật, mặt trời linh khí, ở giữa. Thiên Kiếm Tinh (tông môn) ở vòng gần nhất, động phủ là mặt trăng của nó. Càng ra xa tinh cầu càng lớn, quái và trùm càng mạnh. Vòng ngoài cùng là **ma khí** đen ngòm đang ăn mòn tinh hệ từ ngoài vào; tinh cầu sát ma khí có trùm mạnh nhất, vài tinh cầu đã bị nuốt. Thiên Kiếm Tông chỉ có thể không ngừng mạnh lên để giữ tinh hệ, bảo vệ mọi người.
2. Mỗi đảo thành một tinh cầu tròn; bí cảnh là mặt trăng quay quanh tinh cầu mẹ. Thứ tự vòng quỹ đạo theo truyện: Thiên Kiếm Tinh và Mảnh Vỡ Thanh Khê, Xích Diễm, Hàn Băng, Hắc Phong, Thanh Mộc (Linh tộc, Thế Giới Thụ), Thiên Kim, Hậu Thổ, Ngoại Vực Vết Nứt, rồi vòng ma khí (Phương Thiên Địa Ma Vương, sắp mở). Tên do Claude đặt, chủ dự án sửa sau.
3. Làm vĩ mô trước, vi mô sau; xong một lớp cho cả thế giới rồi mới sang lớp kế: tinh hệ → tinh cầu → núi, sông, mây, biển, trời đất → nhà cửa, cây cối → người, thú vật → quần áo, công cụ → đồ dùng đời sống (truyền âm, thời trang, đan dược...). Dựng khung thô trước (xấu cũng được), tô dần sau.
4. Cấp tốc làm xong nội dung và hệ thống trước; CH Play, máy chủ và các việc khác làm sau.
5. Chơi dọc là chính: nhiều người lười xoay ngang điện thoại, nên app khoá màn dọc (`manifest.webmanifest` → orientation portrait) và mọi giao diện thiết kế cho màn dọc trước. Tinh đồ mặc định thấy trọn hệ tròn. Chủ dự án thích chữ kiểu game, màu ấm, pixel; không thích kiểu hiện đại, máy móc.
6. Lời thoại đã đổi theo tinh hệ: đảo thành tinh cầu, biển mây thành trời sao hoặc tinh hải (cá câu ở mép tinh cầu là cá tinh hải), Ma Vân là mây ma khí ở rìa tinh hệ, "xuống tầng mây" thành "bay ra vòng ngoài".
7. Người chơi thích treo máy cày (chém, tung chiêu liên tục không bị ngắt): mỗi tinh cầu có vài bãi quái treo máy, quái chết hồi nhanh giữ đủ số con, nhưng tài nguyên rơi ít (`data/planets.json` → farm).
8. Ma Vương tuần ở vòng ma khí (`data/demon.json`): mỗi tuần Ma Tổ sinh một Ma Vương trấn Phương Thiên Địa, mở từ Đại Thừa; hạ con nào thì con sau mạnh gấp đôi, thưởng chỉ nhích; hạ xong tịnh hoá tới tuần sau. Đây là nội dung cuối game cho người đã lên đỉnh.

## Nam, nữ và đạo lữ (chủ dự án chốt sáng 28/10/2026)

1. Tạo nhân vật được chọn nam hoặc nữ; hai nhân vật đã có hình là hình mặc định. Tài khoản cũ được hỏi một lần.
2. Người chơi nữ thì đạo lữ là nam (hiện có Mặc Ảnh), người chơi nam thì đạo lữ là nữ (Lạc Tuyết, Hồ Linh). Lời thoại gọi người chơi đổi theo giới tính (sư đệ / sư muội).
3. Đạo lữ là người trong tab Đồng hành, mang theo thì đi cùng đánh quái; vừa hỗ trợ đánh vừa trò chuyện, khen người chơi thường xuyên.

## Lộ trình

1. Cốt truyện và nội dung: xong.
2. Bản chơi tạm hình khối đơn giản: xong phần lớn (làng, Thiên Kiếm Phong, bí cảnh, đả tọa, online, chợ, tổ đội, tông môn).
3. Ngay bây giờ: chiêu mạnh hơn, trọng điểm bồi dưỡng phần 1, cấp khó ×2 cho tháp và phó bản đang có; song song các việc bắt buộc trước CH Play.
4. Ngay bây giờ (sáng 28/10): làm từ vĩ mô đến vi mô theo mục "Tinh hệ". Đã có tinh đồ; tiếp theo bay truyền tống, phóng mọi đảo thành tinh cầu tròn, rồi địa hình.
5. Chill và hình: đèn ngoài trời, thú hiền, trận pháp sáng, lễ hội nhẹ (đã có đèn đêm, thú hiền, hội đèn mỗi tối một tinh cầu, linh thực ở xóm); rồi hình pixel và hiệu ứng mượt (chuẩn ở `02-CHUAN-PIXEL.md`).
6. Lên CH Play, rồi ra nội dung theo mùa.
