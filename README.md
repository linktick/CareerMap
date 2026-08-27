# 职途星图 CareerMap

> 沙盘推演职业赛道，帮助即将毕业的学生与所有有职业规划需求的人看清未来前行方向

面向即将毕业的学生以及所有有职业规划想法的人，基于真实招聘 JD 市场推演职业路线，生成多条 3 年期职业分支沙盘，模拟薪资走势、发展瓶颈、必备技能、赛道内卷风险，最终产出可落地的 12 个月能力成长清单。

## 核心特性

- 🕹 **双模式无缝切换**：在线 AI 模式（Doubao-Seed-Evolving）/ 本地离线模拟器，数据结构完全一致
- 🤖 **Agent 自主调研（function calling）**：沙盘调研不再走固定流水线——模型自主调用工具（实时联网检索、薪资基准测算、规则校验），Agent loop 多轮搜索-推理后产出报告；信号带**可点击来源链接 / 发布日期 / 可靠性评级**，置信度纳入外部事实核验权重
- 🔍 **真实联网搜索**：火山方舟 Agent 套餐自带的联网搜索 API（open.feedcoopapi.com，复用套餐 Key、零额外配置）为主、博查（Bocha）为辅、Tavily 备选，全部不可用时自动降级为模型知识并明确标注「未核验」，**绝不编造来源链接**
- 📡 **职业动态雷达**：定时采集赛道情报，🔥 热门风口 / 🧊 收缩预警 / 🌊 蓝海冷门热力标签，热度走势折线 + 完整情报抽屉，支持自定义监控赛道
- 📊 **3 年期分支沙盘**：ECharts 可视化多条职业路径，按内卷等级配色
- 🔀 **多赛道横向对比**：薪资、内卷、瓶颈、风险多维度量化对比
- 📅 **12 个月成长方案**：按月拆分学习/实践/求职/证书，可编辑、可勾选进度
- 📄 **PDF / HTML 导出**：浏览器原生打印，无需后端
- 💾 **本地历史记录**：localStorage 保存所有过往推演
- 🔌 **零后端可运行**：默认本地模式，双击 `index.html` 即可使用

## 技术栈

- Vue 3 + TypeScript + Vite
- Naive UI + Tailwind CSS
- Pinia + Vue Router
- ECharts
- Zod（AI 返回数据校验）
- FastAPI（可选，仅作 AI 接口中转）

## 快速开始

### 前端（必选）

```bash
npm install
npm run dev          # 启动开发服务器 http://localhost:5173
npm run build        # 生产构建到 dist/
npm run preview      # 预览构建产物
```

默认进入**本地模拟器模式**，无需联网即可完整使用。`dist/` 目录可直接双击 `index.html` 打开，也可丢到任意静态服务器。

### AI 模式配置

1. 启动下方的后端中转服务
2. 点击右上角齿轮图标，填写后端服务地址（默认 `http://localhost:8000`）与模型 ID
3. 顶部切换到 "AI 推演" 模式即可

所有 AI 请求统一通过后端代理转发，API Key 只在后端 `.env` 中保管，前端不接触密钥、也不存在浏览器直连豆包的模式。

### 后端中转服务（AI 模式必需）

```bash
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                              # 填入 DOUBAO_API_KEY
uvicorn main:app --reload --port 8000
```

前端 AI 配置中：后端服务地址填 `http://localhost:8000`。

> **关于 API 地址**：火山方舟有两套地址，请根据你购买的类型填写 `.env` 中的 `DOUBAO_BASE_URL`：
> - **套餐版（agent plan，本项目默认）**：`https://ark.cn-beijing.volces.com/api/plan/v3`，模型 ID 必须首字母大写 `Doubao-Seed-Evolving`
> - **按量付费（标准接口）**：`https://ark.cn-beijing.volces.com/api/v3`，模型 ID 小写 `doubao-seed-evolving`

### 联网搜索配置（市场调研 / 事实校验用）

调研 Agent 的 `search_web` 工具统一请求后端 `POST /api/search`，后端按以下顺序自动降级，**默认零配置**即可用：

