// ==========================================================================
// MV.js — 教材 Angel & Shreiner《Interactive Computer Graphics》配套矩阵库
// 列主序（column-major）mat4 / mat3 / vec4 / vec3 工具集
// 约定：列向量 v，变换写作 M * v；连续变换左乘，即 mv = T * R * S * v
// ==========================================================================

// ---------- 基础工具 ----------
function flatten(v) {
    if (v.length === 0) return new Float32Array([]);
    if (Array.isArray(v[0])) {
        var n = v.length * v[0].length;
        var f = new Float32Array(n);
        var k = 0;
        for (var i = 0; i < v.length; i++)
            for (var j = 0; j < v[i].length; j++) f[k++] = v[i][j];
        return f;
    }
    return new Float32Array(v);
}

function hypot(a, b) { return Math.sqrt(a * a + b * b); }

// ---------- 向量 ----------
function vec3(x, y, z) {
    if (x === undefined) return [0, 0, 0];
    if (Array.isArray(x)) return [x[0], x[1], x[2]];
    return [x, y, z];
}

function vec4(x, y, z, w) {
    if (x === undefined) return [0, 0, 0, 1];
    if (Array.isArray(x)) {
        if (x.length === 4) return [x[0], x[1], x[2], x[3]];
        return [x[0], x[1], x[2], 1];
    }
    return [x, y, z, w === undefined ? 1 : w];
}

function scaleVec(s, v) { return [s * v[0], s * v[1], s * v[2]]; }

function add() {
    var result = Array.prototype.slice.call(arguments[0]);
    for (var i = 1; i < arguments.length; i++)
        for (var j = 0; j < result.length; j++) result[j] += arguments[i][j];
    return result;
}

function subtract(a, b) {
    var result = [];
    for (var i = 0; i < a.length; i++) result.push(a[i] - b[i]);
    return result;
}

function multVec(a, b) {
    var result = [];
    for (var i = 0; i < a.length; i++) result.push(a[i] * b[i]);
    return result;
}

function negate(v) {
    var result = [];
    for (var i = 0; i < v.length; i++) result.push(-v[i]);
    return result;
}

function dot(a, b) {
    var result = 0;
    for (var i = 0; i < a.length; i++) result += a[i] * b[i];
    return result;
}

function cross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function length(v) { return Math.sqrt(dot(v, v)); }

function normalize(v, keepLast) {
    var len = length(v);
    var result = [];
    if (Math.abs(len) < 1e-8) return vec3();
    for (var i = 0; i < v.length; i++) {
        if (keepLast && i === v.length - 1) result[i] = v[i];
        else result[i] = v[i] / len;
    }
    return result;
}

function mix(u, v, s) {
    var result = [];
    for (var i = 0; i < u.length; i++) result.push(u[i] * (1 - s) + v[i] * s);
    return result;
}

// ---------- 矩阵 ----------
function mat3() {
    var result = [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ];
    if (arguments.length === 9) {
        for (var i = 0; i < 9; i++) result[i] = arguments[i];
    }
    return result;
}

function mat4() {
    var result = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
    if (arguments.length === 16) {
        for (var i = 0; i < 16; i++) result[i] = arguments[i];
    }
    return result;
}

// C = A * B（列主序；先施加 B，再施加 A）
function mult(A, B) {
    if (A.length === 16 && B.length === 16) {
        var result = mat4();
        for (var i = 0; i < 4; i++) {
            for (var j = 0; j < 4; j++) {
                result[4 * j + i] =
                    A[i] * B[4 * j] + A[4 + i] * B[4 * j + 1] +
                    A[8 + i] * B[4 * j + 2] + A[12 + i] * B[4 * j + 3];
            }
        }
        return result;
    } else if (A.length === 16 && B.length === 4) {
        // M * v
        var v = [0, 0, 0, 0];
        for (var i = 0; i < 4; i++)
            v[i] = A[i] * B[0] + A[4 + i] * B[1] + A[8 + i] * B[2] + A[12 + i] * B[3];
        return v;
    } else if (A.length === 9 && B.length === 9) {
        var r = mat3();
        for (var i = 0; i < 3; i++)
            for (var j = 0; j < 3; j++)
                r[3 * j + i] =
                    A[i] * B[3 * j] + A[3 + i] * B[3 * j + 1] + A[6 + i] * B[3 * j + 2];
        return r;
    } else if (A.length === 4 && B.length === 4) {
        // 向量逐分量乘
        return multVec(A, B);
    }
}

function transpose(A) {
    if (A.length === 16) {
        return mat4(
            A[0], A[4], A[8], A[12],
            A[1], A[5], A[9], A[13],
            A[2], A[6], A[10], A[14],
            A[3], A[7], A[11], A[15]
        );
    } else if (A.length === 9) {
        return mat3(A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]);
    }
}

// 基本变换：平移矩阵 T，返回 mat4（对列向量左乘）
function translate(x, y, z) {
    if (Array.isArray(x)) { z = x[2]; y = x[1]; x = x[0]; }
    return mat4(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1
    );
}

