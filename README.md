# 城东污水处理厂 · 智能监测平台（GitHub Pages 版）

这是「污水处理厂实时监测网站」任务的最终版静态站点，已整理为可直接推送到 GitHub 并启用 GitHub Pages 的目录。无需构建步骤，无需后端服务，纯 HTML / CSS / JavaScript，Three.js 已随仓库本地提供。

## 目录结构

```
.
├── index.html                  # 入口页面（首页 / 路由容器）
├── css/style.css               # 全站样式
├── js/
│   ├── app.js                  # 页面渲染、路由、交互、CSV 导出与报告
│   ├── charts.js               # 自研 SVG 图表引擎
│   ├── data.js                 # 监测指标、厂区单元、历史数据模拟
│   ├── flow2d.js               # 二维工艺流程图
│   ├── plan.js                 # 总平面布置数据
│   └── scene3d.js              # 3D 厂区模型（数字孪生）
├── vendor/
│   ├── three.min.js            # Three.js r128（本地）
│   └── OrbitControls.js        # 轨道控制器（本地）
├── .nojekyll                   # 阻止 Jekyll 处理，确保静态资源原样发布
├── .github/workflows/deploy-pages.yml  # GitHub Actions 自动部署（可选）
└── README.md                   # 本说明
```

## 功能概览

- 8 个板块：首页总览、3D 厂区模型、实时水质监测、工艺运行监控、去除效率分析、AI 预测与预警、历史数据查询、AI 智能问答。
- 指标对照 GB18918-2002 一级 A 标准，实时读数每 3 秒模拟刷新。
- 3D 厂区按设计总平面图建模，支持旋转、缩放、点击构筑物查看运行参数；WebGL 不可用时自动降级。
- 历史数据支持日/周/月聚合、CSV 导出与可打印报告。
- 数据为前端模拟数据，适合演示与原型展示，不代表真实厂站运行数据。

## 部署到 GitHub Pages

### 方式一：使用内置 GitHub Actions 工作流（推荐）

1. 在本目录执行 `git init`，把所有文件提交到本地仓库。
2. 在 GitHub 新建一个公开仓库（例如 `wastewater-monitor`），将本地仓库关联并推送到 `main` 分支：

   ```bash
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git branch -M main
   git push -u origin main
   ```

3. 进入仓库 **Settings → Pages → Build and deployment**，把 **Source** 设为 **GitHub Actions**。
4. 推送后 `.github/workflows/deploy-pages.yml` 会自动运行；完成后访问 `https://<你的用户名>.github.io/<仓库名>/`。

### 方式二：直接从分支部署（不使用 Actions）

1. 不使用工作流时，可删除 `.github/workflows/deploy-pages.yml`。
2. 将本目录内容推送到 `main` 分支根目录。
3. 进入 **Settings → Pages → Build and deployment**，Source 选择 **Deploy from a branch**，Branch 选 `main`、目录选 `/ (root)`，保存。
4. 访问 `https://<你的用户名>.github.io/<仓库名>/`。

> 项目站点地址为 `/<仓库名>/` 路径，本站点所有资源引用均为相对路径，无需修改。若使用自定义域名，可在仓库根目录添加 `CNAME` 文件并在 Pages 设置中填写域名。

## 本地预览

在目录下启动任意静态文件服务器，例如：

```bash
python -m http.server 8000
```

然后浏览器打开 `http://localhost:8000/`。不建议直接用 `file://` 打开，部分浏览器对本地脚本和 WebGL 资源有限制。
