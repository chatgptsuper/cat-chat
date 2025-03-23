<template>
  <div class="live2d-container" ref="containerRef">
    <div id="waifu">
      <canvas id="live2d" width="600" height="600"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = defineProps<{
  modelType: 'black' | 'white'
}>()

const containerRef = ref<HTMLElement | null>(null);
let currentModel: any = null;

// 加载模型
const loadModel = async (modelType: 'black' | 'white') => {
  try {
    console.log('开始加载模型...');
    
    // 等待 Live2D 核心库加载完成
    await new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5秒超时
      
      const checkInterval = setInterval(() => {
        attempts++;
        // @ts-ignore
        if (window.PIXI && window.PIXI.live2d && window.Live2D) {
          clearInterval(checkInterval);
          console.log('Live2D 核心库加载完成');
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error('Live2D 核心库加载超时'));
        }
      }, 100);
    });

    // 检查 canvas 元素
    const canvas = document.getElementById('live2d') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas 元素不存在');
    }
    console.log('Canvas 元素已找到');

    // 初始化 PIXI Application
    // @ts-ignore
    const app = new PIXI.Application({
      view: canvas,
      transparent: true,
      autoStart: true,
      width: canvas.width,
      height: canvas.height
    });

    // 根据类型选择模型配置
    const modelPath = modelType === 'black' 
      ? '/live2d/models/hijiki/runtime/hijiki.model3.json'
      : '/live2d/models/tororo/runtime/tororo.model3.json';

    console.log('正在加载模型:', modelPath);

    // 检查文件是否存在
    try {
      const response = await fetch(modelPath);
      if (!response.ok) {
        throw new Error(`模型文件加载失败: ${response.status} ${response.statusText}`);
      }
      console.log('模型文件存在且可访问');
    } catch (error) {
      console.error('模型文件访问失败:', error);
      return;
    }

    try {
      // 初始化 Live2D 模型
      // @ts-ignore
      const model = await PIXI.live2d.Live2DModel.from(modelPath);
      console.log('模型创建成功:', model);
      
      if (model) {
        // 调整模型大小和位置
        const scale = 0.25;
        model.scale.set(scale);
        
        model.x = canvas.width / 2;
        model.y = canvas.height - 30;
        model.anchor.set(0.5, 1.0);

        // 添加点击交互
        model.on('pointerdown', async () => {
          try {
            // 获取可用的动作列表
            const motionManager = model.internalModel.motionManager;
            
            // 使用模型实际支持的动作组
            const availableMotions = [
              'Tap',
              'Flick',
              'FlickUp',
              'FlickDown'
            ];

            // 随机选择一个动作组
            const randomMotion = availableMotions[Math.floor(Math.random() * availableMotions.length)];
            console.log('尝试播放动作:', randomMotion);

            // 获取动作组中的动作数量
            const motionGroup = motionManager.definitions[randomMotion];
            if (motionGroup && motionGroup.length > 0) {
              // 随机选择动作组中的一个动作
              const motionIndex = Math.floor(Math.random() * motionGroup.length);
              
              // 停止当前动作
              motionManager.stopAllMotions();
              
              // 播放新动作
              const motion = await motionManager.startMotion(randomMotion, motionIndex, 3);
              console.log(`播放动作 ${randomMotion} (索引: ${motionIndex})`, motion);
            } else {
              console.log(`动作组 ${randomMotion} 不可用`);
            }
          } catch (error) {
            console.error('动作播放失败:', error);
          }
        });

        // 启用交互
        model.interactive = true;
        
        // 添加到舞台
        app.stage.addChild(model);
        
        currentModel = model;
        console.log('模型加载成功');

        // 开始自动播放 Idle 动作
        const playIdleMotion = async () => {
          try {
            const motionManager = model.internalModel.motionManager;
            const idleMotions = motionManager.definitions['Idle'];
            
            if (idleMotions && idleMotions.length > 0) {
              const idleIndex = Math.floor(Math.random() * idleMotions.length);
              await motionManager.startMotion('Idle', idleIndex, 3);
              console.log('播放 Idle 动作');
            }
          } catch (error) {
            console.error('Idle 动作播放失败:', error);
          }
          
          // 每隔一段时间播放一次 Idle 动作
          setTimeout(playIdleMotion, 5000 + Math.random() * 5000);
        };

        // 启动 Idle 动作循环
        playIdleMotion();

        // 打印模型信息，用于调试
        console.log('模型内部结构:', {
          hasMotionManager: !!model.internalModel.motionManager,
          hasPhysics: !!model.internalModel.physics,
          motionGroups: model.internalModel.motionManager.definitions,
          parameters: model.internalModel.parameters,
          motionNames: Object.keys(model.internalModel.motionManager.definitions || {}),
          expressionNames: Object.keys(model.internalModel.motionManager.expressions || {}),
        });

        // 尝试播放初始动作
        try {
          const motionManager = model.internalModel.motionManager;
          await motionManager.startMotion('Idle', 0);
          console.log('初始动作播放成功');
        } catch (error) {
          console.log('初始动作播放失败，尝试其他方式');
          try {
            await model.motion('Motion');
            console.log('备用初始动作播放成功');
          } catch (error) {
            console.log('所有初始动作尝试失败:', error);
          }
        }
      }
    } catch (error) {
      console.error('模型初始化失败:', error);
    }

  } catch (error) {
    console.error('模型加载失败:', error);
  }
}

// 监听模型类型变化
watch(() => props.modelType, (newType) => {
  console.log('模型类型变更为:', newType);
  loadModel(newType);
})

// 组件挂载时加载模型
onMounted(() => {
  console.log('Live2D 组件已挂载');
  console.log('容器元素:', containerRef.value);
  loadModel(props.modelType);
})

// 暴露方法给父组件
defineExpose({
  playMotion: async (motionName: string) => {
    if (!currentModel) return
    
    try {
      // 获取动作管理器
      const motionManager = currentModel.internalModel.motionManager
      
      // 停止当前动作
      motionManager.stopAllMotions()
      
      // 随机选择一个说话动作
      const talkMotions = ['Tap', 'Flick']
      const randomMotion = talkMotions[Math.floor(Math.random() * talkMotions.length)]
      
      // 获取动作组中的动作数量
      const motionGroup = motionManager.definitions[randomMotion]
      if (motionGroup && motionGroup.length > 0) {
        // 随机选择动作组中的一个动作
        const motionIndex = Math.floor(Math.random() * motionGroup.length)
        
        // 播放新动作
        await motionManager.startMotion(randomMotion, motionIndex, 3)
        console.log(`播放动作 ${randomMotion} (索引: ${motionIndex})`)
      }
    } catch (error) {
      console.error('动作播放失败:', error)
    }
  }
})
</script>

<style scoped>
.live2d-container {
  position: fixed;
  left: 20px; 
  bottom: 0;
  width: 500px;
  height: 500px;
  pointer-events: none;
  z-index: 1000;
}

#waifu {
  position: absolute;
  bottom: 0;
  left: 0; 
  width: 100%;
  height: 100%;
}

#live2d {
  position: absolute;
  bottom: 0;
  left: 0; 
  width: 100%;
  height: 100%;
  pointer-events: auto;
}
</style> 