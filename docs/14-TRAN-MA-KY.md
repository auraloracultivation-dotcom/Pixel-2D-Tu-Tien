# Trấn Ma Kỷ: thế giới, cốt truyện và cách dựng vào game

Chủ dự án 21/11/2026 03:16: "Cốt truyện trong game khá là rải rác lung tung, b có thể thiết kế lại từ đầu, chỉ có điều nên áp dụng thêm các tên gọi, vật phẩm,
hành tinh, kể cả hệ thống tích hợp vào trong cốt truyện." 03:47: "nội dung này b viết hay đến mức từng chữ từng dòng tôi đều k muốn bỏ lỡ… uỷ quyền cho b tự ý
sửa toàn bộ nội dung truyện trong game… quan trọng nhất vẫn là cảm xúc người chơi khi vừa chơi vừa hiểu truyện, đồ hoạ phải nhiều hiệu ứng chúc mừng, lễ thăng
cấp, nói chung là đánh thẳng vào tâm lý người chơi làm họ cảm thấy vui, thấy tiến bộ, thấy yêu mến k nỡ rời và thấy được ý nghĩa game."

Tệp này có hai phần. **Phần A** là bản thiết lập (thế giới, khẩu quyết, cấm kỵ, cốt truyện, nhịp truyện), chép từ trang chủ dự án đã đọc:
https://claude.ai/artifact/UnQieV9DfQx1o45xYrhTAg. **Phần B** là cách truyện đang nằm trong game: một chuỗi nhiệm vụ chính 1 → N, viết lại lần hai sau khi chủ
dự án bác cách làm đầu tiên (cuốn sổ bảy quyển) lúc 08:46–08:51 cùng ngày. Sửa lời truyện, viết nhiệm vụ mới: `data/story.json`, rồi cập nhật lại tệp này.

# Phần A. Bản thiết lập

## Trấn Ma Kỷ là gì

Trấn Ma Kỷ kể về những người đứng giữ ngọn đèn cuối cùng của vũ trụ, và cái giá của việc giữ. “Trấn” là đứng giữ một chỗ không cho đêm tràn qua. “Kỷ” vừa là kỷ nguyên, vừa là cuốn sổ ghi tên: ai từng đứng giữ đều có một dòng trong đó.

Bản này viết lại thế giới và cốt truyện từ đầu, nhưng giữ tên gọi, vật phẩm, tinh cầu và Hệ Thống đang có trong game. Mỗi nguồn cảm hứng lo một việc:

| Nguồn | Lấy gì | Nằm ở |
|---|---|---|
| Võ Luyện Đỉnh Phong | Thế giới nhiều tầng, leo một bậc thấy trời rộng thêm một tầng | Phần 1 |
| Thương Lan Quyết | Người đứng vững, gọi tên phép thành tiếng, trời đất động theo | Phần 2 |
| Cấm Kỵ Tông Môn | Tuyệt học phải trả bằng thọ nguyên hoặc mạng sống | Phần 3 |
| Tiên Nghịch | Nhịp chậm, mất mát thật, khoảnh khắc lặng | Phần 4 và 5 |

Không có câu chữ, nhân vật hay chiêu thức nào chép từ bốn bộ trên: chỉ lấy cách làm.

## Phần 1. Quy tắc thế giới và ý nghĩa

Cả Thiên Kiếm Tinh Hệ là một cái cây: mọi thứ đang có trong game đều là một bộ phận của Thế Giới Thụ. Nắm được hình này thì chín luật bên dưới tự khớp vào nhau.

### Thế giới là một cái cây

| Tên trong game | Trong Trấn Ma Kỷ là gì |
|---|---|
| Thế Giới Thụ (Cây mẹ) | Nguồn của mọi sự sống và linh khí. Rễ nổi lên ở Thanh Mộc Tinh |
| Linh Nhật | Đoá hoa duy nhất của Cây, nở giữa tinh hệ |
| Thiên Mạch | Mạch nhựa của Cây chạy ngang trời, nối Linh Nhật với từng tinh cầu |
| Chín vòng quỹ đạo | Chín vòng năm của Cây. Càng ra ngoài càng gần đêm |
| Xích Diễm, Hàn Băng, Thanh Mộc, Thiên Kim, Hậu Thổ | Năm chỗ năm rễ cái Hỏa, Thủy, Mộc, Kim, Thổ trồi lên |
| Linh căn | Cái rễ con nối mỗi người với Cây. Phẩm là rễ to hay nhỏ, hệ là nối vào rễ cái nào |
| Linh khí | Hơi thở của Cây |
| Thọ nguyên | Phần nhựa Cây chia cho mỗi sinh mệnh |
| Kết giới linh khí | Lớp vỏ cây, dệt bằng ánh sáng của Linh Nhật |
| Ma khí | Linh khí đã đứt khỏi Cây và thối đi. Tiểu Mộc Linh gọi nó là nấm mốc ăn vỏ cây |
| Ngoại Vực Vết Nứt | Vết thương nơi Thiên Mạch bị cắt, ma khí rỉ vào từ đó |
| Ma Tổ | Cái rễ chết của chính Cây. Nó vẫn ra quả mỗi tuần, quả là Ma Vương |
| Hệ Thống và ký chủ | Mắt ghép của Cây và gốc ghép: một linh hồn ngoại lai được ghép vào Cây |
| Cửu Đầu Thôn Thiên Mãng | Con sâu thái cổ quấn quanh thân Cây. Ăn vỏ, nhưng cũng ăn cả nấm mốc |
| Mảnh Vỡ Tinh Cầu | Xác của chín tinh cầu đã vỡ. Gom đủ thì ghép lại được một tinh cầu |

### Chín thiên quy

1. **Luật Căn: vạn vật là lá của một Cây.** Ai sinh ra dưới ánh Linh Nhật đều có một cái rễ con nối với Cây, gọi là linh căn. Tu luyện là nuôi cái rễ ấy lớn lên.
2. **Luật Quy Căn: lá rụng về cội.** Người chết trong vùng sáng thì linh khí và thọ nguyên trở về Cây, rồi thành sự sống mới. Cái chết ở đây buồn, nhưng không phải là hết.
3. **Luật Ma: ma không sinh ra được gì, ma chỉ giữ.** Một sinh mệnh chết trong ma khí thì không về được cội: nó bị giữ lại và thối thành ma. Mỗi con ma từng là một người, một con thú, một cái cây.
4. **Luật Đêm: ánh sáng đang được tiêu vào việc giữ tường.** Linh Nhật từng sáng như mặt trời. Từ ngày ma khí vây kín, nó dồn gần hết ánh sáng ra rìa để dệt kết giới. Phần rơi xuống tinh cầu chỉ còn sáng như trăng, nên mọi tinh cầu luôn là đêm.
5. **Luật Trấn: đất chỉ sáng khi có người đứng giữ.** Một tinh cầu thuộc về người sống khi có một nhánh Cây cắm rễ ở đó và có người canh nó. Bỏ đi thì ma khí chiếm lại. Biên giới của vùng sáng là một hàng người, không phải một bức tường.
6. **Luật Giá: mượn của Cây thì trả cho Cây.** Chiêu thường mượn linh khí rồi trả lại, nên chỉ tốn linh lực và hồi chiêu. Mượn quá phần mình thì phải trả bằng chính mình: thọ nguyên, tu vi, ký ức, tên, mạng. Chính đạo tự trả. Ma đạo bắt kẻ khác trả thay.
7. **Luật Bậc: đỉnh núi này là chân núi kia.** Mỗi cảnh giới mở ra một vòng trời rộng hơn và một tầng đêm sâu hơn. Không có đỉnh cuối cùng, chỉ có hướng đi.
8. **Luật Ghép: hồn ngoại lai không có rễ, Hệ Thống là rễ ghép.** Lá trong vườn Cây đã đếm hết, và Cây đang mất nhiều hơn mọc. Nên Cây kéo linh hồn từ ngoài vũ trụ vào, ghép lên một thân xác, và cho một cái mầm đi theo dạy dỗ. Cái mầm ấy tự xưng là bổn hệ thống.
9. **Luật Tên: thứ gì còn được gọi tên thì chưa mất.** Ma khí xoá tên trước, xoá người sau. Vì thế tông môn khắc tên lên kiếm, Kiếm Lão giữ từng thanh ở Kiếm Trủng, và Hệ Thống ghi tên từng ký chủ vào một cuốn sổ. Cuốn sổ ấy tên là Trấn Ma Kỷ.

### Chín cảnh giới là chín bước từ lá thành cây

| Cảnh giới | Bước của cái rễ |
|---|---|
| Luyện Khí | Học thở cùng Cây |
| Trúc Cơ | Cắm rễ. Thọ nguyên tăng từ đây |
| Kim Đan | Kết hạt: kim đan là hạt giống của riêng mình |
| Nguyên Anh | Hạt nảy mầm |
| Hóa Thần | Mầm biết nghe: nghe được tiếng Cây mẹ |
| Luyện Hư | Rễ vươn vào hư không, sống được ngoài kết giới |
| Hợp Thể | Thân với đất là một, đủ sức trấn một tinh cầu |
| Đại Thừa | Thành tán, che được cả một tông môn |
| Độ Kiếp | Cây thử cành lần cuối trước khi cho ra hoa |

Thiên kiếp là lúc Cây dồn nhựa thử cành: sét là linh khí thô đổ vào người, chịu được thì lớn lên. Ánh sét sáng nhất vùng nên ai đứng gần cũng bị đánh cùng, và ma tộc luôn tìm tới.

Năm cảnh giới đầu đã khớp với năm chặng tinh cầu đang có trong game, từ Thanh Khê tới Lòng Vết Nứt. Bốn cảnh giới sau để dành cho nội dung mới.

### Ý nghĩa của thế giới

