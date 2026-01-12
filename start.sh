#!/bin/bash

# Chat-EE 快速启动脚本

echo "==================================="
echo "端到端加密1对1聊天 - 快速启动"
echo "==================================="

# 检查是否安装了 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装 Node.js"
    exit 1
fi

echo "📦 安装后端依赖..."
cd backend
npm install
echo "✅ 后端依赖安装完成"

cd ../frontend
echo "📦 安装前端依赖..."
npm install
echo "✅ 前端依赖安装完成"

echo ""
echo "==================================="
echo "✨ 启动应用"
echo "==================================="
echo ""
echo "1️⃣  后端启动 (在新终端):"
echo "   cd backend && npm run dev"
echo ""
echo "2️⃣  前端启动 (在另一个新终端):"
echo "   cd frontend && npm start"
echo ""
echo "3️⃣  打开浏览器访问 http://localhost:3000"
echo ""
echo "后端将运行在: http://localhost:3001"
echo "前端将运行在: http://localhost:3000"
echo ""
