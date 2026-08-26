/**
 * 中国省/市/区两级数据，用于级联选择器。
 * - 4 个直辖市、2 个特别行政区作为省级单位，下挂自身（保持两级结构一致）
 * - 包含 23 个省（含台湾）、5 个自治区下辖的全部地级行政区
 * - 叶子（城市）value 使用短名（如 "深圳"、"成都"），便于与薪资系数等规则匹配
 * - 省级节点的 value 使用全称（如 "北京市"、"吉林省"），避免与同名城市在 treemate
 *   内部的 Map<key, node> 中互相覆盖，导致 check-strategy="child" 下点击叶子无响应
 */

export interface CityOption {
  label: string
  value: string
  [key: string]: unknown
}

export interface ProvinceCityOption extends CityOption {
  children: CityOption[]
}

// 直辖市 / 特别行政区下挂自身，保证级联始终是两级。
// 父节点 value 用全称（如 "北京市"），子节点 value 用短名（如 "北京"），两者不能相同，
// 否则 treemate 会用父节点覆盖同名子节点，点击子节点时被判定为"非叶子"而拒绝选中。
const municipality = (fullLabel: string, shortName: string): ProvinceCityOption => ({
  label: fullLabel,
  value: fullLabel,
  children: [{ label: shortName, value: shortName }],
})

