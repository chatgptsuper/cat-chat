// live2d 加载路径
const live2d_path = "/live2d/";

// 等待 DOM 加载完成
function initLive2D() {
    // 加载样式表
    if (!document.getElementById("waifu-style")) {
        const style = document.createElement("link");
        style.id = "waifu-style";
        style.rel = "stylesheet";
        style.type = "text/css";
        style.href = live2d_path + "waifu.css";
        document.head.appendChild(style);
    }

    // 等待容器元素存在
    const initInterval = setInterval(() => {
        const container = document.querySelector(".live2d-container");
        if (container) {
            clearInterval(initInterval);
            // 加载提示脚本
            fetch(live2d_path + "waifu-tips.json")
                .then(response => response.json())
                .then(result => {
                    window.live2d_tips = result;
                    // 初始化提示系统
                    initTips(container);
                });
        }
    }, 100);
}

// 初始化提示系统
function initTips(container) {
    // 创建提示元素
    const tips = document.createElement("div");
    tips.id = "waifu-tips";
    container.appendChild(tips);

    // 等待 canvas 元素存在
    const canvasInterval = setInterval(() => {
        const canvas = document.querySelector("#live2d");
        if (canvas) {
            clearInterval(canvasInterval);
            // 监听鼠标事件
            canvas.addEventListener("mouseover", () => {
                const texts = window.live2d_tips.mouseover[0].text;
                const text = texts[Math.floor(Math.random() * texts.length)];
                showMessage(text);
            });

            canvas.addEventListener("click", () => {
                const texts = window.live2d_tips.click[0].text;
                const text = texts[Math.floor(Math.random() * texts.length)];
                showMessage(text);
            });
        }
    }, 100);
}

// 显示消息
function showMessage(text, timeout = 3000) {
    const tips = document.getElementById("waifu-tips");
    if (tips) {
        tips.innerHTML = text;
        tips.style.opacity = 1;
        setTimeout(() => {
            tips.style.opacity = 0;
        }, timeout);
    }
}

// 初始化 Live2D 模型加载器
window.loadlive2d = async function(canvasId, modelPath) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    try {
        // 初始化 PIXI Application
        const app = new PIXI.Application({
            view: canvas,
            autoStart: true,
            backgroundAlpha: 0,
            backgroundColor: 0xffffff,
            resizeTo: canvas
        });

        // 初始化 Live2D 模型
        const model = await PIXI.live2d.Live2DModel.from(modelPath, {
            autoInteract: false,
            autoUpdate: true
        });

        // 调整模型大小和位置
        const scale = Math.min(
            canvas.width / model.width,
            canvas.height / model.height
        ) * 0.8;
        
        model.scale.set(scale);
        
        // 设置模型位置在容器中心
        model.position.set(
            canvas.width / 2,
            canvas.height
        );
        
        model.anchor.set(0.5, 1.0);

        // 添加到舞台
        app.stage.addChild(model);

        // 添加交互性
        model.interactive = true;
        model.buttonMode = true;

        // 注册 Live2D Cubism 4 运行时
        PIXI.live2d.Live2DModel.registerTicker(PIXI.Ticker);
        await PIXI.live2d.Live2DModel.setupLive2DCubism();

        return model;
    } catch (error) {
        console.error('Failed to load Live2D model:', error);
    }
};

// 启动初始化
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLive2D);
} else {
    initLive2D();
} 