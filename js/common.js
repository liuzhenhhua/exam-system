/**
 * 企业培训考试系统 - 公共脚本
 * 包含: 模拟数据、工具函数、通用组件
 * 架构: IIFE + ExamSystem 命名空间（讨论#2 决策方案）
 */

// ==================== 全局命名空间 ====================

window.ExamSystem = window.ExamSystem || {};

// ==================== 模拟数据 ====================

const MOCK_DATA = {
    // 当前登录用户（默认不预设，由登录决定）
    currentUser: null,

    adminUser: {
        id: 1,
        username: 'admin',
        real_name: '系统管理员',
        employee_id: 'ADMIN001',
        role: 'admin',
        department: '管理员'
    },

    // 管理员账号列表（首次运行时的默认管理员，请登录后立即修改密码）
    adminAccounts: [
        { id: 1, username: 'admin', password: 'Admin@2026', real_name: '系统管理员', role: 'admin', department: '管理员', status: 'active' }
    ],

    // 考试人员账号列表（初始为空，通过管理端导入）
    examineeAccounts: [],

    // 待考试列表
    examList: [
        {
            id: 1,
            title: '2026年新员工入职培训考试',
            description: '涵盖公司文化、产品知识、制度规范等内容',
            start_time: '2026-07-01 09:00',
            end_time: '2026-07-03 18:00',
            duration_minutes: 60,
            status: 'available', // available | completed | expired
            question_count: 50,
            total_score: 100,
            pass_score: 60
        },
        {
            id: 2,
            title: '信息安全意识考核',
            description: '信息安全基础知识与公司安全规范',
            start_time: '2026-07-05 09:00',
            end_time: '2026-07-06 18:00',
            duration_minutes: 30,
            status: 'upcoming',
            question_count: 30,
            total_score: 100,
            pass_score: 70
        },
        {
            id: 3,
            title: '产品知识专项测试',
            description: '公司核心产品线知识考核',
            start_time: '2026-06-25 09:00',
            end_time: '2026-06-27 18:00',
            duration_minutes: 45,
            status: 'completed',
            question_count: 40,
            total_score: 100,
            pass_score: 60,
            my_score: 85,
            my_rank: 12
        }
    ],

    // 考试题目
    examQuestions: [
        {
            id: 1,
            type: 'single',
            scope: 'public',
            project_id: null,
            category: '公共红线考试',
            difficulty: 1,
            content: '公司的核心价值观是什么？',
            options: [
                '用户为本，科技向善',
                '追求卓越，合作共赢',
                '创新驱动，诚信担当',
                '客户第一，员工第二'
            ],
            answer: 0,
            analysis: '公司的核心价值观是"用户为本，科技向善"，这是公司一切行动的出发点。'
        },
        {
            id: 2,
            type: 'single',
            category: '公共红线考试',
            difficulty: 1,
            content: '公司成立于哪一年？',
            options: ['1996年', '1998年', '2000年', '2002年'],
            answer: 1,
            analysis: '公司成立于1998年，总部位于深圳。'
        },
        {
            id: 3,
            type: 'multiple',
            category: '公共红线考试',
            difficulty: 2,
            content: '以下哪些是公司的主要产品线？（多选）',
            options: [
                '社交与通讯',
                '数字内容',
                '金融科技',
                '汽车制造'
            ],
            answer: [0, 1, 2],
            analysis: '公司的主要产品线包括社交与通讯、数字内容、金融科技和产业互联，汽车制造不属于公司主要产品线。'
        },
        {
            id: 4,
            type: 'judge',
            category: '公共红线考试',
            difficulty: 1,
            content: '员工入职后需签订保密协议，保密义务在离职后仍然有效。',
            options: ['正确', '错误'],
            answer: 0,
            analysis: '保密协议中的保密义务是持续性的，不因劳动关系的终止而终止。'
        },
        {
            id: 5,
            type: 'single',
            category: '公共红线考试',
            difficulty: 2,
            content: '公司云服务产品的核心优势不包括以下哪项？',
            options: [
                '高可用性和弹性伸缩',
                '全球覆盖的数据中心',
                '完全免费使用',
                '完善的安全合规体系'
            ],
            answer: 2,
            analysis: '公司云服务产品提供企业级服务，并非完全免费，而是按需计费。'
        },
        {
            id: 6,
            type: 'multiple',
            category: '公共红线考试',
            difficulty: 2,
            content: '新员工入职后需要完成以下哪些事项？（多选）',
            options: [
                '签署劳动合同',
                '参加入职培训',
                '配置办公设备',
                '通过转正考核'
            ],
            answer: [0, 1, 2, 3],
            analysis: '新员工入职需完成签署劳动合同、参加入职培训、配置办公设备，试用期满后需通过转正考核。'
        },
        {
            id: 7,
            type: 'judge',
            category: '公共红线考试',
            difficulty: 2,
            content: '可以使用个人邮箱发送公司内部文件，只要对方是同事即可。',
            options: ['正确', '错误'],
            answer: 1,
            analysis: '公司内部文件严禁通过个人邮箱发送，必须使用公司企业邮箱，违反者将按信息安全管理制度处理。'
        },
        {
            id: 8,
            type: 'single',
            category: '公共红线考试',
            difficulty: 3,
            content: '公司提倡的"瑞雪文化"主要指的是什么？',
            options: [
                '冬季团建活动',
                '员工自觉遵守公共行为规范的文化',
                '年终奖金制度',
                '节日福利发放'
            ],
            answer: 1,
            analysis: '"瑞雪文化"是公司提倡的一种员工自觉遵守公共行为规范、共建文明办公环境的文化理念。'
        },
        {
            id: 9,
            type: 'multiple',
            category: '公共红线考试',
            difficulty: 3,
            content: '以下哪些行为属于信息安全违规？（多选）',
            options: [
                '在公共WiFi下访问公司内网',
                '将密码写在便签纸上贴在显示器旁',
                '定期更换登录密码',
                '使用未经授权的U盘接入办公电脑'
            ],
            answer: [0, 1, 3],
            analysis: '在公共WiFi下访问内网、明文记录密码、使用未授权U盘均属于信息安全违规行为。定期更换密码是正确的安全习惯。'
        },
        {
            id: 10,
            type: 'judge',
            category: '公共红线考试',
            difficulty: 1,
            content: '员工请假需提前在OA系统提交申请，经审批后方可休假。',
            options: ['正确', '错误'],
            answer: 0,
            analysis: '所有员工请假均需提前在OA系统提交申请，经直属上级审批通过后方可休假，紧急情况需电话告知并于返岗当日补办手续。'
        },
        {
            id: 11,
            type: 'short',
            category: '公共红线考试',
            difficulty: 2,
            content: '请简述公司"用户为本，科技向善"的价值观在你日常工作中的体现。',
            options: null,
            answer: '用户为本，科技向善',
            analysis: '此题为开放性简答题，评分标准：1. 能结合实际工作场景阐述（40分）；2. 理解"用户为本"的内涵（30分）；3. 体现"科技向善"的社会责任感（30分）。'
        },
        {
            id: 12,
            type: 'single',
            scope: 'project',
            project_id: 1,
            category: '项目红线考试',
            difficulty: 2,
            content: '脚本中含有红果免费短剧时，ios/非ios标签应打哪个标签？',
            options: ['短剧安卓素材', '短剧ios素材', '短剧通用素材'],
            answer: 0,
            analysis: '脚本中含有红果免费短剧时，ios/非ios标签应打短剧安卓素材。'
        },
        {
            id: 13,
            type: 'judge',
            scope: 'project',
            project_id: 1,
            category: '项目红线考试',
            difficulty: 1,
            content: '短剧激励素材不能产出30s以内的素材。',
            options: ['正确', '错误'],
            answer: 0,
            analysis: '短剧激励素材时长不得低于30s。'
        },
        {
            id: 14,
            type: 'multiple',
            scope: 'project',
            project_id: 1,
            category: '项目红线考试',
            difficulty: 2,
            content: '短剧素材制作中不能出现的画面有哪些？',
            options: ['男性裸露上半身', '抽烟', '接吻', '人民币'],
            answer: [0, 1, 2, 3],
            analysis: '短剧素材中禁止出现男性裸露上半身、抽烟、接吻、人民币等画面。'
        }
    ],

    // 题库分类
    categories: [
        { id: 1, name: '公共红线考试', count: 0 },
        { id: 2, name: '项目红线考试', count: 0 }
    ],

    // 项目列表
    projects: [
        { id: 1, name: '红果免费短剧', code: 'HG', description: '红果短剧素材审核与标签规范', status: 'active', created: '2026-06-15' },
        { id: 2, name: '抖音生活服务', code: 'DY', description: '生活服务商家运营规范', status: 'active', created: '2026-06-18' },
        { id: 3, name: '今日头条内容审核', code: 'JR', description: '头条内容安全与审核标准', status: 'active', created: '2026-06-20' }
    ],

    // 题库列表（与 examQuestions 保持一致的完整格式）
    questionBank: [
        {
            id: 1,
            type: 'single',
            scope: 'public',
            project_id: null,
            category: '公共红线考试',
            difficulty: 1,
            content: '公司的核心价值观是什么？',
            options: ['用户为本，科技向善', '追求卓越，合作共赢', '创新驱动，诚信担当', '客户第一，员工第二'],
            answer: 0,
            analysis: '公司的核心价值观是"用户为本，科技向善"，这是公司一切行动的出发点。'
        },
        {
            id: 2,
            type: 'single',
            scope: 'public',
            project_id: null,
            category: '公共红线考试',
            difficulty: 1,
            content: '公司成立于哪一年？',
            options: ['1996年', '1998年', '2000年', '2002年'],
            answer: 1,
            analysis: '公司成立于1998年，总部位于深圳。'
        },
        {
            id: 3,
            type: 'multiple',
            scope: 'public',
            project_id: null,
            category: '公共红线考试',
            difficulty: 2,
            content: '以下哪些是公司的主要产品线？',
            options: ['社交与通讯', '数字内容', '金融科技', '汽车制造'],
            answer: [0, 1, 2],
            analysis: '公司的主要产品线包括社交与通讯、数字内容、金融科技和产业互联，汽车制造不属于公司主要产品线。'
        },
        {
            id: 4,
            type: 'judge',
            scope: 'public',
            project_id: null,
            category: '公共红线考试',
            difficulty: 1,
            content: '员工入职后需签订保密协议，保密义务在离职后仍然有效。',
            options: ['正确', '错误'],
            answer: 0,
            analysis: '保密协议中的保密义务是持续性的，不因劳动关系的终止而终止。'
        },
        {
            id: 5,
            type: 'single',
            scope: 'public',
            project_id: null,
            category: '公共红线考试',
            difficulty: 2,
            content: '公司云服务产品的核心优势不包括以下哪项？',
            options: ['高可用性和弹性伸缩', '全球覆盖的数据中心', '完全免费使用', '完善的安全合规体系'],
            answer: 2,
            analysis: '公司云服务产品提供企业级服务，并非完全免费，而是按需计费。'
        },
        {
            id: 6,
            type: 'multiple',
            scope: 'public',
            project_id: null,
            category: '公共红线考试',
            difficulty: 2,
            content: '新员工入职后需要完成以下哪些事项？',
            options: ['签署劳动合同', '参加入职培训', '配置办公设备', '通过转正考核'],
            answer: [0, 1, 2, 3],
            analysis: '新员工入职需完成签署劳动合同、参加入职培训、配置办公设备，试用期满后需通过转正考核。'
        },
        {
            id: 7,
            type: 'judge',
            scope: 'public',
            project_id: null,
            category: '公共红线考试',
            difficulty: 2,
            content: '可以使用个人邮箱发送公司内部文件，只要对方是同事即可。',
            options: ['正确', '错误'],
            answer: 1,
            analysis: '公司内部文件严禁通过个人邮箱发送，必须使用公司企业邮箱，违反者将按信息安全管理制度处理。'
        },
        {
            id: 8,
            type: 'single',
            scope: 'public',
            project_id: null,
            category: '公共红线考试',
            difficulty: 3,
            content: '公司提倡的"瑞雪文化"主要指的是什么？',
            options: ['冬季团建活动', '员工自觉遵守公共行为规范的文化', '年终奖金制度', '节日福利发放'],
            answer: 1,
            analysis: '"瑞雪文化"是公司提倡的一种员工自觉遵守公共行为规范、共建文明办公环境的文化理念。'
        },
        {
            id: 9,
            type: 'multiple',
            scope: 'public',
            project_id: null,
            category: '公共红线考试',
            difficulty: 3,
            content: '以下哪些行为属于信息安全违规？',
            options: ['在公共WiFi下访问公司内网', '将密码写在便签纸上贴在显示器旁', '定期更换登录密码', '使用未经授权的U盘接入办公电脑'],
            answer: [0, 1, 3],
            analysis: '在公共WiFi下访问内网、明文记录密码、使用未授权U盘均属于信息安全违规行为。定期更换密码是正确的安全习惯。'
        },
        {
            id: 10,
            type: 'judge',
            scope: 'public',
            project_id: null,
            category: '公共红线考试',
            difficulty: 1,
            content: '员工请假需提前在OA系统提交申请，经审批后方可休假。',
            options: ['正确', '错误'],
            answer: 0,
            analysis: '所有员工请假均需提前在OA系统提交申请，经直属上级审批通过后方可休假，紧急情况需电话告知并于返岗当日补办手续。'
        },
        {
            id: 11,
            type: 'single',
            scope: 'public',
            project_id: null,
            category: '公共红线考试',
            difficulty: 1,
            content: '公司的使命是什么？',
            options: ['通过互联网服务提升人类生活品质', '让天下没有难做的生意', '连接一切，赋能于人', '科技让生活更美好'],
            answer: 0,
            analysis: '公司的使命是通过互联网服务提升人类生活品质。'
        },
        {
            id: 12,
            type: 'single',
            scope: 'public',
            project_id: null,
            category: '公共红线考试',
            difficulty: 2,
            content: '公司社交产品的月活用户超过多少？',
            options: ['5亿', '8亿', '10亿', '15亿'],
            answer: 2,
            analysis: '公司社交产品的月活用户超过10亿。'
        },
        {
            id: 13,
            type: 'judge',
            scope: 'public',
            project_id: null,
            category: '公共红线考试',
            difficulty: 1,
            content: '工作中遇到问题应及时向上级汇报。',
            options: ['正确', '错误'],
            answer: 0,
            analysis: '工作中遇到问题及时向上级汇报，有助于快速解决问题并避免风险扩大。'
        },
        {
            id: 14,
            type: 'multiple',
            scope: 'public',
            project_id: null,
            category: '公共红线考试',
            difficulty: 2,
            content: '公司云服务涵盖哪些能力？',
            options: ['计算与存储', '大数据与人工智能', '云安全与网络', '社交娱乐服务'],
            answer: [0, 1, 2],
            analysis: '公司云服务涵盖计算与存储、大数据与人工智能、云安全与网络等企业级能力。'
        },
        {
            id: 15,
            type: 'single',
            scope: 'public',
            project_id: null,
            category: '公共红线考试',
            difficulty: 3,
            content: '试用期一般为多长时间？',
            options: ['1个月', '3个月', '6个月', '1年'],
            answer: 1,
            analysis: '公司试用期一般为3个月，具体以劳动合同约定为准。'
        },
        {
            id: 16,
            type: 'single',
            scope: 'project',
            project_id: 1,
            category: '项目红线考试',
            difficulty: 2,
            content: '红果素材送审渠道以下哪个是对的？',
            options: ['邮件发送', '微信发送', '红果平台提交', '网盘分享'],
            answer: 2,
            analysis: '红果素材需通过官方红果平台提交送审，严禁通过个人邮件、微信或网盘分享。'
        },
        {
            id: 17,
            type: 'multiple',
            scope: 'project',
            project_id: 2,
            category: '项目红线考试',
            difficulty: 2,
            content: '抖音生活服务商家入驻需要哪些资质？',
            options: ['营业执照', '食品经营许可证', '娱乐场所许可证', '法人身份证'],
            answer: [0, 1, 3],
            analysis: '抖音生活服务商家入驻需提供营业执照、相关经营许可证（如食品经营）及法人身份证等资质。'
        }
    ],

    // 管理端考试列表
    adminExamList: [
        { id: 1, title: '2026年新员工入职培训考试', scope: 'public', project_id: null, status: 'published', start_time: '2026-07-01 09:00', end_time: '2026-07-03 18:00', duration: 60, participants: 156, question_count: 50, pass_rate: 0 },
        { id: 2, title: '信息安全意识考核', scope: 'public', project_id: null, status: 'draft', start_time: '2026-07-05 09:00', end_time: '2026-07-06 18:00', duration: 30, participants: 0, question_count: 30, pass_rate: 0 },
        { id: 3, title: '产品知识专项测试', scope: 'public', project_id: null, status: 'ended', start_time: '2026-06-25 09:00', end_time: '2026-06-27 18:00', duration: 45, participants: 142, question_count: 40, pass_rate: 87 },
        { id: 4, title: '职业素养基础测评', scope: 'public', project_id: null, status: 'ended', start_time: '2026-06-10 09:00', end_time: '2026-06-12 18:00', duration: 30, participants: 98, question_count: 25, pass_rate: 92 },
        { id: 5, title: 'Q2季度综合考核', scope: 'public', project_id: null, status: 'ended', start_time: '2026-06-28 09:00', end_time: '2026-06-30 18:00', duration: 90, participants: 210, question_count: 80, pass_rate: 78 },
        { id: 6, title: '红果免费短剧项目考核', scope: 'project', project_id: 1, status: 'published', start_time: '2026-07-05 09:00', end_time: '2026-07-12 18:00', duration: 45, participants: 45, question_count: 25, pass_rate: 0 },
        { id: 7, title: '抖音生活服务项目考核', scope: 'project', project_id: 2, status: 'draft', start_time: '2026-07-08 09:00', end_time: '2026-07-15 18:00', duration: 30, participants: 0, question_count: 20, pass_rate: 0 }
    ],

    // 成绩排行
    scoreRanking: [
        { rank: 1, name: '王芳', employee_id: 'EMP045', score: 98, time_spent: '42分15秒', submit_time: '2026-06-25 10:12', passed: true },
        { rank: 2, name: '刘强', employee_id: 'EMP032', score: 96, time_spent: '38分20秒', submit_time: '2026-06-25 09:58', passed: true },
        { rank: 3, name: '陈丽', employee_id: 'EMP078', score: 95, time_spent: '44分10秒', submit_time: '2026-06-25 10:30', passed: true },
        { rank: 4, name: '赵伟', employee_id: 'EMP012', score: 93, time_spent: '40分05秒', submit_time: '2026-06-25 10:05', passed: true },
        { rank: 5, name: '孙杰', employee_id: 'EMP056', score: 91, time_spent: '35分48秒', submit_time: '2026-06-25 09:55', passed: true },
        { rank: 6, name: '周婷', employee_id: 'EMP089', score: 88, time_spent: '41分22秒', submit_time: '2026-06-25 10:18', passed: true },
        { rank: 7, name: '吴磊', employee_id: 'EMP023', score: 85, time_spent: '43分30秒', submit_time: '2026-06-25 10:25', passed: true },
        { rank: 8, name: '张明', employee_id: 'EMP001', score: 85, time_spent: '39分15秒', submit_time: '2026-06-25 10:02', passed: true },
        { rank: 9, name: '郑华', employee_id: 'EMP067', score: 82, time_spent: '44分50秒', submit_time: '2026-06-25 10:35', passed: true },
        { rank: 10, name: '黄琳', employee_id: 'EMP034', score: 78, time_spent: '42分00秒', submit_time: '2026-06-25 10:15', passed: true },
        { rank: 11, name: '林峰', employee_id: 'EMP091', score: 72, time_spent: '38分40秒', submit_time: '2026-06-25 10:00', passed: true },
        { rank: 12, name: '何静', employee_id: 'EMP015', score: 68, time_spent: '41分10秒', submit_time: '2026-06-25 10:22', passed: true },
        { rank: 13, name: '高远', employee_id: 'EMP048', score: 55, time_spent: '44分55秒', submit_time: '2026-06-25 10:38', passed: false },
        { rank: 14, name: '马丽', employee_id: 'EMP072', score: 48, time_spent: '45分00秒', submit_time: '2026-06-25 10:40', passed: false }
    ],

    // Dashboard数据
    dashboardStats: {
        total_questions: 190,
        today_examinees: 156,
        pass_rate: 87,
        avg_score: 82.5,
        active_exams: 1,
        total_exams: 5
    },

    recentExams: [
        { title: '2026年新员工入职培训考试', status: 'published', participants: 156, completed: 0 },
        { title: '产品知识专项测试', status: 'ended', participants: 142, completed: 142 },
        { title: 'Q2季度综合考核', status: 'ended', participants: 210, completed: 210 },
        { title: '职业素养基础测评', status: 'ended', participants: 98, completed: 98 },
        { title: '信息安全意识考核', status: 'draft', participants: 0, completed: 0 }
    ]
};

