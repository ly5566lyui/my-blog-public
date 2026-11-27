# MCY's Blog

基于 Next.js + React + Tailwind CSS 构建的个人博客与日常记录站点，通过 GitHub App 直接管理仓库内容，无需后端服务器。

## 本地开发

```bash
pnpm install
pnpm dev
```

## 环境变量

可在部署平台（如 Vercel）配置以下环境变量，或在 `src/consts.ts` 中查看默认仓库配置：

- `NEXT_PUBLIC_GITHUB_OWNER`
- `NEXT_PUBLIC_GITHUB_REPO`
- `NEXT_PUBLIC_GITHUB_BRANCH`
- `NEXT_PUBLIC_GITHUB_APP_ID`
- `NEXT_PUBLIC_SITE_URL`

## License

MIT License (see `LICENSE`).