export const CHINA_CITY_OPTIONS: ProvinceCityOption[] = [
  municipality('北京市', '北京'),
  municipality('上海市', '上海'),
  municipality('天津市', '天津'),
  municipality('重庆市', '重庆'),

  {
    label: '广东省', value: '广东',
    children: [
      '广州', '深圳', '珠海', '汕头', '佛山', '韶关', '湛江', '肇庆', '江门',
      '茂名', '惠州', '梅州', '汕尾', '河源', '阳江', '清远', '东莞', '中山',
      '潮州', '揭阳', '云浮',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '江苏省', value: '江苏',
    children: [
      '南京', '苏州', '无锡', '常州', '镇江', '南通', '泰州', '扬州', '盐城',
      '淮安', '宿迁', '徐州', '连云港',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '浙江省', value: '浙江',
    children: [
      '杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山',
      '台州', '丽水',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '山东省', value: '山东',
    children: [
      '济南', '青岛', '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁', '泰安',
      '威海', '日照', '临沂', '德州', '聊城', '滨州', '菏泽',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '四川省', value: '四川',
    children: [
      '成都', '自贡', '攀枝花', '泸州', '德阳', '绵阳', '广元', '遂宁', '内江',
      '乐山', '南充', '眉山', '宜宾', '广安', '达州', '雅安', '巴中', '资阳',
      '阿坝', '甘孜', '凉山',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '湖北省', value: '湖北',
    children: [
      '武汉', '黄石', '十堰', '宜昌', '襄阳', '鄂州', '荆门', '孝感', '荆州',
      '黄冈', '咸宁', '随州', '恩施',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '湖南省', value: '湖南',
    children: [
      '长沙', '株洲', '湘潭', '衡阳', '邵阳', '岳阳', '常德', '张家界', '益阳',
      '郴州', '永州', '怀化', '娄底', '湘西',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '河南省', value: '河南',
    children: [
      '郑州', '开封', '洛阳', '平顶山', '安阳', '鹤壁', '新乡', '焦作', '濮阳',
      '许昌', '漯河', '三门峡', '南阳', '商丘', '信阳', '周口', '驻马店', '济源',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '河北省', value: '河北',
    children: [
      '石家庄', '唐山', '秦皇岛', '邯郸', '邢台', '保定', '张家口', '承德',
      '沧州', '廊坊', '衡水',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '福建省', value: '福建',
    children: [
      '福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '安徽省', value: '安徽',
    children: [
      '合肥', '芜湖', '蚌埠', '淮南', '马鞍山', '淮北', '铜陵', '安庆', '黄山',
      '滁州', '阜阳', '宿州', '六安', '亳州', '池州', '宣城',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '江西省', value: '江西',
    children: [
      '南昌', '景德镇', '萍乡', '九江', '新余', '鹰潭', '赣州', '吉安', '宜春',
      '抚州', '上饶',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '辽宁省', value: '辽宁',
    children: [
      '沈阳', '大连', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口', '阜新',
      '辽阳', '盘锦', '铁岭', '朝阳', '葫芦岛',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '吉林省', value: '吉林省',
    children: [
      '长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城', '延边',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '黑龙江省', value: '黑龙江',
    children: [
      '哈尔滨', '齐齐哈尔', '鸡西', '鹤岗', '双鸭山', '大庆', '伊春', '佳木斯',
      '七台河', '牡丹江', '黑河', '绥化', '大兴安岭',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '山西省', value: '山西',
    children: [
      '太原', '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城', '忻州',
      '临汾', '吕梁',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '陕西省', value: '陕西',
    children: [
      '西安', '铜川', '宝鸡', '咸阳', '渭南', '延安', '汉中', '榆林', '安康', '商洛',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '广西壮族自治区', value: '广西',
    children: [
      '南宁', '柳州', '桂林', '梧州', '北海', '防城港', '钦州', '贵港', '玉林',
      '百色', '贺州', '河池', '来宾', '崇左',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '云南省', value: '云南',
    children: [
      '昆明', '曲靖', '玉溪', '保山', '昭通', '丽江', '普洱', '临沧', '楚雄',
      '红河', '文山', '西双版纳', '大理', '德宏', '怒江', '迪庆',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '贵州省', value: '贵州',
    children: [
      '贵阳', '六盘水', '遵义', '安顺', '毕节', '铜仁', '黔西南', '黔东南', '黔南',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '甘肃省', value: '甘肃',
    children: [
      '兰州', '嘉峪关', '金昌', '白银', '天水', '武威', '张掖', '平凉', '酒泉',
      '庆阳', '定西', '陇南', '临夏', '甘南',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '青海省', value: '青海',
    children: [
      '西宁', '海东', '海北', '黄南', '海南', '果洛', '玉树', '海西',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '海南省', value: '海南省',
    children: ['海口', '三亚', '三沙', '儋州'].map((c) => ({ label: c, value: c })),
  },
  {
    label: '内蒙古自治区', value: '内蒙古',
    children: [
      '呼和浩特', '包头', '乌海', '赤峰', '通辽', '鄂尔多斯', '呼伦贝尔',
      '巴彦淖尔', '乌兰察布', '兴安盟', '锡林郭勒盟', '阿拉善盟',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '宁夏回族自治区', value: '宁夏',
    children: ['银川', '石嘴山', '吴忠', '固原', '中卫'].map((c) => ({ label: c, value: c })),
  },
  {
    label: '新疆维吾尔自治区', value: '新疆',
    children: [
      '乌鲁木齐', '克拉玛依', '吐鲁番', '哈密', '昌吉', '博尔塔拉', '巴音郭楞',
      '阿克苏', '克孜勒苏', '喀什', '和田', '伊犁', '塔城', '阿勒泰',
    ].map((c) => ({ label: c, value: c })),
  },
  {
    label: '西藏自治区', value: '西藏',
    children: ['拉萨', '日喀则', '昌都', '林芝', '山南', '那曲', '阿里'].map((c) => ({
      label: c, value: c,
    })),
  },
  {
    label: '台湾省', value: '台湾',
    children: ['台北', '新北', '桃园', '台中', '台南', '高雄'].map((c) => ({
      label: c, value: c,
    })),
  },
  municipality('香港特别行政区', '香港'),
  municipality('澳门特别行政区', '澳门'),
]

/**
 * 根据已选城市名反定级联路径 [省, 市]，用于回填级联选择器。
 * 直辖市/特别行政区返回 [城市, 城市]。
 */
export function findCityPath(city: string): string[] {
  if (!city) return []
  for (const prov of CHINA_CITY_OPTIONS) {
    const hit = prov.children.find((c) => c.value === city)
    if (hit) return [prov.value, hit.value]
  }
  return []
}