// 数据兼容性处理：为旧数据补充项目/作用域字段
(function normalizeMockData() {
    const ensureScope = (items) => {
        items.forEach(item => {
            if (!item.scope) item.scope = 'public';
            if (!('project_id' in item)) item.project_id = null;
        });
    };
    ensureScope(MOCK_DATA.examQuestions);
    ensureScope(MOCK_DATA.questionBank);
    ensureScope(MOCK_DATA.examList);
    ensureScope(MOCK_DATA.adminExamList);
    MOCK_DATA.examineeAccounts.forEach(a => {
        if (!a.project_ids) a.project_ids = [];
    });
})();

// ==================== 工具函数 ====================

const Utils = {
    // 获取URL参数
    getParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    },

    // Toast提示
    toast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // 格式化时间 (秒 -> HH:MM:SS)
    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    // 题型中文
    questionTypeText(type) {
        const map = { single: '单选题', multiple: '多选题', judge: '判断题', short: '简答题' };
        return map[type] || type;
    },

    // 难度中文
    difficultyText(level) {
        const map = { 1: '简单', 2: '中等', 3: '困难' };
        return map[level] || '未知';
    },

    // 难度Badge class
    difficultyBadge(level) {
        const map = { 1: 'badge-success', 2: 'badge-warning', 3: 'badge-danger' };
        return map[level] || 'badge-gray';
    },

    // 考试状态文本
    examStatusText(status) {
        const map = {
            available: '可参加',
            upcoming: '未开始',
            completed: '已完成',
            expired: '已过期',
            draft: '草稿',
            published: '已发布',
            ended: '已结束'
        };
        return map[status] || status;
    },

    // 考试状态Badge class
    examStatusBadge(status) {
        const map = {
            available: 'badge-info',
            upcoming: 'badge-gray',
            completed: 'badge-success',
            expired: 'badge-gray',
            draft: 'badge-gray',
            published: 'badge-success',
            ended: 'badge-gray'
        };
        return map[status] || 'badge-gray';
    },

    // 选项字母
    optionLetter(index) {
        return String.fromCharCode(65 + index);
    },

    // 保存到localStorage
    saveLocal(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    // HTML 转义，防止 XSS 注入
    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        const s = String(str);
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(s));
        return div.innerHTML;
    },

    // 属性值转义（用于 HTML 属性如 value="", src="" 等）
    escapeAttr(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    // 从localStorage读取（带异常处理，防止 JSON.parse 崩溃）
    getLocal(key, defaultVal = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultVal;
        } catch (e) {
            console.warn(`[Utils.getLocal] 解析 localStorage key "${key}" 失败:`, e);
            localStorage.removeItem(key); // 清除损坏数据
            return defaultVal;
        }
    },

    // 删除localStorage
    removeLocal(key) {
        localStorage.removeItem(key);
    },

    // 模态框（contentHtml 由调用方负责转义）
    showModal(contentHtml) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const contentDiv = document.createElement('div');
        contentDiv.className = 'modal-content';
        contentDiv.innerHTML = contentHtml; // 调用方需确保 contentHtml 已转义
        overlay.appendChild(contentDiv);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        document.body.appendChild(overlay);
        return overlay;
    },

    closeModal(overlay) {
        if (overlay) overlay.remove();
    },

    // 确认对话框（message 和 title 自动转义）
    confirm(message, onConfirm, title = '确认操作') {
        const overlay = this.showModal(`
            <div style="padding: 28px;">
                <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">${this.escapeHtml(title)}</h3>
                <p style="font-size: 15px; color: #6b7280; line-height: 1.6; margin-bottom: 24px;">${this.escapeHtml(message)}</p>
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
                    <button class="btn-danger" id="confirm-btn">确认</button>
                </div>
            </div>
        `);
        overlay.querySelector('#confirm-btn').addEventListener('click', () => {
            overlay.remove();
            if (onConfirm) onConfirm();
        });
    }
};

