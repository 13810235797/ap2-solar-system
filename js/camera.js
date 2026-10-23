// js/camera.js — 相机系统
//  1) 观察：lookAt(target=原点)，眼位 = target + R * Q * forward
//  2) 视角控制：选做 E3「虚拟轨迹球」——拖拽把鼠标点投影到虚拟球面上，
//     由 p1、p2 求旋转轴 p1×p2 与夹角，生成四元数旋转 Q
//  3) 漫游：预设关键帧路径（方位角/仰角/距离），在关键帧之间线性插值循环播放；
//     空格暂停/继续；用户一旦拖拽即“接管”，漫游暂停，按空格恢复。

// ---------- 四元数工具 ----------
function qIdentity() { return [1, 0, 0, 0]; }                 // [w,x,y,z]
function qMult(a, b) {
    return [
        a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
        a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
        a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
        a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]
    ];
}
function qFromAxisAngle(axis, angleRad) {
    var s = Math.sin(angleRad / 2);
    return [Math.cos(angleRad / 2), axis[0] * s, axis[1] * s, axis[2] * s];
}
function qApply(q, v) {
    // v' = q * [v,0] * q^{-1}
    var u = [q[1], q[2], q[3]];
    var s = q[0];
    var t = cross(u, v);
    var r1 = add(scaleVec(2 * dot(u, v), u), scaleVec(s * s - dot(u, u), v));
    return add(r1, scaleVec(2 * s, t));
}

// ---------- 相机 ----------
function Camera(canvas) {
    this.canvas = canvas;
    this.target = [0, 0, 0];
    this.R = 22.0;                 // 默认视距
    this.Q = qIdentity();          // 当前姿态（轨迹球累积）
    this.roaming = true;           // 是否正在自动漫游
    this.roamTime = 0;
    // 预设关键帧：绕场景一周，兼顾全景与近景
    this.keyframes = [
        { az: 0.0,  el: 0.35, dist: 24.0 },
        { az: 0.9,  el: 0.15, dist: 18.0 },
        { az: 1.9,  el: 0.60, dist: 26.0 },
        { az: 3.0,  el: 0.20, dist: 20.0 },
        { az: 4.1,  el: 0.55, dist: 25.0 },
        { az: 5.3,  el: 0.25, dist: 19.0 }
    ];
    this.forward0 = [0, 0, -1];    // 默认视线朝 -Z
    this.up0 = [0, 1, 0];

    this._bindMouse();
}

// 关键帧之间插值，得到 (az, el, dist)
Camera.prototype._roamSample = function (t) {
    var k = this.keyframes;
    var n = k.length;
    var seg = ((t % n) + n) % n;            // 取模并保证非负（防御 dt 抖动）
    var i = Math.floor(seg);
    if (i >= n) i = n - 1;
    var f = seg - i;
    var a = k[i], b = k[(i + 1) % n];
    // 方位角不要跳变：b.az 已随 i 单调递增（关键帧 az 连续设置）
    return {
        az: a.az + (b.az - a.az) * f,
        el: a.el + (b.el - a.el) * f,
        dist: a.dist + (b.dist - a.dist) * f
    };
};

// 由方位角/仰角/距离构造一个姿态四元数（使 forward 指向 target）
Camera._lookQuat = function (az, el, dist) {
    // 先沿 azimuth 绕 Y 转，再绕世界 X 抬仰角
    var qY = qFromAxisAngle([0, 1, 0], -az);
    var qX = qFromAxisAngle([1, 0, 0], el);
    return qMult(qY, qX);
};

Camera.prototype.update = function (dt) {
    if (this.roaming) {
        this.roamTime += dt * 0.15;          // 漫游速度
        var s = this._roamSample(this.roamTime);
        this.Q = Camera._lookQuat(s.az, s.el, s.dist);
        this.R = s.dist;
    }
    var f = qApply(this.Q, this.forward0);
    var eye = add(this.target, scaleVec(this.R, f));
    var up = qApply(this.Q, this.up0);
    return { eye: eye, up: up };
};

Camera.prototype.toggleRoaming = function () {
    this.roaming = !this.roaming;
    return this.roaming;
};

// ---------- 鼠标：虚拟轨迹球 ----------
Camera.prototype._bindMouse = function () {
    var self = this;
    var dragging = false;
    var last = null;

    function toTrackball(e) {
        var rect = self.canvas.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        var y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        var d = x * x + y * y;
        var z = d <= 1 ? Math.sqrt(1 - d) : 0;   // 超出球外投影到赤道圆
        return [x, y, z];
    }

    this.canvas.addEventListener('mousedown', function (e) {
        dragging = true;
        last = toTrackball(e);
        // 用户拖拽 = 手动接管：暂停自动漫游
        if (self.roaming) { self.roaming = false; self.onRoamManual && self.onRoamManual(); }
    });
    window.addEventListener('mouseup', function () { dragging = false; });
    window.addEventListener('mousemove', function (e) {
        if (!dragging || !last) return;
        var p = toTrackball(e);
        var axis = cross(last, p);
        var len = length(axis);
        if (len > 1e-5) {
            var angle = length(p - last) * Math.PI;   // 移动弧长映射转角
            var qr = qFromAxisAngle(normalize(axis), angle);
            self.Q = qMult(qr, self.Q);
        }
        last = p;
    });
    this.canvas.addEventListener('wheel', function (e) {
        e.preventDefault();
        self.R *= (1 + Math.sign(e.deltaY) * 0.08);
        self.R = Math.max(4, Math.min(80, self.R));
    }, { passive: false });
};