Vũ trụ này mặc định là đêm. Sự sống là ngoại lệ, và ngoại lệ ấy còn vì có người đang giữ. Người chơi không bước vào một thế giới để chinh phục: họ bước vào một ngọn đèn đang được che bằng tay.

### Ý nghĩa của câu chuyện

- **Với một người:** đi từ kẻ được che chở thành kẻ che chở.
- **Với Thiên Kiếm Tông:** kiếm không phải để thắng. Kiếm cắm xuống đất làm mốc: từ đây trở vào, ma không được qua. Thiên Kiếm Phong, ngọn núi hình thanh kiếm, chính là thanh kiếm tổ sư cắm cạnh Linh Nhật.
- **Với thế giới:** giữ cho đường về cội còn mở, để người chết còn được về.

Đỉnh phong ở đây không phải nơi cao nhất. Đỉnh phong là chỗ phía trước mình không còn ai đứng chắn nữa.

Phản diện soi ngược đúng chữ “giữ”. Người trấn ma giữ một chỗ để kẻ khác được đi tiếp. Ma giữ lấy kẻ khác để không ai được đi. Cả câu chuyện là việc học phân biệt hai kiểu giữ ấy.

## Phần 2. Khẩu quyết triệu hồi

Mỗi phép trong Trấn Ma Kỷ được gọi thành tiếng, vì theo Luật Giá, mượn của Cây thì phải nói rõ mình mượn gì. Lối đánh lấy ba điều từ Thương Lan Quyết: người thi triển đứng vững còn trời đất chuyển động, phép nào cũng có tên và có hình, lời càng ngắn thì đòn càng nặng.

### Bốn nhịp của một khẩu quyết

1. **Gọi:** gọi tên thứ mình triệu.
2. **Mượn:** nói mượn gì, hoặc giữ ai.
3. **Lệnh:** một chữ dứt khoát, là lúc đòn bay ra.
4. **Trả:** chỉ có ở tuyệt học cấm kỵ, nói rõ cái giá.

Đòn thường chỉ cần Gọi và Lệnh, đọc vừa trong nhịp tụ linh trước khi pháp bảo bắn. Đòn lớn đọc đủ ba nhịp. Cấm kỵ đọc cả bốn.

### Mười hai chữ lệnh

| Lệnh | Chữ Hán | Dùng khi |
|---|---|---|
| Khởi | 起 | Gọi một vật đứng dậy, bay lên |
| Lai | 來 | Gọi linh thú, bạn đồng hành tới |
| Lâm | 臨 | Gọi thứ từ trời giáng xuống |
| Khai | 開 | Mở đường, mở trận, bung gió |
| Thu | 收 | Hút vào, thu về |
| Trảm | 斬 | Chém |
| Phá | 破 | Phá khiên, phá trận |
| Trấn | 鎮 | Đè xuống, giữ chỗ |
| Hộ | 護 | Che chắn |
| Phong | 封 | Nhốt, khoá |
| Tán | 散 | Xua ma khí, đẩy lùi |
| Quy | 歸 | Tiễn hồn về cội |

Mỗi chữ lệnh là một âm Hán Việt, nên bản tiếng Trung của game chỉ cần đúng một chữ.

### Đoản quyết cho tám pháp bảo

| Pháp bảo | Khẩu quyết | Hình khi thi triển |
|---|---|---|
| Phi Kiếm | Tâm tới, kiếm tới. Trảm! | Hai ngón tay chỉ thẳng, kiếm vạch một đường sáng rồi quay về |
| Linh Châu | Một hạt sáng, vạn dặm đêm. Khởi! | Xoè bàn tay, châu trôi chậm, đêm hai bên dạt ra |
| Bảo Phiến | Mượn trời một làn gió. Khai! | Phẩy tay ngang ngực, gió mở hình quạt |
| Đại Ấn | Trời cao làm chứng. Lâm! | Giơ tay quá đầu rồi úp xuống, ấn rơi từ trời |
| Hộ Thuẫn | Sau lưng ta còn người. Hộ! | Hai tay bắt chéo trước ngực, khiên dựng lên |
| Đồng Chung | Một tiếng chuông, vạn ma lùi. Tán! | Búng ngón tay, sóng âm toả tròn |
| Trận Kỳ | Cờ cắm chỗ nào, đất về chỗ ấy. Trấn! | Chỉ tay xuống đất, cờ cắm, vòng trận sáng lên |
| Hồ Lô | Nuốt đêm vào bụng, nhả ra thành sóng. Thu! | Ngửa lòng bàn tay, hồ lô hút rồi phun |

### Trường quyết triệu hồi

Dấu gạch chéo là chỗ ngắt dòng khi đọc.

- **Thỉnh Kiếm Quyết** (quyết nhập môn của Thiên Kiếm Tông): “Trời đất có đêm, tay ta có kiếm. / Kiếm không hỏi địch đông hay ít, / chỉ hỏi sau lưng còn ai. / Thiên Kiếm, khởi!”
- **Ngự Kiếm Quyết** (đạp kiếm bay): “Đất giữ chân người, kiếm giữ lòng người. / Một bước rời đất, vạn dặm dưới chân. / Khởi!”
- **Hoán Linh Quyết** (gọi linh thú, thú cưỡi): “Rừng cũ còn tiếng, núi xưa còn hơi. / Bạn ta chưa ngủ, nghe ta gọi tên. / Lai!”
- **Khôi Lỗi Quyết** (gọi khôi lỗi): “Gỗ không hồn, ta cho mượn ý. / Đứng dậy, đi thay ta một đoạn. / Khởi!”
- **Thỉnh Tượng Quyết** (hiện pháp tượng sau lưng): “Đạo trong lòng vốn không có hình. / Nay mượn một dáng, đứng sau lưng ta. / Pháp tượng, lâm!”
- **Lập Giới Quyết** (cắm Trận Kỳ, giữ cổng, dựng kết giới): “Một bước sau lưng ta là nhà. / Bước ấy, ma không được qua. / Trấn!”
- **Dẫn Lôi Quyết** (lời mở đầu khi độ kiếp): “Cây muốn thử cành, xin cứ thử. / Cành này gãy thì thôi, không cong. / Cửu thiên lôi, lâm!”
- **Truyền Tống Quyết** (bước vào Pháp Trận Truyền Tống): “Thiên Mạch nối sao với sao. / Cho ta mượn một nhịp nhựa chảy. / Khai!”
- **Hồi Xuân Quyết** (chữa thương, cứu người vừa gục): “Lá chưa vàng thì chưa được rụng. / Cây chưa gọi, ngươi chưa được đi. / Ở lại!”
- **Quy Căn Quyết** (tiễn hồn một ma tướng vừa hạ, đọc khẽ, không hô): “Đường về hơi xa, ta tiễn một đoạn. / Tên ngươi, ta nhớ thay. / Về đi. Quy.”

Hồi Xuân Quyết là quyết duy nhất kết bằng tiếng thường, vì lời ấy nói với một con người chứ không nói với trời đất.

### Hợp quyết của tổ đội

Đội trưởng xướng, cả đội đáp, dùng khi vào trận boss thế giới hoặc bang chiến:

- Xướng: “Sau lưng ta?” Đáp: “Còn người!”
- Xướng: “Trước mặt ta?” Đáp: “Không ma nào qua!”
- Cùng hô: “Trấn!”

### Hệ Thống và khẩu quyết

Ký chủ đọc thiếu, Hệ Thống đọc bù: “Đinh! Ký chủ nuốt mất một chữ. May mà bổn hệ thống thuộc.” Đây là chỗ để nó trêu. Chỉ riêng trước một cấm kỵ, nó không trêu nữa.

### Ma tộc chỉ có một câu

Ma không mượn nên không cần khẩu quyết dài. Từ Tiểu ma tới Đại Ma Thần, chúng chỉ nói hai chữ: “Ở lại.” Đó cũng là hai chữ kết của Hồi Xuân Quyết. Người chữa thương nói với kẻ còn sống để giữ họ lại với đời. Ma nói với kẻ đã chết để không cho họ về cội.

### Viết khẩu quyết mới theo năm điều

- Câu đầu là một hình ảnh thấy được, không phải lời khoe sức mạnh.
- Câu giữa nói mượn gì hoặc giữ ai.
- Kết bằng một chữ lệnh.
- Mỗi dòng không quá tám chữ, đọc to không vấp.
- Chính đạo không hô “diệt”, “sát”. Người trấn ma đuổi và tiễn, không hả hê.

## Phần 3. Tuyệt học cấm kỵ

Tuyệt học cấm kỵ là những chiêu mượn quá phần mình, nên phải trả bằng chính mình. Thiên Kiếm Tông cấm không phải vì chúng tà, mà vì tông môn không nỡ mất người.

### Cấm Kỵ Các

Tầng trên cùng của Tàng Kinh Các giữ một nghìn quyển, gọi là Thiên Quyển Cấm Lục. Mỗi quyển chỉ có một dòng là chiêu thức. Phần còn lại là tên những người đã dùng và cái giá từng người đã trả.

Chín trăm chín mươi chín quyển có chữ. Quyển thứ một nghìn để trắng. Môn quy ghi: quyển này dành cho người viết nó.

Đó là nghĩa của “bảo vật trấn tông”. Báu vật không phải là chiêu, mà là việc đã có người trả giá trước để đời sau biết giá.

### Năm cái giá

| Giá | Mất gì | Dấu hiệu ai cũng thấy |
|---|---|---|
| Thọ | Số năm còn sống | Tóc bạc từng lọn ngay lúc thi triển |
| Tu | Tầng tu hoặc cả cảnh giới | Hào quang quanh người tắt bớt một vòng |
| Ức | Ký ức về một người | Người dùng nhìn người thân như nhìn người lạ |
| Danh | Tên mình trong lòng thiên hạ | Tên trên đầu nhân vật mờ dần rồi mất |
| Mệnh | Mạng sống kiếp này hoặc phần của kiếp sau | Thân tan thành ánh sáng |

