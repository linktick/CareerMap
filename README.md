# 职途星图 CareerMap

> 沙盘推演职业赛道，帮助新入职场人看清未来前行方向

面向大学生与 0~3 年职场新人，基于真实招聘 JD 市场推演职业路线，生成多条 3 年期职业分支沙盘，模拟薪资走势、发展瓶颈、必备技能、赛道内卷风险，最终产出可落地的 12 个月能力成长清单。

## 核心特性

- 🕹 **双模式无缝切换**：在线 AI 模式（Doubao-Seed-Evolving）/ 本地离线模拟器，数据结构完全一致
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

## 目录结构

```
CareerMap/
├── src/
│   ├── types/career.ts          # 全部 TypeScript 类型
│   ├── schemas/career.ts        # Zod 校验 schema
│   ├── stores/                  # Pinia: mode / profile / sandbox / history
│   ├── adapters/
│   │   ├── ai.ts                # AI 接口适配器
│   │   └── local/               # 本地模拟器（数据集 + 规则引擎）
│   ├── prompts/                 # 三个场景的 system prompt
│   ├── components/              # 公共组件 & 沙盘图组件
│   ├── views/                   # 6 个页面
│   └── utils/                   # storage / format / exporter
├── backend/                     # 可选 FastAPI 中转
└── dist/                        # 构建产物
```

## 6 个页面

| 路由 | 页面 |
|---|---|
| `/` | 首页欢迎页 |
| `/wizard` | 分步信息填报表单 |
| `/sandbox` | 核心沙盘可视化主页（三栏） |
| `/compare` | 赛道横向对比 |
| `/growth/:routeId` | 12 个月成长方案 |
| `/history` | 历史记录管理 |

## 数据契约

AI 返回与本地模拟器输出共享同一套 TypeScript 类型（见 [src/types/career.ts](src/types/career.ts)），由 Zod 在前端做统一运行时校验，保证两种模式渲染代码零差异。

## 免责声明

所有数据与建议仅供参考，不构成职业决策的唯一依据。
