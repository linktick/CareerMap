// 目标岗位选项库
// ============================================================
// 向导页「目标岗位」选择器数据源：按行业/方向分组的常见岗位，
// 覆盖本地岗位数据集 RAW_ROUTES 的全部赛道（关键词可命中），
// 用户也可以在选择器中直接手动输入任意岗位名（NSelect tag 模式）。
//
// 维护说明：新增岗位名称时，确保它能被
//   - RAW_ROUTES 的 keywords / name 子串命中，或
//   - local/index.ts 的 ALIASES 同义词表展开命中，
// 否则该岗位在本地推演中无法撬动路线排序（AI 模式不受影响，模型可直接理解）。

import type { SelectGroupOption, SelectOption } from 'naive-ui'

const opt = (name: string): SelectOption => ({ label: name, value: name })

/**
 * 按行业分组的常见岗位清单。
 * 岗位名刻意采用招聘平台上的通用叫法（如「后端工程师(Java)」），
 * 括号内的技术方向/同义词用于关键词匹配，不影响展示。
 */
export const TARGET_POSITION_GROUPS: SelectGroupOption[] = [
  {
    type: 'group',
    key: 'internet_dev',
    label: '互联网 / 软件研发',
    children: [
      '前端工程师', '后端工程师(Java)', 'Python开发工程师', 'Go开发工程师',
      '安卓开发工程师', 'iOS开发工程师', '测试工程师', '测试开发工程师',
      '运维工程师', 'DevOps/SRE工程师', '算法工程师', '大数据开发工程师',
      '数据分析师', '数据挖掘工程师',
    ].map(opt),
  },
  {
    type: 'group',
    key: 'product_design',
    label: '产品 / 设计',
    children: [
      '互联网产品经理', '电商产品经理', 'UI设计师', '交互设计师(UX)',
      '平面设计师', '工业/产品设计师',
    ].map(opt),
  },
  {
    type: 'group',
    key: 'ops_marketing_content',
    label: '运营 / 市场 / 内容',
    children: [
      '互联网运营', '新媒体运营', '内容运营', '用户运营',
      '市场营销/品牌', '广告投放/优化师', '短视频运营',
      '新媒体内容创作(自媒体)', '影视编导/后期',
    ].map(opt),
  },
  {
    type: 'group',
    key: 'ecom',
    label: '电商 / 零售 / 外贸',
    children: [
      '电商运营', '直播运营/主播', '跨境电商运营', '外贸业务员',
      '电商美工设计', '电商选品/商品运营', '电商客服/售后', '仓储/物流管理',
    ].map(opt),
  },
  {
    type: 'group',
    key: 'finance',
    label: '金融 / 财务',
    children: [
      '银行客户经理/柜员', '金融风控/合规', '财务/会计', '审计/税务',
    ].map(opt),
  },
  {
    type: 'group',
    key: 'hr_sales_scm',
    label: '人力 / 行政 / 销售 / 供应链',
    children: [
      '人力资源(HR)', '行政/文员', 'B端销售/商务',
      '供应链/采购', '物流管理',
    ].map(opt),
  },
  {
    type: 'group',
    key: 'hardware_manufacture',
    label: '硬件 / 先进制造',
    children: [
      '嵌入式工程师', '芯片/IC设计工程师', '机械设计工程师',
      '新能源工程师', '电气/自动化工程师',
    ].map(opt),
  },
  {
    type: 'group',
    key: 'professional_gov',
    label: '专业服务 / 体制内',
    children: [
      '律师/法务', '咨询顾问/行业研究', '教师/教培',
      '医生/医护人员', '公务员/事业编',
    ].map(opt),
  },
  {
    type: 'group',
    key: 'game',
    label: '游戏',
    children: [
      '游戏策划', '游戏开发(Unity/UE)', '游戏运营', '游戏美术/原画',
    ].map(opt),
  },
]

/** 扁平化的全部岗位名（用于去重/校验等场景） */
export const ALL_TARGET_POSITIONS: string[] = TARGET_POSITION_GROUPS.flatMap(
  (g) => (g.children || []).map((c) => String(c.value))
)
