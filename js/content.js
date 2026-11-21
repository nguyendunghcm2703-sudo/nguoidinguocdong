/* Nội dung sách "Từng Khoảnh Khắc".
   Thêm truyện: thêm một đối tượng vào mảng stories, chọn part là một trong
   dawn / morning / noon / dusk / night. Mỗi phần nên có 4 truyện cho cân đối.
   kind: 'real' = chuyện có thật kể lại từ báo (cần source), 'idea' = truyện sáng tác lấy ý từ một bài báo.
   Truyện không có kind là truyện sáng tác.
   Thêm điều chiêm nghiệm: thêm một đối tượng { title, paras } vào reflections.sections.
   Sách tự thêm một trang cho mỗi mục; câu kết (closing) và các ý chính (spirit) hiện ở trang cuối cùng. */
window.BOOK = {
  "order": [
    "dawn",
    "morning",
    "noon",
    "dusk",
    "night"
  ],
  "parts": {
    "dawn": {
      "name": "Bình minh",
      "time": "5:30",
      "tag": "Bắt đầu",
      "line": "Chưa ai thấy bạn bước đi, và đó là lúc bước đi đẹp nhất."
    },
    "morning": {
      "name": "Buổi sáng",
      "time": "8:00",
      "tag": "Làm",
      "line": "Vụng về cũng được. Việc nào cũng bắt đầu bằng đôi tay chưa quen."
    },
    "noon": {
      "name": "Buổi trưa",
      "time": "12:00",
      "tag": "Kết nối",
      "line": "Đi ngược dòng không có nghĩa là không ai đi cùng, chỉ cần mở lời trước."
    },
    "dusk": {
      "name": "Chiều tà",
      "time": "17:30",
      "tag": "Vững vàng",
      "line": "Cuối ngày là lúc nhìn lại xem mình đã đứng vững thế nào."
    },
    "night": {
      "name": "Đêm",
      "time": "21:00",
      "tag": "Biết ơn",
      "line": "Đêm đến, đặt gánh xuống. Ngày mai là một trang mới."
    }
  },
  "stories": [
    {
      "id": "s01",
      "part": "dawn",
      "title": "Mặt trời không đợi ai",
      "paras": [
        "Anh Quân ba mươi bốn tuổi, nghe bảo ngắm bình minh tốt cho đầu óc nên thử đạp xe lên cầu lúc năm rưỡi sáng. Mấy hôm đầu trời xám xịt, chẳng có gì để ngắm ngoài gió lạnh và những ngọn đèn đường chưa kịp tắt.",
        "Anh vẫn đi. Đến sáng thứ mười hai, mây tản ra, một vệt cam đỏ trồi lên sau dãy nhà, rồi cả dòng sông sáng bừng. Anh dựng xe, đứng im, và thấy lồng ngực mình mở rộng thêm một chút.",
        "Anh chợt hiểu: mặt trời không hỏi hôm qua của ai ra sao, nó vẫn lên đúng giờ. Mỗi buổi sáng là một lời mời bắt đầu lại, và ai cũng được nhận. Anh đạp xuống cầu, nhanh hơn lúc đi lên."
      ],
      "proverb": {
        "text": "Hành trình ngàn dặm bắt đầu từ một bước chân.",
        "by": "Lão Tử, Đạo Đức Kinh"
      },
      "task": "Đứng dậy, vươn vai thật dài và hít sâu ba lần. Rồi nói với mình: hôm nay mình bắt đầu."
    },
    {
      "id": "s02",
      "part": "dawn",
      "title": "Đôi giày để ở cửa",
      "paras": [
        "Anh Phúc muốn chạy bộ từ nhiều năm, và năm nào cũng bắt đầu vào thứ hai tuần sau. Tháng này anh đổi cách: không hứa chạy bao nhiêu cây số, chỉ hứa mang giày vào và bước ra khỏi cửa.",
        "Ngày đầu, anh đi bộ hết một vòng khu phố, thở phì phò. Ngày thứ tư, anh chạy được hai trăm mét đến cột đèn. Ngày thứ mười, anh chạy hết vòng mà không dừng. Chẳng ai vỗ tay, chỉ có tiếng giày nện xuống mặt đường đều đều.",
        "Một buổi sáng, anh quay về, ngồi bậc thềm cởi giày, mồ hôi nhỏ giọt xuống nền gạch. Anh nghĩ: điều khó nhất chưa bao giờ là chạy, mà là đứng dậy mang giày vào. Và việc đó, anh làm được mỗi ngày."
      ],
      "proverb": {
        "text": "Giọt nước nhỏ rơi mãi rồi cũng đầy bình.",
        "by": "Kinh Pháp Cú (ý)"
      },
      "task": "Đặt sẵn đôi giày hoặc quyển sách ngay cạnh cửa, để sáng mai việc đầu tiên đã sẵn sàng."
    },
    {
      "id": "s03",
      "part": "dawn",
      "title": "Con đường không có trên bản đồ",
      "kind": "real",
      "paras": [
        "Hai mươi sáu tuổi, một chàng trai ở Mỹ kể rằng anh chưa từng học đại học. Không có học bổng, học phí lại tăng mỗi năm, nên thay vì đi vay, anh đi làm sớm, trong lúc bạn bè cùng tuổi còn ngồi giảng đường.",
        "Anh thử vài nghề rồi dừng lại ở nghề thợ hàn, vì làm thử thấy mình làm tốt, và anh tin đây là nghề khó bị máy móc thay thế. Nhiều người khuyên anh đi con đường quen thuộc, nhưng anh chọn đi theo điều mình đã thử và thấy hợp.",
        "Giờ anh làm năm ngày mỗi tuần, thu nhập đủ để mua nhà và lo cho gia đình. Câu chuyện không nói rằng ai cũng nên bỏ học. Nó nói rằng con đường hợp với mình đôi khi không nằm trên tấm bản đồ mà ai cũng đang cầm."
      ],
      "proverb": {
        "text": "Trên đời vốn không có đường, người ta đi mãi thì thành đường.",
        "by": "Lỗ Tấn, Cố hương (ý)"
      },
      "task": "Viết ra một con đường bạn muốn thử, dù chưa ai đi trước. Rồi ghi bước nhỏ đầu tiên.",
      "source": {
        "name": "Báo Đại biểu Nhân dân, 25/01/2026",
        "url": "https://daibieunhandan.vn/26-tuoi-bo-dai-hoc-kiem-100-000-usd-moi-nam-nho-nghe-tho-han-10404846.html"
      }
    },
    {
      "id": "s04",
      "part": "dawn",
      "title": "Hai mươi phút đầu ngày",
      "paras": [
        "Anh Huy có thói quen mở điện thoại ngay khi mở mắt, và hai mươi phút sau anh đã thấy mình mệt như vừa chạy xong một chặng đường, dù chưa làm gì. Một hôm anh tự đặt ra luật: hai mươi phút đầu tiên của ngày thuộc về mình, điện thoại để ở phòng khác.",
        "Những ngày đầu anh ngồi không, lúng túng như người thiếu việc làm. Rồi anh thử tưới cây, kéo giãn người, nhìn bầu trời đổi màu ngoài cửa sổ. Lần đầu tiên sau nhiều năm, anh nghe rõ tiếng chim trước hiên.",
        "Một tháng sau, anh đi vào ngày mới bằng đôi chân vững hơn. Không ai bắt anh làm vậy, và cũng không ai kiểm tra. Chính vì thế, mỗi sáng làm được, anh lại tin mình thêm một chút."
      ],
      "proverb": {
        "text": "Hãy tự thắp đuốc lên mà đi.",
        "by": "Lời Phật dạy, Kinh Đại Bát Niết Bàn"
      },
      "task": "Sáng mai, để điện thoại ở phòng khác và dành 20 phút đầu tiên cho chính mình."
    },
    {
      "id": "s05",
      "part": "morning",
      "title": "Đôi tay học lại nghề cũ",
      "kind": "real",
      "paras": [
        "Ở Bắc Ninh, một chàng trai hai mươi tư tuổi tốt nghiệp đại học rồi làm đủ việc: nhân viên khu công nghiệp, bán hàng, quản lý ngành hàng. Việc nào cũng ổn, nhưng không việc nào là của anh. Trong khi đó, nghề nặn phỗng đất của gia đình ngày một thưa người làm.",
        "Ông nội anh, bảy mươi bốn tuổi, là một trong những nghệ nhân cuối cùng còn giữ nghề. Nhìn ông ngày một cao tuổi, anh quyết định nghỉ việc để học lại từ đầu, từ khâu chuẩn bị đất đến tạo hình từng con phỗng. Đôi tay quen gõ phím phải làm quen với đất sét.",
        "Anh còn kể về nghề trên mạng xã hội và mở những buổi trải nghiệm cho người trẻ. Đơn đặt hàng vẫn đến quanh năm, và ông nội vui khi thấy lớp trẻ bắt đầu để ý đến nghề của mình. Có những điều quý nằm ngay trong nhà, chỉ chờ một người chịu quay lại học."
      ],
      "proverb": {
        "text": "Ôn điều cũ mà biết điều mới.",
        "by": "Khổng Tử, Luận Ngữ"
      },
      "task": "Hỏi một người lớn tuổi trong nhà về một việc họ làm giỏi, và nhờ họ chỉ bạn một bước.",
      "source": {
        "name": "Tiền Phong, 13/10/2026",
        "url": "https://tienphong.vn/chang-trai-bac-ninh-nghi-viec-noi-nghe-nan-phong-dat-cung-ong-noi-post1884637.tpo"
      }
    },
    {
      "id": "s06",
      "part": "morning",
      "title": "Ba năm học buổi tối",
      "kind": "real",
      "paras": [
        "Một anh công nhân quê Cà Mau, làm việc ở Đồng Nai, tình cờ thấy trên mạng xã hội nghề làm mô hình nhà miền Tây thu nhỏ. Anh không có thầy, không có xưởng, chỉ có những buổi tối sau giờ tan ca.",
        "Từ năm 2022, anh tự học chế tác vào mỗi buổi tối. Ban ngày anh vẫn đi làm như mọi người, chẳng ai biết sau giờ làm anh đang dựng lên một ngôi nhà khác, từng chi tiết một.",
        "Đến giữa năm 2025, anh nghỉ việc, về quê mở xưởng thủ công ngay tại nhà. Giờ nghề ấy cho anh thu nhập gần nửa tỷ đồng mỗi năm, và quan trọng hơn, cho anh một việc để mỗi sáng thức dậy thấy đáng làm. Ba năm học buổi tối hóa ra là chặng chuẩn bị dài nhất, và đáng nhất."
      ],
      "proverb": {
        "text": "Có công mài sắt, có ngày nên kim.",
        "by": "Tục ngữ Việt Nam"
      },
      "task": "Dành 20 phút tối nay cho một kỹ năng bạn muốn học. Chỉ 20 phút thôi.",
      "source": {
        "name": "Tiền Phong, 06/08/2026",
        "url": "https://tienphong.vn/bo-pho-ve-que-lam-mo-hinh-nha-mien-tay-thu-gan-nua-ti-moi-nam-post1865293.tpo"
      }
    },
    {
      "id": "s07",
      "part": "morning",
      "title": "Bản vẽ bị trả lại",
      "paras": [
        "Anh Sơn nộp bản thiết kế lần thứ nhất thì bị trả lại, lần thứ hai cũng thế. Lần thứ ba, sếp chỉ nhìn một lúc rồi nói: \"Em làm lại phần mặt tiền.\" Anh về chỗ ngồi, mặt nóng bừng, định bỏ hết.",
        "Nhưng tối đó anh ngồi đọc lại từng ghi chú của sếp, và nhận ra những chỗ bị gạch đều có lý. Anh vẽ lại, lần này không còn vẽ để được duyệt, mà vẽ để hiểu vì sao căn nhà cần đón nắng từ hướng đó. Mỗi lần bị trả lại, anh học thêm một điều mà sách chưa dạy.",
        "Bản thứ tư được nhận, và hơn thế nữa, sếp giao anh phụ trách cả công trình sau đó. Anh hiểu rằng tảng đá chắn đường năm nào chính là bậc thang anh đã bước lên."
      ],
      "proverb": {
        "text": "Điều cản đường chính là con đường.",
        "by": "Marcus Aurelius, Suy tưởng (ý)"
      },
      "task": "Nghĩ về một trở ngại hiện tại và viết ra một điều nó đang dạy bạn."
    },
    {
      "id": "s08",
      "part": "morning",
      "title": "Xe cà phê đầu hẻm",
      "paras": [
        "Ngày đầu bán cà phê bằng chiếc xe đẩy cũ, anh Bình chỉ bán được ba ly, trong đó có một ly là của chính anh. Tối về anh ngồi nhìn đống ly nhựa còn nguyên, tự hỏi mình có làm đúng không.",
        "Sáng hôm sau anh vẫn ra, đến sớm hơn nửa tiếng, lau xe sạch bóng. Anh nhớ tên từng khách, nhớ ai uống ít đường, ai thích thêm đá. Tuần thứ ba, có người đứng chờ anh pha xong ly trước mặt họ.",
        "Một năm sau, anh thuê được mặt bằng nhỏ có mái che. Ngày khai trương, anh vẫn dùng chiếc xe đẩy cũ làm quầy pha. Anh bảo nó là người thầy đầu tiên, đã dạy anh rằng mọi thứ lớn đều bắt đầu từ ba ly cà phê."
      ],
      "proverb": {
        "text": "Trời sắp trao trọng trách cho ai, ắt trước hết rèn chí người ấy.",
        "by": "Mạnh Tử (ý)"
      },
      "task": "Viết ra một việc khó bạn đang làm dở, rồi tự nói với mình: mình đang được rèn."
    },
    {
      "id": "s09",
      "part": "noon",
      "title": "Mười lăm phút trong hàng đợi",
      "kind": "real",
      "paras": [
        "Ở Kenya, một người đứng xếp hàng trong tiệm bánh để ý dòng chữ viết tắt trên chiếc áo phông của người đứng trước. Anh tò mò, và quyết định hỏi thẳng: chữ ấy có nghĩa là gì?",
        "Câu hỏi nhỏ ấy mở ra một cuộc trò chuyện kéo dài mười lăm phút, và cả hai đều thấy vui. Họ không cần biết nhau từ trước, cũng không cần chủ đề gì to tát, chỉ có một chiếc áo và một chút tò mò.",
        "Nhà tâm lý học Gillian Sandstrom đã nghiên cứu những cuộc trò chuyện thoáng qua với người lạ, và thấy chúng đủ làm tâm trạng khá lên. Ta hay nghĩ phải thân thì mới nên nói. Đôi khi chỉ cần một câu hỏi tò mò là đủ để hôm nay nhẹ hơn."
      ],
      "proverb": {
        "text": "Một câu hỏi nhỏ có thể mở ra một cuộc trò chuyện dài.",
        "by": ""
      },
      "task": "Hôm nay hỏi một người ít quen một câu nhỏ, như về chiếc áo họ mặc hay món họ đang chọn.",
      "source": {
        "name": "NPR (đăng lại trên KUNC), 06/09/2026",
        "url": "https://www.kunc.org/npr-news/2026-09-06/whatever-happened-to-kindness-spoiler-alert-our-readers-prove-its-alive-and-well"
      }
    },
    {
      "id": "s10",
      "part": "noon",
      "title": "Những đôi tay nhỏ ngoài sân lúa",
      "kind": "real",
      "paras": [
        "Trời sắp mưa, lúa trên sân còn chưa kịp thu. Một bé gái loay hoay không xuể, và bật khóc.",
        "Nghe tiếng khóc, mấy bạn nhỏ hàng xóm chạy sang, không ai nhờ, không ai bảo. Các bạn cùng nhau dọn lúa giúp bé gái trước cơn mưa. Đoạn video ghi lại cảnh ấy được đăng trên Tuổi Trẻ, và nhiều người xem xong đều thấy lòng ấm lên.",
        "Người lớn thường nghĩ giúp đỡ cần cân nhắc, cần một lý do. Trẻ con thì chỉ cần nghe tiếng ai đó cần mình. Có lẽ ta nên giữ lại một chút phản xạ ấy, để khi có tiếng gọi, mình là người chạy sang đầu tiên."
      ],
      "proverb": {
        "text": "Bán anh em xa, mua láng giềng gần.",
        "by": "Tục ngữ Việt Nam"
      },
      "task": "Hôm nay làm một việc nhỏ giúp người xung quanh mà không chờ ai nhờ: giữ cửa, nhấc hộ một món đồ, hay dọn giúp một góc chung.",
      "source": {
        "name": "Tuổi Trẻ, mục Ấm lòng, 19/10/2026",
        "url": "https://tuoitre.vn/am-long.html"
      }
    },
    {
      "id": "s11",
      "part": "noon",
      "title": "Điều chưa nói trong cuộc họp",
      "paras": [
        "Trong cuộc họp, anh Tín thường là người nói nhiều nhất. Hôm ấy, anh thử làm ngược lại: ngồi yên, lắng nghe đến khi mọi người nói xong. Cô đồng nghiệp ít lời nhất nhóm bỗng đưa ra một ý khiến cả phòng im lặng.",
        "Anh ghi lại ý đó, hỏi thêm hai câu để hiểu cho rõ chứ không vội phản biện. Hóa ra điều cô ấy lo lắng bấy lâu chính là chỗ cả dự án đang hở. Chỉ vì có người nghe, điều đó mới được nói thành lời.",
        "Sau buổi họp, anh nhận ra mình chưa bao giờ hiểu hết một ai, và có lẽ cũng không cần. Chỉ cần hiểu đủ để người ta thấy mình được tôn trọng, là đủ để làm việc cùng nhau."
      ],
      "proverb": {
        "text": "Hiểu người là trí, hiểu mình mới là sáng.",
        "by": "Lão Tử, Đạo Đức Kinh"
      },
      "task": "Trong cuộc trò chuyện tiếp theo, đợi người kia nói xong rồi hãy trả lời."
    },
    {
      "id": "s12",
      "part": "noon",
      "title": "Góp ý sau cánh cửa",
      "paras": [
        "Anh Thiện thấy cậu nhân viên mới làm sai một con số trong báo cáo, mà cuộc họp sắp bắt đầu. Anh định chỉ ngay trước mọi người, vì nghĩ thẳng thắn là tốt.",
        "Nhưng anh nhớ lại lần mình bị chỉ lỗi trước cả phòng, mặt nóng bừng và không nghe lọt một lời nào. Anh nhắn riêng: \"Em xem lại ô thứ ba nhé, anh nghĩ có nhầm số.\" Cậu ấy sửa trong hai phút, rồi nhắn lại một chữ: \"Cảm ơn anh.\"",
        "Cuộc họp trôi qua êm. Anh học được rằng góp ý có thể thẳng mà vẫn nhẹ, và rằng cách ta nói quan trọng không kém điều ta nói."
      ],
      "proverb": {
        "text": "Điều mình không muốn, đừng làm cho người.",
        "by": "Khổng Tử, Luận Ngữ"
      },
      "task": "Nếu cần góp ý ai hôm nay, hãy nói riêng và nói bằng giọng bạn muốn được nghe."
    },
    {
      "id": "s13",
      "part": "dusk",
      "title": "Ổ bánh mì chua thứ bảy",
      "kind": "idea",
      "paras": [
        "Anh Hiếu ba mươi sáu tuổi quyết định học làm bánh mì chua vì nghe nói nó khó. Ổ đầu tiên cứng như gạch, ổ thứ hai dẹt lép, ổ thứ ba chua đến nhăn mặt. Anh bật cười, ghi vào cuốn sổ nhỏ: “Men chưa chịu mình, hoặc mình chưa chịu nó.”",
        "Mỗi tối anh dành mười lăm phút nuôi men, nhào bột, chờ bột nở. Anh học cách nhìn bọt khí, ngửi mùi men, đoán lúc bột đủ chín. Những điều ấy không có trong công thức, chỉ đến khi tay làm đủ lâu mới biết.",
        "Ổ thứ bảy phồng lên, vỏ vàng nâu, nứt một đường đẹp như vẽ. Anh cắt một lát, mùi thơm lan khắp bếp. Anh mang nửa ổ sang cho người hàng xóm, và nhận lại một lời khen làm anh cười cả buổi tối. Kiên nhẫn hóa ra là một kỹ năng, và anh học được nó từ một cục bột."
      ],
      "proverb": {
        "text": "Việc khó trong thiên hạ đều bắt đầu từ chỗ dễ.",
        "by": "Lão Tử, Đạo Đức Kinh (ý)"
      },
      "task": "Chọn một kỹ năng mới và dành 15 phút tối nay cho nó. Hôm sau lặp lại.",
      "source": {
        "name": "Hawaii News Now, 30/09/2026",
        "url": "https://www.hawaiinewsnow.com/2026/09/30/learning-new-tricks-surprising-way-new-hobbies-boost-your-brain-you-age/",
        "idea": "Các chuyên gia lão hóa trong bài cho biết học một kỹ năng mới giúp não hình thành thêm kết nối, và cần thời gian, kiên nhẫn."
      }
    },
    {
      "id": "s14",
      "part": "dusk",
      "title": "Chiếc xe đạp cũ",
      "paras": [
        "Chiếc xe đạp của anh Hải nằm ở góc sân đã hai năm, xích rỉ, lốp xẹp. Chiều thứ bảy, anh lôi nó ra, trải tờ báo xuống nền, và quyết định xem mình có sửa nổi không.",
        "Mất cả buổi chiều. Anh tra cách tra dầu xích trên điện thoại, vá lốp lần đầu thì hụt hơi, lần hai mới kín. Tay lấm lem, tóc dính mồ hôi. Đến lúc nắng nhuộm vàng góc sân, anh dắt xe ra cổng, ngồi lên và đạp thử.",
        "Bánh xe quay êm. Gió chiều thổi qua mái tóc, mát rượi. Anh đạp một vòng quanh dãy nhà, vừa đạp vừa bật cười thành tiếng. Người anh thắng hôm nay không phải ai khác, mà chính là cái giọng nói bảo \"thôi để mai\"."
      ],
      "proverb": {
        "text": "Thắng ngàn quân không bằng thắng chính mình.",
        "by": "Kinh Pháp Cú (ý)"
      },
      "task": "Làm ngay một việc bạn vẫn để dành cho \"để mai\". Chỉ cần bắt đầu."
    },
    {
      "id": "s15",
      "part": "dusk",
      "title": "Cơn mưa giữa đường",
      "paras": [
        "Anh Khải đang trên đường đi họp thì mưa đổ xuống, không áo mưa. Phản xạ đầu tiên là bực bội: sao lại hôm nay? Anh tấp vào mái hiên một quán nhỏ, nhìn đồng hồ, nhìn áo ướt.",
        "Rồi anh chợt để ý: mưa chưa từng nhắm vào anh. Cơn mưa vẫn rơi như đã rơi cho mọi mái nhà. Anh gọi điện báo trễ mười phút, rồi đứng nhìn hạt mưa nhảy trên mặt đường, ngửi mùi đất ẩm bốc lên. Mười phút ấy, anh thở ra thật dài.",
        "Khi mưa nhỏ dần, anh đi tiếp, áo còn ẩm nhưng đầu óc nhẹ. Cuộc họp hôm đó diễn ra tốt hơn anh nghĩ. Anh chợt hiểu thứ làm mình khổ hôm nay chưa chắc là cơn mưa, mà là cách mình đứng nhìn nó."
      ],
      "proverb": {
        "text": "Điều làm ta bất an không phải sự việc, mà là cách ta nhìn sự việc.",
        "by": "Epictetus (ý)"
      },
      "task": "Lần tới bực vì điều không đổi được, hít vào bốn nhịp, thở ra sáu nhịp, rồi hỏi: mình làm được gì ngay bây giờ?"
    },
    {
      "id": "s16",
      "part": "dusk",
      "title": "Nỗi sợ to hơn sự thật",
      "paras": [
        "Suốt một tuần, anh Vinh mường tượng buổi phỏng vấn như một phiên tòa: người đối diện lạnh lùng, câu hỏi hóc búa, và anh nói lắp ngay từ câu chào. Đêm trước, anh gần như không ngủ.",
        "Sáng hôm sau anh bước vào phòng, và người phỏng vấn chỉ là một người đàn ông mỉm cười, hỏi han như hỏi chuyện. Anh trả lời thật, có câu vấp, có câu không biết thì nói không biết. Buổi gặp kéo dài hai mươi phút và dễ chịu hơn mọi điều anh tưởng.",
        "Anh không trúng tuyển, nhưng lúc bước ra, anh cười với chính mình. Cả tuần lo sợ hóa ra chỉ là cái bóng, lớn gấp mười lần vật thật. Từ đó, mỗi khi sợ, anh hỏi: đây là điều đã xảy ra, hay điều mình đang tưởng tượng?"
      ],
      "proverb": {
        "text": "Ta thường sợ trong tưởng tượng nhiều hơn chịu đựng trong thực tế.",
        "by": "Seneca (ý)"
      },
      "task": "Viết ra một nỗi lo hiện tại, rồi gạch dưới phần nào là thật và phần nào mới chỉ là tưởng tượng."
    },
    {
      "id": "s17",
      "part": "night",
      "title": "Cuốn sổ ba dòng",
      "paras": [
        "Anh Minh ba mươi hai tuổi có thói quen viết ba dòng vào cuốn sổ bìa xanh trước khi đi ngủ. Chỉ ba điều anh làm được trong ngày, không cần dài.",
        "Có hôm anh viết: \"Chạy xong năm vòng. Nấu bữa tối. Gọi điện cho mẹ.\" Có hôm bận rộn hơn, anh chỉ viết: \"Dậy đúng giờ. Đi làm. Đi ngủ sớm.\" Anh không đem ngày này ra so với ngày khác, vì ngày nào cũng có ba dòng của riêng nó.",
        "Đêm giao thừa, anh lật lại cuốn sổ đã dày lên, thấy cả một năm dài làm bằng những việc nhỏ xíu mà mình chưa từng bỏ. Anh gấp sổ lại, mỉm cười, và nói với chính mình: cảm ơn nhé."
      ],
      "proverb": {
        "text": "Ngày hôm nay đã xong, và bạn đã làm hết sức mình. Thế là đủ.",
        "by": ""
      },
      "task": "Viết ba điều bạn làm được hôm nay lên một mảnh giấy, rồi tự nói với mình: cảm ơn nhé."
    },
    {
      "id": "s18",
      "part": "night",
      "title": "Mười hơi thở trên sân thượng",
      "paras": [
        "Cuối ngày, anh Đông lên sân thượng với ly trà nguội. Đầu óc anh còn đầy tiếng họp, tin nhắn, danh sách việc chưa xong, ồn như chợ vỡ.",
        "Anh ngồi xuống, đếm mười hơi thở. Hơi thứ ba, anh nghĩ đến báo cáo. Hơi thứ sáu, anh nghĩ đến bữa tối. Anh mỉm cười, kéo tâm trí về, đếm lại từ một. Đến lần thứ ba, tiếng ồn trong đầu lắng xuống, và anh nghe được gió thổi qua mái tôn, nghe tiếng ai đó gọi con về ăn cơm.",
        "Ngôi sao đầu tiên hiện lên giữa dải trời tím. Anh ngồi thêm một lúc, rồi xuống nhà. Anh hiểu rằng bình yên không cần đi đâu xa, nó nằm ngay sau mười hơi thở, miễn là mình chịu ngồi xuống."
      ],
      "proverb": {
        "text": "Mọi việc đều do tâm dẫn đầu.",
        "by": "Kinh Pháp Cú (ý)"
      },
      "task": "Ngồi yên đếm mười hơi thở. Nếu tâm trí đi lạc, mỉm cười và đếm lại từ một."
    },
    {
      "id": "s19",
      "part": "night",
      "title": "Bàn tay mở ra",
      "paras": [
        "Anh Nghĩa có thói quen siết chặt mọi thứ: kế hoạch, thời tiết, cả cách người khác nghĩ về mình. Tối nào anh cũng nằm mà đầu chạy lại những chuyện không kiểm soát nổi.",
        "Một hôm, anh kẻ một đường giữa tờ giấy. Bên trái ghi những việc nằm trong tay mình: giờ dậy, bữa ăn, lời nói, bài tập hôm nay. Bên phải ghi những việc không phải của mình: mưa nắng, lời bàn tán, kết quả. Anh nhìn bên phải một lúc, rồi gập tờ giấy lại.",
        "Từ đó anh dồn sức cho cột bên trái. Anh vẫn có những ngày bực dọc, nhưng bàn tay anh đã biết mở ra. Khi thôi nắm chặt, anh nhận ra tay mình còn nhiều chỗ để cầm những điều đáng cầm."
      ],
      "proverb": {
        "text": "Có việc nằm trong tay ta, có việc không. Hãy dồn sức cho việc thứ nhất.",
        "by": "Epictetus (ý)"
      },
      "task": "Kẻ một đường giữa tờ giấy: bên trái việc nằm trong tay bạn, bên phải việc không. Hôm nay chỉ làm cột trái."
    },
    {
      "id": "s20",
      "part": "night",
      "title": "Thư gửi mình một năm sau",
      "paras": [
        "Đêm cuối năm, anh Trung viết một lá thư cho chính mình của một năm sau. Anh kể điều mình đang cố, điều mình sợ, điều mình mong. Viết xong, anh bỏ vào phong bì, dán kín, ghi ngày mở.",
        "Anh nhận ra trong lúc viết, mình bắt đầu thấy rõ điều gì thật sự quan trọng. Không phải chiếc xe mới, không phải lời khen, mà là những buổi sáng dậy đúng giờ, những bữa cơm nấu tử tế, những cuộc gọi về nhà.",
        "Anh cất lá thư vào ngăn kéo. Thời gian không hề ít đi, chỉ là mình có dành nó cho điều đáng dành hay không. Anh tắt đèn, đi ngủ, và lần đầu cảm thấy một năm trước mặt là một trang giấy mời mình viết lên."
      ],
      "proverb": {
        "text": "Không phải ta có quá ít thời gian, mà ta bỏ phí quá nhiều.",
        "by": "Seneca (ý)"
      },
      "task": "Viết ba dòng gửi chính mình của một năm sau, rồi cất vào ngăn kéo."
    }
  ],
  "reflections": {
    "sections": [
      {
        "title": "Về cách sống và lòng người",
        "paras": [
          "Hãy sống cuộc đời mà mình lựa chọn, đừng để ánh mắt của người đời quyết định con đường mình đi. Chỉ cần những điều ta làm không gây tổn hại đến người khác, ta có quyền sống theo cách khiến mình thanh thản.",
          "Đừng bận lòng với người không đặt ta trong lòng họ. Nhưng hãy trân trọng những người vẫn dành cho ta một chỗ đứng trong trái tim. Bởi tình thân có thể chịu đựng những tháng ngày xa cách, bao dung những lỗi lầm và chờ đợi ta trở về, dù thời gian đã trôi qua bao lâu."
        ]
      },
      {
        "title": "Về các mối quan hệ",
        "paras": [
          "Con người có thể chọn sống một mình để tìm sự bình yên, hoặc mở lòng để xây dựng những mối quan hệ. Nhưng dù chọn cách nào, cũng đừng đặt toàn bộ niềm vui và niềm tin của mình vào duy nhất một người.",
          "Bởi không ai có thể đồng hành cùng ta trên mọi chặng đường. Khi một người rời đi, nếu ta đã quên mất thế giới rộng lớn ngoài kia, điều còn lại không chỉ là nỗi cô đơn, mà còn là sự mất phương hướng giữa cuộc đời."
        ]
      },
      {
        "title": "Về cách nhìn nhận con người",
        "paras": [
          "Đừng vội phán xét một người chỉ qua một khoảnh khắc, cũng đừng định nghĩa họ bằng một hoàn cảnh nhất thời.",
          "Một con người không chỉ được tạo nên bởi một hành động, một lời nói hay một sai lầm. Họ là kết quả của những trải nghiệm, những mối quan hệ và cả những điều mà ta chưa từng biết đến.",
          "Muốn hiểu một người, hãy nhìn vào cả hành trình của họ, đừng chỉ nhìn vào một đoạn đường."
        ]
      },
      {
        "title": "Về sự khiêm nhường và nhận thức",
        "paras": [
          "Đừng bao giờ cho rằng mình luôn đúng, ngay cả khi có đủ lý lẽ để tin rằng mình không sai.",
          "Bởi trí tuệ không nằm ở việc luôn bảo vệ quan điểm của mình, mà nằm ở khả năng nhận ra những điều mình chưa biết.",
          "Sự thật không thay đổi theo niềm tin của mỗi người. Vì vậy, trước mọi vấn đề, hãy giữ một tâm thế tỉnh táo, một cái nhìn đa chiều và một sự cẩn trọng cần thiết."
        ]
      }
    ],
    "closing": {
      "label": "Một câu kết cho cả bốn điều",
      "text": "Sống tự tại, đối đãi chân thành, nhìn người bao dung và nhìn đời bằng một trí tuệ khiêm nhường.",
      "by": "Bốn điều chiêm nghiệm"
    },
    "spirit": [
      "Tự do trong cách sống",
      "Độc lập trong tâm hồn",
      "Bao dung trong cách nhìn người",
      "Khiêm nhường trong nhận thức"
    ]
  }
};