// ==================== 项目管理 ====================

const ProjectManager = {
    // 获取所有项目（优先 localStorage）
    getProjects() {
        const stored = Utils.getLocal('projects');
        if (stored) return stored;
        Utils.saveLocal('projects', MOCK_DATA.projects);
        return MOCK_DATA.projects;
    },

    // 获取单个项目
    getProject(id) {
        return this.getProjects().find(p => p.id === id);
    },

    // 新增项目
    addProject(project) {
        const projects = this.getProjects();
        const maxId = projects.length > 0 ? projects.reduce((max, p) => Math.max(max, p.id), 0) : 0;
        project.id = maxId + 1;
        project.status = project.status || 'active';
        project.created = new Date().toISOString().slice(0, 10);
        projects.push(project);
        Utils.saveLocal('projects', projects);
        return project;
    },

    // 更新项目
    updateProject(id, updates) {
        const projects = this.getProjects();
        const idx = projects.findIndex(p => p.id === id);
        if (idx !== -1) {
            projects[idx] = { ...projects[idx], ...updates };
            Utils.saveLocal('projects', projects);
            return projects[idx];
        }
        return null;
    },

    // 删除项目（仅允许无关联题目/考试时删除，这里做软删除）
    deleteProject(id) {
        return this.updateProject(id, { status: 'deleted' });
    },

    // 获取项目的名称
    projectName(id) {
        const p = this.getProject(id);
        return p ? p.name : '未知项目';
    },

    // 生成项目选择 HTML（名称已转义）
    projectSelectHtml(id = 'project-select', selectedId = '', includePublic = false) {
        const projects = this.getProjects().filter(p => p.status !== 'deleted');
        let html = `<select class="input-field" id="${Utils.escapeAttr(id)}" style="height:42px;">`;
        if (includePublic) {
            html += `<option value="" ${selectedId === '' || selectedId === null ? 'selected' : ''}>公共题库（全公司）</option>`;
        }
        projects.forEach(p => {
            html += `<option value="${Utils.escapeAttr(p.id)}" ${String(selectedId) === String(p.id) ? 'selected' : ''}>${Utils.escapeHtml(p.name)}</option>`;
        });
        html += '</select>';
        return html;
    },

    // 多选项目标签 HTML（名称已转义）
    projectTagsHtml(selectedIds = []) {
        const projects = this.getProjects().filter(p => p.status !== 'deleted');
        return projects.map(p => {
            const checked = selectedIds.includes(p.id) ? 'checked' : '';
            return `
                <label style="display:flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:13px;white-space:nowrap;">
                    <input type="checkbox" value="${Utils.escapeAttr(p.id)}" class="project-checkbox" ${checked}> ${Utils.escapeHtml(p.name)}
                </label>
            `;
        }).join('');
    }
};

// ==================== 部门管理（支持三级部门）====================

const DepartmentManager = {
    // 获取所有部门（优先 localStorage）
    getDepartments() {
        const stored = Utils.getLocal('departments');
        if (stored) return stored;
        const defaults = [
            { id: 1, name: '产品研发部', level: 1, parentId: null },
            { id: 2, name: '市场营销部', level: 1, parentId: null },
            { id: 3, name: '财务部', level: 1, parentId: null },
            { id: 4, name: '人力资源部', level: 1, parentId: null },
            { id: 5, name: '前端组', level: 2, parentId: 1 },
            { id: 6, name: '后端组', level: 2, parentId: 1 },
            { id: 7, name: '产品组', level: 2, parentId: 1 },
            { id: 8, name: '视频二部', level: 2, parentId: 2 }
        ];
        Utils.saveLocal('departments', defaults);
        return defaults;
    },

    // 构建部门树
    getTree() {
        const depts = this.getDepartments();
        const map = {};
        depts.forEach(d => { map[d.id] = { ...d, children: [] }; });
        const tree = [];
        depts.forEach(d => {
            if (d.parentId && map[d.parentId]) {
                map[d.parentId].children.push(map[d.id]);
            } else if (d.level === 1) {
                tree.push(map[d.id]);
            }
        });
        return tree;
    },

    // 根据 ID 获取部门
    getDepartment(id) {
        if (id === undefined || id === null || id === '') return null;
        const target = parseInt(id, 10);
        return this.getDepartments().find(d => d.id === target) || null;
    },

    // 获取某部门的完整路径（一级 / 二级 / 三级）
    getFullPath(id) {
        const depts = this.getDepartments();
        const map = {};
        depts.forEach(d => { map[d.id] = d; });
        const path = [];
        let current = map[id];
        while (current) {
            path.unshift(current.name);
            current = map[current.parentId];
        }
        return path.join(' / ');
    },

    // 获取某部门的所有叶子（三级）部门 ID
    getLeafIds(parentId) {
        const depts = this.getDepartments();
        const result = [];
        const collect = (pid) => {
            const children = depts.filter(d => d.parentId === pid);
            if (children.length === 0) {
                const self = depts.find(d => d.id === pid);
                if (self) result.push(self.id);
            } else {
                children.forEach(c => collect(c.id));
            }
        };
        collect(parentId);
        return result;
    },

    // 获取某部门下所有子部门（含自身）
    getSubIds(parentId) {
        const depts = this.getDepartments();
        const result = [];
        const collect = (pid) => {
            const children = depts.filter(d => d.parentId === pid);
            children.forEach(c => {
                result.push(c.id);
                collect(c.id);
            });
        };
        collect(parentId);
        return result;
    },

    // 按级别获取部门
    getByLevel(level) {
        return this.getDepartments().filter(d => d.level === level);
    },

    // 获取子部门
    getChildren(parentId) {
        return this.getDepartments().filter(d => d.parentId === parentId);
    },

    // 新增部门
    addDepartment(dept) {
        const depts = this.getDepartments();
        const maxId = depts.length > 0 ? Math.max(...depts.map(d => d.id)) : 0;
        dept.id = maxId + 1;
        depts.push(dept);
        Utils.saveLocal('departments', depts);
        return dept;
    },

    // 更新部门
    updateDepartment(id, updates) {
        const depts = this.getDepartments();
        const idx = depts.findIndex(d => d.id === id);
        if (idx !== -1) {
            depts[idx] = { ...depts[idx], ...updates };
            Utils.saveLocal('departments', depts);
            return depts[idx];
        }
        return null;
    },

    // 删除部门（不允许删除有子部门的部门）
    deleteDepartment(id) {
        const depts = this.getDepartments();
        const target = depts.find(d => d.id === id);
        if (!target) return { success: false, msg: '部门不存在' };
        if (depts.some(d => d.parentId === id)) {
            return { success: false, msg: '请先删除该部门下的子部门' };
        }
        Utils.saveLocal('departments', depts.filter(d => d.id !== id));
        return { success: true };
    },

    // 生成三级部门级联选择器 HTML
    departmentCascaderHtml(selectedId = '', idPrefix = 'dept') {
        const depts = this.getDepartments();
        const level1 = depts.filter(d => d.level === 1);
        const level2 = depts.filter(d => d.level === 2);
        const level3 = depts.filter(d => d.level === 3);

        const selectedDept = selectedId ? this.getDepartment(selectedId) : null;
        let selectedL1 = '';
        let selectedL2 = '';
        let selectedL3 = '';
        if (selectedDept) {
            if (selectedDept.level === 1) selectedL1 = selectedDept.id;
            if (selectedDept.level === 2) {
                selectedL2 = selectedDept.id;
                const parent = this.getDepartment(selectedDept.parentId);
                if (parent) selectedL1 = parent.id;
            }
            if (selectedDept.level === 3) {
                selectedL3 = selectedDept.id;
                const l2 = this.getDepartment(selectedDept.parentId);
                if (l2) {
                    selectedL2 = l2.id;
                    const l1 = this.getDepartment(l2.parentId);
                    if (l1) selectedL1 = l1.id;
                }
            }
        }

        return `
            <div class="dept-cascader" data-prefix="${Utils.escapeAttr(idPrefix)}">
                <select class="input-field dept-level-1" data-level="1" id="${Utils.escapeAttr(idPrefix)}-l1" style="height:42px;margin-bottom:8px;">
                    <option value="">请选择一级部门</option>
                    ${level1.map(d => `<option value="${Utils.escapeAttr(d.id)}" ${String(d.id) === String(selectedL1) ? 'selected' : ''}>${Utils.escapeHtml(d.name)}</option>`).join('')}
                </select>
                <select class="input-field dept-level-2" data-level="2" id="${Utils.escapeAttr(idPrefix)}-l2" style="height:42px;margin-bottom:8px;${level2.filter(d => String(d.parentId) === String(selectedL1)).length ? '' : 'display:none;'}">
                    <option value="">请选择二级部门</option>
                    ${level2.filter(d => String(d.parentId) === String(selectedL1)).map(d => `<option value="${Utils.escapeAttr(d.id)}" ${String(d.id) === String(selectedL2) ? 'selected' : ''}>${Utils.escapeHtml(d.name)}</option>`).join('')}
                </select>
                <select class="input-field dept-level-3" data-level="3" id="${Utils.escapeAttr(idPrefix)}-l3" style="height:42px;${level3.filter(d => String(d.parentId) === String(selectedL2)).length ? '' : 'display:none;'}">
                    <option value="">请选择三级部门</option>
                    ${level3.filter(d => String(d.parentId) === String(selectedL2)).map(d => `<option value="${Utils.escapeAttr(d.id)}" ${String(d.id) === String(selectedL3) ? 'selected' : ''}>${Utils.escapeHtml(d.name)}</option>`).join('')}
                </select>
            </div>
        `;
    },

    // 从级联选择器获取选中的部门 ID（最深层有效值）
    getSelectedFromCascader(idPrefix = 'dept') {
        const l1 = document.getElementById(`${idPrefix}-l1`)?.value;
        const l2 = document.getElementById(`${idPrefix}-l2`)?.value;
        const l3 = document.getElementById(`${idPrefix}-l3`)?.value;
        return parseInt(l3 || l2 || l1 || 0, 10) || null;
    }
};