function scale(x, y, z) {
    if (Array.isArray(x)) { z = x[2]; y = x[1]; x = x[0]; }
    return mat4(
        x, 0, 0, 0,
        0, y, 0, 0,
        0, 0, z, 0,
        0, 0, 0, 1
    );
}

// 绕轴旋转 angle（角度制）
function rotate(angle, axis) {
    var a = (angle * Math.PI) / 180.0;
    var c = Math.cos(a), s = Math.sin(a);
    var n = normalize([axis[0], axis[1], axis[2]]);
    var x = n[0], y = n[1], z = n[2];
    return mat4(
        x * x + (1 - x * x) * c,
        x * y * (1 - c) + z * s,
        x * z * (1 - c) - y * s,
        0,
        x * y * (1 - c) - z * s,
        y * y + (1 - y * y) * c,
        y * z * (1 - c) + x * s,
        0,
        x * z * (1 - c) + y * s,
        y * z * (1 - c) - x * s,
        z * z + (1 - z * z) * c,
        0,
        0, 0, 0, 1
    );
}

// 透视投影：fovy 角度制
function perspective(fovy, aspect, near, far) {
    var f = 1.0 / Math.tan((fovy * Math.PI) / 360.0);
    var nf = 1.0 / (near - far);
    return mat4(
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, 2 * far * near * nf, 0
    );
}

// 正交投影
function ortho(left, right, bottom, top, near, far) {
    var tx = -(right + left) / (right - left);
    var ty = -(top + bottom) / (top - bottom);
    var tz = -(far + near) / (far - near);
    return mat4(
        2 / (right - left), 0, 0, 0,
        0, 2 / (top - bottom), 0, 0,
        0, 0, -2 / (far - near), 0,
        tx, ty, tz, 1
    );
}

// 观察矩阵
function lookAt(eye, at, up) {
    eye = vec4(eye, 1); at = vec4(at, 1); up = vec4(up, 0);
    var z = normalize(subtract(eye, at).slice(0, 3));
    var x = normalize(cross(up.slice(0, 3), z));
    var y = cross(z, x);
    return mat4(
        x[0], y[0], z[0], 0,
        x[1], y[1], z[1], 0,
        x[2], y[2], z[2], 0,
        -dot(x, eye.slice(0, 3)), -dot(y, eye.slice(0, 3)), -dot(z, eye.slice(0, 3)), 1
    );
}

// 行列式 / 逆矩阵（用于法线矩阵）
function determinant(M) {
    var a = M[0], b = M[1], c = M[2], d = M[3];
    var e = M[4], f = M[5], g = M[6], h = M[7];
    var i = M[8], j = M[9], k = M[10], l = M[11];
    var m = M[12], n = M[13], o = M[14], p = M[15];
    return (
        p * (
            -l * (a * f - b * e) + k * (a * h - b * g) - j * (a * k - c * g)
        ) +
        o * (
            -l * (d * f - b * h) + k * (d * h - b * l) - j * (d * k - c * l)
        ) +
        n * (
            -l * (d * g - c * h) + k * (d * l - c * g) - i * (d * k - c * l)
        ) +
        m * (
            -l * (e * h - f * g) + k * (e * l - f * h) - i * (e * k - f * g)
        )
    );
}

function inverse(M) {
    var a = M[0], b = M[1], c = M[2], d = M[3];
    var e = M[4], f = M[5], g = M[6], h = M[7];
    var i = M[8], j = M[9], k = M[10], l = M[11];
    var m = M[12], n = M[13], o = M[14], p = M[15];

    var B00 = a * f - b * e, B01 = a * g - c * e, B02 = a * h - d * e;
    var B03 = b * g - c * f, B04 = b * h - d * f, B05 = c * h - d * g;
    var B06 = i * n - j * m, B07 = i * o - k * m, B08 = i * p - l * m;
    var B09 = j * o - k * n, B10 = j * p - l * n, B11 = k * p - l * o;

    var det = 1.0 / (B00 * B11 - B01 * B10 + B02 * B09 + B03 * B08 - B04 * B07 + B05 * B06);
    return mat4(
        (f * B11 - g * B10 + h * B09) * det,
        (b * B11 - c * B10 + d * B09) * det,
        (n * B05 - o * B04 + p * B03) * det,
        (j * B05 - k * B04 + l * B03) * det,
        (e * B11 - g * B08 + h * B07) * det,
        (a * B11 - c * B08 + d * B07) * det,
        (m * B05 - o * B02 + p * B01) * det,
        (i * B05 - k * B02 + l * B01) * det,
        (e * B10 - f * B08 + h * B06) * det,
        (a * B10 - b * B08 + d * B06) * det,
        (m * B04 - n * B02 + p * B00) * det,
        (i * B04 - j * B02 + l * B00) * det,
        (e * B09 - f * B07 + g * B06) * det,
        (a * B09 - b * B07 + c * B06) * det,
        (m * B03 - n * B01 + o * B00) * det,
        (i * B03 - j * B01 + k * B00) * det
    );
}
