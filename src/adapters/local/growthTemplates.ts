// 每个岗位方向的 12 个月成长计划模板
// 用关键词匹配到具体路线；匹配不到时用 buildGenericTemplate 基于路线自身数据动态生成

import type { CareerRoute } from '@/types/career'

export interface GrowthMonthTemplate {
  theme: string
  learningTasks: string[]
  practiceProjects: string[]
  jobActions: string
  certPrep: string
  keyReminder: string
}

export interface GrowthTemplate {
  keywords: string[]
  targetRole: string
  goalSummary: string
  targetSalary: [number, number]
  months: GrowthMonthTemplate[]
  /** 已持相关证书的用户（如简历/技能中已体现教师资格证）使用的替代月份计划 */
  certifiedMonths?: GrowthMonthTemplate[]
  certifiedGoalSummary?: string
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
  {
    // 公务员/事业单位/选调生等体制内考试方向：12 个月是「行测+申论」备考周期，
    // 而不是职场技能成长；时间线按国考（10 月报名、11 月底笔试）+ 次年省考联考排布
    keywords: ['公务员', '事业编', '事业单位', '选调生', '考公', '公考', '省考', '国考', '三支一扶', '村官', '体制内'],
    targetRole: '试用期公务员/事业编专技岗',
    goalSummary: '12 个月系统备考行测与申论，通过国考/省考或事业单位笔面试成功上岸',
    targetSalary: [7, 11],
    months: [
      {
        theme: '考情摸底 · 行测入门',
        learningTasks: ['摸清国考/省考/选调生/事业单位的区别、报考条件（年龄一般 18~38 周岁，应届硕博可放宽至 42 周岁，以当年公告为准）与时间线', '行测六大模块考情：言语理解/判断推理/资料分析/数量关系/常识判断/政治理论（时政方针、重要会议精神等）', '限时做 1 套上一年真题摸底，统计各模块正确率'],
        practiceProjects: ['整理目标地区近 3 年职位表、报录比与进面分数线'],
        jobActions: '',
        certPrep: '',
        keyReminder: '先定目标再备考：不同地区、不同岗位进面分能差 20 分以上，选岗方向比努力更重要；报考年龄上限已放宽至 38 周岁，但考试机会有限，别无限期"试水"。',
      },
      {
        theme: '行测 · 言语理解 + 判断推理',
        learningTasks: ['逻辑填空：词语辨析与语境对应', '片段阅读：主旨概括与意图判断', '图形推理规律体系 + 定义判断/类比推理', '逻辑判断：翻译推理、加强削弱'],
        practiceProjects: ['每天 40 道分模块真题，建立错题本'],
        jobActions: '',
        certPrep: '',
        keyReminder: '判断推理是性价比最高的模块，方法性最强，目标正确率 80% 以上。',
      },
      {
        theme: '行测 · 资料分析 + 数量关系',
        learningTasks: ['资料分析：截位直除、分数比较等速算技巧', '增长量/增长率/比重/平均数/倍数高频公式', '数量关系：工程、行程、排列组合、概率等高频题型', '常识判断 + 政治理论：法律、历史文化日常积累；政治理论（时政方针、重要会议精神等）作为新增模块每天 30 分钟'],
        practiceProjects: ['资料分析每天 2 篇限时 25 分钟，目标正确率 90%'],
        jobActions: '',
        certPrep: '',
        keyReminder: '资料分析是提分最快的模块，错题九成是粗心不是不会，限时训练是唯一解。',
      },
      {
        theme: '申论入门 · 小题拿分',
        learningTasks: ['申论材料阅读与要点勾画方法', '归纳概括题：找点与同义合并', '综合分析题：解释/评价/启示类答题框架', '提出对策题：对策要有针对性和可操作性'],
        practiceProjects: ['每周精做 2 道申论小题，对照多家参考答案修改', '每天精读 1 篇人民日报评论/半月谈，积累规范表达'],
        jobActions: '',
        certPrep: '',
        keyReminder: '申论不是写作文，80% 得分点在材料里——学会"抄材料"，别自己发挥。',
      },
      {
        theme: '申论 · 公文写作 + 大作文',
        learningTasks: ['贯彻执行题：通知/倡议书/汇报/讲话稿等常见公文格式', '大作文立意与总分论点提炼，五段三分结构', '论证方法：例证、理证、政策引用', '高频话题素材：基层治理、乡村振兴、科技创新、民生保障'],
        practiceProjects: ['写 3 篇大作文，对照范文逐段复盘', '整理 20 条规范表达金句与 10 个案例素材'],
        jobActions: '',
        certPrep: '',
        keyReminder: '公文题格式错了直接丢一半分，常见十几种公文格式必须背熟。',
      },
      {
        theme: '专项刷题 · 弱项补强',
        learningTasks: ['行测错题二刷，按模块统计正确率变化', '申论小题限时训练（30 分钟/题）', '近一年时政梳理：重大会议、政策文件、科技成就', '事业单位加试内容：公共基础知识（政治/法律/经济）'],
        practiceProjects: ['建立错题归因表：知识盲点/审题失误/计算错误分类统计'],
        jobActions: '关注上半年事业单位统考公告（部分省份 3~5 月发布）',
        certPrep: '教师编/医疗编等专技岗须先取得对应资格证（教师资格证、执业资格证），未取得的本月启动报考',
        keyReminder: '事业单位多考公基/职测，与公务员科目不完全通用，两条线并行要算清时间账。',
      },
      {
        theme: '真题套卷 · 全真模拟',
        learningTasks: ['近 5 年国考/省考真题限时整套刷（行测 120 分钟）', '申论 180 分钟全真模拟，使用标准答题卡', '固定做题顺序与涂卡节奏'],
        practiceProjects: ['每周 2 套行测 + 1 套申论，当天做完当天复盘'],
        jobActions: '',
        certPrep: '',
        keyReminder: '真题是最好的教材，模拟题质量参差不齐；每套真题至少吃透三遍。',
      },
      {
        theme: '模考冲刺 · 查漏补缺',
        learningTasks: ['每周 2~3 次模考，训练考场节奏与心态', '错题本三刷，常识时政集中背诵', '申论保持每周 2 篇大作文手感'],
        practiceProjects: ['制定各模块做题时间表（如资料 25 分钟、判断 30 分钟）并严格执行'],
        jobActions: '',
        certPrep: '',
        keyReminder: '行测最大的敌人是时间：120 分钟约 130 题，数量关系难题要学会战略性放弃。',
      },
      {
        theme: '公告季 · 选岗报名',
        learningTasks: ['研究职位表：专业、学历、政治面貌、基层工作经历、年龄要求（一般 38 周岁以下，应届硕博放宽至 42 周岁）', '查目标岗位历年报录比与进面分，避开"三不限"千人岗', '报名材料准备：报名推荐表、成绩单、党员证明等'],
        practiceProjects: ['做岗位对比表：招录人数/历年进面分/工作地点/发展空间'],
        jobActions: '国考公告通常 10 月中旬发布，及时注册报名并每日查看审核状态',
        certPrep: '',
        keyReminder: '选岗决定上岸概率：限制条件越多竞争越小，别图名字好听去挤热门岗。',
      },
      {
        theme: '笔试冲刺 · 调整状态',
        learningTasks: ['回归错题本与高频考点，不再学新内容', '考前半年时政热点终极梳理', '作息调整到考试节奏，上午 9 点做行测模考'],
        practiceProjects: ['考前一周每天一套题保持手感，减量不减节奏'],
        jobActions: '打印准考证、踩点考场、备齐考试用品',
        certPrep: '',
        keyReminder: '考前别刷新题难题，稳住节奏和心态比多背两个知识点更重要。',
      },
      {
        theme: '国考笔试 · 省考衔接',
        learningTasks: ['参加国考笔试（11 月底/12 月初）', '考后 3 天内对答案估分，决定省考投入力度', '省考特色题型补强（部分省份考数字推理/科学推理）', '事业单位公基/职测系统过一遍'],
        practiceProjects: ['建立目标地区省考/事业单位公告监控清单（人社局官网）'],
        jobActions: '参加国考笔试；同步关注各省省考、选调生、事业单位报名（省考联考多在次年 3 月）',
        certPrep: '',
        keyReminder: '别等国考出成绩再准备省考，中间空窗 3 个月足以被对手拉开差距。',
      },
      {
        theme: '面试备战 · 结构化',
        learningTasks: ['结构化面试五大题型：综合分析/组织管理/应急应变/人际关系/自我认知', '无领导小组讨论流程与角色定位（部分岗位）', '每天 2 道面试题开口练习，录音回听', '仪态仪表与答题时间控制'],
        practiceProjects: ['组队或报班完成 10 场以上全真模拟面试并录像复盘'],
        jobActions: '进面后准备资格复审材料；同步参加省考/事业单位笔试',
        certPrep: '',
        keyReminder: '笔试分只决定进面，面试翻盘与被翻盘都很常见；不开口练够 100 题，考场张不开嘴。',
      },
    ],
  },
  {
    // 教师方向：12 个月是「普通话证 → 教师资格证（笔试+面试+认定）→ 教师招聘考试」的
    // 真实考证考编周期，不是职场技能成长；已持教资者使用 certifiedMonths 直接从教招备考开始
    keywords: ['教师', '老师', '教培', '教师编', '教招', '教资', '特岗', '师范', '支教', '幼师', '教学', '教育'],
    targetRole: '公办学校在编教师（试用期）',
    goalSummary: '12 个月内拿下普通话证书与教师资格证，通过教师招聘笔试+面试成功上岸教师编',
    targetSalary: [7, 12],
    months: [
      {
        theme: '定学段学科 · 普通话报名训练',
        learningTasks: ['确定报考学段（幼儿园/小学/中学）与学科，对照当地教师招聘公告查学历、专业、年龄要求', '普通话水平测试报名：语文/幼教需二级甲等（87 分），其他学科二级乙等（80 分）即可', '普通话训练：声韵调、轻声儿化、朗读短文、命题说话'],
        practiceProjects: ['整理目标地区近 2 年教资公告与教师招聘公告的时间线、报考条件对比表'],
        jobActions: '',
        certPrep: '普通话水平测试（各地语委办/测试站组织，考完约 1~2 个月出证，是教资认定的必备材料）',
        keyReminder: '普通话证是教资认定的硬门槛，语文和幼教必须二甲，别等笔试过了才想起来考。',
      },
      {
        theme: '教资笔试 · 综合素质',
        learningTasks: ['综合素质：职业理念（三观）、教师职业道德、教育法律法规', '文化素养 + 逻辑/信息处理/阅读理解', '作文：教育主题立意与素材积累（占分最高）'],
        practiceProjects: ['近 5 年综合素质真题刷完，作文写 3 篇并对照范文修改'],
        jobActions: '',
        certPrep: '教师资格证笔试（每年 3 月、9 月各一次，提前约 2 个月报名）',
        keyReminder: '综合素质看似简单，挂科最多的是 50 分大作文，作文不练肯定翻车。',
      },
      {
        theme: '教资笔试 · 教育知识与能力',
        learningTasks: ['教育学：教育目的、课程、教学、德育', '心理学/教育心理学：认知发展、学习理论、学习动机、学习迁移', '中学加考：学科知识与教学能力（学科专业知识 + 教学设计）'],
        practiceProjects: ['思维导图梳理教育学/心理学框架，每天 1 章选择题 + 1 道简答/材料题'],
        jobActions: '',
        certPrep: '教师资格证笔试',
        keyReminder: '教育知识要背的量极大，靠考前突击必挂，从现在开始滚动背诵到考前。',
      },
      {
        theme: '教资笔试冲刺 · 走进考场',
        learningTasks: ['真题套卷限时模拟，主观题按答题模板练手', '简答题/材料分析题高频考点背诵', '同步观摩名师课堂视频，练教姿教态与板书'],
        practiceProjects: ['参加教资笔试；考完当天对答案估分，不合格科目立刻报下一批次'],
        jobActions: '',
        certPrep: '教师资格证笔试（本月参加考试）',
        keyReminder: '笔试单科成绩有效期 2 年，挂科可以分批过，但别拖过有效期作废。',
      },
      {
        theme: '教资面试 · 结构化 + 试讲',
        learningTasks: ['结构化问答：职业认知、应急应变、组织管理、人际沟通四大题型', '试讲：写教案 → 10 分钟无生试讲 → 板书设计，覆盖报考学段教材重点篇目', '答辩：围绕试讲内容与教学设计应答'],
        practiceProjects: ['每天录 1 条试讲视频回听复盘，找搭子互相点评不少于 10 次'],
        jobActions: '',
        certPrep: '教师资格证面试（笔试出分后报名，5 月、12 月~次年 1 月考试）',
        keyReminder: '面试通过率比笔试高，但"像不像老师"一眼便知，必须开口练、录像练，不能只背教案。',
      },
      {
        theme: '教资认定 · 教招考情调研',
        learningTasks: ['笔面合格后完成教师资格认定：体检 + 普通话证 + 材料审核，领取教师资格证', '调研目标地区教师招聘（考编）：公告渠道、笔试科目、报录比、进面分数线', '教招笔试入门：教育综合知识（教育学、心理学、教育心理学、师德法规、新课改）框架了解'],
        practiceProjects: ['建立目标地区教招公告监控清单（教育局/人社局官网、官方公众号），整理近 2 年岗位表'],
        jobActions: '关注各地教师招聘公告（集中在 3~8 月发布，部分地区秋冬也有批次）',
        certPrep: '教师资格认定（春秋两季）拿证；教招考试本身不发证书，教师资格证是报名门槛',
        keyReminder: '拿到教资只是入场券，考编才是主战场——报录比几十比一是常态，选岗和笔试分同样重要。',
      },
      {
        theme: '教招笔试 · 教综系统一轮',
        learningTasks: ['教育学：教育与教育学、课程、教学、德育、班主任工作', '心理学 + 教育心理学：学习理论、动机、迁移、心理健康', '师德法规 + 新课标/新课改理念'],
        practiceProjects: ['教综教材完整过一轮，每章配章节题，建立知识框架笔记'],
        jobActions: '',
        certPrep: '',
        keyReminder: '教综知识点碎、分值细，一轮求理解不求全背，框架比逐字背诵重要。',
      },
      {
        theme: '教招笔试 · 学科专业知识',
        learningTasks: ['学科知识刷到中考/高考难度（按报考学段）', '教材教法：课程标准、教学设计、案例分析', '教综主观题：论述题、案例分析题答题模板背诵'],
        practiceProjects: ['近 5 年目标地区学科真题 + 中高考真题每天 1 套，错题归因'],
        jobActions: '',
        certPrep: '',
        keyReminder: '学科分是拉分大头：教综大家背得差不多，学科功底决定笔试排名。',
      },
      {
        theme: '公告季 · 选岗报名',
        learningTasks: ['盯公告：报名时间、笔试科目、编制/备案制/合同制差异', '选岗策略：学段学科、城区/乡镇、报录比、历年进面分对比', '报名材料：教师资格证、普通话证、学历学位证等备齐'],
        practiceProjects: ['做岗位对比表：招录人数/历年进面分/地理位置/服务期要求'],
        jobActions: '教师招聘公告密集发布期，完成报名并每日查看审核状态',
        certPrep: '',
        keyReminder: '乡镇岗竞争小但通常有 3~5 年服务期，异地乡镇岗报名前想清楚；特岗教师也是曲线入编路径。',
      },
      {
        theme: '教招笔试冲刺',
        learningTasks: ['教综 + 学科真题套卷限时训练，模拟考场节奏', '高频简答/论述题滚动背诵到考前', '考前回归错题本，不再学新内容'],
        practiceProjects: ['每周 3 套笔试套卷；笔试后立刻转入面试备考，不等出分'],
        jobActions: '参加教师招聘笔试；同步关注特岗教师、三支一扶支教、控制总量备案制岗位',
        certPrep: '',
        keyReminder: '教招笔面间隔常只有 1~2 周，等出分再准备面试必晚——考完笔试第二天就开始练试讲。',
      },
      {
        theme: '教招面试 · 试讲/说课 + 结构化',
        learningTasks: ['试讲/说课：报考学段教材逐篇备教案，形成自己的模板', '结构化：教育热点、班级管理、应急类题目开口练习', '答辩与仪态：板书、课堂互动、时间控制'],
        practiceProjects: ['全真模拟面试不少于 10 场（录像/搭子/培训班均可），打磨开场与互动感'],
        jobActions: '进面后准备资格复审材料；参加面试、体检、考察（政审）与选岗',
        certPrep: '',
        keyReminder: '评委多是一线校长和教研员，最怕"背稿子"——课堂互动感和学科素养装不出来。',
      },
      {
        theme: '上岸衔接 · 备选预案',
        learningTasks: ['录用签约、岗前培训，开学前备课与班主任工作入门', '若未上岸：复盘笔面失分点，规划特岗/民办学校/次年再战', '入职后路径：试用期考核、职称评定（二级教师 → 一级教师）'],
        practiceProjects: ['提前备好开学第一周的课与班级管理方案'],
        jobActions: '办理入编/聘用手续，9 月上岗；未上岸则投递民办学校/教培机构先积累教学经验',
        certPrep: '',
        keyReminder: '考编可以多地区巡考（时间不冲突时），应届身份和年龄门槛要用足，别只盯一个区。',
      },
    ],
    // 已持有教师资格证者（简历/技能中体现）：跳过考证阶段，12 个月全部用于教招备考
    certifiedGoalSummary: '已持有教师资格证，12 个月内系统备考教师招聘笔试与面试，成功上岸教师编',
    certifiedMonths: [
      {
        theme: '教招考情摸底 · 制定备考计划',
        learningTasks: ['凭已取得的教师资格证锁定可报学段与学科岗位', '整理目标地区近 3 年教招公告：编制/备案制/特岗、报录比、进面分、笔试科目', '教育综合知识教材通读：教育学、心理学、教育心理学整体框架'],
        practiceProjects: ['建立公告监控清单 + 岗位对比表（招录人数/进面分/服务期/地理位置）'],
        jobActions: '关注各地教师招聘公告（3~8 月密集发布，部分地区秋冬有批次）',
        certPrep: '',
        keyReminder: '已有教学经验是面试优势，但笔试教综要从头背——机构老师考编常栽在教综分数上。',
      },
      {
        theme: '教综一轮 · 教育学',
        learningTasks: ['教育学：教育与教育学、课程、教学、德育、班主任工作', '新课改/新课标理念、师德与教育法律法规', '章节选择题 + 简答题每日滚动练习'],
        practiceProjects: ['教综教育学部分框架笔记整理完毕，章节题全部刷完'],
        jobActions: '',
        certPrep: '',
        keyReminder: '教综考查细且偏记忆，第一遍慢没关系，框架搭好后面越背越快。',
      },
      {
        theme: '教综一轮 · 心理学与教育心理学',
        learningTasks: ['认知发展、学习理论、学习动机、学习迁移、心理健康', '教育心理学人物与实验对比记忆', '案例分析题答题模板入门'],
        practiceProjects: ['心理学部分思维导图 + 易混知识点对比表'],
        jobActions: '',
        certPrep: '',
        keyReminder: '心理学是教综失分重灾区，概念易混，对比表格比死记硬背有效得多。',
      },
      {
        theme: '学科专业知识系统过',
        learningTasks: ['学科知识刷到中考/高考难度（按报考学段）', '课程标准与教材教法：教学设计、案例分析规范答法', '梳理报考学段教材的知识体系'],
        practiceProjects: ['近 5 年学科真题 + 中高考真题每天 1 套，限时完成'],
        jobActions: '',
        certPrep: '',
        keyReminder: '有教学经验不代表学科笔试能过——教材教法/课标理论题要按新课标答案规范作答。',
      },
      {
        theme: '教综 + 学科刷题强化',
        learningTasks: ['教综主观题（论述/案例分析）背诵并动笔写', '学科大题/教学设计题限时训练', '错题本建立：知识盲点与审题失误分类统计'],
        practiceProjects: ['每周 2 套教综 + 2 套学科专项，错题逐道归因复盘'],
        jobActions: '',
        certPrep: '',
        keyReminder: '主观题不动笔写等于没背，考场才发现写不完、写不全。',
      },
      {
        theme: '真题套卷 · 全真模考',
        learningTasks: ['教综 + 学科近 5 年真题套卷限时训练', '固定做题顺序与时间分配', '申论式材料题/作文题（部分地区考）保持手感'],
        practiceProjects: ['每周 2 次全真模考，当天做完当天复盘'],
        jobActions: '',
        certPrep: '',
        keyReminder: '教招真题重复考点比例高，每套真题至少吃透三遍，模拟题质量参差不齐。',
      },
      {
        theme: '面试基本功预热（笔试期同步）',
        learningTasks: ['报考学段教材逐篇备简案，重点篇目精备', '试讲 10 分钟结构：导入/新授/互动/小结/板书', '教姿教态、普通话表达与课堂互动语训练'],
        practiceProjects: ['每周录 2 条试讲视频，找搭子互评'],
        jobActions: '',
        certPrep: '',
        keyReminder: '笔面间隔常只有 1~2 周，笔试期间每周留半天练试讲，出分后才不慌。',
      },
      {
        theme: '公告季 · 选岗报名',
        learningTasks: ['盯公告：报名时间、笔试科目、编制/备案制/合同制差异', '选岗策略：学段学科、城区/乡镇、报录比、历年进面分对比', '报名材料：教师资格证、普通话证、学历学位证等备齐'],
        practiceProjects: ['做岗位对比表：招录人数/历年进面分/地理位置/服务期要求'],
        jobActions: '教师招聘公告密集发布期，完成报名并每日查看审核状态；时间不冲突可多地区报名',
        certPrep: '',
        keyReminder: '限制条件越多（专业/学段/户籍/应届）竞争越小，别图学校名字好听去挤千人岗。',
      },
      {
        theme: '教招笔试冲刺',
        learningTasks: ['回归错题本与高频考点，不再学新内容', '高频简答/论述题滚动背诵到考前', '作息调整到考试节奏'],
        practiceProjects: ['考前一周每天一套题保持手感，减量不减节奏'],
        jobActions: '打印准考证、踩点考场；参加教师招聘笔试',
        certPrep: '',
        keyReminder: '笔试考完第二天就转面试备考，等出分再准备试讲必然来不及。',
      },
      {
        theme: '教招面试 · 试讲/说课冲刺',
        learningTasks: ['试讲/说课模板定型，教材重点篇目全覆盖', '结构化：教育热点、班级管理、应急类题目开口练', '全真模拟：板书、互动、答辩、时间控制'],
        practiceProjects: ['全真模拟面试不少于 10 场并录像复盘'],
        jobActions: '进面后准备资格复审材料；参加面试、体检、考察（政审）',
        certPrep: '',
        keyReminder: '有教学经验的人最大的风险是"演成平时上课"——考编试讲要环节完整、亮点密集，10 分钟内见真章。',
      },
      {
        theme: '多地巡考 · 体检考察',
        learningTasks: ['笔试出分前备齐资格复审材料', '时间不冲突时参加特岗教师、三支一扶支教、其他区县巡考', '体检标准、考察（政审）流程与档案材料准备'],
        practiceProjects: ['建立巡考日程表，各节点材料按公告 checklist 核对'],
        jobActions: '参加多地面试/体检；按优先级确认录用意向',
        certPrep: '',
        keyReminder: '考编是概率战，多报多考能显著提高上岸率，前提是时间和材料不冲突。',
      },
      {
        theme: '上岸衔接 · 备选预案',
        learningTasks: ['录用签约、岗前培训，开学前备课与班主任工作入门', '若未上岸：复盘笔面失分点，规划特岗/民办学校/次年再战', '入职后路径：试用期考核、职称评定（二级教师 → 一级教师）'],
        practiceProjects: ['提前备好开学第一周的课与班级管理方案'],
        jobActions: '办理入编/聘用手续，9 月上岗；未上岸则投递民办学校/教培机构先积累教学经验',
        certPrep: '',
        keyReminder: '选岗时的服务期和异地成本要提前想清楚，上岸后的调动比上岸本身更难。',
      },
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

/**
 * 有工作经验的用户跳过入门月份后，用「进阶月份」补齐 12 个月计划。
 * 内容基于路线自身的 year1+ 节点技能/瓶颈/天花板动态生成，
 * 主题围绕"补下一级短板 → 主导项目 → 跳槽/晋升 → 站稳新角色"，
 * 而不是让工作多年的人再从"了解岗位是什么"学起。
 */
export function buildAdvancedTailMonths(route: CareerRoute, count: number): GrowthMonthTemplate[] {
  const cur = route.nodes[0]
  const curSkills = new Set(cur?.requiredSkills || [])
  const futureSkills = [
    ...new Set(
      route.nodes
        .slice(1)
        .flatMap((n) => n.requiredSkills)
        .filter((s) => !curSkills.has(s))
    ),
  ]
  const futureCerts = [...new Set(route.nodes.flatMap((n) => n.certificates).filter(Boolean))]
  const nextTitle = route.nodes[1]?.title || cur?.title || '目标岗位'
  const skill = (i: number, fallback: string) => futureSkills[i] || fallback

  const pool: GrowthMonthTemplate[] = [
    {
      theme: `对标「${nextTitle}」：能力差距盘点`,
      learningTasks: [
        `梳理已掌握技能与「${nextTitle}」岗位要求的差距清单`,
        `${skill(0, '核心专业技能')}：系统补理论，并在当前工作中找落地场景`,
        `${skill(1, '业务/协作能力')}：对照上级岗位 JD 逐项找短板`,
      ],
      practiceProjects: ['输出一份个人能力盘点与 12 个月进阶路线图'],
      jobActions: '',
      certPrep: futureCerts[0] || '',
      keyReminder: route.nodes[1]?.bottleneck || '进阶的关键是补上一级岗位的短板，而不是把已经熟练的活再重复一年。',
    },
    {
      theme: `核心技能深耕：${skill(2, '从会用到精通')}`,
      learningTasks: [
        `${skill(2, '选定一项核心技能')}：深耕到团队前 20% 的水平`,
        `${skill(3, '补齐相邻技能栈')}，从单一执行走向完整方案`,
        '主动在工作中承担更复杂、要求更高的任务',
      ],
      practiceProjects: ['在本职工作中主导一个高难度任务，并用数据记录结果'],
      jobActions: '',
      certPrep: '',
      keyReminder: '这个阶段最忌讳"什么都懂一点"，资深和中级的差距就在一项能打的纵深能力。',
    },
    {
      theme: '主导项目：从执行者到负责人',
      learningTasks: [
        '主动牵头一个跨同事/跨部门的项目并全流程负责',
        '项目管理：目标拆解、进度与风险控制、复盘沉淀',
        `${skill(4, '向上管理与跨部门沟通')}：定期同步进展、争取资源`,
      ],
      practiceProjects: ['完整主导一个项目，写出数据化复盘报告（背景/动作/结果/反思）'],
      jobActions: '',
      certPrep: '',
      keyReminder: '晋升答辩和跳槽面试只认"你主导过什么"——参与过和负责人是两回事。',
    },
    {
      theme: '业务结果与团队影响力',
      learningTasks: [
        '用数据量化自己的工作产出（效率提升/成本节省/收入增长）',
        '把重复工作流程化、工具化，形成团队可复用的成果',
        '沉淀方法论并在团队内分享，开始带教新人',
      ],
      practiceProjects: ['产出一份团队可复用的 SOP/工具/方法论文档并推动落地'],
      jobActions: '',
      certPrep: futureCerts[1] || futureCerts[0] || '',
      keyReminder: '能不能带教和复制经验，是公司判断你是否具备晋升资格的重要信号。',
    },
    {
      theme: '简历与作品集重构（数据化）',
      learningTasks: [
        '按 STAR 法则重写近年项目经历，每条都配数据结果',
        `对照「${nextTitle}」的 JD 补齐简历关键词`,
        '整理作品集/项目文档/可展示成果',
      ],
      practiceProjects: [`完成一版面向「${nextTitle}」的简历，请 1~2 位同行 review`],
      jobActions: '更新简历与招聘平台档案，关注目标岗位薪资行情',
      certPrep: '',
      keyReminder: '简历上没有数据和结果，工作年限就会被当成"重复了 N 年的一年经验"。',
    },
    {
      theme: '目标岗位调研与定向投递',
      learningTasks: [
        `调研目标公司/内部晋升岗位对「${nextTitle}」的要求与薪资带`,
        '内推优先，其次定向投递，不海投',
        '针对高频面试考点查漏补缺',
      ],
      practiceProjects: ['建立投递/晋升跟踪表（岗位、要求、进度、反馈、复盘）'],
      jobActions: '开始定向投递或申请内部晋升，每周复盘反馈',
      certPrep: '',
      keyReminder: '这个阶段跳槽涨幅通常 20%~40%，长期不调薪的人最容易被市场落下。',
    },
    {
      theme: '面试 / 晋升答辩冲刺',
      learningTasks: [
        '项目深挖准备：为什么做、怎么权衡、结果如何、能否复用',
        '高级岗高频题：方案取舍、跨部门冲突、带团队/带项目经历',
        '模拟面试或晋升答辩演练，录像复盘',
      ],
      practiceProjects: ['完成不少于 5 场模拟面试/答辩演练'],
      jobActions: '密集面试/答辩，争取手握 2~3 个 offer 或晋升名额再决策',
      certPrep: '',
      keyReminder: '高级岗位不再只考知识点，考的是判断与权衡——准备好"为什么这样选"。',
    },
    {
      theme: '谈薪与选择',
      learningTasks: [
        `了解${route.industry}行业「${nextTitle}」的薪资行情与谈判空间`,
        'offer/晋升机会对比：平台、团队、成长、薪资四维打分',
        '背调与离职/入职材料准备',
      ],
      practiceProjects: [],
      jobActions: '拿到 offer/晋升结果，理性比较后做选择并提离职',
      certPrep: '',
      keyReminder: '别只看月薪涨幅：平台走下坡路时，高 2K 可能透支下一段履历。',
    },
    {
      theme: '新角色 90 天站稳计划',
      learningTasks: [
        '提前熟悉新团队业务与工具链',
        '制定 30/60/90 天目标：先出小结果，再接大项目',
        '建立新团队的信任与协作网络',
      ],
      practiceProjects: ['写一份入职/晋升后 90 天行动计划'],
      jobActions: '完成入职/晋升交接，前 90 天快速拿出第一个可见结果',
      certPrep: '',
      keyReminder: '换岗后的前 3 个月决定别人对你的定级判断，别用"还在适应"当借口。',
    },
    {
      theme: '个人成果资产化 · 不可替代性',
      learningTasks: [
        '梳理核心竞争力清单：能解决什么别人解决不了的问题',
        '争取高曝光度项目/关键任务，进入上级视野',
        '定期体检职业风险（行业下行、部门变动）并准备 Plan B',
      ],
      practiceProjects: ['建立个人"成就档案"：按季度记录可量化的工作成果'],
      jobActions: '',
      certPrep: '',
      keyReminder: '职业安全感不来自公司，来自随时能走的能力和正在进行的结果。',
    },
    {
      theme: '行业视野与人脉积累',
      learningTasks: [
        '参加行业会议/线下活动，建立同行交流圈',
        '关注行业趋势、政策变化与目标公司动态',
        '与猎头、前同事、同行保持定期联系',
      ],
      practiceProjects: ['约 3 位目标岗位的同行做信息访谈，了解真实工作与招聘内情'],
      jobActions: '激活内推人脉，适度告知求职/晋升意向',
      certPrep: '',
      keyReminder: '高级岗位一半以上靠内推，人脉是跳槽时最被低估的筹码。',
    },
    {
      theme: `站稳下一台阶 · 看向「${route.ceiling}」`,
      learningTasks: [
        '把项目经验沉淀为内部分享/公开文章，建立个人专业品牌',
        '建立工作成果的反馈闭环，固定复盘节奏',
        `关注「${route.ceiling}」所需的能力与资源，提前积累`,
      ],
      practiceProjects: ['输出 2 篇深度复盘文章，或完成 1 次团队级经验分享'],
      jobActions: '转正/晋升后首次绩效目标对齐',
      certPrep: '',
      keyReminder: `看清天花板：${route.ceiling}。能不能把经验讲清楚、教给别人，是资深和熟练工的分水岭。`,
    },
  ]
  return pool.slice(0, Math.max(0, Math.min(count, pool.length)))
}