### Mười hai quyển tiêu biểu

1. **Phá Thiên Tuyệt Trảm** · giá Thọ
   - Lời: “Mười năm của ta, đổi ba hơi thở ban ngày. Trảm!”
   - Chiêu: tụ lực, binh khí đỏ rực lớn dần rồi chém một vệt sáng tới chân trời. Màn ma khí rách ra, ánh Linh Nhật thật đổ xuống trong ba hơi thở.
   - Giá: mười năm thọ nguyên cho một nhát.
   - Người viết quyển: một đệ tử ngoại môn muốn mẹ mình một lần thấy ban ngày.
2. **Bạch Phát Kiếm Vũ** · giá Thọ
   - Lời: “Tóc ta còn đen bao nhiêu sợi, trời còn bấy nhiêu kiếm. Khởi!”
   - Chiêu: mỗi sợi tóc bạc đi hoá một thanh kiếm sáng. Đánh càng lâu, tóc càng trắng, mưa kiếm càng dày.
   - Giá: mỗi nhịp đánh mất thêm thọ nguyên. Dừng lúc nào cũng được, nhưng tóc không đen lại.
   - Người viết quyển: một nữ trưởng lão giữ cổng tông môn trọn một đêm, sáng ra tóc trắng như tuyết.
3. **Nhượng Thọ** · giá Thọ
   - Lời: “Phần của ta, chia cho ngươi. Ở lại.”
   - Chiêu: kéo một người vừa gục trở về. Không sát thương, không ánh sáng lớn, chỉ một sợi sáng nối hai lồng ngực.
   - Giá: cho đi bao nhiêu năm thì mình mất bấy nhiêu.
   - Người viết quyển: nhiều không đếm xuể. Trưởng lão Vân Hạc già trước tuổi vì đã nhượng thọ cho ba lứa đệ tử.
4. **Dẫn Kiếp** · giá Tu
   - Lời: “Kiếp của ta, mời các ngươi cùng chịu. Lâm!”
   - Chiêu: gọi thiên kiếp của chính mình xuống sớm ngay giữa trận. Sét đánh mọi thứ đứng gần.
   - Giá: kiếp non nên chắc chắn thất bại, mất linh khí và rớt tầng.
   - Người viết quyển: một Kim Đan bị vây ở Hắc Phong Tinh, kéo cả bầy ma vào lôi kiếp của mình.
5. **Toái Đan Chiếu Dạ** · giá Tu
   - Lời: “Hạt này ta kết ba mươi năm. Hôm nay cho nó nở. Khai!”
   - Chiêu: tự làm vỡ kim đan. Ánh đan soi sáng cả một tinh cầu trọn một đêm, ma khí phải lùi.
   - Giá: rớt về phàm nhân, tu lại từ Luyện Khí.
   - Người viết quyển: một chấp sự không ai nhớ mặt. Tinh cầu ông cứu nay vẫn còn người ở.
6. **Cốt Kiếm** · giá Tu
   - Lời: “Kiếm gãy thì lấy xương. Khởi!”
   - Chiêu: rút một đoạn xương luyện thành kiếm. Kiếm này không gãy chừng nào người còn đứng.
   - Giá: gốc rễ hao vĩnh viễn, cảnh giới dừng ở đó.
   - Người viết quyển: một thợ rèn Xích Diễm Tinh, tổ tiên của Thiết Lan.
7. **Nghịch Mạch Phong Ma** · giá Tu
   - Lời: “Thân ta làm ngục. Mời vào. Phong!”
   - Chiêu: đảo kinh mạch, nhốt một ma tướng vào chính cơ thể mình.
   - Giá: từ đó không được ngủ. Ngủ là ma thoát.
   - Người viết quyển: một người gác đêm của tông môn, chưa ai thấy ông nhắm mắt.
8. **Vong Nhân Nhất Kiếm** · giá Ức
   - Lời: “Ta quên ngươi, để kiếm này nhớ. Trảm!”
   - Chiêu: một kiếm không né được. Nó nặng bằng mọi ký ức về người mình thương nhất, thương càng sâu kiếm càng nặng.
   - Giá: quên hẳn người đó.
   - Người viết quyển: nhiều tên, và cạnh mỗi tên là một cái tên khác do người thân viết thêm vào.
9. **Thỉnh Tiền Nhân Kiếm** · giá Danh
   - Lời: “Các vị đã nằm yên, xin dậy thêm một lần. Con đổi bằng tên mình. Khởi!”
   - Chiêu: vạn thanh kiếm ở Kiếm Trủng bay lên theo một nhát chém, rồi tự về chỗ cũ.
   - Giá: tên người gọi bị xoá, để tên trên những thanh kiếm kia được giữ.
   - Người viết quyển: không ai nhớ, đúng như cái giá. Trong Kiếm Trủng có một thanh kiếm không khắc tên, và một ông lão giữ mộ không nhớ tên thật của mình.
10. **Vô Danh Trấn** · giá Danh
   - Lời: “Từ nay không ai gọi ta nữa. Vậy ma cũng không tìm được ta. Trấn!”
   - Chiêu: xoá tên mình khỏi thiên địa. Ma tộc không còn thấy người này, nên chỗ người ấy đứng thành một điểm trấn không bao giờ bị tìm ra.
   - Giá: không ai còn nhớ người ấy từng tồn tại.
   - Người viết quyển: dòng tên để trống. Ngoài rìa kết giới có những tấm bia không chữ.
11. **Dự Chi Lai Sinh** · giá Mệnh
   - Lời: “Kiếp này không đủ, ta mượn kiếp sau. Phá!”
   - Chiêu: một đòn mang sức của cả cảnh giới kế tiếp.
   - Giá: kiếp sau sinh ra với linh căn Phàm.
   - Người viết quyển: rất nhiều. Tông môn dạy: đừng coi thường linh căn Phàm, biết đâu kiếp trước họ đã tiêu trước phần mình để cứu ông bà ngươi.
12. **Hoá Thân Trấn Thụ** · giá Mệnh
   - Lời: “Ta không đi nữa. Ta ở lại đây làm bóng mát. Trấn.”
   - Chiêu: thân hoá thành một cây cổ thụ, rễ nối vào Thiên Mạch, giữ sáng một tinh cầu cả nghìn năm.
   - Giá: không chết, không sống. Nghe được, không nói được.
   - Người viết quyển: Cổ Thụ Ngàn Năm cuối phố chợ Thiên Kiếm Tinh từng là một vị trưởng lão.

### Quyển thứ một nghìn

Quyển trắng tên là Tiếp Mạch: lấy thân làm cành ghép, nối lại Thiên Mạch đã đứt. Chỉ hồn ngoại lai dùng được, vì chỉ thứ không phải lá của Cây mới bắc qua được vết cắt của Cây. Giá của nó nằm ngoài năm cái giá trên: người dùng bỏ đường về thế giới cũ của mình.

Lời chỉ có ba dòng: “Ta từ nơi có nắng mà tới. / Nắng ấy, ta để lại đây. / Ta ở lại.”

### Năm nhịp thi triển

1. **Lặng:** nhạc tắt, mọi thứ quanh đó khựng nửa nhịp.
2. **Xưng giá:** người dùng đọc lời, chữ hiện từng dòng.
3. **Trả:** dấu hiệu của cái giá hiện ra trước khi đòn bay.
4. **Phát:** đòn đánh, màn hình sáng nhất ở đây.
5. **Dư:** lặng thêm một giây. Chỉ còn thứ đã mất.

Trước mỗi cấm kỵ, Hệ Thống không kêu “Đinh”. Nó hỏi đúng một câu: “Ký chủ chắc chưa?”

### Ma công là tấm gương ngược

Ma tộc cũng có chiêu vượt phần mình, nhưng bắt kẻ khác trả. Huyết Ma Kinh hút máu người bị đánh. Hắc Phong Quyết mượn gió đen thổi về từ những tinh cầu đã mất. Người tu chính đạo vẫn học được hai bộ này, và đó là chỗ ma khí tìm đường vào. Ranh giới chính và tà nằm ở đúng một điểm: ai là người trả giá.

### Làm ra một nghìn chiêu

Không cần viết tay một nghìn chiêu. Mỗi quyển là một tổ hợp của giá (5), hình theo loại pháp bảo (8) và hệ ngũ hành (5): riêng ba thứ này đã cho 200 gốc chiêu, nhân với mười hai chữ lệnh là 2.400. Mười hai quyển ở trên là mẫu viết tay, phần còn lại đặt tên theo khuôn: vật hoặc hình, việc làm, cái giá.

## Phần 4. Cốt truyện viết lại từ đầu

Cốt truyện mới là một đường thẳng bảy quyển, mỗi quyển gắn với một chặng tinh cầu và một cảnh giới đang có trong game. Người, nơi chốn và boss đều là tên cũ; thứ tự và lý do là mới. Bản dưới viết theo người chơi nam; người chơi nữ thì Lạc Tuyết đổi thành Tiêu Dao, như game đang làm.

### Chuyện trước khi người chơi tới

Ngày xưa Thiên Mạch còn lành và trời có ban ngày. Ký chủ đầu tiên của Hệ Thống mạnh tới mức không ai sánh được, vì khi ấy Hệ Thống cho mà không tính giá. Rồi người ấy mất cả tông môn trong một trận, và không chịu để họ về cội. Hắn giữ hồn họ lại. Những hồn bị giữ thối thành ma, và ma khí đầu tiên sinh ra từ đó.

Người ấy nay là Đại Ma Thần. Chín tinh cầu đã vỡ. Tổ sư Thiên Kiếm cắm kiếm cạnh Linh Nhật, Linh Nhật dồn ánh sáng ra dệt kết giới, và đêm bắt đầu. Kỷ nguyên ấy được ghi tên là Trấn Ma Kỷ.

