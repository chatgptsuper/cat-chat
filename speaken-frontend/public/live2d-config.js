// live2d-widget 配置
window.live2d_settings = {
  modelPath: '/tororo_hijiki/hijiki/runtime/hijiki.model3.json',
  modelTexturesPath: '/tororo_hijiki/hijiki/runtime/hijiki.2048/',
  canvasId: 'live2d',
  modelName: 'hijiki',
  modelScale: 1,
  mobileShow: true,
  mobileScale: 0.8,
  position: 'right',
  width: 150,
  height: 300,
  hOffset: 0,
  vOffset: 0,
  showToolMenu: false,
  canSwitchModel: false,
  canSwitchTextures: false,
  canTurnHead: true,
  canBlink: true,
  dialog: {
    enable: true,
    script: {
      'tap': '点击说话...',
      'hover': '需要帮助吗？',
    },
  },
}; 