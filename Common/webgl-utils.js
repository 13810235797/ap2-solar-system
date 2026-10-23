// webgl-utils.js — 教材配套工具：获取 WebGL 上下文、尺寸自适应
var WebGLUtils = (function () {
    function getWebGLContext(canvas, optAttribs) {
        var params = optAttribs || { antialias: true, alpha: false };
        var ctx = canvas.getContext('webgl2', params);
        if (!ctx) {
            // 回退到 WebGL1（旧浏览器）
            ctx = canvas.getContext('webgl', params) ||
                  canvas.getContext('experimental-webgl', params);
        }
        if (!ctx) {
            alert('无法创建 WebGL 上下文，请使用现代浏览器（Chrome/Edge/Firefox）。');
            return null;
        }
        // 高分屏适配
        ctx.viewportWidth = canvas.width;
        ctx.viewportHeight = canvas.height;
        return ctx;
    }

    // 让 canvas 跟随容器尺寸
    function resize(canvas) {
        var dpr = window.devicePixelRatio || 1;
        var w = Math.floor(canvas.clientWidth * dpr);
        var h = Math.floor(canvas.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
    }

    return { getWebGLContext: getWebGLContext, resize: resize };
})();