// ==================== 岗位管理 ====================

const PositionManager = {
    // 获取所有岗位
    getPositions() {
        const stored = Utils.getLocal('positions');
        if (stored) return stored;
        const defaults = [
            { id: 1, name: '前端工程师', sortOrder: 1 },
            { id: 2, name: '后端工程师', sortOrder: 2 },
            { id: 3, name: '产品经理', sortOrder: 3 },
            { id: 4, name: 'UI设计师', sortOrder: 4 },
            { id: 5, name: '测试工程师', sortOrder: 5 },
            { id: 6, name: '运营专员', sortOrder: 6 },
            { id: 7, name: '市场专员', sortOrder: 7 },
            { id: 8, name: '人事专员', sortOrder: 8 },
            { id: 9, name: '财务专员', sortOrder: 9 },
            { id: 10, name: '项目经理', sortOrder: 10 }
        ];
        Utils.saveLocal('positions', defaults);
        return defaults;
    },

    // 获取岗位名称
    getPositionName(name) {
        return name || '';
    },

    // 生成岗位下拉选择器 HTML
    positionSelectHtml(selectedName = '', id = 'position-select') {
        const positions = this.getPositions();
        return `<select class="input-field" id="${Utils.escapeAttr(id)}" style="height:42px;">
            <option value="">请选择岗位</option>
            ${positions.map(p => `<option value="${Utils.escapeAttr(p.name)}" ${p.name === selectedName ? 'selected' : ''}>${Utils.escapeHtml(p.name)}</option>`).join('')}
        </select>`;
    },

    // 新增岗位
    addPosition(pos) {
        const positions = this.getPositions();
        const maxId = positions.length > 0 ? Math.max(...positions.map(p => p.id)) : 0;
        pos.id = maxId + 1;
        positions.push(pos);
        Utils.saveLocal('positions', positions);
        return pos;
    },

    // 更新岗位
    updatePosition(id, updates) {
        const positions = this.getPositions();
        const idx = positions.findIndex(p => p.id === id);
        if (idx !== -1) {
            positions[idx] = { ...positions[idx], ...updates };
            Utils.saveLocal('positions', positions);
            return positions[idx];
        }
        return null;
    },

    // 删除岗位
    deletePosition(id) {
        const positions = this.getPositions();
        Utils.saveLocal('positions', positions.filter(p => p.id !== id));
        return { success: true };
    }
};

// ==================== 账号管理 ====================

