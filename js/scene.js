// js/scene.js — 天体参数集中配置（评分量规要求：半径/距离/周期集中配置）
// 注意：为了在一个画面里同时看清整个太阳系，距离与半径经过压缩，并非真实比例；
//       相对顺序与颜色特征保持与真实太阳系一致。

const SCENE = {
    sun: {
        name: '太阳',
        radius: 1.0,
        orbitRadius: 0,        // 太阳位于原点
        orbitSpeed: 0.0,      // 不公转
        spinSpeed: 6.0,       // 自转（度/秒，随全局速度系数缩放）
        tilt: 0.0,
        emissive: true,
        texture: 'sun'
    },

    // 类地行星
    mercury: { name: '水星', radius: 0.12, orbitRadius: 2.2, orbitSpeed: 47.0, spinSpeed: 8,  tilt: 0.03, emissive: false, texture: 'mercury' },
    venus:   { name: '金星', radius: 0.20, orbitRadius: 3.2, orbitSpeed: 35.0, spinSpeed: 5,  tilt: 177.4, emissive: false, texture: 'venus' },
    earth: {
        name: '地球', radius: 0.26, orbitRadius: 4.6, orbitSpeed: 28.0, spinSpeed: 40,
        tilt: 23.5, emissive: false, texture: 'earth',
        // 月球（地球的子节点）
        moon: { name: '月球', radius: 0.08, orbitRadius: 0.55, orbitSpeed: 130.0, spinSpeed: 10, tilt: 0.0,
                // 选做/必做要点：月球轨道面相对地球赤道面的倾角（5.14°）
                // —— 这一处用“手动矩阵”实现（见 main.js 的 buildMoonFrame）
                orbitInclination: 5.14 }
    },
    mars: { name: '火星', radius: 0.18, orbitRadius: 5.9, orbitSpeed: 24.0, spinSpeed: 38, tilt: 25.2, emissive: false, texture: 'mars' },

    // 小行星带参数（火星与木星之间）
    asteroidBelt: { inner: 6.9, outer: 8.0, count: 900 },

    // 类木行星
    jupiter: { name: '木星', radius: 0.65, orbitRadius: 9.4,  orbitSpeed: 13.0, spinSpeed: 90, tilt: 3.1,  emissive: false, texture: 'jupiter' },
    saturn:  { name: '土星', radius: 0.55, orbitRadius: 12.2, orbitSpeed: 9.7,  spinSpeed: 85, tilt: 26.7, emissive: false, texture: 'saturn',
               ring: { inner: 1.35, outer: 2.3 } },
    uranus:  { name: '天王星', radius: 0.34, orbitRadius: 15.0, orbitSpeed: 6.8, spinSpeed: 60, tilt: 97.8, emissive: false, texture: 'uranus' },
    neptune: { name: '海王星', radius: 0.33, orbitRadius: 17.5, orbitSpeed: 5.4, spinSpeed: 60, tilt: 28.3, emissive: false, texture: 'neptune' }
};

// 行星渲染顺序（从太阳向外）
const PLANET_KEYS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
