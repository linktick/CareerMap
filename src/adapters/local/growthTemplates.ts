// 每个岗位方向的 12 个月成长计划模板
// 用关键词匹配到具体路线；匹配不到时用 buildGenericTemplate 基于路线自身数据动态生成

import type { CareerRoute } from '@/types/career'

export interface GrowthTemplate {
  keywords: string[]
  targetRole: string
  goalSummary: string
  targetSalary: [number, number]
  months: {
    theme: string
    learningTasks: string[]
    practiceProjects: string[]
    jobActions: string
    certPrep: string
    keyReminder: string
  }[]
}

export const GROWTH_TEMPLATES: GrowthTemplate[] = [
  {
    keywords: ['前端'],
    targetRole: '中级前端工程师',
    goalSummary: '12 个月内系统掌握前端工程化，具备进入中厂的项目与面试能力',
    targetSalary: [16, 22],
    months: [
      {
        theme: '打牢三件套基础',
        learningTasks: ['MDN HTML/CSS 系统过一遍', 'JavaScript 高级语法(闭包/原型/异步/this)', 'Git 常用命令与分支协作'],
        practiceProjects: ['手写一个响应式个人主页(不允许用框架)'],
        jobActions: '',
        certPrep: '',
        keyReminder: '不要急着学 Vue/React，基础不牢第三年会非常痛苦。',
      },
      {
        theme: '进入 Vue3 生态',
        learningTasks: ['Vue3 Composition API + Pinia + Vue Router', 'TypeScript 基础并在 Vue 项目中使用', 'Vite 构建工具'],
        practiceProjects: ['用 Vue3+TS+Vite 写一个待办清单 + 天气查询应用'],
        jobActions: '整理简历雏形，列出已有项目',
        certPrep: '',
        keyReminder: '别同时学 Vue 和 React，先吃透一个，另一个上手只要一周。',
      },
      {
        theme: '工程化与组件库',
        learningTasks: ['ESLint/Prettier/Husky 工程规范', '组件封装与设计系统思维', 'Axios 封装与接口层设计'],
        practiceProjects: ['封装一个自己的组件库并发布到 npm(可私有)'],
        jobActions: '开始投递实习/初级岗位，每天 5~10 份',
        certPrep: '',
        keyReminder: '不要只做 TodoList，企业想看能体现工程思维的项目。',
      },
      {
        theme: 'React 拓展(可选) + 状态管理深入',
        learningTasks: ['React Hooks 基础', 'React 状态管理(Zustand/Redux Toolkit)', '前端路由原理'],
        practiceProjects: ['用 React 重写一个已有小项目，体会差异'],
        jobActions: '面试复盘，整理常见面试题',
        certPrep: '',
        keyReminder: '如果目标公司以 Vue 为主，这个月可以继续深挖 Vue 而非 React。',
      },
      {
        theme: '前端性能优化',
        learningTasks: ['Chrome DevTools Performance 面板', 'Web Vitals 指标', '懒加载/代码分割/缓存策略', '图片与资源优化'],
        practiceProjects: ['对之前项目做性能体检，输出优化报告并实施'],
        jobActions: '把性能优化成果写进简历',
        certPrep: '',
        keyReminder: '面试必问性能优化，没有实操经验只能背答案，一追问就露馅。',
      },
      {
        theme: 'Node.js 与 BFF',
        learningTasks: ['Node.js + Express/Koa 基础', 'RESTful API 设计', '数据库基础(MySQL/MongoDB)'],
        practiceProjects: ['给自己的前端项目写一个真实后端 + 登录态'],
        jobActions: '投递进阶岗位，争取有完整全栈项目可讲',
        certPrep: '',
        keyReminder: '前端学 Node 不是为了转后端，是为了能独立交付产品。',
      },
      {
        theme: 'TypeScript 进阶 + 类型体操',
        learningTasks: ['泛型/条件类型/映射类型', '常用工具类型源码解读', '在大型项目中的类型设计'],
        practiceProjects: ['把已有项目迁移到严格 TS，补充类型声明'],
        jobActions: '面试中主动展示 TS 能力，这是中高级门槛',
        certPrep: '',
        keyReminder: '不要沉迷类型体操，业务中能用好泛型就够了。',
      },
      {
        theme: '测试与前端质量',
        learningTasks: ['Vitest 单元测试', '组件测试(Vue Test Utils / Testing Library)', 'E2E 测试(Playwright)'],
        practiceProjects: ['为核心组件库补齐单元测试，覆盖率 > 70%'],
        jobActions: '更新作品集网站',
        certPrep: '',
        keyReminder: '初级不要求测试，但中级以上必须有质量意识。',
      },
      {
        theme: '跨端与可视化(选一个方向)',
        learningTasks: ['小程序开发(uni-app/Taro) 或 ECharts/D3 可视化'],
        practiceProjects: ['做一个小程序作品 或 数据可视化大屏'],
        jobActions: '针对性投递有跨端/可视化需求的岗位',
        certPrep: '',
        keyReminder: '广度有了之后必须开始选纵深方向，不要什么都学一点。',
      },
      {
        theme: '简历打磨 + 面试专项',
        learningTasks: ['刷前端面试题(JS/浏览器/框架/网络)', '手写 Promise/深拷贝/发布订阅', '算法 easy~medium 每日 1~2 题'],
        practiceProjects: ['给每个项目准备 STAR 法则的讲解稿'],
        jobActions: '集中投递，约面试，每周复盘',
        certPrep: '',
        keyReminder: '简历写"精通"之前先问自己能不能扛住三连问。',
      },
      {
        theme: '面试冲刺 + 谈薪',
        learningTasks: ['模拟面试，找朋友或录像复盘', '系统设计入门', '谈薪技巧与 offer 比较'],
        practiceProjects: ['针对目标公司做定制化作品集'],
        jobActions: '争取 2~3 个 offer 在手再谈薪',
        certPrep: '',
        keyReminder: '别拿到第一个 offer 就接，市场对能等的人更慷慨。',
      },
      {
        theme: '入职准备 + 下一阶段规划',
        learningTasks: ['了解目标团队技术栈，提前熟悉', '代码评审规范与协作流程', '制定入职后 90 天计划'],
        practiceProjects: ['给开源项目提一个 PR，体验协作'],
        jobActions: '完成入职，建立第一份职场信用',
        certPrep: '',
        keyReminder: '入职不是终点，前 3 个月表现决定你在团队的定位。',
      },
    ],
  },
  {
    keywords: ['后端', 'Java'],
    targetRole: '中级后端工程师',
    goalSummary: '12 个月内具备独立负责业务模块的后端工程能力',
    targetSalary: [18, 26],
    months: [
      { theme: '语言基础 + 数据结构', learningTasks: ['Java/Python/Go 选一门深入', '集合框架/并发/IO', '数据结构与算法'], practiceProjects: ['LeetCode 热题 100 刷完'], jobActions: '', certPrep: '', keyReminder: '语言基础是后端面试的敲门砖，别跳过。' },
      { theme: '数据库 + SQL', learningTasks: ['MySQL 索引/事务/锁', 'SQL 调优', 'Redis 基础'], practiceProjects: ['设计一个博客系统数据库'], jobActions: '更新简历', certPrep: '', keyReminder: '不会索引优化的后端在面试中会被直接淘汰。' },
      { theme: 'Web 框架 + 项目实战', learningTasks: ['Spring Boot/Django/Gin', 'RESTful API', 'MyBatis/SQLAlchemy'], practiceProjects: ['做一个带权限的用户系统后端'], jobActions: '开始投递', certPrep: '', keyReminder: 'CRUD 不是项目亮点，要有复杂度。' },
      { theme: 'Linux + 部署', learningTasks: ['Linux 常用命令', 'Nginx', 'Docker 基础'], practiceProjects: ['把自己的项目部署到云服务器'], jobActions: '面试中演示线上项目', certPrep: '', keyReminder: '能把项目跑在公网上是分水岭。' },
      { theme: '并发与多线程', learningTasks: ['线程池/锁/JUC', '异步编程', '并发陷阱'], practiceProjects: ['实现一个秒杀/限流 demo'], jobActions: '', certPrep: '', keyReminder: '并发题是后端面试重灾区。' },
      { theme: '消息队列 + 缓存', learningTasks: ['RabbitMQ/Kafka', 'Redis 高级用法', '缓存击穿/穿透/雪崩'], practiceProjects: ['给项目引入 MQ 实现异步下单'], jobActions: '投递中级岗位', certPrep: '', keyReminder: '八股文要背，但更要能说出真实使用场景。' },
      { theme: '微服务入门', learningTasks: ['Spring Cloud/微服务概念', '服务注册发现', '网关/配置中心'], practiceProjects: ['把单体拆成 2~3 个微服务'], jobActions: '', certPrep: '', keyReminder: '别为了微服务而微服务，小公司单体更健康。' },
      { theme: '分布式基础', learningTasks: ['分布式 ID/锁/事务', 'CAP/BASE', '一致性算法概念'], practiceProjects: ['实现一个分布式锁'], jobActions: '面试前系统复习', certPrep: '', keyReminder: '分布式不求你实现过，但必须讲得清原理。' },
      { theme: '性能调优', learningTasks: ['JVM/Python 性能分析', 'SQL 执行计划', '压测工具 JMeter/wrk'], practiceProjects: ['对项目做一次完整压测并优化'], jobActions: '把调优数据写进简历', certPrep: '', keyReminder: '数字比形容词有说服力。' },
      { theme: '网络 + 安全', learningTasks: ['TCP/HTTP/HTTPS', 'OAuth2/JWT', '常见 Web 漏洞'], practiceProjects: ['给接口加鉴权和限流'], jobActions: '集中投递', certPrep: '', keyReminder: '网络是后端面试必问，别栽在三次握手上。' },
      { theme: '面试冲刺', learningTasks: ['算法每日 2 题', '项目 STAR 梳理', '模拟面试'], practiceProjects: ['整理一个面试题库仓库'], jobActions: '密集面试', certPrep: '', keyReminder: '面试是技术活，练得越多越不慌。' },
      { theme: '谈薪 + 入职', learningTasks: ['offer 比较', '谈薪话术', '入职 90 天规划'], practiceProjects: ['给开源提一个 PR'], jobActions: '拿到 offer 并完成入职', certPrep: '', keyReminder: '选团队比选公司更重要。' },
    ],
  },
  {
    keywords: ['算法', 'AI'],
    targetRole: '初级算法工程师',
    goalSummary: '12 个月内补齐算法工程能力，争取算法岗实习或校招',
    targetSalary: [22, 35],
    months: [
      { theme: '数学与 Python 基础', learningTasks: ['线性代数/概率统计复习', 'Python 数据科学栈', 'NumPy/Pandas'], practiceProjects: ['Kaggle 入门赛完赛'], jobActions: '', certPrep: '', keyReminder: '数学不是要你推导，而是要看懂论文符号。' },
      { theme: '机器学习经典算法', learningTasks: ['监督/无监督学习', 'sklearn', '模型评估与调参'], practiceProjects: ['完成 2 个结构化数据建模项目'], jobActions: '', certPrep: '', keyReminder: '别跳过 ML 直接学深度学习，基础决定上限。' },
      { theme: '深度学习基础', learningTasks: ['PyTorch', 'CNN/RNN/Transformer', '反向传播原理'], practiceProjects: ['复现一篇经典论文'], jobActions: '整理 GitHub', certPrep: '', keyReminder: '复现论文是算法岗最好的简历素材。' },
      { theme: '选定方向(CV/NLP/推荐)', learningTasks: ['方向经典论文精读', '开源框架熟悉', '数据集处理'], practiceProjects: ['在方向内做一个完整项目'], jobActions: '', certPrep: '', keyReminder: '什么都懂一点不如在一个方向做到能深入聊。' },
      { theme: '大模型基础', learningTasks: ['Transformer/Attention', 'Hugging Face', 'Prompt Engineering'], practiceProjects: ['微调一个开源模型解决具体任务'], jobActions: '', certPrep: '', keyReminder: '2025 年不懂大模型的算法工程师简历很难过。' },
      { theme: 'RAG 与 Agent', learningTasks: ['向量数据库', 'RAG 架构', 'Agent/LangChain'], practiceProjects: ['做一个垂直领域问答机器人'], jobActions: '更新简历', certPrep: '', keyReminder: 'RAG 是当前落地最多的方向，作品即简历。' },
      { theme: '模型部署与工程', learningTasks: ['模型压缩/量化', 'ONNX/TensorRT', 'FastAPI 部署'], practiceProjects: ['把模型部署成 API 并压测'], jobActions: '投递实习', certPrep: '', keyReminder: '只会调参的人正在被会工程的人淘汰。' },
      { theme: '分布式训练', learningTasks: ['DDP/DeepSpeed', '混合精度', 'GPU 资源调度'], practiceProjects: ['多卡训练一个模型'], jobActions: '', certPrep: '', keyReminder: '这部分是进阶门槛，实习面试加分项。' },
      { theme: '竞赛/论文', learningTasks: ['Kaggle/天池竞赛', '论文阅读与笔记', '写作与表达'], practiceProjects: ['打一场竞赛拿奖牌 或 写一篇投稿'], jobActions: '联系导师/内推', certPrep: '', keyReminder: '竞赛和论文是算法岗最硬的通货。' },
      { theme: '八股 + 代码', learningTasks: ['ML/DL 面试题', 'Python 代码题', 'SQL 数据分析'], practiceProjects: ['算法/代码双刷题'], jobActions: '密集投递', certPrep: '', keyReminder: '算法岗也写代码，别让代码能力拖后腿。' },
      { theme: '面试冲刺', learningTasks: ['论文讲解练习', '项目深度追问准备', '模拟面试'], practiceProjects: ['准备 10 分钟项目自述'], jobActions: '冲刺校招/实习', certPrep: '', keyReminder: '讲不清项目细节，再牛也过不了。' },
      { theme: '谈薪 + 入职', learningTasks: ['offer 选择', '团队方向判断', '入职规划'], practiceProjects: [], jobActions: '完成入职', certPrep: '', keyReminder: '算法岗第一份工作的方向比薪资更影响未来。' },
    ],
  },
  {
    keywords: ['电商', '电子商务', '店铺运营', '网店'],
    targetRole: '电商运营专员',
    goalSummary: '12 个月内掌握流量、转化、投放与数据分析，能独立负责店铺单品运营',
    targetSalary: [10, 16],
    months: [
      { theme: '平台规则与后台操作', learningTasks: ['熟悉淘宝/拼多多/抖音电商后台', '商品上架、SKU、库存与物流流程', '平台规则与违规红线'], practiceProjects: ['完整上架 5 个商品并优化标题主图'], jobActions: '', certPrep: '', keyReminder: '别小看后台操作，连规则都不熟的运营面试第一轮就会被刷。' },
      { theme: 'Excel 与电商数据分析', learningTasks: ['Excel 数据透视表/VLOOKUP', '生意参谋/蝉妈妈等数据工具', 'UV、转化率、客单价、GMV 拆解'], practiceProjects: ['用一份模拟店铺数据做周度复盘报表'], jobActions: '', certPrep: '', keyReminder: '运营是结果导向的岗位，不会用数据说话永远只能做执行。' },
      { theme: '视觉与详情页转化', learningTasks: ['主图/详情页转化逻辑', '卖点提炼与人群定位', '基础 PS/创客堂作图'], practiceProjects: ['为一款商品重写详情页文案并设计主图'], jobActions: '整理简历，突出任何与销售/运营相关的经历', certPrep: '', keyReminder: '审美不重要，转化才重要；主图决定点击率，详情决定转化率。' },
      { theme: '客服与售后转化', learningTasks: ['客服话术与询单转化', '差评/退换货处理', 'DSR 评分维护'], practiceProjects: ['整理一套高转化客服话术库（30 条）'], jobActions: '投递电商运营助理/客服岗，先入行', certPrep: '', keyReminder: '客服岗是入行电商最快的跳板，但要主动接触运营工作，别只做接待。' },
      { theme: '付费流量入门（直通车/千川）', learningTasks: ['直通车/千川投放原理', '关键词选择与质量分', 'ROI/ROAS 计算'], practiceProjects: ['用模拟账户搭建一个直通车计划并记录数据'], jobActions: '', certPrep: '', keyReminder: '不要一上来就烧钱，先把"展现-点击-转化"漏斗理解透。' },
      { theme: '活动策划与大促节奏', learningTasks: ['平台活动报名规则', '618/双11 节奏排期', '满减、优惠券、凑单逻辑'], practiceProjects: ['策划一次店铺级促销活动方案（含预算与目标 GMV）'], jobActions: '投递运营专员岗位', certPrep: '', keyReminder: '大促是运营的期中考试，节奏表和备货没做好会全盘皆输。' },
      { theme: '内容与短视频带货', learningTasks: ['短视频脚本基础', '直播间场控与排品', '种草内容逻辑'], practiceProjects: ['为单品写 3 条带货短视频脚本并拍摄剪辑'], jobActions: '', certPrep: '', keyReminder: '不会内容的传统运营正在被淘汰，至少要懂短视频和直播基本盘。' },
      { theme: '投放优化进阶', learningTasks: ['人群标签与定向', 'A/B 测试主图/出价', '投放数据复盘'], practiceProjects: ['对一个模拟投放计划做 7 天数据复盘并给出优化方案'], jobActions: '', certPrep: '', keyReminder: '投放不是玄学，每一次调价都要有数据依据。' },
      { theme: '品类规划与供应链', learningTasks: ['选品逻辑与利润核算', '爆款/利润款/引流款布局', '供应链协同与库存周转'], practiceProjects: ['完成一个品类的选品分析（含成本/定价/竞品）'], jobActions: '跳槽/晋升运营专员，重点准备投放与数据案例', certPrep: '', keyReminder: '只懂推广不懂供应链的运营，做大促一定会翻车。' },
      { theme: '直播操盘入门', learningTasks: ['直播间人货场', '排品与憋单话术', '千川投流与直播数据复盘'], practiceProjects: ['写一份完整直播脚本（含 2 小时排品节奏）'], jobActions: '', certPrep: '', keyReminder: '直播是体力活也是技术活，先从小号/副播做起，别幻想一步登天。' },
      { theme: '面试与作品集冲刺', learningTasks: ['运营案例 STAR 梳理', '常见面试题（ROI、活动、投放）', '简历数据化表达'], practiceProjects: ['整理 2~3 个可讲透的运营项目案例'], jobActions: '密集面试运营专员/主管岗', certPrep: '', keyReminder: '面试官只关心你做过多少 GMV、ROI 多少，别讲空话。' },
      { theme: '谈薪 + 入职', learningTasks: ['offer 比较（平台/品类/团队）', '谈薪话术', '入职 90 天目标'], practiceProjects: [], jobActions: '拿到 offer 并完成入职', certPrep: '', keyReminder: '选对品类和团队比底薪多 1000 块重要得多。' },
    ],
  },
]

