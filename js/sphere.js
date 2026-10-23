// js/sphere.js — 单位球（UV 球）几何生成 + 土星环带几何
// 约定：单位球心在原点，半径 1；Y 轴为极轴（北极为 +Y）。
// 纹理坐标：u 绕 Y 轴一周 [0,1]，v = 1 - phi/pi（phi=0 北极 → v=1；phi=pi 南极 → v=0）
// 这样配合 UNPACK_FLIP_Y_WEBGL=true 上传时，画布顶部（北半球）正好落在 v=1 处。

function createSphere(rows, cols) {
    var positions = [];
    var normals = [];
    var texCoords = [];
    var indices = [];

    for (var r = 0; r <= rows; r++) {
        var phi = (r / rows) * Math.PI;          // 0(北极) → pi(南极)
        var y = Math.cos(phi);
        var rr = Math.sin(phi);
        for (var c = 0; c <= cols; c++) {
            var theta = (c / cols) * 2 * Math.PI;
            var x = rr * Math.cos(theta);
            var z = rr * Math.sin(theta);
            positions.push(x, y, z);
            normals.push(x, y, z);               // 单位球法线 = 位置
            texCoords.push(c / cols, 1 - r / rows);
        }
    }
    for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
            var a = i * (cols + 1) + j;
            var b = a + cols + 1;
            indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
    }
    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices)
    };
}

// 土星环带：在行星赤道面（XZ 平面）内的圆环，带径向 UV（v = 内径→外径）
// innerR / outerR 为相对行星半径的倍数（世界坐标在外层乘行星缩放）
function createRing(innerR, outerR, segments) {
    var positions = [];
    var normals = [];
    var texCoords = [];
    var indices = [];
    for (var s = 0; s <= segments; s++) {
        var t = s / segments;
        var ang = t * 2 * Math.PI;
        var ca = Math.cos(ang), sa = Math.sin(ang);
        // 内圈
        positions.push(innerR * ca, 0, innerR * sa);
        normals.push(0, 1, 0);
        texCoords.push(t, 0);
        // 外圈
        positions.push(outerR * ca, 0, outerR * sa);
        normals.push(0, 1, 0);
        texCoords.push(t, 1);
    }
    for (var i = 0; i < segments; i++) {
        var a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices)
    };
}

// 圆周轨道线（XZ 平面圆），返回 positions（vec3）
function createOrbitCircle(radius, segments) {
    var positions = [];
    for (var i = 0; i <= segments; i++) {
        var ang = (i / segments) * 2 * Math.PI;
        positions.push(radius * Math.cos(ang), 0, radius * Math.sin(ang));
    }
    return new Float32Array(positions);
}