1. **火山方舟联网搜索 API（主）**：Agent 套餐（`/api/plan/v3`）自带的搜索通道（open.feedcoopapi.com），直接复用 `DOUBAO_API_KEY`，无需任何额外配置（需已开通[「联网搜索 API」](https://console.volcengine.com/search-infinity/web-search)；单独签发的搜索 Key 可填 `ARK_SEARCH_API_KEY`）；
2. **博查 Bocha（辅）**：在 `.env` 配置 `BOCHA_API_KEY`（[bocha-ai.com](https://open.bochaai.com) 开通）；
3. **Tavily（备选）**：配置 `TAVILY_API_KEY`（[tavily.com](https://tavily.com) 开通）；
4. 全部不可用时返回 503，Agent 自动改用模型知识完成报告，UI 明确标注「🟡 AI 生成 · 未实时核验」且不带任何链接。

可用 `SEARCH_PROVIDER=auto|ark|bocha|tavily|none` 强制指定或关闭搜索通道。搜索 Key 与 LLM Key 一样只保存在后端 `.env`，浏览器不接触任何密钥。

## 目录结构

```
CareerMap/
├── src/
│   ├── types/career.ts          # 全部 TypeScript 类型
│   ├── schemas/career.ts        # Zod 校验 schema
│   ├── stores/                  # Pinia: mode / profile / sandbox / history
│   ├── adapters/
│   │   ├── ai.ts                # AI 接口适配器（chat / tools 透传 / 搜索代理）
│   │   ├── aiAgent.ts           # function calling Agent loop（调研 + 校验，含固定链兜底）
│   │   ├── aiIntel.ts           # AI 接口适配器（职业动态情报）
│   │   └── local/               # 本地模拟器（数据集 + 规则引擎 + 薪资基准，含 intelDataset）
│   ├── prompts/                 # 各场景的 system prompt
│   ├── components/              # 公共组件 & 沙盘图 / 情报雷达组件
│   ├── views/                   # 页面（含 IntelView 职业动态）
│   └── utils/                   # storage / format / exporter
├── backend/                     # 可选 FastAPI 中转
└── dist/                        # 构建产物
```

## 页面

| 路由 | 页面 |
|---|---|
| `/` | 首页欢迎页 |
| `/intel` | 职业动态 · 行业情报雷达（独立模块） |
| `/wizard` | 分步信息填报表单 |
| `/sandbox` | 核心沙盘可视化主页（三栏） |
| `/compare` | 赛道横向对比 |
| `/growth/:routeId` | 12 个月成长方案 |
| `/history` | 历史记录管理 |

## 职业动态雷达模块

独立于沙盘推演的行业情报模块（`/intel`）：

- **顶部控制面板**：采集周期（1/3/7/14 天）、一键立即刷新、管理监控行业（内置 16 个赛道按热力分组勾选，支持添加任意自定义赛道）
- **大盘概览**：热门风口 / 收缩预警 / 蓝海冷门三类热力标签云，点击直达情报详情
- **行业卡片网格**：赛道名称、标签、动态摘要、热度/需求/竞争/薪资指标、快照日期，点击展开完整情报抽屉（关键信号、技能风向、机会点、风险预警）
- **趋势图表**：选中赛道的近 7 次采集热度折线（ECharts），附较上期变化、薪资同比、需求强度
- **定时采集**：页面打开时按周期自动检查采集（仅页面可见时触发），设置与近 20 期快照持久化在 localStorage
- **双模式**：本地模式由内置情报数据集 + 确定性漂移引擎生成可复现的模拟快照（首次使用自动回填 7 期历史）；AI 模式经后端代理调用大模型生成在线情报，失败自动降级本地快照

## 数据契约

AI 返回与本地模拟器输出共享同一套 TypeScript 类型（见 [src/types/career.ts](src/types/career.ts)），由 Zod 在前端做统一运行时校验，保证两种模式渲染代码零差异。

## 免责声明

所有数据与建议仅供参考，不构成职业决策的唯一依据。