/**
 * 没有专用模板的路线，基于该路线自身的阶段技能/瓶颈/证书动态生成 12 个月计划，
 * 保证生成内容始终与所选路线相关（而不是错误地回退到前端模板）。
 */
export function buildGenericTemplate(route: CareerRoute): GrowthTemplate {
  const [now, y1, y2] = route.nodes
  const targetRole = y1?.title || route.name
  // year1 薪资区间作为 12 个月目标
  const targetSalary: [number, number] = y1
    ? [y1.salaryRange[0], y1.salaryRange[1]]
    : route.salaryCurve[1]
      ? [route.salaryCurve[1].min, route.salaryCurve[1].max]
      : [8, 15]

  const skillPool = [
    ...(now?.requiredSkills || []),
    ...(y1?.requiredSkills || []),
    ...(y2?.requiredSkills || []),
  ]
  const allCerts = route.nodes.flatMap((n) => n.certificates)

  const pick = (arr: string[], n: number) => arr.slice(0, n)
  const batch = (i: number, size: number) => pick(skillPool.slice(i * size), size)

  const months = [
    { theme: `入行基础：${now?.title || '岗位认知'}`, learningTasks: batch(0, 3).length ? batch(0, 3) : ['了解岗位日常工作与能力模型', '熟悉行业常用工具与术语', '梳理自身差距与学习清单'], practiceProjects: [`完成一份${route.name.replace('路线', '')}岗位调研报告`], jobActions: '', certPrep: allCerts[0] || '', keyReminder: now?.bottleneck || '先搞清楚这个岗位每天到底在做什么，别盲目报班。' },
    { theme: '核心工具与基础技能', learningTasks: batch(1, 3), practiceProjects: ['把本月学到的工具做一个综合练习作品'], jobActions: '整理简历雏形', certPrep: allCerts[0] || '', keyReminder: '工具是敲门砖，但只会工具的人 3 年后最容易被替代。' },
    { theme: '基本功深化', learningTasks: batch(2, 3), practiceProjects: ['独立完成一个模拟真实业务的小项目'], jobActions: '', certPrep: allCerts[1] || allCerts[0] || '', keyReminder: '基础打不牢，第二年涨薪和晋升都会很吃力。' },
    { theme: '业务实战入门', learningTasks: batch(3, 3), practiceProjects: ['找一份实习/兼职/外包，接触真实业务流程'], jobActions: '开始投递实习/初级岗位，每天坚持投递', certPrep: '', keyReminder: y1?.bottleneck || '真实业务和练习题完全是两回事，尽早进场。' },
    { theme: '第一个独立项目', learningTasks: batch(4, 2), practiceProjects: ['独立负责一个完整小项目并写复盘'], jobActions: '面试复盘，整理错题本', certPrep: '', keyReminder: '简历上"做过"和"独立做成"差别巨大，务必拿到结果。' },
    { theme: '进阶能力：效率与质量', learningTasks: batch(5, 3), practiceProjects: ['把之前的项目优化到可写进作品集的程度'], jobActions: '投递初级岗位', certPrep: '', keyReminder: '这个阶段容易进入平台期，靠项目和反馈突破。' },
    { theme: '向中级要求靠拢', learningTasks: batch(6, 3), practiceProjects: [`针对"${y2?.title || '中级岗位'}"的要求补一项短板`], jobActions: '', certPrep: allCerts[1] || '', keyReminder: y2?.bottleneck || '中级和初级的差距在于能否独立解决复杂问题。' },
    { theme: '作品集与简历打磨', learningTasks: ['梳理 2~3 个可讲透的项目（STAR 法则）', '针对目标岗位 JD 优化简历', '准备常见面试题'], practiceProjects: ['完成一份高质量作品集/项目合集'], jobActions: '密集投递并记录投递反馈', certPrep: '', keyReminder: '简历没有数据和结果，投再多也石沉大海。' },
    { theme: '面试冲刺', learningTasks: ['模拟面试与表达训练', '专业知识查漏补缺', '复盘每次面试的问题'], practiceProjects: ['整理个人面试题库'], jobActions: '集中面试，每周至少 3 场', certPrep: '', keyReminder: '面试是技术活，前 3 场基本都是练手，坚持住。' },
    { theme: '谈薪与 offer 选择', learningTasks: ['了解目标城市/行业薪资行情', '谈薪话术与 offer 对比维度', '背调与入职材料准备'], practiceProjects: [], jobActions: '拿到 offer，理性比较后做选择', certPrep: '', keyReminder: '第一份工作的平台和成长性比底薪更重要。' },
    { theme: '入职准备', learningTasks: ['了解入职团队业务与流程', '提前学习岗位相关内部工具', '制定 30/60/90 天目标'], practiceProjects: ['写一份入职 90 天规划'], jobActions: '完成入职', certPrep: '', keyReminder: '入职前 3 个月的表现直接决定你在团队的定位。' },
    { theme: '站稳脚跟 + 长期规划', learningTasks: ['建立工作中的反馈闭环', '明确第二年技能主攻方向', `关注"${route.ceiling}"所需的能力`], practiceProjects: [], jobActions: '转正答辩准备', certPrep: '', keyReminder: `看清天花板：${route.ceiling}。从第一年起就为它做积累。` },
  ]

  return {
    keywords: [],
    targetRole,
    goalSummary: `12 个月内掌握${route.name.replace('路线', '')}核心技能，达到${targetRole}的入职要求`,
    targetSalary,
    months,
  }
}

export function findTemplate(route: CareerRoute): GrowthTemplate {
  const text = route.name + route.industry
  const matched = GROWTH_TEMPLATES.find((t) => t.keywords.some((k) => text.includes(k)))
  // 找不到专用模板时，基于该路线自身数据动态生成，而不是错误地回退到前端模板
  return matched || buildGenericTemplate(route)
}