const AccountManager = {
    // 获取所有考试人员账号
    getExamineeAccounts() {
        const stored = Utils.getLocal('examinee_accounts');
        if (stored) return stored;
        // 首次加载，写入初始数据
        Utils.saveLocal('examinee_accounts', MOCK_DATA.examineeAccounts);
        return MOCK_DATA.examineeAccounts;
    },

    // 获取所有管理员账号（优先 localStorage，与 AdminManager 保持一致）
    getAdminAccounts() {
        return AdminManager.getAdmins();
    },

    // 验证登录
    validateLogin(username, password) {
        // 优先检查管理员（使用 AdminManager，支持动态管理）
        const adminResult = AdminManager.validateLogin(username, password);
        if (adminResult) return adminResult;

        // 兼容：检查 MOCK_DATA 中的硬编码管理员
        const mockAdmin = MOCK_DATA.adminAccounts.find(a => a.username === username && a.password === password);
        if (mockAdmin) {
            if (mockAdmin.status !== 'active') return { success: false, msg: '该管理员账号已被禁用' };
            // 迁移到 AdminManager
            AdminManager.addAdmin({ ...mockAdmin, role: 'super_admin' });
            return { success: true, user: { ...mockAdmin, role: 'admin', employee_id: 'ADMIN001' } };
        }

        // 检查考试人员
        const accounts = this.getExamineeAccounts();
        const examinee = accounts.find(a => a.username === username);
        if (examinee) {
            if (examinee.password !== password) return { success: false, msg: '密码错误，请重试' };
            if (examinee.status !== 'active') return { success: false, msg: '该账号已被禁用，请联系管理员' };
            return { success: true, user: { ...examinee, role: 'employee', employee_id: examinee.username } };
        }

        return { success: false, msg: '账号不存在，请检查工号或联系管理员开通' };
    },

    // 添加单个账号
    addAccount(account) {
        const accounts = this.getExamineeAccounts();
        const maxId = accounts.length > 0 ? accounts.reduce((max, a) => Math.max(max, a.id), 0) : 0;
        account.id = maxId + 1;
        account.status = account.status || 'active';
        account.project_ids = account.project_ids || [];
        account.created = new Date().toISOString().slice(0, 10);
        // 如果传入了部门ID，同步部门名称/路径
        if (account.departmentId) {
            account.department = DepartmentManager.getFullPath(account.departmentId) || account.department || '';
        }
        accounts.push(account);
        Utils.saveLocal('examinee_accounts', accounts);
        return account;
    },

    // 批量添加账号
    batchAddAccounts(accountList) {
        const accounts = this.getExamineeAccounts();
        let maxId = accounts.length > 0 ? accounts.reduce((max, a) => Math.max(max, a.id), 0) : 0;
        const today = new Date().toISOString().slice(0, 10);
        accountList.forEach(a => {
            maxId++;
            a.id = maxId;
            a.status = a.status || 'active';
            a.project_ids = a.project_ids || [];
            a.created = a.created || today;
            if (a.departmentId) {
                a.department = DepartmentManager.getFullPath(a.departmentId) || a.department || '';
            }
            accounts.push(a);
        });
        Utils.saveLocal('examinee_accounts', accounts);
        return accountList.length;
    },

    // 自动生成账号
    autoGenerateAccounts(prefix, count, department, position, defaultPassword, departmentId) {
        const accounts = this.getExamineeAccounts();
        let maxNum = 0;
        accounts.forEach(a => {
            if (a.username.startsWith(prefix)) {
                const num = parseInt(a.username.substring(prefix.length));
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        });
        const newAccounts = [];
        const today = new Date().toISOString().slice(0, 10);
        for (let i = 1; i <= count; i++) {
            maxNum++;
            const username = prefix + String(maxNum).padStart(3, '0');
            newAccounts.push({
                username: username,
                password: defaultPassword || '123456',
                real_name: department + '考生' + maxNum,
                department: departmentId ? DepartmentManager.getFullPath(departmentId) : department,
                departmentId: departmentId || null,
                position: position || '待分配',
                status: 'active',
                project_ids: [],
                created: today
            });
        }
        this.batchAddAccounts(newAccounts);
        return newAccounts;
    },

    // 更新账号
    updateAccount(id, updates) {
        const accounts = this.getExamineeAccounts();
        const idx = accounts.findIndex(a => a.id === id);
        if (idx !== -1) {
            if (updates.departmentId) {
                updates.department = DepartmentManager.getFullPath(updates.departmentId) || updates.department || '';
            }
            accounts[idx] = { ...accounts[idx], ...updates };
            Utils.saveLocal('examinee_accounts', accounts);
            return accounts[idx];
        }
        return null;
    },

    // 删除账号
    deleteAccount(id) {
        let accounts = this.getExamineeAccounts();
        accounts = accounts.filter(a => a.id !== id);
        Utils.saveLocal('examinee_accounts', accounts);
    },

    // 重置密码
    resetPassword(id) {
        return this.updateAccount(id, { password: '123456' });
    },

    // 切换状态
    toggleStatus(id) {
        const accounts = this.getExamineeAccounts();
        const account = accounts.find(a => a.id === id);
        if (account) {
            return this.updateAccount(id, { status: account.status === 'active' ? 'disabled' : 'active' });
        }
        return null;
    },

    // 检查用户名是否已存在
    isUsernameExists(username, excludeId) {
        const accounts = this.getExamineeAccounts();
        return accounts.some(a => a.username === username && a.id !== excludeId);
    },

    // 获取账号参与的项目ID列表
    getProjectIds(id) {
        const account = this.getExamineeAccounts().find(a => a.id === id);
        return account && account.project_ids ? account.project_ids : [];
    },

    // 设置账号参与的项目（支持后期换项目）
    setProjectIds(id, projectIds) {
        return this.updateAccount(id, { project_ids: Array.isArray(projectIds) ? projectIds : [] });
    }
};

// ==================== 题库管理 ====================

const QuestionBankManager = {
    // 获取所有题库题目（优先 localStorage，自动修复旧格式数据）
    getQuestions() {
        const stored = Utils.getLocal('question_bank');
        if (stored && Array.isArray(stored)) {
            // 自动修复旧格式：options 为数字、answer 为字母等
            let needSave = false;
            const fixed = stored.map(q => {
                if (!q) return q;
                const clone = { ...q };
                // 修复 options：旧数据可能是数字，需要转换为空数组或默认选项
                if (clone.type !== 'short' && !Array.isArray(clone.options)) {
                    clone.options = QuestionBankManager._normalizeOptions(clone);
                    needSave = true;
                }
                // 修复 answer：旧数据可能是字母/文字，需要转换为数字索引
                if (clone.type !== 'short' && typeof clone.answer !== 'number' && !Array.isArray(clone.answer)) {
                    clone.answer = QuestionBankManager._normalizeAnswer(clone);
                    needSave = true;
                }
                return clone;
            });
            if (needSave) {
                Utils.saveLocal('question_bank', fixed);
            }
            return fixed;
        }
        Utils.saveLocal('question_bank', MOCK_DATA.questionBank);
        return MOCK_DATA.questionBank;
    },

    // 内部：把旧格式 options 数字转换为默认选项数组
    _normalizeOptions(q) {
        const count = parseInt(q.options) || 4;
        if (q.type === 'judge') return ['正确', '错误'];
        return Array.from({ length: Math.max(2, count) }, (_, i) => '选项 ' + String.fromCharCode(65 + i));
    },

    // 内部：把旧格式 answer 转换为数字索引
    _normalizeAnswer(q) {
        if (q.type === 'judge') {
            if (q.answer === '正确' || q.answer === '对' || q.answer === 'A') return 0;
            return 1;
        }
        if (q.type === 'multiple') {
            if (typeof q.answer === 'string') {
                return q.answer.split('').map(ch => ch.charCodeAt(0) - 65).filter(n => n >= 0);
            }
            return [];
        }
        // 单选题
        if (typeof q.answer === 'string') {
            const idx = q.answer.charCodeAt(0) - 65;
            if (idx >= 0 && idx < (q.options || []).length) return idx;
        }
        return 0;
    },

    // 按作用域筛选
    getQuestionsByScope(scope, projectId) {
        let questions = this.getQuestions();
        if (scope === 'public') {
            return questions.filter(q => !q.scope || q.scope === 'public');
        }
        if (scope === 'project') {
            if (projectId) {
                return questions.filter(q => q.scope === 'project' && String(q.project_id) === String(projectId));
            }
            return questions.filter(q => q.scope === 'project');
        }
        return questions;
    },

    // 获取单题
    getQuestion(id) {
        return this.getQuestions().find(q => q.id === id);
    },

    // 新增题目
    addQuestion(question) {
        const questions = this.getQuestions();
        const maxId = questions.length > 0 ? questions.reduce((max, q) => Math.max(max, q.id), 0) : 0;
        question.id = maxId + 1;
        question.status = 'active';
        question.created = new Date().toISOString().slice(0, 10);
        question.scope = question.scope || 'public';
        question.project_id = question.scope === 'project' ? (question.project_id || null) : null;
        question.options = Array.isArray(question.options) ? question.options : this._normalizeOptions(question);
        if (question.type !== 'short' && (typeof question.answer !== 'number' && !Array.isArray(question.answer))) {
            question.answer = this._normalizeAnswer(question);
        }
        questions.push(question);
        Utils.saveLocal('question_bank', questions);
        return question;
    },

    // 批量新增
    batchAddQuestions(questionList, scope, projectId) {
        const questions = this.getQuestions();
        let maxId = questions.length > 0 ? questions.reduce((max, q) => Math.max(max, q.id), 0) : 0;
        questionList.forEach(q => {
            maxId++;
            q.id = maxId;
            q.status = 'active';
            q.scope = scope || 'public';
            q.project_id = scope === 'project' ? (projectId || null) : null;
            q.options = Array.isArray(q.options) ? q.options : this._normalizeOptions(q);
            if (q.type !== 'short' && (typeof q.answer !== 'number' && !Array.isArray(q.answer))) {
                q.answer = this._normalizeAnswer(q);
            }
            questions.push(q);
        });
        Utils.saveLocal('question_bank', questions);
        return questionList.length;
    },

    // 更新题目
    updateQuestion(id, updates) {
        const questions = this.getQuestions();
        const idx = questions.findIndex(q => q.id === id);
        if (idx !== -1) {
            questions[idx] = { ...questions[idx], ...updates };
            Utils.saveLocal('question_bank', questions);
            return questions[idx];
        }
        return null;
    },

    // 删除题目
    deleteQuestion(id) {
        return this.updateQuestion(id, { status: 'deleted' });
    },

    // 获取题库统计
    getStats() {
        const questions = this.getQuestions().filter(q => q.status !== 'deleted');
        return {
            total: questions.length,
            public: questions.filter(q => !q.scope || q.scope === 'public').length,
            project: questions.filter(q => q.scope === 'project').length,
            single: questions.filter(q => q.type === 'single').length,
            multiple: questions.filter(q => q.type === 'multiple').length,
            judge: questions.filter(q => q.type === 'judge').length,
            short: questions.filter(q => q.type === 'short').length
        };
    }
};

// ==================== 考试管理 ====================

const ExamManager = {
    // 获取所有考试（优先 localStorage）
    getExams() {
        const stored = Utils.getLocal('admin_exams');
        if (stored) return stored;
        Utils.saveLocal('admin_exams', MOCK_DATA.adminExamList);
        return MOCK_DATA.adminExamList;
    },

    // 成绩数据本地存储，数据通过 ResultManager 统一存取
    // Client-Side 分页：返回 { data: [], total: number }
    // 讨论#4 决策方案 - 分页功能实现
    getExamsPaginated(page = 1, pageSize = 10, filters = {}) {
        let exams = this.getExams();

        // 应用筛选条件
        if (filters.scope && filters.scope !== 'all') {
            exams = exams.filter(e => e.scope === filters.scope);
        }
        if (filters.status) {
            exams = exams.filter(e => e.status === filters.status);
        }
        if (filters.search) {
            const keyword = filters.search.toLowerCase();
            exams = exams.filter(e => (e.title || '').toLowerCase().includes(keyword));
        }

        const total = exams.length;
        const startIndex = (page - 1) * pageSize;
        const data = exams.slice(startIndex, startIndex + pageSize);

        return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    },

    // 获取单场考试
    getExam(id) {
        if (id === undefined || id === null || id === '') return null;
        const target = String(id);
        return this.getExams().find(e => e && String(e.id) === target);
    },

    // 新增考试
    addExam(exam) {
        const exams = this.getExams();
        const maxId = exams.length > 0 ? exams.reduce((max, e) => Math.max(max, e.id), 0) : 0;
        exam.id = maxId + 1;
        exam.scope = exam.scope || 'public';
        exam.project_id = exam.scope === 'project' ? (exam.project_id || null) : null;
        exam.status = exam.status || 'draft';
        exam.created_at = new Date().toISOString();
        exams.push(exam);
        Utils.saveLocal('admin_exams', exams);

        // 讨论#3 决策：发布时自动生成题目快照
        if (exam.status === 'published' && exam.rules) {
            this.generateExamSnapshot(exam.id, exam.rules, exam.scope, exam.project_id);
        }

        return exam;
    },

    // 更新考试
    updateExam(id, updates) {
        const exams = this.getExams();
        const idx = exams.findIndex(e => e.id === id);
        if (idx !== -1) {
            exams[idx] = { ...exams[idx], ...updates };
            Utils.saveLocal('admin_exams', exams);
            return exams[idx];
        }
        return null;
    },

    // 删除考试
    deleteExam(id) {
        const exams = this.getExams();
        const filtered = exams.filter(e => e.id !== id);
        Utils.saveLocal('admin_exams', filtered);
        // 同时清理对应的题目快照
        this.deleteExamSnapshot(id);
    },

    // 按作用域筛选
    getExamsByScope(scope, projectId) {
        let exams = this.getExams();
        if (scope === 'public') {
            return exams.filter(e => !e.scope || e.scope === 'public');
        }
        if (scope === 'project') {
            if (projectId) {
                return exams.filter(e => e.scope === 'project' && String(e.project_id) === String(projectId));
            }
            return exams.filter(e => e.scope === 'project');
        }
        return exams;
    },

    // 获取考生可见的考试（公共考试 + 该考生参与项目的考试）
    // 注意：已结束的考试仍需展示给考生查看成绩，不应过滤掉
    getExamsForExaminee(projectIds) {
        let exams = this.getExams().filter(e => e.status !== 'deleted');
        return exams.filter(e => {
            if (!e.scope || e.scope === 'public') return true;
            if (e.scope === 'project' && projectIds) {
                return projectIds.some(pid => String(e.project_id) === String(pid));
            }
            return false;
        });
    },

    // ==================== 讨论#3：题库快照系统 ====================
    // 快照数据存储在 localStorage key: exam_question_snapshot
    // 结构: { [examId]: [{ id, type, content, options, answer, analysis, difficulty, category, score }] }

    _getSnapshots() {
        return Utils.getLocal('exam_question_snapshot') || {};
    },

    _saveSnapshots(snapshots) {
        Utils.saveLocal('exam_question_snapshot', snapshots);
    },

    // 根据抽题规则从题库生成快照并保存
    generateExamSnapshot(examId, rules, scope, projectId) {
        let allQuestions = QuestionBankManager.getQuestions().filter(q => q.status !== 'deleted');

        // 按作用域过滤可用题库
        if (scope === 'project' && projectId) {
            allQuestions = allQuestions.filter(q => q.scope === 'project' && String(q.project_id) === String(projectId));
        } else {
            allQuestions = allQuestions.filter(q => !q.scope || q.scope === 'public');
        }

        // 按规则抽取题目
        const snapshotQuestions = [];
        rules.forEach(rule => {
            let pool = allQuestions.filter(q => {
                if (q.type !== rule.type) return false;
                if (rule.difficulty && q.difficulty !== parseInt(rule.difficulty)) return false;
                // 避免重复抽取
                if (snapshotQuestions.some(sq => sq.originalId === q.id)) return false;
                return true;
            });

            // Fisher-Yates 洗牌随机抽取
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }

            const selected = pool.slice(0, rule.count);
            selected.forEach(q => {
                snapshotQuestions.push({
                    originalId: q.id,
                    type: q.type,
                    content: q.content,
                    options: q.options ? [...q.options] : null,
                    answer: Array.isArray(q.answer) ? [...q.answer] : q.answer,
                    analysis: q.analysis || '',
                    difficulty: q.difficulty,
                    category: q.category,
                    score: rule.score || 10
                });
            });
        });

        // 保存快照
        if (snapshotQuestions.length > 0) {
            const snapshots = this._getSnapshots();
            snapshots[examId] = snapshotQuestions;
            this._saveSnapshots(snapshots);
        }

        return snapshotQuestions;
    },

    // 获取考试的题目快照（优先读取快照，兼容旧数据）
    getExamQuestions(examId) {
        const snapshots = this._getSnapshots();
        if (snapshots[examId]) {
            return snapshots[examId];
        }

        // 兼容旧数据：如果快照不存在且考试有题目，尝试动态生成
        const exam = this.getExam(examId);
        if (exam && exam.rules) {
            return this.generateExamSnapshot(examId, exam.rules, exam.scope, exam.project_id);
        }

        // 最终兜底：返回空数组
        return [];
    },

    // 重新组卷：覆盖已有快照
    regenerateSnapshot(examId, rules, scope, projectId) {
        const oldSnapshots = this._getSnapshots();
        oldSnapshots[examId] = null;
        delete oldSnapshots[examId];
        this._saveSnapshots(oldSnapshots);
        return this.generateExamSnapshot(examId, rules, scope, projectId);
    },

    // 删除考试时清理对应快照
    deleteExamSnapshot(examId) {
        const snapshots = this._getSnapshots();
        if (snapshots[examId]) {
            delete snapshots[examId];
            this._saveSnapshots(snapshots);
        }
    },

    // 检查考试是否有快照锁定
    hasSnapshot(examId) {
        const snapshots = this._getSnapshots();
        return !!snapshots[examId] && snapshots[examId].length > 0;
    }
};

// ==================== 考试结果管理 ====================