Từ đó Hệ Thống đổi luật: không cho không nữa. Ký chủ phải làm nhiệm vụ lấy điểm, đủ một trăm điểm mới triệu hồi quà. Cái tên Bạo Kích Tài Nguyên Vô Hạn nó giữ lại từ thời cũ, nửa để khoe, nửa để tự nhắc.

### Bảy quyển

1. **Mùi nắng** · Mảnh Vỡ Thanh Khê, Thiên Kiếm Tinh · Luyện Khí
   - Linh hồn người chơi rơi vào thân xác một đứa trẻ làng Thanh Khê đúng ngày lễ thức tỉnh linh căn. Hệ Thống liên kết, kiêu như cũ. Trưởng thôn và Tiểu Hỏa gọi người chơi bằng tên đứa trẻ ấy. Hệ Thống không nói thân xác này từng là của ai.
   - Ma tộc tràn tới, làng cháy, Tiểu Hỏa bị bắt. Lạc Tuyết đưa người chơi lên Thiên Kiếm Phong. Trưởng lão Vân Hạc trao binh khí đầu tiên, Hồ Linh chỉ chỗ bồ đoàn, người chơi hạ Phân thân Huyết Nha.
   - Kết quyển: bàn tay Đại Ma Thần xé trời bắt Lạc Tuyết đi. Hệ Thống nói: “Lần đầu tiên bổn hệ thống thấy mình nhỏ bé.” Về sau mới biết đó là câu nói dối đầu tiên của nó: nó đã thấy bàn tay ấy rồi.
2. **Người đứng gác** · Xích Diễm Tinh, Hàn Băng Tinh, Hắc Phong Tinh · Luyện Khí tới Trúc Cơ
   - Người chơi học ngự kiếm ở Xích Diễm, gặp Lão Thiết bên lò rèn đã cháy, và hạ Huyết Nha thật trong Hỏa Quật. Ở Hàn Băng, Lão Ngư kể tuyết lang từng hiền. Trong Băng Quật, Hàn Hồn Ma Tướng hoá ra là một đệ tử Thiên Kiếm đứng gác tới khi đóng băng. Lần đầu người chơi hiểu Luật Ma và nghe Quy Căn Quyết.
   - Mặc Ảnh xuất hiện: một ma tộc còn nhớ bát canh cá Tiểu Hỏa chia cho lúc cả hai bị xích. Hắn là bằng chứng rằng ma vẫn có thể nhớ, tức là Lạc Tuyết còn cứu được. Người chơi phá Hắc Phong Động, hạ Hắc Phong Ma Quân, cứu Tiểu Hỏa.
   - Kết quyển: đột phá Trúc Cơ, cắm rễ. Rễ của người chơi là rễ ghép nên lôi kiếp đánh lệch một nhịp. Hệ Thống lảng sang chuyện khác.
3. **Cây mẹ** · Thanh Mộc Tinh, Làng Tinh Linh, Cổ Thụ Tâm, Rễ Mẫu Thụ · Kim Đan
   - Mộc Trưởng Lão nói cổ thụ sống ba nghìn năm, còn ma tộc muốn nó chết trong ba ngày. Thanh Diệp nghe được Cây mẹ và bảo người chơi: “Cây mẹ nói ngươi có mùi nắng.” Ở tinh hệ này, nắng là chữ người ta còn nói nhưng không ai còn thấy. Hệ Thống phải nhận: nó là một cái mầm của Cây, còn ký chủ là linh hồn được ghép vào.
   - Thực Mộc Ma Hậu đang gặm rễ. Sâu hơn, Hắc Cức Ma Chủng là một hạt giống ma cấy vào Rễ Mẫu Thụ: ma cũng biết ghép. Bóng Ma Tôn hiện ra dưới gốc Cây mẹ và nói rõ ý đồ. Hắn không giết Cây. Hắn ghép ma vào năm rễ cái để Linh Nhật nở ra đêm.
   - Kết quyển: người chơi kết đan ngay dưới tán Cây mẹ, cả tinh cầu thấy. Kết hạt.
4. **Vạn kiếm còn hồn** · Thiên Kim Tinh, Kiếm Trủng · Kim Đan
   - Muốn ghép ma vào rễ cái, Ma Tôn cần năm chìa khoá sống. Bốn người mang linh căn thuần: Tiểu Hỏa giữ rễ Hỏa, Thanh Diệp rễ Mộc, Thiết Lan rễ Kim, Thạch Sinh rễ Thổ. Người giữ rễ Thủy đã ngã từ lâu, chính là Hàn Hồn Ma Tướng. Chìa thứ năm vì thế phải là một rễ ghép, nối được vào mọi rễ cái: ký chủ.
   - Người chơi tới Thiên Kim Tinh cứu Thiết Lan khỏi Kiếm Trủng. Vạn Kiếm Ma Tướng từng là người giữ mộ: ông sợ người chết bị quên nên đánh thức cả vạn thanh kiếm. Kiếm Lão, người giữ mộ sáu mươi năm, đáp: “Kiếm tốt là kiếm biết lúc nào nên nằm yên.”
   - Kết quyển: Vân Hạc dẫn người chơi lên Cấm Kỵ Các. Một nghìn quyển, quyển cuối để trắng.
5. **Đất biết khóc** · Hậu Thổ Tinh, Địa Cung · Nguyên Anh
   - Thạch Bà mời khoai nướng và nói đất này nuôi người ba nghìn năm. A Nham trốn trong hang ba tháng mới dám ra. Thạch Sinh ít lời, bị Toái Sơn Ma Tướng giam dưới Địa Cung. Người chơi cứu được Thạch Sinh, nhưng đó là mồi: cùng lúc ấy Ma Tôn đưa Lạc Tuyết vào Vết Nứt để kéo chìa thứ năm tới.
   - Đây là quyển thua. Lần đầu người chơi thấy Vân Hạc dùng Nhượng Thọ giữ mạng một đệ tử, và thấy cái giá hiện ngay trên tóc ông.
   - Kết quyển: kết anh. Nguyên anh hiện ra mang gương mặt đứa trẻ Thanh Khê, chủ cũ của thân xác. Nó chỉ hỏi: “Làng còn không?” Người chơi trả lời, đọc Quy Căn Quyết, tiễn nó về cội. Từ đó thân này mới thật là của mình.
6. **Hư Không Lao** · Ngoại Vực Vết Nứt, Hư Không Lao, Lòng Vết Nứt · Nguyên Anh tới Hóa Thần
   - Hư Không Ngục Chủ canh những hồn không được về cội. Người chơi phá ngục, tìm thấy Lạc Tuyết vẫn còn là người. Nàng giữ được mình nhờ một cấm kỵ: ma khí chui vào qua điều mình thương nhất, nên nàng tự cắt ký ức ấy đi. Nàng quên người chơi.
   - Ở Lòng Vết Nứt, Ma Tôn bị hạ nhưng vết cắt trên Thiên Mạch vẫn hở. Chỉ cành ghép nối được mạch cây đã đứt. Hệ Thống mở quyển thứ một nghìn, rồi lần đầu đề nghị điều ngược lại: “Ký chủ muốn về nhà không? Bổn hệ thống đưa về được.”
   - Mọi ký chủ trong tinh hệ cùng chọn ở lại, mỗi người góp một sợi rễ ghép, vá Thiên Mạch. Trời sao im lặng. Hệ Thống cũng im lặng trọn một ngày.
   - Kết quyển: Lạc Tuyết về tông môn, nhìn người chơi như người lạ: “Đừng nhìn ta. Đi luyện kiếm đi.” Với Tiêu Dao là câu: “Huynh nghe nói tông môn mới có sư muội giỏi lắm. Là muội đúng không?” Cả hai câu đều đang có sẵn trong game. Thân mật bắt đầu lại từ số không.
7. **Vành Khai Hoang** · ngoài Vết Nứt, Phương Thiên Địa · không có trang cuối
   - Thiên Mạch liền một đoạn thì kết giới nở ra được. Việc khai hoang các tông môn vẫn làm nay có thêm nghĩa: gom Mảnh Vỡ Tinh Cầu, thắng trận Khai Tinh, ghép lại một tinh cầu. Thanh Diệp đi theo trồng một nhánh Cây mẹ lên từng tinh cầu mới, đúng điều nàng luôn muốn: có đất để trồng hạt. Bỏ hoang thì ma khí lấy lại.
   - Ma Tổ vẫn ra quả mỗi tuần, mỗi quả là một Ma Vương trấn Phương Thiên Địa. Cửu Đầu Thôn Thiên Mãng vẫn thức mỗi tối. Và ở rất xa, Đại Ma Thần, ký chủ đầu tiên, vẫn giữ những người hắn không nỡ buông.
   - Lời hứa của truyện: một ngày kết giới không cần dệt nữa, ánh sáng của Linh Nhật được về nhà, và tinh hệ có bình minh đầu tiên. Lời hứa này không cần trả sớm. Nó là hướng đi.

**Trong game (phần B) bảy quyển này KHÔNG hiện thành chương.** Chủ dự án 21/11/2026 08:49: "không phải phân theo từng chương, nhưng có thể phân theo nhiệm vụ từ 1
đến N". Bảy quyển chỉ là bản đồ để người viết biết truyện đang ở đâu; người chơi chỉ thấy nhiệm vụ nối nhiệm vụ. Thứ tự các nhịp đi theo cổng thật của game
(`data/realms.json` → `map_open`, tính bằng tổng số tầng): Xích Diễm mở ngay sau phần mở đầu, Hàn Băng ở Luyện Khí tầng 9, Hắc Phong ở Trúc Cơ tầng 4, Thanh Mộc ở Trúc
Cơ tầng 9, Thiên Kim ở Kim Đan tầng 6, Hậu Thổ ở Kim Đan tầng 9, Ngoại Vực Vết Nứt ở Nguyên Anh tầng 3. Vì thế lễ Trúc Cơ rơi vào GIỮA quyển hai (sau Hàn Băng, trước Hắc
Phong) chứ không kết quyển; "Kết hạt" và "Làng còn không" cũng đứng ở cửa tinh cầu mà cảnh giới ấy mở ra. Khai Hoang trong game mở từ Trúc Cơ (tông chủ), truyện chỉ
cho nó thêm nghĩa ở quyển bảy. Năm người mang linh căn thuần gọi là năm "chìa khoá sống" (Tiểu Hỏa là chìa Hỏa nên bị bắt đầu tiên); "người giữ rễ" chỉ còn dùng cho
người canh rễ như Thực Mộc Ma Hậu thuở trước.

