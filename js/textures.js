// js/textures.js — 用 <canvas> 程序化绘制位图纹理，再交给 gl.texImage2D 上传
// 说明：这里不依赖外部图片，所有纹理都是运行时生成的“真位图”
// （CanvasPixelArray → gl.texImage2D），满足“位图纹理 + 纹理坐标 attribute”要求。

// 确定性伪随机（保证每次刷新长得一样）
function makeRng(seed) {
    var s = seed;
    return function () {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
}

// ---------- 太阳：黄橙径向渐变 + 表面颗粒噪点 ----------
function makeSunTexture() {
    var w = 512, h = 256;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ffd24a');
    g.addColorStop(0.5, '#ff9a1f');
    g.addColorStop(1, '#ffd24a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    var rng = makeRng(42);
    for (var i = 0; i < 2600; i++) {
        var x = rng() * w, y = rng() * h;
        var r = 1 + rng() * 3;
        ctx.fillStyle = rng() > 0.5 ? 'rgba(255,120,20,0.35)' : 'rgba(255,230,120,0.4)';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    return c;
}

// ---------- 地球：蓝色海洋 + 随机“大陆”斑块 + 两极冰盖 ----------
function makeEarthTexture() {
    var w = 1024, h = 512;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');
    // 海洋底色（上浅下深做个渐变）
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1e5a9e');
    g.addColorStop(0.5, '#15508f');
    g.addColorStop(1, '#0f3d73');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // 大陆：随机绿色/棕色blob簇
    var rng = makeRng(7);
    for (var i = 0; i < 60; i++) {
        var cx = rng() * w, cy = h * 0.18 + rng() * h * 0.64;
        var blobs = 6 + Math.floor(rng() * 10);
        var baseR = 8 + rng() * 26;
        for (var b = 0; b < blobs; b++) {
            var bx = cx + (rng() - 0.5) * 60;
            var by = cy + (rng() - 0.5) * 40;
            var br = baseR * (0.4 + rng() * 0.8);
            var green = rng();
            ctx.fillStyle = green > 0.6 ? '#4e7a3a' : (green > 0.3 ? '#6b8f4e' : '#8a7a52');
            ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
        }
    }
    // 极地冰盖（画布顶/底 = 南北极，因 v=1 对应画布顶部=北极）
    var ice = ctx.createLinearGradient(0, 0, 0, h * 0.08);
    ice.addColorStop(0, 'rgba(245,250,255,0.95)');
    ice.addColorStop(1, 'rgba(245,250,255,0)');
    ctx.fillStyle = ice; ctx.fillRect(0, 0, w, h * 0.09);
    var ice2 = ctx.createLinearGradient(0, h, 0, h * 0.92);
    ice2.addColorStop(0, 'rgba(245,250,255,0.95)');
    ice2.addColorStop(1, 'rgba(245,250,255,0)');
    ctx.fillStyle = ice2; ctx.fillRect(0, h * 0.91, w, h * 0.09);
    return c;
}

// ---------- 月球：灰底 + 陨石坑 ----------
function makeMoonTexture() {
    var w = 512, h = 256;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#9a9a9a';
    ctx.fillRect(0, 0, w, h);
    var rng = makeRng(13);
    for (var i = 0; i < 220; i++) {
        var x = rng() * w, y = rng() * h, r = 1 + rng() * 7;
        ctx.fillStyle = 'rgba(60,60,60,0.45)';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(200,200,200,0.35)';
        ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    return c;
}

// ---------- 类木/类地行星：基色 + 横向条纹（条纹在 v 方向）----------
function makeBandedTexture(base, bandColors, seed) {
    var w = 512, h = 256;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    var rng = makeRng(seed);
    for (var i = 0; i < bandColors.length; i++) {
        var y = rng() * h;
        var bh = 4 + rng() * 18;
        ctx.fillStyle = bandColors[i];
        ctx.globalAlpha = 0.55;
        ctx.fillRect(0, y, w, bh);
    }
    ctx.globalAlpha = 1;
    return c;
}

// ---------- 土星环：径向明暗条纹（v=0 内径 → v=1 外径）----------
function makeRingTexture() {
    var w = 4, h = 256;
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');
    var rng = makeRng(99);
    for (var y = 0; y < h; y++) {
        var t = y / h;
        var bright = 0.55 + 0.35 * Math.sin(t * 40) + (rng() - 0.5) * 0.15;
        bright = Math.max(0.2, Math.min(1, bright));
        ctx.fillStyle = 'rgba(210,195,160,' + bright.toFixed(3) + ')';
        ctx.fillRect(0, y, w, 1);
    }
    return c;
}

// ---------- 上传到 GPU：关键 —— UNPACK_FLIP_Y_WEBGL = true ----------
// 原因：Canvas 像素数组“首行”是画布顶部；而 WebGL 纹理坐标 v=0 对应“最先上传的那一行”。
// 若不翻转，上传后 v=0 会钉在画布顶部 → 北极(贴图上部)被钉到 v=0(球面“底部”) → 画面上下颠倒。
// 打开 FLIP_Y 后，上传时逐行倒序，v=0 对应画布底部，配合 sphere.js 里 v=1-northing 的约定，
// 北半球（画布上方）正确落在球面北极，不再颠倒。
function uploadTexture(gl, canvas) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    return tex;
}
