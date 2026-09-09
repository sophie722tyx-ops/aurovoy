# AUROVOY 完整网站 · Cloudflare 迁移版

包含中文、英文、法文官网，以及作品、导师、课程管理后台。此目录放在 GitHub 仓库根目录；上传解压后的文件，不要只上传 ZIP。

Cloudflare D1 数据库、数据表、私有 R2 文件桶、管理员 Access 应用及 Git 自动部署已配置。本地源码构建和运行检查通过；公网发布结果以 Cloudflare Builds 最新构建为准。

## 网站与后台

- 官网：`/`，英文 `/en/`，法文 `/fr/`。
- 作品后台：`/admin`，支持新增、分段上传、封面、上下架和专区调整。
- 导师后台：`/admin/mentors`，支持新增、三语编辑、照片、隐藏和移除。
- 课程后台：`/admin/training`，支持三语编辑、大纲模块和显示状态。
- 登录：Cloudflare Access 邮箱验证码；仅允许 `sophie722tyx@gmail.com`。
- 后端：Cloudflare Workers；资料：D1；后台上传：私有 R2；随包图片与视频：Workers 静态资源。

## 首次部署

安装 Node.js 24 和 pnpm 11.19.0。在此目录执行：

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm test:runtime
pnpm exec wrangler login
```

当前账户的 `aurovoy-db` 已创建，配置文件已填写真实数据库 ID，两份迁移已在云端执行。继续：

```sh
pnpm exec wrangler d1 migrations apply DB --remote
pnpm exec wrangler deploy
```

当前账户已开通 R2，文件桶为 `aurovoy-files`，请勿重复创建。迁移到另一个账户时需重新创建 D1 与 R2，并更新数据库 ID。R2 免费额度用完后可能计费，存储和操作次数均需留意。

首次部署后官网可展示，后台在登录配置完成前保持关闭（503），不会因为未配置登录而开放管理权限。

## 配置管理员邮箱验证码

当前账户已完成以下设置，团队域名为 `aurovoy-sophie722tyx.cloudflareaccess.com`，应用为 `AUROVOY Admin`；三个运行时登录变量已配置。下列步骤供维护及换账户时参考。

1. 在 Cloudflare Zero Trust 选择免费计划，设置团队域名，启用 One-time PIN 登录方式。
2. 创建一个 Self-hosted Access 应用 `AUROVOY 管理后台`。在同一个应用内添加实际网站主机名的 `/admin`、`/admin/*`、`/api/admin`、`/api/admin/*` 路径；不要保护整个官网。
3. 添加 Allow 策略，Include → Emails → `sophie722tyx@gmail.com`。不要使用 Everyone 或邮箱域名放行。建议会话时长 8 小时。
4. 复制团队域名和应用 Audience（AUD），依次执行以下命令并输入对应值：

```sh
pnpm exec wrangler secret put ADMIN_EMAIL
pnpm exec wrangler secret put ACCESS_TEAM_DOMAIN
pnpm exec wrangler secret put ACCESS_AUD
```

`ADMIN_EMAIL` 为上述邮箱；`ACCESS_TEAM_DOMAIN` 为 `你的团队.cloudflareaccess.com`；`ACCESS_AUD` 为应用真实 AUD。不要把 API Token、登录 Cookie 或验证码放进 GitHub。

访问实际网址的 `/admin`，输入管理员邮箱及收到的验证码。代码校验签名、签发方、应用 AUD、有效期及邮箱。伪造旧平台身份请求头无效。退出使用 Cloudflare Access 注销入口。

使用 `workers.dev` 时，按当前 Access 文档建立匹配的主机名/路径应用；不要误选“保护整个 Worker”，否则官网也会要求登录。绑定自有域名后，给实际使用的主机名配置相同保护路径。

## GitHub 自动部署

1. 当前仓库为 `sophie722tyx-ops/aurovoy`，目前为公开仓库。源文件放在根目录。`.gitignore` 排除依赖、构建结果、本地数据库和秘密配置；HTML 及葡语影片由构建过程生成，源内容和影片分片已保留。
2. Cloudflare 的 `aurovoy` Worker → Settings → Builds 连接该仓库，GitHub 授权范围只选此仓库。
3. 生产分支 `main`，根目录留空；若整个 AUROVOY 文件夹在仓库内，则根目录填 `AUROVOY`。Worker 名称须与配置中的 `aurovoy` 一致。
4. 使用 Node.js 24、pnpm 11.19.0。安装 `pnpm install --frozen-lockfile`，构建检查 `pnpm test`，部署 `pnpm exec wrangler deploy`。Wrangler 自动生成页面并打包后台。
5. 首次部署前需应用数据库迁移。以后新增 SQL 迁移时，先备份并运行 `pnpm exec wrangler d1 migrations apply DB --remote`，再发布依赖新表结构的代码。普通后台内容编辑无需重新部署。

先验收新网址的页面、登录、上传、编辑和上下架，再考虑替换旧站域名。

## 旧网站数据

本包保留原 ZIP 的源码和媒体，未包含旧平台线上数据库及后来在后台上传的文件。是否存在这些内容尚待所有者确认。

如果有：先导出旧站 `works`、`uploads`、`upload_parts`、`content_entries`、`content_images` 五张表，完整备份私有文件存储。保留对象键和记录 ID；将文件复制到新 R2，再导入新 D1，核对媒体及发布状态。新管理员身份来自 Cloudflare Access；旧记录的 owner 不赋予登录权限。

不要将旧数据库或私有存储备份提交 GitHub。切换前保留旧站与备份。

## 域名和费用

页面链接与站点地图默认采用访问主机名。正式绑定域名后，可设 Worker 环境变量 `PUBLIC_ORIGIN=https://你的正式域名`，统一规范网址。域名注册费不包含在托管免费额度中。

Workers 免费方案有动态请求和 CPU 限制；D1 有读写及容量限制；R2 有存储和操作免费额度。本网站的 HTML 会执行后台逻辑及数据库查询，不能按纯静态站的无限请求估算。按免费额度启动，不承诺任何访问量都永远免费。

## 验证记录 · 2026-09-09

- 14 项自动测试通过：身份验证、伪造/过期/错误应用凭证、跨站写入拦截、导师/课程三语同步、作品上下架、分段视频上传、Range 播放、域名替换。
- Cloudflare 本地运行时访问 246 个页面全部成功；实际 D1 创建记录、R2 上传及私有预览成功。
- 两份数据库迁移在本地及云端 D1 中成功执行。
- 可移植编译产物约 2.72 MB，gzip 约 224 KB。
- 本机受限 Windows 环境中，Wrangler 原生编译器无法枚举上级目录。已通过同版本 esbuild WebAssembly 编译及 Cloudflare 官方运行时验证；常规 `wrangler deploy --dry-run` 在此环境仍未通过，须在云端构建环境完成最终验证。
- Cloudflare 及 GitHub 账户授权已验证；正式 Access 策略只允许管理员邮箱。实际验证码登录及管理员上传须在公网发布后使用授权邮箱验收。

## 官方资料

- [Git 自动部署](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/)
- [Access 与 Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- [邮箱验证码登录](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/)
- [Workers 额度](https://developers.cloudflare.com/workers/platform/limits/)
- [D1 定价](https://developers.cloudflare.com/d1/platform/pricing/)
- [R2 定价](https://developers.cloudflare.com/r2/pricing/)