### Hệ Thống là một nhân vật

| Chặng | Hệ Thống làm gì | Điều nó giấu |
|---|---|---|
| Quyển 1 | Kiêu, trêu, bắt làm nhiệm vụ lấy điểm | Nó sợ lặp lại ký chủ đầu tiên nên không cho không |
| Quyển 3 | Nhận mình là một cái mầm của Cây | Nó chọn người có mùi nắng vì họ không nợ Cây thứ gì |
| Quyển 4 và 5 | Hỏi “Ký chủ chắc chưa?” trước mỗi cấm kỵ | Nó đã ghi quá nhiều tên ký chủ vào sổ |
| Quyển 6 | Đề nghị đưa ký chủ về nhà, rồi im lặng một ngày | Lần đầu nó đặt ký chủ lên trên nhiệm vụ |
| Quyển 7 | “Vẫn còn nhiệm vụ ngày, mai gặp lại.” | Câu nó chưa từng dám nói với ký chủ nào trước đó |

## Phần 5. Nhịp truyện, khoảnh khắc và cảnh quay

Truyện đi chậm, mất thật, và để người chơi tự hiểu. Ba điều ấy lấy từ Tiên Nghịch; cảnh và lời bên dưới đều viết mới cho Trấn Ma Kỷ.

### Sáu luật nhịp

1. **Ba chậm một nhanh.** Ba nhịp đời thường (hái linh thảo, rèn kiếm, ăn khoai nướng) rồi mới tới một nhịp mất mát, và nhịp ấy rất ngắn.
2. **Lặng trước, sấm sau.** Trước mỗi cảnh lớn có một giây không nhạc, không hiệu ứng, như ba quãng lặng bạn đã đặt trong lễ kết đan.
3. **Thắng không trọn.** Mỗi boss truyện ngã xuống thì người chơi biết thêm nó từng là ai.
4. **Thời gian là nhân vật.** Mỗi lần bế quan trở lại, thế giới đã trôi một chút: một lá thư, một bồ đoàn phủ bụi, một người già thêm.
5. **Vật nhỏ giữ chuyện lớn.** Bát canh cá, củ khoai nướng, thanh kiếm không khắc tên. Mỗi vật phải quay lại ít nhất hai lần.
6. **Nói ít hơn một câu.** Nhân vật không tự kể mình buồn. Hệ Thống thôi kêu “Đinh” là đủ.

### Câu hỏi xuyên suốt: “Ngươi đứng đây vì ai?”

Vân Hạc hỏi câu này ở cổng tông môn, và truyện hỏi lại ở cuối mỗi quyển.

| Quyển | Người chơi đứng vì ai | Cảm xúc chủ |
|---|---|---|
| 1 | Vì mình, vì sợ chết | Sợ và khao khát |
| 2 | Vì một người bạn tóc đỏ | Thuộc về |
| 3 | Vì cái cây đã chọn mình | Biết ơn |
| 4 | Vì những cái tên trên kiếm | Kính trọng |
| 5 | Vì người mình chưa cứu được | Bất lực |
| 6 | Vì những người sẽ không nhớ mình | Buông |
| 7 | Vì người đứng sau lưng, dù không biết tên | Yên |

### Mười một khoảnh khắc

1. **Cái tên không phải của mình** (quyển 1, Thanh Khê). Trưởng thôn gọi người chơi bằng tên đứa trẻ cũ và chỉnh lại cổ áo, như đã làm cả trăm lần. Máy quay đứng xa: hai bóng người nhỏ dưới trăng. Biểu tượng Hệ rung lên định nói rồi thôi.
2. **Bàn tay xé trời** (quyển 1, Thiên Kiếm Phong). Trời nứt, một bàn tay đen vươn xuống và chỉ nói hai chữ: “Ở lại.” Viên Lục Ngọc nàng vừa trao còn ấm trong tay người chơi.
3. **Mũi kiếm chỉ ra ngoài** (quyển 2, Băng Quật). Hàn Hồn Ma Tướng gục. Băng tan, lộ ra đồng phục Kiếm tông. Thanh kiếm của ông vẫn chỉ về phía ma khí. Lão Ngư, chỉ là một dân chài, đọc khẽ Quy Căn Quyết: hoá ra ai ở tinh hệ này cũng thuộc.
4. **Bát canh cá** (quyển 2, Hắc Phong Động). Mặc Ảnh ngồi canh cửa ngục, trước mặt là một cái bát rỗng đã rửa sạch. Hắn không biết vì sao mình giữ nó.
5. **Mùi nắng** (quyển 3, gốc Cây mẹ). Thanh Diệp nghiêng đầu nghe cây rồi nói câu ấy. Linh Nhi hỏi: “Nắng là gì ạ?” Người chơi là người duy nhất trả lời được, và không tìm ra chữ.
6. **Thanh kiếm không tên** (quyển 4, Kiếm Trủng). Vạn Kiếm Ma Tướng ngã, vạn kiếm ông đánh thức tự bay về chỗ cũ. Còn một thanh không khắc gì lại bay về tay Kiếm Lão. Ông cầm lên, nhìn rất lâu mà không nhận ra, rồi cắm nó xuống như mọi thanh khác.
7. **Một lọn tóc** (quyển 5, Địa Cung). Vân Hạc đặt tay lên ngực một đệ tử vừa gục. Một sợi sáng nối hai người, một lọn tóc ông bạc đi ngay trong khung hình. Ông đứng dậy, phủi áo: “Kiếm nhanh không bằng tâm vững.”
8. **Làng còn không** (quyển 5, lúc kết anh). Đứa trẻ hỏi. Người chơi đáp: “Còn một mảnh. Vẫn có người thắp đèn.” Đứa trẻ gật đầu, tan thành những đốm sáng bay về phía Thanh Mộc Tinh.
9. **Người lạ** (quyển 6, Hư Không Lao). Cửa ngục mở. Nàng nhìn người chơi, tay đặt lên chuôi kiếm: “Ngươi là đệ tử tông nào?” Nhạc đang dâng thì dừng giữa câu.
10. **Hệ Thống im lặng** (quyển 6, Lòng Vết Nứt). Hàng nghìn sợi sáng từ khắp tinh hệ bay về vết cắt trên trời, và vết cắt khép lại. Biểu tượng Hệ không rung, không kêu trọn một ngày. Hôm sau: “Đinh. ...Bổn hệ thống ngủ quên.”
11. **Người quét lá** (quyển 7, Kiếm Trủng). Một đứa trẻ mới nhập môn quét lá ở mộ kiếm và đọc to từng cái tên. Tới hàng kiếm mới, nó đọc tên những ký chủ đã góp rễ vá Thiên Mạch: tên thật của người chơi. Máy quay kéo lên, hàng kiếm dài hơn năm ngoái và vùng sáng cũng rộng hơn.

### Ba mô-típ

- **Tên.** Được gọi tên là còn tồn tại. Nhật ký tu tiên, Hòm thư, tên khắc trên kiếm cùng làm một việc: chống lại sự xoá.
- **Ánh sáng do người thắp.** Không có mặt trời, nên mỗi ngọn đèn, mỗi đạo kiếm quang, mỗi tia lôi kiếp đều do ai đó trả giá mà có.
- **Hai chữ “Ở lại”.** Người chữa thương nói với kẻ sắp chết. Ma nói với hồn muốn về cội. Ký chủ nói về chính mình ở quyển 6. Cùng hai chữ, ba nghĩa.

### Ý nghĩa tồn tại

Tồn tại, trong thế giới này, là có nơi để về và có người đợi mình về. Ma là thứ tồn tại mà không còn đường về. Người trấn ma chấp nhận có thể không được nhớ tên, để người khác còn đường về.

### Cảnh quay cho game pixel 2D

- Khung rộng, nhân vật nhỏ, đêm lớn: nỗi cô độc nằm ở tỉ lệ, không cần lời.
- Mỗi cảnh một nguồn sáng chính, mắt người xem đi theo nó. Điều này đúng luật ánh sáng game đang dùng.
- Giữ khung thêm một giây sau khi chuyện đã xong.
- Tiếng trước hình: nghe tiếng chuông, tiếng kiếm rút, rồi mới thấy.
- Cắt cảnh buồn bằng một việc đời thường: Tiểu Linh quét sân, Hồ Linh chải lông, cô bán nước rao hàng.

## Thứ đang có trong game và vai của nó trong truyện