const ResultManager = {
    // 获取所有考试结果（优先 localStorage）
    getResults() {
        const stored = Utils.getLocal('exam_results');
        if (stored) return stored;
        Utils.saveLocal('exam_results', []);
        return [];
    },

    // 获取单场考试的所有结果
    getResultsByExam(examId) {
        if (examId === undefined || examId === null || examId === '') return [];
        const target = String(examId);
        return this.getResults().filter(r => r && r.examId !== undefined && String(r.examId) === target);
    },

    // 获取某考生的所有结果
    getResultsByExaminee(username) {
        return this.getResults().filter(r => r.username === username);
    },

    // 获取待阅卷的结果（含简答题）
    getPendingReview(examId) {
        return this.getResults().filter(r =>
            String(r.examId) === String(examId) && r.manualReviewCount > 0 && !r.reviewCompleted
        );
    },

    // 新增考试结果
    addResult(result) {
        const results = this.getResults();
        const maxId = results.length > 0 ? results.reduce((max, r) => Math.max(max, r.id || 0), 0) : 0;
        result.id = maxId + 1;
        result.submittedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        result.reviewCompleted = result.manualReviewCount === 0; // 无简答题则自动完成
        // 保存客观题得分快照，阅卷前员工端只展示此分数
        result.objectiveScore = result.autoScore !== undefined ? result.autoScore : result.score;
        // 有主观题时，passed 状态待阅卷后才能确定
        if (result.manualReviewCount > 0) {
            result.passed = null; // 待阅卷
        }
        results.push(result);
        Utils.saveLocal('exam_results', results);
        return result;
    },

    // 获取考生某次考试的结果（用于员工端成绩查询，返回最新数据）
    getResultByExaminee(examId, username) {
        const results = this.getResults();
        return results.find(r =>
            String(r.examId) === String(examId) && r.username === username
        ) || null;
    },

    // 获取展示分数：阅卷完成显示总分，未完成显示客观题得分
    getDisplayScore(result) {
        if (!result) return 0;
        if (result.reviewCompleted) return result.score || 0;
        return result.objectiveScore !== undefined ? result.objectiveScore : (result.autoScore || result.score || 0);
    },

    // 阅卷完成后同步更新 localStorage 中的 exam_result（员工端成绩查询用）
    syncExamResult(examId, username) {
        const result = this.getResultByExaminee(examId, username);
        if (!result) return;
        const localResult = Utils.getLocal('exam_result');
        // 只更新属于同一场考试且同一用户的结果
        if (localResult && String(localResult.examId) === String(examId) &&
            (localResult.username === username || localResult.username === (Utils.getLocal('current_user') || {}).username)) {
            Utils.saveLocal('exam_result', result);
        }
    },

    // 阅卷打分：对某道简答题打分
    scoreQuestion(resultId, questionIndex, score, comment) {
        const results = this.getResults();
        const idx = results.findIndex(r => r.id === resultId);
        if (idx === -1) return null;
        const result = results[idx];
        if (!result.results || !result.results[questionIndex]) return null;
        result.results[questionIndex].reviewScore = score;
        result.results[questionIndex].reviewComment = comment || '';
        result.results[questionIndex].isCorrect = score > 0;
        // 重新计算总分
        this.recalcScore(result);
        results[idx] = result;
        Utils.saveLocal('exam_results', results);
        // 阅卷完成后同步到员工端 localStorage
        if (result.reviewCompleted) {
            this.syncExamResult(result.examId, result.username);
        }
        return result;
    },

    // 重新计算总分
    recalcScore(result) {
        let correctCount = 0;
        let wrongCount = 0;
        let autoScore = 0;
        let manualScore = 0;

        // 兼容旧数据：未记录每题分值时，使用总分除以总题数作为默认值
        const defaultScore = result.totalScore && result.results.length > 0
            ? result.totalScore / result.results.length
            : 0;

        result.results.forEach(r => {
            if (r.manualReview) {
                if (r.reviewScore !== undefined) {
                    const maxScore = r.maxScore || r.score || defaultScore;
                    manualScore += Math.min(r.reviewScore, maxScore);
                    if (r.reviewScore > 0) correctCount++;
                    else wrongCount++;
                }
            } else {
                const qScore = r.score || defaultScore;
                if (r.isCorrect) {
                    correctCount++;
                    autoScore += qScore;
                } else {
                    wrongCount++;
                }
            }
        });

        // 保留客观题得分快照
        result.objectiveScore = result.objectiveScore !== undefined ? result.objectiveScore : autoScore;
        result.autoScore = autoScore;

        // 阅卷完成后才更新总分和通过状态
        const pending = result.results.filter(r => r.manualReview && r.reviewScore === undefined);
        if (pending.length === 0) {
            result.score = Math.round(autoScore + manualScore);
            result.passed = result.score >= (result.passScore || 60);
            result.reviewCompleted = true;
        } else {
            // 部分阅卷中：总分仍为客观分，通过状态待定
            result.score = Math.round(autoScore + manualScore);
            result.reviewCompleted = false;
            result.passed = null;
        }
        result.correctCount = correctCount;
        result.wrongCount = wrongCount;
    },

    // 删除结果
    deleteResult(id) {
        const results = this.getResults().filter(r => r.id !== id);
        Utils.saveLocal('exam_results', results);
    },

    // 获取考试统计
    getExamStats(examId) {
        const results = this.getResultsByExam(examId);
        if (results.length === 0) return null;
        const scores = results.map(r => r.score);
        const reviewedOnly = results.filter(r => r.reviewCompleted);
        const passed = reviewedOnly.filter(r => r.passed === true);
        const pendingReview = results.filter(r => r.manualReviewCount > 0 && !r.reviewCompleted).length;
        return {
            total: results.length,
            avgScore: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
            maxScore: scores.reduce((max, s) => Math.max(max, s), 0),
            minScore: scores.reduce((min, s) => Math.min(min, s), Infinity),
            passRate: reviewedOnly.length > 0 ? Math.round((passed.length / reviewedOnly.length) * 100) : 0,
            pendingReview: pendingReview
        };
    }
};

// ==================== 管理员管理 ====================

const AdminManager = {
    // 获取所有管理员（优先 localStorage）
    getAdmins() {
        const stored = Utils.getLocal('admin_accounts');
        if (stored) return stored;
        const admins = [
            ...MOCK_DATA.adminAccounts.map(a => ({
                ...a,
                role: 'super_admin', // 超级管理员
                project_ids: [], // 超级管理员看所有项目
                modules: ['dashboard', 'questions', 'exams', 'statistics', 'users', 'settings'] // 可访问模块
            }))
        ];
        Utils.saveLocal('admin_accounts', admins);
        return admins;
    },

    // 验证登录
    validateLogin(username, password) {
        const admins = this.getAdmins();
        const admin = admins.find(a => a.username === username);
        if (admin && admin.password === password) {
            if (admin.status !== 'active') return { success: false, msg: '该管理员账号已被禁用' };
            return { success: true, user: { ...admin, role: 'admin', employee_id: 'ADMIN' + admin.id } };
        }
        return null;
    },

    // 新增管理员
    addAdmin(admin) {
        const admins = this.getAdmins();
        const maxId = admins.length > 0 ? admins.reduce((max, a) => Math.max(max, a.id), 0) : 0;
        admin.id = maxId + 1;
        admin.status = admin.status || 'active';
        admin.role = admin.role || 'admin';
        admin.project_ids = admin.project_ids || [];
        admin.modules = admin.modules || ['dashboard', 'questions', 'exams', 'statistics'];
        admin.created = new Date().toISOString().slice(0, 10);
        admins.push(admin);
        Utils.saveLocal('admin_accounts', admins);
        return admin;
    },

    // 更新管理员
    updateAdmin(id, updates) {
        const admins = this.getAdmins();
        const idx = admins.findIndex(a => a.id === id);
        if (idx !== -1) {
            admins[idx] = { ...admins[idx], ...updates };
            Utils.saveLocal('admin_accounts', admins);
            return admins[idx];
        }
        return null;
    },

    // 删除管理员
    deleteAdmin(id) {
        let admins = this.getAdmins();
        admins = admins.filter(a => a.id !== id);
        Utils.saveLocal('admin_accounts', admins);
    },

    // 获取管理员可见的项目（超级管理员返回所有项目）
    getVisibleProjects(adminId) {
        const admin = this.getAdmins().find(a => a.id === adminId);
        if (!admin) return [];
        if (admin.role === 'super_admin') {
            return ProjectManager.getProjects().filter(p => p.status !== 'deleted');
        }
        return ProjectManager.getProjects().filter(p =>
            p.status !== 'deleted' && admin.project_ids.includes(p.id)
        );
    },

    // 获取管理员可见的项目ID列表
    getVisibleProjectIds(adminId) {
        return this.getVisibleProjects(adminId).map(p => p.id);
    },

    // 检查管理员是否有权限访问某模块
    canAccessModule(adminId, module) {
        const admin = this.getAdmins().find(a => a.id === adminId);
        if (!admin) return false;
        if (admin.role === 'super_admin') return true;
        return admin.modules && admin.modules.includes(module);
    },

    // 角色文本
    roleText(role) {
        const map = {
            super_admin: '超级管理员',
            admin: '管理员',
            reviewer: '阅卷员'
        };
        return map[role] || role;
    }
};

// ==================== 系统设置管理 ====================

const SettingsManager = {
    // 获取系统设置（优先 localStorage）
    getSettings() {
        const stored = Utils.getLocal('system_settings');
        if (stored) return stored;
        const defaults = {
            // 功能模块开关
            modules: {
                dashboard: { name: '数据看板', enabled: true },
                questions: { name: '题库管理', enabled: true },
                exams: { name: '考试管理', enabled: true },
                statistics: { name: '成绩统计', enabled: true },
                users: { name: '人员管理', enabled: true },
                settings: { name: '系统设置', enabled: true },
                review: { name: '阅卷中心', enabled: true }
            },
            // 考试设置
            exam: {
                defaultPassScore: 60,
                defaultDuration: 60,
                maxCheatCount: 3,
                enableAntiCheat: true,
                enableShuffle: true
            },
            // 题目分类
            categories: [
                { id: 1, name: '公共红线考试' },
                { id: 2, name: '项目红线考试' }
            ]
        };
        Utils.saveLocal('system_settings', defaults);
        return defaults;
    },

    // 更新设置
    updateSettings(updates) {
        const current = this.getSettings();
        const merged = { ...current, ...updates };
        Utils.saveLocal('system_settings', merged);
        return merged;
    },

    // 切换模块开关
    toggleModule(moduleKey, enabled) {
        const settings = this.getSettings();
        if (settings.modules[moduleKey]) {
            settings.modules[moduleKey].enabled = enabled;
            Utils.saveLocal('system_settings', settings);
        }
        return settings;
    },

    // 获取启用的模块列表
    getEnabledModules() {
        const settings = this.getSettings();
        return Object.entries(settings.modules)
            .filter(([key, mod]) => mod.enabled)
            .map(([key, mod]) => ({ key, name: mod.name }));
    },

    // 获取分类列表
    getCategories() {
        return this.getSettings().categories;
    },

    // 新增分类
    addCategory(name) {
        const settings = this.getSettings();
        const maxId = settings.categories.length > 0
            ? settings.categories.reduce((max, c) => Math.max(max, c.id), 0) : 0;
        settings.categories.push({ id: maxId + 1, name });
        Utils.saveLocal('system_settings', settings);
        return settings.categories;
    },

    // 删除分类
    deleteCategory(id) {
        const settings = this.getSettings();
        settings.categories = settings.categories.filter(c => c.id !== id);
        Utils.saveLocal('system_settings', settings);
        return settings.categories;
    }
};

// ==================== 题目解析器（多格式导入） ====================

