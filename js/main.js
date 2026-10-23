// js/main.js — AP2 太阳系主程序
// 层级结构：
//   太阳(原点) ── 水星 ── 金星 ── 地球 ── 月球 ── 火星
//                                    (月球=地球子节点，轨道面倾角 5.14°，手动矩阵)
//              ── 小行星带 ── 木星 ── 土星(+环) ── 天王星 ── 海王星
// 层级：模型矩阵逐层左乘（矩阵栈 push/pop）。

(function () {
    var canvas = document.getElementById('glcanvas');
    var gl = WebGLUtils.getWebGLContext(canvas);
    if (!gl) return;

    // ---------- 着色器 ----------
    var texProg = initShadersFromSource(gl, SHADERS.texVS, SHADERS.texFS);
    var lineProg = initShadersFromSource(gl, SHADERS.lineVS, SHADERS.lineFS);
    var pointProg = initShadersFromSource(gl, SHADERS.pointVS, SHADERS.pointFS);

    var texLoc = {
        aPosition: gl.getAttribLocation(texProg, 'aPosition'),
        aNormal: gl.getAttribLocation(texProg, 'aNormal'),
        aTexCoord: gl.getAttribLocation(texProg, 'aTexCoord'),
        uModelView: gl.getUniformLocation(texProg, 'uModelView'),
        uProjection: gl.getUniformLocation(texProg, 'uProjection'),
        uNormalMat: gl.getUniformLocation(texProg, 'uNormalMat'),
        uLightEye: gl.getUniformLocation(texProg, 'uLightEye'),
        uTex: gl.getUniformLocation(texProg, 'uTex'),
        uEmissive: gl.getUniformLocation(texProg, 'uEmissive'),
        uAmbient: gl.getUniformLocation(texProg, 'uAmbient')
    };
    var lineLoc = {
        aPosition: gl.getAttribLocation(lineProg, 'aPosition'),
        uMVP: gl.getUniformLocation(lineProg, 'uMVP'),
        uColor: gl.getUniformLocation(lineProg, 'uColor')
    };
    var pointLoc = {
        aPosition: gl.getAttribLocation(pointProg, 'aPosition'),
        uMVP: gl.getUniformLocation(pointProg, 'uMVP'),
        uPointSize: gl.getUniformLocation(pointProg, 'uPointSize'),
        uColor: gl.getUniformLocation(pointProg, 'uColor')
    };

    // ---------- 几何：单位球 ----------
    var sphere = createSphere(48, 64);
    var spherePos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spherePos);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
    var sphereNor = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereNor);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.normals, gl.STATIC_DRAW);
    var sphereTex = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereTex);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.texCoords, gl.STATIC_DRAW);
    var sphereIdx = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);
    var sphereIndexCount = sphere.indices.length;

    // 土星环
    var ringGeo = createRing(SCENE.saturn.ring.inner, SCENE.saturn.ring.outer, 96);
    var ringPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ringPos);
    gl.bufferData(gl.ARRAY_BUFFER, ringGeo.positions, gl.STATIC_DRAW);
    var ringNor = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ringNor);
    gl.bufferData(gl.ARRAY_BUFFER, ringGeo.normals, gl.STATIC_DRAW);
    var ringTex = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ringTex);
    gl.bufferData(gl.ARRAY_BUFFER, ringGeo.texCoords, gl.STATIC_DRAW);
    var ringIdx = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ringIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ringGeo.indices, gl.STATIC_DRAW);
    var ringIndexCount = ringGeo.indices.length;

    // 单位圆轨道线（XZ 平面，半径 1），绘制时按半径缩放
    var orbitCircle = createOrbitCircle(1.0, 128);
    var orbitBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, orbitBuf);
    gl.bufferData(gl.ARRAY_BUFFER, orbitCircle, gl.STATIC_DRAW);

    // 小行星带（火星与木星之间的环形点云）
    var asteroidsBuf = gl.createBuffer();
    (function () {
        var rng = makeRng(20261023);
        var a = SCENE.asteroidBelt;
        var arr = [];
        for (var i = 0; i < a.count; i++) {
            var ang = rng() * Math.PI * 2;
            var r = a.inner + rng() * (a.outer - a.inner);
            arr.push(r * Math.cos(ang), (rng() - 0.5) * 0.25, r * Math.sin(ang));
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, asteroidsBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
    })();
    var asteroidsCount = SCENE.asteroidBelt.count;

    // ---------- 纹理 ----------
    var TEX = {};
    TEX.sun = uploadTexture(gl, makeSunTexture());
    TEX.earth = uploadTexture(gl, makeEarthTexture());
    TEX.moon = uploadTexture(gl, makeMoonTexture());
    TEX.mercury = uploadTexture(gl, makeBandedTexture('#8c8c8c', ['#707070', '#a5a5a5'], 101));
    TEX.venus = uploadTexture(gl, makeBandedTexture('#d8b98a', ['#e8d3a8', '#c9a877', '#e0c896'], 102));
    TEX.mars = uploadTexture(gl, makeBandedTexture('#c1643a', ['#a84f2c', '#d98a5f', '#b55a35'], 103));
    TEX.jupiter = uploadTexture(gl, makeBandedTexture('#d8b48c',
        ['#b98a5e', '#e8d0a8', '#a86a44', '#c9a078', '#e0c090'], 104));
    TEX.saturn = uploadTexture(gl, makeBandedTexture('#e3d3a3', ['#f0e2b8', '#d3c08a'], 105));
    TEX.uranus = uploadTexture(gl, makeBandedTexture('#9fd8e0', ['#b8e8ee'], 106));
    TEX.neptune = uploadTexture(gl, makeBandedTexture('#4a6fd8', ['#6a8fe8', '#3a5fc0'], 107));
    TEX.ring = uploadTexture(gl, makeRingTexture());

    // ---------- 运行状态 ----------
    var state = {
        orbitScale: 1.0,
        spinScale: 1.0,
        earthTilt: 23.5,    // 地球轴倾角（度），滑条实时改
        showOrbits: true,
        usePerspective: true,
        wireframe: false,   // 线框模式
        showAsteroids: true,
        showLabels: true,
        showMoonOrbit: true,
        moonInclination: 5.14,
        ambient: 0.15
    };

    var orbitAngle = {}, spinAngle = {};
    PLANET_KEYS.forEach(function (k) { orbitAngle[k] = Math.random() * 360; spinAngle[k] = 0; });
    orbitAngle.earth = 20;
    spinAngle.sun = 0;
    var moonAngle = 0;

    // ---------- 相机 ----------
    var camera = new Camera(canvas);
    var hud = document.getElementById('hud');

    // ---------- 行星名标签（DOM overlay） ----------
    var labelRoot = document.createElement('div');
    labelRoot.id = 'labels';
    labelRoot.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:5;';
    canvas.parentElement.appendChild(labelRoot);
    var labelKeys = ['sun'].concat(PLANET_KEYS);
    var labelEls = {};
    labelKeys.forEach(function (k) {
        var d = document.createElement('div');
        d.textContent = SCENE[k].name;
        d.style.cssText = 'position:absolute;transform:translate(-50%,-140%);font:11px/1.2 sans-serif;color:#cfe0ff;text-shadow:0 0 4px #000;white-space:nowrap;';
        labelRoot.appendChild(d);
        labelEls[k] = d;
    });

    camera.onRoamManual = function () {
        hud.textContent = '视角：手动接管（空格恢复漫游 / O 切换投影）';
    };

    // ---------- 矩阵栈 ----------
    var mvStack = [];
    var mv = mat4();
    function pushMV() { mvStack.push(mv.slice()); }
    function popMV() { mv = mvStack.pop(); }

    // 观察系中的光源位置（太阳在世界原点）
    var lightEye = [0, 0, 0];
    var proj = mat4(), view = mat4();

    function bindSphereAttribs() {
        gl.bindBuffer(gl.ARRAY_BUFFER, spherePos);
        gl.enableVertexAttribArray(texLoc.aPosition);
        gl.vertexAttribPointer(texLoc.aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereNor);
        gl.enableVertexAttribArray(texLoc.aNormal);
        gl.vertexAttribPointer(texLoc.aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereTex);
        gl.enableVertexAttribArray(texLoc.aTexCoord);
        gl.vertexAttribPointer(texLoc.aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIdx);
    }

    function setCommonUniforms(emissive) {
        gl.uniformMatrix4fv(texLoc.uProjection, false, flatten(proj));
        gl.uniformMatrix4fv(texLoc.uModelView, false, flatten(mv));
        gl.uniformMatrix3fv(texLoc.uNormalMat, false, flatten([
            [mv[0], mv[1], mv[2]], [mv[4], mv[5], mv[6]], [mv[8], mv[9], mv[10]]
        ]));
        gl.uniform3fv(texLoc.uLightEye, lightEye);
        gl.uniform1f(texLoc.uEmissive, emissive ? 1.0 : 0.0);
        gl.uniform1f(texLoc.uAmbient, state.ambient);
    }

    function drawSphere(texKey, emissive) {
        gl.useProgram(texProg);
        bindSphereAttribs();
        setCommonUniforms(emissive);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, TEX[texKey]);
        gl.uniform1i(texLoc.uTex, 0);
        if (state.wireframe) {
            gl.drawElements(gl.LINES, sphereIndexCount, gl.UNSIGNED_SHORT, 0);
        } else {
            gl.drawElements(gl.TRIANGLES, sphereIndexCount, gl.UNSIGNED_SHORT, 0);
        }
    }

    function drawRing() {
        gl.useProgram(texProg);
        gl.bindBuffer(gl.ARRAY_BUFFER, ringPos);
        gl.enableVertexAttribArray(texLoc.aPosition);
        gl.vertexAttribPointer(texLoc.aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, ringNor);
        gl.enableVertexAttribArray(texLoc.aNormal);
        gl.vertexAttribPointer(texLoc.aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, ringTex);
        gl.enableVertexAttribArray(texLoc.aTexCoord);
        gl.vertexAttribPointer(texLoc.aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ringIdx);
        setCommonUniforms(0.0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, TEX.ring);
        gl.uniform1i(texLoc.uTex, 0);
        gl.drawElements(gl.TRIANGLES, ringIndexCount, gl.UNSIGNED_SHORT, 0);
    }

    function drawOrbitLine(radius, color) {
        gl.useProgram(lineProg);
        gl.bindBuffer(gl.ARRAY_BUFFER, orbitBuf);
        gl.enableVertexAttribArray(lineLoc.aPosition);
        gl.vertexAttribPointer(lineLoc.aPosition, 3, gl.FLOAT, false, 0, 0);
        var m = mult(view, scale([radius, 1, radius]));
        gl.uniformMatrix4fv(lineLoc.uMVP, false, flatten(mult(proj, m)));
        gl.uniform4fv(lineLoc.uColor, color);
        gl.drawArrays(gl.LINE_STRIP, 0, orbitCircle.length / 3);
    }

    // ---------- 主循环 ----------
    var lastTime = performance.now();
    function frame(now) {
        var dt = Math.max(0, Math.min(0.05, (now - lastTime) / 1000));
        lastTime = now;

        PLANET_KEYS.forEach(function (k) {
            var p = SCENE[k];
            orbitAngle[k] = (orbitAngle[k] + p.orbitSpeed * state.orbitScale * dt) % 360;
            spinAngle[k] = (spinAngle[k] + p.spinSpeed * state.spinScale * dt) % 360;
        });
        spinAngle.sun = (spinAngle.sun + SCENE.sun.spinSpeed * state.spinScale * dt) % 360;
        moonAngle = (moonAngle + SCENE.earth.moon.orbitSpeed * state.orbitScale * dt) % 360;

        var cam = camera.update(dt);
        view = lookAt(cam.eye, [0, 0, 0], cam.up);
        lightEye = mult(view, [0, 0, 0, 1]).slice(0, 3);

        WebGLUtils.resize(canvas);
        gl.viewport(0, 0, canvas.width, canvas.height);
        var aspect = canvas.width / canvas.height;
        if (state.usePerspective) {
            proj = perspective(50, aspect, 0.1, 300);
        } else {
            var half = 15;
            proj = ortho(-half * aspect, half * aspect, -half, half, -50, 100);
        }

        gl.clearColor(0.02, 0.02, 0.05, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        // ===== 场景图 =====
        mv = view;

        // 太阳
        pushMV();
        mv = mult(mv, rotate(spinAngle.sun, [0, 1, 0]));
        mv = mult(mv, scale([SCENE.sun.radius, SCENE.sun.radius, SCENE.sun.radius]));
        drawSphere('sun', true);
        popMV();

        PLANET_KEYS.forEach(function (k) {
            var p = SCENE[k];
            // ① 公转轨道变换
            pushMV();
            mv = mult(mv, rotate(orbitAngle[k], [0, 1, 0]));
            mv = mult(mv, translate([p.orbitRadius, 0, 0]));

            // ② 行星本体：先施加轴倾角，再自转（“先转后挂”：倾角属于行星自身坐标系）
            pushMV();
            var tiltAngle = (k === 'earth') ? state.earthTilt : p.tilt;
            mv = mult(mv, rotate(tiltAngle, [1, 0, 0]));
            mv = mult(mv, rotate(spinAngle[k], [0, 1, 0]));
            mv = mult(mv, scale([p.radius, p.radius, p.radius]));
            drawSphere(k, false);
            popMV();

            // 土星环：挂在行星倾斜框架内
            if (p.ring) {
                pushMV();
                mv = mult(mv, rotate(p.tilt, [1, 0, 0]));
                drawRing();
                popMV();
            }

            // 月球（手动矩阵）
            if (k === 'earth') {
                pushMV();
                var RyMoon = rotate(moonAngle, [0, 1, 0]);       // 基本旋转：绕地球极轴公转
                var RxIncl = rotate(state.moonInclination, [1, 0, 0]); // 基本旋转：轨道面扳斜
                var TMoon = translate([p.moon.orbitRadius, 0, 0]);     // 基本平移：推到轨道半径
                // 列向量约定：先 T 推出去，再 Rx 扳斜，最后 Ry 绕地轴公转 → 左乘顺序 Ry·Rx·T
                var moonFrame = mult(RyMoon, mult(RxIncl, TMoon));
                mv = mult(mv, moonFrame);
                mv = mult(mv, rotate(spinAngle.earth * 0.5, [0, 1, 0]));
                var mr = p.moon.radius;
                mv = mult(mv, scale([mr, mr, mr]));
                drawSphere('moon', false);
                popMV();

                // 月球轨道线：让用户看见月球绕地球转，不是总贴在地球上
                if (state.showMoonOrbit) {
                    gl.useProgram(lineProg);
                    gl.bindBuffer(gl.ARRAY_BUFFER, orbitBuf);
                    gl.enableVertexAttribArray(lineLoc.aPosition);
                    gl.vertexAttribPointer(lineLoc.aPosition, 3, gl.FLOAT, false, 0, 0);
                    var mOrbit = mult(view,
                        mult(rotate(orbitAngle.earth, [0,1,0]),
                        mult(translate([p.orbitRadius,0,0]),
                        mult(rotate(state.earthTilt,[1,0,0]),
                        mult(rotate(state.moonInclination,[1,0,0]),
                             scale([p.moon.orbitRadius,1,p.moon.orbitRadius]))))));
                    gl.uniformMatrix4fv(lineLoc.uMVP, false, flatten(mult(proj, mOrbit)));
                    gl.uniform4fv(lineLoc.uColor, [0.6, 0.75, 0.95, 0.7]);
                    gl.drawArrays(gl.LINE_STRIP, 0, orbitCircle.length / 3);
                }
            }

            popMV();
        });

        // 轨道线
        if (state.showOrbits) {
            PLANET_KEYS.forEach(function (k) {
                drawOrbitLine(SCENE[k].orbitRadius, [0.35, 0.35, 0.45, 0.55]);
            });
        }

        // 小行星带
        if (state.showAsteroids) {
            gl.useProgram(pointProg);
            gl.bindBuffer(gl.ARRAY_BUFFER, asteroidsBuf);
            gl.enableVertexAttribArray(pointLoc.aPosition);
            gl.vertexAttribPointer(pointLoc.aPosition, 3, gl.FLOAT, false, 0, 0);
            gl.uniformMatrix4fv(pointLoc.uMVP, false, flatten(mult(proj, view)));
            gl.uniform1f(pointLoc.uPointSize, 2.0);
            gl.uniform4fv(pointLoc.uColor, [0.7, 0.65, 0.6, 1.0]);
            gl.drawArrays(gl.POINTS, 0, asteroidsCount);
        }

        // ---------- 更新行星名标签 ----------
        if (state.showLabels) {
            var vp = mult(proj, view);
            function project(world) {
                var c = mult(vp, [world[0], world[1], world[2], 1.0]);
                if (c[3] <= 0.01) return null;
                var nx = c[0] / c[3], ny = c[1] / c[3];
                if (nx < -1.1 || nx > 1.1 || ny < -1.1 || ny > 1.1) return null;
                return [(nx * 0.5 + 0.5) * canvas.clientWidth,
                        (-ny * 0.5 + 0.5) * canvas.clientHeight];
            }
            labelEls.sun.style.display = 'block';
            var sp = project([0, 0, 0]);
            if (sp) { labelEls.sun.style.left = sp[0] + 'px'; labelEls.sun.style.top = sp[1] + 'px'; }
            else labelEls.sun.style.display = 'none';

            PLANET_KEYS.forEach(function (k) {
                var p = SCENE[k];
                var R = rotate(orbitAngle[k], [0, 1, 0]);
                var c = mult(R, [p.orbitRadius, 0, 0, 1]);
                var sp = project(c);
                var el = labelEls[k];
                if (sp) {
                    el.style.display = 'block';
                    el.style.left = sp[0] + 'px';
                    el.style.top = sp[1] + 'px';
                } else el.style.display = 'none';
            });
        } else {
            labelKeys.forEach(function (k) { labelEls[k].style.display = 'none'; });
        }

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // ---------- 键盘 ----------
    window.addEventListener('keydown', function (e) {
        if (e.code === 'Space') {
            e.preventDefault();
            var on = camera.toggleRoaming();
            hud.textContent = on ? '漫游中（空格暂停 / 拖拽接管 / O 切换投影）'
                                 : '漫游已暂停（空格继续 / O 切换投影）';
        } else if (e.key === 'o' || e.key === 'O') {
            state.usePerspective = !state.usePerspective;
            hud.textContent = state.usePerspective
                ? '当前：透视投影（按 O 切正交）'
                : '当前：正交投影（按 O 切回透视）';
        }
    });

    // ---------- 参数面板 ----------
    var $ = function (id) { return document.getElementById(id); };
    $('ui-orbit').oninput = function () {
        state.orbitScale = parseFloat(this.value);
        $('ui-orbit-val').textContent = this.value + '×';
    };
    $('ui-spin').oninput = function () {
        state.spinScale = parseFloat(this.value);
        $('ui-spin-val').textContent = this.value + '×';
    };
    $('ui-tilt').oninput = function () {
        state.earthTilt = parseFloat(this.value);
        $('ui-tilt-val').textContent = this.value + '°';
    };
    $('ui-moonincl').oninput = function () {
        state.moonInclination = parseFloat(this.value);
        $('ui-moonincl-val').textContent = this.value + '°';
    };
    $('ui-moonorbit').onchange = function () { state.showMoonOrbit = this.checked; };
    $('ui-orbits').onchange = function () { state.showOrbits = this.checked; };
    $('ui-wireframe').onchange = function () { state.wireframe = this.checked; };
    $('ui-asteroids').onchange = function () { state.showAsteroids = this.checked; };
    $('ui-labels').onchange = function () { state.showLabels = this.checked; };
    $('proj-persp').onclick = function () {
        state.usePerspective = true;
        hud.textContent = '当前：透视投影（O 切正交）';
    };
    $('proj-ortho').onclick = function () {
        state.usePerspective = false;
        hud.textContent = '当前：正交投影（O 切回透视）';
    };
    $('ui-ambient').oninput = function () {
        state.ambient = parseFloat(this.value);
        $('ui-ambient-val').textContent = this.value;
    };

    // 视角预设
    function gotoView(az, el, dist) {
        camera.roaming = false;
        camera.Q = Camera._lookQuat(az, el, dist);
        camera.R = dist;
        hud.textContent = '视角：预设位（拖拽接管 / 空格恢复漫游 / O 切投影）';
    }
    $('view-overview').onclick = function () { gotoView(0.4, 0.5, 30); };
    $('view-close').onclick = function () { gotoView(2.0, 0.25, 7); };
    $('view-top').onclick = function () { gotoView(0.0, 1.35, 26); };
    $('view-reset').onclick = function () {
        camera.roaming = true;
        camera.roamTime = 0;
        hud.textContent = '漫游中（空格暂停 / 拖拽接管 / O 切换投影）';
    };
})();