| Đang có trong game | Vai trong truyện |
|---|---|
| Mọi tinh cầu luôn là đêm trăng | Luật Đêm: ánh sáng đã dồn ra dệt kết giới |
| Khai Hoang bỏ hoang 30 ngày thì ma khí chiếm lại | Luật Trấn |
| Điểm hệ thống, đủ 100 điểm mới triệu hồi quà | Hệ Thống không cho không nữa sau ký chủ đầu tiên |
| Linh căn Phàm chiếm một nửa số người | Dự Chi Lai Sinh: người đã tiêu trước phần mình |
| Độ kiếp đánh cả người đứng gần | Tuyệt học Dẫn Kiếp |
| Tâm Ma, cái bóng của chính mình | Chủ cũ của thân xác, hiện ra lúc kết anh ở quyển 5 |
| Bế quan khi vắng mặt, Thư đạo lữ | Luật nhịp số 4: thời gian trôi khi mình tu |
| Thân mật và đạo lữ | Dựng lại ký ức người ấy đã cắt đi ở quyển 6 |
| Nhật ký tu tiên, Hòm thư | Luật Tên |
| Pháp Trận Truyền Tống | Đi nhờ dòng nhựa trong Thiên Mạch |
| Ma Vương mỗi tuần | Quả của Ma Tổ |
| Phá Thiên Tuyệt Trảm, chiêu cũ đang ẩn | Quyển cấm kỵ số 1 |
| Thanh Diệp nói “ngươi có mùi nắng”, Thạch Sinh nói “Ngươi ấm. Như đá phơi nắng.” | Gốc của cả ý ký chủ là hồn ngoại lai |

Nếu muốn cấm kỵ thành chiêu chơi được, chỗ hợp nhất là một nhóm chiêu khảm thứ năm tên Cấm Kỵ cho pháp bảo. Mười chín chiêu khảm hiện có đều ghi “được gì, mất gì”, nên chỉ cần phần “mất” đổi thành một trong năm cái giá.

Lời hứa bình minh ở quyển 7 chỉ nằm trong truyện. Nó không đổi quy định hình ảnh “không có ánh mặt trời” bạn đã chốt.

# Phần B. Đã dựng vào game (21/11/2026, bản thứ hai: truyện là chuỗi nhiệm vụ chính)

## Vì sao có bản thứ hai

Bản thứ nhất (đêm 21/11, 03:47 → 08:46) dựng truyện thành **một cuốn sổ** trong Hệ Thống → Tàng Thư: bảy quyển, 32 trang, thẻ mở / khép quyển, trang tự kể, khẩu
quyết hiện trong bong bóng trên đầu nhân vật. Chủ dự án xem clip và bác (08:46–08:51):

- "giống như lắp thêm 1 cái ghế và gương bằng mô hình logo lên chiếc xe ô tô vậy, chả khớp và liên quan gì cả? B có thực sự đang viết truyện k? Hay là đang phân tích
  sau đó bê cả mảng vào? Sao lại dùng những quy tắc ngốc nghếch lối mòn nào đó để làm game vậy?"
- "B có từng nghĩ người chơi sẽ cảm thấy thế nào khi đọc đc mấy cái khẩu quyết một cách lô thiển như vậy, lại còn lâm, khởi. Có thể tạo hiệu ứng thành hàng chữ to
  bên trái màn hình mà, chat thế có ng đọc đc k. Và mục tàng thư, cậu nghĩ là nên để toàn bộ viết vào đó k?"
- "Tôi chưa ưng, tôi muốn sự kết hợp hài hoà, k phải phân theo từng chương, nhưng có thể phân theo nhiệm vụ từ 1 đến N."
- "Và nó phải thật sự hài hoà, từ từ hoà vào game, nhẹ nhàng, từ từ tiếp cận và truyền đạt một cách rõ ràng, có thể tự thiết kế bảng mới, hiệu ứng mới."

Bài học ghi lại cho lần sau: **truyện không phải thứ để đọc trong một bảng. Truyện là việc người chơi làm.** Cuốn sổ, bảy quyển, thẻ quyển đã gỡ hết khỏi game
(các tệp `he-thong-ky.js`, `the-quyen.js`, `khau-quyet.js` đã xoá). Phần A (bản thiết lập) giữ nguyên: nó là xương sống để viết nhiệm vụ.

## Năm điều bản này theo

1. **Truyện là nhiệm vụ 1 → N.** Mỗi nhiệm vụ là MỘT việc làm trong thế giới (gặp một người, gióng một quả chuông, nhặt ba viên đá, hạ một con trùm) và chỉ mang MỘT ý
   của truyện. Không chia chương, không có màn mở / khép.
2. **Không ai đứng giảng.** Cảnh sau mỗi việc nhiều nhất ba, bốn câu ngắn. Điều quan trọng để người chơi tự ghép: mười một tấm thẻ gỗ không ai lấy lại, con dao có
   dấu búa của chính người thợ rèn, một ông già không chịu rời cái nhà đã cháy.
3. **Việc tay.** Chỗ nào được thì người chơi tự tay làm: tới nơi rồi nút hành động đổi thành "Gióng chuông", "Đặt thẻ", "Lấy lại thẻ". Bấm là có tiếng, có hình ngay.
4. **Trấn Ma Kỷ hiện ra đúng lúc việc xảy ra.** Cuốn sổ của Hệ Thống không nằm trong bảng nào. Khi một việc đáng chép xảy ra, một hàng chữ lớn hiện bên trái màn
   chơi, trên có nhãn nhỏ "Trấn Ma Kỷ chép", và biểu tượng Hệ Thống bay tới đậu cạnh dòng ấy như người cầm bút. Khẩu quyết pháp bảo dùng chung kiểu chữ này.
5. **Truyện chờ người chơi.** Việc vừa xong thì thẻ nhiệm vụ đánh dấu ✓, rồi truyện đợi tới khi màn chơi lặng (không bảng nào mở, không thẻ mừng, không đang tải,
   không tắt màn treo máy) mới diễn cảnh kế. Hạ trùm xong người chơi cứ xem đồ rơi cho đã; đóng bảng rồi Hệ Thống mới lên tiếng.

## Người chơi gặp truyện ở những chỗ nào

| Chỗ | Người chơi thấy gì | Tệp |
|---|---|---|
| **Thẻ nhiệm vụ chính** (góc trái, dưới khung nhân vật) | "Nhiệm vụ 17 · Hỏi đường" và việc phải làm, số đếm 1/3. Sang nhiệm vụ mới thẻ trượt vào, con số LĂN từ 16 lên 17. Việc xong: viền vàng, dấu ✓. Chạm thẻ: Tự hành đi làm việc ấy | `src/ui/nv-hud.js`, `.css` |
| **Nút việc tay** | Đứng đúng chỗ thì nút hành động (chỗ nút Đả tọa / Nói chuyện) đổi thành tên việc. Tự hành tới nơi thì đứng lại 0,9 giây cho người xem thấy nút rồi tự bấm | `src/game/story.js` (`until.nut`, `viec()`), `src/game/interact.js`, `src/game/pilot.js` |
| **Cảnh sau mỗi việc** | Vài câu thoại, xen giữa là tối màn, rung, tiếng chuông, tiếng búa, đốm sáng, nhịp lặng | lệnh `canh` trong `data/story.json`, `src/game/dan-canh.js` |
| **Hàng chữ lớn bên trái** | (a) Dòng Trấn Ma Kỷ chép: "Chuông ngân một tiếng, / người đi xa biết lối về.", "A Lực, thợ săn Xích Diễm. / Đã về." (b) Khẩu quyết lúc tung pháp bảo: một câu, chữ lệnh lớn, chữ Hán mờ phía sau | `src/ui/chu-lon.js`, `.css`, `src/ui/he-thong-dao.js` (Hệ Thống bay tới cầm bút) |
| **Câu hỏi** | Vân Hạc hỏi "Ngươi đứng đây vì ai?", ba cách đáp (hoặc im lặng), ông đáp lại một câu. Lựa chọn ghi thành cờ `vi-ai-*` để truyện về sau nhắc lại; không đổi luật chơi | lệnh `hoi` |
| **Dấu truyện** | Việc đã làm để lại dấu trên bản đồ của riêng người chơi: tấm thẻ tên nằm trên bàn lễ lúc đang ở trong quật, ngọn nến trước tên A Lực sáng mãi về sau | `data/story.json` → `dau`, `src/game/dau-truyen.js` |
| **Bảng Hệ Thống → Nhiệm vụ** | Trên cùng là thẻ "Nhiệm vụ chính 17" có nút Dẫn đường và nút Hành trình (danh sách các nhiệm vụ đã qua) | `src/ui/he-thong-nv.js` |
| **Hệ Thống nhắc** | Người chơi cũ vào game lần đầu thấy thẻ: "Đinh! Trấn Ma Kỷ còn trang trống, ký chủ… Chạm thẻ nhiệm vụ ở góc trái, bổn hệ thống dẫn đường." | `data/he-thong.json` → `nudge.nv_moi`, `src/game/he-thong.js` |
| **Nhật ký tu tiên** | Ba dòng tự chép: gióng chuông, A Lực đã về, con dao về tay Lão Than | `data/journal.json` → `flags` |
| **Hỏi đáp** | Câu "Thẻ Nhiệm vụ ở góc trái màn hình là gì?" (nhóm Bắt đầu, điều khiển) | `data/faq.json` |
| Nghi lễ đột phá, mừng mạnh lên | Giữ từ bản thứ nhất (xem cuối phần này) | `src/game/len-tang.js`, `src/ui/mung-them.js` |

## 27 nhiệm vụ đang có

Nhiệm vụ 1 → 14 là phần mở đầu sẵn có (chặng leo bậc và năm việc của người dẫn đường), nay có số và tên trên thẻ; lời thoại đã viết lại theo bản thiết lập từ
bản thứ nhất, nhịp và phần thưởng không đổi. Nhiệm vụ 15 → 27 là phần viết mới, **không phát thưởng** (thưởng do máy chủ quản, chờ chủ dự án).