const QuestionParser = {
    // 全角转半角
    toHalfWidth(str) {
        if (!str) return '';
        return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
    },

    // 从题干中提取内嵌答案，如 "...（A）"、"...(ABCD)"、"...（A B C D）"
    extractEmbeddedAnswer(content) {
        // 支持全角/半角括号，括号内可含空格、字母
        const match = content.match(/[（(]\s*([A-Fa-f\s]+)\s*[）)]\s*$/);
        if (match) {
            const letters = this.toHalfWidth(match[1]).replace(/\s+/g, '').toUpperCase().match(/[A-F]/g);
            if (letters) {
                return {
                    content: content.replace(/[（(]\s*[A-Fa-f\s]+\s*[）)]\s*$/, '').trim(),
                    answer: letters
                };
            }
        }
        return { content, answer: null };
    },

    // 解析单行内的多个选项，如 "A.短剧安卓素材 B.短剧ios素材 C.短剧通用素材"
    parseInlineOptions(line) {
        const options = [];
        // 按 A. B. C. D. 拆分，支持 . 、 ) ） 后接内容
        const parts = line.split(/(?=[A-F][\.\、\)）])/);
        parts.forEach(part => {
            const m = part.trim().match(/^([A-F])[\.\、\)）]\s*(.+)$/);
            if (m) {
                options.push({ letter: this.toHalfWidth(m[1]).toUpperCase(), text: m[2].trim() });
            }
        });
        return options;
    },

    // 解析纯文本内容为题目数组
    parseText(text) {
        // 去掉 PDF 提取产生的控制字符（如 0x01），保留普通空白
        const rawLines = text.replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f]/g, '')
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l.length > 0);

        // 预处理：将内嵌在同一行的多个选项拆成多行，方便后续处理
        const lines = [];
        rawLines.forEach(line => {
            // 题目行或答案/解析行不拆分
            if (/^(\d+[\.\、\)）]|[(（]\d+[)）]|[一二三四五六七八九十]+[\、\.]|答案[:：]|解析[:：]|难度[:：]|分类[:：]|类别[:：])/.test(line)) {
                lines.push(line);
            } else {
                const inline = this.parseInlineOptions(line);
                if (inline.length > 1) {
                    inline.forEach(opt => lines.push(`${opt.letter}. ${opt.text}`));
                } else {
                    lines.push(line);
                }
            }
        });

        const questions = [];
        let current = null;
        let shortAnswerBuffer = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 检测题目开头：数字+点/括号，如 "1." "1、" "(1)" "一、"
            const qMatch = line.match(/^(\d+[\.\、\)）]|[(（]\d+[)）]|[一二三四五六七八九十]+[\、\.])\s*/);
            const isQuestionStart = qMatch && !/^[A-D]\./.test(line);

            if (isQuestionStart) {
                const nextContent = line.replace(qMatch[0], '').trim();

                // 跳过章节标题，如 "一、选择题..." "二、简答题..."
                if (/^(选择|判断|简答|单选|多选|问答|论述)/.test(nextContent) ||
                    /(选择|判断|简答|单选|多选|问答|论述).*([共有]|共计|题)/.test(nextContent)) {
                    continue;
                }

                // 简答题答案续行：当前是简答题且新行像答案分点（无问号/疑问词）
                const isShortAnswerContinuation = current && current.type === 'short' &&
                    /^\d+[\.\、]/.test(line) &&
                    !/[?？]/.test(nextContent) &&
                    !/请|简述|说明|解释|哪些|什么|为什么|怎么/.test(nextContent);

                if (isShortAnswerContinuation) {
                    shortAnswerBuffer.push(line);
                    continue;
                }

                // 保存上一题
                if (current) {
                    if (current.type === 'short' && shortAnswerBuffer.length > 0 && !current.answer) {
                        current.answer = shortAnswerBuffer.join('\n');
                    }
                    questions.push(this.finalizeQuestion(current));
                    shortAnswerBuffer = [];
                }

                let content = nextContent;

                // 去掉分值标记，如 (15分)、（3分）
                content = content.replace(/[（(]\s*\d+\s*分\s*[）)]/g, '').trim();

                // 提取内嵌答案
                const extracted = this.extractEmbeddedAnswer(content);

                current = {
                    content: extracted.content,
                    rawAnswer: extracted.answer,
                    options: [],
                    answer: null,
                    analysis: '',
                    type: null,
                    difficulty: 1
                };

                // 检测题型关键词（含括号标记如 (多选)、（单选）等）
                if (/[（(]\s*多选|多选|multiple/i.test(content)) {
                    current.type = 'multiple';
                } else if (/[（(]\s*单选|单选|single/i.test(content)) {
                    current.type = 'single';
                } else if (/[（(]\s*判断|判断|judge|对错|对\/错/i.test(content)) {
                    current.type = 'judge';
                } else if (/[（(]\s*简答|简答|short|问答|论述|名词解释/i.test(content)) {
                    current.type = 'short';
                }

                // 如果已经提取到多个答案字母，直接预判定为多选
                if (extracted.answer && extracted.answer.length > 1) {
                    current.type = 'multiple';
                }

                // 仍未识别题型，但内容明显是主观题（要求说明/解释/分点/简述）
                if (!current.type && (/请.*说明|请.*解释|请.*简述|分点|简述|解释|说明/.test(content) || /[?？]\s*$/.test(content))) {
                    current.type = 'short';
                }
                continue;
            }

            if (!current) continue;

            // 检测选项：A. B. C. D. 或 A、B、C、D（含全角）
            const optionMatch = line.match(/^([A-FＡ-Ｆ])[\.\、\)）]\s*(.+)/);
            if (optionMatch && current.type !== 'short') {
                const letter = this.toHalfWidth(optionMatch[1]).toUpperCase();
                const optionText = optionMatch[2].trim();
                const idx = letter.charCodeAt(0) - 65;
                // 按字母顺序填入，避免乱序
                current.options[idx] = optionText;
                continue;
            }

            // 检测判断题选项（独立行）
            if (/^(正确|对|√|T|True)\s*$/i.test(line) || /^(错误|错|×|F|False)\s*$/i.test(line)) {
                if (current.options.length < 2) {
                    current.options.push(line);
                }
                continue;
            }

            // 检测答案标记（支持多种格式：答案：/正确答案：/参考答案：/【答案】/[答案]）
            if (/^(答案|正确答案|参考答案|标准答案)[:：]\s*/i.test(line) || /^[【\[]\s*答案\s*[】\]]\s*[:：]?\s*/i.test(line)) {
                const answerText = line.replace(/^(答案|正确答案|参考答案|标准答案)[:：]\s*/i, '').replace(/^[【\[]\s*答案\s*[】\]]\s*[:：]?\s*/i, '');
                current = this.parseAnswer(current, answerText);
                continue;
            }

            // 检测解析标记（支持多种格式）
            if (/^(解析|答案解析|解析说明)[:：]\s*/i.test(line) || /^[【\[]\s*解析\s*[】\]]\s*[:：]?\s*/i.test(line)) {
                current.analysis = line.replace(/^(解析|答案解析|解析说明)[:：]\s*/i, '').replace(/^[【\[]\s*解析\s*[】\]]\s*[:：]?\s*/i, '');
                continue;
            }

            // 检测难度
            if (/^难度[:：]\s*/i.test(line)) {
                const diffText = line.replace(/^难度[:：]\s*/i, '');
                if (/简单|容易|easy/i.test(diffText)) current.difficulty = 1;
                else if (/中等|medium/i.test(diffText)) current.difficulty = 2;
                else if (/困难|难|hard/i.test(diffText)) current.difficulty = 3;
                continue;
            }

            // 检测分类
            if (/^分类[:：]|^类别[:：]/i.test(line)) {
                current.category = line.replace(/^分类[:：]|^类别[:：]/i, '').trim();
                continue;
            }

            // 简答题：收集答案直到下一题或显式标记
            if (current.type === 'short') {
                shortAnswerBuffer.push(line);
                continue;
            }

            // 多行题干续接（尚未遇到选项时）
            if (current.options.length === 0) {
                current.content += ' ' + line;
            }
        }

        // 保存最后一题
        if (current) {
            if (current.type === 'short' && shortAnswerBuffer.length > 0 && !current.answer) {
                current.answer = shortAnswerBuffer.join('\n');
            }
            questions.push(this.finalizeQuestion(current));
        }

        return questions;
    },

    // 解析答案
    parseAnswer(question, answerText) {
        answerText = this.toHalfWidth(answerText).trim().toUpperCase();

        // 优先使用题干内嵌答案
        let letters = question.rawAnswer || answerText.match(/[A-F]/g);

        if (question.type === 'short') {
            question.answer = answerText;
            return question;
        }

        // 判断题：A/正确/对 = 0；B/错误/错 = 1
        const isJudge = question.type === 'judge' ||
            (question.options.length === 2 && /正确|错误|对|错|√|×/i.test(question.options.join('')));
        if (isJudge) {
            question.type = question.type || 'judge';
            // 判断题选项标准化为 [正确, 错误]
            question.options = ['正确', '错误'];
            if (letters && letters.length === 1) {
                question.answer = letters[0] === 'A' ? 0 : 1;
            } else if (/正确|对|√|T/i.test(answerText)) {
                question.answer = 0;
            } else if (/错误|错|×|F/i.test(answerText)) {
                question.answer = 1;
            }
            return question;
        }

        // 单选或多选
        if (letters) {
            letters = Array.isArray(letters) ? letters : [letters];
            if (letters.length > 1) {
                question.type = 'multiple';
                question.answer = letters.map(l => l.charCodeAt(0) - 65);
            } else {
                question.type = question.type === 'multiple' ? 'multiple' : 'single';
                question.answer = letters[0].charCodeAt(0) - 65;
            }
        }

        return question;
    },

    // 完善题目信息
    finalizeQuestion(q) {
        // 压缩选项数组（去除空槽位）
        q.options = q.options.filter(opt => opt !== undefined && opt !== null && String(opt).trim() !== '');

        // 优先使用题干内嵌答案
        if (q.rawAnswer && !q.answer) {
            q = this.parseAnswer(q, q.rawAnswer.join(''));
        }

        // 自动判断题型
        if (!q.type) {
            if (q.options.length === 0) {
                q.type = 'short';
            } else if (q.options.length === 2 && /正确|错误|对|错|√|×/i.test(q.options.join(''))) {
                q.type = 'judge';
            } else if (Array.isArray(q.answer) && q.answer.length > 1) {
                q.type = 'multiple';
            } else {
                q.type = 'single';
            }
        }

        // 判断题确保有正确/错误两个选项
        if (q.type === 'judge') {
            q.options = ['正确', '错误'];
            if (typeof q.answer !== 'number') {
                q.answer = 0;
            }
        }

        // 简答题不需要选项
        if (q.type === 'short') {
            q.options = null;
            if (!q.answer) q.answer = '';
        }

        // 单选题答案转为数字
        if (q.type === 'single' && typeof q.answer === 'string') {
            const match = q.answer.match(/[A-F]/);
            if (match) q.answer = match[0].charCodeAt(0) - 65;
            else q.answer = 0;
        }

        // 设置默认分类
        if (!q.category) q.category = '未分类';

        // 清理临时字段
        delete q.rawAnswer;

        return q;
    },

    // 从Excel数据解析题目（每行为一道题）
    parseExcelRows(rows, fieldMap) {
        const questions = [];
        rows.forEach(row => {
            if (!row[fieldMap.content]) return;
            const q = {
                content: String(row[fieldMap.content]).trim(),
                type: null,
                options: [],
                answer: null,
                analysis: '',
                difficulty: 1,
                category: row[fieldMap.category] ? String(row[fieldMap.category]).trim() : '未分类'
            };

            // 题型
            if (row[fieldMap.type]) {
                const typeStr = String(row[fieldMap.type]).trim().toLowerCase();
                if (/单选|single/i.test(typeStr)) q.type = 'single';
                else if (/多选|multiple/i.test(typeStr)) q.type = 'multiple';
                else if (/判断|judge/i.test(typeStr)) q.type = 'judge';
                else if (/简答|short|问答/i.test(typeStr)) q.type = 'short';
            }

            // 难度
            if (row[fieldMap.difficulty]) {
                const diffStr = String(row[fieldMap.difficulty]).trim();
                if (/简单|容易|1/i.test(diffStr)) q.difficulty = 1;
                else if (/中等|2/i.test(diffStr)) q.difficulty = 2;
                else if (/困难|3/i.test(diffStr)) q.difficulty = 3;
            }

            // 选项
            if (q.type !== 'short') {
                ['A', 'B', 'C', 'D', 'E', 'F'].forEach(letter => {
                    const key = 'option_' + letter.toLowerCase();
                    if (fieldMap[key] && row[fieldMap[key]]) {
                        q.options.push(String(row[fieldMap[key]]).trim());
                    }
                });

                // 判断题特殊处理
                if (q.type === 'judge' && q.options.length === 0) {
                    q.options = ['正确', '错误'];
                }
            }

            // 答案
            if (row[fieldMap.answer]) {
                const answerStr = String(row[fieldMap.answer]).trim().toUpperCase();
                if (q.type === 'short') {
                    q.answer = answerStr;
                } else if (q.type === 'judge') {
                    q.answer = /正确|对|√|A|T/i.test(answerStr) ? 0 : 1;
                } else {
                    const letters = answerStr.match(/[A-F]/g);
                    if (letters) {
                        if (letters.length > 1) {
                            q.type = q.type || 'multiple';
                            q.answer = letters.map(l => l.charCodeAt(0) - 65);
                        } else {
                            q.type = q.type || 'single';
                            q.answer = letters[0].charCodeAt(0) - 65;
                        }
                    }
                }
            }

            // 解析
            if (fieldMap.analysis && row[fieldMap.analysis]) {
                q.analysis = String(row[fieldMap.analysis]).trim();
            }

            // 如果题型仍未确定，自动判断
            if (!q.type) {
                if (q.options.length === 0) q.type = 'short';
                else if (q.options.length === 2 && /正确|错误/i.test(q.options.join(''))) q.type = 'judge';
                else if (Array.isArray(q.answer) && q.answer.length > 1) q.type = 'multiple';
                else q.type = 'single';
            }

            if (q.type === 'short') q.options = null;
            if (!q.answer && q.type !== 'short') q.answer = q.type === 'multiple' ? [] : 0;

            questions.push(this.finalizeQuestion(q));
        });

        return questions;
    },

    // 默认Excel字段映射
    getDefaultFieldMap() {
        return {
            type: '题型',
            content: '题干',
            category: '分类',
            difficulty: '难度',
            option_a: '选项A',
            option_b: '选项B',
            option_c: '选项C',
            option_d: '选项D',
            option_e: '选项E',
            option_f: '选项F',
            answer: '答案',
            analysis: '解析'
        };
    }
};

