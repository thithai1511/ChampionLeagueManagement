import { 
  Users, 
  Trophy, 
  DollarSign, 
  Building2, 
  UsersRound, 
  Stadium, 
  Clock, 
  FileText, 
  AlertCircle,
  Medal,
  Flag,
  ClipboardList,
  Shield,
  Target,
  Award,
  Ban
} from 'lucide-react';

export type RoleType = 'league_admin' | 'club_admin' | 'referee' | 'player';
export type PhaseType = 'pre_season' | 'in_season' | 'post_season';

export interface RegulationCard {
  icon: any;
  title: string;
  items: string[];
}

export interface AccordionContent {
  title: string;
  items?: string[];
  steps?: { step: string; description: string }[];
}

export interface TableData {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface TimelineStep {
  step: number;
  title: string;
  description: string;
}

export interface PhaseContent {
  cards?: RegulationCard[];
  accordions?: AccordionContent[];
  tables?: TableData[];
  timeline?: TimelineStep[];
  banner?: {
    type: 'warning' | 'info' | 'success';
    message: string;
  };
}

export interface RoleRegulations {
  [key: string]: {
    [key: string]: PhaseContent;
  };
}

export const roles = [
  { id: 'league_admin', label: 'BTC Giải', icon: Trophy },
  { id: 'club_admin', label: 'CLB / Đội bóng', icon: Shield },
  { id: 'referee', label: 'Trọng tài & Giám sát', icon: Flag },
  { id: 'player', label: 'Cầu thủ', icon: Users },
];

export const phases = [
  { id: 'pre_season', label: 'Trước mùa giải' },
  { id: 'in_season', label: 'Trong mùa giải' },
  { id: 'post_season', label: 'Kết thúc mùa giải' },
];

export const regulations: RoleRegulations = {
  league_admin: {
    pre_season: {
      cards: [
        {
          icon: Trophy,
          title: 'Cơ cấu đội tham dự',
          items: [
            '10 đội tham gia giải đấu',
            '8 đội đứng đầu mùa trước',
            '2 đội thăng hạng từ giải dưới',
          ],
        },
        {
          icon: DollarSign,
          title: 'Lệ phí tham dự',
          items: ['1 tỷ VNĐ / đội', 'Nộp kèm hồ sơ đăng ký'],
        },
        {
          icon: Building2,
          title: 'Điều kiện CLB',
          items: [
            'CLB thuộc công ty/cơ quan tại Việt Nam',
            'Có đầy đủ giấy tờ pháp lý',
          ],
        },
        {
          icon: UsersRound,
          title: 'Danh sách cầu thủ',
          items: [
            'Tối thiểu 16 cầu thủ, tối đa 22 cầu thủ',
            'Tối đa 5 cầu thủ ngoại được đăng ký',
            'Tối đa 3 cầu thủ ngoại được thi đấu trên sân',
          ],
        },
        {
          icon: Stadium,
          title: 'Sân vận động',
          items: [
            'Tối thiểu 10.000 chỗ ngồi',
            'Đạt tiêu chuẩn ≥ 2 sao của FIFA',
            'Nằm trên lãnh thổ Việt Nam',
          ],
        },
        {
          icon: Clock,
          title: 'Thời hạn phản hồi',
          items: [
            'Đội phải trả lời trong vòng 2 tuần',
            'Tính từ khi nhận danh sách mời',
          ],
        },
      ],
      accordions: [
        {
          title: 'Quy trình chọn 10 đội tham dự',
          steps: [
            {
              step: 'Bước 1',
              description: 'BTC gửi danh sách mời + quy định cơ bản đến các đội',
            },
            {
              step: 'Bước 2',
              description: 'Các đội phản hồi xác nhận tham gia trong vòng 2 tuần',
            },
            {
              step: 'Bước 3',
              description: 'Nếu đội từ chối hoặc không đủ điều kiện → BTC mời đội khác thay thế',
            },
            {
              step: 'Bước 4',
              description: 'Lặp lại quy trình cho đến khi đủ 10 đội hợp lệ',
            },
          ],
        },
      ],
    },
    in_season: {
      accordions: [
        {
          title: 'Nhiệm vụ trước mỗi trận',
          items: [
            'Công bố danh sách trọng tài chính cho từng trận đấu',
            'Công bố danh sách trọng tài biên và trọng tài dự bị',
            'Chỉ định giám sát viên cho mỗi trận đấu',
            'Thông báo lịch thi đấu và địa điểm cho các đội',
          ],
        },
        {
          title: 'Nhận & xử lý báo cáo sau trận',
          items: [
            'Nhận báo cáo từ trọng tài: tỷ số, ghi bàn, cầu thủ xuất sắc, thẻ phạt',
            'Nhận thông số chuyên môn: số phạt góc, phạt đền, việt vị, kiểm soát bóng',
            'Nhận báo cáo giám sát về công tác tổ chức, sai sót của trọng tài/cầu thủ/BTC sân',
            'Xử lý kỷ luật nếu phát hiện vi phạm',
          ],
        },
        {
          title: 'Quản lý danh sách thi đấu',
          items: [
            'Nhận danh sách 16 cầu thủ (11 chính + 5 dự bị) từ mỗi đội',
            'Duyệt trang phục thi đấu (home/away)',
            'Xác nhận sơ đồ chiến thuật (4-4-2, 4-3-3, 3-5-2...)',
            'Kiểm tra cầu thủ không bị treo giò',
          ],
        },
        {
          title: 'Các danh sách khác BTC quản lý',
          items: [
            'Bảng vua phá lưới (cầu thủ ghi nhiều bàn nhất)',
            'Bảng cầu thủ xuất sắc trận (MOTM)',
            'Danh sách thẻ vàng và thẻ đỏ',
            'Danh sách cầu thủ bị treo giò (2 thẻ vàng hoặc 1 thẻ đỏ)',
          ],
        },
      ],
      tables: [
        {
          title: 'Cập nhật bảng xếp hạng - Cách tính điểm',
          headers: ['Kết quả', 'Điểm'],
          rows: [
            ['Thắng', '3'],
            ['Hòa', '1'],
            ['Thua', '0'],
          ],
        },
      ],
    },
    post_season: {
      timeline: [
        {
          step: 1,
          title: 'Khóa bảng xếp hạng',
          description: 'Hoàn tất tất cả các trận đấu và khóa dữ liệu bảng xếp hạng cuối cùng',
        },
        {
          step: 2,
          title: 'Áp dụng quy tắc xếp hạng',
          description: '1. Điểm số → 2. Hiệu số bàn thắng bại → 3. Tổng tỷ số 2 lượt trận đối đầu → 4. Rút thăm',
        },
        {
          step: 3,
          title: 'Bầu chọn & trao giải',
          description: 'Vô địch, Á quân, Vua phá lưới, Cầu thủ xuất sắc nhất mùa giải và các danh hiệu cá nhân khác',
        },
      ],
      banner: {
        type: 'warning',
        message: '⚠️ Lưu ý: 4 tiêu chí xếp hạng (điểm, hiệu số, đối đầu, rút thăm) **chỉ áp dụng khi kết thúc mùa giải**. Trong quá trình thi đấu chỉ dùng: Điểm số + Hiệu số bàn thắng bại, chấp nhận có thể có 2 đội cùng hạng tạm thời.',
      },
    },
  },
  club_admin: {
    pre_season: {
      cards: [
        {
          icon: Clock,
          title: 'Phản hồi tham dự',
          items: [
            'CLB phải phản hồi đồng ý tham gia trong 2 tuần',
            'Xác nhận đầy đủ điều kiện tham gia giải đấu',
          ],
        },
        {
          icon: DollarSign,
          title: 'Lệ phí bắt buộc',
          items: ['Nộp 1 tỷ VNĐ kèm hồ sơ đăng ký', 'Thanh toán trước khi bắt đầu mùa giải'],
        },
      ],
      accordions: [
        {
          title: 'Hồ sơ CLB gửi BTC',
          items: [
            'Thông tin đội: tên đội, đơn vị chủ quản, thành phố',
            'Thông tin sân nhà: địa điểm, sức chứa, tiêu chuẩn FIFA',
            'Trang phục thi đấu: mẫu chính và mẫu phụ (home/away)',
            'Danh sách cầu thủ: tên, năm sinh, nơi sinh, quốc tịch, vị trí, chiều cao, cân nặng, tiểu sử bóng đá',
            'Lịch thi đấu các giải khác mà đội đang tham gia (nếu có)',
          ],
        },
      ],
    },
    in_season: {
      cards: [
        {
          icon: ClipboardList,
          title: 'Đăng ký danh sách trận đấu',
          items: [
            '16 cầu thủ thi đấu (11 chính + 5 dự bị)',
            'Trang phục thi đấu (home/away)',
            'Sơ đồ chiến thuật (4-4-2, 4-3-3, 3-4-2-1...)',
            'Gửi cho BTC trước mỗi trận đấu',
          ],
        },
      ],
      accordions: [
        {
          title: 'Trách nhiệm tuân thủ',
          items: [
            'Không sử dụng cầu thủ không đủ điều kiện (tuổi, treo giò)',
            'Tuân thủ quota cầu thủ ngoại (tối đa 3 trên sân)',
            'Tuân thủ lịch thi đấu và quy định sân bãi',
            'Chấp hành quyết định kỷ luật của BTC',
          ],
        },
      ],
    },
    post_season: {
      cards: [
        {
          icon: Trophy,
          title: 'Hoạt động tổng kết',
          items: [
            'Phối hợp BTC trong các hoạt động tổng kết',
            'Tham gia lễ trao giải và các sự kiện truyền thông',
            'Hoàn tất các thủ tục hành chính cuối mùa',
          ],
        },
      ],
    },
  },
  referee: {
    pre_season: {
      cards: [
        {
          icon: FileText,
          title: 'Thông tin',
          items: ['Trọng tài sẽ được BTC phân công khi mùa giải bắt đầu'],
        },
      ],
    },
    in_season: {
      cards: [
        {
          icon: Flag,
          title: 'Phân công',
          items: [
            'BTC chỉ định tổ trọng tài trước mỗi trận',
            'Bao gồm: Trọng tài chính, trọng tài biên, trọng tài dự bị',
            'BTC chỉ định giám sát viên cho mỗi trận đấu',
          ],
        },
      ],
      accordions: [
        {
          title: 'Nhiệm vụ trọng tài bàn / trọng tài chính',
          items: [
            'Điều hành trận đấu theo luật bóng đá FIFA',
            'Gửi báo cáo sau trận: tỷ số, cầu thủ ghi bàn, cầu thủ xuất sắc nhất',
            'Ghi nhận thẻ vàng và thẻ đỏ',
            'Báo cáo các thông số chuyên môn: phạt góc, phạt đền, việt vị, thời gian thi đấu',
          ],
        },
        {
          title: 'Nhiệm vụ giám sát trận',
          items: [
            'Đánh giá công tác tổ chức: sân bãi, an ninh, y tế',
            'Giám sát chất lượng điều hành của trọng tài',
            'Ghi nhận sai sót của cầu thủ, CLB, BTC sân',
            'Chuyển thông tin vi phạm cho BTC để xử lý kỷ luật',
          ],
        },
      ],
    },
    post_season: {
      cards: [
        {
          icon: Award,
          title: 'Tổng kết',
          items: ['Hoàn tất báo cáo tổng kết mùa giải', 'Tham gia đánh giá chất lượng trọng tài'],
        },
      ],
    },
  },
  player: {
    pre_season: {
      cards: [
        {
          icon: FileText,
          title: 'Thông tin',
          items: ['Cầu thủ được CLB đăng ký với BTC trước mùa giải'],
        },
      ],
    },
    in_season: {
      cards: [
        {
          icon: Target,
          title: 'Điều kiện tham dự',
          items: [
            'Tuổi tối thiểu 16 tuổi',
            'Thuộc CLB đã đăng ký hợp lệ với BTC',
            'Không bị treo giò',
          ],
        },
        {
          icon: Ban,
          title: 'Treo giò',
          items: [
            'Bị treo giò khi nhận 2 thẻ vàng',
            'Bị treo giò khi nhận 1 thẻ đỏ',
            'Không được thi đấu ở trận kế tiếp',
          ],
        },
        {
          icon: Medal,
          title: 'Danh hiệu cá nhân',
          items: [
            'Cầu thủ xuất sắc nhất trận đấu (MOTM)',
            'Vua phá lưới cuối mùa giải',
            'Các danh hiệu cá nhân khác do BTC bình chọn',
          ],
        },
      ],
    },
    post_season: {
      cards: [
        {
          icon: Trophy,
          title: 'Vinh danh',
          items: ['Nhận danh hiệu và giải thưởng cá nhân (nếu có)', 'Tham gia lễ trao giải cuối mùa'],
        },
      ],
    },
  },
};