| Số | Tên | Việc | Điều xảy ra khi xong |
|---|---|---|---|
| 1–2 | Con Mộc linh đầu tiên · Ma khí | Hạ Mộc linh, hạ ba con nhiễm ma khí | (chặng leo bậc sẵn có) |
| 3–6 | Lễ thức tỉnh · Người dẫn đường · Ba nhánh linh thảo · Ma tộc tới làng | Đá linh căn, gặp người dẫn đường, hái linh thảo, đánh lui ma tộc | Tiểu Hỏa bị bắt, chỉ còn một chiếc giày nhỏ |
| 7–9 | Giữ làng · Con đầu đàn · Thử binh khí | Ba bậc đánh | Lên Thiên Kiếm Phong, nhận binh khí |
| 10–14 | Hơi thở đầu tiên · Bí cảnh Huyết Nha · Hai phòng quái · Huyết Nha · Trở về | Đả tọa, vào bí cảnh, hạ cái bóng của Huyết Nha, về gặp người dẫn đường | Bàn tay Đại Ma Thần bắt người ấy đi: "Ở lại." |
| 15 | Ở lại | Gặp trưởng lão Vân Hạc | "Bàn tay ấy không giết ai. Nó giữ." Tông môn có lệ gióng chuông cho người bị giữ |
| 16 | Tiếng chuông | Gióng chuông ở góc sân (việc tay) | Chuông ngân, ba vòng sóng lan ra. **Trấn Ma Kỷ chép:** "Chuông ngân một tiếng, người đi xa biết lối về." |
| 17 | Hỏi đường | Hỏi Vân Hạc phải tìm ở đâu | Ông hỏi lại: "Ngươi đứng đây vì ai?" rồi chỉ tới Hỏa Quật |
| 18 | Dấu vết | Qua pháp trận, bay tới Xích Diễm Tinh | "Đất ở đây nóng dưới chân." |
| 19 | Người thợ rèn | Tìm Lão Thiết | "Thợ săn làng ta vào Hỏa Quật mười một người, chưa ai về." Lệ làng: lưỡi phải qua lửa làng |
| 20 | Hỏa tinh thạch | Nhặt ba viên bên bờ dung nham | |
| 21 | Qua lửa | Mang về cho Lão Thiết | Ba tiếng búa. Lệ thứ hai: tấm thẻ gỗ khắc tên, vào quật thì đặt lên bàn lễ, ra thì lấy lại |
| 22 | Thẻ tên | Đặt thẻ tên lên bàn lễ (việc tay) | Trên bàn có mười một tấm thẻ chưa ai tới lấy lại. Hệ Thống: "…Tấm của ký chủ, lát nhớ ra mà lấy." |
| 23 | Món nợ Huyết Nha | Vào Hỏa Quật, hạ Huyết Nha | (chờ người chơi xem xong đồ rơi) Hệ Thống: "…Lúc nó gục, có vật này rơi ra." Một con dao săn khắc tên A Lực |
| 24 | Vật rơi lại | Ra bàn lễ, lấy lại thẻ tên (việc tay) | Cây nến trước tấm khắc tên A Lực tự sáng. **Trấn Ma Kỷ chép:** "A Lực, thợ săn Xích Diễm. Đã về." |
| 25 | Dấu búa | Đưa con dao cho Lão Thiết xem | "Dấu búa này của lão." "Ma tộc không giết thợ săn làng ta. Chúng giữ lại, rồi dùng." Chuôi dao có hai chữ: Hắc Phong |
| 26 | Người ở lại | Mang con dao tới cho Lão Than | "Nhà cháy rồi ta vẫn không đi. Sợ nó về, không thấy ai." "Giờ nó về rồi. …Đêm nay ta ngủ được." |
| 27 | Đường tới Hắc Phong | Tu luyện tới Luyện Khí tầng 9 | "Đủ sức chịu lạnh rồi. …Hàn Băng Tinh chờ ký chủ đấy. Bổn hệ thống đang chép tiếp, đừng đi đâu xa." |

Đoạn 15 → 27 khớp bản thiết lập thế nào: luật nhịp 3 "thắng không trọn" (Huyết Nha từng là một thợ săn bị giữ), luật 5 "vật nhỏ giữ chuyện lớn" (con dao đi qua bốn
tay: Hệ Thống, bàn lễ, Lão Thiết, Lão Than; tấm thẻ đặt xuống rồi lấy lại), luật 6 "nói ít hơn một câu" (Lão Than). Mô-típ Tên (thẻ tên, dòng chép), ánh sáng do
người thắp (ngọn nến), hai chữ "Ở lại" (tên nhiệm vụ 15 là lời của bàn tay, nhiệm vụ 26 là người cha ở lại chờ). Câu thoại sẵn có của Lão Than "đất ở đây ấm, ta
không đi đâu cả" nay có nghĩa. Ý nghĩa tồn tại "có nơi để về và có người đợi mình về" nằm ngay trong tiếng chuông đầu tiên.

**Lệch so với phần A, theo cổng thật của game:** Hàn Băng Tinh mở ở Luyện Khí tầng 9 và Hắc Phong Tinh mở ở Trúc Cơ tầng 4 (`data/realms.json` → `map_open`), nên đoạn
này kết ở "tu tới tầng 9 để chịu được cái lạnh Hàn Băng", chưa phải lễ Trúc Cơ. Chặng kế (Hàn Băng: Lão Ngư, Hàn Hồn Ma Tướng đứng gác) nối vào đây.

## Hai bản lời: người đã thấy cảnh mở đầu và người chơi cũ

Người chơi từ trước 02/11/2026 được chuyển thẳng tới cuối phần mở đầu (`pickStory`): họ chưa thấy làng cháy, chưa thấy bàn tay, **Lạc Tuyết / Tiêu Dao của họ vẫn đứng
ở tông môn** (hai người này còn gắn với thân mật, đạo lữ, động phủ nên truyện không tự ý bắt đi). Với họ:

- Tên nhiệm vụ 15 là "Trưởng lão gọi" (`ten_neu`), Vân Hạc mở lời bằng "Ngươi tới đúng lúc. Ma tộc không giết người chúng bắt. Chúng giữ…", và tiếng chuông gửi
  "những người chưa về". Người đã thấy cảnh mở đầu thì nghe "Bàn tay ấy không giết ai", chuông gửi đúng tên người bị bắt và "cả thằng bé tóc đỏ".
- Danh sách Hành trình bắt đầu từ nhiệm vụ 15 (họ không làm 1 → 14).
- Cờ phân biệt: `data/story.json` → `mo_dau_co` (cờ "người ấy đã bị bắt"). Câu hai bản viết bằng `neu: "cờ"` / `neu: "!cờ"`; bài thử bắt buộc có đủ cả hai bản.
- Người chơi đã ở cảnh giới cao: nhiệm vụ 27 xong ngay, mọi lời thoại viết sao cho không lệch với người mạnh (Lão Thiết nói "lệ làng", không nói "ngươi còn yếu").

## Truyện chờ người chơi (luật màn lặng)

`src/game/story.js` → `update()`, chỉ áp cho nhiệm vụ từ 15 trở đi (phần mở đầu giữ nhịp cũ):

- Việc xong thì chốt lại (bước ra khỏi chỗ vừa tới không làm "chưa xong" lại; ghi cờ tạm `xong-<mã bước>` nên thoát game lúc bảng kết quả bí cảnh còn mở thì vào lại không phải hạ trùm lần nữa), thẻ nhiệm vụ hiện ✓.
- Rồi chờ `game.manLang()` (`src/ui/nv-hud.js`): không hội thoại, không đang bay / tải bản đồ (`game.cheMan`, `src/render/world-veil.js`), không tắt màn treo máy
  (`game.manToi`), không bảng nào mở (`.panel`, túi, bảng Hệ Thống), không nghi lễ nhận thưởng, không thẻ mừng, không thẻ Hẹn ngày mai.
- Màn lặng đủ một nhịp mới diễn cảnh kế: 0,75 giây với việc xong bị động (nhặt đủ, hạ trùm), 1,6 giây khi vừa tới bản đồ mới, 0 giây khi người chơi tự bấm (nói
  chuyện, việc tay: bấm là đáp ngay).
- Tự hành mà bảng cứ mở mãi (bảng kết quả bí cảnh không ai đóng): sau 14 giây tự dọn bảng đi tiếp. Tắt màn treo máy thì không dọn, không diễn: Tự hành coi như truyện
  đang chờ tu luyện (đánh quái, đả tọa), bật màn lại mới đi việc nhiệm vụ (`pilot.js` → `waiting`).
- Trong lúc diễn cảnh Hệ Thống không lẩm bẩm, không nhắc việc; Tự hành đứng yên xem.
- Thẻ "Hẹn ngày mai" (việc 5b) không chen vào giữa chuỗi: nó chờ tới chỗ truyện nghỉ (nhiệm vụ "Tu luyện tới…"), đúng lúc lời hứa bế quan một đêm có nghĩa nhất;
  dở nhiệm vụ quá 20 phút chơi thì thôi không chờ (`src/game/hen-mai.js`, `game.story.nghi`).
- Cổng bí cảnh: nhiệm vụ đang cần hạ trùm ở chính bí cảnh ấy thì người chơi giẫm cổng là vào thẳng bậc 1 như Tự hành vẫn vào (không hỏi vượt bậc / càn quét, không bị
  chặn khi hết lượt ngày). Thưởng lượt vẫn theo luật cũ: còn lượt mới có (`src/game/interact.js`).

## Khẩu quyết (viết lại)

Tám pháp bảo, mỗi món một câu hình ảnh và một chữ lệnh, hiện thành hàng chữ lớn bên trái lúc thi triển (hai lần cách nhau ít nhất 2,5 giây):

| Pháp bảo | Câu | Chữ lệnh |
|---|---|---|
| Phi Kiếm | Tâm tới, kiếm tới. | Trảm 斬 |
| Linh Châu | Một hạt sáng, vạn dặm đêm. | Chiếu 照 |
| Bảo Phiến | Mượn trời một làn gió. | Khai 開 |
| Đại Ấn | Trời cao làm chứng. | Giáng 降 |
| Hộ Thuẫn | Sau lưng ta còn người. | Hộ 護 |
| Đồng Chung | Một tiếng chuông, / vạn ma lùi. | Tán 散 |
| Trận Kỳ | Cờ cắm chỗ nào, / đất về chỗ ấy. | Trấn 鎮 |
| Hồ Lô | Nuốt đêm vào bụng, / nhả ra thành sóng. | Thôn 吞 |

