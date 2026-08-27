// 职业动态模块 - 本地内置赛道情报数据集
// 离线模式下由 intel.ts 规则引擎基于此数据集 + 确定性扰动生成"采集快照"，
// 内容参考 2025–2026 年国内主流招聘平台公开报告的市场基调。

export interface IntelSeed {
  id: string
  name: string
  tags: string[]
  /** 基准热度 0~100 */
  baseHeat: number
  /** 基准招聘需求 1~5 */
  baseDemand: number
  /** 竞争/内卷强度 1~5 */
  competition: number
  /** 长期动量：每 30 天热度漂移点数（正=上升通道，负=收缩通道） */
  momentum: number
  /** 随机扰动幅度（热度点数） */
  volatility: number
  summary: string
  hotSkills: string[]
  decliningSkills: string[]
  signals: string[]
  opportunities: string[]
  risks: string[]
  salaryJunior: [number, number]
  salaryMid: [number, number]
  /** 薪资同比基准 % */
  baseYoY: number
}

export const INTEL_CATALOG: IntelSeed[] = [
  {
    id: 'ai-application',
    name: 'AI/大模型应用开发',
    tags: ['风口', '大模型', '高薪', '政策扶持'],
    baseHeat: 92,
    baseDemand: 5,
    competition: 4,
    momentum: 1.6,
    volatility: 4,
    summary: '大模型应用层岗位持续放量，Agent/RAG 工程化人才紧缺，企业从"招算法"转向"招会用模型解决业务问题的人"。',
    hotSkills: ['LLM 应用开发', 'RAG/Agent 编排', 'Prompt 工程', 'Python', '向量数据库', '模型微调'],
    decliningSkills: ['纯调参', '只会调 API 的 Demo 级开发'],
    signals: [
      '互联网与金融科技公司普遍设立 AI 应用团队，Java/Go 后端转 AI 工程岗位增多',
      '政企私有化部署项目增加，带动传统软件公司 AI 岗位需求',
      '应届生"AI 工程化"实习岗位数量同比明显增长',
    ],
    opportunities: [
      '传统软件/后端工程师转 AI 应用开发窗口期仍在，项目经验比论文更重要',
      '垂直行业（法律、医疗、制造）AI 落地缺既懂业务又懂模型的复合人才',
    ],
    risks: [
      '纯算法研究岗仍卡名校硕士，培训班"三个月转 AI"话术不可信',
      '技术迭代极快，今天热门的框架半年后可能被淘汰',
    ],
    salaryJunior: [12, 20],
    salaryMid: [30, 55],
    baseYoY: 12,
  },
  {
    id: 'new-energy',
    name: '新能源/储能',
    tags: ['风口', '制造业', '政策扶持'],
    baseHeat: 84,
    baseDemand: 5,
    competition: 3,
    momentum: 1.0,
    volatility: 4,
    summary: '动力电池、储能、光伏出海链条保持高景气，基地多在二三线城市，工科应届生需求量大。',
    hotSkills: ['电池系统设计', 'BMS', '储能系统集成', '电力电子', 'IEC/UL 认证', '海外项目经验'],
    decliningSkills: ['传统燃油车动力总成', '低端产线工艺'],
    signals: [
      '储能装机目标持续上调，系统集成与海外认证人才紧缺',
      '车企价格战传导至供应链，部分电池厂岗位向中西部基地转移',
    ],
    opportunities: [
      '材料、电气、自动化专业进新能源链条的校招门槛远低于互联网大厂',
      '出海方向（欧洲/中东）小语种+技术复合人才溢价明显',
    ],
    risks: [
      '行业产能阶段性过剩，二三线供应商有裁员风险',
      '基地位置偏远，择业时需接受异地与厂区环境',
    ],
    salaryJunior: [8, 13],
    salaryMid: [18, 32],
    baseYoY: 7,
  },
  {
    id: 'smart-driving',
    name: '智能驾驶/车载软件',
    tags: ['风口', '硬科技', '高薪'],
    baseHeat: 80,
    baseDemand: 4,
    competition: 4,
    momentum: 1.2,
    volatility: 5,
    summary: '城市 NOA 开城竞赛带动智驾软件岗需求，舱驾融合、端到端方案成为招聘关键词。',
    hotSkills: ['C++/Linux', '自动驾驶算法', 'ROS', '功能安全 ISO26262', '嵌入式', '数据闭环'],
    decliningSkills: ['传统车机应用开发', '单机版 ADAS 维护'],
    signals: [
      '头部车企智驾团队校招薪资对标互联网，算法岗仍要求硕士以上',
      'Tier1 供应商向软件定义汽车转型，车载中间件岗位增加',
    ],
    opportunities: [
      '嵌入式/后台工程师转车载软件路径通畅，C++ 功底是硬通货',
      '测试、数据标注闭环等岗位对本科友好，可作为入行跳板',
    ],
    risks: [
      '融资遇冷的中小智驾公司有倒闭/被并购风险，择业看融资进度',
      '算法岗名校集中度高，非硕非 985 建议走工程/测试路线',
    ],
    salaryJunior: [12, 20],
    salaryMid: [28, 50],
    baseYoY: 9,
  },
  {
    id: 'semiconductor',
    name: '芯片/半导体',
    tags: ['风口', '硬科技', '国产替代'],
    baseHeat: 78,
    baseDemand: 4,
    competition: 3,
    momentum: 0.8,
    volatility: 4,
    summary: '国产替代长期逻辑不变，数字 IC、验证、封测岗位稳定招聘，模拟与射频工程师紧缺。',
    hotSkills: ['Verilog/SystemVerilog', 'UVM 验证', 'EDA', 'SoC 架构', '封测工艺', 'DFT'],
    decliningSkills: ['纯版图搬运', '低阶测试开发'],
    signals: [
      '大厂自研芯片团队扩编，验证岗位需求量为设计岗的 2~3 倍',
      '半导体设备与材料环节国产化率提升，工艺工程师需求稳定',
    ],
    opportunities: [
      '验证/DFT 岗对微电子相关专业本科相对友好，入行门槛低于设计',
      '设备材料端企业多在长三角/珠三角，offer 竞争小于互联网',
    ],
    risks: [
      '行业周期波动大，消费电子低迷时段招聘冻结常见',
      '培养周期长，前 3 年薪资涨幅慢于互联网，需要耐心',
    ],
    salaryJunior: [10, 16],
    salaryMid: [25, 45],
    baseYoY: 6,
  },
  {
    id: 'cross-border-ecom',
    name: '跨境电商',
    tags: ['风口', '出海', '运营'],
    baseHeat: 76,
    baseDemand: 4,
    competition: 3,
    momentum: 1.1,
    volatility: 5,
    summary: 'Temu/TikTok Shop/亚马逊多平台扩张，跨境运营、海外投放、供应链岗位需求旺，小语种有溢价。',
    hotSkills: ['海外社媒投放', 'TikTok 运营', '选品数据分析', '供应链管理', '小语种', '独立站'],
    decliningSkills: ['传统铺货模式运营', '纯客服型跨境跟单'],
    signals: [
      '半托管模式兴起，平台招商与商家运营岗位同步增加',
      '拉美、中东新兴市场放量，西语/阿语运营人才紧缺',
    ],
    opportunities: [
      '外语+运营复合背景入行快，专科/普通本科也有机会',
      '精品品牌路线的卖家公司利润好，提成上不封顶',
    ],
    risks: [
      '平台政策与关税波动大，公司倒闭率高，选公司比选岗位重要',
      '加班与时差问题普遍，旺季工作强度接近互联网大厂',
    ],
    salaryJunior: [6, 10],
    salaryMid: [15, 30],
    baseYoY: 8,
  },
  {
    id: 'robotics',
    name: '机器人/具身智能',
    tags: ['风口', '前沿', '硬科技'],
    baseHeat: 74,
    baseDemand: 3,
    competition: 4,
    momentum: 1.8,
    volatility: 6,
    summary: '人形机器人与具身智能获资本密集下注，运动控制、视觉、仿真岗位开始小规模批量招聘。',
    hotSkills: ['运动控制', 'SLAM/视觉', 'ROS2', '强化学习', '仿真到实机迁移', 'C++'],
    decliningSkills: [],
    signals: [
      '多家头部机器人公司开启校招，岗位以算法与嵌入式为主',
      '工业机器人本体厂商扩产，集成应用工程师需求稳定',
    ],
    opportunities: [
      '赛道处于早期，入行即有股票/期权想象空间',
      '自动化、机械、控制专业可切入，不局限于计算机背景',
    ],
    risks: [
      '商业化落地尚早，部分初创公司现金流紧张',
      '岗位总量仍小，HC 集中在少数城市与公司',
    ],
    salaryJunior: [12, 20],
    salaryMid: [28, 48],
    baseYoY: 10,
  },
  {
    id: 'biotech',
    name: '生物医药/创新药',
    tags: ['风口', '高门槛', '长周期'],
    baseHeat: 71,
    baseDemand: 3,
    competition: 3,
    momentum: 0.6,
    volatility: 4,
    summary: '创新药出海授权交易回暖，临床、注册、CMC 岗位稳定，硕博学历门槛依然刚性。',
    hotSkills: ['临床试验管理 CRA', '药品注册申报', 'CMC/工艺开发', 'GLP-1 代谢方向', 'ADC/双抗'],
    decliningSkills: ['低端医药代表', '仿制药重复开发'],
    signals: [
      'License-out 交易创历史新高，带动临床与注册岗位需求',
      'CXO 行业订单回暖，生产质量类岗位招聘恢复',
    ],
    opportunities: [
      '临床监察员 CRA 对本科药学/护理相关专业友好，入行后涨幅稳定',
      '有海外申报经验的注册人才稀缺，薪资溢价高',
    ],
    risks: [
      '研发岗硕博门槛刚性，本科只能选择销售/临床支持方向',
      '管线失败即裁员，初创 Biotech 风险高',
    ],
    salaryJunior: [8, 13],
    salaryMid: [20, 38],
    baseYoY: 5,
  },
  {
    id: 'frontend',
    name: '前端开发',
    tags: ['收缩预警', '互联网', '供给过剩'],
    baseHeat: 48,
    baseDemand: 3,
    competition: 5,
    momentum: -1.0,
    volatility: 4,
    summary: '初级前端岗位持续收缩，招聘要求向"全栈+工程化+AI 工具链"迁移，只会写页面的新人空间被压缩。',
    hotSkills: ['TypeScript 工程化', 'Node/全栈', 'AI 编程工具', '性能优化', '跨端'],
    decliningSkills: ['jQuery', '切图还原型页面开发', '只会 Vue/React 基础用法'],
    signals: [
      '大厂前端校招 HC 连续收缩，简历池里 3 年经验候选人扎堆',
      'AI 生成页面代码成熟，初级岗位被进一步压缩',
    ],
    opportunities: [
      '前端 + Node/AI 应用的复合方向仍有岗位，往业务工程师转型',
      '传统行业数字化、政企项目对稳定型前端仍有持续需求',
    ],
    risks: [
      '零经验转行前端的窗口基本关闭，培训班供给严重过剩',
      '25K 是中小厂明显分水岭，进不了大厂涨幅受限',
    ],
    salaryJunior: [7, 11],
    salaryMid: [16, 26],
    baseYoY: -3,
  },
  {
    id: 'new-media',
    name: '新媒体/短视频运营',
    tags: ['收缩预警', '内容', '供给过剩'],
    baseHeat: 55,
    baseDemand: 3,
    competition: 5,
    momentum: -0.8,
    volatility: 5,
    summary: '内容行业流量见顶，纯剪辑/文案岗薪资停滞，能闭环带货或做 IP 操盘的运营才有溢价。',
    hotSkills: ['IP 操盘', '直播投流', '短视频带货', '数据复盘', 'AI 内容工具'],
    decliningSkills: ['纯视频剪辑', '洗稿文案', '纯排版新媒体编辑'],
    signals: [
      '品牌方缩减自媒体预算，岗位向"内容+转化"一体化合并',
      'AI 批量生成内容普及，基础剪辑/文案外包价格继续下探',
    ],
    opportunities: [
      '垂直行业 IP（法律、医疗、职场）仍缺懂专业的内容人',
      '短视频+直播电商闭环岗位提成空间大',
    ],
    risks: [
      '入行门槛低导致供给极度过剩，平均薪资多年不涨',
      '小公司 MCN 倒闭率高，劳动合同与提成纠纷多发',
    ],
    salaryJunior: [5, 8],
    salaryMid: [10, 20],
    baseYoY: -4,
  },
  {
    id: 'real-estate',
    name: '房地产/土木建筑',
    tags: ['收缩预警', '下行周期'],
    baseHeat: 30,
    baseDemand: 2,
    competition: 3,
    momentum: -1.2,
    volatility: 3,
    summary: '地产开发链条持续收缩，设计院与施工单位招聘冻结，转型基建运维、城市更新、海外工程是主要出路。',
    hotSkills: ['城市更新', 'BIM', '工程数字化', '海外工程 EPC', '物业资产管理'],
    decliningSkills: ['传统住宅设计', '地产投资拓展', '售楼渠道'],
    signals: [
      '多家头部房企退出开发业务，校招规模较峰值大幅缩减',
      '设计院降薪裁员持续，注册证书人员转行增多',
    ],
    opportunities: [
      '一带一路海外项目缺人，外派补贴高，接受驻外可考虑',
      '基础设施运维、城市更新等政府主导方向相对稳定',
    ],
    risks: [
      '行业下行未见底，入行即面临薪资缩水与项目停滞',
      '地产相关岗位与地方财政深度绑定，二三线城市风险更高',
    ],
    salaryJunior: [5, 8],
    salaryMid: [10, 18],
    baseYoY: -8,
  },
  {
    id: 'k12-edu',
    name: '教培/K12',
    tags: ['收缩预警', '政策敏感'],
    baseHeat: 33,
    baseDemand: 2,
    competition: 3,
    momentum: -0.5,
    volatility: 3,
    summary: 'K12 学科培训在政策后转入地下与小规模化，岗位零散；素质教育、职业教育、教育出海是相对安全方向。',
    hotSkills: ['职业教育课程开发', '科学/编程素养教育', '教育出海', '研学营地', 'AI 教育产品'],
    decliningSkills: ['学科类一对一辅导', '大班课主讲'],
    signals: [
      '学科类培训需求以家教/小班形式存在，但用工不规范',
      '职业教育与企业培训预算增长，课程教研岗位增加',
    ],
    opportunities: [
      '职教、产教融合方向有政策与资金支持，岗位正规化程度高',
      '教培出身的表达能力可迁移至直播讲师、企业内训',
    ],
    risks: [
      '学科类岗位无社保、无合同现象普遍，职业发展无积累',
      '政策风险长期存在，机构随时可能停业',
    ],
    salaryJunior: [5, 8],
    salaryMid: [9, 16],
    baseYoY: -5,
  },
  {
    id: 'silver-economy',
    name: '养老/银发经济',
    tags: ['蓝海', '民生', '政策扶持'],
    baseHeat: 42,
    baseDemand: 4,
    competition: 2,
    momentum: 1.0,
    volatility: 3,
    summary: '老龄化加速推动养老服务、康复器械、适老化改造需求，护理与管理人才缺口大但薪资仍在爬坡。',
    hotSkills: ['康复治疗', '养老机构运营', '适老化产品设计', '老年医学', '长护险服务'],
    decliningSkills: [],
    signals: [
      '多地补贴养老护理岗位，社区嵌入式养老机构数量增长',
      '险资与地产商入局康养社区，运营管理岗开始出现',
    ],
    opportunities: [
      '护理、康复专业应届生竞争极小，持证即就业',
      '养老机构管理、适老科技产品岗位几乎没有名校生竞争',
    ],
    risks: [
      '行业整体薪资偏低，回本周期长，需要熬到管理岗',
      '小型养老机构经营困难，优先选择连锁/险资背景',
    ],
    salaryJunior: [5, 8],
    salaryMid: [10, 18],
    baseYoY: 6,
  },
  {
    id: 'agritech',
    name: '农业科技/乡村振兴',
    tags: ['蓝海', '政策扶持', '基层'],
    baseHeat: 38,
    baseDemand: 3,
    competition: 2,
    momentum: 0.8,
    volatility: 3,
    summary: '智慧农业、设施农业、农产品供应链在政策资金支持下扩张，农学+数据/电商复合人才几乎无竞争。',
    hotSkills: ['智慧农业/IoT', '农产品电商', '育种技术', '供应链品控', '农业项目申报'],
    decliningSkills: [],
    signals: [
      '各地农业产业园招商，技术与运营岗位需求增加',
      '预制菜与生鲜供应链整合，品控与采购岗位稳定',
    ],
    opportunities: [
      '报考基层农技岗位、大学生村官有政策加分与编制机会',
      '农产品直播电商创业成本低，懂农业的内容人稀缺',
    ],
    risks: [
      '岗位地域集中在县域，接受基层工作是前提',
      '行业薪资天花板低，更适合求稳定或家乡就业',
    ],
    salaryJunior: [5, 8],
    salaryMid: [9, 16],
    baseYoY: 4,
  },
  {
    id: 'healthcare',
    name: '医疗健康/护理',
    tags: ['蓝海', '民生', '稳定'],
    baseHeat: 50,
    baseDemand: 5,
    competition: 2,
    momentum: 0.7,
    volatility: 3,
    summary: '护理、康复、医技岗位常年紧缺，三甲难进但基层与民营机构缺口大，职业稳定性极强。',
    hotSkills: ['专科护士（ICU/手术室）', '康复治疗', '影像/检验技术', '居家护理', '医美咨询'],
    decliningSkills: [],
    signals: [
      '多地三甲医院扩招护理硕士，本科护士进大三甲机会收窄',
      '居家护理与康复中心连锁化，院外健康岗位增长快',
    ],
    opportunities: [
      '护理专业就业率长期接近饱和，专科护士薪资稳步上行',
      '医美、口腔、体检等消费医疗收入弹性大于公立体系',
    ],
    risks: [
      '夜班与工作强度大，职业倦怠率高',
      '编制岗位竞争激烈，合同制待遇差距明显',
    ],
    salaryJunior: [6, 10],
    salaryMid: [12, 22],
    baseYoY: 5,
  },
  {
    id: 'data-analysis',
    name: '数据分析',
    tags: ['平稳', '跨行业通用'],
    baseHeat: 63,
    baseDemand: 4,
    competition: 4,
    momentum: 0.2,
    volatility: 4,
    summary: '纯取数工具人岗位被 AI 压缩，但懂业务的数据分析师在零售、金融、制造业仍稳定需求。',
    hotSkills: ['SQL+Python', '业务指标体系', 'A/B 实验', 'BI 可视化', '行业 know-how'],
    decliningSkills: ['纯 Excel 取数', '只会做报表的"表哥表姐"'],
    signals: [
      '岗位 JD 普遍加入"会用 AI 工具提效"要求',
      '制造业与零售业数字化部门扩招数据岗，竞争小于互联网',
    ],
    opportunities: [
      '数据分析+业务背景的复合路线抗替代性强',
      '传统行业数据岗竞争小，适合跨专业转入',
    ],
    risks: [
      '互联网大厂数据岗 HC 收缩，应届生竞争激烈',
      '脱离业务的纯技术数据岗容易被自动化取代',
    ],
    salaryJunior: [7, 12],
    salaryMid: [16, 30],
    baseYoY: 2,
  },
  {
    id: 'soe',
    name: '国企/银行/事业编',
    tags: ['平稳', '稳定', '体制内'],
    baseHeat: 66,
    baseDemand: 3,
    competition: 5,
    momentum: 0.1,
    volatility: 2,
    summary: '考公考编热度居高不下，银行网点与柜员岗缩减但金融科技、政策性岗位增加，报录比持续走高。',
    hotSkills: ['金融科技', '合规风控', '公文写作', '行测申论', '政策性银行业务'],
    decliningSkills: ['银行柜员', '传统信贷流程岗'],
    signals: [
      '国考报名人数再创新高，热门岗位报录比超千比一',
      '国企校招向硕士与理工科倾斜，金融科技子公司扩招',
    ],
    opportunities: [
      '政策性银行、国企科技子公司待遇优于传统网点岗位',
      '基层选调、三支一扶等通道竞争小于国考，适合求稳',
    ],
    risks: [
      '全职备考机会成本高，多年未上岸案例普遍',
      '柜员等传统岗位缩编，入职岗位与预期可能不符',
    ],
    salaryJunior: [6, 10],
    salaryMid: [12, 22],
    baseYoY: 1,
  },
]

export function findSeed(id: string): IntelSeed | undefined {
  return INTEL_CATALOG.find((s) => s.id === id)
}

/** 自定义赛道（本地数据集没有）的通用模板，按名称生成一份中性情报 */
export function genericSeed(id: string, name: string): IntelSeed {
  return {
    id,
    name,
    tags: ['自定义监控'],
    baseHeat: 52,
    baseDemand: 3,
    competition: 3,
    momentum: 0,
    volatility: 3,
    summary: `「${name}」为自定义监控赛道，本地模式使用通用模板生成模拟情报；切换到 AI 模式刷新可获得大模型生成的在线动态分析。`,
    hotSkills: ['行业核心技能', '数字化工具', '项目经验'],
    decliningSkills: [],
    signals: [
      `本地模板提示：请在 AI 模式下刷新，获取「${name}」的真实在线市场动态`,
      '建议关注主流招聘平台该关键词的 JD 数量与薪资变化',
    ],
    opportunities: ['切换 AI 模式后可获得针对性的机会点分析'],
    risks: ['本地模式下自定义赛道数据为占位模板，不代表真实市场情况'],
    salaryJunior: [6, 10],
    salaryMid: [14, 24],
    baseYoY: 0,
  }
}