// ==================== Excel 导出工具 ====================

const ExportUtil = {
    // 导出成绩单为CSV（通用，不依赖第三方库）
    exportScoresCSV(scores, examTitle) {
        const headers = ['排名', '姓名', '工号', '部门', '得分', '状态', '用时', '交卷时间'];
        const rows = scores.map(s => [
            s.rank,
            s.name,
            s.employee_id,
            s.department || '',
            s.score,
            s.passed ? '已通过' : '未通过',
            s.time_spent,
            s.submit_time
        ]);

        let csv = '\uFEFF'; // BOM for UTF-8
        csv += headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => {
                const str = String(cell);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            }).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `成绩单_${examTitle}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    },

    // 导出成绩单为Excel（使用SheetJS）
    exportScoresExcel(scores, examTitle) {
        if (typeof XLSX === 'undefined') {
            // 降级为CSV
            this.exportScoresCSV(scores, examTitle);
            return;
        }

        const data = scores.map(s => ({
            '排名': s.rank,
            '姓名': s.name,
            '工号': s.employee_id,
            '部门': s.department || '',
            '得分': s.score,
            '状态': s.passed ? '已通过' : '未通过',
            '用时': s.time_spent,
            '交卷时间': s.submit_time
        }));

        // 添加统计行
        const total = scores.length;
        const passed = scores.filter(s => s.passed).length;
        const avgScore = total > 0 ? (scores.reduce((sum, s) => sum + s.score, 0) / total).toFixed(1) : 0;
        const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0%';

        data.push({});
        data.push({ '姓名': '—— 统计信息 ——' });
        data.push({ '姓名': '参加人数', '得分': total + ' 人' });
        data.push({ '姓名': '通过人数', '得分': passed + ' 人' });
        data.push({ '姓名': '通过率', '得分': passRate });
        data.push({ '姓名': '平均分', '得分': avgScore });

        const ws = XLSX.utils.json_to_sheet(data, { skipHeader: false });

        // 设置列宽
        ws['!cols'] = [
            { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 16 },
            { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 20 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '成绩单');

        // 添加汇总Sheet
        const summaryData = [
            { '项目': '考试名称', '数值': examTitle },
            { '项目': '导出时间', '数值': new Date().toLocaleString('zh-CN') },
            { '项目': '参加人数', '数值': total + ' 人' },
            { '项目': '通过人数', '数值': passed + ' 人' },
            { '项目': '未通过人数', '数值': (total - passed) + ' 人' },
            { '项目': '通过率', '数值': passRate },
            { '项目': '平均分', '数值': avgScore },
            { '项目': '最高分', '数值': total > 0 ? scores.reduce((max, s) => Math.max(max, s.score), 0) : 0 },
            { '项目': '最低分', '数值': total > 0 ? scores.reduce((min, s) => Math.min(min, s.score), Infinity) : 0 }
        ];
        const summaryWs = XLSX.utils.json_to_sheet(summaryData);
        summaryWs['!cols'] = [{ wch: 16 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, summaryWs, '汇总信息');

        XLSX.writeFile(wb, `成绩单_${examTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    },

    // 导出单个考生成绩单
    exportSingleScore(score, examTitle, userDetails) {
        if (typeof XLSX === 'undefined') {
            return;
        }

        const data = [
            { '项目': '考试名称', '数值': examTitle },
            { '项目': '姓名', '数值': userDetails.name },
            { '项目': '工号', '数值': userDetails.employeeId },
            { '项目': '部门', '数值': userDetails.department || '' },
            { '项目': '得分', '数值': score.score },
            { '项目': '满分', '数值': score.totalScore },
            { '项目': '是否通过', '数值': score.passed ? '是' : '否' },
            { '项目': '及格线', '数值': score.passScore },
            { '项目': '答对题数', '数值': score.correctCount },
            { '项目': '答错题数', '数值': score.wrongCount },
            { '项目': '正确率', '数值': score.correctRate + '%' },
            { '项目': '用时', '数值': Utils.formatTime(score.timeSpent) },
            { '项目': '交卷时间', '数值': new Date().toLocaleString('zh-CN') }
        ];

        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [{ wch: 16 }, { wch: 30 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '成绩单');
        XLSX.writeFile(wb, `成绩单_${userDetails.name}_${examTitle}.xlsx`);
    },

    // 导出账号模板
    exportAccountTemplate() {
        if (typeof XLSX === 'undefined') {
            // CSV fallback
            let csv = '\uFEFF工号,姓名,部门,岗位,密码\n';
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = '考试人员导入模板.csv';
            link.click();
            URL.revokeObjectURL(link.href);
            return;
        }

        const data = [];
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '账号导入模板');
        XLSX.writeFile(wb, '考试人员导入模板.xlsx');
    },

    // 导出当前账号列表（不再导出密码字段，安全合规）
    exportAccountList(accounts) {
        if (typeof XLSX === 'undefined') {
            let csv = '\uFEFF工号,姓名,部门,岗位,状态,创建日期\n';
            accounts.forEach(a => {
                csv += `${a.username},${a.real_name},${a.department},${a.position || ''},${a.status === 'active' ? '启用' : '禁用'},${a.created}\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `考试人员账号列表_${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
            return;
        }

        const data = accounts.map(a => ({
            '工号': a.username,
            '姓名': a.real_name,
            '部门': a.department,
            '岗位': a.position || '',
            '状态': a.status === 'active' ? '启用' : '禁用',
            '创建日期': a.created
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 8 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '账号列表');
        XLSX.writeFile(wb, `考试人员账号列表_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
};

// ==================== 页面导航 ====================

const PAGES = {
    login: 'index.html',
    examHome: 'exam-home.html',
    examTake: 'exam-take.html',
    examResult: 'exam-result.html',
    adminDashboard: 'admin-dashboard.html',
    adminQuestions: 'admin-questions.html',
    adminExams: 'admin-exams.html',
    adminStatistics: 'admin-statistics.html',
    adminUsers: 'admin-users.html',
    adminSettings: 'admin-settings.html',
    adminReview: 'admin-review.html'
};

// ==================== 图标 SVG ====================

const ICONS = {
    dashboard: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    question: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/><circle cx="12" cy="12" r="10"/></svg>',
    exam: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>',
    chart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    settings: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
    logout: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    user: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    upload: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    alert: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    arrowLeft: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    arrowRight: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 19 19"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    bell: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
    book: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
    trophy: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>',
    flag: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
    eye: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
    building: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="2"/><line x1="15" y1="22" x2="15" y2="2"/></svg>',
    users: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
    fileText: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    userPlus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
    refresh: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>',
    key: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
    ban: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
    sparkles: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.9 5.8a2 2 0 001.3 1.3L21 12l-5.8 1.9a2 2 0 00-1.3 1.3L12 21l-1.9-5.8a2 2 0 00-1.3-1.3L3 12l5.8-1.9a2 2 0 001.3-1.3L12 3z"/></svg>',
    fileCheck: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>'
};

// ==================== 命名空间挂载 & 兼容层 ====================
// 讨论#2 决策：IIFE + ExamSystem 命名空间重构
// 所有核心对象挂载到 ExamSystem 下，同时保留 window 别名以兼容过渡期

ExamSystem.MOCK_DATA = MOCK_DATA;
ExamSystem.Utils = Utils;
ExamSystem.ProjectManager = ProjectManager;
ExamSystem.DepartmentManager = DepartmentManager;
ExamSystem.PositionManager = PositionManager;
ExamSystem.AccountManager = AccountManager;
ExamSystem.QuestionBankManager = QuestionBankManager;
ExamSystem.ExamManager = ExamManager;
ExamSystem.ResultManager = ResultManager;
ExamSystem.AdminManager = AdminManager;
ExamSystem.SettingsManager = SettingsManager;
ExamSystem.QuestionParser = QuestionParser;
ExamSystem.ExportUtil = ExportUtil;
ExamSystem.PAGES = PAGES;
ExamSystem.ICONS = ICONS;

// 过渡期兼容：保留全局别名（后续版本将逐步移除）
// 已迁移到 ExamSystem 的页面可使用 ExamSystem.XXX，未迁移的仍可通过 XXX 访问

// ==================== 自动替换HTML中的图标占位符 ====================
// 在原始HTML中使用 ${ICONS.xxx} 会被自动替换为对应的SVG
document.addEventListener('DOMContentLoaded', function() {
    var allElements = document.querySelectorAll('body *:not(script)');
    allElements.forEach(function(el) {
        for (var i = el.childNodes.length - 1; i >= 0; i--) {
            var node = el.childNodes[i];
            if (node.nodeType === 3 && node.textContent.indexOf('${ICONS.') !== -1) {
                var temp = document.createElement('span');
                temp.style.display = 'inline-flex';
                temp.style.alignItems = 'center';
                temp.innerHTML = node.textContent.replace(/\$\{ICONS\.(\w+)\}/g, function(m, k) {
                    return ICONS[k] || m;
                });
                while (temp.firstChild) {
                    el.insertBefore(temp.firstChild, node);
                }
                el.removeChild(node);
            }
        }
    });
});