Hai chữ chủ dự án chê ("lại còn lâm, khởi") đã đổi thành Giáng, Chiếu. Muốn bỏ hẳn chữ lệnh, chỉ giữ câu và chữ Hán mờ: `data/tran-ma-ky.json` → `chu.lenh_on: false`.
Mười hai chữ lệnh, trường quyết, hợp quyết ở phần A chưa dùng trong game.

## Viết một nhiệm vụ mới

Thêm một bước vào cuối `data/story.json` → `steps` (trước bước `con-tiep`), số thứ tự tự nối. Mỗi bước: `id`, `once: true`, `ten`, `do` (cảnh diễn ra NGAY SAU KHI
nhiệm vụ trước xong), `goal` (việc của nhiệm vụ này), `target_map` (+ `target`), `until`. Lệnh trong `do`: `say`, `canh` (`toi`, `rung`, `chop`, `tieng`, `fx`: dom / tia /
khoi / la / vong / chuong, `mau`, `tai`, `cho`), `chu` (`cau` mỗi dòng ≤ 27 chữ, `ky: true` cho dòng chép sổ, `giu`, `cho`), `hoi`, `flag` / `unflag`, `pickups`
(`at` hoặc `near`), và `neu` trên bất kỳ lệnh nào. `until`: `talk`, `reach` (+ `r`, `nut`), `collect`, `kill` (+ `in`), `map`, `layer` / `realm` / `total`.
Ô rải vật nhặt và ô đích phải đi được trên bản đồ THẬT (nhà, lò có vùng chắn mà lưới ô không thấy): xem bằng `node tools/do-don/o-chan.mjs <bản đồ> x0 y0 x1 y1`.
Viết xong: `node tools/truyen.test.mjs`, rồi chạy cả chuỗi bằng Tự hành: `node tools/do-don/thu-nv.mjs <thư mục ra>`.

Luật giữ khi viết: không phát thưởng trong `do`; không dùng `map` (nó kéo người chơi sang bản đồ khác); câu nào dựa vào cảnh mở đầu thì có bản cho người chơi cũ;
cảnh sau một trận trùm phải đúng dù người chơi đang ở trong hay đã ra ngoài bí cảnh (họ có thể bấm Thoát ở bảng kết quả); mỗi cảnh nhiều nhất bốn câu.

## Nhịp đo được (21/11/2026, người mới thật, Tự hành, không sửa máu, không tua)

| Mốc | Giây thứ | Ghi chú |
|---|---|---|
| Xong phần mở đầu, thẻ "Nhiệm vụ 15" hiện | 208 | Luyện Khí tầng 6, lực chiến 9,8 nghìn |
| Gióng chuông | 247 → 264 | |
| Tới Xích Diễm Tinh | 349 | |
| Đặt thẻ tên, vào Hỏa Quật | 474 | |
| Hạ Huyết Nha, ra ngoài | 601 | hai phút cho ba phòng, không gục lần nào |
| Lão Than | 678 | |

Tức đoạn viết mới thêm chừng tám phút chơi ngay sau phần mở đầu, rồi để lại một đích dài hơi (tầng 9). Bài chơi thử của CI (tua nhanh tu luyện) qua 11 bước trong 220
giây, bài hai máy 27/27.

## Giữ lại từ bản thứ nhất

- Lời phần mở đầu viết lại theo bản thiết lập ("ghép xong vào thân xác mới", "Rễ đã nối với Cây", chiếc giày nhỏ của Tiểu Hỏa, hai chữ "Ở lại", Hệ Thống chép tên ký
  chủ vào sổ Trấn Ma Kỷ). Số câu ở ba bước đầu giữ nguyên (20/62 người mới từng bỏ ở ba bước đầu).
- Nghi lễ đột phá: dưới tên cảnh giới có một dòng nói cảnh giới ấy nghĩa là gì (`data/tran-ma-ky.json` → `canh_gioi`, `src/game/len-tang.js`).
- Mừng mạnh lên, phần còn lại của việc 4b (`src/ui/mung-them.js`, số chữ ở `data/juice.json` → `mung.them`):

| Việc | Màn mừng |
|---|---|
| Linh thú tiến hoá | Trong bảng, cỡ lớn nhất, vầng sáng màu con thú: "Tiểu Mộc Linh → Thanh Mộc Tinh Quân", sát thương trước → sau, cấp tối đa 20 → 40 |
| Linh thú ghép sao | Trong bảng, số ★N đập vào góc, sát thương trước → sau; sao càng cao diễn càng lớn |
| Động phủ lên cấp | Trong bảng, hình động phủ giữa vầng sáng vàng: tên cấp mới, đả tọa ×2 → ×2,4, linh thảo chín 15 → 13 phút… |
| Khảm ngọc | Trong bảng, viên ngọc giữa vầng sáng màu ngọc, chỉ số của ngọc, "Lực chiến ▲ +N" |
| Ghép ngọc | Trong bảng, viên ngọc cấp mới, "×N" khi ghép nhiều lần một lượt |
| Công pháp lên tầng | Thẻ trên đầu nhân vật (đang đánh vẫn đánh): tên công pháp, thang ô theo số tầng, từng chỉ số trước → sau |
| Linh thú lên cấp | Lần nào cũng có vòng sáng dưới chân con thú; mốc 5 cấp có thẻ trên đầu nhân vật, chạm cấp tối đa thì nhắc "tiến hóa được rồi" |

## Tệp

- Dữ liệu: `data/story.json` (các bước, `mo_dau`, `mo_dau_co`, `nv_text`, `dau`; lời chú đầu tệp tả mọi lệnh), `data/tran-ma-ky.json` (chữ lớn, câu nghĩa cảnh giới,
  khẩu quyết), `data/he-thong.json` (`nudge.nv_moi`, chữ thẻ Nhiệm vụ chính), `data/journal.json`, `data/sounds.json` (tiếng `chuong`).
- Luật: `src/game/story.js` (đánh số nhiệm vụ, `neu`, `hoi`, `nut`, chờ màn lặng, `list()`), `src/game/dan-canh.js`, `src/game/dau-truyen.js`,
  `src/game/tran-ma-ky.js` (câu nghĩa cảnh giới, khẩu quyết), `src/game/interact.js`, `src/game/pilot.js`, `src/game/hen-mai.js`, `src/game/he-thong.js`.
- Giao diện: `src/ui/nv-hud.js` + `.css` (thẻ; cỡ trong bố cục hai bảng ở `src/ui/hud-khung.css`), `src/ui/chu-lon.js` + `.css`, `src/ui/he-thong-nv.js`,
  `src/ui/he-thong-dao.js`, `src/render/draw-lights.js` (quầng sáng ngọn nến), `src/render/world-veil.js` (`game.cheMan`).
- Bài thử và công cụ: `tools/truyen.test.mjs` (`tools/check.mjs` gọi kèm), `tools/do-don/thu-nv.mjs` (chạy cả chuỗi bằng Tự hành; `CU=1` người chơi cũ, `KQ=thoat`
  bấm Thoát ở bảng kết quả, `THAT=1` người mới thật không sửa máu), `tools/do-don/quay-nv.mjs` (quay clip), `tools/do-don/o-chan.mjs` (ô chắn thật của bản đồ).
- Bản dịch: mọi câu mới đã có trong `data/i18n/en.json`, `zh-Hant.json`; thuật ngữ ở `data/i18n/glossary.md` mục "Trấn Ma Kỷ".

## Còn chờ chủ dự án

1. **Xem clip và chốt hướng** của bản thứ hai (thẻ nhiệm vụ, việc tay, dòng "Trấn Ma Kỷ chép", khẩu quyết chữ lớn). Chưa đẩy lên GitHub.
2. **Cỡ thẻ nhiệm vụ.** 17/11 chủ dự án bảo thẻ bậc "giảm xuống nhỏ bằng 1/4" (98 × 30). Thẻ nhiệm vụ giờ 204 × 44–56 để đọc được tên và việc. Chờ xem clip chốt.
3. **Thẻ nhiệm vụ đảo một phần quyết định 12/11 11:05** (bỏ khung "Việc đang làm" và nút Dẫn đường của truyện cũ vì trùng nhiệm vụ Hệ Thống; `story_ui: false` vẫn giữ,
   khung `#goal` cũ vẫn tắt). Thẻ mới chỉ hiện nhiệm vụ chính của truyện, không trùng 110 nhiệm vụ Hệ Thống.
4. **Thưởng cho nhiệm vụ chính 15+** (và nhiệm vụ Hệ Thống mới gắn theo truyện): cần bảng trên máy chủ, chưa làm.
5. **Viết tiếp tới N**: Hàn Băng (Lão Ngư, Hàn Hồn Ma Tướng đứng gác), Hắc Phong (Mặc Ảnh và bát canh cá, cứu Tiểu Hỏa), Thanh Mộc, Thiên Kim, Hậu Thổ, Vết Nứt. NPC
   Tiểu Hỏa đang đứng sẵn ở Ngoại Vực Vết Nứt (dấu của truyện cũ): viết tới Hắc Phong thì phải dời.
6. Các việc đụng máy chủ, phần thưởng hoặc tiền từ bản thứ nhất vẫn chờ: thọ nguyên là chỉ số thật và cấm kỵ thành chiêu chơi được; sự kiện cả máy chủ "vá Thiên
   Mạch"; thành tựu "Vá Thiên Mạch" (cờ `het-game`, có thưởng); hình minh hoạ SpriteCook cho cảnh lớn; tên tông môn thứ hai; tên game trên màn đăng nhập và cửa hàng;
   dịch tên tám pháp bảo.
